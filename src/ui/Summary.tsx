/**
 * "Kullanılan Elemanları Listele": the used-elements table the original
 * painted on its drawing panel (frmMain.generateUsedElementsDataGrid,
 * addToSummary, paintSummary), with the same columns and measurements:
 * symbol, element type, quantity, and for every contactor or time relay its
 * name with the number of normally open and normally closed contacts.
 */
import React from 'react';
import { ELEMENT_DEFS, type ElementType } from '../ekts/elements';
import { DEFAULT_LAMP_COLOR, isContact, isRelay, type CircuitDocument } from '../ekts/document';
import { ElementSymbol } from '../ekts/Symbol';
import { caption, type Lang } from './strings';

const PAD = 3;
const FONT = 'Arial, Helvetica, sans-serif';
const FONT_SIZE = 13.33; // Arial 10 pt

interface Row {
  type: ElementType;
  name: string;
  count: number;
  relays: { label: string; no: number; nc: number }[];
}

export interface SummaryLayout {
  rows: Row[];
  cols: number[];
  width: number;
  height: number;
  header: string[];
  empty: string | null;
}

const ctrlSize = (t: ElementType) => ({ width: ELEMENT_DEFS[t].size.width + 1, height: ELEMENT_DEFS[t].size.height + 1 });

export function summaryLayout(doc: CircuitDocument, lang: Lang): SummaryLayout {
  const header = ['', caption('sumElType', lang), caption('sumQuantity', lang), caption('sumLabel', lang)];
  // initAlSumWidth
  const w = [
    header[0].length * 7,
    header[1].length * 7,
    header[2].length * 7,
    header[3].length * 7,
    ctrlSize('AcikKontak').width,
    ctrlSize('KapaliKontak').width,
  ];
  const rows: Row[] = [];
  for (const e of doc.elements) {
    if (isContact(e.type)) continue;
    let row = rows.find((r) => r.type === e.type);
    if (row) row.count++;
    else {
      row = { type: e.type, name: caption(e.type, lang), count: 1, relays: [] };
      rows.push(row);
      w[0] = Math.max(w[0], ctrlSize(e.type).width);
      w[1] = Math.max(w[1], row.name.length * 7);
      w[2] = Math.max(w[2], String(row.count).length * 10);
    }
    if (isRelay(e.type)) {
      const r = { label: e.label, no: 0, nc: 0 };
      for (const c of e.linked) {
        if (c.type === 'AcikKontak') r.no += 1;
        else if (c.type === 'KapaliKontak') r.nc += 1;
        else if (c.type === 'UcAcikKontak') r.no += 3;
        else if (c.type === 'UcKapaliKontak') r.nc += 3;
      }
      row.relays.push(r);
      w[3] = Math.max(w[3], r.label.length * 10);
      w[4] = Math.max(w[4], String(r.no).length * 10);
      w[5] = Math.max(w[5], String(r.nc).length * 10);
    }
  }
  if (rows.length === 0) return { rows, cols: [], width: 200, height: 50, header, empty: caption('sumNoSummary', lang) };
  const cols: number[] = [];
  cols[0] = w[0] + 2 * PAD;
  for (let i = 1; i < 6; i++) cols[i] = cols[i - 1] + w[i] + 2 * PAD;
  // Height, as paintSummary advances y.
  let y = PAD + ctrlSize('KapaliKontak').height + PAD;
  for (const r of rows) {
    y += PAD;
    const top = y;
    y += 14 * r.relays.length;
    y = Math.max(y, top + ctrlSize(r.type).height);
    y += PAD;
  }
  return { rows, cols, width: cols[5], height: y, header, empty: null };
}

const Txt = ({ x, y, s }: { x: number; y: number; s: string | number }) => (
  <text x={x} y={y + 2} fontFamily={FONT} fontSize={FONT_SIZE} dominantBaseline="hanging" fill="#000">
    {s}
  </text>
);

const Sym = ({ type, x, y }: { type: ElementType; x: number; y: number }) => (
  <g transform="translate(0.5 0.5)">
    <ElementSymbol type={type} location={{ x, y }} rotation={0} state={0} color={type === 'Lamba' ? DEFAULT_LAMP_COLOR : 0} />
  </g>
);

export function SummaryTable({ layout, x, y }: { layout: SummaryLayout; x: number; y: number }) {
  const { cols, width, height } = layout;
  if (layout.empty) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <rect x={0} y={0} width={width} height={height} fill="#fff" />
        <Txt x={20} y={10} s={layout.empty} />
        <rect x={0.5} y={0.5} width={width - 1} height={height - 1} fill="none" stroke="#000" />
      </g>
    );
  }
  const headH = ctrlSize('KapaliKontak').height;
  const parts: React.ReactNode[] = [];
  let yy = PAD;
  parts.push(<rect key="hb" x={0} y={0} width={width} height={headH + PAD * 2} fill="gainsboro" />);
  parts.push(<Txt key="h1" x={cols[0] + PAD} y={yy} s={layout.header[1]} />);
  parts.push(<Txt key="h2" x={cols[1] + PAD} y={yy} s={layout.header[2]} />);
  parts.push(<Txt key="h3" x={cols[2] + PAD} y={yy} s={layout.header[3]} />);
  parts.push(<Sym key="h4" type="AcikKontak" x={cols[3] + PAD} y={yy} />);
  parts.push(<Sym key="h5" type="KapaliKontak" x={cols[4] + PAD} y={yy} />);
  yy = yy + headH + PAD;
  const hlines: number[] = [yy];
  layout.rows.forEach((r, i) => {
    yy += PAD;
    const top = yy;
    parts.push(<Sym key={`s${i}`} type={r.type} x={PAD} y={top} />);
    parts.push(<Txt key={`n${i}`} x={cols[0] + PAD} y={top} s={r.name} />);
    parts.push(<Txt key={`c${i}`} x={cols[1] + PAD} y={top} s={r.count} />);
    r.relays.forEach((rl, j) => {
      parts.push(<Txt key={`l${i}-${j}`} x={cols[2] + PAD} y={yy} s={rl.label} />);
      parts.push(<Txt key={`a${i}-${j}`} x={cols[3] + PAD} y={yy} s={rl.no} />);
      parts.push(<Txt key={`k${i}-${j}`} x={cols[4] + PAD} y={yy} s={rl.nc} />);
      yy += 14;
    });
    yy = Math.max(yy, top + ctrlSize(r.type).height);
    yy += PAD;
    hlines.push(yy);
  });
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {parts}
      {hlines.map((h, i) => (
        <line key={`hl${i}`} x1={0} y1={h + 0.5} x2={width} y2={h + 0.5} stroke="gray" />
      ))}
      {cols.slice(0, 5).map((c, i) => (
        <line key={`vl${i}`} x1={c + 0.5} y1={0} x2={c + 0.5} y2={height} stroke="gray" />
      ))}
      <rect x={0.5} y={0.5} width={width - 1} height={height - 1} fill="none" stroke="#000" />
    </g>
  );
}
