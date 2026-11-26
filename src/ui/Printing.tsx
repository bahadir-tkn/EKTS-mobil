/**
 * Printing as the original does it (printDocument1_BeginPrint/PrintPage):
 * the circuit is painted once as a picture, then cut into pages the size of
 * the paper's margin bounds (margins 20/100 inch), one drawing pixel per
 * 1/100 inch, columns first, then rows. "Sayfa sınırları" draws the same
 * page edges on the drawing as blue dashed lines.
 */
import React, { useEffect, useState } from 'react';
import type { CircuitDocument } from '../ekts/document';
import { rasterize } from './exportImage';
import { caption, type Lang } from './strings';

/** Paper sizes in 1/100 inch, as .NET PaperSize reports them. */
export const PAPERS = {
  A4: { width: 827, height: 1169 },
  A3: { width: 1169, height: 1654 },
  A5: { width: 583, height: 827 },
  Letter: { width: 850, height: 1100 },
  Legal: { width: 850, height: 1400 },
} as const;
export type PaperName = keyof typeof PAPERS;

export interface PageSettings {
  paper: PaperName;
  landscape: boolean;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = { paper: 'A4', landscape: false };
const MARGIN = 20;
const SETTINGS_KEY = 'ekts-mobil:page-settings';

export function loadPageSettings(): PageSettings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (s && s.paper in PAPERS) return { paper: s.paper, landscape: !!s.landscape };
  } catch {
    /* defaults */
  }
  return DEFAULT_PAGE_SETTINGS;
}

export function savePageSettings(s: PageSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* not kept */
  }
}

export function paperSize(s: PageSettings) {
  const p = PAPERS[s.paper];
  return s.landscape ? { width: p.height, height: p.width } : { width: p.width, height: p.height };
}

/** e.MarginBounds: the printable part of the page. */
export function marginBounds(s: PageSettings) {
  const p = paperSize(s);
  return { width: p.width - 2 * MARGIN, height: p.height - 2 * MARGIN };
}

/** Page rectangles in picture pixels, in printing order. */
export function pageTiles(imageWidth: number, imageHeight: number, s: PageSettings) {
  const mb = marginBounds(s);
  const cols = Math.floor(imageWidth / mb.width) + 1;
  const rows = Math.floor(imageHeight / mb.height) + 1;
  const tiles: { x: number; y: number; width: number; height: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push({ x: c * mb.width, y: r * mb.height, ...mb });
  return tiles;
}

/** Page images (data URLs), each the margin bounds of one page. */
async function renderPages(doc: CircuitDocument, lang: Lang, s: PageSettings) {
  // The picture starts at the drawing's origin (or further up and left when
  // something was dragged there), like the panel's display rectangle.
  // Off React's render pass, so the picture's own render can flush.
  await new Promise((r) => setTimeout(r, 0));
  const { canvas } = await rasterize(doc, lang);
  return pageTiles(canvas.width, canvas.height, s).map((t) => {
    const page = document.createElement('canvas');
    page.width = t.width;
    page.height = t.height;
    const ctx = page.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, t.width, t.height);
    ctx.drawImage(canvas, -t.x, -t.y);
    return page.toDataURL('image/png');
  });
}

/** Hands the pages to the system print dialog. */
function printPages(pages: string[], s: PageSettings) {
  const p = paperSize(s);
  const mb = marginBounds(s);
  const root = document.createElement('div');
  root.id = 'print-root';
  for (const src of pages) {
    const page = document.createElement('div');
    page.className = 'print-page';
    page.style.width = `${p.width / 100}in`;
    page.style.height = `${p.height / 100}in`;
    page.style.padding = `${MARGIN / 100}in`;
    const img = document.createElement('img');
    img.src = src;
    img.style.width = `${mb.width / 100}in`;
    img.style.height = `${mb.height / 100}in`;
    page.appendChild(img);
    root.appendChild(page);
  }
  const style = document.createElement('style');
  style.textContent = `@page { size: ${p.width / 100}in ${p.height / 100}in; margin: 0; }`;
  document.head.appendChild(style);
  document.body.appendChild(root);
  document.body.classList.add('printing');
  const done = () => {
    window.removeEventListener('afterprint', done);
    document.body.classList.remove('printing');
    root.remove();
    style.remove();
  };
  window.addEventListener('afterprint', done);
  // Let the images decode before the dialog takes its snapshot.
  Promise.all([...root.querySelectorAll('img')].map((i) => i.decode().catch(() => undefined))).then(() => {
    window.print();
    // Some mobile browsers never send afterprint.
    setTimeout(() => {
      if (document.body.classList.contains('printing')) done();
    }, 60_000);
  });
}

