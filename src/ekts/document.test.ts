import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEscFile, type EscCircuit } from '../esc/escFile';
import { CircuitDocument, DLine, CP } from './document';
import { Simulator } from './simulator';
import { pinPositions } from './elements';

const FIXTURES = ['3f.esc', 'asansor.esc', 'kapi mix.esc', 'kapi1.esc', 'kapi2.esc', 'proble2.esc', 'problem2.esc', 'yildizucgen.esc'];

function load(name: string): EscCircuit {
  const buf = readFileSync(fileURLToPath(new URL(`../esc/fixtures/${name}`, import.meta.url)));
  return parseEscFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/** Every wire is straight, every joint is mutual and lands on the same spot. */
function assertConsistent(doc: CircuitDocument) {
  const all: CP[] = [
    ...doc.elements.flatMap((e) => e.cps),
    ...doc.lines.flatMap((l) => [l.cp1, l.cp2]),
    ...doc.dots.flatMap((d) => d.cps),
  ];
  const owned = new Set(all);
  for (const c of all) {
    if (!c.con) continue;
    assert.ok(owned.has(c.con), 'joined to a point that is still in the document');
    assert.equal(c.con.con, c, 'joints are mutual');
    assert.deepEqual(c.pos, c.con.pos, 'joined points coincide');
  }
  for (const l of doc.lines) {
    assert.ok(l.cp1.p.x === l.cp2.p.x || l.cp1.p.y === l.cp2.p.y, `wire is straight: ${JSON.stringify([l.cp1.p, l.cp2.p])}`);
    assert.ok(l.cp1.con && l.cp2.con, 'no loose wire ends');
  }
}

for (const f of FIXTURES) {
  test(`${f}: document round-trips to the same circuit`, () => {
    const c = load(f);
    const doc = CircuitDocument.fromCircuit(c);
    assertConsistent(doc);
    const back = doc.toCircuit();
    assert.equal(back.elements.length, c.elements.length);
    assert.equal(back.lines.length, c.lines.length);
    assert.equal(back.dots.length, c.dots.length);
    assert.deepEqual(
      back.elements.map((e) => [e.type, e.label, e.label2, e.rotation, e.linkedElements]),
      c.elements.map((e) => [e.type, e.label, e.label2, e.rotation, e.linkedElements]),
    );
  });
}

test('yildizucgen: the round-tripped circuit still simulates star-delta', () => {
  const c = CircuitDocument.fromCircuit(load('yildizucgen.esc')).toCircuit();
  const s = new Simulator(c);
  s.start();
  s.advance(50);
  const start = c.elements.findIndex((e) => e.type === 'StartButon');
  s.pointerDown(start);
  s.advance(50);
  s.pointerUp(start);
  s.advance(5000);
  const sn = s.snapshot();
  assert.equal(sn.error, null);
  assert.equal(sn.elementStates[c.elements.findIndex((e) => e.type === 'Role' && e.label === 'B')], 2);
});

test('connect: a straight wire between facing pins', () => {
  const doc = new CircuitDocument();
  const a = doc.addElement('AcikKontak', { x: 0, y: 0 });
  const b = doc.addElement('Lamba', { x: 100, y: 0 });
  doc.connect(a.cps[1], b.cps[0]);
  assertConsistent(doc);
  assert.equal(doc.lines.length, 1);
  assert.equal(doc.lines[0].type, 'h');
  assert.deepEqual(doc.lines[0].cp1.p, a.cps[1].pos);
  assert.deepEqual(doc.lines[0].cp2.p, b.cps[0].pos);
});

test('connect: routes around with right angles and stays wired through moves', () => {
  const doc = new CircuitDocument();
  const a = doc.addElement('AcikKontak', { x: 0, y: 0 });
  const b = doc.addElement('Lamba', { x: 100, y: 60 });
  doc.connect(a.cps[0], b.cps[1]);
  assertConsistent(doc);
  assert.ok(doc.lines.length >= 3);
  doc.moveElement(b, 13, -7);
  assertConsistent(doc);
  doc.endMoveElement(b);
  assertConsistent(doc);
  doc.moveElement(a, -20, 40);
  doc.endMoveElement(a);
  assertConsistent(doc);
});

test('connect to a wire makes a junction dot; deleting the branch dissolves it', () => {
  const doc = new CircuitDocument();
  const a = doc.addElement('AcikKontak', { x: 0, y: 0 });
  const b = doc.addElement('Lamba', { x: 200, y: 0 });
  const c = doc.addElement('Lamba', { x: 100, y: 80 });
  doc.connect(a.cps[1], b.cps[0]);
  const wire = doc.lines[0];
  const p = CircuitDocument.projectOnLine(wire, { x: 110, y: 12 })!;
  doc.connectToLine(wire, p, c.cps[0]);
  assertConsistent(doc);
  assert.equal(doc.dots.length, 1);
  const sim = doc.toCircuit();
  assert.equal(sim.dots[0].connectionPoints.filter((i) => sim.connectionPoints[i].connectedTo >= 0).length, 3);

  // Select the branch to the lamp below and delete it.
  const branch = c.cps[0].conOwner as DLine;
  doc.deselect(branch);
  doc.deleteSelected();
  assertConsistent(doc);
  assert.equal(doc.dots.length, 0, 'a dot with two wires left is dissolved');
  assert.equal(doc.lines.length, 1, 'the two halves merge back into one wire');
});

test('dragging a wire sideways keeps it joined', () => {
  const doc = new CircuitDocument();
  const a = doc.addElement('AcikKontak', { x: 0, y: 0 });
  const b = doc.addElement('Lamba', { x: 100, y: 60 });
  doc.connect(a.cps[1], b.cps[0]);
  const v = doc.lines.find((l) => l.type === 'v')!;
  doc.moveLine(v, { x: v.cp1.p.x + 17, y: 0 });
  assertConsistent(doc);
  doc.endMoveLine(v);
  assertConsistent(doc);
});

test('rotating an element re-routes its wires to the new pin positions', () => {
  const doc = new CircuitDocument();
  const a = doc.addElement('AcikKontak', { x: 0, y: 0 });
  const b = doc.addElement('Lamba', { x: 100, y: 60 });
  doc.connect(a.cps[1], b.cps[0]);
  doc.rotate(b, 1);
  assertConsistent(doc);
  const pins = pinPositions('Lamba', 1, b.location);
  assert.deepEqual(b.cps[0].pos, { x: pins[0].x, y: pins[0].y });
  assert.ok(b.cps[0].con, 'pin is still wired');
});

test('deleting an element frees its wires and contacts lose the relay name', () => {
  const doc = new CircuitDocument();
  const k = doc.addElement('Role', { x: 0, y: 0 });
  doc.setLabel(k, 'k1');
  assert.equal(k.label, 'K1');
  const c = doc.addElement('AcikKontak', { x: 60, y: 0 });
  doc.setContactRelay(c, 'K1');
  assert.deepEqual(c.linked, [k]);
  doc.connect(k.cps[1], c.cps[0]);
  doc.deselect(k);
  doc.deleteSelected();
  assert.equal(c.label, '...');
  assert.equal(c.linked.length, 0);
  assert.equal(doc.lines.length, 0, 'the wire goes with the element');
});

test('contact on a time relay shows the delay; changing it updates the contact', () => {
  const doc = new CircuitDocument();
  const z = doc.addElement('ZamanRolesi', { x: 0, y: 0 });
  doc.setLabel(z, 'Z1');
  doc.setDelay(z, '5');
  const c = doc.addElement('KapaliKontak', { x: 60, y: 0 });
  doc.setContactRelay(c, 'Z1');
  assert.equal(c.label2Enabled, true);
  assert.equal(c.label2, '5');
  doc.setDelay(z, '07');
  assert.equal(c.label2, '7');
});

test('connect2 keeps the original routing choices', () => {
  // Facing pins on one row: straight.
  assert.deepEqual(CircuitDocument.connect2(5, 10, 'x1b', 95, 10, 'x2s'), [{ x: 5, y: 10 }, { x: 95, y: 10 }]);
  // Right pin to a lower left pin: across, then down (one bend).
  assert.deepEqual(CircuitDocument.connect2(25, 10, 'x1b', 95, 70, 'x2s'), [{ x: 25, y: 10 }, { x: 95, y: 10 }, { x: 95, y: 70 }]);
});
