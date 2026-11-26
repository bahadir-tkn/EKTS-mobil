/**
 * Reader for .esc circuit files saved by the desktop EKTS program
 * (Elektrik Kumanda Teknikleri Simülatörü, v1.0.x).
 *
 * The file is two BinaryFormatter graphs: a signature string and an ArrayList
 * laid out by frmMain.pnlMain_Save in the original program:
 *
 *   [ elements, lines, dots, connectionPoints, descriptionTexts, summary ]
 *
 *   element          = [type, location, label1Location, label2Location, label1Text,
 *                       label2Text, linkedElementIndexes, connectionPointIndexes,
 *                       label2Enabled, rotation, color]
 *   line             = ["h" | "v", endPoint1, endPoint2, cpIndex1, cpIndex2]
 *   dot (junction)   = [origin, connectionPointIndexes]
 *   connectionPoint  = [side, connectedConnectionPointIndex (-1 = none)]
 *   descriptionText  = [location, size, text]
 *   summary          = [visible, location]
 *
 * Connection points (CPoint) are what get wired together: every element, line
 * end and junction owns some, and each one names the point it is joined to.
 */
import { readAllGraphs, type NrbfObject } from './nrbf';

export const ESC_SIGNATURE = 'BU DOSYA EKTS PROGRAMININ DOSYASIDIR';

/** Element types in the order of the original ESCS.Elements.ElementType enum. */
export const ESC_ELEMENT_TYPES = [
  'Role',
  'ZamanRolesi',
  'TersZamanRolesi',
  'AcikKontak',
  'KapaliKontak',
  'StartButon',
  'StopButon',
  'StartStopButon',
  'SinirAnahtar',
  'Lamba',
  'UcFazliMotor',
  'GucR',
  'GucS',
  'GucT',
  'GucN',
  'Startx3',
  'Start3x3',
  'UcFazGuc',
  'BirFazMotor',
  'UcFazliMotor2',
  'SinirAnahtar2',
  'BirFazMotor2',
  'UcAcikKontak',
  'UcKapaliKontak',
  'Kapi1',
  'Kapi2',
  'Asansor',
] as const;

export type EscElementType = (typeof ESC_ELEMENT_TYPES)[number];

/** Order of ESCS.CPoint.Sides. */
export const ESC_SIDES = ['Null', 'Left', 'Top', 'Right', 'Bottom'] as const;
export type EscSide = (typeof ESC_SIDES)[number];

export interface EscPoint {
  x: number;
  y: number;
}

export interface EscElement {
  type: EscElementType;
  location: EscPoint;
  labelLocation: EscPoint;
  label2Location: EscPoint;
  /** Name, e.g. "K1" for a contactor, or the relay a contact belongs to. */
  label: string;
  /** Second label: the delay in seconds for time relays. */
  label2: string;
  label2Visible: boolean;
  /** Indexes into `elements` of related elements (a contact's relay). */
  linkedElements: number[];
  /** Indexes into `connectionPoints`, in the element's own pin order. */
  connectionPoints: number[];
  /** Rotation in quarter turns (0-3). */
  rotation: number;
  /** ARGB color (lamps); 0 means default. */
  color: number;
}

export interface EscLine {
  orientation: 'h' | 'v';
  from: EscPoint;
  to: EscPoint;
  connectionPoints: [number, number];
}

export interface EscDot {
  location: EscPoint;
  connectionPoints: number[];
}

export interface EscConnectionPoint {
  side: EscSide;
  /** Index of the connection point this one is joined to, or -1. */
  connectedTo: number;
}

export interface EscDescriptionText {
  location: EscPoint;
  size: { width: number; height: number };
  text: string;
}

export interface EscCircuit {
  elements: EscElement[];
  lines: EscLine[];
  dots: EscDot[];
  connectionPoints: EscConnectionPoint[];
  descriptionTexts: EscDescriptionText[];
  summary: { visible: boolean; location: EscPoint } | null;
}

