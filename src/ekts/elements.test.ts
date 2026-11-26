import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseEscFile, ESC_ELEMENT_TYPES } from '../esc/escFile';
import { ELEMENT_DEFS, LIBRARY_GROUPS, pinPositions } from './elements';

const FIXTURES = path.join(import.meta.dirname, '../esc/fixtures');

test('every original element type is defined and in exactly one library group', () => {
  assert.deepEqual(Object.keys(ELEMENT_DEFS).sort(), [...ESC_ELEMENT_TYPES].sort());
  const grouped = LIBRARY_GROUPS.flatMap((g) => g.types);
  assert.deepEqual([...grouped].sort(), [...ESC_ELEMENT_TYPES].sort());
});

// The original stores where each wire ends. If our pin geometry and rotation
// match the original, every wire attached to an element ends exactly on the pin.
for (const file of fs.readdirSync(FIXTURES)) {
  test(`${file}: wires end exactly on the element pins`, () => {
    const c = parseEscFile(fs.readFileSync(path.join(FIXTURES, file)));
    const endOf = new Map<number, { x: number; y: number }>();
    c.lines.forEach((l) => {
      endOf.set(l.connectionPoints[0], l.from);
      endOf.set(l.connectionPoints[1], l.to);
    });
    c.dots.forEach((d) => d.connectionPoints.forEach((cp) => endOf.set(cp, d.location)));
    let checked = 0;
    for (const e of c.elements) {
      const pins = pinPositions(e.type, e.rotation, e.location);
      assert.equal(pins.length, e.connectionPoints.length, `${e.type} pin count`);
      e.connectionPoints.forEach((cp, i) => {
        const other = c.connectionPoints[cp].connectedTo;
        if (other === -1) return;
        const end = endOf.get(other);
        if (!end) return; // joined directly to another element's pin
        assert.deepEqual({ x: pins[i].x, y: pins[i].y }, end, `${e.type} "${e.label}" rot ${e.rotation} pin ${i}`);
        checked++;
      });
    }
    assert.ok(checked > 0);
  });
}
