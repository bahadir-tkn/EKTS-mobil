import type {
  CircuitComponent,
  CircuitDocument,
  MotorStatus,
  Potential,
  ShortCircuitFault,
  SimulationState,
  TimerRuntimeState,
  UserInteractionState,
  WirePotentialState,
} from '../types/circuit';

const MAX_STEADY_STATE_ITERATIONS = 16;

export function makePinKey(componentId: string, pinId: string): string {
  return `${componentId}:${pinId}`;
}

export function normalizeLabel(label: string): string {
  return label.trim().toUpperCase();
}

export function createEmptyInteractionState(): UserInteractionState {
  return {
    pressedButtons: {},
    lockedButtons: {},
    latchedSwitches: {},
    blownFuses: {},
  };
}

export function createInitialSimulationState(circuit?: CircuitDocument): SimulationState {
  const timerStates: Record<string, TimerRuntimeState> = {};
  const motorStates: Record<string, MotorStatus> = {};

  if (circuit) {
    for (const comp of circuit.components) {
      if (comp.type === 'coil_timer_on' || comp.type === 'coil_timer_off') {
        const delay = Math.max(0.5, comp.delaySeconds ?? 3);
        timerStates[comp.id] = {
          mode: comp.type === 'coil_timer_on' ? 'on_delay' : 'off_delay',
          energized: false,
          active: false,
          counting: false,
          elapsed: 0,
          remaining: delay,
          delaySeconds: delay,
          timedOut: false,
        };
      } else if (comp.type === 'motor_3ph' || comp.type === 'motor_3ph_6pin') {
        motorStates[comp.id] = 'stopped';
      }
    }
  }

  return {
    pinPotentials: {},
    wireStates: {},
    energizedCoilLabels: [],
    energizedCoilIds: [],
    timedOutTimerLabels: [],
    activeOffDelayTimerLabels: [],
    timerStates,
    closedSwitchIds: [],
    litLampIds: [],
    motorStates,
    shortCircuit: null,
  };
}

interface GraphEdge {
  to: string;
  wireId?: string;
  componentId?: string;
}

function getComponentPowerPins(comp: CircuitComponent): { pinId: string; pot: Potential }[] {
  switch (comp.type) {
    case 'power_l1':
      return [{ pinId: 'out', pot: 'L1' }];
    case 'power_l2':
      return [{ pinId: 'out', pot: 'L2' }];
    case 'power_l3':
      return [{ pinId: 'out', pot: 'L3' }];
    case 'power_n':
      return [{ pinId: 'out', pot: 'N' }];
    case 'power_3ph':
      return [
        { pinId: 'L1', pot: 'L1' },
        { pinId: 'L2', pot: 'L2' },
        { pinId: 'L3', pot: 'L3' },
      ];
    default:
      return [];
  }
}

function isPhase(p: Potential): boolean {
  return p === 'L1' || p === 'L2' || p === 'L3';
}

function formatPotentialName(p: Potential): string {
  switch (p) {
    case 'L1':
      return 'Faz R (L1)';
    case 'L2':
      return 'Faz S (L2)';
    case 'L3':
      return 'Faz T (L3)';
    case 'N':
      return 'Nötr (N)';
  }
}

function isMomentaryActive(compId: string, interactions: UserInteractionState): boolean {
  return Boolean(interactions.pressedButtons[compId] || interactions.lockedButtons?.[compId]);
}

/**
 * Determines whether a switch/contact/fuse is electrically conducting in the current iteration.
 */
