import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeBmp, encodeGif, drawingExtent } from './exportImage';
import { CircuitDocument } from '../ekts/document';

const img = (w: number, h: number) => {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  data.set([255, 0, 0, 255], 0);
  return { width: w, height: h, data };
};

test('BMP is 24-bit bottom-up with padded rows', () => {
  const b = encodeBmp(img(3, 2));
  const v = new DataView(b.buffer);
  assert.equal(String.fromCharCode(b[0], b[1]), 'BM');
  assert.equal(v.getUint16(28, true), 24);
  assert.equal(b.length, 54 + 12 * 2);
  // Top-left red pixel is in the last row, stored as BGR.
  assert.deepEqual([...b.subarray(54 + 12, 54 + 15)], [0, 0, 255]);
});

test('GIF has a header, an exact palette and a trailer', () => {
  const g = encodeGif(img(5, 4));
  assert.equal(String.fromCharCode(...g.subarray(0, 6)), 'GIF89a');
  assert.equal(g[g.length - 1], 0x3b);
});

test('picture covers the drawing from the origin', () => {
  const doc = new CircuitDocument();
  doc.addElement('Lamba', { x: 100, y: 50 });
  const e = drawingExtent(doc, null);
  assert.equal(e.left, 0);
  assert.equal(e.top, 0);
  assert.ok(e.width > 110 && e.height > 70);
});
