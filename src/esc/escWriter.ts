/**
 * Writer for .esc files in the layout the desktop EKTS saves (frmMain.
 * pnlMain_Save): two BinaryFormatter graphs, the signature string and an
 * ArrayList of [elements, lines, dots, connectionPoints, descriptionTexts,
 * summary]. Records are emitted the way .NET 1.x's BinaryFormatter emits
 * them (ArrayLists with power-of-two capacity, boxed structs and enums as
 * class records, objects in breadth-first order), so the desktop program can
 * open files saved on a phone.
 */
import { ESC_ELEMENT_TYPES, ESC_SIDES, ESC_SIGNATURE, type EscCircuit } from './escFile';

const EKTS_ASSEMBLY = 'EKTS, Version=1.0.3.0, Culture=neutral, PublicKeyToken=null';
const DRAWING_ASSEMBLY = 'System.Drawing, Version=1.0.3300.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a';

/** System.Drawing.KnownColor values of the lamp colors the original offers. */
export const KNOWN_COLORS: Record<number, number> = {
  [0xffff0000 | 0]: 141, // Red
  [0xff0000ff | 0]: 37, // Blue
  [0xff008000 | 0]: 79, // Green
  [0xffff00ff | 0]: 107, // Magenta
  [0xffffff00 | 0]: 166, // Yellow
};

type Val =
  | { k: 'list'; items: Val[] }
  | { k: 'array'; items: Val[]; capacity: number }
  | { k: 'enum'; cls: 'ElementType' | 'Sides'; v: number }
  | { k: 'point'; x: number; y: number }
  | { k: 'size'; w: number; h: number }
  | { k: 'color'; value: number; known: number; state: number }
  | { k: 'str'; s: string; shared?: boolean }
  | { k: 'int'; v: number }
  | { k: 'bool'; v: boolean };

const list = (items: Val[]): Val => ({ k: 'list', items });
const int = (v: number): Val => ({ k: 'int', v: v | 0 });
const pt = (p: { x: number; y: number }): Val => ({ k: 'point', x: p.x | 0, y: p.y | 0 });
const str = (s: string, shared = false): Val => ({ k: 'str', s, shared });

/** .NET 1.x ArrayList: 16 slots to start with, doubling when full. */
function capacity(n: number) {
  let c = 16;
  while (c < n) c *= 2;
  return c;
}

class Out {
  private buf = new Uint8Array(4096);
  len = 0;
  private ensure(n: number) {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const b = new Uint8Array(size);
    b.set(this.buf.subarray(0, this.len));
    this.buf = b;
  }
  u8(v: number) {
    this.ensure(1);
    this.buf[this.len++] = v & 0xff;
  }
  i16(v: number) {
    this.ensure(2);
    new DataView(this.buf.buffer).setInt16(this.len, v, true);
    this.len += 2;
  }
  i32(v: number) {
    this.ensure(4);
    new DataView(this.buf.buffer).setInt32(this.len, v, true);
    this.len += 4;
  }
  i64(v: number) {
    this.ensure(8);
    new DataView(this.buf.buffer).setBigInt64(this.len, BigInt(v), true);
    this.len += 8;
  }
  str(s: string) {
    const bytes = new TextEncoder().encode(s);
    let n = bytes.length;
    do {
      let b = n & 0x7f;
      n >>>= 7;
      if (n) b |= 0x80;
      this.u8(b);
    } while (n);
    this.ensure(bytes.length);
    this.buf.set(bytes, this.len);
    this.len += bytes.length;
  }
  bytes() {
    return this.buf.slice(0, this.len);
  }
}

class GraphWriter {
  private nextId = 1;
  private queue: [number, Val][] = [];
  private metas = new Map<string, number>();
  private libs = new Map<string, number>();
  private shared = new Map<string, number>();

  constructor(private out: Out) {}

