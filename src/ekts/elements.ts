/**
 * The 27 circuit elements of the original EKTS, with the sizes, connection
 * points and library groups taken from the desktop program
 * (ESCS.Elements: Type setter, InitCPoint, RelPoint; frmLibrary).
 *
 * Coordinates are in the original's pixels: an element occupies a
 * `size.width × size.height` box before rotation, with (0,0) its top-left.
 */
import type { EscElementType } from '../esc/escFile';

export type ElementType = EscElementType;
export type Side = 'Left' | 'Top' | 'Right' | 'Bottom';
/** Phase supplied by a source pin (R, S, T, N), M for motor/system supply terminals, null otherwise. */
export type Energy = 'R' | 'S' | 'T' | 'N' | 'M' | null;

export interface PinDef {
  x: number;
  y: number;
  side: Side;
  energy: Energy;
}

export interface ElementDef {
  type: ElementType;
  /** Unrotated drawing size (mContSize). */
  size: { width: number; height: number };
  /** Number of states (mStateCount): 0 = design, 1 = running idle, 2+ = active. */
  stateCount: number;
  /** Whether the element can be pressed/clicked while the circuit runs (bHand). */
  clickable: boolean;
  /** Whether the element shows a second label (time relay delay). */
  hasLabel2: boolean;
  /** Whether the element carries its own label (relays, buttons…) vs. contacts that pick a relay name. */
  pins: PinDef[];
  /**
   * Pins that are always internally joined (arrCP set in InitCPoint): loads
   * (coil ends), motor windings, the three motor/system supply terminals.
   * Switching elements get their links from their state at run time.
   */
  fixedLinks: number[][];
  name: { tr: string; en: string };
}

const pin = (x: number, y: number, side: Side, energy: Energy = null): PinDef => ({ x, y, side, energy });

const TWO_PIN_H = [pin(0, 10, 'Left'), pin(20, 10, 'Right')];
const LOAD_LINKS = [[1], [0]];
const MOTOR3_LINKS = [
  [1, 2],
  [2, 0],
  [0, 1],
];

type DefInput = Omit<ElementDef, 'type' | 'clickable' | 'hasLabel2' | 'fixedLinks'> &
  Partial<Pick<ElementDef, 'clickable' | 'hasLabel2' | 'fixedLinks'>>;

function def(type: ElementType, d: DefInput): ElementDef {
  return { type, clickable: false, hasLabel2: false, fixedLinks: [], ...d };
}

function systemPins(motor: PinDef[], rest: PinDef[]): { pins: PinDef[]; fixedLinks: number[][] } {
  return { pins: [...motor, ...rest], fixedLinks: [...MOTOR3_LINKS, ...rest.map(() => [])] };
}

/**
 * Names follow the original language file (ulng.txt) exactly, including its
 * mapping of GucR → "L3" and GucT → "L1"; the symbols themselves are drawn
 * with the letters R, S, T as in the original.
 */
