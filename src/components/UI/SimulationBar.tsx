import React, { useState } from 'react';
import { Lock, RotateCcw, Unlock } from 'lucide-react';
import type {
  CircuitComponent,
  CircuitDocument,
  MotorStatus,
  SimulationState,
  UserInteractionState,
} from '../../types/circuit';

export interface SimulationBarProps {
  circuit: CircuitDocument;
  simState: SimulationState;
  interactions: UserInteractionState;
  onMomentaryPressStart: (componentId: string) => void;
  onMomentaryPressEnd: (componentId: string) => void;
  onToggleMomentaryLock: (componentId: string) => void;
  onToggleLatch: (componentId: string) => void;
  onToggleFuse: (componentId: string) => void;
  onResetSimulation: () => void;
}

function getControlMeta(
  comp: CircuitComponent
): { sub: string; style: 'start' | 'stop' | 'toggle' | 'estop' | 'dual' | 'thermal' } {
  switch (comp.type) {
    case 'btn_start':
      return { sub: 'Start', style: 'start' };
    case 'btn_stop':
      return { sub: 'Stop', style: 'stop' };
    case 'btn_dual':
      return { sub: 'Çift', style: 'dual' };
    case 'btn_estop':
      return { sub: 'Acil', style: 'estop' };
    case 'limit_no':
    case 'limit_nc':
      return { sub: 'Sınır', style: 'toggle' };
    case 'thermal_nc':
      return { sub: 'Termik', style: 'thermal' };
    default:
      return { sub: 'Anahtar', style: 'toggle' };
  }
}

function formatMotorStatus(st: MotorStatus): { text: string; className: string } {
  switch (st) {
    case 'forward':
      return { text: 'İLERİ ↻', className: 'text-emerald-600 dark:text-emerald-400' };
    case 'reverse':
      return { text: 'GERİ ↺', className: 'text-blue-600 dark:text-blue-400' };
    case 'star_forward':
      return { text: 'YILDIZ (Y) ↻', className: 'text-teal-600 dark:text-teal-400' };
    case 'star_reverse':
      return { text: 'YILDIZ (Y) ↺', className: 'text-sky-600 dark:text-sky-400' };
    case 'delta_forward':
      return { text: 'ÜÇGEN (Δ) ↻', className: 'text-emerald-600 dark:text-emerald-400' };
    case 'delta_reverse':
      return { text: 'ÜÇGEN (Δ) ↺', className: 'text-blue-600 dark:text-blue-400' };
    case 'phase_missing':
      return { text: 'EKSİK FAZ', className: 'text-amber-600 dark:text-amber-400' };
    default:
      return { text: 'DURDU', className: '' };
  }
}

