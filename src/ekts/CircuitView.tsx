/**
 * Read-only drawing of a circuit in the original EKTS model: elements, wires,
 * junction dots, name labels and description texts, at the original's pixel
 * coordinates on a white sheet.
 */
import React from 'react';
import type { EscCircuit } from '../esc/escFile';
import { ELEMENT_DEFS, rotatedSize } from './elements';
import { COLORS, ElementSymbol, FONT_FAMILY, LABEL_FONT_SIZE, ELEMENT_FONT_SIZE, type SystemState } from './Symbol';

export interface CircuitRuntime {
  /** Element state by element index. */
  elementStates?: number[];
  /** Rotor angle by element index. */
  angles?: number[];
  systems?: (SystemState | undefined)[];
  /** Energized wires by line index. */
  activeLines?: boolean[];
  /** Live counter text for time relays by element index. */
  label2Text?: (string | undefined)[];
}

/** Bounding box of everything drawn, used to fit the view. */
export function circuitBounds(c: EscCircuit) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const e of c.elements) {
    const s = rotatedSize(e.type, e.rotation);
    add(e.location.x, e.location.y);
    add(e.location.x + s.width, e.location.y + s.height);
    add(e.labelLocation.x, e.labelLocation.y);
    add(e.labelLocation.x + 20, e.labelLocation.y + 12);
  }
  for (const l of c.lines) {
    add(l.from.x, l.from.y);
    add(l.to.x, l.to.y);
  }
  for (const t of c.descriptionTexts) {
    add(t.location.x, t.location.y);
    add(t.location.x + t.size.width, t.location.y + t.size.height);
  }
  if (minX === Infinity) return { x: 0, y: 0, width: 100, height: 100 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function CircuitView({ circuit, runtime = {} }: { circuit: EscCircuit; runtime?: CircuitRuntime }) {
  return (
    <g>
      {circuit.lines.map((l, i) => (
        <line
          key={`l${i}`}
          x1={l.from.x + 0.5}
          y1={l.from.y + 0.5}
          x2={l.to.x + 0.5}
          y2={l.to.y + 0.5}
          stroke={runtime.activeLines?.[i] ? COLORS.violet : COLORS.black}
          strokeWidth={1}
          strokeLinecap="square"
        />
      ))}
      {circuit.dots.map((d, i) => (
        <circle key={`d${i}`} cx={d.location.x + 0.5} cy={d.location.y + 0.5} r={2} fill={COLORS.black} />
      ))}
      {circuit.elements.map((e, i) => (
        <g key={`e${i}`} transform="translate(0.5 0.5)">
          <ElementSymbol
            type={e.type}
            location={e.location}
            rotation={e.rotation}
            state={runtime.elementStates?.[i] ?? 0}
            angle={runtime.angles?.[i] ?? 0}
            color={e.color}
            system={runtime.systems?.[i]}
          />
        </g>
      ))}
      {circuit.elements.map((e, i) => (
        <React.Fragment key={`t${i}`}>
          <text
            x={e.labelLocation.x + 1}
            y={e.labelLocation.y + 1}
            fontSize={LABEL_FONT_SIZE}
            fontFamily={FONT_FAMILY}
            dominantBaseline="hanging"
            fill={COLORS.black}
          >
            {e.label}
          </text>
          {e.label2Visible && (
            <text
              x={e.label2Location.x + 1}
              y={e.label2Location.y + 1}
              fontSize={LABEL_FONT_SIZE}
              fontFamily={FONT_FAMILY}
              dominantBaseline="hanging"
              fill={COLORS.black}
            >
              {runtime.label2Text?.[i] ?? e.label2}
            </text>
          )}
        </React.Fragment>
      ))}
      {circuit.descriptionTexts.map((t, i) => (
        <foreignObject key={`d${i}`} x={t.location.x} y={t.location.y} width={t.size.width} height={t.size.height}>
          <div style={{ fontFamily: FONT_FAMILY, fontSize: ELEMENT_FONT_SIZE, whiteSpace: 'pre-wrap' }}>{t.text}</div>
        </foreignObject>
      ))}
    </g>
  );
}
