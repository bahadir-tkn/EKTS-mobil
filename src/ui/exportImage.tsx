/**
 * "Farklı Kaydet" as a picture (frmMain.pnlMain_SaveImage): the circuit
 * painted the way paintCircuit paints it — white background, black wires,
 * no selection — from the drawing's origin to its far corner, one drawing
 * unit per pixel, in the original's four formats (BMP, GIF, JPEG, PNG).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { CircuitDocument } from '../ekts/document';
import { ELEMENT_FONT_SIZE, FONT_FAMILY } from '../ekts/Symbol';
import { Drawing, labelBox } from './Drawing';
import { summaryLayout, type SummaryLayout } from './Summary';
import type { Lang } from './strings';

export type ImageFormat = 'bmp' | 'gif' | 'jpg' | 'png';

export const IMAGE_FORMATS: { format: ImageFormat; label: string; mime: string }[] = [
  { format: 'bmp', label: 'Bitmap image (*.bmp)', mime: 'image/bmp' },
  { format: 'gif', label: 'Gif image (*.gif)', mime: 'image/gif' },
  { format: 'jpg', label: 'JPEG Image (*.jpg)', mime: 'image/jpeg' },
  { format: 'png', label: 'Png Image (*.png)', mime: 'image/png' },
];

const MARGIN = 10;

/** The far corner of everything drawn, plus a small margin. */
export function drawingExtent(doc: CircuitDocument, summary: SummaryLayout | null) {
  let w = 0;
  let h = 0;
  // Nothing in the original lies left of or above the panel's origin; here a
  // finger can drag things there, so the picture grows to keep them.
  let x0 = 0;
  let y0 = 0;
  const add = (x: number, y: number, minX = x, minY = y) => {
    w = Math.max(w, x);
    h = Math.max(h, y);
    x0 = Math.min(x0, minX);
    y0 = Math.min(y0, minY);
  };
  for (const e of doc.elements) {
    add(e.location.x + e.size.width, e.location.y + e.size.height, e.location.x, e.location.y);
    const b = labelBox(e.label, e.labelLocation);
    add(b.x + b.width, b.y + b.height, b.x, b.y);
    if (e.label2Enabled) {
      const b2 = labelBox(e.label2, e.label2Location);
      add(b2.x + b2.width, b2.y + b2.height, b2.x, b2.y);
    }
  }
  for (const l of doc.lines) {
    add(l.cp1.p.x + 1, l.cp1.p.y + 1, l.cp1.p.x, l.cp1.p.y);
    add(l.cp2.p.x + 1, l.cp2.p.y + 1, l.cp2.p.x, l.cp2.p.y);
  }
  for (const d of doc.dots) add(d.origin.x + 3, d.origin.y + 3, d.origin.x - 3, d.origin.y - 3);
  for (const t of doc.texts) add(t.location.x + (t.size.width || 100), t.location.y + (t.size.height || 23), t.location.x, t.location.y);
  if (summary && doc.summary) add(doc.summary.location.x + summary.width, doc.summary.location.y + summary.height, doc.summary.location.x, doc.summary.location.y);
  const left = x0 < 0 ? Math.floor(x0) - MARGIN : 0;
  const top = y0 < 0 ? Math.floor(y0) - MARGIN : 0;
  return { left, top, width: Math.max(1, Math.ceil(w) + MARGIN - left), height: Math.max(1, Math.ceil(h) + MARGIN - top) };
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** DrawString's word wrapping inside the text box. */
function wrapText(text: string, width: number): string[] {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  const ctx = measureCtx!;
  ctx.font = `${ELEMENT_FONT_SIZE}px ${FONT_FAMILY}`;
  const max = width - 4;
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      const next = line + word;
      if (line.trim() && ctx.measureText(next).width > max) {
        out.push(line.trimEnd());
        line = word.trimStart();
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** The circuit as a standalone SVG document. */
export function circuitSvg(doc: CircuitDocument, lang: Lang) {
  const summary = doc.summary?.visible ? summaryLayout(doc, lang) : null;
  const { left, top, width, height } = drawingExtent(doc, summary);
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`${left} ${top} ${width} ${height}`}>
        <rect x={left} y={top} width={width} height={height} fill="#fff" />
        <Drawing doc={doc} version={doc.version} snapshot={null} alert={null} wire={null} hoverPin={null} summary={summary} plain wrapText={wrapText} />
      </svg>,
    ),
  );
  const markup = host.innerHTML;
  root.unmount();
  return { markup, width, height };
}

