import React from 'react';
import { RotateCw, Trash2, X } from 'lucide-react';
import { COMPONENT_DEFINITIONS } from '../../data/components';
import type { CircuitComponent, LampColor } from '../../types/circuit';

export interface PropertyBarProps {
  selectedComponent: CircuitComponent | null;
  selectedWireId: string | null;
  availableCoilLabels: string[];
  availableOnTimerLabels: string[];
  availableOffTimerLabels: string[];
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateDelay: (id: string, delaySeconds: number) => void;
  onUpdateLampColor: (id: string, color: LampColor) => void;
  onRotateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteWire: (id: string) => void;
  onClose: () => void;
}

const LAMP_OPTIONS: { id: LampColor; label: string; dot: string }[] = [
  { id: 'green', label: 'Yeşil', dot: 'bg-green-500' },
  { id: 'red', label: 'Kırmızı', dot: 'bg-red-500' },
  { id: 'yellow', label: 'Sarı', dot: 'bg-yellow-400' },
];

export function PropertyBar({
  selectedComponent,
  selectedWireId,
  availableCoilLabels,
  availableOnTimerLabels,
  availableOffTimerLabels,
  onUpdateLabel,
  onUpdateDelay,
  onUpdateLampColor,
  onRotateComponent,
  onDeleteComponent,
  onDeleteWire,
  onClose,
}: PropertyBarProps) {
  if (!selectedComponent && !selectedWireId) return null;

  if (selectedWireId && !selectedComponent) {
    return (
      <div
        role="region"
        aria-label="Kablo Özellikleri"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg"
      >
        <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
          Kablo seçildi
        </span>
        <button
          type="button"
          onClick={() => onDeleteWire(selectedWireId)}
          data-testid="delete-wire-btn"
          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Kabloyu Sil</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Seçimi kapat"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!selectedComponent) return null;
  const def = COMPONENT_DEFINITIONS[selectedComponent.type];

  // Classic EKTS contact-to-coil binding helper: list matching coils/timers in the current circuit
  let quickBindLabels: string[] = [];
  if (
    selectedComponent.type === 'contact_no' ||
    selectedComponent.type === 'contact_nc' ||
    selectedComponent.type === 'contact_power_3p'
  ) {
    quickBindLabels = availableCoilLabels;
  } else if (
    selectedComponent.type === 'contact_timer_no' ||
    selectedComponent.type === 'contact_timer_nc'
  ) {
    quickBindLabels = availableOnTimerLabels;
  } else if (
    selectedComponent.type === 'contact_timer_off_no' ||
    selectedComponent.type === 'contact_timer_off_nc'
  ) {
    quickBindLabels = availableOffTimerLabels;
  }

  const isTimerCoil =
    selectedComponent.type === 'coil_timer_on' ||
    selectedComponent.type === 'coil_timer_off';

  return (
    <div
      role="region"
      aria-label="Eleman Özellikleri"
      data-testid="property-bar"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-24px)] max-w-2xl px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg flex flex-wrap items-center justify-between gap-2.5"
    >
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {def.shortName}
        </span>

        {def.editableLabel && (
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 dark:text-slate-300">Etiket</span>
            <input
              type="text"
              value={selectedComponent.label}
              maxLength={8}
              onChange={(e) => onUpdateLabel(selectedComponent.id, e.target.value)}
              aria-label="Eleman Etiketi"
              className="w-20 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono-tech text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
        )}

        {/* EKTS Quick Coil / Timer Binding Buttons */}
        {quickBindLabels.length > 0 && (
          <div className="flex items-center gap-1" role="group" aria-label="Bobine Bağla">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-0.5">Bağla:</span>
            {quickBindLabels.map((lbl) => {
              const active = selectedComponent.label.trim().toUpperCase() === lbl;
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => onUpdateLabel(selectedComponent.id, lbl)}
                  className={`min-h-[32px] px-2 py-1 rounded-md text-xs font-mono-tech font-bold border transition-colors ${
                    active
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-500'
                  }`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        )}

        {isTimerCoil && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 dark:text-slate-300">Süre</span>
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                aria-label="Süreyi azalt"
                onClick={() =>
                  onUpdateDelay(
                    selectedComponent.id,
                    Math.max(1, (selectedComponent.delaySeconds ?? 3) - 1)
                  )
                }
                className="w-8 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold"
              >
                -
              </button>
              <span className="px-2 text-xs font-mono-tech font-semibold text-slate-900 dark:text-slate-100">
                {selectedComponent.delaySeconds ?? 3} sn
              </span>
              <button
                type="button"
                aria-label="Süreyi artır"
                onClick={() =>
                  onUpdateDelay(
                    selectedComponent.id,
                    Math.min(60, (selectedComponent.delaySeconds ?? 3) + 1)
                  )
                }
                className="w-8 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold"
              >
                +
              </button>
            </div>
          </div>
        )}

        {selectedComponent.type === 'lamp' && (
          <div className="flex items-center gap-1" role="group" aria-label="Lamba Rengi">
            {LAMP_OPTIONS.map((opt) => {
              const active = (selectedComponent.lampColor ?? 'green') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateLampColor(selectedComponent.id, opt.id)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onRotateComponent(selectedComponent.id)}
          aria-label="90 derece döndür"
          title="90° Döndür"
          className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">90° Döndür</span>
        </button>

        <button
          type="button"
          onClick={() => onDeleteComponent(selectedComponent.id)}
          aria-label="Elemanı sil"
          data-testid="delete-component-btn"
          className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Sil</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Özellik çubuğunu kapat"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
