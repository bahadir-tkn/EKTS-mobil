import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SchematicCanvas } from './components/Canvas/SchematicCanvas';
import { ComponentDrawer } from './components/UI/ComponentDrawer';
import { PresetsModal } from './components/UI/PresetsModal';
import { PropertyBar } from './components/UI/PropertyBar';
import { ShortCircuitBanner } from './components/UI/ShortCircuitBanner';
import { SimulationBar } from './components/UI/SimulationBar';
import { TopBar } from './components/UI/TopBar';
import {
  COMPONENT_DEFINITIONS,
  generateNextLabel,
  snapToGrid,
} from './data/components';
import { PRESET_CIRCUITS, cloneCircuit } from './data/presets';
import {
  createEmptyInteractionState,
  createInitialSimulationState,
  normalizeLabel,
  stepSimulation,
} from './engine/simulator';
import type {
  CircuitComponent,
  CircuitDocument,
  ComponentType,
  LampColor,
  Rotation,
  SavedCircuitSlot,
  SimulationState,
  UserInteractionState,
  Wire,
  WireEndpoint,
} from './types/circuit';
import {
  deleteCircuitSlot,
  loadActiveCircuitDraft,
  loadSavedSlots,
  saveActiveCircuitDraft,
  saveCircuitSlot,
} from './utils/storage';

const MIN_MOMENTARY_PULSE_MS = 200;
const MAX_UNDO_HISTORY = 25;

