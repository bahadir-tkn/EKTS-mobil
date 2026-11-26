/**
 * Yardım > Yardım (F1): the original's help file (EKTS_tr.chm or
 * EKTS_en.chm, chosen by the HelpFile caption) as web pages, with its table
 * of contents. A first page, marked as the mobile version's own, says how
 * the desktop's mouse actions are done with a finger.
 */
import React, { useState } from 'react';
import TOC from './helpToc.json';
import { caption, type Lang } from './strings';

type Entry = { title: string; page: string | null; level: number };

const MOBILE_PAGE = '#mobile';

function MobileNotes({ lang }: { lang: Lang }) {
  const tr = lang === 'tr';
  const rows: [string, string][] = tr
    ? [
        ['Tıklamak', 'Dokunmak'],
        ['Çift tıklamak', 'İki kez hızlıca dokunmak'],
        ['Sağ tıklamak', 'Parmağı yarım saniye basılı tutmak'],
        ['Sürüklemek', 'Önce dokunarak seçmek, sonra sürüklemek (seçili olmayan yerde sürüklemek ekranı kaydırır)'],
        ['Fare tekerleği ile yakınlaştırmak', 'İki parmakla yakınlaştırıp uzaklaştırmak'],
        ['Devre çalışırken butonu sağ tıkla basılı bırakmak', 'Butona yarım saniye basılı tutmak'],
      ]
    : [
        ['Click', 'Tap'],
        ['Double click', 'Tap twice quickly'],
        ['Right click', 'Hold your finger for half a second'],
        ['Drag', 'Tap to select first, then drag (dragging elsewhere scrolls the drawing)'],
        ['Zoom with the mouse wheel', 'Pinch with two fingers'],
        ['Latch a button with a right click while running', 'Hold the button for half a second'],
      ];
  return (
    <div className="help-notes">
      <h2>{tr ? 'Mobil kullanım' : 'Using EKTS on a phone or tablet'}</h2>
      <p>
        {tr
          ? 'Bu yardım, masaüstü programın kendi yardım dosyasıdır. Orada anlatılan fare işlemleri telefonda ve tablette şöyle yapılır:'
          : "This help is the desktop program's own help file. The mouse actions it describes are done like this on a phone or tablet:"}
      </p>
      <table>
        <thead>
          <tr>
            <th>{tr ? 'Bilgisayarda' : 'On a computer'}</th>
            <th>{tr ? 'Telefonda / tablette' : 'On a phone / tablet'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {tr
          ? 'Geri Al ve Yinele (Düzenle menüsü, Ctrl+Z ve Ctrl+Y) yalnızca mobil sürümde vardır. Kurulum ve programı çalıştırma sayfaları masaüstü sürüm içindir; mobil sürüm tarayıcıdan açılır ve ana ekrana eklenebilir.'
          : 'Undo and Redo (Edit menu, Ctrl+Z and Ctrl+Y) exist only in the mobile version. The setup and starting pages are about the desktop version; the mobile version opens in the browser and can be added to the home screen.'}
      </p>
    </div>
  );
}

export function Help({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const file = caption('HelpFile', lang).includes('_tr') ? 'tr' : 'en';
  const entries: Entry[] = [{ title: lang === 'tr' ? 'Mobil kullanım' : 'Mobile use', page: MOBILE_PAGE, level: 0 }, ...(TOC as Record<string, Entry[]>)[file]];
  const [page, setPage] = useState<string | null>(null);
  const base = `${import.meta.env.BASE_URL}help/${file}/`;
  const contents = lang === 'tr' ? 'İçindekiler' : 'Contents';
  return (
    <div className="preview help" role="dialog" aria-label={caption('mnuHelpHelp', lang)}>
      <div className="preview-title">EKTS {caption('mnuHelpHelp', lang)}</div>
      <div className="preview-bar">
        {page && (
          <button type="button" className="btn" onClick={() => setPage(null)}>
            {contents}
          </button>
        )}
        <button type="button" className="btn" onClick={onClose}>
          {caption('close', lang)}
        </button>
      </div>
      {page === null ? (
        <div className="help-toc" role="tree">
          {entries.map((e, i) => (
            <button
              key={i}
              type="button"
              role="treeitem"
              className="list-item"
              style={{ paddingLeft: 12 + e.level * 18 }}
              disabled={!e.page}
              onClick={() => e.page && setPage(e.page)}
            >
              {e.title}
            </button>
          ))}
        </div>
      ) : page === MOBILE_PAGE ? (
        <div className="help-page">
          <MobileNotes lang={lang} />
        </div>
      ) : (
        <iframe className="help-frame" title={contents} src={base + page} />
      )}
    </div>
  );
}
