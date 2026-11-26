import { COMPONENT_DEFINITIONS } from '../data/components';
import type { CircuitDocument, SavedCircuitSlot } from '../types/circuit';

const SAVED_SLOTS_KEY = 'ekts_mobil_saved_circuits_v1';
const ACTIVE_CIRCUIT_KEY = 'ekts_mobil_active_circuit_v1';

export function validateCircuitDocument(input: unknown): CircuitDocument | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !Array.isArray(obj.components) || !Array.isArray(obj.wires)) {
    return null;
  }

  const validComponents = obj.components.every((c) => {
    if (!c || typeof c !== 'object') return false;
    const comp = c as Record<string, unknown>;
    return (
      typeof comp.id === 'string' &&
      typeof comp.type === 'string' &&
      comp.type in COMPONENT_DEFINITIONS &&
      typeof comp.x === 'number' &&
      typeof comp.y === 'number' &&
      typeof comp.label === 'string'
    );
  });

  if (!validComponents) return null;

  const validWires = obj.wires.every((w) => {
    if (!w || typeof w !== 'object') return false;
    const wire = w as Record<string, unknown>;
    const from = wire.from as Record<string, unknown> | undefined;
    const to = wire.to as Record<string, unknown> | undefined;
    return (
      typeof wire.id === 'string' &&
      Boolean(from && typeof from.componentId === 'string' && typeof from.pinId === 'string') &&
      Boolean(to && typeof to.componentId === 'string' && typeof to.pinId === 'string')
    );
  });

  if (!validWires) return null;

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id : `circuit-${Date.now()}`,
    name: obj.name.trim() || 'Adsız Devre',
    description: typeof obj.description === 'string' ? obj.description : undefined,
    components: obj.components as CircuitDocument['components'],
    wires: obj.wires as CircuitDocument['wires'],
  };
}

export function loadSavedSlots(): SavedCircuitSlot[] {
  try {
    const raw = window.localStorage.getItem(SAVED_SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (slot) =>
        slot &&
        typeof slot.id === 'string' &&
        typeof slot.name === 'string' &&
        validateCircuitDocument(slot.circuit) !== null
    );
  } catch {
    return [];
  }
}

export function saveCircuitSlot(name: string, circuit: CircuitDocument): SavedCircuitSlot[] {
  const existing = loadSavedSlots();
  const cleanName = name.trim() || circuit.name || 'Kayıtlı Devre';
  const slotId = `slot-${Date.now()}`;
  const newSlot: SavedCircuitSlot = {
    id: slotId,
    name: cleanName,
    savedAt: new Date().toISOString(),
    circuit: {
      ...circuit,
      id: slotId,
      name: cleanName,
    },
  };
  const updated = [newSlot, ...existing].slice(0, 20);
  try {
    window.localStorage.setItem(SAVED_SLOTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore quota errors cleanly
  }
  return updated;
}

export function deleteCircuitSlot(slotId: string): SavedCircuitSlot[] {
  const updated = loadSavedSlots().filter((s) => s.id !== slotId);
  try {
    window.localStorage.setItem(SAVED_SLOTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
  return updated;
}

export function saveActiveCircuitDraft(circuit: CircuitDocument): void {
  try {
    window.localStorage.setItem(ACTIVE_CIRCUIT_KEY, JSON.stringify(circuit));
  } catch {
    // Ignore quota errors
  }
}

export function loadActiveCircuitDraft(): CircuitDocument | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_CIRCUIT_KEY);
    if (!raw) return null;
    return validateCircuitDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function exportCircuitJson(circuit: CircuitDocument): void {
  const blob = new Blob([JSON.stringify(circuit, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = circuit.name
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç]+/gi, '-')
    .replace(/(^-|-$)/g, '');
  a.href = url;
  a.download = `${slug || 'ekts-devre'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
