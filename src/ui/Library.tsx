/**
 * The library window (frmLibrary): a preview panel above a tree of element
 * groups, sorted by name as the original TreeView was. Double tapping an
 * entry or the preview adds the element; the Ekle button is the touch
 * equivalent.
 */
import React, { useMemo, useRef, useState } from 'react';
import { LIBRARY_GROUPS, rotatedSize, type ElementType } from '../ekts/elements';
import { ElementSymbol } from '../ekts/Symbol';
import { DEFAULT_LAMP_COLOR } from '../ekts/document';
import { caption, type Lang } from './strings';

const GROUP_KEYS: Record<string, string> = {
  power: 'libGroupPower',
  element: 'libGroupElement',
  motor: 'libGroupMotor',
  system: 'libGroupSystem',
};

export function Library({ lang, onAdd, onClose }: { lang: Lang; onAdd: (t: ElementType) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<ElementType | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['element']));
  const lastTap = useRef<{ t: number; type: ElementType | null }>({ t: 0, type: null });

  const groups = useMemo(() => {
    const cmp = (a: string, b: string) => a.localeCompare(b, lang === 'tr' ? 'tr' : 'en');
    return LIBRARY_GROUPS.map((g) => ({
      id: g.id,
      name: caption(GROUP_KEYS[g.id], lang),
      items: g.types.map((t) => ({ type: t, name: caption(t, lang) })).sort((a, b) => cmp(a.name, b.name)),
    })).sort((a, b) => cmp(a.name, b.name));
  }, [lang]);

  const tapItem = (t: ElementType) => {
    const now = performance.now();
    if (lastTap.current.type === t && now - lastTap.current.t < 350) {
      onAdd(t);
      lastTap.current = { t: 0, type: null };
      return;
    }
    lastTap.current = { t: now, type: t };
    setSelected(t);
  };

  const preview = selected ? rotatedSize(selected, 0) : null;
  const scale = preview ? Math.min(2, 160 / Math.max(preview.width, preview.height)) : 1;

  return (
    <div className="toolwindow library" role="dialog" aria-label={caption('frmLibText', lang)}>
      <div className="toolwindow-title">
        <span>{caption('frmLibText', lang)}</span>
        <button type="button" className="toolwindow-close" aria-label={caption('close', lang)} onClick={onClose}>
          ×
        </button>
      </div>
      <div className="lib-preview" onDoubleClick={() => selected && onAdd(selected)}>
        {selected && preview && (
          <>
            <svg
              width={(preview.width + 2) * scale}
              height={(preview.height + 2) * scale}
              viewBox={`-1 -1 ${preview.width + 2} ${preview.height + 2}`}
            >
              <g transform="translate(0.5 0.5)">
                <ElementSymbol
                  type={selected}
                  location={{ x: 0, y: 0 }}
                  rotation={0}
                  state={0}
                  color={selected === 'Lamba' ? DEFAULT_LAMP_COLOR : 0}
                />
              </g>
            </svg>
            <button type="button" className="btn lib-add" onClick={() => onAdd(selected)}>
              {caption('add', lang)}
            </button>
          </>
        )}
        {!selected && <span className="lib-hint">{caption('libHint', lang)}</span>}
      </div>
      <div className="lib-tree" role="tree">
        {groups.map((g) => {
          const open = expanded.has(g.id);
          return (
            <div key={g.id} role="treeitem" aria-expanded={open}>
              <button
                type="button"
                className="tree-node"
                onClick={() => {
                  const next = new Set(expanded);
                  if (open) next.delete(g.id);
                  else next.add(g.id);
                  setExpanded(next);
                }}
              >
                <span className="tree-box">{open ? '−' : '+'}</span>
                {g.name}
              </button>
              {open &&
                g.items.map((it) => (
                  <button
                    key={it.type}
                    type="button"
                    role="treeitem"
                    className={`tree-leaf${selected === it.type ? ' selected' : ''}`}
                    onClick={() => tapItem(it.type)}
                  >
                    {it.name}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