  write(root: Val) {
    const o = this.out;
    o.u8(0); // SerializedStreamHeader
    o.i32(1);
    o.i32(-1);
    o.i32(1);
    o.i32(0);
    if (root.k === 'str') {
      o.u8(6);
      o.i32(this.nextId++);
      o.str(root.s);
    } else {
      this.queue.push([this.nextId++, root]);
      while (this.queue.length) {
        const [id, v] = this.queue.shift()!;
        this.object(id, v);
      }
    }
    o.u8(11); // MessageEnd
  }

  private ref(v: Val) {
    const id = this.nextId++;
    this.queue.push([id, v]);
    this.out.u8(9); // MemberReference
    this.out.i32(id);
  }

  /** An ArrayList slot or reference-typed member. */
  private member(v: Val) {
    const o = this.out;
    switch (v.k) {
      case 'int':
        o.u8(8); // MemberPrimitiveTyped
        o.u8(8); // Int32
        o.i32(v.v);
        return;
      case 'bool':
        o.u8(8);
        o.u8(1); // Boolean
        o.u8(v.v ? 1 : 0);
        return;
      case 'str': {
        if (v.shared && this.shared.has(v.s)) {
          o.u8(9);
          o.i32(this.shared.get(v.s)!);
          return;
        }
        const id = this.nextId++;
        if (v.shared) this.shared.set(v.s, id);
        o.u8(6); // BinaryObjectString
        o.i32(id);
        o.str(v.s);
        return;
      }
      default:
        this.ref(v);
    }
  }

  private library(name: string): number {
    let id = this.libs.get(name);
    if (id === undefined) {
      id = this.nextId++;
      this.libs.set(name, id);
      this.out.u8(12); // BinaryLibrary
      this.out.i32(id);
      this.out.str(name);
    }
    return id;
  }

  /**
   * ClassWithMembersAndTypes the first time a class is written, ClassWithId
   * after that. Returns false when the metadata was already known.
   */
  private classHeader(
    id: number,
    name: string,
    members: [string, number, number | null][],
    library: string | null,
  ) {
    const o = this.out;
    const meta = this.metas.get(name);
    if (meta !== undefined) {
      o.u8(1); // ClassWithId
      o.i32(id);
      o.i32(meta);
      return;
    }
    const libId = library ? this.library(library) : 0;
    this.metas.set(name, id);
    o.u8(library ? 5 : 4); // (System)ClassWithMembersAndTypes
    o.i32(id);
    o.str(name);
    o.i32(members.length);
    for (const [m] of members) o.str(m);
    for (const [, bt] of members) o.u8(bt);
    for (const [, bt, add] of members) if (bt === 0 || bt === 7) o.u8(add!);
    if (library) o.i32(libId);
  }

  private object(id: number, v: Val) {
    const o = this.out;
    switch (v.k) {
      case 'list': {
        this.classHeader(
          id,
          'System.Collections.ArrayList',
          [
            ['_items', 5, null],
            ['_size', 0, 8],
            ['_version', 0, 8],
          ],
          null,
        );
        this.ref({ k: 'array', items: v.items, capacity: capacity(v.items.length) });
        o.i32(v.items.length);
        o.i32(v.items.length);
        return;
      }
      case 'array': {
        o.u8(16); // ArraySingleObject
        o.i32(id);
        o.i32(v.capacity);
        for (const it of v.items) this.member(it);
        let nulls = v.capacity - v.items.length;
        if (nulls === 1) o.u8(10);
        else if (nulls > 1 && nulls < 256) {
          o.u8(13);
          o.u8(nulls);
        } else if (nulls >= 256) {
          o.u8(14);
          o.i32(nulls);
        }
        nulls = 0;
        return;
      }
      case 'enum':
        this.classHeader(id, v.cls === 'ElementType' ? 'ESCS.Elements+ElementType' : 'ESCS.CPoint+Sides', [['value__', 0, 8]], EKTS_ASSEMBLY);
        o.i32(v.v);
        return;
      case 'point':
        this.classHeader(id, 'System.Drawing.Point', [['x', 0, 8], ['y', 0, 8]], DRAWING_ASSEMBLY);
        o.i32(v.x);
        o.i32(v.y);
        return;
      case 'size':
        this.classHeader(id, 'System.Drawing.Size', [['width', 0, 8], ['height', 0, 8]], DRAWING_ASSEMBLY);
        o.i32(v.w);
        o.i32(v.h);
        return;
      case 'color':
        this.classHeader(
          id,
          'System.Drawing.Color',
          [
            ['value', 0, 9],
            ['knownColor', 0, 7],
            ['state', 0, 7],
            ['name', 1, null],
          ],
          DRAWING_ASSEMBLY,
        );
        o.i64(v.value);
        o.i16(v.known);
        o.i16(v.state);
        o.u8(10); // name = null
        return;
      default:
        throw new Error(`unexpected ${v.k} as an object`);
    }
  }
}

