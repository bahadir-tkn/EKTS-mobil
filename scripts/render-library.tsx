// Dev tool: renders all 27 element symbols (idle and active) to one SVG sheet.
// Usage: npx tsx scripts/render-library.tsx <output.svg>
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import { ELEMENT_DEFS, LIBRARY_GROUPS } from '../src/ekts/elements';
import { ElementSymbol } from '../src/ekts/Symbol';
const items: React.ReactNode[] = [];
let y = 10;
for (const g of LIBRARY_GROUPS) {
  items.push(<text key={g.id} x={10} y={y + 14} fontSize={14} fontWeight="bold" fontFamily="Arial">{g.name.tr}</text>);
  y += 30;
  let x = 10;
  let rowH = 0;
  for (const t of g.types) {
    const d = ELEMENT_DEFS[t];
    const w = Math.max(d.size.width * 2 + 40, 150);
    if (x + w > 900) { x = 10; y += rowH + 40; rowH = 0; }
    const active = t === 'UcFazliMotor' || t === 'UcFazliMotor2' ? 2 : t.startsWith('BirFaz') ? 5 : t.startsWith('Kapi') || t === 'Asansor' ? 1 : 2;
    items.push(
      <g key={t}>
        <text x={x} y={y + 10} fontSize={10} fontFamily="Arial">{d.name.tr}</text>
        <ElementSymbol type={t} location={{ x, y: y + 18 }} state={0} />
        {!t.startsWith('Guc') && t !== 'UcFazGuc' && (
          <ElementSymbol type={t} location={{ x: x + d.size.width + 20, y: y + 18 }} state={active} angle={0.8}
            system={t === 'Kapi1' ? { position: 60, flags: { p1: true } } : t === 'Kapi2' ? { position: 40, flags: { p1: true } } : t === 'Asansor' ? { position: 120, flags: { p1: true } } : undefined} />
        )}
      </g>,
    );
    rowH = Math.max(rowH, d.size.height + 20);
    x += w + (d.size.width > 100 ? 0 : 10);
  }
  y += rowH + 40;
}
fs.writeFileSync(process.argv[2], renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" width={920} height={y}><rect width="100%" height="100%" fill="white" />{items}</svg>));
