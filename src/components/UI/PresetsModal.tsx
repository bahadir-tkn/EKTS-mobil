import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardList,
  Download,
  FilePlus,
  Save,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { COMPONENT_DEFINITIONS } from '../../data/components';
import { PRESET_CIRCUITS } from '../../data/presets';
import type { CircuitDocument, SavedCircuitSlot } from '../../types/circuit';
import { exportCircuitJson, validateCircuitDocument } from '../../utils/storage';

export interface PresetsModalProps {
  isOpen: boolean;
  currentCircuit: CircuitDocument;
  savedSlots: SavedCircuitSlot[];
  onClose: () => void;
  onSelectPreset: (preset: CircuitDocument) => void;
  onNewBlankCircuit: () => void;
  onSaveSlot: (name: string) => void;
  onLoadSlot: (slot: SavedCircuitSlot) => void;
  onDeleteSlot: (slotId: string) => void;
  onImportCircuit: (circuit: CircuitDocument) => void;
}

type ModalTab = 'presets' | 'bom' | 'storage';

export function PresetsModal({
  isOpen,
  currentCircuit,
  savedSlots,
  onClose,
  onSelectPreset,
  onNewBlankCircuit,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onImportCircuit,
}: PresetsModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('presets');
  const [saveName, setSaveName] = useState(currentCircuit.name);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep save input synchronized whenever modal opens or circuit switches
  useEffect(() => {
    if (isOpen) {
      setSaveName(currentCircuit.name);
      setStatusMsg(null);
    }
  }, [isOpen, currentCircuit.name]);

  // Classic EKTS "Malzeme Listesi" (Bill of Materials grouped by component type)
  const bomItems = useMemo(() => {
    const groups = new Map<string, { name: string; count: number; labels: string[] }>();
    for (const comp of currentCircuit.components) {
      const def = COMPONENT_DEFINITIONS[comp.type];
      if (!def) continue;
      const existing = groups.get(comp.type);
      if (existing) {
        existing.count += 1;
        if (comp.label && !existing.labels.includes(comp.label)) {
          existing.labels.push(comp.label);
        }
      } else {
        groups.set(comp.type, {
          name: def.name,
          count: 1,
          labels: comp.label ? [comp.label] : [],
        });
      }
    }
    return Array.from(groups.values());
  }, [currentCircuit.components]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = saveName.trim();
    if (!trimmed) {
      setStatusMsg({ type: 'err', text: 'Lütfen devre için bir ad girin.' });
      return;
    }
    onSaveSlot(trimmed);
    setStatusMsg({ type: 'ok', text: `"${trimmed}" tarayıcıya kaydedildi.` });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const valid = validateCircuitDocument(parsed);
      if (!valid) {
        setStatusMsg({ type: 'err', text: 'Geçersiz EKTS JSON devre dosyası.' });
      } else {
        onImportCircuit(valid);
        setStatusMsg({ type: 'ok', text: `"${valid.name}" başarıyla yüklendi.` });
        onClose();
      }
    } catch {
      setStatusMsg({ type: 'err', text: 'JSON dosyası okunamadı.' });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Devreler, Malzeme Listesi ve Kayıt Yönetimi"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Devre ve Proje Yönetimi
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Pencereyi kapat"
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Modal Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'presets'}
              onClick={() => setActiveTab('presets')}
              className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Hazır Devreler
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'storage'}
              onClick={() => setActiveTab('storage')}
              className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'storage'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Kaydet / Yükle
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'bom'}
              onClick={() => setActiveTab('bom')}
              className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'bom'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Malzeme Listesi
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-5">
          {statusMsg && (
            <div
              role="status"
              className={`px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {statusMsg.type === 'ok' && <Check className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {activeTab === 'presets' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Klasik EKTS Örnek Devreleri
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onNewBlankCircuit();
                    onClose();
                  }}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex items-center gap-1.5"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Yeni Boş Şema</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {PRESET_CIRCUITS.map((preset) => {
                  const isCurrent = currentCircuit.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`preset-btn-${preset.id}`}
                      onClick={() => {
                        onSelectPreset(preset);
                        onClose();
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {preset.name}
                        </div>
                        {preset.description && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {preset.description}
                          </p>
                        )}
                        <div className="mt-1.5 text-[11px] font-mono-tech text-slate-500 dark:text-slate-400">
                          {preset.components.length} eleman · {preset.wires.length} kablo
                        </div>
                      </div>
                      <Zap
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tarayıcıya Kaydet ve JSON Aktar
              </h3>

              <form onSubmit={handleSave} className="flex items-center gap-2">
                <label className="sr-only" htmlFor="save-circuit-name">
                  Devre Adı
                </label>
                <input
                  id="save-circuit-name"
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Devre adını girin..."
                  className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    exportCircuitJson(currentCircuit);
                    setStatusMsg({ type: 'ok', text: 'Devre JSON olarak indirildi.' });
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>JSON Dışa Aktar</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>JSON İçe Aktar</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                  aria-label="JSON devre dosyası seç"
                />
              </div>

              {savedSlots.length > 0 ? (
                <div className="pt-1 space-y-2">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Kayıtlı Devrelerim ({savedSlots.length})
                  </div>
                  {savedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onLoadSlot(slot);
                          onClose();
                        }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {slot.name}
                        </div>
                        <div className="text-[11px] font-mono-tech text-slate-500 dark:text-slate-400">
                          {slot.circuit.components.length} eleman ·{' '}
                          {new Date(slot.savedAt).toLocaleDateString('tr-TR')}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSlot(slot.id)}
                        aria-label={`"${slot.name}" kaydını sil`}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  Henüz kaydedilmiş devre yok. Yukarıdan ad verip tarayıcıya kaydedebilirsiniz.
                </p>
              )}
            </div>
          )}

          {activeTab === 'bom' && (
            <div className="space-y-3" data-testid="bom-list">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-slate-500" />
                  <span>Kullanılan Elemanlar (Malzeme Listesi)</span>
                </h3>
                <span className="text-xs font-mono-tech text-slate-500 dark:text-slate-400">
                  Toplam {currentCircuit.components.length} eleman
                </span>
              </div>

              {bomItems.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  Şemada henüz eleman bulunmuyor.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {bomItems.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white dark:bg-slate-900 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {item.name}
                        </div>
                        {item.labels.length > 0 && (
                          <div className="text-[11px] font-mono-tech text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {item.labels.join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="font-mono-tech font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {item.count} adet
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
