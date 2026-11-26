import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEscFile } from './escFile';
import { writeEscFile, shiftIntoView } from './escWriter';

const FIXTURES = ['3f.esc', 'asansor.esc', 'kapi mix.esc', 'kapi1.esc', 'kapi2.esc', 'proble2.esc', 'problem2.esc', 'yildizucgen.esc'];

for (const f of FIXTURES) {
  test(`${f}: written file reads back identically`, () => {
    const buf = readFileSync(fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url)));
    const c = parseEscFile(buf);
    const again = parseEscFile(writeEscFile(c));
    assert.deepEqual(again.elements, c.elements);
    assert.deepEqual(again.lines, c.lines);
    assert.deepEqual(again.dots, c.dots);
    assert.deepEqual(again.connectionPoints, c.connectionPoints);
    assert.deepEqual(again.descriptionTexts, c.descriptionTexts);
  });
}

test('lamp colors are saved as the known colors the desktop program uses', () => {
  const c = parseEscFile(readFileSync(fileURLToPath(new URL('./fixtures/3f.esc', import.meta.url))));
  const lamp = { ...c.elements[0], type: 'Lamba' as const, color: 0xff0000ff | 0 };
  const back = parseEscFile(writeEscFile({ ...c, elements: [lamp, ...c.elements.slice(1)] }));
  assert.equal(back.elements[0].color, 0xff0000ff | 0);
});

test('a drawing that reaches into negative coordinates is shifted into view', () => {
  const c = parseEscFile(readFileSync(fileURLToPath(new URL('./fixtures/3f.esc', import.meta.url))));
  const moved = { ...c, elements: c.elements.map((e, i) => (i === 0 ? { ...e, location: { x: -40, y: e.location.y } } : e)) };
  const s = shiftIntoView(moved);
  assert.equal(Math.min(...s.elements.map((e) => e.location.x)), 5);
  assert.equal(s.lines[0].from.x, c.lines[0].from.x + 45);
});
