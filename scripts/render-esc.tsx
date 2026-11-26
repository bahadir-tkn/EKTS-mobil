// Dev tool: renders every .esc fixture to SVG for visual comparison with the original.
// Usage: npx tsx scripts/render-esc.tsx <output-dir>
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import { parseEscFile } from '../src/esc/escFile.ts';
import { CircuitView, circuitBounds } from '../src/ekts/CircuitView.tsx';
const out = process.argv[2];
for (const f of fs.readdirSync('src/esc/fixtures')) {
  const c = parseEscFile(fs.readFileSync('src/esc/fixtures/' + f));
  const b = circuitBounds(c);
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" width={b.x + b.width + 20} height={b.y + b.height + 20} style={{ background: 'white' }}>
      <rect width="100%" height="100%" fill="white" />
      <CircuitView circuit={c} />
    </svg>,
  );
  fs.writeFileSync(`${out}/${f.replace(/\.esc$/, '').replace(' ', '_')}.svg`, svg);
}
