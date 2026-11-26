import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseEscFile, EscFormatError } from './escFile';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');
const load = (name: string) => parseEscFile(fs.readFileSync(path.join(FIXTURES, name)));

// Counts read from the original example files shipped with EKTS 1.0.
const EXPECTED: Record<string, { elements: number; lines: number; dots: number; cps: number }> = {
  '3f.esc': { elements: 2, lines: 18, dots: 3, cps: 57 },
  'asansor.esc': { elements: 13, lines: 81, dots: 11, cps: 264 },
  'kapi mix.esc': { elements: 3, lines: 16, dots: 3, cps: 69 },
  'kapi1.esc': { elements: 13, lines: 86, dots: 11, cps: 262 },
  'kapi2.esc': { elements: 13, lines: 87, dots: 11, cps: 264 },
  'proble2.esc': { elements: 29, lines: 145, dots: 23, cps: 450 },
  'problem2.esc': { elements: 29, lines: 145, dots: 23, cps: 450 },
  'yildizucgen.esc': { elements: 19, lines: 73, dots: 14, cps: 251 },
};

for (const [name, exp] of Object.entries(EXPECTED)) {
  test(`${name}: parses with the expected structure`, () => {
    const c = load(name);
    assert.equal(c.elements.length, exp.elements);
    assert.equal(c.lines.length, exp.lines);
    assert.equal(c.dots.length, exp.dots);
    assert.equal(c.connectionPoints.length, exp.cps);
  });

  test(`${name}: references are in range and connections are mutual`, () => {
    const c = load(name);
    const n = c.connectionPoints.length;
    const owned = [
      ...c.elements.flatMap((e) => e.connectionPoints),
      ...c.lines.flatMap((l) => l.connectionPoints),
      ...c.dots.flatMap((d) => d.connectionPoints),
    ];
    // Every connection point belongs to exactly one element, line end or junction.
    assert.equal(owned.length, n);
    assert.equal(new Set(owned).size, n);
    c.connectionPoints.forEach((cp, i) => {
      if (cp.connectedTo === -1) return;
      assert.ok(cp.connectedTo >= 0 && cp.connectedTo < n, `cp ${i} out of range`);
      assert.equal(c.connectionPoints[cp.connectedTo].connectedTo, i, `cp ${i} not mutual`);
    });
    for (const e of c.elements) {
      for (const idx of e.linkedElements) assert.ok(idx >= 0 && idx < c.elements.length);
    }
  });
}

test('yildizucgen.esc: star-delta example has the relays, timer and motor', () => {
  const c = load('yildizucgen.esc');
  const relays = c.elements.filter((e) => e.type === 'Role').map((e) => e.label).sort();
  assert.deepEqual(relays, ['A', 'B', 'M']);
  const timer = c.elements.find((e) => e.type === 'ZamanRolesi');
  assert.equal(timer?.label, 'ZR');
  assert.equal(timer?.label2, '3');
  assert.equal(c.elements.filter((e) => e.type === 'UcFazliMotor2').length, 1);
  assert.equal(c.elements.filter((e) => e.type === 'UcFazGuc').length, 1);
  const stop = c.elements.find((e) => e.type === 'StopButon');
  assert.equal(stop?.label, 'STOP');
});

test('contacts are linked to the relay whose name they carry', () => {
  for (const name of Object.keys(EXPECTED)) {
    const c = load(name);
    for (const e of c.elements) {
      if (!['AcikKontak', 'KapaliKontak', 'UcAcikKontak', 'UcKapaliKontak'].includes(e.type)) continue;
      assert.equal(e.linkedElements.length, 1, `${name}: ${e.type} ${e.label}`);
      const relay = c.elements[e.linkedElements[0]];
      assert.equal(relay.label, e.label, `${name}: contact ${e.label} -> ${relay.label}`);
    }
  }
});

test('rejects files that are not EKTS circuits', () => {
  assert.throws(() => parseEscFile(new Uint8Array([1, 2, 3])), EscFormatError);
});
