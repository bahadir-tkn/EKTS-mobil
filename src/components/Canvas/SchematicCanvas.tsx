import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import {
  COMPONENT_DEFINITIONS,
  GRID_SIZE,
  getAbsolutePinPosition,
  snapToGrid,
} from '../../data/components';
import { makePinKey } from '../../engine/simulator';
import type {
  CircuitComponent,
  CircuitDocument,
  SimulationState,
  UserInteractionState,
  WireEndpoint,
  WirePotentialState,
} from '../../types/circuit';
import { ComponentSymbol } from '../Symbols/ComponentSymbol';
import { computeOrthogonalPoints, pointsToSvgPath } from './wireRouting';

export interface SchematicCanvasProps {
  circuit: CircuitDocument;
  isSimulating: boolean;
  isDark: boolean;
  simState: SimulationState;
  interactions: UserInteractionState;
  selectedComponentId: string | null;
  selectedWireId: string | null;
  pendingPin: WireEndpoint | null;
  fitTrigger: number;
  onSelectComponent: (id: string | null) => void;
  onSelectWire: (id: string | null) => void;
  onPinTap: (endpoint: WireEndpoint) => void;
  onCancelWiring: () => void;
  onMoveComponent: (id: string, x: number, y: number) => void;
  onMomentaryPressStart: (componentId: string) => void;
  onMomentaryPressEnd: (componentId: string) => void;
  onToggleMomentaryLock: (componentId: string) => void;
  onToggleLatch: (componentId: string) => void;
  onToggleFuse: (componentId: string) => void;
  onViewportCenterChange?: (center: { x: number; y: number }) => void;
}

interface ViewBoxTransform {
  x: number;
  y: number;
  scale: number;
}

function getWireStrokeColor(
  state: WirePotentialState,
  isDark: boolean,
  isSelected: boolean
): string {
  if (isSelected) return '#2563EB';
  switch (state) {
    case 'short_circuit':
      return '#DC2626';
    case 'L1':
      return isDark ? '#F87171' : '#DC2626';
    case 'L2':
      return isDark ? '#FB923C' : '#EA580C';
    case 'L3':
      return isDark ? '#FBBF24' : '#D97706';
    case 'N':
      return isDark ? '#60A5FA' : '#2563EB';
    default:
      return isDark ? '#64748B' : '#475569';
  }
}

