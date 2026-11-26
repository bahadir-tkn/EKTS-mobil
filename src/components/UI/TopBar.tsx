import React from 'react';
import { ChevronDown, FolderOpen, Moon, Play, Square, Sun } from 'lucide-react';

export interface TopBarProps {
  circuitName: string;
  isSimulating: boolean;
  isDark: boolean;
  hasShortCircuit: boolean;
  onToggleSimulation: () => void;
  onOpenMenu: () => void;
  onToggleTheme: () => void;
}

export function TopBar({
  circuitName,
  isSimulating,
  isDark,
  hasShortCircuit,
  onToggleSimulation,
  onOpenMenu,
  onToggleTheme,
}: TopBarProps) {
  return (
    <header className="h-14 shrink-0 z-30 flex items-center justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center shrink-0">
        <span className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
          EKTS Mobil
        </span>
      </div>

      {/* Zone 2: Circuit / Presets & Save Switcher */}
      <div className="flex items-center justify-center min-w-0 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Devreler ve Kayıt Menüsü"
          className="flex items-center gap-1.5 sm:gap-2 min-h-[40px] px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors max-w-full"
        >
          <FolderOpen className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="truncate">{circuitName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Zone 3: Theme Toggle + Primary Mode CTA */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
          title={isDark ? 'Açık Şema Teması' : 'Koyu Mühendislik Teması'}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleSimulation}
          data-testid="mode-toggle-btn"
          className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors active:scale-[0.98] ${
            isSimulating
              ? hasShortCircuit
                ? 'bg-red-700 hover:bg-red-800 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isSimulating ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Düzenle</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Çalıştır</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
