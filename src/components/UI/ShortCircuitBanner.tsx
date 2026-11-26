import React from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import type { ShortCircuitFault } from '../../types/circuit';

export interface ShortCircuitBannerProps {
  fault: ShortCircuitFault;
  onReturnToDesign: () => void;
}

export function ShortCircuitBanner({ fault, onReturnToDesign }: ShortCircuitBannerProps) {
  return (
    <div
      role="alert"
      data-testid="short-circuit-alert"
      className="z-30 bg-red-600 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div className="text-xs sm:text-sm font-medium leading-snug">
          <strong className="font-bold mr-1.5">SİMÜLASYON DURDURULDU:</strong>
          <span>{fault.message}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onReturnToDesign}
        className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-white text-red-700 hover:bg-red-50 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>Devreyi Düzenle</span>
      </button>
    </div>
  );
}
