/**
 * The drawing panel's content: wires, junction dots, elements, their name
 * labels and description texts, drawn from the editable document with the
 * original's colors (black, violet for live wires, red for selected wires,
 * light gray behind selected elements, red/yellow for faults).
 */
import React, { memo } from 'react';
import type { CircuitDocument, DElement, DLine, DDot, Pt } from '../ekts/document';
import type { SimSnapshot } from '../ekts/simulator';
import { SummaryTable, type SummaryLayout } from './Summary';
import { COLORS, ElementSymbol, FONT_FAMILY, LABEL_FONT_SIZE, ELEMENT_FONT_SIZE, type SystemState } from '../ekts/Symbol';

const SELECTED_BG = 'rgb(220,220,220)';
const RED = '#FF0000';
const YELLOW = '#FFFF00';
const BLUE = '#0000FF';

export interface WireDraft {
  from: Pt;
  to: Pt;
  target: Pt | null;
}

export interface DrawingProps {
  doc: CircuitDocument;
  version: number;
  snapshot: SimSnapshot | null;
  /** Elements and wires of a fault, blinking while its message is shown. */
  alert: { elements: Set<number>; lines: Set<number>; phase: boolean } | null;
  wire: WireDraft | null;
  /** Free pin under the finger before a wire starts (the red hover dot). */
  hoverPin: Pt | null;
  /** The used-elements list, when shown (drawn above the circuit, like pnlSummary). */
  summary: SummaryLayout | null;
  /**
   * paintCircuit for "save as image" and printing: black wires, no selection,
   * description texts as wrapped SVG text instead of an HTML box.
   */
  plain?: boolean;
  /** Line breaking for plain description texts (needs text measuring). */
  wrapText?: (text: string, width: number) => string[];
}

/** Approximate box of a 9 px label, for drawing its selection background and for touch. */
export function labelBox(text: string, at: Pt) {
  return { x: at.x, y: at.y, width: Math.max(11, text.length * 5 + 3), height: 11 };
}

const ElementView = memo(function ElementView({
  type,
  x,
  y,
  rotation,
  state,
  angle,
  color,
  system,
  bg,
  w,
  h,
}: {
  type: DElement['type'];
  x: number;
  y: number;
  rotation: number;
  state: number;
  angle: number;
  color: number;
  system?: SystemState;
  bg: string | null;
  w: number;
  h: number;
}) {
  return (
    <g transform="translate(0.5 0.5)">
      {bg && <rect x={x - 0.5} y={y - 0.5} width={w} height={h} fill={bg} />}
      <ElementSymbol type={type} location={{ x, y }} rotation={rotation} state={state} angle={angle} color={color} system={system} />
    </g>
  );
});

const Label = memo(function Label({ text, x, y, bg }: { text: string; x: number; y: number; bg: string | null }) {
  const b = labelBox(text, { x, y });
  return (
    <>
      {bg && <rect x={b.x} y={b.y} width={b.width} height={b.height} fill={bg} />}
      <text x={x + 1} y={y + 1} fontSize={LABEL_FONT_SIZE} fontFamily={FONT_FAMILY} dominantBaseline="hanging" fill={COLORS.black}>
        {text}
      </text>
    </>
  );
});

function lineColor(l: DLine, i: number, p: DrawingProps) {
  if (p.plain) return COLORS.black;
  if (p.alert?.lines.has(i)) return p.alert.phase ? RED : YELLOW;
  if (p.snapshot?.activeLines[i]) return COLORS.violet;
  if (l.selected) return RED;
  return COLORS.black;
}

