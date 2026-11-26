import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitDocument } from '../ekts/document';
import { History } from './history';

test('undo brings back a deleted wire, redo removes it again', () => {
  const doc = new CircuitDocument();
  const a = doc.addElement('AcikKontak', { x: 0, y: 0 });
  const b = doc.addElement('Lamba', { x: 100, y: 60 });
  doc.connect(a.cps[1], b.cps[0]);
  const h = new History();
  h.reset(doc);
  const wires = doc.lines.length;
  doc.deselect(doc.lines[0]);
  doc.deleteSelected();
  assert.ok(h.commit(doc));
  assert.equal(doc.lines.length, 0);
  h.undo(doc);
  assert.equal(doc.lines.length, wires);
  assert.ok(doc.elements[0].cps[1].con, 'pin is wired again');
  h.redo(doc);
  assert.equal(doc.lines.length, 0);
  assert.equal(h.canRedo, false);
});

test('selection alone is not an undo step', () => {
  const doc = new CircuitDocument();
  const a = doc.addElement('Role', { x: 0, y: 0 });
  const h = new History();
  h.reset(doc);
  doc.deselect(a);
  assert.equal(h.commit(doc), false);
  assert.equal(h.canUndo, false);
});