function getInternalConductingPairs(
  comp: CircuitComponent,
  interactions: UserInteractionState,
  energizedCoils: Set<string>,
  timedOutOnTimers: Set<string>,
  activeOffTimers: Set<string>
): { closed: boolean; pairs: [string, string][] } {
  const norm = normalizeLabel(comp.label);

  switch (comp.type) {
    case 'btn_start': {
      const closed = isMomentaryActive(comp.id, interactions);
      return { closed, pairs: closed ? [['13', '14']] : [] };
    }
    case 'btn_stop': {
      const closed = !isMomentaryActive(comp.id, interactions);
      return { closed, pairs: closed ? [['11', '12']] : [] };
    }
    case 'btn_dual': {
      // Mechanically linked NC (11-12) and NO (23-24)
      const pressed = isMomentaryActive(comp.id, interactions);
      return {
        closed: pressed,
        pairs: pressed ? [['23', '24']] : [['11', '12']],
      };
    }
    case 'switch_toggle':
    case 'limit_no': {
      const closed = Boolean(interactions.latchedSwitches[comp.id]);
      return { closed, pairs: closed ? [['13', '14']] : [] };
    }
    case 'btn_estop':
    case 'limit_nc': {
      const closed = !interactions.latchedSwitches[comp.id];
      return { closed, pairs: closed ? [['11', '12']] : [] };
    }
    case 'fuse': {
      const closed = !interactions.blownFuses[comp.id];
      return { closed, pairs: closed ? [['1', '2']] : [] };
    }
    case 'thermal_nc': {
      const closed = !interactions.blownFuses[comp.id];
      return { closed, pairs: closed ? [['95', '96']] : [] };
    }
    case 'contact_no': {
      const closed = norm.length > 0 && energizedCoils.has(norm);
      return { closed, pairs: closed ? [['13', '14']] : [] };
    }
    case 'contact_nc': {
      const closed = !(norm.length > 0 && energizedCoils.has(norm));
      return { closed, pairs: closed ? [['11', '12']] : [] };
    }
    case 'contact_power_3p': {
      const closed = norm.length > 0 && energizedCoils.has(norm);
      return {
        closed,
        pairs: closed
          ? [
              ['1', '2'],
              ['3', '4'],
              ['5', '6'],
            ]
          : [],
      };
    }
    case 'contact_timer_no': {
      const closed = norm.length > 0 && timedOutOnTimers.has(norm);
      return { closed, pairs: closed ? [['17', '18']] : [] };
    }
    case 'contact_timer_nc': {
      const closed = !(norm.length > 0 && timedOutOnTimers.has(norm));
      return { closed, pairs: closed ? [['15', '16']] : [] };
    }
    case 'contact_timer_off_no': {
      const closed = norm.length > 0 && activeOffTimers.has(norm);
      return { closed, pairs: closed ? [['57', '58']] : [] };
    }
    case 'contact_timer_off_nc': {
      const closed = !(norm.length > 0 && activeOffTimers.has(norm));
      return { closed, pairs: closed ? [['65', '66']] : [] };
    }
    default:
      return { closed: false, pairs: [] };
  }
}

interface NetworkSolveResult {
  adjacency: Map<string, GraphEdge[]>;
  pinPotentials: Map<string, Set<Potential>>;
  closedSwitchIds: Set<string>;
  shortCircuit: ShortCircuitFault | null;
}

/**
 * Checks whether a list of pin keys all belong to the exact same zero-impedance connected component (net).
 * Used to detect a floating Star (Y) point on 6-terminal 3-phase motors (U2-V2-W2 shorted by KY contactor).
 */
function arePinsElectricallyConnected(
  adjacency: Map<string, GraphEdge[]>,
  pinKeys: string[]
): boolean {
  if (pinKeys.length <= 1) return true;
  const start = pinKeys[0];
  const targets = new Set(pinKeys.slice(1));
  const visited = new Set<string>([start]);
  const queue = [start];

  while (queue.length > 0 && targets.size > 0) {
    const curr = queue.shift()!;
    const neighbors = adjacency.get(curr);
    if (!neighbors) continue;
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        targets.delete(edge.to);
        queue.push(edge.to);
      }
    }
  }

  return targets.size === 0;
}

/**
 * Builds the zero-impedance conduction graph (wires + closed contacts/switches/fuses)
 * and propagates potentials (L1, L2, L3, N) from all power sources.
 * Also detects direct short circuits between any two distinct potentials.
 */