export default function App() {
  const [circuit, setCircuit] = useState<CircuitDocument>(() => {
    const draft = loadActiveCircuitDraft();
    return draft ?? cloneCircuit(PRESET_CIRCUITS[0]);
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<WireEndpoint | null>(null);
  const [savedSlots, setSavedSlots] = useState<SavedCircuitSlot[]>(() => loadSavedSlots());
  const [undoStack, setUndoStack] = useState<CircuitDocument[]>([]);

  const [interactions, setInteractions] = useState<UserInteractionState>(
    createEmptyInteractionState
  );
  const [simState, setSimState] = useState<SimulationState>(() =>
    createInitialSimulationState(circuit)
  );

  const circuitRef = useRef(circuit);
  circuitRef.current = circuit;

  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;

  const viewportCenterRef = useRef<{ x: number; y: number }>({ x: 320, y: 260 });
  const pressTimestampsRef = useRef<Record<string, number>>({});
  const releaseTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const pushUndoState = useCallback((snapshot: CircuitDocument) => {
    setUndoStack((prev) => [...prev.slice(-(MAX_UNDO_HISTORY - 1)), cloneCircuit(snapshot)]);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    saveActiveCircuitDraft(circuit);
  }, [circuit]);

  useEffect(() => {
    return () => {
      Object.values(releaseTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const runInstantSimStep = useCallback((nextInteractions: UserInteractionState) => {
    setSimState((prev) =>
      stepSimulation(circuitRef.current, prev, nextInteractions, 0)
    );
  }, []);

  // Simulation loop at 20 Hz (50ms) for smooth On-Delay & Off-Delay timer countdowns
  useEffect(() => {
    if (!isSimulating) return;

    const freshInteractions = createEmptyInteractionState();
    interactionsRef.current = freshInteractions;
    setInteractions(freshInteractions);
    const initial = createInitialSimulationState(circuitRef.current);
    setSimState(stepSimulation(circuitRef.current, initial, freshInteractions, 0));

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - lastTime) / 1000);
      lastTime = now;

      setSimState((prev) => {
        if (prev.shortCircuit) return prev;
        return stepSimulation(circuitRef.current, prev, interactionsRef.current, dt);
      });
    }, 50);

    return () => {
      clearInterval(interval);
      Object.values(releaseTimersRef.current).forEach((t) => clearTimeout(t));
      releaseTimersRef.current = {};
    };
  }, [isSimulating]);

  const handleToggleSimulation = useCallback(() => {
    setIsSimulating((prev) => {
      const next = !prev;
      if (next) {
        setSelectedComponentId(null);
        setSelectedWireId(null);
        setPendingPin(null);
        setIsDrawerOpen(false);
      } else {
        const empty = createEmptyInteractionState();
        interactionsRef.current = empty;
        setInteractions(empty);
        setSimState(createInitialSimulationState(circuitRef.current));
      }
      return next;
    });
  }, []);

  const handleResetSimulation = useCallback(() => {
    Object.values(releaseTimersRef.current).forEach((t) => clearTimeout(t));
    releaseTimersRef.current = {};
    const empty = createEmptyInteractionState();
    interactionsRef.current = empty;
    setInteractions(empty);
    const initial = createInitialSimulationState(circuitRef.current);
    setSimState(stepSimulation(circuitRef.current, initial, empty, 0));
  }, []);

  const handleMomentaryPressStart = useCallback(
    (componentId: string) => {
      if (releaseTimersRef.current[componentId]) {
        clearTimeout(releaseTimersRef.current[componentId]);
        delete releaseTimersRef.current[componentId];
      }
      pressTimestampsRef.current[componentId] = performance.now();

      const next: UserInteractionState = {
        ...interactionsRef.current,
        pressedButtons: {
          ...interactionsRef.current.pressedButtons,
          [componentId]: true,
        },
      };
      interactionsRef.current = next;
      setInteractions(next);
      runInstantSimStep(next);
    },
    [runInstantSimStep]
  );

  const handleMomentaryPressEnd = useCallback(
    (componentId: string) => {
      const startedAt = pressTimestampsRef.current[componentId] ?? 0;
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, MIN_MOMENTARY_PULSE_MS - elapsed);

      const doRelease = () => {
        delete releaseTimersRef.current[componentId];
        const nextPressed = { ...interactionsRef.current.pressedButtons };
        delete nextPressed[componentId];
        const next: UserInteractionState = {
          ...interactionsRef.current,
          pressedButtons: nextPressed,
        };
        interactionsRef.current = next;
        setInteractions(next);
        runInstantSimStep(next);
      };

      if (remaining > 15) {
        if (releaseTimersRef.current[componentId]) {
          clearTimeout(releaseTimersRef.current[componentId]);
        }
        releaseTimersRef.current[componentId] = setTimeout(doRelease, remaining);
      } else {
        doRelease();
      }
    },
    [runInstantSimStep]
  );

  // Classic EKTS right-click / mobile lock hold toggle for momentary buttons
  const handleToggleMomentaryLock = useCallback(
    (componentId: string) => {
      const prevLocked = interactionsRef.current.lockedButtons ?? {};
      const nextLocked = { ...prevLocked };
      if (nextLocked[componentId]) {
        delete nextLocked[componentId];
      } else {
        nextLocked[componentId] = true;
      }
      const next: UserInteractionState = {
        ...interactionsRef.current,
        lockedButtons: nextLocked,
      };
      interactionsRef.current = next;
      setInteractions(next);
      runInstantSimStep(next);
    },
    [runInstantSimStep]
  );

  const handleToggleLatch = useCallback(
    (componentId: string) => {
      const next: UserInteractionState = {
        ...interactionsRef.current,
        latchedSwitches: {
          ...interactionsRef.current.latchedSwitches,
          [componentId]: !interactionsRef.current.latchedSwitches[componentId],
        },
      };
      interactionsRef.current = next;
      setInteractions(next);
      runInstantSimStep(next);
    },
    [runInstantSimStep]
  );

  const handleToggleFuse = useCallback(
    (componentId: string) => {
      const next: UserInteractionState = {
        ...interactionsRef.current,
        blownFuses: {
          ...interactionsRef.current.blownFuses,
          [componentId]: !interactionsRef.current.blownFuses[componentId],
        },
      };
      interactionsRef.current = next;
      setInteractions(next);
      runInstantSimStep(next);
    },
    [runInstantSimStep]
  );

  // Design mode mutations
  const handleAddComponent = useCallback(
    (type: ComponentType) => {
      const def = COMPONENT_DEFINITIONS[type];
      const center = viewportCenterRef.current;

      setCircuit((prev) => {
        pushUndoState(prev);
        let x = snapToGrid(center.x);
        let y = snapToGrid(center.y);
        let guard = 0;
        while (
          guard < 12 &&
          prev.components.some((c) => Math.abs(c.x - x) < 20 && Math.abs(c.y - y) < 20)
        ) {
          x += 40;
          y += 20;
          guard += 1;
        }

        const newComp: CircuitComponent = {
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          x,
          y,
          rotation: 0,
          label: generateNextLabel(type, prev.components),
          delaySeconds: def.defaultDelaySeconds,
          lampColor: def.defaultLampColor,
        };

        setSelectedComponentId(newComp.id);
        setSelectedWireId(null);
        return {
          ...prev,
          components: [...prev.components, newComp],
        };
      });

      if (window.innerWidth < 768) {
        setIsDrawerOpen(false);
      }
    },
    [pushUndoState]
  );

  const handleMoveComponent = useCallback((id: string, x: number, y: number) => {
    setCircuit((prev) => {
      const target = prev.components.find((c) => c.id === id);
      if (!target || (target.x === x && target.y === y)) return prev;

      return {
        ...prev,
        components: prev.components.map((c) => (c.id === id ? { ...c, x, y } : c)),
        wires: prev.wires.map((w) =>
          w.from.componentId === id || w.to.componentId === id
            ? { ...w, waypoints: undefined }
            : w
        ),
      };
    });
  }, []);

  const handlePinTap = useCallback(
    (endpoint: WireEndpoint) => {
      setSelectedComponentId(null);
      setSelectedWireId(null);

      if (!pendingPin) {
        setPendingPin(endpoint);
        return;
      }

      if (
        pendingPin.componentId === endpoint.componentId &&
        pendingPin.pinId === endpoint.pinId
      ) {
        setPendingPin(null);
        return;
      }

      setCircuit((prev) => {
        const duplicate = prev.wires.some(
          (w) =>
            (w.from.componentId === pendingPin.componentId &&
              w.from.pinId === pendingPin.pinId &&
              w.to.componentId === endpoint.componentId &&
              w.to.pinId === endpoint.pinId) ||
            (w.from.componentId === endpoint.componentId &&
              w.from.pinId === endpoint.pinId &&
              w.to.componentId === pendingPin.componentId &&
              w.to.pinId === pendingPin.pinId)
        );

        if (duplicate) return prev;
        pushUndoState(prev);

        const newWire: Wire = {
          id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          from: pendingPin,
          to: endpoint,
        };
        return {
          ...prev,
          wires: [...prev.wires, newWire],
        };
      });

      setPendingPin(null);
    },
    [pendingPin, pushUndoState]
  );

  const handleUpdateLabel = useCallback((id: string, label: string) => {
    setCircuit((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === id ? { ...c, label: label.toUpperCase() } : c
      ),
    }));
  }, []);

  const handleUpdateDelay = useCallback((id: string, delaySeconds: number) => {
    setCircuit((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === id ? { ...c, delaySeconds } : c
      ),
    }));
  }, []);

  const handleUpdateLampColor = useCallback((id: string, lampColor: LampColor) => {
    setCircuit((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === id ? { ...c, lampColor } : c
      ),
    }));
  }, []);

  const handleRotateComponent = useCallback(
    (id: string) => {
      setCircuit((prev) => {
        pushUndoState(prev);
        return {
          ...prev,
          components: prev.components.map((c) => {
            if (c.id !== id) return c;
            const nextRot = ((c.rotation + 90) % 360) as Rotation;
            return { ...c, rotation: nextRot };
          }),
          wires: prev.wires.map((w) =>
            w.from.componentId === id || w.to.componentId === id
              ? { ...w, waypoints: undefined }
              : w
          ),
        };
      });
    },
    [pushUndoState]
  );

  const handleDeleteComponent = useCallback(
    (id: string) => {
      setCircuit((prev) => {
        pushUndoState(prev);
        return {
          ...prev,
          components: prev.components.filter((c) => c.id !== id),
          wires: prev.wires.filter(
            (w) => w.from.componentId !== id && w.to.componentId !== id
          ),
        };
      });
      setSelectedComponentId(null);
      setPendingPin((prev) => (prev?.componentId === id ? null : prev));
    },
    [pushUndoState]
  );

  const handleDeleteWire = useCallback(
    (id: string) => {
      setCircuit((prev) => {
        pushUndoState(prev);
        return {
          ...prev,
          wires: prev.wires.filter((w) => w.id !== id),
        };
      });
      setSelectedWireId(null);
    },
    [pushUndoState]
  );

  const handleClearCanvas = useCallback(() => {
    setCircuit((prev) => {
      if (prev.components.length === 0) return prev;
      pushUndoState(prev);
      return {
        ...prev,
        id: `custom-${Date.now()}`,
        name: 'Yeni Şema',
        components: [],
        wires: [],
      };
    });
    setSelectedComponentId(null);
    setSelectedWireId(null);
    setPendingPin(null);
  }, [pushUndoState]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCircuit(last);
      setSelectedComponentId(null);
      setSelectedWireId(null);
      setPendingPin(null);
      return prev.slice(0, -1);
    });
  }, []);

  const loadCircuitIntoWorkspace = useCallback((doc: CircuitDocument) => {
    setIsSimulating(false);
    setSelectedComponentId(null);
    setSelectedWireId(null);
    setPendingPin(null);
    setUndoStack([]);
    const cloned = cloneCircuit(doc);
    setCircuit(cloned);
    setInteractions(createEmptyInteractionState());
    setSimState(createInitialSimulationState(cloned));
    setFitTrigger((n) => n + 1);
  }, []);

  const handleNewBlankCircuit = useCallback(() => {
    loadCircuitIntoWorkspace({
      id: `custom-${Date.now()}`,
      name: 'Yeni Kumanda Devresi',
      components: [],
      wires: [],
    });
  }, [loadCircuitIntoWorkspace]);

  const handleSaveSlot = useCallback(
    (name: string) => {
      const updated = saveCircuitSlot(name, circuit);
      setSavedSlots(updated);
      setCircuit((prev) => ({ ...prev, name }));
    },
    [circuit]
  );

  const handleDeleteSlot = useCallback((slotId: string) => {
    setSavedSlots(deleteCircuitSlot(slotId));
  }, []);

  // Desktop keyboard shortcuts (Delete, R to rotate, Ctrl/Cmd+Z to undo, Escape)
  useEffect(() => {
    if (isSimulating || isMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Escape') {
        setPendingPin(null);
        setSelectedComponentId(null);
        setSelectedWireId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId) {
        e.preventDefault();
        handleDeleteComponent(selectedComponentId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWireId) {
        e.preventDefault();
        handleDeleteWire(selectedWireId);
      } else if ((e.key === 'r' || e.key === 'R') && selectedComponentId) {
        e.preventDefault();
        handleRotateComponent(selectedComponentId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isSimulating,
    isMenuOpen,
    selectedComponentId,
    selectedWireId,
    handleUndo,
    handleDeleteComponent,
    handleDeleteWire,
    handleRotateComponent,
  ]);

  const selectedComponent = useMemo(
    () => circuit.components.find((c) => c.id === selectedComponentId) ?? null,
    [circuit.components, selectedComponentId]
  );

  // Available coil/timer labels for EKTS 1-tap contact binding
  const { availableCoilLabels, availableOnTimerLabels, availableOffTimerLabels } = useMemo(() => {
    const coils = new Set<string>();
    const onTimers = new Set<string>();
    const offTimers = new Set<string>();
    for (const c of circuit.components) {
      const norm = normalizeLabel(c.label);
      if (!norm) continue;
      if (c.type === 'coil_contactor') coils.add(norm);
      else if (c.type === 'coil_timer_on') onTimers.add(norm);
      else if (c.type === 'coil_timer_off') offTimers.add(norm);
    }
    return {
      availableCoilLabels: Array.from(coils),
      availableOnTimerLabels: Array.from(onTimers),
      availableOffTimerLabels: Array.from(offTimers),
    };
  }, [circuit.components]);

  return (
    <div
      className="h-dvh w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100"
      data-mode={isSimulating ? 'simulation' : 'design'}
    >
      <TopBar
        circuitName={circuit.name}
        isSimulating={isSimulating}
        isDark={isDark}
        hasShortCircuit={Boolean(simState.shortCircuit)}
        onToggleSimulation={handleToggleSimulation}
        onOpenMenu={() => setIsMenuOpen(true)}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      {isSimulating && simState.shortCircuit && (
        <ShortCircuitBanner
          fault={simState.shortCircuit}
          onReturnToDesign={handleToggleSimulation}
        />
      )}

      <main className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <SchematicCanvas
          circuit={circuit}
          isSimulating={isSimulating}
          isDark={isDark}
          simState={simState}
          interactions={interactions}
          selectedComponentId={selectedComponentId}
          selectedWireId={selectedWireId}
          pendingPin={pendingPin}
          fitTrigger={fitTrigger}
          onSelectComponent={setSelectedComponentId}
          onSelectWire={setSelectedWireId}
          onPinTap={handlePinTap}
          onCancelWiring={() => setPendingPin(null)}
          onMoveComponent={handleMoveComponent}
          onMomentaryPressStart={handleMomentaryPressStart}
          onMomentaryPressEnd={handleMomentaryPressEnd}
          onToggleMomentaryLock={handleToggleMomentaryLock}
          onToggleLatch={handleToggleLatch}
          onToggleFuse={handleToggleFuse}
          onViewportCenterChange={(pt) => {
            viewportCenterRef.current = pt;
          }}
        />

        {!isSimulating && (
          <PropertyBar
            selectedComponent={selectedComponent}
            selectedWireId={selectedWireId}
            availableCoilLabels={availableCoilLabels}
            availableOnTimerLabels={availableOnTimerLabels}
            availableOffTimerLabels={availableOffTimerLabels}
            onUpdateLabel={handleUpdateLabel}
            onUpdateDelay={handleUpdateDelay}
            onUpdateLampColor={handleUpdateLampColor}
            onRotateComponent={handleRotateComponent}
            onDeleteComponent={handleDeleteComponent}
            onDeleteWire={handleDeleteWire}
            onClose={() => {
              setSelectedComponentId(null);
              setSelectedWireId(null);
            }}
          />
        )}
      </main>

      {isSimulating ? (
        <SimulationBar
          circuit={circuit}
          simState={simState}
          interactions={interactions}
          onMomentaryPressStart={handleMomentaryPressStart}
          onMomentaryPressEnd={handleMomentaryPressEnd}
          onToggleMomentaryLock={handleToggleMomentaryLock}
          onToggleLatch={handleToggleLatch}
          onToggleFuse={handleToggleFuse}
          onResetSimulation={handleResetSimulation}
        />
      ) : (
        <ComponentDrawer
          isOpen={isDrawerOpen}
          isDark={isDark}
          componentCount={circuit.components.length}
          wireCount={circuit.wires.length}
          canUndo={undoStack.length > 0}
          onToggleOpen={() => setIsDrawerOpen((o) => !o)}
          onAddComponent={handleAddComponent}
          onUndo={handleUndo}
          onClearCanvas={handleClearCanvas}
        />
      )}

      <PresetsModal
        isOpen={isMenuOpen}
        currentCircuit={circuit}
        savedSlots={savedSlots}
        onClose={() => setIsMenuOpen(false)}
        onSelectPreset={loadCircuitIntoWorkspace}
        onNewBlankCircuit={handleNewBlankCircuit}
        onSaveSlot={handleSaveSlot}
        onLoadSlot={(slot) => loadCircuitIntoWorkspace(slot.circuit)}
        onDeleteSlot={handleDeleteSlot}
        onImportCircuit={loadCircuitIntoWorkspace}
      />
    </div>
  );
}