function color(type: string, argb: number): Val {
  if (type !== 'Lamba') return { k: 'color', value: 0, known: 0, state: 0 };
  const c = argb === 0 ? 0xffff00ff | 0 : argb | 0;
  const known = KNOWN_COLORS[c];
  if (known) return { k: 'color', value: 0, known, state: 1 };
  return { k: 'color', value: c >>> 0, known: 0, state: 2 };
}

/**
 * The desktop panel starts at (0, 0); if anything was drawn left of or above
 * that on the phone, shift the whole drawing so it is all visible there.
 */
export function shiftIntoView(c: EscCircuit, margin = 5): EscCircuit {
  let minX = Infinity;
  let minY = Infinity;
  const see = (p: { x: number; y: number }) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  };
  for (const e of c.elements) {
    see(e.location);
    see(e.labelLocation);
    if (e.label2Visible) see(e.label2Location);
  }
  for (const l of c.lines) {
    see(l.from);
    see(l.to);
  }
  for (const d of c.dots) see(d.location);
  for (const t of c.descriptionTexts) see(t.location);
  const dx = minX < 0 ? margin - minX : 0;
  const dy = minY < 0 ? margin - minY : 0;
  if (!dx && !dy) return c;
  const mv = (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y + dy });
  return {
    ...c,
    elements: c.elements.map((e) => ({
      ...e,
      location: mv(e.location),
      labelLocation: mv(e.labelLocation),
      label2Location: mv(e.label2Location),
    })),
    lines: c.lines.map((l) => ({ ...l, from: mv(l.from), to: mv(l.to) })),
    dots: c.dots.map((d) => ({ ...d, location: mv(d.location) })),
    descriptionTexts: c.descriptionTexts.map((t) => ({ ...t, location: mv(t.location) })),
  };
}

export function writeEscFile(circuit: EscCircuit): Uint8Array {
  const c = shiftIntoView(circuit);
  const elements = list(
    c.elements.map((e) =>
      list([
        { k: 'enum', cls: 'ElementType', v: ESC_ELEMENT_TYPES.indexOf(e.type) },
        pt(e.location),
        pt(e.labelLocation),
        pt(e.label2Location),
        str(e.label),
        str(e.label2),
        list(e.linkedElements.map(int)),
        list(e.connectionPoints.map(int)),
        { k: 'bool', v: e.label2Visible },
        int(e.rotation),
        color(e.type, e.color),
      ]),
    ),
  );
  const lines = list(
    c.lines.map((l) => list([str(l.orientation, true), pt(l.from), pt(l.to), int(l.connectionPoints[0]), int(l.connectionPoints[1])])),
  );
  const dots = list(c.dots.map((d) => list([pt(d.location), list(d.connectionPoints.map(int))])));
  const cps = list(
    c.connectionPoints.map((p) => list([{ k: 'enum', cls: 'Sides', v: Math.max(0, ESC_SIDES.indexOf(p.side)) }, int(p.connectedTo)])),
  );
  const texts = list(c.descriptionTexts.map((t) => list([pt(t.location), { k: 'size', w: t.size.width, h: t.size.height }, str(t.text)])));
  const summary = list([{ k: 'bool', v: c.summary?.visible ?? false }, pt(c.summary?.location ?? { x: 0, y: 0 })]);

  const out = new Out();
  new GraphWriter(out).write(str(ESC_SIGNATURE));
  new GraphWriter(out).write(list([elements, lines, dots, cps, texts, summary]));
  return out.bytes();
}
