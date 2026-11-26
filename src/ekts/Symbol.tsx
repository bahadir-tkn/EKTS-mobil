/**
 * SVG drawings of the 27 EKTS elements, ported line by line from the
 * Paint_* methods of the original program (ESCS.Elements). Each drawing works
 * in the element's unrotated coordinates; <ElementSymbol> applies the same
 * rotate-then-shift transform the original used (fDegree, pShift).
 */
import React from 'react';
import { ELEMENT_DEFS, rotationShift, type ElementType } from './elements';

export const COLORS = {
  black: '#000000',
  magenta: '#FF00FF',
  green: '#008000',
  gray: '#808080',
  white: '#FFFFFF',
  /** Energized wires (Line.State = 2 → Color.Violet). */
  violet: '#EE82EE',
};

/** Default control font (Microsoft Sans Serif 8.25pt ≈ 11px) and label font (6.75pt ≈ 9px). */
export const FONT_FAMILY = '"Microsoft Sans Serif", Tahoma, Arial, sans-serif';
export const ELEMENT_FONT_SIZE = 11;
export const LABEL_FONT_SIZE = 9;

/** Radius of the small terminal dots (r = 1.9f). */
const R = 1.9;

export interface SystemState {
  /** Door / car position (htSysVars kapi[0] or asansor[0]). */
  position?: number;
  /** p1..p6 flags (htSysState). */
  flags?: Record<string, boolean>;
}

export interface SymbolProps {
  type: ElementType;
  /** 0 = design, 1 = running idle, 2+ = active (see each element). */
  state?: number;
  /** Lamp color as ARGB (0 = default magenta). */
  color?: number;
  /** Rotor indicator angle in radians (motors and systems). */
  angle?: number;
  system?: SystemState;
}

type Pt = [number, number];

const Line = ({ a, b, c, dash }: { a: Pt; b: Pt; c: string; dash?: string }) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeDasharray={dash} />
);
const Lines = ({ pts, c, dash }: { pts: Pt[]; c: string; dash?: string }) => (
  <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={c} strokeDasharray={dash} />
);
const Rect = ({ x, y, w, h, c, fill, dash }: { x: number; y: number; w: number; h: number; c?: string; fill?: string; dash?: string }) => (
  <rect x={x} y={y} width={w} height={h} stroke={c ?? 'none'} fill={fill ?? 'none'} strokeDasharray={dash} />
);
const Circle = ({ o, r, c, fill }: { o: Pt; r: number; c?: string; fill?: string }) => (
  <circle cx={o[0]} cy={o[1]} r={r} stroke={c ?? 'none'} fill={fill ?? 'none'} />
);
/** sqrRect truncates to whole pixels in the original. */
const CircleInt = ({ o, r, c }: { o: Pt; r: number; c: string }) => {
  const x = Math.trunc(o[0] - r);
  const y = Math.trunc(o[1] - r);
  const d = Math.trunc(r * 2);
  return <ellipse cx={x + d / 2} cy={y + d / 2} rx={d / 2} ry={d / 2} stroke={c} fill="none" />;
};
const Text = ({ x, y, s, c = COLORS.black, size = ELEMENT_FONT_SIZE }: { x: number; y: number; s: string; c?: string; size?: number }) => (
  <text x={x + 1} y={y + 1} fill={c} fontSize={size} fontFamily={FONT_FAMILY} dominantBaseline="hanging">
    {s}
  </text>
);

/** GDI+ DrawCurve: a cardinal spline through the points with the given tension. */
function cardinalPath(pts: Pt[], tension: number): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  const t = tension / 3;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const Curve = ({ pts, c, tension }: { pts: Pt[]; c: string; tension: number }) => (
  <path d={cardinalPath(pts, tension)} fill="none" stroke={c} />
);

/** The coil zig-zag used by the single-phase motor windings. */
function coilPoints(x0: number, y0: number, s: number): Pt[] {
  const pts: Pt[] = [[x0, y0]];
  for (let k = 0; k < 8; k++) {
    const b = 2 * k;
    pts.push([x0 + s * (b + 1), y0 - s], [x0 + s * (b + 2), y0 + s], [x0 + s * (b + 1), y0 + s]);
  }
  pts.push([x0 + s * 16, y0]);
  return pts;
}

