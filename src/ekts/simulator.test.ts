import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEscFile, type EscCircuit } from '../esc/escFile';
import { Simulator } from './simulator';

function load(name: string): EscCircuit {
  const path = fileURLToPath(new URL(`../esc/fixtures/${name}`, import.meta.url));
  const buf = readFileSync(path);
  return parseEscFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function find(c: EscCircuit, type: string, label?: string): number {
  const i = c.elements.findIndex((e) => e.type === type && (label === undefined || e.label === label));
  assert.ok(i >= 0, `${type} ${label ?? ''} not found`);
  return i;
}

function press(s: Simulator, i: number) {
  s.pointerDown(i);
  s.advance(50);
  s.pointerUp(i);
  s.advance(50);
}

test('yildizucgen: star start, timer counts down, switches to delta, STOP drops all', () => {
  const c = load('yildizucgen.esc');
  const s = new Simulator(c);
  const relayA = find(c, 'Role', 'A');
  const relayB = find(c, 'Role', 'B');
  const relayM = find(c, 'Role', 'M');
  const zr = find(c, 'ZamanRolesi', 'ZR');
  const motor = find(c, 'UcFazliMotor2');

  s.start();
  s.advance(50);
  let sn = s.snapshot();
  assert.equal(sn.error, null);
  assert.equal(sn.activeLines.some(Boolean), false, 'nothing energized before START');

  press(s, find(c, 'StartButon'));
  sn = s.snapshot();
  assert.equal(sn.elementStates[relayM], 2);
  assert.equal(sn.elementStates[relayA], 2, 'star contactor on');
  assert.equal(sn.elementStates[relayB], 1);
  assert.equal(sn.elementStates[zr], 2);
  assert.equal(sn.elementStates[motor], 2, 'motor runs');
  assert.ok(sn.activeLines.some(Boolean));

  s.advance(1000);
  assert.equal(s.snapshot().label2Text[zr], '2', 'timer shows remaining seconds');

  s.advance(3000);
  sn = s.snapshot();
  assert.equal(sn.error, null);
  assert.equal(sn.elementStates[relayA], 1, 'star contactor off');
  assert.equal(sn.elementStates[relayB], 2, 'delta contactor on');
  assert.equal(sn.elementStates[relayM], 2);
  assert.equal(sn.elementStates[motor], 2);

  press(s, find(c, 'StopButon'));
  sn = s.snapshot();
  assert.equal(sn.elementStates[relayM], 1);
  assert.equal(sn.elementStates[relayB], 1);
  assert.equal(sn.error, null);
});

test('3f: three-phase motor on the supply runs as soon as the simulation starts', () => {
  const c = load('3f.esc');
  const s = new Simulator(c);
  s.start();
  s.advance(50);
  const sn = s.snapshot();
  assert.equal(sn.error, null);
  assert.equal(sn.elementStates[find(c, 'UcFazliMotor2')], 2);
});

test('proble2: timer relay runs out and the single-phase motor reaches run state', () => {
  const c = load('proble2.esc');
  const s = new Simulator(c);
  const z1 = find(c, 'ZamanRolesi', 'Z1');
  s.start();
  s.advance(50);
  press(s, find(c, 'StartButon'));
  assert.equal(s.snapshot().label2Text[z1], '3');
  s.advance(5000);
  const sn = s.snapshot();
  assert.equal(sn.error, null);
  assert.equal(sn.label2Text[z1], '0');
  assert.equal(sn.elementStates[find(c, 'Role', 'M1')], 2);
  assert.equal(sn.elementStates[find(c, 'BirFazMotor2')], 3);
});

test('kapi1: ILERI opens the door until its limit stops the motor', () => {
  const c = load('kapi1.esc');
  const s = new Simulator(c);
  const door = find(c, 'Kapi1');
  s.start();
  s.advance(50);
  press(s, find(c, 'StartStopButon', 'ILERI'));
  s.advance(500);
  const mid = s.snapshot().systems[door]!.position;
  assert.ok(mid > 20 && mid < 130, `door moving, at ${mid}`);
  s.advance(5000);
  const sn = s.snapshot();
  assert.equal(sn.error, null);
  assert.equal(sn.systems[door]!.position, 130);
  assert.equal(sn.systems[door]!.flags.p3, true);
  assert.equal(sn.elementStates[find(c, 'Role', 'I')], 1, 'limit drops the contactor');
});

test('asansor: driving the car into the bottom end burns the motor', () => {
  const c = load('asansor.esc');
  const s = new Simulator(c);
  s.start();
  s.advance(50);
  press(s, find(c, 'StartStopButon', 'GERI'));
  s.advance(1000);
  const sn = s.snapshot();
  assert.equal(sn.error?.key, 'alertMotor1');
  assert.deepEqual(sn.error?.elements, [find(c, 'Asansor')]);
  assert.equal(s.running, false);
});

test('asansor: ILERI moves the car up through the floors', () => {
  const c = load('asansor.esc');
  const s = new Simulator(c);
  const car = find(c, 'Asansor');
  s.start();
  s.advance(50);
  press(s, find(c, 'StartStopButon', 'ILERI'));
  s.advance(800);
  const sn = s.snapshot();
  assert.equal(sn.error, null);
  assert.equal(sn.systems[car]!.position, 165);
  assert.equal(sn.systems[car]!.flags.p5, true, 'floor contact at 165');
});

test('kapi mix: doors wired straight to the supply hit their end and burn', () => {
  const c = load('kapi mix.esc');
  const s = new Simulator(c);
  s.start();
  s.advance(10000);
  assert.equal(s.snapshot().error?.key, 'alertMotor1');
});