export function SchematicCanvas({
  circuit,
  isSimulating,
  isDark,
  simState,
  interactions,
  selectedComponentId,
  selectedWireId,
  pendingPin,
  fitTrigger,
  onSelectComponent,
  onSelectWire,
  onPinTap,
  onCancelWiring,
  onMoveComponent,
  onMomentaryPressStart,
  onMomentaryPressEnd,
  onToggleMomentaryLock,
  onToggleLatch,
  onToggleFuse,
  onViewportCenterChange,
}: SchematicCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<ViewBoxTransform>({ x: 40, y: 20, scale: 1 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Pointer tracking for pan, pinch-to-zoom, and component dragging
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);
  const pinchStartMid = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartTransform = useRef<ViewBoxTransform>({ x: 0, y: 0, scale: 1 });

  const panState = useRef<{
    active: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startTx: number;
    startTy: number;
    moved: boolean;
  } | null>(null);

  const dragState = useRef<{
    componentId: string;
    pointerId: number;
    startWorldX: number;
    startWorldY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const componentMap = useMemo(() => {
    const map = new Map<string, CircuitComponent>();
    for (const c of circuit.components) map.set(c.id, c);
    return map;
  }, [circuit.components]);

  const energizedIdSet = useMemo(() => new Set(simState.energizedCoilIds), [simState.energizedCoilIds]);
  const closedSwitchSet = useMemo(() => new Set(simState.closedSwitchIds), [simState.closedSwitchIds]);
  const litLampSet = useMemo(() => new Set(simState.litLampIds), [simState.litLampIds]);
  const faultCompSet = useMemo(
    () => new Set(simState.shortCircuit?.faultComponentIds ?? []),
    [simState.shortCircuit]
  );

  // Compute Fit-to-View transform
  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    if (circuit.components.length === 0) {
      setTransform({ x: rect.width / 2 - 200, y: rect.height / 2 - 200, scale: 1 });
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const c of circuit.components) {
      const def = COMPONENT_DEFINITIONS[c.type];
      minX = Math.min(minX, c.x - def.halfWidth - 36);
      maxX = Math.max(maxX, c.x + def.halfWidth + 56);
      minY = Math.min(minY, c.y - def.halfHeight - 24);
      maxY = Math.max(maxY, c.y + def.halfHeight + 48);
    }

    const contentW = Math.max(200, maxX - minX);
    const contentH = Math.max(200, maxY - minY);
    const padX = rect.width < 640 ? 24 : 56;
    const padTop = 32;
    const padBottom = rect.width < 640 ? 110 : 96;

    const availW = Math.max(120, rect.width - padX * 2);
    const availH = Math.max(120, rect.height - padTop - padBottom);
    const scale = Math.max(0.45, Math.min(1.25, Math.min(availW / contentW, availH / contentH)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const tx = rect.width / 2 - centerX * scale;
    const ty = padTop + availH / 2 - centerY * scale;

    setTransform({ x: tx, y: ty, scale });
  }, [circuit.components]);

  useEffect(() => {
    fitToView();
  }, [fitTrigger, fitToView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onViewportCenterChange) return;
    const rect = el.getBoundingClientRect();
    const cx = snapToGrid((rect.width / 2 - transform.x) / transform.scale);
    const cy = snapToGrid((rect.height / 2 - transform.y) / transform.scale);
    onViewportCenterChange({ x: cx, y: cy });
  }, [transform, onViewportCenterChange]);

  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const t = transformRef.current;
    return {
      x: (clientX - rect.left - t.x) / t.scale,
      y: (clientY - rect.top - t.y) / t.scale,
    };
  }, []);

  const zoomAtPoint = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const cy = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    setTransform((prev) => {
      const nextScale = Math.max(0.35, Math.min(2.6, prev.scale * factor));
      const ratio = nextScale / prev.scale;
      return {
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
        scale: nextScale,
      };
    });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAtPoint(factor, e.clientX, e.clientY);
    },
    [zoomAtPoint]
  );

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch-to-zoom with 2 fingers
    if (activePointers.current.size === 2) {
      panState.current = null;
      dragState.current = null;
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartDist.current = dist;
      pinchStartScale.current = transformRef.current.scale;
      pinchStartMid.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      pinchStartTransform.current = { ...transformRef.current };
      return;
    }

    // Only start background pan if clicking directly on the canvas background
    const target = e.target as Element;
    if (target.getAttribute('data-canvas-bg') === 'true') {
      try {
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unavailable for synthetic/touch events
      }
      panState.current = {
        active: true,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startTx: transformRef.current.x,
        startTy: transformRef.current.y,
        moved: false,
      };
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom handling
    if (activePointers.current.size === 2 && pinchStartDist.current) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
      const startMidX = pinchStartMid.current.x - rect.left;
      const startMidY = pinchStartMid.current.y - rect.top;

      const scaleFactor = dist / Math.max(1, pinchStartDist.current);
      const nextScale = Math.max(0.35, Math.min(2.6, pinchStartScale.current * scaleFactor));
      const ratio = nextScale / pinchStartTransform.current.scale;

      setTransform({
        scale: nextScale,
        x: midX - (startMidX - pinchStartTransform.current.x) * ratio,
        y: midY - (startMidY - pinchStartTransform.current.y) * ratio,
      });
      return;
    }

    // Component dragging in Design Mode
    if (dragState.current && dragState.current.pointerId === e.pointerId) {
      const world = clientToWorld(e.clientX, e.clientY);
      const dx = world.x - dragState.current.startWorldX;
      const dy = world.y - dragState.current.startWorldY;
      if (Math.hypot(dx, dy) > 4) {
        dragState.current.moved = true;
      }
      if (dragState.current.moved) {
        const nextX = snapToGrid(dragState.current.origX + dx);
        const nextY = snapToGrid(dragState.current.origY + dy);
        onMoveComponent(dragState.current.componentId, nextX, nextY);
      }
      return;
    }

    // Canvas panning
    const currentPan = panState.current;
    if (currentPan && currentPan.active && currentPan.pointerId === e.pointerId) {
      const dx = e.clientX - currentPan.startClientX;
      const dy = e.clientY - currentPan.startClientY;
      if (Math.hypot(dx, dy) > 5) {
        currentPan.moved = true;
      }
      const nextX = currentPan.startTx + dx;
      const nextY = currentPan.startTy + dy;
      setTransform((prev) => ({
        ...prev,
        x: nextX,
        y: nextY,
      }));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchStartDist.current = null;
    }

    if (dragState.current && dragState.current.pointerId === e.pointerId) {
      dragState.current = null;
    }

    if (panState.current && panState.current.pointerId === e.pointerId) {
      const wasClick = !panState.current.moved;
      panState.current = null;
      if (wasClick) {
        onSelectComponent(null);
        onSelectWire(null);
        if (pendingPin) onCancelWiring();
      }
    }
  };

  const isMomentaryType = (type: CircuitComponent['type']) =>
    type === 'btn_start' || type === 'btn_stop' || type === 'btn_dual';

  const handleComponentPointerDown = (
    e: React.PointerEvent,
    comp: CircuitComponent
  ) => {
    e.stopPropagation();

    if (isSimulating) {
      if (isMomentaryType(comp.type)) {
        // Right-click in desktop EKTS locks the button held; handled in onContextMenu
        if (e.button === 2) return;
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {
          // Ignore if pointer capture is unavailable
        }
        onMomentaryPressStart(comp.id);
      } else if (
        comp.type === 'switch_toggle' ||
        comp.type === 'btn_estop' ||
        comp.type === 'limit_no' ||
        comp.type === 'limit_nc'
      ) {
        onToggleLatch(comp.id);
      } else if (comp.type === 'fuse' || comp.type === 'thermal_nc') {
        onToggleFuse(comp.id);
      }
      return;
    }

    // Design mode: select & prepare drag
    onSelectWire(null);
    onSelectComponent(comp.id);

    const world = clientToWorld(e.clientX, e.clientY);
    dragState.current = {
      componentId: comp.id,
      pointerId: e.pointerId,
      startWorldX: world.x,
      startWorldY: world.y,
      origX: comp.x,
      origY: comp.y,
      moved: false,
    };
  };

  const handleComponentPointerUp = (
    e: React.PointerEvent,
    comp: CircuitComponent
  ) => {
    if (isSimulating && isMomentaryType(comp.type) && e.button !== 2) {
      e.stopPropagation();
      onMomentaryPressEnd(comp.id);
    }
  };

  const handleComponentContextMenu = (
    e: React.MouseEvent,
    comp: CircuitComponent
  ) => {
    if (isSimulating && isMomentaryType(comp.type)) {
      e.preventDefault();
      e.stopPropagation();
      onToggleMomentaryLock(comp.id);
    }
  };

  // Precompute orthogonal paths and junction dots where 2+ wires meet at a shared pin
  const renderedWires = useMemo(() => {
    const endpointCounts = new Map<string, { x: number; y: number; count: number; color: string }>();

    const items = circuit.wires
      .map((wire) => {
        const fromComp = componentMap.get(wire.from.componentId);
        const toComp = componentMap.get(wire.to.componentId);
        if (!fromComp || !toComp) return null;

        const p1 = getAbsolutePinPosition(fromComp, wire.from.pinId);
        const p2 = getAbsolutePinPosition(toComp, wire.to.pinId);
        if (!p1 || !p2) return null;

        const pts = computeOrthogonalPoints(p1, p2, p1.dir, p2.dir, wire.waypoints);
        const d = pointsToSvgPath(pts);
        const state: WirePotentialState = isSimulating
          ? simState.wireStates[wire.id] ?? 'none'
          : 'none';
        const isSelected = !isSimulating && selectedWireId === wire.id;
        const color = getWireStrokeColor(state, isDark, isSelected);

        const k1 = `${p1.x},${p1.y}`;
        const k2 = `${p2.x},${p2.y}`;
        const c1 = endpointCounts.get(k1);
        endpointCounts.set(k1, { x: p1.x, y: p1.y, count: (c1?.count ?? 0) + 1, color });
        const c2 = endpointCounts.get(k2);
        endpointCounts.set(k2, { x: p2.x, y: p2.y, count: (c2?.count ?? 0) + 1, color });

        return { wire, d, state, isSelected, color };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const junctions = Array.from(endpointCounts.values()).filter((j) => j.count >= 2);
    return { items, junctions };
  }, [circuit.wires, componentMap, isSimulating, simState.wireStates, selectedWireId, isDark]);

  const pendingPinComp = pendingPin ? componentMap.get(pendingPin.componentId) : null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden select-none bg-slate-50 dark:bg-[#0B1120] touch-none"
      data-testid="schematic-canvas-container"
    >
      {/* Tap-to-connect status hint when first pin is selected */}
      {!isSimulating && pendingPin && pendingPinComp && (
        <div
          role="status"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white shadow-md text-xs sm:text-sm font-medium max-w-[92vw]"
        >
          <span className="truncate">
            Kablo: <strong className="font-mono-tech">{pendingPinComp.label}:{pendingPin.pinId}</strong> seçildi — bağlanacak ikinci pine dokunun
          </span>
          <button
            type="button"
            onClick={onCancelWiring}
            aria-label="Kablo çekmeyi iptal et"
            className="inline-flex items-center justify-center min-w-[28px] min-h-[28px] rounded-lg bg-white/15 hover:bg-white/25 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Interactive SVG Schematic Board */}
      <svg
        className="w-full h-full block touch-none"
        onWheel={handleWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        role="application"
        aria-label="EKTS Elektrik Şema Çizim Tahtası"
        data-testid="schematic-svg"
      >
        <defs>
          <pattern
            id="ekts-dot-grid"
            width={GRID_SIZE * transform.scale}
            height={GRID_SIZE * transform.scale}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${transform.x % (GRID_SIZE * transform.scale)}, ${transform.y % (GRID_SIZE * transform.scale)})`}
          >
            <circle
              cx={1}
              cy={1}
              r={transform.scale >= 0.7 ? 1.2 : 0.9}
              fill={isDark ? '#1E293B' : '#CBD5E1'}
            />
          </pattern>
        </defs>

        {/* Background hit surface with dot grid */}
        <rect
          width="100%"
          height="100%"
          fill="url(#ekts-dot-grid)"
          data-canvas-bg="true"
        />

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Layer 1: Orthogonal Wires */}
          <g>
            {renderedWires.items.map(({ wire, d, state, isSelected, color }) => {
              const isActive = state !== 'none';
              const isFault = state === 'short_circuit';
              return (
                <g key={wire.id}>
                  {/* Wide invisible touch hitbox for selecting/deleting wire */}
                  {!isSimulating && (
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={22}
                      strokeLinejoin="round"
                      className="cursor-pointer"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onSelectComponent(null);
                        onSelectWire(wire.id);
                      }}
                    />
                  )}
                  {/* Glow under energized or selected wire */}
                  {(isSelected || isFault) && (
                    <path
                      d={d}
                      fill="none"
                      stroke={isFault ? 'rgba(220, 38, 38, 0.35)' : 'rgba(37, 99, 235, 0.25)'}
                      strokeWidth={isFault ? 9 : 8}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={isFault ? 3.5 : isActive ? 3 : isSelected ? 3.2 : 2.1}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={isFault ? '8 4' : undefined}
                    className={isFault ? 'animate-fault-dash pointer-events-none' : 'pointer-events-none'}
                  />
                </g>
              );
            })}

            {/* Junction dots where multiple wires branch from a node */}
            {renderedWires.junctions.map((j, idx) => (
              <circle
                key={idx}
                cx={j.x}
                cy={j.y}
                r={3.5}
                fill={j.color}
                className="pointer-events-none"
              />
            ))}
          </g>

          {/* Layer 2: IEC Components */}
          <g>
            {circuit.components.map((comp) => {
              const def = COMPONENT_DEFINITIONS[comp.type];
              const isInteractiveSim =
                isSimulating &&
                (comp.type === 'btn_start' ||
                  comp.type === 'btn_stop' ||
                  comp.type === 'btn_dual' ||
                  comp.type === 'switch_toggle' ||
                  comp.type === 'btn_estop' ||
                  comp.type === 'limit_no' ||
                  comp.type === 'limit_nc' ||
                  comp.type === 'fuse' ||
                  comp.type === 'thermal_nc');

              return (
                <g
                  key={comp.id}
                  transform={`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`}
                  onPointerDown={(e) => handleComponentPointerDown(e, comp)}
                  onPointerUp={(e) => handleComponentPointerUp(e, comp)}
                  onPointerCancel={(e) => handleComponentPointerUp(e, comp)}
                  onContextMenu={(e) => handleComponentContextMenu(e, comp)}
                  className={
                    isSimulating
                      ? isInteractiveSim
                        ? 'cursor-pointer'
                        : 'cursor-default'
                      : 'cursor-grab active:cursor-grabbing'
                  }
                  data-component-id={comp.id}
                >
                  {/* Generous touch target backdrop for dragging or pressing buttons */}
                  <rect
                    x={-def.halfWidth - 6}
                    y={-def.halfHeight + 10}
                    width={(def.halfWidth + 6) * 2}
                    height={Math.max(40, (def.halfHeight - 10) * 2)}
                    fill="transparent"
                  />

                  <ComponentSymbol
                    component={comp}
                    isDark={isDark}
                    isSimulating={isSimulating}
                    isSelected={!isSimulating && selectedComponentId === comp.id}
                    isEnergized={energizedIdSet.has(comp.id)}
                    isClosed={closedSwitchSet.has(comp.id)}
                    isLit={litLampSet.has(comp.id)}
                    isFault={faultCompSet.has(comp.id)}
                    isPressed={Boolean(interactions.pressedButtons[comp.id])}
                    isLocked={Boolean(interactions.lockedButtons?.[comp.id])}
                    isLatched={Boolean(interactions.latchedSwitches[comp.id])}
                    isBlown={Boolean(interactions.blownFuses[comp.id])}
                    motorStatus={simState.motorStates[comp.id]}
                    timerState={simState.timerStates[comp.id]}
                  />

                  {/* Subtle interactive affordance outline on pressable controls during simulation */}
                  {isInteractiveSim && (
                    <rect
                      x={-def.halfWidth - 4}
                      y={-22}
                      width={(def.halfWidth + 4) * 2}
                      height={44}
                      rx={8}
                      fill="transparent"
                      stroke={isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.22)'}
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Layer 3: Touch-Friendly Pins (Tap-to-Connect in Design Mode + Potential dots in Sim Mode) */}
          <g>
            {circuit.components.map((comp) => {
              const def = COMPONENT_DEFINITIONS[comp.type];
              return def.pins.map((pin) => {
                const pos = getAbsolutePinPosition(comp, pin.id);
                if (!pos) return null;

                const isPending =
                  pendingPin?.componentId === comp.id && pendingPin?.pinId === pin.id;
                const pinKey = makePinKey(comp.id, pin.id);
                const pots = simState.pinPotentials[pinKey];
                const topPot = pots && pots.length > 0 ? pots[0] : null;
                const isShortPin = simState.shortCircuit?.faultPinKeys.includes(pinKey);

                const pinColor = isSimulating
                  ? isShortPin
                    ? '#DC2626'
                    : topPot === 'L1'
                      ? '#DC2626'
                      : topPot === 'L2'
                        ? '#EA580C'
                        : topPot === 'L3'
                          ? '#D97706'
                          : topPot === 'N'
                            ? '#2563EB'
                            : isDark
                              ? '#64748B'
                              : '#475569'
                  : isPending
                    ? '#2563EB'
                    : isDark
                      ? '#94A3B8'
                      : '#334155';

                return (
                  <g
                    key={pinKey}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    data-pin-key={pinKey}
                  >
                    {/* Visual pin halo when active for wiring */}
                    {!isSimulating && isPending && (
                      <circle
                        cx={0}
                        cy={0}
                        r={11}
                        fill="rgba(37, 99, 235, 0.2)"
                        stroke="#2563EB"
                        strokeWidth={2}
                      />
                    )}
                    {/* Visual crisp terminal dot */}
                    <circle
                      cx={0}
                      cy={0}
                      r={isPending ? 4.8 : isSimulating ? 3.2 : 3.8}
                      fill={isPending ? '#2563EB' : isSimulating ? pinColor : isDark ? '#0F172A' : '#FFFFFF'}
                      stroke={pinColor}
                      strokeWidth={isSimulating ? 1.5 : 2}
                      className="pointer-events-none"
                    />
                    {/* Invisible generous 34px-equivalent touch hitbox for Tap-to-Connect */}
                    {!isSimulating && (
                      <circle
                        cx={0}
                        cy={0}
                        r={17}
                        fill="transparent"
                        className="cursor-crosshair"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onPinTap({ componentId: comp.id, pinId: pin.id });
                        }}
                      />
                    )}
                  </g>
                );
              });
            })}
          </g>
        </g>
      </svg>

      {/* Corner Floating Viewport Controls: Zoom In, Zoom Out, Fit to View */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
        <button
          type="button"
          onClick={() => zoomAtPoint(1.2)}
          aria-label="Yakınlaştır"
          title="Yakınlaştır"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAtPoint(1 / 1.2)}
          aria-label="Uzaklaştır"
          title="Uzaklaştır"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200 dark:bg-slate-800 mx-1" />
        <button
          type="button"
          onClick={fitToView}
          aria-label="Ekrana Sığdır"
          title="Ekrana Sığdır"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle Phase Legend in Simulation Mode */}
      {isSimulating && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-[11px] font-mono-tech text-slate-700 dark:text-slate-300 shadow-sm pointer-events-none">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-red-600 dark:bg-red-400 inline-block" />
            L1
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-orange-600 dark:bg-orange-400 inline-block" />
            L2
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-600 dark:bg-amber-400 inline-block" />
            L3
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-blue-600 dark:bg-blue-400 inline-block" />
            N
          </span>
        </div>
      )}
    </div>
  );
}
