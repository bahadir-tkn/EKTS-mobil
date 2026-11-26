/**
 * EKTS Mobil main window: menu bar, toolbar, drawing panel, library window
 * and status bar, laid out like the desktop program on a phone screen.
 */
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CircuitDocument, DElement, LAMP_COLORS, isContact, isTimer, type DText } from './ekts/document';
import { Simulator, SIM_MESSAGES, type SimError, type SimSnapshot } from './ekts/simulator';
import { parseEscFile, EscFormatError, type EscCircuit } from './esc/escFile';
import { writeEscFile } from './esc/escWriter';
import type { ElementType } from './ekts/elements';
import { Canvas, type CanvasHandle } from './ui/Canvas';
import { MenuBar, StatusBar, Toolbar, type Menu, type MenuItem } from './ui/Chrome';
import { ChoiceDialog, ContextMenu, MessageBox, PromptDialog } from './ui/Dialogs';
import { Library } from './ui/Library';
import { Help } from './ui/Help';
import { Splash } from './ui/Splash';
import { loadPageSettings, PageSetupDialog, PrintPreview, savePageSettings, type PageSettings } from './ui/Printing';
import { exportImage, IMAGE_FORMATS, type ImageFormat } from './ui/exportImage';
import { caption, LANGS, type Lang } from './ui/strings';
import { EXAMPLES } from './ui/examples';
import { History } from './ui/history';
import * as Icons from './ui/icons';

const AUTOSAVE_KEY = 'ekts-mobil:autosave:v2';
const LANG_KEY = 'ekts-mobil:lang';

type Dialog =
  | { kind: 'message'; title: string; text: string; icon?: 'error' | 'question' | 'info'; buttons: { label: string; onClick: () => void; primary?: boolean }[] }
  | {
      kind: 'prompt';
      title: string;
      label: string;
      initial: string;
      numeric?: boolean;
      multiline?: boolean;
      types?: { label: string; options: string[] };
      onOk: (v: string, type: number) => void;
    }
  | { kind: 'choice'; title: string; options: string[]; current: string; onPick: (v: string) => void }
  | { kind: 'context'; x: number; y: number; items: MenuItem[] };

function loadAutosave(): { doc: CircuitDocument; name: string | null } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { name: string | null; circuit: EscCircuit; changed?: boolean };
    const doc = CircuitDocument.fromCircuit(data.circuit);
    doc.changed = !!data.changed;
    return { doc, name: data.name };
  } catch {
    return null;
  }
}

