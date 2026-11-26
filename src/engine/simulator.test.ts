import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyInteractionState,
  createInitialSimulationState,
  stepSimulation,
} from './simulator';
import { PRESET_CIRCUITS, cloneCircuit } from '../data/presets';
import type { CircuitDocument } from '../types/circuit';

test('Preset 1 (Latching / Mühürleme): Start latches K1, releasing Start stays latched, Stop releases', () => {
  const circuit = cloneCircuit(PRESET_CIRCUITS[0]);
  let sim = createInitialSimulationState(circuit);
  let interactions = createEmptyInteractionState();

  // 1. Initial idle state: K1 off, lamp H1 off, no short circuit
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.deepEqual(sim.energizedCoilLabels, []);
  assert.deepEqual(sim.litLampIds, []);

  // 2. Press Start (S1): K1 energizes, latches, lamp H1 turns on
  interactions = { ...interactions, pressedButtons: { 'p1-s1': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.ok(sim.energizedCoilLabels.includes('K1'));
  assert.ok(sim.closedSwitchIds.includes('p1-k1-latch'));
  assert.ok(sim.litLampIds.includes('p1-h1'));

  // 3. Release Start (S1): K1 MUST remain latched and lamp H1 remains lit
  interactions = { ...interactions, pressedButtons: {} };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.ok(sim.energizedCoilLabels.includes('K1'), 'K1 must stay latched after Start released');
  assert.ok(sim.litLampIds.includes('p1-h1'), 'Lamp H1 must stay lit while latched');

  // 4. Press Stop (S0): K1 de-energizes and lamp H1 turns off
  interactions = { ...interactions, pressedButtons: { 'p1-s0': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.deepEqual(sim.energizedCoilLabels, []);
  assert.deepEqual(sim.litLampIds, []);

  // 5. Release Stop (S0): K1 stays off
  interactions = { ...interactions, pressedButtons: {} };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.deepEqual(sim.energizedCoilLabels, []);
  assert.deepEqual(sim.litLampIds, []);
});

test('Preset 2 (Forward / Reverse with Electrical Interlock): CW, interlock protection, Stop, then CCW', () => {
  const circuit = cloneCircuit(PRESET_CIRCUITS[1]);
  let sim = createInitialSimulationState(circuit);
  let interactions = createEmptyInteractionState();

  // Idle: motor stopped
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.equal(sim.motorStates['p2-m1'], 'stopped');

  // Press S1 (Forward): K1 energizes & latches, motor rotates FORWARD (CW)
  interactions = { ...interactions, pressedButtons: { 'p2-s1': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.ok(sim.energizedCoilLabels.includes('K1'));
  assert.ok(!sim.energizedCoilLabels.includes('K2'));
  assert.equal(sim.motorStates['p2-m1'], 'forward');

  // Release S1: stays forward
  interactions = { ...interactions, pressedButtons: {} };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.motorStates['p2-m1'], 'forward');

  // While running forward, press S2 (Reverse): Electrical interlock (K1 NC) MUST block K2 and prevent short circuit!
  interactions = { ...interactions, pressedButtons: { 'p2-s2': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null, 'Interlock must prevent phase-to-phase short');
  assert.ok(sim.energizedCoilLabels.includes('K1'));
  assert.ok(!sim.energizedCoilLabels.includes('K2'), 'K2 must be blocked by K1 NC interlock');
  assert.equal(sim.motorStates['p2-m1'], 'forward');

  // Press Stop (S0): stops motor
  interactions = { ...interactions, pressedButtons: { 'p2-s0': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.motorStates['p2-m1'], 'stopped');
  assert.deepEqual(sim.energizedCoilLabels, []);

  // Release Stop, then press S2 (Reverse): K2 energizes, motor rotates REVERSE (CCW)
  interactions = { ...interactions, pressedButtons: {} };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  interactions = { ...interactions, pressedButtons: { 'p2-s2': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.ok(sim.energizedCoilLabels.includes('K2'));
  assert.equal(sim.motorStates['p2-m1'], 'reverse');

  // Release S2: remains latched in REVERSE
  interactions = { ...interactions, pressedButtons: {} };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.motorStates['p2-m1'], 'reverse');
});

test('Preset 3 (On-Delay Timer): Counts down 3 seconds before energizing K2, lamp, and 3-phase motor', () => {
  const circuit = cloneCircuit(PRESET_CIRCUITS[2]);
  let sim = createInitialSimulationState(circuit);
  let interactions = createEmptyInteractionState();

  // Idle
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.equal(sim.motorStates['p3-m1'], 'stopped');
  assert.equal(sim.timerStates['p3-t1-coil'].energized, false);
  assert.equal(sim.timerStates['p3-t1-coil'].remaining, 3);

  // Press & release Start (S1)
  interactions = { ...interactions, pressedButtons: { 'p3-s1': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.1);
  interactions = { ...interactions, pressedButtons: {} };
  sim = stepSimulation(circuit, sim, interactions, 0.4);

  // After 0.5s: K1 latched, T1 counting down (~2.5s remaining), K2 & motor still OFF
  assert.ok(sim.energizedCoilLabels.includes('K1'));
  assert.equal(sim.timerStates['p3-t1-coil'].energized, true);
  assert.ok(sim.timerStates['p3-t1-coil'].remaining > 2.4 && sim.timerStates['p3-t1-coil'].remaining < 2.6);
  assert.ok(!sim.energizedCoilLabels.includes('K2'));
  assert.equal(sim.motorStates['p3-m1'], 'stopped');

  // Advance 2.6 seconds in 0.2s steps -> timer expires at 3.0s
  for (let i = 0; i < 13; i++) {
    sim = stepSimulation(circuit, sim, interactions, 0.2);
  }

  assert.equal(sim.timerStates['p3-t1-coil'].timedOut, true);
  assert.equal(sim.timerStates['p3-t1-coil'].remaining, 0);
  assert.ok(sim.timedOutTimerLabels.includes('T1'));
  assert.ok(sim.energizedCoilLabels.includes('K2'));
  assert.ok(sim.litLampIds.includes('p3-h1'));
  assert.equal(sim.motorStates['p3-m1'], 'forward');

  // Press Stop (S0): everything turns off and timer resets to 3s
  interactions = { ...interactions, pressedButtons: { 'p3-s0': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.motorStates['p3-m1'], 'stopped');
  assert.equal(sim.timerStates['p3-t1-coil'].energized, false);
  assert.equal(sim.timerStates['p3-t1-coil'].remaining, 3);
  assert.deepEqual(sim.timedOutTimerLabels, []);
});

test('3-Phase Motor missing phase warning when only 2 phases reach U/V/W', () => {
  const circuit: CircuitDocument = {
    id: 'test-missing-phase',
    name: 'Missing Phase',
    components: [
      { id: 'l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 'l2', type: 'power_l2', x: 140, y: 60, rotation: 0, label: 'L2' },
      { id: 'm1', type: 'motor_3ph', x: 140, y: 200, rotation: 0, label: 'M1' },
    ],
    wires: [
      { id: 'w1', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 'm1', pinId: 'U' } },
      { id: 'w2', from: { componentId: 'l2', pinId: 'out' }, to: { componentId: 'm1', pinId: 'V' } },
    ],
  };

  const sim = stepSimulation(
    circuit,
    createInitialSimulationState(circuit),
    createEmptyInteractionState(),
    0.05
  );
  assert.equal(sim.shortCircuit, null);
  assert.equal(sim.motorStates['m1'], 'phase_missing');
});

test('Short-circuit protection detects direct L1-N and L1-L2 faults and highlights faulted wires', () => {
  const phaseToNeutral: CircuitDocument = {
    id: 'test-short-ln',
    name: 'Short L-N',
    components: [
      { id: 'l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 'f1', type: 'fuse', x: 100, y: 140, rotation: 0, label: 'F1' },
      { id: 'n1', type: 'power_n', x: 100, y: 240, rotation: 0, label: 'N' },
    ],
    wires: [
      { id: 'w1', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 'f1', pinId: '1' } },
      { id: 'w2', from: { componentId: 'f1', pinId: '2' }, to: { componentId: 'n1', pinId: 'out' } },
    ],
  };

  const simLN = stepSimulation(
    phaseToNeutral,
    createInitialSimulationState(phaseToNeutral),
    createEmptyInteractionState(),
    0.05
  );
  assert.ok(simLN.shortCircuit !== null, 'L1-N direct short must trigger fault');
  assert.ok(simLN.shortCircuit!.faultWireIds.includes('w1'));
  assert.ok(simLN.shortCircuit!.faultWireIds.includes('w2'));
  assert.equal(simLN.wireStates['w1'], 'short_circuit');

  const phaseToPhase: CircuitDocument = {
    id: 'test-short-ll',
    name: 'Short L1-L2',
    components: [
      { id: 'l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 'l2', type: 'power_l2', x: 180, y: 60, rotation: 0, label: 'L2' },
    ],
    wires: [
      { id: 'w-bad', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 'l2', pinId: 'out' } },
    ],
  };

  const simLL = stepSimulation(
    phaseToPhase,
    createInitialSimulationState(phaseToPhase),
    createEmptyInteractionState(),
    0.05
  );
  assert.ok(simLL.shortCircuit !== null, 'L1-L2 direct short must trigger fault');
  assert.deepEqual(simLL.shortCircuit!.faultWireIds, ['w-bad']);
});

test('E-Stop (Acil Stop NC) and Toggle Switch (Kalıcı Anahtar NO) work correctly', () => {
  const circuit: CircuitDocument = {
    id: 'test-switches',
    name: 'Switches',
    components: [
      { id: 'l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 'es', type: 'btn_estop', x: 100, y: 140, rotation: 0, label: 'ES1' },
      { id: 'sw', type: 'switch_toggle', x: 100, y: 240, rotation: 0, label: 'SW1' },
      { id: 'h1', type: 'lamp', x: 100, y: 340, rotation: 0, label: 'H1', lampColor: 'red' },
      { id: 'n1', type: 'power_n', x: 100, y: 440, rotation: 0, label: 'N' },
    ],
    wires: [
      { id: 'w1', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 'es', pinId: '11' } },
      { id: 'w2', from: { componentId: 'es', pinId: '12' }, to: { componentId: 'sw', pinId: '13' } },
      { id: 'w3', from: { componentId: 'sw', pinId: '14' }, to: { componentId: 'h1', pinId: 'X1' } },
      { id: 'w4', from: { componentId: 'h1', pinId: 'X2' }, to: { componentId: 'n1', pinId: 'out' } },
    ],
  };

  let sim = createInitialSimulationState(circuit);
  let interactions = createEmptyInteractionState();

  // Switch open -> lamp off
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.deepEqual(sim.litLampIds, []);

  // Latch toggle switch ON -> lamp on
  interactions = { ...interactions, latchedSwitches: { sw: true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.deepEqual(sim.litLampIds, ['h1']);

  // Engage E-Stop -> breaks NC circuit -> lamp off
  interactions = { ...interactions, latchedSwitches: { sw: true, es: true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.deepEqual(sim.litLampIds, []);
});

test('Preset 4 (Yıldız - Üçgen / Star-Delta): Starts in Star (Y), switches cleanly to Delta (Δ) after 4s, thermal trip stops all', () => {
  const circuit = cloneCircuit(PRESET_CIRCUITS[3]);
  let sim = createInitialSimulationState(circuit);
  let interactions = createEmptyInteractionState();

  // Idle: stopped
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.shortCircuit, null);
  assert.equal(sim.motorStates['p4-m1'], 'stopped');

  // Press Start (S1): K1 (Main) + KY (Star) + T1 (Timer) energize -> Motor spins in STAR FORWARD (YILDIZ)
  interactions = { ...interactions, pressedButtons: { 'p4-s1': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.1);
  interactions = { ...interactions, pressedButtons: {} };
  sim = stepSimulation(circuit, sim, interactions, 0.4);

  assert.equal(sim.shortCircuit, null);
  assert.ok(sim.energizedCoilLabels.includes('K1'));
  assert.ok(sim.energizedCoilLabels.includes('KY'));
  assert.ok(!sim.energizedCoilLabels.includes('KU'));
  assert.equal(sim.motorStates['p4-m1'], 'star_forward');

  // Advance 3.8s -> T1 reaches 4.0s -> KY drops out, KU closes -> Motor transitions cleanly to DELTA FORWARD (ÜÇGEN) without short circuit!
  for (let i = 0; i < 19; i++) {
    sim = stepSimulation(circuit, sim, interactions, 0.2);
    assert.equal(sim.shortCircuit, null, 'Star-to-Delta transition must never short circuit');
  }

  assert.ok(sim.energizedCoilLabels.includes('K1'));
  assert.ok(!sim.energizedCoilLabels.includes('KY'));
  assert.ok(sim.energizedCoilLabels.includes('KU'));
  assert.equal(sim.motorStates['p4-m1'], 'delta_forward');

  // Trip Thermal Overload Relay (AAR): cuts control power -> motor stops
  interactions = { ...interactions, blownFuses: { 'p4-aar': true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.equal(sim.motorStates['p4-m1'], 'stopped');
  assert.deepEqual(sim.energizedCoilLabels, []);
});

test('Off-Delay Timer (Ters Zaman Rölesi): Switches immediately on energize, counts down AFTER coil de-energizes', () => {
  const circuit: CircuitDocument = {
    id: 'test-off-delay',
    name: 'Off Delay',
    components: [
      { id: 'l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 's1', type: 'btn_start', x: 100, y: 160, rotation: 0, label: 'S1' },
      { id: 'tz1', type: 'coil_timer_off', x: 100, y: 260, rotation: 0, label: 'TZ1', delaySeconds: 2 },
      { id: 'tz1-no', type: 'contact_timer_off_no', x: 240, y: 160, rotation: 0, label: 'TZ1' },
      { id: 'h1', type: 'lamp', x: 240, y: 260, rotation: 0, label: 'H1', lampColor: 'yellow' },
      { id: 'n1', type: 'power_n', x: 180, y: 360, rotation: 0, label: 'N' },
    ],
    wires: [
      { id: 'w1', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 's1', pinId: '13' } },
      { id: 'w2', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 'tz1-no', pinId: '57' } },
      { id: 'w3', from: { componentId: 's1', pinId: '14' }, to: { componentId: 'tz1', pinId: 'A1' } },
      { id: 'w4', from: { componentId: 'tz1-no', pinId: '58' }, to: { componentId: 'h1', pinId: 'X1' } },
      { id: 'w5', from: { componentId: 'tz1', pinId: 'A2' }, to: { componentId: 'n1', pinId: 'out' } },
      { id: 'w6', from: { componentId: 'h1', pinId: 'X2' }, to: { componentId: 'n1', pinId: 'out' } },
    ],
  };

  let sim = createInitialSimulationState(circuit);
  let interactions = createEmptyInteractionState();

  // Idle: lamp off
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.deepEqual(sim.litLampIds, []);

  // Press S1: TZ1 energizes -> Off-delay NO closes IMMEDIATELY -> H1 turns ON!
  interactions = { ...interactions, pressedButtons: { s1: true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.ok(sim.litLampIds.includes('h1'), 'Off-delay NO must close immediately when coil energizes');
  assert.equal(sim.timerStates['tz1'].active, true);
  assert.equal(sim.timerStates['tz1'].counting, false);

  // Release S1: TZ1 coil de-energizes -> starts counting down 2s -> H1 STAYS ON during countdown!
  interactions = { ...interactions, pressedButtons: {} };
  for (let i = 0; i < 5; i++) {
    sim = stepSimulation(circuit, sim, interactions, 0.2);
  }
  assert.equal(sim.timerStates['tz1'].counting, true);
  assert.ok(sim.litLampIds.includes('h1'), 'Lamp must stay lit during off-delay countdown');

  // Finish remaining 1.2s -> H1 turns OFF!
  for (let i = 0; i < 6; i++) {
    sim = stepSimulation(circuit, sim, interactions, 0.2);
  }
  assert.equal(sim.timerStates['tz1'].active, false);
  assert.deepEqual(sim.litLampIds, []);
});

test('Dual Button (Çift Yollu Buton NC+NO): Pressing opens 11-12 and closes 23-24 simultaneously', () => {
  const circuit: CircuitDocument = {
    id: 'test-dual-btn',
    name: 'Dual Button',
    components: [
      { id: 'l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 'b1', type: 'btn_dual', x: 100, y: 160, rotation: 0, label: 'S1' },
      { id: 'h-nc', type: 'lamp', x: 60, y: 280, rotation: 0, label: 'H1', lampColor: 'red' },
      { id: 'h-no', type: 'lamp', x: 140, y: 280, rotation: 0, label: 'H2', lampColor: 'green' },
      { id: 'n1', type: 'power_n', x: 100, y: 380, rotation: 0, label: 'N' },
    ],
    wires: [
      { id: 'w1', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 'b1', pinId: '11' } },
      { id: 'w2', from: { componentId: 'l1', pinId: 'out' }, to: { componentId: 'b1', pinId: '23' } },
      { id: 'w3', from: { componentId: 'b1', pinId: '12' }, to: { componentId: 'h-nc', pinId: 'X1' } },
      { id: 'w4', from: { componentId: 'b1', pinId: '24' }, to: { componentId: 'h-no', pinId: 'X1' } },
      { id: 'w5', from: { componentId: 'h-nc', pinId: 'X2' }, to: { componentId: 'n1', pinId: 'out' } },
      { id: 'w6', from: { componentId: 'h-no', pinId: 'X2' }, to: { componentId: 'n1', pinId: 'out' } },
    ],
  };

  let sim = createInitialSimulationState(circuit);
  let interactions = createEmptyInteractionState();

  // Unpressed: NC lamp lit, NO lamp off
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.deepEqual(sim.litLampIds, ['h-nc']);

  // Locked pressed (EKTS right-click / mobile lock): NC opens, NO closes!
  interactions = { ...interactions, lockedButtons: { b1: true } };
  sim = stepSimulation(circuit, sim, interactions, 0.05);
  assert.deepEqual(sim.litLampIds, ['h-no']);
});