export const ELEMENT_DEFS: Record<ElementType, ElementDef> = {
  Role: def('Role', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    clickable: true,
    pins: TWO_PIN_H,
    fixedLinks: LOAD_LINKS,
    name: { tr: 'Kontaktör', en: 'Contactor' },
  }),
  ZamanRolesi: def('ZamanRolesi', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    hasLabel2: true,
    pins: TWO_PIN_H,
    fixedLinks: LOAD_LINKS,
    name: { tr: 'Düz Zaman Rölesi', en: 'On-delay Time Relay' },
  }),
  TersZamanRolesi: def('TersZamanRolesi', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    hasLabel2: true,
    pins: TWO_PIN_H,
    fixedLinks: LOAD_LINKS,
    name: { tr: 'Ters Zaman Rölesi', en: 'Off-delay Time Relay' },
  }),
  AcikKontak: def('AcikKontak', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    pins: TWO_PIN_H,
    name: { tr: 'Normalde Açık Kontak', en: 'Normally Open Contact' },
  }),
  KapaliKontak: def('KapaliKontak', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    pins: TWO_PIN_H,
    name: { tr: 'Normalde Kapalı Kontak', en: 'Normally Closed Contact' },
  }),
  StartButon: def('StartButon', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    clickable: true,
    pins: TWO_PIN_H,
    name: { tr: 'Start Buton', en: 'Start Button' },
  }),
  StopButon: def('StopButon', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    clickable: true,
    pins: TWO_PIN_H,
    name: { tr: 'Stop Buton', en: 'Stop Button' },
  }),
  StartStopButon: def('StartStopButon', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    clickable: true,
    pins: [pin(0, 10, 'Left'), pin(20, 10, 'Right'), pin(0, 18, 'Left'), pin(20, 18, 'Right')],
    name: { tr: 'Çift yollu buton', en: 'Two way button' },
  }),
  SinirAnahtar: def('SinirAnahtar', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    clickable: true,
    pins: [pin(0, 15, 'Left'), pin(20, 15, 'Right'), pin(20, 7, 'Right')],
    name: { tr: 'Sınır anahtarı (Tek kutuplu)', en: 'Limit switch (single pole)' },
  }),
  Lamba: def('Lamba', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    pins: TWO_PIN_H,
    fixedLinks: LOAD_LINKS,
    name: { tr: 'Lamba', en: 'Lamp' },
  }),
  UcFazliMotor: def('UcFazliMotor', {
    size: { width: 40, height: 60 },
    stateCount: 4,
    pins: [pin(0, 0, 'Top', 'M'), pin(20, 0, 'Top', 'M'), pin(40, 0, 'Top', 'M')],
    fixedLinks: MOTOR3_LINKS,
    name: { tr: 'Üç fazlı asenkron motor', en: 'Three Phase Induction Motor' },
  }),
  GucR: def('GucR', {
    size: { width: 10, height: 30 },
    stateCount: 2,
    pins: [pin(5, 30, 'Bottom', 'R')],
    name: { tr: 'L3', en: 'L3' },
  }),
  GucS: def('GucS', {
    size: { width: 10, height: 30 },
    stateCount: 2,
    pins: [pin(5, 30, 'Bottom', 'S')],
    name: { tr: 'L2', en: 'L2' },
  }),
  GucT: def('GucT', {
    size: { width: 10, height: 30 },
    stateCount: 2,
    pins: [pin(5, 30, 'Bottom', 'T')],
    name: { tr: 'L1', en: 'L1' },
  }),
  GucN: def('GucN', {
    size: { width: 10, height: 30 },
    stateCount: 2,
    pins: [pin(5, 30, 'Bottom', 'N')],
    name: { tr: 'Nötr', en: 'Neutral' },
  }),
  Startx3: def('Startx3', {
    size: { width: 20, height: 60 },
    stateCount: 3,
    clickable: true,
    pins: [
      pin(0, 10, 'Left'),
      pin(20, 10, 'Right'),
      pin(0, 30, 'Left'),
      pin(20, 30, 'Right'),
      pin(0, 50, 'Left'),
      pin(20, 50, 'Right'),
    ],
    name: { tr: 'Üç kutuplu tek konumlu anahtar', en: '3 pole single state switch' },
  }),
  Start3x3: def('Start3x3', {
    size: { width: 20, height: 60 },
    stateCount: 3,
    clickable: true,
    pins: [
      pin(0, 10, 'Left'),
      pin(20, 2, 'Right'),
      pin(20, 10, 'Right'),
      pin(0, 30, 'Left'),
      pin(20, 22, 'Right'),
      pin(20, 30, 'Right'),
      pin(0, 50, 'Left'),
      pin(20, 42, 'Right'),
      pin(20, 50, 'Right'),
    ],
    name: { tr: 'Üç kutuplu çift konumlu anahtar', en: '3 pole double state switch' },
  }),
  UcFazGuc: def('UcFazGuc', {
    size: { width: 30, height: 30 },
    stateCount: 2,
    pins: [pin(5, 30, 'Bottom', 'R'), pin(15, 30, 'Bottom', 'S'), pin(25, 30, 'Bottom', 'T')],
    name: { tr: 'Üç Fazlı Güç Kaynağı', en: '3-Phase Supply' },
  }),
  BirFazMotor: def('BirFazMotor', {
    size: { width: 80, height: 100 },
    stateCount: 6,
    pins: [pin(0, 20, 'Left'), pin(80, 20, 'Right'), pin(0, 80, 'Left'), pin(80, 80, 'Right')],
    fixedLinks: [[1], [0], [3], [2]],
    name: { tr: 'Tek fazlı asenkron motor', en: 'Single Phase Induction Motor' },
  }),
  UcFazliMotor2: def('UcFazliMotor2', {
    size: { width: 70, height: 40 },
    stateCount: 3,
    pins: [
      pin(5, 0, 'Top', 'M'),
      pin(15, 0, 'Top', 'M'),
      pin(25, 0, 'Top', 'M'),
      pin(5, 40, 'Bottom', 'M'),
      pin(15, 40, 'Bottom', 'M'),
      pin(25, 40, 'Bottom', 'M'),
    ],
    // Windings as in InitCPoint: U(0)–X(4), V(1)–Y(5), W(2)–Z(3).
    fixedLinks: [[4], [5], [3], [2], [0], [1]],
    name: { tr: 'Yıldız Üçgen Bağlanabilen Üç Fazlı Asenkron Motor', en: 'Star-Delta Connectible 3 Phase Induction Motor' },
  }),
  SinirAnahtar2: def('SinirAnahtar2', {
    size: { width: 20, height: 20 },
    stateCount: 3,
    clickable: true,
    pins: [pin(0, 10, 'Left'), pin(20, 10, 'Right'), pin(0, 18, 'Left'), pin(20, 18, 'Right')],
    name: { tr: 'Sınır anahtarı (iki kutuplu)', en: 'Limit switch (two pole)' },
  }),
  BirFazMotor2: def('BirFazMotor2', {
    size: { width: 80, height: 100 },
    stateCount: 6,
    pins: [pin(0, 20, 'Left'), pin(80, 20, 'Right'), pin(0, 30, 'Left'), pin(80, 80, 'Right')],
    fixedLinks: [[1], [0], [3], [2]],
    name: { tr: 'Merkezkaç anahtarlı tek fazlı asenkron motor', en: 'Single Phase Induction Motor with centrifugal switch' },
  }),
  UcAcikKontak: def('UcAcikKontak', {
    size: { width: 20, height: 70 },
    stateCount: 3,
    pins: [
      pin(0, 10, 'Left'),
      pin(20, 10, 'Right'),
      pin(0, 35, 'Left'),
      pin(20, 35, 'Right'),
      pin(0, 60, 'Left'),
      pin(20, 60, 'Right'),
    ],
    name: { tr: 'Normalde Açık Üçlü Kontak', en: 'Normally Open Triple Contact' },
  }),
  UcKapaliKontak: def('UcKapaliKontak', {
    size: { width: 20, height: 70 },
    stateCount: 3,
    pins: [
      pin(0, 10, 'Left'),
      pin(20, 10, 'Right'),
      pin(0, 35, 'Left'),
      pin(20, 35, 'Right'),
      pin(0, 60, 'Left'),
      pin(20, 60, 'Right'),
    ],
    name: { tr: 'Normalde Kapalı Üçlü Kontak', en: 'Normally Closed Triple Contact' },
  }),
  Kapi1: def('Kapi1', {
    size: { width: 280, height: 100 },
    stateCount: 2,
    ...systemPins(
      [pin(130, 100, 'Bottom', 'M'), pin(140, 100, 'Bottom', 'M'), pin(150, 100, 'Bottom', 'M')],
      [
        pin(0, 60, 'Left'),
        pin(0, 65, 'Left'),
        pin(0, 85, 'Left'),
        pin(0, 90, 'Left'),
        pin(280, 60, 'Right'),
        pin(280, 65, 'Right'),
        pin(280, 85, 'Right'),
        pin(280, 90, 'Right'),
      ],
    ),
    name: { tr: 'Kapı Sistemi 1', en: 'Gate system 1' },
  }),
  Kapi2: def('Kapi2', {
    size: { width: 100, height: 100 },
    stateCount: 2,
    ...systemPins(
      [pin(10, 0, 'Top', 'M'), pin(20, 0, 'Top', 'M'), pin(30, 0, 'Top', 'M')],
      [
        pin(0, 70, 'Left'),
        pin(0, 75, 'Left'),
        pin(0, 95, 'Left'),
        pin(0, 100, 'Left'),
        pin(70, 0, 'Top'),
        pin(75, 0, 'Top'),
        pin(95, 0, 'Top'),
        pin(100, 0, 'Top'),
      ],
    ),
    name: { tr: 'Kapı Sistemi 2', en: 'Gate system 2' },
  }),
  Asansor: def('Asansor', {
    size: { width: 60, height: 240 },
    stateCount: 2,
    ...systemPins(
      [pin(10, 0, 'Top', 'M'), pin(20, 0, 'Top', 'M'), pin(30, 0, 'Top', 'M')],
      [45, 50, 70, 75, 85, 90, 110, 115, 125, 130, 150, 155, 165, 170, 190, 195, 205, 210, 230, 235].map((y) =>
        pin(60, y, 'Right'),
      ),
    ),
    name: { tr: 'Asansör', en: 'Elevator' },
  }),
};

