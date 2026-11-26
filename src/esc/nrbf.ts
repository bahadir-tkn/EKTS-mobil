/**
 * Minimal reader for the .NET Remoting Binary Format (MS-NRBF), the format
 * produced by .NET's BinaryFormatter. The desktop EKTS program saves its .esc
 * circuit files with BinaryFormatter, so this is what lets us open them.
 *
 * Only reading is supported. Objects come back as plain JS values:
 *  - strings / numbers / booleans for primitives,
 *  - arrays for System.Collections.ArrayList and single-dimension arrays,
 *  - { $type, ...fields } objects for other classes and structs,
 *  - null for null references.
 */

export interface NrbfObject {
  $type: string;
  [field: string]: unknown;
}

const enum RecordType {
  SerializedStreamHeader = 0,
  ClassWithId = 1,
  SystemClassWithMembers = 2,
  ClassWithMembers = 3,
  SystemClassWithMembersAndTypes = 4,
  ClassWithMembersAndTypes = 5,
  BinaryObjectString = 6,
  BinaryArray = 7,
  MemberPrimitiveTyped = 8,
  MemberReference = 9,
  ObjectNull = 10,
  MessageEnd = 11,
  BinaryLibrary = 12,
  ObjectNullMultiple256 = 13,
  ObjectNullMultiple = 14,
  ArraySinglePrimitive = 15,
  ArraySingleObject = 16,
  ArraySingleString = 17,
}

const enum BinaryType {
  Primitive = 0,
  String = 1,
  Object = 2,
  SystemClass = 3,
  Class = 4,
  ObjectArray = 5,
  StringArray = 6,
  PrimitiveArray = 7,
}

interface ClassMeta {
  name: string;
  memberNames: string[];
  /** Absent when the record carried no type info (members are then records). */
  binaryTypes?: BinaryType[];
  additional?: unknown[];
}

/** Placeholder for a reference that is resolved once the whole stream is read. */
class Ref {
  constructor(public id: number) {}
}

/** Marker for a run of nulls inside an array. */
class NullRun {
  constructor(public count: number) {}
}

export class NrbfError extends Error {}

export class NrbfReader {
  private view: DataView;
  private pos = 0;
  private objects = new Map<number, unknown>();
  private metas = new Map<number, ClassMeta>();
  private decoder = new TextDecoder('utf-8');

  constructor(buffer: ArrayBuffer | Uint8Array) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get done(): boolean {
    return this.pos >= this.view.byteLength;
  }

  /**
   * Reads one complete serialized graph (header … MessageEnd) and returns its
   * root object. BinaryFormatter.Serialize called several times on the same
   * stream writes several graphs back to back; call this once per graph.
   */
  readGraph(): unknown {
    this.objects = new Map();
    this.metas = new Map();
    const type = this.u8();
    if (type !== RecordType.SerializedStreamHeader) {
      throw new NrbfError(`Expected stream header, got record ${type} at ${this.pos - 1}`);
    }
    const rootId = this.i32();
    this.i32(); // headerId
    this.i32(); // major version
    this.i32(); // minor version

    for (;;) {
      const rec = this.readRecord();
      if (rec === END) break;
    }
    const seen = new Set<unknown>();
    const resolve = (v: unknown): unknown => {
      if (v instanceof Ref) return resolve(this.objects.get(v.id) ?? null);
      if (v && typeof v === 'object' && !seen.has(v)) {
        seen.add(v);
        if (Array.isArray(v)) {
          for (let i = 0; i < v.length; i++) v[i] = resolve(v[i]);
        } else {
          for (const k of Object.keys(v)) (v as Record<string, unknown>)[k] = resolve((v as Record<string, unknown>)[k]);
        }
      }
      return v;
    };
    for (const [id, obj] of this.objects) this.objects.set(id, resolve(obj));
    return unwrap(this.objects.get(rootId) ?? null);
  }

  // ---- records -----------------------------------------------------------