async function rasterize(doc: CircuitDocument, lang: Lang) {
  const { markup, width, height } = circuitSvg(doc, lang);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error('image'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportImage(doc: CircuitDocument, lang: Lang, format: ImageFormat): Promise<Blob> {
  const canvas = await rasterize(doc, lang);
  if (format === 'png' || format === 'jpg') {
    return new Promise((ok, fail) =>
      canvas.toBlob((b) => (b ? ok(b) : fail(new Error('encode'))), format === 'png' ? 'image/png' : 'image/jpeg', 0.92),
    );
  }
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  const bytes = format === 'bmp' ? encodeBmp(data) : encodeGif(data);
  return new Blob([bytes.buffer as ArrayBuffer], { type: format === 'bmp' ? 'image/bmp' : 'image/gif' });
}

// ---- encoders ---------------------------------------------------------------------

/** 24-bit bottom-up BMP, as GDI+ writes it. */
export function encodeBmp({ width, height, data }: { width: number; height: number; data: Uint8ClampedArray }) {
  const row = (width * 3 + 3) & ~3;
  const size = 54 + row * height;
  const out = new Uint8Array(size);
  const v = new DataView(out.buffer);
  out[0] = 0x42;
  out[1] = 0x4d;
  v.setUint32(2, size, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, row * height, true);
  v.setInt32(38, 3780, true);
  v.setInt32(42, 3780, true);
  for (let y = 0; y < height; y++) {
    let o = 54 + (height - 1 - y) * row;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      out[o++] = data[i + 2];
      out[o++] = data[i + 1];
      out[o++] = data[i];
    }
  }
  return out;
}

/** GIF89a with an exact palette when the picture has ≤256 colors, else a 6·7·6 color cube. */
export function encodeGif({ width, height, data }: { width: number; height: number; data: Uint8ClampedArray }) {
  const n = width * height;
  const index = new Uint8Array(n);
  const map = new Map<number, number>();
  let palette: number[] = [];
  let exact = true;
  for (let i = 0; i < n; i++) {
    const c = (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
    let k = map.get(c);
    if (k === undefined) {
      if (map.size === 256) {
        exact = false;
        break;
      }
      k = map.size;
      map.set(c, k);
      palette.push(c);
    }
    index[i] = k;
  }
  if (!exact) {
    palette = [];
    for (let r = 0; r < 6; r++) for (let g = 0; g < 7; g++) for (let b = 0; b < 6; b++) palette.push((Math.round((r * 255) / 5) << 16) | (Math.round((g * 255) / 6) << 8) | Math.round((b * 255) / 5));
    for (let i = 0; i < n; i++) {
      const r = Math.round((data[i * 4] * 5) / 255);
      const g = Math.round((data[i * 4 + 1] * 6) / 255);
      const b = Math.round((data[i * 4 + 2] * 5) / 255);
      index[i] = r * 42 + g * 6 + b;
    }
  }
  let bits = 1;
  while (1 << bits < palette.length) bits++;
  const tableSize = 1 << bits;

  const out: number[] = [];
  const u16 = (x: number) => out.push(x & 0xff, (x >> 8) & 0xff);
  for (const ch of 'GIF89a') out.push(ch.charCodeAt(0));
  u16(width);
  u16(height);
  out.push(0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0);
  for (let i = 0; i < tableSize; i++) {
    const c = palette[i] ?? 0;
    out.push((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff);
  }
  out.push(0x2c);
  u16(0);
  u16(0);
  u16(width);
  u16(height);
  out.push(0);
  const minCode = Math.max(2, bits);
  out.push(minCode);
  const lzw = lzwEncode(index, minCode);
  for (let i = 0; i < lzw.length; i += 255) {
    const chunk = lzw.subarray(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0, 0x3b);
  return new Uint8Array(out);
}

function lzwEncode(pixels: Uint8Array, minCode: number): Uint8Array {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  const bytes: number[] = [];
  let cur = 0;
  let curBits = 0;
  let size = minCode + 1;
  const emit = (code: number) => {
    cur |= code << curBits;
    curBits += size;
    while (curBits >= 8) {
      bytes.push(cur & 0xff);
      cur >>>= 8;
      curBits -= 8;
    }
  };
  let dict = new Map<number, number>();
  let next = eoi + 1;
  emit(clear);
  if (pixels.length === 0) {
    emit(eoi);
    if (curBits > 0) bytes.push(cur & 0xff);
    return new Uint8Array(bytes);
  }
  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i];
    const key = (prefix << 8) | k;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else {
      emit(clear);
      dict = new Map();
      next = eoi + 1;
      size = minCode + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (curBits > 0) bytes.push(cur & 0xff);
  return new Uint8Array(bytes);
}