export interface LibraryGroup {
  id: 'power' | 'element' | 'motor' | 'system';
  name: { tr: string; en: string };
  types: ElementType[];
}

/** Library groups of the original (frmLibrary), items sorted by English name as the tree showed them. */
export const LIBRARY_GROUPS: LibraryGroup[] = [
  {
    id: 'power',
    name: { tr: 'Güç kaynakları', en: 'AC Power supplies' },
    types: ['UcFazGuc', 'GucR', 'GucS', 'GucT', 'GucN'],
  },
  {
    id: 'element',
    name: { tr: 'Devre elemanları', en: 'Components' },
    types: [
      'Role',
      'ZamanRolesi',
      'TersZamanRolesi',
      'AcikKontak',
      'KapaliKontak',
      'UcAcikKontak',
      'UcKapaliKontak',
      'StartButon',
      'StopButon',
      'StartStopButon',
      'SinirAnahtar',
      'SinirAnahtar2',
      'Startx3',
      'Start3x3',
      'Lamba',
    ],
  },
  {
    id: 'motor',
    name: { tr: 'Asenkron Motorlar', en: 'Induction Motors' },
    types: ['UcFazliMotor', 'UcFazliMotor2', 'BirFazMotor', 'BirFazMotor2'],
  },
  {
    id: 'system',
    name: { tr: 'Sistemler', en: 'Systems' },
    types: ['Kapi1', 'Kapi2', 'Asansor'],
  },
];

