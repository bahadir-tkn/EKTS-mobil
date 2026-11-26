import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Undo2 } from 'lucide-react';
import { ALL_COMPONENT_DEFS, COMPONENT_CATEGORIES } from '../../data/components';
import type { ComponentCategory, ComponentType } from '../../types/circuit';
import { ComponentIconPreview } from '../Symbols/ComponentSymbol';

export interface ComponentDrawerProps {
  isOpen: boolean;
  isDark: boolean;
  componentCount: number;
  wireCount: number;
  canUndo: boolean;
  onToggleOpen: () => void;
  onAddComponent: (type: ComponentType) => void;
  onUndo: () => void;
  onClearCanvas: () => void;
}

export function ComponentDrawer({
  isOpen,
  isDark,
  componentCount,
  wireCount,
  canUndo,
  onToggleOpen,
  onAddComponent,
  onUndo,
  onClearCanvas,
}: ComponentDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('buttons');

  const filtered = ALL_COMPONENT_DEFS.filter((def) => def.category === activeCategory);

  return (
    <section
      aria-label="Eleman Kütüphanesi"
      className="z-30 shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors"
    >
      {/* Collapsed / Header Strip — compact single row to preserve canvas height */}
      <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          data-testid="drawer-toggle-btn"
          className="min-h-[42px] px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Eleman Ekle</span>
          {isOpen ? <ChevronDown className="w-4 h-4 ml-0.5" /> : <ChevronUp className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Quiet unboxed schematic summary metadata */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tech">
          <span>{componentCount} eleman</span>
          <span aria-hidden="true">·</span>
          <span>{wireCount} kablo</span>
          <span aria-hidden="true">·</span>
          <span className="font-sans">Bağlamak için iki pine dokunun</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Son işlemi geri al"
            title="Geri Al (Ctrl+Z)"
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Geri Al</span>
          </button>

          <button
            type="button"
            onClick={onClearCanvas}
            disabled={componentCount === 0}
            aria-label="Çizim tahtasını temizle"
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Temizle</span>
          </button>
        </div>
      </div>

      {/* Expandable Bottom Sheet Body */}
      {isOpen && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-3 sm:px-5 pt-2.5 pb-4 max-h-[48vh] overflow-y-auto">
          {/* Category Segmented Tabs */}
          <div
            role="tablist"
            aria-label="Eleman Kategorileri"
            className="flex items-center gap-1 overflow-x-auto pb-2.5"
          >
            {COMPONENT_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Component Symbol Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
            {filtered.map((def) => (
              <button
                key={def.type}
                type="button"
                onClick={() => onAddComponent(def.type)}
                data-testid={`add-comp-${def.type}`}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 min-h-[88px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 active:scale-[0.98] transition-all text-center"
              >
                <ComponentIconPreview type={def.type} isDark={isDark} />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">
                  {def.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