function solveElectricalNetwork(
  circuit: CircuitDocument,
  interactions: UserInteractionState,
  energizedCoils: Set<string>,
  timedOutOnTimers: Set<string>,
  activeOffTimers: Set<string>
): NetworkSolveResult {
  const adjacency = new Map<string, GraphEdge[]>();
  const closedSwitchIds = new Set<string>();

  const addEdge = (a: string, b: string, wireId?: string, componentId?: string) => {
    let listA = adjacency.get(a);
    if (!listA) {
      listA = [];
      adjacency.set(a, listA);
    }
    listA.push({ to: b, wireId, componentId });

    let listB = adjacency.get(b);
    if (!listB) {
      listB = [];
      adjacency.set(b, listB);
    }
    listB.push({ to: a, wireId, componentId });
  };

  // 1. Add all wire edges
  for (const wire of circuit.wires) {
    const a = makePinKey(wire.from.componentId, wire.from.pinId);
    const b = makePinKey(wire.to.componentId, wire.to.pinId);
    addEdge(a, b, wire.id, undefined);
  }

  // 2. Add internal conducting paths of closed switches, contacts, fuses, thermal relays
  for (const comp of circuit.components) {
    const { closed, pairs } = getInternalConductingPairs(
      comp,
      interactions,
      energizedCoils,
      timedOutOnTimers,
      activeOffTimers
    );
    if (closed) {
      closedSwitchIds.add(comp.id);
    }
    for (const [p1, p2] of pairs) {
      addEdge(makePinKey(comp.id, p1), makePinKey(comp.id, p2), undefined, comp.id);
    }
  }

  // 3. Collect power source nodes grouped by potential
  const sourcesByPotential: Record<Potential, string[]> = {
    L1: [],
    L2: [],
    L3: [],
    N: [],
  };

  for (const comp of circuit.components) {
    const powerPins = getComponentPowerPins(comp);
    for (const { pinId, pot } of powerPins) {
      sourcesByPotential[pot].push(makePinKey(comp.id, pinId));
    }
  }

  // 4. Propagate each potential via BFS from its source pins
  const pinPotentials = new Map<string, Set<Potential>>();
  const potentialsOrder: Potential[] = ['L1', 'L2', 'L3', 'N'];

  for (const pot of potentialsOrder) {
    const queue = [...sourcesByPotential[pot]];
    const visited = new Set<string>(queue);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      let set = pinPotentials.get(curr);
      if (!set) {
        set = new Set<Potential>();
        pinPotentials.set(curr, set);
      }
      set.add(pot);

      const neighbors = adjacency.get(curr);
      if (!neighbors) continue;
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
  }

  // 5. Check for short circuits (any pin receiving 2+ distinct potentials)
  let shortCircuit: ShortCircuitFault | null = null;
  let conflictPotentials: [Potential, Potential] | null = null;

  for (const [, pots] of pinPotentials) {
    if (pots.size > 1) {
      const arr = Array.from(pots);
      conflictPotentials = [arr[0], arr[1]];
      break;
    }
  }

  if (conflictPotentials) {
    const [potA, potB] = conflictPotentials;
    const sourcesA = sourcesByPotential[potA];
    const targetSetB = new Set(sourcesByPotential[potB]);

    const parent = new Map<string, { prev: string; edge: GraphEdge }>();
    const visited = new Set<string>(sourcesA);
    const queue = [...sourcesA];
    let hitNode: string | null = null;

    while (queue.length > 0 && !hitNode) {
      const curr = queue.shift()!;
      if (targetSetB.has(curr)) {
        hitNode = curr;
        break;
      }
      const neighbors = adjacency.get(curr);
      if (!neighbors) continue;
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          parent.set(edge.to, { prev: curr, edge });
          queue.push(edge.to);
        }
      }
    }

    const faultWireIds = new Set<string>();
    const faultComponentIds = new Set<string>();
    const faultPinKeys = new Set<string>();

    if (hitNode) {
      let cursor: string | undefined = hitNode;
      while (cursor) {
        faultPinKeys.add(cursor);
        const compId = cursor.split(':')[0];
        if (compId) faultComponentIds.add(compId);
        const step = parent.get(cursor);
        if (!step) break;
        if (step.edge.wireId) faultWireIds.add(step.edge.wireId);
        if (step.edge.componentId) faultComponentIds.add(step.edge.componentId);
        cursor = step.prev;
      }
    } else {
      for (const [pinKey, pots] of pinPotentials) {
        if (pots.size > 1) faultPinKeys.add(pinKey);
      }
      for (const wire of circuit.wires) {
        const a = makePinKey(wire.from.componentId, wire.from.pinId);
        const b = makePinKey(wire.to.componentId, wire.to.pinId);
        if ((pinPotentials.get(a)?.size ?? 0) > 1 || (pinPotentials.get(b)?.size ?? 0) > 1) {
          faultWireIds.add(wire.id);
        }
      }
    }

    shortCircuit = {
      potentials: [potA, potB],
      message: `Kısa devre tespit edildi: ${formatPotentialName(potA)} ile ${formatPotentialName(potB)} yük olmadan doğrudan birleşti!`,
      faultWireIds: Array.from(faultWireIds),
      faultComponentIds: Array.from(faultComponentIds),
      faultPinKeys: Array.from(faultPinKeys),
    };
  }

  return { adjacency, pinPotentials, closedSwitchIds, shortCircuit };
}