// ---- rotation (Elements.Rotation / RelPoint / RelSide) ----------------------

/** Translation applied after rotating (pShift). */
export function rotationShift(type: ElementType, rotation: number): { x: number; y: number } {
  const { width: w, height: h } = ELEMENT_DEFS[type].size;
  switch (((rotation % 4) + 4) % 4) {
    case 1:
      return { x: h, y: 0 };
    case 2:
      return { x: w, y: h };
    case 3:
      return { x: 0, y: w };
    default:
      return { x: 0, y: 0 };
  }
}

/** Size of the element's box after rotation. */
export function rotatedSize(type: ElementType, rotation: number): { width: number; height: number } {
  const { width, height } = ELEMENT_DEFS[type].size;
  return rotation % 2 === 0 ? { width, height } : { width: height, height: width };
}

/** Position of an unrotated point after rotation, relative to the element's top-left. */
export function rotatePoint(type: ElementType, rotation: number, p: { x: number; y: number }) {
  const s = rotationShift(type, rotation);
  switch (((rotation % 4) + 4) % 4) {
    case 1:
      return { x: s.x - p.y, y: p.x };
    case 2:
      return { x: s.x - p.x, y: s.y - p.y };
    case 3:
      return { x: p.y, y: s.y - p.x };
    default:
      return { x: p.x, y: p.y };
  }
}

const SIDE_ORDER: Side[] = ['Top', 'Right', 'Bottom', 'Left'];

export function rotateSide(side: Side, rotation: number): Side {
  return SIDE_ORDER[(SIDE_ORDER.indexOf(side) + rotation) % 4];
}

/** Absolute pin positions of an element placed at `location` with `rotation`. */
export function pinPositions(type: ElementType, rotation: number, location: { x: number; y: number }) {
  return ELEMENT_DEFS[type].pins.map((p) => {
    const r = rotatePoint(type, rotation, p);
    return { x: location.x + r.x, y: location.y + r.y, side: rotateSide(p.side, rotation), energy: p.energy };
  });
}