export function SimulationBar({
  circuit,
  simState,
  interactions,
  onMomentaryPressStart,
  onMomentaryPressEnd,
  onToggleMomentaryLock,
  onToggleLatch,
  onToggleFuse,
  onResetSimulation,
}: SimulationBarProps) {
  // Mobile equivalent of classic Windows EKTS right-click hold-lock on momentary buttons
  const [holdLockMode, setHoldLockMode] = useState(false);

  const controls = circuit.components.filter(
    (c) =>
      c.type === 'btn_start' ||
      c.type === 'btn_stop' ||
      c.type === 'btn_dual' ||
      c.type === 'switch_toggle' ||
      c.type === 'btn_estop' ||
      c.type === 'limit_no' ||
      c.type === 'limit_nc' ||
      c.type === 'thermal_nc'
  );

  const hasMomentary = controls.some(
    (c) => c.type === 'btn_start' || c.type === 'btn_stop' || c.type === 'btn_dual'
  );

  const motors = circuit.components.filter(
    (c) => c.type === 'motor_3ph' || c.type === 'motor_3ph_6pin'
  );
  const timers = circuit.components.filter(
    (c) => c.type === 'coil_timer_on' || c.type === 'coil_timer_off'
  );

  const renderStatusItems = () => (
    <>
      <span>
        Bobin:{' '}
        <strong className="text-slate-900 dark:text-slate-100">
          {simState.energizedCoilLabels.length > 0
            ? simState.energizedCoilLabels.join(', ')
            : 'Yok'}
        </strong>
      </span>
      {timers.map((t) => {
        const st = simState.timerStates[t.id];
        if (!st) return null;
        return (
          <React.Fragment key={t.id}>
            <span aria-hidden="true">·</span>
            <span>
              {t.label}:{' '}
              <strong
                className={
                  st.active && !st.counting
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : st.counting
                      ? 'text-amber-600 dark:text-amber-400'
                      : ''
                }
              >
                {st.remaining.toFixed(1)}s
              </strong>
            </span>
          </React.Fragment>
        );
      })}
      {motors.map((m) => {
        const fmt = formatMotorStatus(simState.motorStates[m.id] ?? 'stopped');
        return (
          <React.Fragment key={m.id}>
            <span aria-hidden="true">·</span>
            <span>
              {m.label}: <strong className={fmt.className}>{fmt.text}</strong>
            </span>
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <section
      aria-label="Simülasyon Kontrol Paneli"
      data-testid="simulation-bar"
      className="z-30 shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-2"
    >
      {/* Compact mobile live status readout so phone users always see timer/motor states */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1.5 text-[11px] font-mono-tech text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {renderStatusItems()}
      </div>

      <div className="flex items-center justify-between gap-2.5">
        {/* Interactive Quick-Access Push Buttons & Switches (Thumb-friendly) */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {controls.length === 0 ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Devrede kontrol elemanı yok
            </span>
          ) : (
            controls.map((comp) => {
              const { sub, style } = getControlMeta(comp);
              const isMomentary =
                comp.type === 'btn_start' ||
                comp.type === 'btn_stop' ||
                comp.type === 'btn_dual';
              const isThermal = comp.type === 'thermal_nc';
              const isLocked = Boolean(interactions.lockedButtons?.[comp.id]);
              const isActive = isMomentary
                ? Boolean(interactions.pressedButtons[comp.id] || isLocked)
                : isThermal
                  ? Boolean(interactions.blownFuses[comp.id])
                  : Boolean(interactions.latchedSwitches[comp.id]);

              const colorClasses =
                style === 'start'
                  ? isActive
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                  : style === 'stop' || style === 'estop'
                    ? isActive
                      ? 'bg-red-600 text-white border-red-700'
                      : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/60'
                    : style === 'thermal'
                      ? isActive
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : style === 'dual'
                        ? isActive
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                        : isActive
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';

              return (
                <button
                  key={comp.id}
                  type="button"
                  data-testid={`sim-ctrl-${comp.label}`}
                  aria-pressed={isActive}
                  onPointerDown={
                    isMomentary && !holdLockMode
                      ? (e) => {
                          if (e.button === 2) return;
                          e.preventDefault();
                          onMomentaryPressStart(comp.id);
                        }
                      : undefined
                  }
                  onPointerUp={
                    isMomentary && !holdLockMode
                      ? (e) => {
                          if (e.button === 2) return;
                          onMomentaryPressEnd(comp.id);
                        }
                      : undefined
                  }
                  onPointerLeave={
                    isMomentary && !holdLockMode && isActive && !isLocked
                      ? () => onMomentaryPressEnd(comp.id)
                      : undefined
                  }
                  onPointerCancel={
                    isMomentary && !holdLockMode
                      ? () => onMomentaryPressEnd(comp.id)
                      : undefined
                  }
                  onContextMenu={
                    isMomentary
                      ? (e) => {
                          e.preventDefault();
                          onToggleMomentaryLock(comp.id);
                        }
                      : undefined
                  }
                  onClick={
                    isMomentary
                      ? holdLockMode
                        ? () => onToggleMomentaryLock(comp.id)
                        : undefined
                      : isThermal
                        ? () => onToggleFuse(comp.id)
                        : () => onToggleLatch(comp.id)
                  }
                  className={`min-h-[42px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-transform active:scale-95 select-none touch-none ${colorClasses}`}
                >
                  {isLocked && <Lock className="w-3 h-3 shrink-0" />}
                  <span className="font-mono-tech font-bold">{comp.label}</span>
                  <span className="opacity-80 font-normal">
                    {isThermal && isActive ? 'Attı' : sub}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Desktop Live Status + Hold-Lock Toggle + Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2.5 text-xs font-mono-tech text-slate-600 dark:text-slate-300 mr-1">
            {renderStatusItems()}
          </div>

          {hasMomentary && (
            <button
              type="button"
              onClick={() => setHoldLockMode((v) => !v)}
              aria-pressed={holdLockMode}
              aria-label="Basılı tut kilidi modu"
              title="Kilitli Basış Modu (EKTS sağ tık karşılığı)"
              data-testid="hold-lock-toggle"
              className={`min-w-[40px] min-h-[40px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                holdLockMode
                  ? 'bg-blue-700 border-blue-700 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {holdLockMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Kilitle</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetSimulation}
            aria-label="Simülasyonu sıfırla"
            title="Sıfırla"
            className="min-w-[40px] min-h-[40px] px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Sıfırla</span>
          </button>
        </div>
      </div>
    </section>
  );
}