function isTwoTerminalLoadEnergized(
  compId: string,
  pinA: string,
  pinB: string,
  pinPotentials: Map<string, Set<Potential>>
): boolean {
  const potsA = pinPotentials.get(makePinKey(compId, pinA));
  const potsB = pinPotentials.get(makePinKey(compId, pinB));
  if (!potsA || !potsB || potsA.size === 0 || potsB.size === 0) return false;

  const aHasPhase = Array.from(potsA).some(isPhase);
  const bHasPhase = Array.from(potsB).some(isPhase);
  const aHasNeutral = potsA.has('N');
  const bHasNeutral = potsB.has('N');

  return (aHasPhase && bHasNeutral) || (bHasPhase && aHasNeutral);
}

function getPhaseDirection(pU: Potential, pV: Potential, pW: Potential): 'forward' | 'reverse' {
  const seq = `${pU}-${pV}-${pW}`;
  if (seq === 'L1-L2-L3' || seq === 'L2-L3-L1' || seq === 'L3-L1-L2') {
    return 'forward';
  }
  return 'reverse';
}

function getSinglePhaseAt(
  compId: string,
  pinId: string,
  pinPotentials: Map<string, Set<Potential>>
): Potential | null {
  const pots = pinPotentials.get(makePinKey(compId, pinId));
  if (!pots || pots.size === 0) return null;
  for (const p of pots) {
    if (isPhase(p)) return p;
  }
  return null;
}

function hasAnyPotentialAt(
  compId: string,
  pinId: string,
  pinPotentials: Map<string, Set<Potential>>
): boolean {
  const pots = pinPotentials.get(makePinKey(compId, pinId));
  return Boolean(pots && pots.size > 0);
}

function evaluate3PinMotorStatus(
  compId: string,
  pinPotentials: Map<string, Set<Potential>>
): MotorStatus {
  const pU = getSinglePhaseAt(compId, 'U', pinPotentials);
  const pV = getSinglePhaseAt(compId, 'V', pinPotentials);
  const pW = getSinglePhaseAt(compId, 'W', pinPotentials);

  const anyConnected =
    hasAnyPotentialAt(compId, 'U', pinPotentials) ||
    hasAnyPotentialAt(compId, 'V', pinPotentials) ||
    hasAnyPotentialAt(compId, 'W', pinPotentials);
  if (!anyConnected) return 'stopped';
  if (!pU || !pV || !pW) return 'phase_missing';
  if (new Set([pU, pV, pW]).size < 3) return 'phase_missing';

  return getPhaseDirection(pU, pV, pW);
}

/**
 * Evaluates a 6-terminal 3-phase asynchronous motor (U1-V1-W1 / W2-U2-V2) for
 * authentic Star (Yıldız) and Delta (Üçgen) operation!
 */