function argbToCss(argb: number | undefined): string {
  if (!argb) return COLORS.magenta;
  const v = argb >>> 0;
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return `rgb(${r},${g},${b})`;
}

const { black: K, magenta: MG, green: GR } = COLORS;

function draw(p: SymbolProps): React.ReactNode {
  const { type } = p;
  const state = p.state ?? 0;
  const { width: W, height: H } = ELEMENT_DEFS[type].size;
  const angle = p.angle ?? 0;
  const flags = p.system?.flags ?? {};

  switch (type) {
    case 'Role': {
      const c = state === 2 ? MG : K;
      const n = H / 4;
      const m = W / 4;
      return (
        <>
          <Line a={[0, n * 2]} b={[m, n * 2]} c={c} />
          <Line a={[m * 3, n * 2]} b={[m * 4, n * 2]} c={c} />
          <Rect x={m} y={0} w={m * 2} h={n * 4} c={c} />
          <Line a={[m * 3, n]} b={[m, n * 3]} c={c} />
        </>
      );
    }
    case 'ZamanRolesi': {
      const c = state === 2 || state === 3 ? MG : K;
      const n = H / 4;
      const y = H / 3;
      const m = W / 4;
      return (
        <>
          <Line a={[0, n * 2]} b={[m, n * 2]} c={c} />
          <Line a={[m * 3, n * 2]} b={[m * 4, n * 2]} c={c} />
          <Rect x={m} y={0} w={m * 2} h={n * 4} c={c} />
          <Lines pts={[[m, 0], [m * 3, y], [m, y], [m * 3, 0]]} c={c} />
        </>
      );
    }
    case 'TersZamanRolesi': {
      const c = state === 2 || state === 3 ? MG : K;
      const n = H / 4;
      const n2 = H / 3;
      const m = W / 4;
      return (
        <>
          <Line a={[0, n * 2]} b={[m, n * 2]} c={c} />
          <Line a={[m * 3, n * 2]} b={[m * 4, n * 2]} c={c} />
          <Rect x={m} y={0} w={m * 2} h={n * 4} c={c} />
          <Rect x={m} y={0} w={m * 2} h={n2} fill={c} />
        </>
      );
    }
    case 'AcikKontak':
    case 'KapaliKontak': {
      const open = type === 'AcikKontak';
      const c = state === 2 ? MG : K;
      const n = H / 4;
      const s7 = W / 7;
      const t = W / 3;
      // NO: the slash appears when closed (active); NC: the slash shows while closed (inactive).
      const slash = open ? state === 2 : state !== 2;
      return (
        <>
          {slash && <Line a={[s7 * 6, 0]} b={[s7, H]} c={c} />}
          <Line a={[0, n * 2]} b={[t, n * 2]} c={c} />
          <Line a={[t * 2, n * 2]} b={[W, n * 2]} c={c} />
          <Line a={[t, 0]} b={[t, open ? n * 4 : H]} c={c} />
          <Line a={[t * 2, 0]} b={[t * 2, open ? n * 4 : H]} c={c} />
        </>
      );
    }
    case 'UcAcikKontak':
    case 'UcKapaliKontak': {
      const open = type === 'UcAcikKontak';
      const c = state === 2 ? MG : K;
      const n = H / 14;
      const s7 = W / 7;
      const t = W / 3;
      const slash = open ? state === 2 : state !== 2;
      const rows = [
        [0, 2, 4],
        [5, 7, 9],
        [10, 12, 14],
      ];
      return (
        <>
          {slash &&
            rows.map(([top, , bot]) => <Line key={`s${top}`} a={[s7 * 6, n * top]} b={[s7, n * bot]} c={c} />)}
          {rows.map(([top, mid, bot]) => (
            <React.Fragment key={top}>
              <Line a={[0, n * mid]} b={[t, n * mid]} c={c} />
              <Line a={[t * 2, n * mid]} b={[W, n * mid]} c={c} />
              <Line a={[t, n * top]} b={[t, n * bot]} c={c} />
              <Line a={[t * 2, n * top]} b={[t * 2, n * bot]} c={c} />
            </React.Fragment>
          ))}
        </>
      );
    }
    case 'StartButon': {
      const on = state === 2;
      const c = on ? MG : K;
      const n = H / 4;
      const m = W / 4;
      const lift = on ? 0 : 3;
      const y = n * 2 - R - lift;
      return (
        <>
          <Line a={[0, n * 2]} b={[m, n * 2]} c={c} />
          <Line a={[m * 3, n * 2]} b={[W, n * 2]} c={c} />
          <Circle o={[m, n * 2]} r={R} fill={c} />
          <Circle o={[m * 3, n * 2]} r={R} fill={c} />
          <Line a={[m, y]} b={[m * 3, y]} c={c} />
          <Line a={[m * 2, 0]} b={[m * 2, y]} c={c} />
        </>
      );
    }
    case 'StopButon': {
      const on = state === 2;
      const c = on ? MG : K;
      const drop = on ? 3 : 0;
      const n = H / 4;
      const m = W / 4;
      const y = n * 2 + R + drop;
      return (
        <>
          <Line a={[0, n * 2]} b={[m, n * 2]} c={c} />
          <Line a={[m * 3, n * 2]} b={[W, n * 2]} c={c} />
          <Circle o={[m, n * 2]} r={R} fill={c} />
          <Circle o={[m * 3, n * 2]} r={R} fill={c} />
          <Line a={[m, y]} b={[m * 3, y]} c={c} />
          <Line a={[m * 2, y - 10]} b={[m * 2, y]} c={c} />
        </>
      );
    }
    case 'StartStopButon':
    case 'SinirAnahtar2': {
      const on = state === 2;
      const c = on ? MG : K;
      const n = H / 4;
      const m = W / 4;
      const y = on ? H - R * 2 : n * 2 + R;
      return (
        <>
          <Line a={[0, n * 2]} b={[m, n * 2]} c={c} />
          <Line a={[m * 3, n * 2]} b={[W, n * 2]} c={c} />
          <Circle o={[m, n * 2]} r={R} fill={c} />
          <Circle o={[m * 3, n * 2]} r={R} fill={c} />
          <Line a={[0, H - R]} b={[m, H - R]} c={c} />
          <Line a={[m * 3, H - R]} b={[W, H - R]} c={c} />
          <Circle o={[m, H - R]} r={R} fill={c} />
          <Circle o={[m * 3, H - R]} r={R} fill={c} />
          <Line a={[m, y]} b={[m * 3, y]} c={c} />
          <Line a={[m * 2, y - 9]} b={[m * 2, y]} c={c} />
          {type === 'SinirAnahtar2' && <CircleInt o={[m * 2, y - 9]} r={n / 2} c={c} />}
        </>
      );
    }
    case 'SinirAnahtar': {
      const on = state === 2;
      const c = on ? MG : K;
      const n = H / 4;
      const m = W / 4;
      const yTop = n * 3 - 2 * R - 4;
      const tip = on ? n * 3 : n * 3 - R - 4;
      const mid = n * 3 - (n * 3 - tip) / 2;
      const y2 = mid - 9;
      return (
        <>
          <Line a={[0, n * 3]} b={[m, n * 3]} c={c} />
          <Line a={[m * 3, n * 3]} b={[W, n * 3]} c={c} />
          <Circle o={[m, n * 3]} r={R} fill={c} />
          <Circle o={[m * 3, n * 3]} r={R} fill={c} />
          <Line a={[m * 3, yTop]} b={[W, yTop]} c={c} />
          <Circle o={[m * 3, yTop]} r={R} fill={c} />
          <Line a={[m, n * 3]} b={[m * 3, tip]} c={c} />
          <Line a={[m * 2, y2]} b={[m * 2, mid]} c={c} />
          <CircleInt o={[m * 2, y2]} r={n / 2} c={c} />
        </>
      );
    }
    case 'Startx3':
    case 'Start3x3': {
      const double = type === 'Start3x3';
      const on = state === 2;
      const c = on ? MG : K;
      const n = H / 12;
      const m = W / 4;
      const gap = double ? 4 : 3;
      const lift = on ? 0 : R + gap;
      const rows = [2, 6, 10];
      return (
        <>
          {rows.map((k) => (
            <React.Fragment key={k}>
              <Line a={[0, n * k]} b={[m, n * k]} c={c} />
              <Line a={[m * 3, n * k]} b={[W, n * k]} c={c} />
              <Circle o={[m, n * k]} r={R} fill={c} />
              <Circle o={[m * 3, n * k]} r={R} fill={c} />
              {double && (
                <>
                  <Line a={[m * 3, n * k - R * 2 - gap]} b={[W, n * k - R * 2 - gap]} c={c} />
                  <Circle o={[m * 3, n * k - R * 2 - gap]} r={R} fill={c} />
                </>
              )}
              <Line a={[m, n * k]} b={[m * 3, n * k - lift]} c={c} />
            </React.Fragment>
          ))}
          <Line a={[m * 2, n * 2 - lift / 2 - 7]} b={[m * 2, n * 2 - lift / 2]} c={c} />
          <Line a={[m * 2, n * 2 - lift / 2]} b={[m * 2, n * 10 - lift / 2]} c={c} dash="3 1" />
        </>
      );
    }
    case 'Lamba': {
      const on = state === 2;
      const c = on ? MG : K;
      const n = H / 4;
      const m = W / 4;
      const r = m;
      const o: Pt = [m * 2, n * 2];
      const at = (a: number): Pt => [Math.sin(a) * r + o[0], Math.cos(a) * r + o[1]];
      return (
        <>
          {on ? <Circle o={o} r={r} fill={argbToCss(p.color)} /> : <Circle o={o} r={r} c={K} />}
          <Line a={[0, n * 2]} b={[m, n * 2]} c={c} />
          <Line a={[m * 3, n * 2]} b={[W, n * 2]} c={c} />
          <Line a={at(Math.PI / 4)} b={at((5 * Math.PI) / 4)} c={c} />
          <Line a={at((3 * Math.PI) / 4)} b={at((7 * Math.PI) / 4)} c={c} />
        </>
      );
    }
    case 'UcFazliMotor': {
      const c = state === 2 ? MG : K;
      const dot = state === 2 ? GR : K;
      const x = W / 2;
      const n = H / 3;
      const r = n - 1;
      const o: Pt = [x, n * 2];
      const rotor: Pt = [o[0] + Math.cos(angle) * r, o[1] + Math.sin(angle) * r];
      const at = (a: number): Pt => [Math.sin(a) * r + o[0], Math.cos(a) * r + o[1]];
      return (
        <>
          <Line a={[x, 0]} b={[x, n]} c={c} />
          <Circle o={o} r={r} c={c} />
          {state !== 0 && <Circle o={rotor} r={4} fill={dot} />}
          <Lines pts={[[0, 0], [0, n], at((5 * Math.PI) / 4)]} c={c} />
          <Lines pts={[[W, 0], [W, n], at((3 * Math.PI) / 4)]} c={c} />
          <Text x={o[0] - 5} y={o[1] - 15} s="M" />
          <Text x={o[0] - 10} y={o[1]} s="3 ~" />
        </>
      );
    }
    case 'UcFazliMotor2': {
      const c = state === 2 ? MG : K;
      const dot = state === 2 ? GR : K;
      const n = H / 4;
      const s = W / 7;
      const r = n * 2;
      const o: Pt = [s * 5, n * 2];
      const rotor: Pt = [o[0] + Math.cos(angle) * r, o[1] + Math.sin(angle) * r];
      const edge = o[0] - r * Math.sin(Math.acos(n / r));
      return (
        <>
          {[0.5, 1.5, 2.5].map((k) => (
            <React.Fragment key={k}>
              <Line a={[s * k, 0]} b={[s * k, n]} c={c} />
              <Line a={[s * k, n * 3]} b={[s * k, n * 4]} c={c} />
            </React.Fragment>
          ))}
          <Circle o={o} r={r} c={c} />
          {state !== 0 && <Circle o={rotor} r={4} fill={dot} />}
          <Lines pts={[[edge, n], [0, n], [0, n * 3], [edge, n * 3]]} c={c} />
          <Text x={o[0] - 5} y={o[1] - 15} s="M" c={dot} />
          <Text x={o[0] - 10} y={o[1]} s="3 ~" c={dot} />
          {(['U', 'V', 'W'] as const).map((l, i) => (
            <Text key={l} x={s * i + 2} y={n + 1} s={l} size={8} />
          ))}
          {(['Z', 'X', 'Y'] as const).map((l, i) => (
            <Text key={l} x={s * i + 2} y={n * 2 + 1} s={l} size={8} />
          ))}
        </>
      );
    }
    case 'GucR':
    case 'GucS':
    case 'GucT':
    case 'GucN': {
      const letter = type.slice(3);
      const n = H / 3;
      const m = W / 2;
      const r = m / 2;
      return (
        <>
          <Text x={0} y={0} s={letter} />
          <CircleInt o={[m, n * 2]} r={r} c={K} />
          <Line a={[m, n * 2 + r]} b={[m, H]} c={K} />
        </>
      );
    }
    case 'UcFazGuc': {
      const n = H / 3;
      const m = W / 6;
      const r = m / 2;
      return (
        <>
          {(['R', 'S', 'T'] as const).map((l, i) => (
            <React.Fragment key={l}>
              <Text x={m * 2 * i} y={0} s={l} />
              <CircleInt o={[m * (2 * i + 1), n * 2]} r={r} c={K} />
              <Line a={[m * (2 * i + 1), n * 2 + r]} b={[m * (2 * i + 1), H]} c={K} />
            </React.Fragment>
          ))}
        </>
      );
    }
    case 'BirFazMotor':
    case 'BirFazMotor2': {
      const withSwitch = type === 'BirFazMotor2';
      const n = H / 10;
      const m = W / 8;
      const r = n * 2 - 1;
      const s = n / 4;
      const o: Pt = [m * 5, n * 5];
      const rotor: Pt = [o[0] + Math.cos(angle) * r, o[1] + Math.sin(angle) * r];
      // Colors per state, as in Paint_BirFazMotor / Paint_BirFazMotor2.
      let main = K;
      let aux = K;
      let body = K;
      let dot = K;
      let auxFill = K;
      let swOpen = 0;
      if (state === 5) [main, aux, body, dot, auxFill] = [MG, MG, MG, GR, MG];
      else if (state === 4) [aux, auxFill] = [MG, MG];
      else if (state === 3) {
        [main, body, dot] = [MG, MG, GR];
        swOpen = withSwitch ? 4 : 0;
      } else if (state === 2) main = MG;
      const dash = withSwitch ? (state === 5 ? MG : K) : K;
      return (
        <>
          <Line a={[0, n * 2]} b={[m * 3, n * 2]} c={main} />
          <Line a={[m * 7, n * 2]} b={[W, n * 2]} c={main} />
          <Curve pts={coilPoints(m * 3, n * 2, s)} c={main} tension={0.7} />
          <Circle o={o} r={r} c={body} />
          <Circle o={o} r={n / 2} c={body} />
          {Array.from({ length: 7 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 7;
            return <Circle key={i} o={[o[0] + (Math.cos(a) * r * 2) / 3, o[1] + (Math.sin(a) * r * 2) / 3]} r={4} c={body} />;
          })}
          {state !== 0 && <Circle o={rotor} r={4} fill={dot} />}
          {withSwitch ? (
            <>
              <Line a={[0, n * 3]} b={[m / 2, n * 3]} c={aux} />
              <Line a={[m / 2, n * 3]} b={[m / 2, (n * 9) / 2]} c={aux} />
              <Line a={[m / 2, (n * 11) / 2]} b={[m / 2, n * 8]} c={aux} />
              <Line a={[m / 2 + swOpen, (n * 9) / 2]} b={[m / 2, (n * 11) / 2]} c={aux} />
              <Circle o={[m / 2, (n * 11) / 2]} r={R} fill={auxFill} />
              <Circle o={[m / 2, (n * 9) / 2]} r={R} fill={auxFill} />
              <Line a={[m, n * 5]} b={[(m * 5) / 2, n * 5]} c={dash} />
              <Line a={[m / 2, n * 8]} b={[m, n * 8]} c={aux} />
            </>
          ) : (
            <Line a={[0, n * 8]} b={[m, n * 8]} c={aux} />
          )}
          <Line a={[m + s * 2, n * 8]} b={[m * 3, n * 8]} c={aux} />
          <Line a={[m, n * 8 - s * 2]} b={[m, n * 8 + s * 2]} c={aux} />
          <Line a={[m * 7, n * 8]} b={[W, n * 8]} c={aux} />
          <Curve pts={coilPoints(m * 3, n * 8, s)} c={aux} tension={0.7} />
          <Curve
            pts={[
              [m + s * 3, n * 8 - s * 2],
              [m + s * 2, n * 8],
              [m + s * 3, n * 8 + s * 2],
            ]}
            c={aux}
            tension={2}
          />
          <Text x={m * 4} y={0} s="A.S." />
          <Text x={m * 4} y={n * 9} s="Y.S." />
          <Text x={m} y={n * 9} s="C1" />
        </>
      );
    }
    case 'Kapi1': {
      const n = H / 10;
      const m = W / 28;
      const pos = p.system?.position ?? 20;
      const running = state === 1;
      const p1 = running && !!flags.p1;
      const p2 = running ? !!flags.p2 : false;
      const p3 = running && !!flags.p3;
      const c3 = p3 ? MG : K;
      const c2 = p2 ? MG : K;
      const c1 = p1 ? MG : K;
      const dot = p1 ? GR : K;
      const left = running ? (p2 ? -5 : 0) : -5;
      const right = p3 ? 5 : 0;
      const o: Pt = [m * 14, n * 8];
      const rotor: Pt = [o[0] + Math.cos(angle) * n, o[1] + Math.sin(angle) * n];
      const lm = m + m / 2;
      const rm = m * 26 + m / 2;
      return (
        <>
          <Rect x={0} y={0} w={Math.trunc(m) * 28} h={Math.trunc(n) * 10} c={COLORS.gray} dash="1 1" />
          <Rect x={pos} y={0} w={Math.trunc(m) * 13} h={Math.trunc(n) * 9} c={K} />
          <Circle o={o} r={n} c={c1} />
          <Line a={[m * 13, n * 8]} b={[m * 13, n * 10]} c={c1} />
          <Line a={[m * 14, n * 9]} b={[m * 14, n * 10]} c={c1} />
          <Line a={[m * 15, n * 8]} b={[m * 15, n * 10]} c={c1} />
          {state !== 0 && <Circle o={rotor} r={4} fill={dot} />}
          {/* Left limit switch (closed position) */}
          {[
            [m, n * 7],
            [m, n * 8],
            [lm, n * 7],
            [lm, n * 8],
          ].map(([x, y], i) => (
            <Circle key={`l${i}`} o={[x, y]} r={R} fill={c2} />
          ))}
          <Lines pts={[[0, n * 6.5], [m, n * 6.5], [m, n * 7]]} c={c2} />
          <Lines pts={[[0, n * 8.5], [m, n * 8.5], [m, n * 8]]} c={c2} />
          <Lines pts={[[0, n * 6], [lm, n * 6], [lm, n * 7]]} c={c2} />
          <Lines pts={[[0, n * 9], [lm, n * 9], [lm, n * 8]]} c={c2} />
          <Line a={[lm + left, n * 7]} b={[lm + left, n * 8]} c={c2} />
          <Line a={[lm + left, n * 7.5]} b={[m * 2 + m / 2 + left, n * 7.5]} c={c2} />
          {/* Right limit switch (open position) */}
          {[
            [m * 27, n * 7],
            [m * 27, n * 8],
            [rm, n * 7],
            [rm, n * 8],
          ].map(([x, y], i) => (
            <Circle key={`r${i}`} o={[x, y]} r={R} fill={c3} />
          ))}
          <Lines pts={[[m * 28, n * 6.5], [m * 27, n * 6.5], [m * 27, n * 7]]} c={c3} />
          <Lines pts={[[m * 28, n * 8.5], [m * 27, n * 8.5], [m * 27, n * 8]]} c={c3} />
          <Lines pts={[[m * 28, n * 6], [rm, n * 6], [rm, n * 7]]} c={c3} />
          <Lines pts={[[m * 28, n * 9], [rm, n * 9], [rm, n * 8]]} c={c3} />
          <Line a={[rm + right, n * 7]} b={[rm + right, n * 8]} c={c3} />
          <Line a={[rm + right, n * 7.5]} b={[m * 25 + m / 2 + right, n * 7.5]} c={c3} />
        </>
      );
    }
    case 'Kapi2': {
      const n = H / 10;
      const m = W / 10;
      const deg = p.system?.position ?? 0;
      const running = state === 1;
      const p1 = running && !!flags.p1;
      const p2 = running && !!flags.p2;
      const p3 = running && !!flags.p3;
      const c3 = p3 ? MG : K;
      const c2 = p2 ? MG : K;
      const c1 = p1 ? MG : K;
      const dot = p1 ? GR : K;
      const left = running ? (p2 ? -5 : 0) : -5;
      const top = p3 ? -5 : 0;
      const o: Pt = [m * 2, n * 2];
      const rotor: Pt = [o[0] + Math.cos(-angle) * n, o[1] + Math.sin(-angle) * n];
      const a = ((45 - deg) * Math.PI) / 180;
      const dx = 20 - 20 * Math.SQRT2 * Math.cos(a);
      const dy = 20 - 20 * Math.SQRT2 * Math.sin(a);
      return (
        <>
          <Rect x={0} y={0} w={Math.trunc(m) * 10} h={Math.trunc(n) * 10} c={COLORS.gray} dash="1 1" />
          <g transform={`translate(${dx} ${dy}) rotate(${-deg})`}>
            <Rect x={Math.trunc(m + m / 2)} y={Math.trunc(n) * 2} w={Math.trunc(m)} h={Math.trunc(n) * 8} c={K} />
          </g>
          <Circle o={o} r={n} fill={COLORS.white} />
          <Circle o={o} r={n} c={c1} />
          <Line a={[m, n * 2]} b={[m, 0]} c={c1} />
          <Line a={[m * 2, n]} b={[m * 2, 0]} c={c1} />
          <Line a={[m * 3, n * 2]} b={[m * 3, 0]} c={c1} />
          {state !== 0 && <Circle o={rotor} r={4} fill={dot} />}
          {[
            [m / 2, n * 8],
            [m / 2, n * 9],
            [m, n * 8],
            [m, n * 9],
          ].map(([x, y], i) => (
            <Circle key={`l${i}`} o={[x, y]} r={R} fill={c2} />
          ))}
          <Lines pts={[[0, n * 7.5], [m / 2, n * 7.5], [m / 2, n * 8]]} c={c2} />
          <Lines pts={[[0, n * 9.5], [m / 2, n * 9.5], [m / 2, n * 9]]} c={c2} />
          <Lines pts={[[0, n * 7], [m, n * 7], [m, n * 8]]} c={c2} />
          <Lines pts={[[0, n * 10], [m, n * 10], [m, n * 9]]} c={c2} />
          <Line a={[m + left, n * 8]} b={[m + left, n * 9]} c={c2} />
          <Line a={[m + left, n * 8.5]} b={[m * 2 + left, n * 8.5]} c={c2} />
          {[
            [m * 8, n / 2],
            [m * 9, n / 2],
            [m * 8, n],
            [m * 9, n],
          ].map(([x, y], i) => (
            <Circle key={`t${i}`} o={[x, y]} r={R} fill={c3} />
          ))}
          <Lines pts={[[m * 7, 0], [m * 7, n], [m * 8, n]]} c={c3} />
          <Lines pts={[[m * 10, 0], [m * 10, n], [m * 9, n]]} c={c3} />
          <Lines pts={[[m * 7.5, 0], [m * 7.5, n / 2], [m * 8, n / 2]]} c={c3} />
          <Lines pts={[[m * 9.5, 0], [m * 9.5, n / 2], [m * 9, n / 2]]} c={c3} />
          <Line a={[m * 8, n + top]} b={[m * 9, n + top]} c={c3} />
          <Line a={[m * 8.5, n + top]} b={[m * 8.5, n * 2 + top]} c={c3} />
        </>
      );
    }
    case 'Asansor': {
      const n = H / 24;
      const m = W / 6;
      const pos = p.system?.position ?? 205;
      const running = state === 1;
      const p1 = running && !!flags.p1;
      const c1 = p1 ? MG : K;
      const dot = p1 ? GR : K;
      const o: Pt = [m * 2, n * 2];
      const rotor: Pt = [o[0] + Math.cos(angle) * n, o[1] + Math.sin(angle) * n];
      // In design mode the original forces p6 (car at the bottom floor) on.
      const floorFlag = (i: number) => (running ? !!flags[`p${i + 2}`] : i === 4);
      return (
        <>
          <Rect x={0} y={0} w={Math.trunc(m) * 6} h={Math.trunc(n) * 24} c={COLORS.gray} dash="1 1" />
          <Rect x={m / 2} y={pos} w={Math.trunc(m) * 3} h={Math.trunc(n) * 3} c={K} />
          <Line a={[m * 2, n * 2]} b={[m * 2, pos]} c={K} dash="3 1" />
          <Circle o={o} r={n} c={c1} />
          <Line a={[m, n * 2]} b={[m, 0]} c={c1} />
          <Line a={[m * 2, n]} b={[m * 2, 0]} c={c1} />
          <Line a={[m * 3, n * 2]} b={[m * 3, 0]} c={c1} />
          {state !== 0 && <Circle o={rotor} r={4} fill={dot} />}
          {Array.from({ length: 5 }, (_, i) => {
            const on = floorFlag(i);
            const c = on && running ? MG : K;
            const shift = on ? 5 : 0;
            const y0 = Math.trunc(n) * 4 * (i + 1);
            const x5 = m * 5;
            const x55 = m * 5.5;
            return (
              <React.Fragment key={i}>
                {[
                  [x5, y0 + n * 1.5],
                  [x5, y0 + n * 2.5],
                  [x55, y0 + n * 1.5],
                  [x55, y0 + n * 2.5],
                ].map(([x, y], j) => (
                  <Circle key={j} o={[x, y]} r={R} fill={c} />
                ))}
                <Lines pts={[[x5, y0 + n * 1.5], [x5, y0 + n / 2], [m * 6, y0 + n / 2]]} c={c} />
                <Lines pts={[[x5, y0 + n * 2.5], [x5, y0 + n * 3.5], [m * 6, y0 + n * 3.5]]} c={c} />
                <Lines pts={[[x55, y0 + n * 1.5], [x55, y0 + n], [m * 6, y0 + n]]} c={c} />
                <Lines pts={[[x55, y0 + n * 2.5], [x55, y0 + n * 3], [m * 6, y0 + n * 3]]} c={c} />
                <Line a={[x5 + shift, y0 + n * 1.5]} b={[x5 + shift, y0 + n * 2.5]} c={c} />
                <Line a={[m * 3.5 + shift, y0 + n * 2]} b={[x5 + shift, y0 + n * 2]} c={c} />
              </React.Fragment>
            );
          })}
          <Rect x={0} y={n * 4} w={m * 4.5} h={n * 20} c={K} />
          {Array.from({ length: 4 }, (_, i) => (
            <Line key={i} a={[0, n * 4 * (i + 2)]} b={[m * 4.5, n * 4 * (i + 2)]} c={K} />
          ))}
        </>
      );
    }
  }
}

/**
 * One element, drawn at `location` (the element's top-left after rotation)
 * with the original's rotate-then-shift transform.
 */
export function ElementSymbol(props: SymbolProps & { location: { x: number; y: number }; rotation?: number }) {
  const rotation = ((props.rotation ?? 0) % 4 + 4) % 4;
  const shift = rotationShift(props.type, rotation);
  return (
    <g
      transform={`translate(${props.location.x + shift.x} ${props.location.y + shift.y}) rotate(${rotation * 90})`}
      strokeWidth={1}
      strokeLinecap="square"
    >
      {draw(props)}
    </g>
  );
}
