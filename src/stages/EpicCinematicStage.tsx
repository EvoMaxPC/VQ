/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prólogo Cinematográfico HD-2D de PIXELVERSE:
 * «EL REINICIO DEL UNIVERSO» (03:30 / 210s · 9 Escenas Consecutivas).
 *
 * La capa React sólo se ocupa de la presentación: subtítulos revelados palabra
 * por palabra, tarjetas de capítulo y el rótulo final animado. El guion y sus
 * tiempos permanecen intactos.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { bgmEngine } from '../audio/bgmEngine';
import { retroAudio } from '../audio/retroAudio';
import { cinematicAudio } from './cinematicAudio';
import {
  getActiveSubtitleAtTime,
  getChapterAtTime,
  TOTAL_CINEMATIC_DURATION_SEC,
} from './cinematicNarrator';
import { createCinematicWorld64Bit } from './cinematicWorld64Bit';

function formatTimecode(sec: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_CINEMATIC_DURATION_SEC, Math.floor(sec)));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ramp01(v: number): number {
  const c = v < 0 ? 0 : v > 1 ? 1 : v;
  return c * c * (3 - 2 * c);
}

export function EpicCinematicStage({
  runKey,
  onComplete,
  startAtSec = 0,
  endAtSec = TOTAL_CINEMATIC_DURATION_SEC,
}: {
  runKey: number;
  onComplete: () => void;
  /** Segundo del metraje en el que arranca esta reproducción. */
  startAtSec?: number;
  /** Segundo del metraje en el que termina esta reproducción. */
  endAtSec?: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // El tramo se congela por reproducción para que el bucle no dependa de props cambiantes.
  const segmentStartRef = useRef(startAtSec);
  const segmentEndRef = useRef(endAtSec);
  segmentStartRef.current = startAtSec;
  segmentEndRef.current = Math.min(
    TOTAL_CINEMATIC_DURATION_SEC,
    Math.max(startAtSec + 1, endAtSec)
  );

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => bgmEngine.isMuted());

  // Estado liviano sincronizado ~10 veces por segundo para subtítulos y capítulo
  const [uiTimeSec, setUiTimeSec] = useState<number>(0);

  const playbackRef = useRef<{
    elapsedSec: number;
    paused: boolean;
    finished: boolean;
    lastUiSyncSec: number;
  }>({
    elapsedSec: 0,
    paused: false,
    finished: false,
    lastUiSyncSec: -1,
  });

  useEffect(() => {
    const unsub = bgmEngine.subscribe((muted) => {
      setIsMuted(muted);
      if (muted) {
        cinematicAudio.stopAll();
      }
    });
    return unsub;
  }, []);

  const finishCinematic = useCallback(() => {
    if (playbackRef.current.finished) return;
    playbackRef.current.finished = true;
    cinematicAudio.stopAll();
    bgmEngine.setDuckFactor(1.0);
    onCompleteRef.current();
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      playbackRef.current.paused = next;
      if (next) {
        cinematicAudio.stopAll();
      } else {
        cinematicAudio.resetTimeline(playbackRef.current.elapsedSec);
      }
      return next;
    });
  }, []);

  // Inicio directo cuando cambia runKey (inicio automático o repetición desde el Selector Maestro)
  useEffect(() => {
    bgmEngine.setDuckFactor(0);

    const seekRaw = new URLSearchParams(window.location.search).get('cinematicAt');
    const segmentStart = Math.max(0, Math.min(TOTAL_CINEMATIC_DURATION_SEC - 0.05, segmentStartRef.current));
    const seekTo = seekRaw
      ? Math.max(segmentStart, Math.min(TOTAL_CINEMATIC_DURATION_SEC - 0.05, Number(seekRaw) || 0))
      : segmentStart;

    playbackRef.current = {
      elapsedSec: seekTo,
      paused: false,
      finished: false,
      lastUiSyncSec: -1,
    };
    setIsPaused(false);
    setUiTimeSec(seekTo);

    cinematicAudio.resetTimeline(seekTo);

    const tryUnlockAudio = () => {
      retroAudio.unlock();
      cinematicAudio.unlock();
    };
    tryUnlockAudio();

    window.addEventListener('pointerdown', tryUnlockAudio, { passive: true });
    window.addEventListener('touchstart', tryUnlockAudio, { passive: true });
    window.addEventListener('keydown', tryUnlockAudio);

    return () => {
      window.removeEventListener('pointerdown', tryUnlockAudio);
      window.removeEventListener('touchstart', tryUnlockAudio);
      window.removeEventListener('keydown', tryUnlockAudio);
      cinematicAudio.stopAll();
      bgmEngine.setDuckFactor(1.0);
    };
  }, [runKey]);

  // Inicialización única del lienzo Pixel-Art HD-2D (ilustraciones + cámara)
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const world = createCinematicWorld64Bit(mountEl);

    let frameId = 0;
    let disposed = false;
    let lastNow = performance.now();

    const onResize = () => {
      if (!mountEl || disposed) return;
      world.resize(
        mountEl.clientWidth || window.innerWidth,
        mountEl.clientHeight || window.innerHeight
      );
    };
    window.addEventListener('resize', onResize);

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, Math.min(0.25, (now - lastNow) / 1000));
      lastNow = now;

      const pb = playbackRef.current;
      if (!pb.paused && !pb.finished) {
        pb.elapsedSec += rawDt;

        cinematicAudio.syncTimeline(pb.elapsedSec, false);

        if (Math.abs(pb.elapsedSec - pb.lastUiSyncSec) >= 0.08) {
          pb.lastUiSyncSec = pb.elapsedSec;
          setUiTimeSec(pb.elapsedSec);
        }

        if (pb.elapsedSec >= segmentEndRef.current) {
          world.renderAtTime(segmentEndRef.current, rawDt);
          finishCinematic();
          return;
        }
      }

      world.renderAtTime(pb.elapsedSec, rawDt);
      frameId = requestAnimationFrame(tick);
    }

    lastNow = performance.now();
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      world.dispose();
    };
  }, [finishCinematic]);

  // Atajos de teclado cinematográficos (Esc = Omitir, Espacio = Pausa)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finishCinematic();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTogglePause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishCinematic, handleTogglePause]);

  const activeChapter = getChapterAtTime(uiTimeSec);
  const activeSubtitle = getActiveSubtitleAtTime(uiTimeSec);

  const words = useMemo(
    () => (activeSubtitle ? activeSubtitle.subtitle.split(' ') : []),
    [activeSubtitle]
  );

  let revealedWords = words.length;
  if (activeSubtitle && words.length > 0) {
    const span = Math.max(0.5, activeSubtitle.endSec - activeSubtitle.startSec);
    const frac = ramp01((uiTimeSec - activeSubtitle.startSec) / (span * 0.82));
    revealedWords = Math.max(1, Math.ceil(frac * words.length));
  }

  // Efectos ópticos puntuales de transición entre planos clave
  const isGlitchTransition = uiTimeSec >= 71.75 && uiTimeSec <= 72.55;
  const isReinicioFlash = uiTimeSec >= 69.75 && uiTimeSec <= 70.6;
  const isFinalLightFlash = uiTimeSec >= 172.15 && uiTimeSec <= 173.1;
  const isScene8TitleVisible = uiTimeSec >= 172.7 && uiTimeSec <= 177.35;
  const isFinalBlackFade = uiTimeSec >= 209.2;

  // Tarjeta de capítulo: entra al inicio del capítulo y se disuelve sola
  const sinceChapter = uiTimeSec - activeChapter.startSec;
  const chapterCardVisible = sinceChapter < 3.7 && uiTimeSec > 1.8 && !isScene8TitleVisible;
  const chapterCardOpacity = Math.min(
    ramp01(sinceChapter / 0.65),
    Math.max(0, 1 - ramp01((sinceChapter - 2.55) / 1.05))
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#010206] select-none">
      {/* Contenedor dedicado del lienzo HD-2D */}
      <div
        ref={mountRef}
        id="pixelverse-cinematic-hd2d"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Franjas panorámicas cinematográficas sutiles (Widescreen Scope) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[6vh] min-h-[24px] bg-gradient-to-b from-black via-black/85 to-transparent z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[12vh] min-h-[56px] bg-gradient-to-t from-black via-black/88 to-transparent z-10"
      />

      {/* Corte de fragmento digital hacia el vacío del Gran Koopa (01:12) */}
      {isGlitchTransition && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-cyan-300/25 mix-blend-screen pv-glitch-flash"
        />
      )}

      {/* Pulso oscuro de la orden del Gran Koopa (01:10) */}
      {isReinicioFlash && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-fuchsia-500/20 mix-blend-screen pv-glitch-flash"
        />
      )}

      {/* Destello del píxel que enciende el título (02:52) */}
      {isFinalLightFlash && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-amber-100/70 transition-opacity duration-300"
        />
      )}

      {/* Tarjeta de Capítulo */}
      {chapterCardVisible && chapterCardOpacity > 0.01 && (
        <div
          className="pointer-events-none absolute left-1/2 top-[16%] z-20 -translate-x-1/2 text-center"
          style={{ opacity: chapterCardOpacity }}
        >
          <div className="pv-chapter-card">
            <span className="pv-chapter-num">{activeChapter.numberLabel}</span>
            <span className="pv-chapter-title">{activeChapter.title}</span>
          </div>
        </div>
      )}

      {/* ESCENA 6 (02:52–02:57): Revelación Monumental del Logotipo */}
      {isScene8TitleVisible && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="pv-title" aria-label="PIXELVERSE">
            {'PIXELVERSE'.split('').map((letter, i) => (
              <span
                key={`${letter}-${i}`}
                className="pv-title-letter"
                style={{ animationDelay: `${i * 0.075}s` }}
              >
                {letter}
              </span>
            ))}
          </h1>
          <p className="pv-title-subtitle">El Reinicio del Universo</p>
          <div className="pv-title-rule" aria-hidden="true" />
          <p className="pv-title-tagline">Los mundos han sido olvidados. La aventura comienza.</p>
        </div>
      )}

      {/* Fundido final suave hacia la pantalla de título del juego */}
      {isFinalBlackFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-500"
        />
      )}

      {/* Subtítulos en-universo con revelado palabra por palabra */}
      {activeSubtitle && !isScene8TitleVisible && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[86px] z-20 flex justify-center px-4 sm:px-6">
          <div className="pv-subtitle-frame w-full max-w-3xl">
            <span className="pv-corner pv-corner-tl" aria-hidden="true" />
            <span className="pv-corner pv-corner-tr" aria-hidden="true" />
            <span className="pv-corner pv-corner-bl" aria-hidden="true" />
            <span className="pv-corner pv-corner-br" aria-hidden="true" />

            <div className="pv-subtitle-header">
              <span>
                CAP {activeChapter.numberLabel} · {activeChapter.title}
              </span>
              <span className="pv-subtitle-time">{formatTimecode(uiTimeSec)}</span>
            </div>
            <p id="cinematic-subtitle" className="pv-subtitle-text">
              {words.map((word, i) => (
                <span
                  key={`${activeSubtitle.id}-${i}`}
                  className={`pv-word ${i < revealedWords ? 'pv-word-on' : ''}`}
                >
                  {word}
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Controles flotantes superiores */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-40 flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => bgmEngine.toggleMute()}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          className="pv-control-btn"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-red-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-cyan-300" />
          )}
        </button>

        <button
          type="button"
          onClick={finishCinematic}
          className="pv-skip-btn"
        >
          <SkipForward className="w-4 h-4" />
          <span>Omitir</span>
        </button>
      </div>

      {/* Superposición de pausa */}
      {isPaused && (
        <button
          type="button"
          onClick={handleTogglePause}
          className="absolute inset-0 z-[45] flex flex-col items-center justify-center gap-3 bg-[#010206]/55 backdrop-blur-[2px] cursor-pointer"
        >
          <span className="pv-pause-badge">
            <Pause className="w-6 h-6" />
            <span>PAUSA</span>
          </span>
          <span className="pv-pause-hint">Espacio o clic para continuar</span>
        </button>
      )}
    </div>
  );
}