function evaluate6PinMotorStatus(
  compId: string,
  adjacency: Map<string, GraphEdge[]>,
  pinPotentials: Map<string, Set<Potential>>
): MotorStatus {
  const pU1 = getSinglePhaseAt(compId, 'U1', pinPotentials);
  const pV1 = getSinglePhaseAt(compId, 'V1', pinPotentials);
  const pW1 = getSinglePhaseAt(compId, 'W1', pinPotentials);
  const pU2 = getSinglePhaseAt(compId, 'U2', pinPotentials);
  const pV2 = getSinglePhaseAt(compId, 'V2', pinPotentials);
  const pW2 = getSinglePhaseAt(compId, 'W2', pinPotentials);

  const anyPotential = ['U1', 'V1', 'W1', 'U2', 'V2', 'W2'].some((pin) =>
    hasAnyPotentialAt(compId, pin, pinPotentials)
  );
  if (!anyPotential) return 'stopped';

  const topHasAll3 = Boolean(pU1 && pV1 && pW1 && new Set([pU1, pV1, pW1]).size === 3);
  const botHasAll3 = Boolean(pU2 && pV2 && pW2 && new Set([pU2, pV2, pW2]).size === 3);

  // Case 1: Delta (Üçgen - Δ)
  // Both sides have 3 distinct phases AND every winding (U1-U2, V1-V2, W1-W2) spans two different phases!
  if (topHasAll3 && botHasAll3 && pU1 && pV1 && pW1 && pU2 && pV2 && pW2) {
    const validWindings = pU1 !== pU2 && pV1 !== pV2 && pW1 !== pW2;
    if (validWindings) {
      const dir = getPhaseDirection(pU1, pV1, pW1);
      return dir === 'forward' ? 'delta_forward' : 'delta_reverse';
    }
    return 'phase_missing';
  }

  // Case 2: Star (Yıldız - Y) with phases on U1-V1-W1 and star-point bridge across U2-V2-W2
  if (topHasAll3 && pU1 && pV1 && pW1) {
    const botHasNoPhase = !pU2 && !pV2 && !pW2;
    const starPointClosed = arePinsElectricallyConnected(adjacency, [
      makePinKey(compId, 'U2'),
      makePinKey(compId, 'V2'),
      makePinKey(compId, 'W2'),
    ]);
    if (botHasNoPhase && starPointClosed) {
      const dir = getPhaseDirection(pU1, pV1, pW1);
      return dir === 'forward' ? 'star_forward' : 'star_reverse';
    }
  }

  // Symmetric Star (Yıldız - Y) with phases on U2-V2-W2 and star-point bridge across U1-V1-W1
  if (botHasAll3 && pU2 && pV2 && pW2) {
    const topHasNoPhase = !pU1 && !pV1 && !pW1;
    const starPointClosed = arePinsElectricallyConnected(adjacency, [
      makePinKey(compId, 'U1'),
      makePinKey(compId, 'V1'),
      makePinKey(compId, 'W1'),
    ]);
    if (topHasNoPhase && starPointClosed) {
      const dir = getPhaseDirection(pU2, pV2, pW2);
      return dir === 'forward' ? 'star_forward' : 'star_reverse';
    }
  }

  return 'phase_missing';
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function solveSteadyState(
  circuit: CircuitDocument,
  interactions: UserInteractionState,
  initialEnergizedCoils: Set<string>,
  timedOutOnTimers: Set<string>,
  activeOffTimers: Set<string>
): {
  network: NetworkSolveResult;
  energizedCoilLabels: Set<string>;
  energizedCoilIds: Set<string>;
  energizedTimerIds: Set<string>;
} {
  let currentCoils = new Set<string>(initialEnergizedCoils);
  let lastNetwork: NetworkSolveResult = solveElectricalNetwork(
    circuit,
    interactions,
    currentCoils,
    timedOutOnTimers,
    activeOffTimers
  );
  let lastEnergizedCoilIds = new Set<string>();
  let lastEnergizedTimerIds = new Set<string>();

  for (let iter = 0; iter < MAX_STEADY_STATE_ITERATIONS; iter++) {
    lastNetwork = solveElectricalNetwork(
      circuit,
      interactions,
      currentCoils,
      timedOutOnTimers,
      activeOffTimers
    );
    if (lastNetwork.shortCircuit) {
      return {
        network: lastNetwork,
        energizedCoilLabels: new Set<string>(),
        energizedCoilIds: new Set<string>(),
        energizedTimerIds: new Set<string>(),
      };
    }

    const nextCoils = new Set<string>();
    const nextCoilIds = new Set<string>();
    const nextTimerIds = new Set<string>();

    for (const comp of circuit.components) {
      if (comp.type === 'coil_contactor') {
        if (isTwoTerminalLoadEnergized(comp.id, 'A1', 'A2', lastNetwork.pinPotentials)) {
          nextCoilIds.add(comp.id);
          const norm = normalizeLabel(comp.label);
          if (norm) nextCoils.add(norm);
        }
      } else if (comp.type === 'coil_timer_on' || comp.type === 'coil_timer_off') {
        if (isTwoTerminalLoadEnergized(comp.id, 'A1', 'A2', lastNetwork.pinPotentials)) {
          nextTimerIds.add(comp.id);
          nextCoilIds.add(comp.id);
        }
      }
    }

    lastEnergizedCoilIds = nextCoilIds;
    lastEnergizedTimerIds = nextTimerIds;

    if (setsEqual(currentCoils, nextCoils)) {
      break;
    }
    currentCoils = nextCoils;
  }

  return {
    network: lastNetwork,
    energizedCoilLabels: currentCoils,
    energizedCoilIds: lastEnergizedCoilIds,
    energizedTimerIds: lastEnergizedTimerIds,
  };
}

/**
 * Pure TypeScript simulation step function.
 * Computes steady-state circuit response, latching, On-Delay & Off-Delay timers,
 * 3-pin & 6-pin (Star/Delta) asynchronous motors, signal lamps, and short-circuit protection.
 */
export function stepSimulation(
  circuit: CircuitDocument,
  prevState: SimulationState,
  interactions: UserInteractionState,
  dtSeconds: number
): SimulationState {
  if (prevState.shortCircuit) {
    return prevState;
  }

  const prevCoils = new Set<string>(prevState.energizedCoilLabels);
  const prevTimedOutOn = new Set<string>(prevState.timedOutTimerLabels);
  const prevActiveOff = new Set<string>(prevState.activeOffDelayTimerLabels ?? []);

  // Pass 1: Solve steady state with previous timer contact states
  let solved = solveSteadyState(
    circuit,
    interactions,
    prevCoils,
    prevTimedOutOn,
    prevActiveOff
  );

  if (solved.network.shortCircuit) {
    return buildShortCircuitState(circuit, solved.network);
  }

  // Pass 2: Advance On-Delay (Düz ZR) and Off-Delay (Ters ZR) timers
  const nextTimerStates: Record<string, TimerRuntimeState> = {};
  const nextTimedOutOn = new Set<string>();
  const nextActiveOff = new Set<string>();
  const clampedDt = Math.max(0, Math.min(dtSeconds, 0.5));

  for (const comp of circuit.components) {
    if (comp.type === 'coil_timer_on') {
      const delaySeconds = Math.max(0.5, comp.delaySeconds ?? 3);
      const energized = solved.energizedTimerIds.has(comp.id);
      const prevTimer = prevState.timerStates[comp.id];

      if (energized) {
        const prevElapsed = prevTimer && prevTimer.energized ? prevTimer.elapsed : 0;
        const elapsed = Math.min(delaySeconds, prevElapsed + clampedDt);
        const remaining = Math.max(0, delaySeconds - elapsed);
        const timedOut = elapsed >= delaySeconds - 1e-6;

        nextTimerStates[comp.id] = {
          mode: 'on_delay',
          energized: true,
          active: timedOut,
          counting: !timedOut,
          elapsed,
          remaining,
          delaySeconds,
          timedOut,
        };

        const norm = normalizeLabel(comp.label);
        if (timedOut && norm) nextTimedOutOn.add(norm);
      } else {
        nextTimerStates[comp.id] = {
          mode: 'on_delay',
          energized: false,
          active: false,
          counting: false,
          elapsed: 0,
          remaining: delaySeconds,
          delaySeconds,
          timedOut: false,
        };
      }
    } else if (comp.type === 'coil_timer_off') {
      const delaySeconds = Math.max(0.5, comp.delaySeconds ?? 3);
      const energized = solved.energizedTimerIds.has(comp.id);
      const prevTimer = prevState.timerStates[comp.id];
      const norm = normalizeLabel(comp.label);

      if (energized) {
        // Off-Delay: contacts switch IMMEDIATELY on energization, timer stays armed at full delay
        nextTimerStates[comp.id] = {
          mode: 'off_delay',
          energized: true,
          active: true,
          counting: false,
          elapsed: 0,
          remaining: delaySeconds,
          delaySeconds,
          timedOut: false,
        };
        if (norm) nextActiveOff.add(norm);
      } else if (prevTimer && (prevTimer.energized || prevTimer.counting)) {
        // Coil just de-energized or is mid-countdown: keep contacts active until countdown hits 0
        const prevElapsed = prevTimer.energized ? 0 : prevTimer.elapsed;
        const elapsed = Math.min(delaySeconds, prevElapsed + clampedDt);
        const remaining = Math.max(0, delaySeconds - elapsed);
        const finished = elapsed >= delaySeconds - 1e-6;

        nextTimerStates[comp.id] = {
          mode: 'off_delay',
          energized: false,
          active: !finished,
          counting: !finished,
          elapsed: finished ? 0 : elapsed,
          remaining: finished ? delaySeconds : remaining,
          delaySeconds,
          timedOut: finished,
        };
        if (!finished && norm) nextActiveOff.add(norm);
      } else {
        nextTimerStates[comp.id] = {
          mode: 'off_delay',
          energized: false,
          active: false,
          counting: false,
          elapsed: 0,
          remaining: delaySeconds,
          delaySeconds,
          timedOut: false,
        };
      }
    }
  }

  // Pass 3: Re-solve steady state if any timer contact state changed this tick
  if (
    !setsEqual(prevTimedOutOn, nextTimedOutOn) ||
    !setsEqual(prevActiveOff, nextActiveOff)
  ) {
    solved = solveSteadyState(
      circuit,
      interactions,
      solved.energizedCoilLabels,
      nextTimedOutOn,
      nextActiveOff
    );
    if (solved.network.shortCircuit) {
      return buildShortCircuitState(circuit, solved.network);
    }
  }

  // Evaluate loads (lamps and 3-phase motors)
  const litLampIds: string[] = [];
  const motorStates: Record<string, MotorStatus> = {};

  for (const comp of circuit.components) {
    if (comp.type === 'lamp') {
      if (isTwoTerminalLoadEnergized(comp.id, 'X1', 'X2', solved.network.pinPotentials)) {
        litLampIds.push(comp.id);
      }
    } else if (comp.type === 'motor_3ph') {
      motorStates[comp.id] = evaluate3PinMotorStatus(comp.id, solved.network.pinPotentials);
    } else if (comp.type === 'motor_3ph_6pin') {
      motorStates[comp.id] = evaluate6PinMotorStatus(
        comp.id,
        solved.network.adjacency,
        solved.network.pinPotentials
      );
    }
  }

  // Compute wire energization states
  const wireStates: Record<string, WirePotentialState> = {};
  for (const wire of circuit.wires) {
    const aKey = makePinKey(wire.from.componentId, wire.from.pinId);
    const pots = solved.network.pinPotentials.get(aKey);
    if (!pots || pots.size === 0) {
      wireStates[wire.id] = 'none';
    } else {
      wireStates[wire.id] = Array.from(pots)[0];
    }
  }

  const pinPotentialsRecord: Record<string, Potential[]> = {};
  for (const [key, set] of solved.network.pinPotentials) {
    pinPotentialsRecord[key] = Array.from(set);
  }

  return {
    pinPotentials: pinPotentialsRecord,
    wireStates,
    energizedCoilLabels: Array.from(solved.energizedCoilLabels),
    energizedCoilIds: Array.from(solved.energizedCoilIds),
    timedOutTimerLabels: Array.from(nextTimedOutOn),
    activeOffDelayTimerLabels: Array.from(nextActiveOff),
    timerStates: nextTimerStates,
    closedSwitchIds: Array.from(solved.network.closedSwitchIds),
    litLampIds,
    motorStates,
    shortCircuit: null,
  };
}

function buildShortCircuitState(
  circuit: CircuitDocument,
  network: NetworkSolveResult
): SimulationState {
  const fault = network.shortCircuit!;
  const faultWireSet = new Set(fault.faultWireIds);
  const wireStates: Record<string, WirePotentialState> = {};

  for (const wire of circuit.wires) {
    wireStates[wire.id] = faultWireSet.has(wire.id) ? 'short_circuit' : 'none';
  }

  const timerStates: Record<string, TimerRuntimeState> = {};
  const motorStates: Record<string, MotorStatus> = {};
  for (const comp of circuit.components) {
    if (comp.type === 'coil_timer_on' || comp.type === 'coil_timer_off') {
      const delay = Math.max(0.5, comp.delaySeconds ?? 3);
      timerStates[comp.id] = {
        mode: comp.type === 'coil_timer_on' ? 'on_delay' : 'off_delay',
        energized: false,
        active: false,
        counting: false,
        elapsed: 0,
        remaining: delay,
        delaySeconds: delay,
        timedOut: false,
      };
    } else if (comp.type === 'motor_3ph' || comp.type === 'motor_3ph_6pin') {
      motorStates[comp.id] = 'stopped';
    }
  }

  const pinPotentialsRecord: Record<string, Potential[]> = {};
  for (const [key, set] of network.pinPotentials) {
    pinPotentialsRecord[key] = Array.from(set);
  }

  return {
    pinPotentials: pinPotentialsRecord,
    wireStates,
    energizedCoilLabels: [],
    energizedCoilIds: [],
    timedOutTimerLabels: [],
    activeOffDelayTimerLabels: [],
    timerStates,
    closedSwitchIds: Array.from(network.closedSwitchIds),
    litLampIds: [],
    motorStates,
    shortCircuit: fault,
  };
}
