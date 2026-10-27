/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PANEL DE CONFIGURACIÓN Y REASIGNACIÓN DE TECLAS RPG:
 * Interfaz intuitiva para personalizar las teclas del juego con detección de conflictos.
 */

import React, { useEffect, useState } from 'react';
import { Keyboard, RotateCcw, AlertTriangle, Check, X } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import {
  ACTION_SPECS,
  ActionSpec,
  findKeyConflict,
  getFriendlyActionLabel,
  KeybindingsMap,
  loadKeybindings,
  resetKeybindings,
  RpgActionId,
  saveKeybindings,
} from './keybindings';

export function KeybindingsSettingsPanel() {
  const [bindings, setBindings] = useState<KeybindingsMap>(() => loadKeybindings());
  const [listeningActionId, setListeningActionId] = useState<RpgActionId | null>(null);
  const [conflictNotice, setConflictNotice] = useState<{
    targetActionId: RpgActionId;
    conflictingSpec: ActionSpec;
    newCode: string;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!listeningActionId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const code = e.code || e.key;
      if (code === 'Escape') {
        setListeningActionId(null);
        setConflictNotice(null);
        return;
      }

      const conflict = findKeyConflict(code, listeningActionId, bindings);
      if (conflict) {
        setConflictNotice({
          targetActionId: listeningActionId,
          conflictingSpec: conflict,
          newCode: code,
        });
        setListeningActionId(null);
        retroAudio.npcBlip(0.75);
        return;
      }

      // Sin conflicto: asignar directamente
      const next: KeybindingsMap = {
        ...bindings,
        [listeningActionId]: [code],
      };
      setBindings(next);
      saveKeybindings(next);
      setListeningActionId(null);
      setConflictNotice(null);
      retroAudio.uiClick();
      showSuccess('Tecla reasignada correctamente');
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [listeningActionId, bindings]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    window.setTimeout(() => setSuccessToast((prev) => (prev === msg ? null : prev)), 2500);
  };

  const handleResolveConflictSwap = () => {
    if (!conflictNotice) return;
    const { targetActionId, conflictingSpec, newCode } = conflictNotice;
    const oldTargetCodes = bindings[targetActionId] || [];

    const next: KeybindingsMap = {
      ...bindings,
      [targetActionId]: [newCode],
      [conflictingSpec.id]: oldTargetCodes.length > 0 ? oldTargetCodes : conflictingSpec.defaultCodes,
    };

    setBindings(next);
    saveKeybindings(next);
    setConflictNotice(null);
    retroAudio.uiClick();
    showSuccess(`Teclas intercambiadas entre ambas acciones`);
  };

  const handleResolveConflictOverwrite = () => {
    if (!conflictNotice) return;
    const { targetActionId, newCode } = conflictNotice;

    const next: KeybindingsMap = {
      ...bindings,
      [targetActionId]: [newCode],
    };

    setBindings(next);
    saveKeybindings(next);
    setConflictNotice(null);
    retroAudio.uiClick();
    showSuccess(`Tecla asignada a la acción seleccionada`);
  };

  const handleResetDefaults = () => {
    retroAudio.uiClick();
    const defaults = resetKeybindings();
    setBindings(defaults);
    setListeningActionId(null);
    setConflictNotice(null);
    showSuccess('Teclas restauradas a los valores por defecto');
  };

  const categories = Array.from(new Set(ACTION_SPECS.map((s) => s.category))) as ActionSpec['category'][];

  return (
    <div className="space-y-4 text-xs font-mono-tabular">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase tracking-wider">
          <Keyboard className="w-4 h-4 text-cyan-400" />
          <span>Configuración de Controles y Teclas</span>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 cursor-pointer text-[11px] transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-amber-300" />
          <span>Restaurar Predeterminados</span>
        </button>
      </div>

      {/* Aviso de Reasignación activa */}
      {listeningActionId && (
        <div className="p-3 bg-amber-950/80 border-2 border-amber-400 rounded-lg text-amber-200 text-center space-y-1 animate-pulse">
          <p className="font-bold uppercase text-xs">
            ¡PRESIONA LA NUEVA TECLA PARA «{ACTION_SPECS.find((s) => s.id === listeningActionId)?.label}»!
          </p>
          <p className="text-[11px] text-amber-300/80">Presiona [ESC] para cancelar la reasignación.</p>
        </div>
      )}

      {/* Alerta de Conflicto de Teclas */}
      {conflictNotice && (
        <div className="p-3 bg-rose-950/90 border-2 border-rose-500 rounded-lg text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>⚠ Conflicto detectado de tecla</span>
          </div>
          <p className="text-[11px] text-slate-200 leading-snug">
            La tecla <strong className="text-amber-300">[{conflictNotice.newCode}]</strong> ya está asignada a la acción{' '}
            <strong className="text-cyan-300">«{conflictNotice.conflictingSpec.label}»</strong>.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleResolveConflictSwap}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] cursor-pointer"
            >
              Intercambiar Teclas
            </button>
            <button
              type="button"
              onClick={handleResolveConflictOverwrite}
              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold text-[11px] cursor-pointer"
            >
              Reemplazar Asignación
            </button>
            <button
              type="button"
              onClick={() => setConflictNotice(null)}
              className="px-2.5 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white text-[11px] cursor-pointer ml-auto"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast de confirmación */}
      {successToast && (
        <div className="p-2 bg-emerald-950/90 border border-emerald-400 rounded text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Lista agrupada de Controles */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div key={cat} className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block px-1">
              {cat}
            </span>
            <div className="space-y-1">
              {ACTION_SPECS.filter((s) => s.category === cat).map((spec) => {
                const label = getFriendlyActionLabel(spec.id, bindings);
                const isListening = listeningActionId === spec.id;

                return (
                  <div
                    key={spec.id}
                    className={`p-2 rounded bg-black/40 border flex items-center justify-between gap-3 ${
                      isListening ? 'border-amber-400 bg-amber-950/30' : 'border-white/10 hover:border-cyan-500/30'
                    }`}
                  >
                    <span className="font-semibold text-slate-200 text-[11px]">{spec.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#091827] border border-cyan-500/30 text-amber-300 font-bold text-[11px] min-w-[70px] text-center">
                        {isListening ? '...' : label}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          retroAudio.uiClick();
                          setConflictNotice(null);
                          setListeningActionId(spec.id);
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Reasignar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