/** printPreviewDialog1: the pages as they will come out of the printer. */
export function PrintPreview({
  doc,
  lang,
  settings,
  onSettings,
  onClose,
}: {
  doc: CircuitDocument;
  lang: Lang;
  settings: PageSettings;
  onSettings: () => void;
  onClose: () => void;
}) {
  const t = (k: string) => caption(k, lang);
  const [pages, setPages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setPages(null);
    renderPages(doc, lang, settings)
      .then((p) => live && setPages(p))
      .catch((e) => live && setError(String((e as Error).message)));
    return () => {
      live = false;
    };
  }, [doc, lang, settings]);
  const p = paperSize(settings);
  return (
    <div className="preview" role="dialog" aria-label={t('mnuFilePrintPrev')}>
      <div className="preview-title">{t('mnuFilePrintPrev')}</div>
      <div className="preview-bar">
        <button type="button" className="btn primary" disabled={!pages} onClick={() => pages && printPages(pages, settings)}>
          {t('tbBtnPrint')}
        </button>
        <button type="button" className="btn" onClick={onSettings}>
          {t('mnuFilePrintSet')}
        </button>
        <span className="preview-info">
          {pages ? `${pages.length} ${t('pages')} · ${settings.paper} ${settings.landscape ? t('landscape') : t('portrait')}` : '…'}
        </span>
        <button type="button" className="btn" onClick={onClose}>
          {t('close')}
        </button>
      </div>
      <div className="preview-pages">
        {error && <div className="dialog-text pad">{error}</div>}
        {pages?.map((src, i) => (
          <div key={i} className="preview-page" style={{ aspectRatio: `${p.width} / ${p.height}`, padding: `${(MARGIN / p.width) * 100}%` }}>
            <img src={src} alt={`${i + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** printDialog1 for paper and orientation, the two settings the pages depend on. */
export function PageSetupDialog({
  lang,
  settings,
  onOk,
  onCancel,
}: {
  lang: Lang;
  settings: PageSettings;
  onOk: (s: PageSettings) => void;
  onCancel: () => void;
}) {
  const t = (k: string) => caption(k, lang);
  const [s, setS] = useState(settings);
  return (
    <div className="modal-backdrop" style={{ zIndex: 70 }}>
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onOk(s);
        }}
      >
        <div className="dialog-title">{t('mnuFilePrintSet')}</div>
        <label className="dialog-field">
          <span>{t('paper')}</span>
          <select value={s.paper} onChange={(e) => setS({ ...s, paper: e.target.value as PaperName })}>
            {Object.keys(PAPERS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>{t('orientation')}</span>
          <select value={s.landscape ? '1' : '0'} onChange={(e) => setS({ ...s, landscape: e.target.value === '1' })}>
            <option value="0">{t('portrait')}</option>
            <option value="1">{t('landscape')}</option>
          </select>
        </label>
        <div className="dialog-text pad">{t('printHint')}</div>
        <div className="dialog-buttons">
          <button type="submit" className="btn primary">
            {t('ok')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

/** pnlMain_Paint with "Sayfa sınırları": blue dashed page edges over the drawing. */
export function PageLimits({ settings, width, height }: { settings: PageSettings; width: number; height: number }) {
  const mb = marginBounds(settings);
  const rows = Math.floor(height / mb.height);
  const cols = Math.floor(width / mb.width);
  const out: React.ReactNode[] = [];
  for (let i = 1; i <= rows; i++)
    out.push(<line key={`r${i}`} x1={0} y1={i * mb.height + 0.5} x2={width} y2={i * mb.height + 0.5} stroke="#0000FF" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />);
  for (let i = 1; i <= cols; i++)
    out.push(<line key={`c${i}`} x1={i * mb.width + 0.5} y1={0} x2={i * mb.width + 0.5} y2={height} stroke="#0000FF" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />);
  return <g>{out}</g>;
}
