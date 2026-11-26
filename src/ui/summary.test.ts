import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEscFile } from '../esc/escFile';
import { CircuitDocument } from '../ekts/document';
import { summaryLayout } from './Summary';

const load = (name: string) =>
  CircuitDocument.fromCircuit(parseEscFile(new Uint8Array(readFileSync(fileURLToPath(new URL(`../esc/fixtures/${name}`, import.meta.url))))));

test('used-elements list counts elements and relay contacts', () => {
  const doc = load('yildizucgen.esc');
  const s = summaryLayout(doc, 'tr');
  assert.equal(s.empty, null);
  const types = new Set(s.rows.map((r) => r.type));
  assert.ok(!types.has('AcikKontak') && !types.has('KapaliKontak'), 'contacts are not listed as rows');
  const total = s.rows.reduce((n, r) => n + r.count, 0);
  const nonContacts = doc.elements.filter((e) => !/Kontak$/.test(e.type)).length;
  assert.equal(total, nonContacts);
  for (const r of s.rows) for (const rl of r.relays) assert.ok(rl.no + rl.nc >= 0 && rl.label.length > 0);
  console.log(JSON.stringify(s.rows.map((r) => [r.name, r.count, r.relays])));
});

test('empty drawing shows the no-elements message', () => {
  const s = summaryLayout(new CircuitDocument(), 'tr');
  assert.equal(s.empty, 'Devre Eleman Kullanılmadı');
  assert.deepEqual([s.width, s.height], [200, 50]);
});

test('showSummary places the list and round-trips through the circuit', () => {
  const doc = new CircuitDocument();
  doc.showSummary(true, { x: 10, y: 20 });
  assert.deepEqual(doc.summary, { visible: true, location: { x: 50, y: 188 } });
  doc.moveSummary({ x: 70.4, y: 90.6 });
  const back = CircuitDocument.fromCircuit(doc.toCircuit());
  assert.deepEqual(back.summary, { visible: true, location: { x: 70, y: 91 } });
});