  private readRecord(): unknown {
    const type = this.u8() as RecordType;
    switch (type) {
      case RecordType.MessageEnd:
        return END;
      case RecordType.BinaryLibrary:
        this.i32();
        this.str();
        return SKIP;
      case RecordType.ClassWithId: {
        const id = this.i32();
        const metaId = this.i32();
        const meta = this.metas.get(metaId);
        if (!meta) throw new NrbfError(`Unknown metadata id ${metaId}`);
        return this.readClassValues(id, meta);
      }
      case RecordType.SystemClassWithMembers:
      case RecordType.ClassWithMembers: {
        const { id, meta } = this.readClassInfo();
        if (type === RecordType.ClassWithMembers) this.i32(); // libraryId
        this.metas.set(id, meta);
        return this.readClassValues(id, meta);
      }
      case RecordType.SystemClassWithMembersAndTypes:
      case RecordType.ClassWithMembersAndTypes: {
        const { id, meta } = this.readClassInfo();
        const n = meta.memberNames.length;
        meta.binaryTypes = [];
        meta.additional = [];
        for (let i = 0; i < n; i++) meta.binaryTypes.push(this.u8() as BinaryType);
        for (let i = 0; i < n; i++) meta.additional.push(this.readAdditional(meta.binaryTypes[i]));
        if (type === RecordType.ClassWithMembersAndTypes) this.i32(); // libraryId
        this.metas.set(id, meta);
        return this.readClassValues(id, meta);
      }
      case RecordType.BinaryObjectString: {
        const id = this.i32();
        const s = this.str();
        this.objects.set(id, s);
        return s;
      }
      case RecordType.MemberPrimitiveTyped:
        return this.primitive(this.u8());
      case RecordType.MemberReference:
        return new Ref(this.i32());
      case RecordType.ObjectNull:
        return null;
      case RecordType.ObjectNullMultiple256:
        return new NullRun(this.u8());
      case RecordType.ObjectNullMultiple:
        return new NullRun(this.i32());
      case RecordType.ArraySinglePrimitive: {
        const id = this.i32();
        const len = this.i32();
        const pt = this.u8();
        const arr: unknown[] = [];
        for (let i = 0; i < len; i++) arr.push(this.primitive(pt));
        this.objects.set(id, arr);
        return arr;
      }
      case RecordType.ArraySingleObject:
      case RecordType.ArraySingleString: {
        const id = this.i32();
        const len = this.i32();
        const arr: unknown[] = [];
        this.objects.set(id, arr);
        this.readRecordItems(arr, len);
        return arr;
      }
      case RecordType.BinaryArray: {
        const id = this.i32();
        const arrayType = this.u8();
        const rank = this.i32();
        const lengths: number[] = [];
        for (let i = 0; i < rank; i++) lengths.push(this.i32());
        if (arrayType >= 3) for (let i = 0; i < rank; i++) this.i32(); // lower bounds
        const bt = this.u8() as BinaryType;
        const add = this.readAdditional(bt);
        const total = lengths.reduce((a, b) => a * b, 1);
        const arr: unknown[] = [];
        this.objects.set(id, arr);
        if (bt === BinaryType.Primitive) {
          for (let i = 0; i < total; i++) arr.push(this.primitive(add as number));
        } else {
          this.readRecordItems(arr, total);
        }
        return arr;
      }
      default:
        throw new NrbfError(`Unsupported record type ${type} at ${this.pos - 1}`);
    }
  }

  private readRecordItems(arr: unknown[], len: number) {
    while (arr.length < len) {
      const v = this.readRecord();
      if (v instanceof NullRun) {
        for (let i = 0; i < v.count; i++) arr.push(null);
      } else if (v !== SKIP) {
        arr.push(v);
      }
    }
  }

  private readClassInfo(): { id: number; meta: ClassMeta } {
    const id = this.i32();
    const name = this.str();
    const count = this.i32();
    const memberNames: string[] = [];
    for (let i = 0; i < count; i++) memberNames.push(this.str());
    return { id, meta: { name, memberNames } };
  }

  private readAdditional(bt: BinaryType): unknown {
    switch (bt) {
      case BinaryType.Primitive:
      case BinaryType.PrimitiveArray:
        return this.u8();
      case BinaryType.SystemClass:
        return this.str();
      case BinaryType.Class: {
        const name = this.str();
        this.i32(); // libraryId
        return name;
      }
      default:
        return null;
    }
  }