export class EscFormatError extends Error {}

export function parseEscFile(buffer: ArrayBuffer | Uint8Array): EscCircuit {
  let graphs: unknown[];
  try {
    graphs = readAllGraphs(buffer);
  } catch (e) {
    throw new EscFormatError(`Dosya okuma hatası: ${(e as Error).message}`);
  }
  if (graphs[0] !== ESC_SIGNATURE || !Array.isArray(graphs[1])) {
    throw new EscFormatError('Bu dosya bir EKTS (.esc) dosyası değil.');
  }
  const [els, lines, dots, cps, texts, summary] = graphs[1] as unknown[][];

  return {
    elements: (els ?? []).map((raw) => {
      const e = raw as unknown[];
      const typeIndex = enumValue(e[0]);
      const type = ESC_ELEMENT_TYPES[typeIndex];
      if (!type) throw new EscFormatError(`Bilinmeyen eleman tipi: ${typeIndex}`);
      return {
        type,
        location: point(e[1]),
        labelLocation: point(e[2]),
        label2Location: point(e[3]),
        label: String(e[4] ?? ''),
        label2: String(e[5] ?? ''),
        linkedElements: numbers(e[6]),
        connectionPoints: numbers(e[7]),
        label2Visible: Boolean(e[8]),
        rotation: Number(e[9] ?? 0),
        color: colorValue(e[10]),
      };
    }),
    lines: (lines ?? []).map((raw) => {
      const l = raw as unknown[];
      return {
        orientation: l[0] === 'v' ? 'v' : 'h',
        from: point(l[1]),
        to: point(l[2]),
        connectionPoints: [Number(l[3]), Number(l[4])],
      };
    }),
    dots: (dots ?? []).map((raw) => {
      const d = raw as unknown[];
      return { location: point(d[0]), connectionPoints: numbers(d[1]) };
    }),
    connectionPoints: (cps ?? []).map((raw) => {
      const c = raw as unknown[];
      return { side: ESC_SIDES[enumValue(c[0])] ?? 'Null', connectedTo: Number(c[1]) };
    }),
    descriptionTexts: (texts ?? []).map((raw) => {
      const t = raw as unknown[];
      const size = t[1] as NrbfObject;
      return {
        location: point(t[0]),
        size: { width: Number(size?.width ?? 0), height: Number(size?.height ?? 0) },
        text: String(t[2] ?? ''),
      };
    }),
    summary:
      Array.isArray(summary) && summary.length >= 2
        ? { visible: Boolean(summary[0]), location: point(summary[1]) }
        : null,
  };
}

function enumValue(v: unknown): number {
  if (typeof v === 'number') return v;
  return Number((v as NrbfObject)?.value__ ?? -1);
}

function point(v: unknown): EscPoint {
  const p = v as NrbfObject;
  return { x: Number(p?.x ?? 0), y: Number(p?.y ?? 0) };
}

function numbers(v: unknown): number[] {
  return Array.isArray(v) ? v.map(Number) : [];
}

/** System.Drawing.KnownColor → ARGB for the lamp colors the original offers. */
const KNOWN_COLOR_ARGB: Record<number, number> = {
  141: 0xffff0000 | 0, // Red
  37: 0xff0000ff | 0, // Blue
  79: 0xff008000 | 0, // Green
  107: 0xffff00ff | 0, // Magenta
  166: 0xffffff00 | 0, // Yellow
};

/** System.Drawing.Color: an ARGB value (state 2) or a known color (state 1). */
function colorValue(v: unknown): number {
  const c = v as NrbfObject;
  const state = Number(c?.state ?? 0);
  if (state & 2) return Number(c?.value ?? 0) | 0;
  if (state & 1) return KNOWN_COLOR_ARGB[Number(c?.knownColor ?? 0)] ?? 0;
  return 0;
}
