/**
 * Window chrome in the manner of the original main window: menu bar
 * (Dosya, Düzenle, Pencere, Yardım), toolbar and status bar.
 */
import React, { useState } from 'react';

export type MenuItem =
  | 'sep'
  | {
      label: string;
      onClick?: () => void;
      disabled?: boolean;
      checked?: boolean;
      submenu?: MenuItem[];
    };

export interface Menu {
  label: string;
  items: MenuItem[];
  disabled?: boolean;
}

export function MenuList({ items, close, nested = false }: { items: MenuItem[]; close: () => void; nested?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={nested ? 'menu-sub' : 'menu-list'} role="menu">
      {items.map((it, i) => {
        if (it === 'sep') return <div key={i} className="menu-sep" />;
        const hasSub = !!it.submenu;
        return (
          <React.Fragment key={i}>
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              disabled={it.disabled}
              onClick={() => {
                if (hasSub) setOpen(open === i ? null : i);
                else {
                  close();
                  it.onClick?.();
                }
              }}
            >
              <span className="menu-check">{it.checked ? '✓' : ''}</span>
              <span className="menu-label">{it.label}</span>
              {hasSub && <span className="menu-arrow">{open === i ? '▾' : '▸'}</span>}
            </button>
            {hasSub && open === i && <MenuList items={it.submenu!} close={close} nested />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function MenuBar({ menus, title }: { menus: Menu[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = () => setOpen(null);
  return (
    <div className="menubar">
      {menus.map((m, i) => (
        <div key={m.label} className="menubar-entry">
          <button
            type="button"
            className={`menubar-title${open === i ? ' open' : ''}`}
            disabled={m.disabled}
            onClick={() => setOpen(open === i ? null : i)}
          >
            {m.label}
          </button>
          {open === i && (
            <>
              <div className="menu-backdrop" onPointerDown={close} />
              <MenuList items={m.items} close={close} />
            </>
          )}
        </div>
      ))}
      <div className="menubar-title-text" title={title}>
        {title}
      </div>
    </div>
  );
}

export interface ToolButton {
  key: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pushed?: boolean;
  sepBefore?: boolean;
}

export function Toolbar({ buttons }: { buttons: ToolButton[] }) {
  return (
    <div className="toolbar" role="toolbar">
      {buttons.map((b) => (
        <React.Fragment key={b.key}>
          {b.sepBefore && <div className="toolbar-sep" />}
          <button
            type="button"
            className={`tool${b.pushed ? ' pushed' : ''}`}
            title={b.title}
            aria-label={b.title}
            aria-pressed={b.pushed}
            disabled={b.disabled}
            onClick={b.onClick}
          >
            {b.icon}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export function StatusBar({ text, right }: { text: string; right?: React.ReactNode }) {
  return (
    <div className="statusbar">
      <div className="status-text">{text}</div>
      <div className="status-right">{right}</div>
    </div>
  );
}