  private readClassValues(id: number, meta: ClassMeta): NrbfObject {
    const obj: NrbfObject = { $type: meta.name };
    this.objects.set(id, obj);
    meta.memberNames.forEach((name, i) => {
      const bt = meta.binaryTypes?.[i];
      let v: unknown;
      if (bt === BinaryType.Primitive) {
        v = this.primitive(meta.additional![i] as number);
      } else {
        do {
          v = this.readRecord();
        } while (v === SKIP);
        if (v instanceof NullRun) v = null;
      }
      obj[name] = v;
    });
    return obj;
  }

  // ---- primitives --------------------------------------------------------

  private primitive(t: number): unknown {
    switch (t) {
      case 1:
        return this.u8() !== 0;
      case 2:
        return this.u8();
      case 3:
        return this.char();
      case 5:
        return Number(this.str());
      case 6: {
        const v = this.view.getFloat64(this.pos, true);
        this.pos += 8;
        return v;
      }
      case 7: {
        const v = this.view.getInt16(this.pos, true);
        this.pos += 2;
        return v;
      }
      case 8:
        return this.i32();
      case 9:
      case 12:
      case 13: {
        const v = this.view.getBigInt64(this.pos, true);
        this.pos += 8;
        return Number(v);
      }
      case 10: {
        const v = this.view.getInt8(this.pos);
        this.pos += 1;
        return v;
      }
      case 11: {
        const v = this.view.getFloat32(this.pos, true);
        this.pos += 4;
        return v;
      }
      case 14: {
        const v = this.view.getUint16(this.pos, true);
        this.pos += 2;
        return v;
      }
      case 15: {
        const v = this.view.getUint32(this.pos, true);
        this.pos += 4;
        return v;
      }
      case 16: {
        const v = this.view.getBigUint64(this.pos, true);
        this.pos += 8;
        return Number(v);
      }
      case 17:
        return null;
      case 18:
        return this.str();
      default:
        throw new NrbfError(`Unsupported primitive type ${t}`);
    }
  }

  private u8(): number {
    if (this.pos >= this.view.byteLength) throw new NrbfError('Unexpected end of file');
    return this.view.getUint8(this.pos++);
  }

  private i32(): number {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  private str(): string {
    let len = 0;
    let shift = 0;
    for (;;) {
      const b = this.u8();
      len |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, len);
    this.pos += len;
    return this.decoder.decode(bytes);
  }

  private char(): string {
    // A UTF-8 encoded char: 1 to 4 bytes.
    const first = this.view.getUint8(this.pos);
    const n = first < 0x80 ? 1 : first < 0xe0 ? 2 : first < 0xf0 ? 3 : 4;
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, n);
    this.pos += n;
    return this.decoder.decode(bytes);
  }
}

const END = Symbol('end');
const SKIP = Symbol('skip');

/** Turns ArrayList objects into plain arrays, recursively. */
function unwrap(v: unknown, seen = new Map<unknown, unknown>()): unknown {
  if (!v || typeof v !== 'object') return v;
  if (seen.has(v)) return seen.get(v);
  if (Array.isArray(v)) {
    const out: unknown[] = [];
    seen.set(v, out);
    for (const x of v) out.push(unwrap(x, seen));
    return out;
  }
  const o = v as NrbfObject;
  if (o.$type === 'System.Collections.ArrayList') {
    const items = (o._items as unknown[]) ?? [];
    const size = (o._size as number) ?? items.length;
    const out: unknown[] = [];
    seen.set(v, out);
    for (let i = 0; i < size; i++) out.push(unwrap(items[i], seen));
    return out;
  }
  const out: NrbfObject = { $type: o.$type };
  seen.set(v, out);
  for (const k of Object.keys(o)) if (k !== '$type') out[k] = unwrap(o[k], seen);
  return out;
}

/** Reads every graph in a stream written by consecutive Serialize calls. */
export function readAllGraphs(buffer: ArrayBuffer | Uint8Array): unknown[] {
  const r = new NrbfReader(buffer);
  const out: unknown[] = [];
  while (!r.done) out.push(r.readGraph());
  return out;
}