export function Drawing(p: DrawingProps) {
  const { doc, snapshot } = p;
  return (
    <g>
      {doc.lines.map((l, i) => (
        <line
          key={`l${i}`}
          x1={l.cp1.p.x + 0.5}
          y1={l.cp1.p.y + 0.5}
          x2={l.cp2.p.x + 0.5}
          y2={l.cp2.p.y + 0.5}
          stroke={lineColor(l, i, p)}
          strokeWidth={1}
          strokeLinecap="square"
        />
      ))}
      {doc.dots.map((d: DDot, i) => (
        <circle
          key={`d${i}`}
          cx={d.origin.x + 0.5}
          cy={d.origin.y + 0.5}
          r={d.selected && !p.plain ? 3.5 : 2}
          fill={d.selected && !p.plain ? RED : COLORS.black}
        />
      ))}
      {doc.elements.map((e, i) => {
        const s = e.size;
        const alerted = p.alert?.elements.has(i);
        const bg = p.plain ? null : alerted ? (p.alert!.phase ? RED : YELLOW) : e.selected ? SELECTED_BG : null;
        return (
          <ElementView
            key={`e${i}`}
            type={e.type}
            x={e.location.x}
            y={e.location.y}
            rotation={e.rotation}
            state={snapshot ? snapshot.elementStates[i] : 0}
            angle={snapshot ? snapshot.angles[i] : 0}
            color={e.color}
            system={snapshot?.systems[i]}
            bg={bg}
            w={s.width}
            h={s.height}
          />
        );
      })}
      {doc.elements.map((e, i) => (
        <React.Fragment key={`t${i}`}>
          <Label text={e.label} x={e.labelLocation.x} y={e.labelLocation.y} bg={e.selected && !p.plain ? SELECTED_BG : null} />
          {e.label2Enabled && (
            <Label
              text={snapshot?.label2Text[i] ?? e.label2}
              x={e.label2Location.x}
              y={e.label2Location.y}
              bg={e.selected && !p.plain ? SELECTED_BG : null}
            />
          )}
        </React.Fragment>
      ))}
      {doc.texts.map((t, i) => {
        const w = t.size.width || 100;
        const h = t.size.height || 23;
        if (p.plain) {
          const lines = p.wrapText ? p.wrapText(t.text, w) : t.text.split('\n');
          return (
            <g key={`x${i}`}>
              <clipPath id={`xc${i}`}>
                <rect x={t.location.x} y={t.location.y} width={w} height={h} />
              </clipPath>
              <text clipPath={`url(#xc${i})`} fontFamily={FONT_FAMILY} fontSize={ELEMENT_FONT_SIZE} fill="#000" dominantBaseline="hanging">
                {lines.map((ln, j) => (
                  <tspan key={j} x={t.location.x + 2} y={t.location.y + 1 + j * 13}>
                    {ln}
                  </tspan>
                ))}
              </text>
            </g>
          );
        }
        return (
          <g key={`x${i}`}>
            {t.selected && <rect x={t.location.x} y={t.location.y} width={w} height={h} fill="rgb(255,255,192)" />}
            <foreignObject x={t.location.x} y={t.location.y} width={w} height={h}>
              <div
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: ELEMENT_FONT_SIZE,
                  lineHeight: '13px',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  overflow: 'hidden',
                  width: w,
                  height: h,
                  color: '#000',
                }}
              >
                {t.text}
              </div>
            </foreignObject>
            {t.selected && (
              <>
                <rect x={t.location.x + 0.5} y={t.location.y + 0.5} width={w - 1} height={h - 1} fill="none" stroke="#000" strokeWidth={1} />
                <rect x={t.location.x + w - 6} y={t.location.y + h - 6} width={6} height={6} fill="#000" />
              </>
            )}
          </g>
        );
      })}
      {p.summary && doc.summary && <SummaryTable layout={p.summary} x={doc.summary.location.x} y={doc.summary.location.y} />}
      {p.hoverPin && <circle cx={p.hoverPin.x + 0.5} cy={p.hoverPin.y + 0.5} r={4} fill={RED} />}
      {p.wire && (
        <>
          <line
            x1={p.wire.from.x + 0.5}
            y1={p.wire.from.y + 0.5}
            x2={p.wire.to.x + 0.5}
            y2={p.wire.to.y + 0.5}
            stroke={COLORS.black}
            strokeWidth={1}
          />
          <circle cx={p.wire.from.x + 0.5} cy={p.wire.from.y + 0.5} r={4} fill={RED} />
          {p.wire.target && <circle cx={p.wire.target.x + 0.5} cy={p.wire.target.y + 0.5} r={4} fill={BLUE} />}
        </>
      )}
    </g>
  );
}
