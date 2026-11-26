/**
 * Message boxes and small dialogs in the plain style of the original
 * (MessageBox, the inline name text box and relay combo box, the element
 * context menu).
 */
import React, { useEffect, useRef, useState } from 'react';
import { MenuList, type MenuItem } from './Chrome';

export function MessageBox({
  title,
  text,
  buttons,
  icon,
}: {
  title: string;
  text: string;
  buttons: { label: string; onClick: () => void; primary?: boolean }[];
  icon?: 'error' | 'question' | 'info';
}) {
  return (
    <div className="modal-backdrop">
      <div className="dialog" role="alertdialog" aria-label={title}>
        <div className="dialog-title">{title}</div>
        <div className="dialog-body">
          {icon && <span className={`dialog-icon ${icon}`} aria-hidden="true">{icon === 'error' ? '×' : icon === 'question' ? '?' : 'i'}</span>}
          <div className="dialog-text">{text}</div>
        </div>
        <div className="dialog-buttons">
          {buttons.map((b) => (
            <button key={b.label} type="button" className={`btn${b.primary ? ' primary' : ''}`} onClick={b.onClick} autoFocus={b.primary}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PromptDialog({
  title,
  label,
  initial,
  numeric,
  multiline,
  okLabel,
  cancelLabel,
  onOk,
  onCancel,
}: {
  title: string;
  label: string;
  initial: string;
  numeric?: boolean;
  multiline?: boolean;
  okLabel: string;
  cancelLabel: string;
  onOk: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.select();
  }, []);
  return (
    <div className="modal-backdrop">
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onOk(v);
        }}
      >
        <div className="dialog-title">{title}</div>
        <label className="dialog-field">
          <span>{label}</span>
          {multiline ? (
            <textarea ref={ref} autoFocus rows={5} value={v} spellCheck={false} onChange={(e) => setV(e.target.value)} />
          ) : (
          <input
            ref={ref}
            autoFocus
            value={v}
            inputMode={numeric ? 'numeric' : 'text'}
            autoCapitalize={numeric ? 'off' : 'characters'}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setV(numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
          />
          )}
        </label>
        <div className="dialog-buttons">
          <button type="submit" className="btn primary">
            {okLabel}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ChoiceDialog({
  title,
  options,
  current,
  empty,
  cancelLabel,
  onPick,
  onCancel,
}: {
  title: string;
  options: string[];
  current: string;
  empty: string;
  cancelLabel: string;
  onPick: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="dialog">
        <div className="dialog-title">{title}</div>
        <div className="dialog-list" role="listbox">
          {options.length === 0 && <div className="dialog-text pad">{empty}</div>}
          {options.map((o, i) => (
            <button key={`${o}-${i}`} type="button" role="option" aria-selected={o === current} className={`list-item${o === current ? ' selected' : ''}`} onClick={() => onPick(o)}>
              {o}
            </button>
          ))}
        </div>
        <div className="dialog-buttons">
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.max(4, Math.min(x, window.innerWidth - r.width - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - r.height - 4)),
    });
  }, [x, y]);
  return (
    <>
      <div className="menu-backdrop" onPointerDown={onClose} />
      <div ref={ref} className="context-menu" style={{ left: pos.x, top: pos.y }}>
        <MenuList items={items} close={onClose} />
      </div>
    </>
  );
}