function download(bytes: Uint8Array | Blob, name: string, type: string) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  // iLng, kept between sessions like escs.cfg; Turkish until another is picked.
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem(LANG_KEY) as Lang | null;
      if (v && (LANGS as readonly string[]).includes(v)) return v;
    } catch {
      /* default */
    }
    return 'tr';
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* not kept */
    }
  };
  const t = useCallback((k: string) => caption(k, lang), [lang]);
  const initial = useRef(loadAutosave());
  const [doc, setDoc] = useState<CircuitDocument>(() => initial.current?.doc ?? new CircuitDocument());
  const [fileName, setFileName] = useState<string | null>(() => initial.current?.name ?? null);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [mode, setMode] = useState<'edit' | 'run'>('edit');
  const [snapshot, setSnapshot] = useState<SimSnapshot | null>(null);
  const [simError, setSimError] = useState<SimError | null>(null);
  const [blink, setBlink] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pageSettings, setPageSettings] = useState<PageSettings>(loadPageSettings);
  const [showLimits, setShowLimits] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pageSetup, setPageSetup] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // frmScreen shows while the program starts, until it is tapped.
  const [splash, setSplash] = useState(true);
  /** mnuFilePrintPrev_Click: deselect, then show the preview. */
  const openPreview = () => {
    doc.deselect(null);
    bump();
    setPreview(true);
  };
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvas = useRef<CanvasHandle>(null);
  const sim = useRef<Simulator | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const history = useRef(new History());
  /** An edit finished: record it as an undo step and redraw. */
  const changed = () => {
    history.current.commit(doc);
    bump();
  };
  const undo = () => {
    history.current.undo(doc);
    bump();
  };
  const redo = () => {
    history.current.redo(doc);
    bump();
  };

  // Editing messages (MessageBox in the original).
  useEffect(() => {
    doc.onMessage = (key) =>
      setDialog({ kind: 'message', title: 'EKTS', text: t(key), icon: 'error', buttons: [{ label: t('ok'), primary: true, onClick: () => setDialog(null) }] });
  }, [doc, t]);

  // Keep the last state on the device so closing the app loses nothing.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ name: fileName, circuit: doc.toCircuit(), changed: doc.changed }));
      } catch {
        /* storage full or unavailable */
      }
    }, 400);
    return () => window.clearTimeout(id);
  });

  useEffect(() => {
    history.current.reset(doc);
    bump();
    requestAnimationFrame(() => canvas.current?.fit());
  }, [doc]);

  // ---- files ---------------------------------------------------------------------

  const displayName = fileName ?? t('frmMainText');
  const title = `EKTS - ${displayName}${doc.changed ? '*' : ''}`;

  const replaceDoc = (d: CircuitDocument, name: string | null) => {
    setDoc(d);
    setFileName(name);
    setLibraryOpen(false);
  };

  const saveAs = (name?: string) => {
    const base = (name ?? fileName ?? t('frmMainText')).replace(/\.esc$/i, '');
    try {
      download(writeEscFile(doc.toCircuit()), `${base}.esc`, 'application/octet-stream');
      setFileName(`${base}.esc`);
      doc.changed = false;
      changed();
      return true;
    } catch (e) {
      setDialog({ kind: 'message', title: 'EKTS', text: String((e as Error).message), icon: 'error', buttons: [{ label: t('ok'), primary: true, onClick: () => setDialog(null) }] });
      return false;
    }
  };

  /** pnlMain_SaveImage: the picture is written, the circuit's own file name stays. */
  const saveImage = (name: string, format: ImageFormat) => {
    const base = name.replace(/\.(esc|bmp|gif|jpe?g|png)$/i, '');
    exportImage(doc, lang, format)
      .then((blob) => download(blob, `${base}.${format}`, blob.type))
      .catch((e) =>
        setDialog({ kind: 'message', title: 'EKTS', text: String((e as Error).message), icon: 'error', buttons: [{ label: t('ok'), primary: true, onClick: () => setDialog(null) }] }),
      );
  };

  /** pnlMain_New's question before throwing the current circuit away. */
  const confirmDiscard = (then: () => void) => {
    if (!doc.changed) {
      then();
      return;
    }
    setDialog({
      kind: 'message',
      title: 'EKTS',
      icon: 'question',
      text: `${t('alertSaveChanges')}${displayName}?`,
      buttons: [
        {
          label: t('yes'),
          primary: true,
          onClick: () => {
            setDialog(null);
            if (saveAs()) then();
          },
        },
        {
          label: t('no'),
          onClick: () => {
            setDialog(null);
            then();
          },
        },
        { label: t('cancel'), onClick: () => setDialog(null) },
      ],
    });
  };

  const openBytes = (buf: ArrayBuffer, name: string) => {
    try {
      const d = CircuitDocument.fromCircuit(parseEscFile(buf));
      replaceDoc(d, name);
    } catch (e) {
      const text = e instanceof EscFormatError ? `${t('alertError12')}\n${e.message}` : t('alertError12');
      setDialog({ kind: 'message', title: 'EKTS', text, icon: 'error', buttons: [{ label: t('ok'), primary: true, onClick: () => setDialog(null) }] });
    }
  };

  const newFile = () => confirmDiscard(() => replaceDoc(new CircuitDocument(), null));
  const openFile = () => confirmDiscard(() => fileInput.current?.click());
  const openExample = (ex: (typeof EXAMPLES)[number]) =>
    confirmDiscard(async () => {
      const res = await fetch(ex.url);
      openBytes(await res.arrayBuffer(), ex.name);
    });

  // ---- editing --------------------------------------------------------------------

  const addElement = (type: ElementType) => {
    doc.deselect(null);
    const el = doc.addElement(type, canvas.current?.viewOrigin() ?? { x: 0, y: 0 });
    doc.deselect(el);
    changed();
  };

  const summaryShown = !!doc.summary?.visible;
  const toggleSummary = () => {
    if (running) return;
    doc.showSummary(!summaryShown, canvas.current?.viewOrigin() ?? { x: 0, y: 0 });
    changed();
  };

  const deleteSelection = () => {
    doc.deleteSelected();
    changed();
  };

  const editLabel = (el: DElement, which: 1 | 2) => {
    if (which === 2) {
      if (!isTimer(el.type)) return;
      setDialog({
        kind: 'prompt',
        title: caption(el.type, lang),
        label: t('delay'),
        initial: el.label2,
        numeric: true,
        onOk: (v) => {
          setDialog(null);
          doc.setDelay(el, v);
          changed();
        },
      });
      return;
    }
    if (isContact(el.type)) {
      const options = doc.relayNames();
      setDialog({
        kind: 'choice',
        title: t('relayPick'),
        options,
        current: el.label,
        onPick: (v) => {
          setDialog(null);
          doc.setContactRelay(el, v);
          changed();
        },
      });
      return;
    }
    setDialog({
      kind: 'prompt',
      title: caption(el.type, lang),
      label: t('name'),
      initial: el.label,
      onOk: (v) => {
        setDialog(null);
        doc.setLabel(el, v);
        changed();
      },
    });
  };

  const editText = (tx: DText) =>
    setDialog({
      kind: 'prompt',
      title: t('cmtEdit'),
      label: '',
      initial: tx.text,
      multiline: true,
      onOk: (v) => {
        setDialog(null);
        doc.setText(tx, v, t('tbText'));
        changed();
      },
    });

  const textMenu = (tx: DText, x: number, y: number) =>
    setDialog({
      kind: 'context',
      x,
      y,
      items: [
        { label: t('cmtEdit'), onClick: () => editText(tx) },
        {
          label: t('cmtRemove'),
          onClick: () => {
            doc.removeText(tx);
            changed();
          },
        },
      ],
    });

  const addText = () => {
    const tx = doc.addText(t('tbText'), canvas.current?.viewOrigin() ?? { x: 0, y: 0 });
    doc.selectText(tx);
    changed();
  };

  const contextMenu = (el: DElement, x: number, y: number) => {
    const items: MenuItem[] = [
      {
        label: t('cmRotate'),
        submenu: [1, 2, 3].map((q) => ({
          label: String(q * 90),
          onClick: () => {
            doc.rotate(el, q);
            changed();
          },
        })),
      },
    ];
    if (el.type === 'Lamba') {
      const names = ['cmcRed', 'cmcBlue', 'cmcGreen', 'cmcMagenta', 'cmcYellow'];
      items.push({
        label: t('cmColor'),
        submenu: LAMP_COLORS.map((c, i) => ({
          label: t(names[i]),
          checked: el.color === c,
          onClick: () => {
            doc.setColor(el, c);
            changed();
          },
        })),
      });
    }
    items.push('sep', { label: t('rename'), onClick: () => editLabel(el, 1) });
    if (isTimer(el.type)) items.push({ label: t('delay'), onClick: () => editLabel(el, 2) });
    items.push({
      label: t('mnuEditDelete'),
      onClick: () => {
        doc.deselect(el);
        deleteSelection();
      },
    });
    setDialog({ kind: 'context', x, y, items });
  };

  // ---- running ---------------------------------------------------------------------

  // Keep the screen on while the circuit runs, so a timer or a motor being
  // watched does not dim away (mobile addition; re-taken when the page returns).
  useEffect(() => {
    if (mode !== 'run' || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let live = true;
    const take = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (live) lock = l;
          else l.release().catch(() => {});
        })
        .catch(() => {});
    };
    take();
    document.addEventListener('visibilitychange', take);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', take);
      lock?.release().catch(() => {});
    };
  }, [mode]);

  const stopRun = useCallback(() => {
    sim.current?.stop();
    sim.current = null;
    setSnapshot(null);
    setMode('edit');
  }, []);

  const showSimError = (s: Simulator) => {
    if (!s.error) return false;
    setSimError(s.error);
    return true;
  };

  const startRun = () => {
    doc.deselect(null);
    setLibraryOpen(false);
    const s = new Simulator(doc.toCircuit());
    sim.current = s;
    s.subscribe(() => {
      setSnapshot(s.snapshot());
      if (!s.running && s.error) showSimError(s);
    });
    s.start();
    if (showSimError(s)) {
      setSnapshot(s.snapshot());
      return;
    }
    setSnapshot(s.snapshot());
    setMode('run');
    changed();
  };

  // Simulated time follows the clock while running.
  useEffect(() => {
    if (mode !== 'run') return;
    let last = performance.now();
    let id = 0;
    const frame = (now: number) => {
      sim.current?.advance(Math.min(250, now - last));
      last = now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [mode]);

  // Faulty parts blink red and yellow while the message is up (alertTimer).
  useEffect(() => {
    if (!simError) return;
    const id = window.setInterval(() => setBlink((b) => !b), 300);
    return () => window.clearInterval(id);
  }, [simError]);

  const closeSimError = () => {
    setSimError(null);
    sim.current = null;
    setSnapshot(null);
    setMode('edit');
  };

  // ---- keyboard (desktop browsers) ---------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialog || mode !== 'edit') return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete') deleteSelection();
      else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        doc.selectAll();
        changed();
      } else if (mod && e.key.toLowerCase() === 'd') {
        // The original's menu shortcuts (Ctrl+N, O, S, P, D, L and F1).
        e.preventDefault();
        doc.deselect(null);
        bump();
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        newFile();
      } else if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openFile();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAs();
      } else if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        openPreview();
      } else if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLibraryOpen((v) => !v);
      } else if (e.key === 'F1') {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---- chrome ------------------------------------------------------------------------

  const running = mode === 'run';
  const menus: Menu[] = [
    {
      label: t('mnuFile'),
      disabled: running,
      items: [
        { label: t('mnuFileNew'), onClick: newFile },
        { label: `${t('mnuFileOpen')}…`, onClick: openFile },
        { label: t('examples'), submenu: EXAMPLES.map((ex) => ({ label: ex.name, onClick: () => openExample(ex) })) },
        'sep',
        { label: t('mnuFileSave'), onClick: () => saveAs() },
        {
          label: `${t('mnuFileSaveAs')}…`,
          onClick: () =>
            setDialog({
              kind: 'prompt',
              title: t('mnuFileSaveAs'),
              label: t('name'),
              initial: displayName.replace(/\.esc$/i, ''),
              // The original's Save As filter: EKTS files or one of four picture formats.
              types: { label: t('fileType'), options: ['EKTS files (*.esc)', ...IMAGE_FORMATS.map((f) => f.label)] },
              onOk: (v, type) => {
                setDialog(null);
                const name = v.trim();
                if (!name) return;
                if (type === 0) saveAs(name);
                else saveImage(name, IMAGE_FORMATS[type - 1].format);
              },
            }),
        },
        'sep',
        { label: t('mnuFilePrintPrev'), onClick: openPreview },
        { label: `${t('mnuFilePrintSet')}…`, onClick: () => setPageSetup(true) },
      ],
    },
    {
      label: t('mnuEdit'),
      disabled: running,
      items: [
        { label: t('undo'), onClick: undo, disabled: !history.current.canUndo },
        { label: t('redo'), onClick: redo, disabled: !history.current.canRedo },
        'sep',
        { label: t('mnuEditAddText'), onClick: addText },
        {
          label: t('mnuEditSelectAll'),
          onClick: () => {
            doc.selectAll();
            changed();
          },
        },
        {
          label: t('mnuEditDeselect'),
          onClick: () => {
            doc.deselect(null);
            changed();
          },
        },
        { label: t('mnuEditDelete'), onClick: deleteSelection, disabled: !doc.hasSelection },
      ],
    },
    {
      label: t('mnuWindow'),
      disabled: running,
      items: [
        { label: t('mnuWindowLang'), submenu: LANGS.map((l) => ({ label: caption('mnuLng', l), checked: l === lang, onClick: () => setLang(l) })) },
        { label: t('mnuWindowLibrary'), checked: libraryOpen, onClick: () => setLibraryOpen(!libraryOpen) },
        { label: t('mnuWindowSummary'), checked: summaryShown, onClick: toggleSummary },
        { label: t('mnuWindowLimits'), checked: showLimits, onClick: () => setShowLimits(!showLimits) },
        { label: t('fit'), onClick: () => canvas.current?.fit() },
      ],
    },
    {
      label: t('mnuHelp'),
      disabled: running,
      items: [
        { label: t('mnuHelpHelp'), onClick: () => setHelpOpen(true) },
        { label: t('mnuHelpWeb'), onClick: () => window.open('https://veppa.com/ekts/elektrik-kumanda-teknikleri-simulatoru-ekts-kilavuzu/', '_blank', 'noopener') },
        {
          label: t('mnuHelpAbout').replace('ESCS', 'EKTS'),
          onClick: () => setSplash(true),
        },
      ],
    },
  ];

  const alert = simError
    ? { elements: new Set(simError.elements), lines: new Set(simError.lines), phase: blink }
    : null;

  return (
    <div className="app">
      <MenuBar menus={menus} title={title} />
      <Toolbar
        buttons={[
          { key: 'new', title: t('tbBtnNew'), icon: <Icons.IconNew />, onClick: newFile, disabled: running },
          { key: 'open', title: t('tbBtnOpen'), icon: <Icons.IconOpen />, onClick: openFile, disabled: running },
          { key: 'save', title: t('tbBtnSave'), icon: <Icons.IconSave />, onClick: () => saveAs(), disabled: running },
          {
            key: 'delete',
            title: t('tbBtnDelete'),
            icon: <Icons.IconDelete disabled={running || !doc.hasSelection} />,
            onClick: deleteSelection,
            disabled: running || !doc.hasSelection,
            sepBefore: true,
          },
          {
            key: 'undo',
            title: t('undo'),
            icon: <Icons.IconUndo />,
            onClick: undo,
            disabled: running || !history.current.canUndo,
          },
          {
            key: 'redo',
            title: t('redo'),
            icon: <Icons.IconRedo />,
            onClick: redo,
            disabled: running || !history.current.canRedo,
          },
          {
            key: 'print',
            title: t('tbBtnPrint'),
            icon: <Icons.IconPrint />,
            onClick: openPreview,
            disabled: running,
            sepBefore: true,
          },
          {
            key: 'library',
            title: t('tbBtnLibrary'),
            icon: <Icons.IconLibrary />,
            onClick: () => setLibraryOpen(!libraryOpen),
            pushed: libraryOpen,
            disabled: running,
            sepBefore: true,
          },
          {
            key: 'sum',
            title: t('tbBtnSum'),
            icon: <Icons.IconList />,
            onClick: toggleSummary,
            pushed: summaryShown,
            disabled: running,
          },
          {
            key: 'run',
            title: running ? t('stop') : t('tbBtnRun'),
            icon: running ? <Icons.IconStop /> : <Icons.IconRun />,
            onClick: running ? stopRun : startRun,
            pushed: running,
          },
        ]}
      />
      <div className="workspace">
        <div className="panel">
          <Canvas
            ref={canvas}
            doc={doc}
            version={doc.version}
            mode={mode}
            lang={lang}
            pageLimits={showLimits ? pageSettings : null}
            snapshot={snapshot}
            alert={alert}
            onChange={bump}
            onCommit={changed}
            onPress={(i, latch) => sim.current?.pointerDown(i, latch)}
            onRelease={(i, latch) => sim.current?.pointerUp(i, latch)}
            onContextMenu={contextMenu}
            onEditLabel={editLabel}
            onEditText={editText}
            onTextMenu={textMenu}
            onZoom={setZoom}
          />
        </div>
        {preview && !running && (
          <PrintPreview doc={doc} lang={lang} settings={pageSettings} onSettings={() => setPageSetup(true)} onClose={() => setPreview(false)} />
        )}
        {splash && <Splash note={t('splashNote')} onClose={() => setSplash(false)} />}
        {helpOpen && <Help lang={lang} onClose={() => setHelpOpen(false)} />}
        {pageSetup && (
          <PageSetupDialog
            lang={lang}
            settings={pageSettings}
            onOk={(s) => {
              setPageSettings(s);
              savePageSettings(s);
              setPageSetup(false);
            }}
            onCancel={() => setPageSetup(false)}
          />
        )}
        {libraryOpen && !running && <Library lang={lang} onAdd={addElement} onClose={() => setLibraryOpen(false)} />}
      </div>
      <StatusBar
        text={running ? t('running') : ''}
        right={
          <>
            <button type="button" className="status-btn" aria-label="−" onClick={() => canvas.current?.zoomBy(1 / 1.25)}>
              <Icons.IconZoomOut />
            </button>
            <span className="status-zoom">{Math.round(zoom * 100)}%</span>
            <button type="button" className="status-btn" aria-label="+" onClick={() => canvas.current?.zoomBy(1.25)}>
              <Icons.IconZoomIn />
            </button>
            <button type="button" className="status-btn" aria-label={t('fit')} title={t('fit')} onClick={() => canvas.current?.fit()}>
              <Icons.IconFit />
            </button>
          </>
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept=".esc,application/octet-stream"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) openBytes(await f.arrayBuffer(), f.name);
        }}
      />

      {simError && (
        <MessageBox
          title="EKTS"
          icon="error"
          text={simError.key === 'loop' ? SIM_MESSAGES.loop.tr : caption(simError.key, lang)}
          buttons={[{ label: t('ok'), primary: true, onClick: closeSimError }]}
        />
      )}
      {dialog?.kind === 'message' && <MessageBox title={dialog.title} text={dialog.text} icon={dialog.icon} buttons={dialog.buttons} />}
      {dialog?.kind === 'prompt' && (
        <PromptDialog
          title={dialog.title}
          label={dialog.label}
          initial={dialog.initial}
          numeric={dialog.numeric}
          multiline={dialog.multiline}
          types={dialog.types}
          okLabel={t('ok')}
          cancelLabel={t('cancel')}
          onOk={dialog.onOk}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'choice' && (
        <ChoiceDialog
          title={dialog.title}
          options={dialog.options}
          current={dialog.current}
          empty={t('noRelays')}
          cancelLabel={t('cancel')}
          onPick={dialog.onPick}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'context' && <ContextMenu x={dialog.x} y={dialog.y} items={dialog.items} onClose={() => setDialog(null)} />}
    </div>
  );
}
