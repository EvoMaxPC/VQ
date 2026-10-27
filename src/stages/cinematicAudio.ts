/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banda sonora orquestal original y diseño sonoro diegético en Web Audio para
 * la cinemática de apertura «Cuando el mundo olvidó jugar» (00:00 – 02:30).
 *
 * Progresión musical y emocional:
 * - Escena 1 (00:00–00:18): Silencio de sala vacía, clic mecánico de botón arcade,
 *   nota aislada de piano íntimo y destello eléctrico CRT que se extingue.
 * - Escena 2 (00:18–00:42): Violonchelos graves, pulso analógico y coro lejano;
 *   extracción cristalina y corte a SILENCIO TOTAL en «Y el mundo olvidó cómo jugar».
 * - Escena 3 (00:42–01:05): Cristales de memoria extinguiéndose en el vacío cósmico,
 *   pulso cálido de los 70 y motivo ascendente de piano y cuerdas al formarse el glifo.
 * - Escena 4 (01:05–01:28): Expansión sinfónica con trompas, cuerdas y brisa oceánica
 *   al emerger sobre la Isla del Origen y el santuario de PIXELVERSE.
 * - Escena 5 (01:28–01:52): Engranajes del Cronoscopio, ignición del núcleo y tres
 *   pulsos luminosos secuenciales despertando gabinetes en la isla.
 * - Escena 6 (01:52–02:12): Cruce de portal dimensional, calidez años 70 con citas
 *   musicales auténticas de Pong (1972) y Space Invaders (1978) integradas en la orquesta.
 * - Escena 7 (02:12–02:24): Clímax híbrido orquestal + percusión electrónica en El Sendero Glitch.
 * - Escena 8 (02:24–02:30): Firma sonora original de PIXELVERSE y resolución suspendida.
 */

import { bgmEngine } from '../audio/bgmEngine';

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ScheduledScoreCue {
  id: string;
  timeSec: number;
  run: (engine: CinematicScoreDirector) => void;
}

class CinematicScoreDirector {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWet: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private activeSources: Set<AudioScheduledSourceNode> = new Set();
  private firedCues: Set<string> = new Set();
  private cues: ScheduledScoreCue[] = [];

  constructor() {
    this.buildScoreCueList();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || bgmEngine.isMuted()) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        const ctx = new AudioCtx();
        this.ctx = ctx;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 18;
        comp.ratio.value = 3.5;
        comp.attack.value = 0.008;
        comp.release.value = 0.24;
        comp.connect(ctx.destination);

        const master = ctx.createGain();
        master.gain.value = 0.92;
        master.connect(comp);
        this.masterGain = master;

        const music = ctx.createGain();
        music.gain.value = 1.0;
        music.connect(master);
        this.musicBus = music;

        const sfx = ctx.createGain();
        sfx.gain.value = 1.0;
        sfx.connect(master);
        this.sfxBus = sfx;

        // Reverberación algorítmica de sala sinfónica / salón vacío (2.7s estéreo)
        const irLen = Math.floor(ctx.sampleRate * 2.7);
        const irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
        let seed = 48271;
        for (let ch = 0; ch < 2; ch++) {
          const data = irBuf.getChannelData(ch);
          let lp = 0;
          for (let i = 0; i < irLen; i++) {
            seed = (seed * 16807) % 2147483647;
            const white = (seed / 1073741824) - 1;
            const t = i / ctx.sampleRate;
            const early = i < ctx.sampleRate * 0.045 && i % 420 < 8 ? 0.55 : 1.0;
            const env = Math.pow(1 - t / 2.7, 2.65) * early;
            lp = lp * 0.72 + white * 0.28;
            data[i] = lp * env * 0.5;
          }
        }
        const conv = ctx.createConvolver();
        conv.buffer = irBuf;
        const wet = ctx.createGain();
        wet.gain.value = 0.38;
        conv.connect(wet);
        wet.connect(master);
        this.reverbConvolver = conv;
        this.reverbWet = wet;

        // Buffer reutilizable de ruido blanco (2.0s)
        const nLen = Math.floor(ctx.sampleRate * 2.0);
        const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
        const nData = nBuf.getChannelData(0);
        for (let i = 0; i < nLen; i++) {
          seed = (seed * 16807) % 2147483647;
          nData[i] = (seed / 1073741824) - 1;
        }
        this.noiseBuffer = nBuf;
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public unlock(): void {
    this.ensureContext();
  }

  private track(node: AudioScheduledSourceNode): void {
    this.activeSources.add(node);
    node.onended = () => {
      this.activeSources.delete(node);
    };
  }

  public resetTimeline(fromSec = 0): void {
    this.stopAll();
    this.firedCues.clear();
    for (const cue of this.cues) {
      if (cue.timeSec < fromSec - 0.12) {
        this.firedCues.add(cue.id);
      }
    }
    if (this.ctx && this.musicBus && this.masterGain) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(1.0, now);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0.92, now);
    }
  }

  public stopAll(): void {
    const list = Array.from(this.activeSources);
    this.activeSources.clear();
    for (const src of list) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Fuente ya detenida
      }
    }
  }

  public syncTimeline(elapsedSec: number, isPaused: boolean): void {
    if (isPaused || bgmEngine.isMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state !== 'running') {
      for (const cue of this.cues) {
        if (elapsedSec - cue.timeSec > 0.8) {
          this.firedCues.add(cue.id);
        }
      }
      return;
    }

    for (const cue of this.cues) {
      if (elapsedSec >= cue.timeSec && !this.firedCues.has(cue.id)) {
        this.firedCues.add(cue.id);
        // Evitar disparar cues muy atrasados si hubo salto brusco de pestaña
        if (elapsedSec - cue.timeSec <= 1.25) {
          cue.run(this);
        }
      }
    }
  }

  /* =========================================================================
     INSTRUMENTOS ORQUESTALES Y DISEÑO SONORO DIEGÉTICO
     ========================================================================= */

  public playFeltPiano(midi: number, dur: number, vel = 0.08, delay = 0, pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;
    const freq = midiToHz(midi);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, t0);
    panner.connect(this.musicBus);
    if (this.reverbConvolver) panner.connect(this.reverbConvolver);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vel, t0 + 0.016);
    env.gain.exponentialRampToValueAtTime(vel * 0.42, t0 + Math.min(0.45, dur * 0.3));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    env.connect(panner);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t0);
    osc1.connect(env);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t0);
    osc2.detune.setValueAtTime(2.5, t0);
    g2.gain.setValueAtTime(0.24, t0);
    g2.gain.exponentialRampToValueAtTime(0.01, t0 + dur * 0.55);
    osc2.connect(g2);
    g2.connect(env);

    this.track(osc1);
    this.track(osc2);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + dur + 0.05);
    osc2.stop(t0 + dur + 0.05);

    // Suave golpe de fieltro del macillo
    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(780, t0);
      bp.Q.value = 1.8;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vel * 0.22, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(panner);
      this.track(n);
      n.start(t0);
      n.stop(t0 + 0.032);
    }
  }

  public playStringChord(
    midis: number[],
    dur: number,
    vel = 0.045,
    attack = 1.1,
    delay = 0,
    brightness = 1350
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;

    midis.forEach((midi, idx) => {
      const freq = midiToHz(midi);
      const panVal = midis.length > 1 ? -0.45 + (idx / (midis.length - 1)) * 0.9 : 0;
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, t0);
      panner.connect(this.musicBus!);
      if (this.reverbConvolver) panner.connect(this.reverbConvolver);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(brightness * 0.45, t0);
      filter.frequency.linearRampToValueAtTime(brightness, t0 + attack);
      filter.frequency.exponentialRampToValueAtTime(brightness * 0.52, t0 + dur);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(vel, t0 + attack);
      env.gain.setValueAtTime(vel * 0.88, Math.max(t0 + attack, t0 + dur * 0.68));
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      filter.connect(env);
      env.connect(panner);

      [-6, 6].forEach((det) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t0);
        osc.detune.setValueAtTime(det, t0);
        osc.connect(filter);
        this.track(osc);
        osc.start(t0);
        osc.stop(t0 + dur + 0.06);
      });
    });
  }

  public playFrenchHorn(midi: number, dur: number, vel = 0.065, attack = 0.45, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;
    const freq = midiToHz(midi);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(320, t0);
    filter.frequency.exponentialRampToValueAtTime(980, t0 + attack);
    filter.frequency.exponentialRampToValueAtTime(480, t0 + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vel, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    filter.connect(env);
    env.connect(this.musicBus);
    if (this.reverbConvolver) env.connect(this.reverbConvolver);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t0);
    osc1.connect(filter);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t0);
    osc2.detune.setValueAtTime(-4, t0);
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    osc2.connect(g2);
    g2.connect(filter);

    this.track(osc1);
    this.track(osc2);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + dur + 0.05);
    osc2.stop(t0 + dur + 0.05);
  }

  public playChoirPad(midis: number[], dur: number, vel = 0.035, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;

    midis.forEach((midi, idx) => {
      const freq = midiToHz(midi);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(vel, t0 + dur * 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      if (this.reverbConvolver) env.connect(this.reverbConvolver);
      env.connect(this.musicBus!);

      // Formantes vocales "Ahh / Ohh"
      [680, 1150].forEach((formantHz) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(formantHz, t0);
        bp.Q.value = 3.2;
        bp.connect(env);

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t0);
        osc.detune.setValueAtTime((idx % 2 === 0 ? 1 : -1) * 7, t0);
        osc.connect(bp);
        this.track(osc);
        osc.start(t0);
        osc.stop(t0 + dur + 0.08);
      });
    });
  }

  public playCelestaChime(midi: number, dur: number, vel = 0.05, delay = 0, pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;
    const freq = midiToHz(midi);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, t0);
    panner.connect(this.musicBus);
    if (this.reverbConvolver) panner.connect(this.reverbConvolver);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vel, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    env.connect(panner);

    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(freq, t0);
    o1.connect(env);

    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 2.756, t0);
    g2.gain.setValueAtTime(0.22, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + dur * 0.25);
    o2.connect(g2);
    g2.connect(env);

    this.track(o1);
    this.track(o2);
    o1.start(t0);
    o2.start(t0);
    o1.stop(t0 + dur + 0.04);
    o2.stop(t0 + dur + 0.04);
  }

  public playTaikoImpact(vel = 0.16, subHz = 56, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(subHz * 1.9, t0);
    osc.frequency.exponentialRampToValueAtTime(subHz * 0.52, t0 + 0.65);
    g.gain.setValueAtTime(vel, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.15);
    osc.connect(g);
    g.connect(this.sfxBus);
    if (this.reverbConvolver) g.connect(this.reverbConvolver);
    this.track(osc);
    osc.start(t0);
    osc.stop(t0 + 1.2);

    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(340, t0);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vel * 0.55, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      n.connect(lp);
      lp.connect(ng);
      ng.connect(this.sfxBus);
      this.track(n);
      n.start(t0);
      n.stop(t0 + 0.2);
    }
  }

  public playEmptyRoomHum(dur: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    // Zumbido eléctrico leve de transformador en sala vacía (60Hz + 120Hz muy sutil)
    [60, 120].forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, t0);
      const peak = idx === 0 ? 0.018 : 0.008;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 1.4);
      g.gain.setValueAtTime(peak, t0 + dur - 1.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.sfxBus!);
      this.track(osc);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });
  }

  public playArcadeButtonClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus || !this.noiseBuffer) return;
    const t0 = ctx.currentTime;

    // Microswitch arcade: clic de presión + retorno del resorte, con eco en la sala vacía
    [
      { dt: 0, bpHz: 1850, gain: 0.14 },
      { dt: 0.11, bpHz: 1320, gain: 0.075 },
    ].forEach(({ dt, bpHz, gain }) => {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer!;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(bpHz, t0 + dt);
      bp.Q.value = 4.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.032);
      n.connect(bp);
      bp.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      this.track(n);
      n.start(t0 + dt);
      n.stop(t0 + dt + 0.04);
    });
  }

  public playCrtPixelExtinguish(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    // Breve chisporroteo de cátodo CRT y extinción del último píxel blanco
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3400, t0);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.35);
    g.gain.setValueAtTime(0.026, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(g);
    g.connect(this.sfxBus);
    if (this.reverbConvolver) g.connect(this.reverbConvolver);
    this.track(osc);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  }

  public playCrtPowerOn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    // Encendido del televisor de tubo: silbido que sube y chisporroteo breve
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(2600, t0 + 0.85);
    osc.frequency.exponentialRampToValueAtTime(900, t0 + 1.6);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.028, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7);
    osc.connect(g);
    g.connect(this.sfxBus);
    if (this.reverbConvolver) g.connect(this.reverbConvolver);
    this.track(osc);
    osc.start(t0);
    osc.stop(t0 + 1.75);

    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1800, t0);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.linearRampToValueAtTime(0.02, t0 + 0.35);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      n.connect(hp);
      hp.connect(ng);
      ng.connect(this.sfxBus);
      this.track(n);
      n.start(t0);
      n.stop(t0 + 1.25);
    }
  }

  public playPongBlip(pitch = 490, vel = 0.034): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.92, t0 + 0.07);
    g.gain.setValueAtTime(vel, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(g);
    g.connect(this.sfxBus);
    if (this.reverbConvolver) g.connect(this.reverbConvolver);
    this.track(osc);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }

  public playPortalSweep(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    [220, 330, 440].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = idx === 1 ? 'triangle' : 'sine';
      filter.type = 'bandpass';
      filter.Q.value = 2.4;
      filter.frequency.setValueAtTime(300, t0);
      filter.frequency.exponentialRampToValueAtTime(1600, t0 + 0.85);
      filter.frequency.exponentialRampToValueAtTime(420, t0 + 1.8);
      osc.frequency.setValueAtTime(f * 0.85, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + 0.9);
      osc.frequency.exponentialRampToValueAtTime(f, t0 + 1.8);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.055, t0 + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.85);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      this.track(osc);
      osc.start(t0);
      osc.stop(t0 + 1.9);
    });
  }

  public playRetroArcadeEchoes(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    // Cita auténtica y sutil de Pong (1972) bañada en reverberación de salón
    [
      { dt: 0.0, f: 490 },
      { dt: 0.42, f: 245 },
      { dt: 0.84, f: 490 },
      { dt: 1.24, f: 980 },
    ].forEach(({ dt, f }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t0 + dt);
      g.gain.setValueAtTime(0.018, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.075);
      osc.connect(g);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      g.connect(this.sfxBus!);
      this.track(osc);
      osc.start(t0 + dt);
      osc.stop(t0 + dt + 0.085);
    });

    // Pulso descendente de Space Invaders (1978)
    [98.0, 87.31, 82.41, 73.42].forEach((f, idx) => {
      const dt = 2.1 + idx * 0.36;
      const osc = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(280, t0 + dt);
      osc.frequency.setValueAtTime(f, t0 + dt);
      g.gain.setValueAtTime(0.032, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.16);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      this.track(osc);
      osc.start(t0 + dt);
      osc.stop(t0 + dt + 0.18);
    });
  }

  public playPixelverseSignature(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime;

    // Firma sonora original de PIXELVERSE: cálida, analógica y cristalina (D5 - A5 - E6 - F#6)
    const signatureMidis = [74, 81, 88, 90];
    signatureMidis.forEach((m, idx) => {
      const dt = idx * 0.14;
      this.playCelestaChime(m, 3.6 - dt, 0.072, dt, (idx - 1.5) * 0.22);
      this.playFeltPiano(m - 12, 3.8 - dt, 0.055, dt, (1.5 - idx) * 0.15);
    });

    // Resolución orquestal con nota final suspendida llena de misterio (D2 + A2 + A3 + E4 + A4)
    this.playStringChord([38, 45, 57, 64, 69], 5.4, 0.052, 0.85, 0.25, 1650);
    this.playFrenchHorn(50, 4.8, 0.058, 0.65, 0.3);
    this.playChoirPad([62, 69, 76], 5.2, 0.032, 0.4);
  }

  public enforceTotalSilenceWindow(durationSec: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const now = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    this.musicBus.gain.setValueAtTime(0.0001, now + Math.max(0.5, durationSec - 0.25));
    this.musicBus.gain.linearRampToValueAtTime(1.0, now + durationSec + 0.35);
  }

  /* =========================================================================
     PARTITURA SINCRONIZADA DE 210 SEGUNDOS (00:00 – 03:30)
     ========================================================================= */

  private buildScoreCueList(): void {
    this.cues = [
      // --- CAP. 1 (00:00 - 00:32): Cuando todos los juegos todavía existían ---
      {
        id: 's1-crt-on',
        timeSec: 0.2,
        run: (e) => {
          e.playEmptyRoomHum(6.6);
          e.playCrtPowerOn();
        },
      },
      {
        id: 's1-memory-theme',
        timeSec: 5.7,
        run: (e) => {
          e.playStringChord([38, 45, 54, 62], 7.4, 0.042, 1.2, 0, 1900);
          [62, 66, 69, 74, 78].forEach((m, i) => {
            e.playFeltPiano(m, 3.4, 0.062, i * 0.72, -0.25 + i * 0.12);
          });
          e.playCelestaChime(86, 3.2, 0.038, 0.9, 0.2);
        },
      },
      {
        id: 's1-nostalgia-b',
        timeSec: 12.4,
        run: (e) => {
          e.playStringChord([35, 42, 50, 59], 7.2, 0.044, 1.1, 0, 2000);
          e.playChoirPad([62, 66, 71], 5.8, 0.026, 0.5);
          [67, 71, 74, 78].forEach((m, i) => {
            e.playFeltPiano(m, 3.2, 0.058, i * 0.85, 0.22 - i * 0.1);
          });
        },
      },
      {
        id: 's1-arcade-arrival',
        timeSec: 16.5,
        run: (e) => {
          e.playArcadeButtonClick();
          e.playStringChord([40, 47, 55, 64], 7.8, 0.046, 1.0, 0, 2000);
          [64, 67, 71, 76, 79].forEach((m, i) => {
            e.playCelestaChime(m, 2.4, 0.042, 0.4 + i * 0.55, -0.35 + i * 0.18);
          });
        },
      },
      {
        id: 's1-joystick',
        timeSec: 20.2,
        run: (e) => e.playArcadeButtonClick(),
      },
      {
        id: 's1-defect',
        timeSec: 23.2,
        run: (e) => {
          e.playCrtPixelExtinguish();
          e.enforceTotalSilenceWindow(1.1);
        },
      },
      {
        id: 's1-shadow',
        timeSec: 26.2,
        run: (e) => {
          e.playTaikoImpact(0.12, 48, 0);
          e.playStringChord([34, 41, 46, 53], 6.2, 0.05, 1.0, 0, 950);
          [74, 71, 69, 65].forEach((m, i) => {
            e.playCelestaChime(m, 2.8, 0.038, 0.35 + i * 0.7, -0.3 + i * 0.2);
          });
        },
      },
      {
        id: 's1-last-light',
        timeSec: 30.2,
        run: (e) => {
          e.playTaikoImpact(0.16, 44, 0);
          e.playStringChord([31, 38, 43, 50], 4.4, 0.056, 0.8, 0, 780);
        },
      },

      // --- CAP. 2 (00:32 - 01:12): El Gran Koopa convoca a los villanos ---
      {
        id: 's2-hard-cut',
        timeSec: 32.1,
        run: (e) => {
          e.enforceTotalSilenceWindow(1.9);
          e.playTaikoImpact(0.2, 40, 0.2);
        },
      },
      {
        id: 's2-koopa-theme',
        timeSec: 34.2,
        run: (e) => {
          e.playStringChord([26, 33, 38, 45], 7.8, 0.056, 1.6, 0, 820);
          e.playChoirPad([50, 53, 57], 7.4, 0.032, 0.4);
          e.playFrenchHorn(38, 5.6, 0.058, 0.7, 0.2);
        },
      },
      {
        id: 's2-portal-1',
        timeSec: 37.5,
        run: (e) => e.playPortalSweep(),
      },
      {
        id: 's2-portal-2',
        timeSec: 39.5,
        run: (e) => e.playPortalSweep(),
      },
      {
        id: 's2-portal-3',
        timeSec: 41.5,
        run: (e) => e.playPortalSweep(),
      },
      {
        id: 's2-march',
        timeSec: 42.8,
        run: (e) => {
          e.playStringChord([34, 41, 46, 53], 9.5, 0.052, 1.4, 0, 900);
          e.playFrenchHorn(46, 4.8, 0.062, 0.6, 0.3);
          for (let i = 0; i < 9; i++) {
            e.playTaikoImpact(0.1, i % 3 === 0 ? 42 : 50, i * 1.65);
          }
        },
      },
      {
        id: 's2-doubt',
        timeSec: 55.5,
        run: (e) => {
          e.playStringChord([33, 40, 45, 52], 7.4, 0.05, 1.3, 0, 1050);
          e.playChoirPad([57, 60, 64], 6.6, 0.03, 0.3);
          e.playFeltPiano(69, 3.4, 0.055, 0.8, -0.2);
          e.playFeltPiano(67, 3.6, 0.05, 3.4, 0.2);
        },
      },
      {
        id: 's2-silence',
        timeSec: 61.0,
        run: (e) => e.enforceTotalSilenceWindow(3.5),
      },
      {
        id: 's2-plan',
        timeSec: 64.8,
        run: (e) => {
          e.playTaikoImpact(0.15, 38, 0);
          e.playStringChord([31, 38, 43, 50], 5.4, 0.054, 0.7, 0, 950);
          e.playFrenchHorn(43, 4.2, 0.058, 0.45, 0.2);
          [75, 79, 82].forEach((m, i) => {
            e.playCelestaChime(m, 2.6, 0.04, 0.5 + i * 0.4, -0.2 + i * 0.2);
          });
        },
      },
      {
        id: 's2-erase',
        timeSec: 69.6,
        run: (e) => {
          e.playTaikoImpact(0.24, 34, 0);
          e.playStringChord([24, 31, 36, 48, 55], 4.6, 0.072, 0.35, 0, 1400);
          e.playChoirPad([48, 52, 55, 60], 4.4, 0.04, 0.2);
          e.playFrenchHorn(36, 4.2, 0.07, 0.3, 0.1);
        },
      },
      {
        id: 's2-ignite',
        timeSec: 70.3,
        run: (e) => {
          e.playPortalSweep();
          e.playTaikoImpact(0.2, 40, 0.3);
        },
      },

      // --- CAP. 3 (01:12 - 01:36): La creación del Reinicio Cero ---
      {
        id: 's3-structure',
        timeSec: 72.2,
        run: (e) => {
          e.playStringChord([24, 36, 43, 48, 55], 8.4, 0.062, 1.5, 0, 1250);
          e.playChoirPad([48, 55, 60], 8.2, 0.036, 0.4);
          e.playTaikoImpact(0.18, 38, 0.1);
        },
      },
      {
        id: 's3-super-cupa',
        timeSec: 75.2,
        run: (e) => {
          e.playStringChord([26, 38, 45, 50, 56], 7.2, 0.066, 1.1, 0, 1700);
          e.playFrenchHorn(38, 5.4, 0.068, 0.55, 0.2);
          e.playChoirPad([50, 56, 62], 6.8, 0.034, 0.3);
          [62, 74, 86].forEach((m, i) => {
            e.playCelestaChime(m, 3.4, 0.048, i * 0.6, (i - 1) * 0.2);
          });
        },
      },
      {
        id: 's3-wave',
        timeSec: 80.3,
        run: (e) => {
          e.playTaikoImpact(0.22, 36, 0);
          e.playStringChord([30, 37, 42, 49], 8.4, 0.058, 1.0, 0, 900);
          e.playPortalSweep();
          [86, 81, 76, 72, 67, 62].forEach((m, i) => {
            e.playCelestaChime(m, 2.6, 0.034, 0.35 + i * 0.55, 0.4 - i * 0.14);
          });
        },
      },
      {
        id: 's3-corruption',
        timeSec: 84.2,
        run: (e) => {
          for (let i = 0; i < 8; i++) {
            e.playTaikoImpact(0.09 + i * 0.012, i % 2 === 0 ? 44 : 36, i * 0.52);
          }
          e.playStringChord([25, 32, 37, 44, 49], 6.4, 0.064, 0.8, 0, 1150);
        },
      },
      {
        id: 's3-date',
        timeSec: 89.5,
        run: (e) => {
          e.playTaikoImpact(0.24, 32, 0);
          e.playStringChord([26, 33, 38, 50], 6.6, 0.072, 0.9, 0, 1500);
          e.playChoirPad([50, 57, 62, 69], 6.2, 0.042, 0.4);
          e.playFrenchHorn(38, 5.8, 0.07, 0.5, 0.3);
        },
      },
      {
        id: 's3-silence',
        timeSec: 94.0,
        run: (e) => {
          e.playTaikoImpact(0.2, 34, 0);
          e.enforceTotalSilenceWindow(2.1);
        },
      },

      // --- CAP. 4 (01:36 - 02:06): El mundo olvida ---
      {
        id: 's4-empty-hall',
        timeSec: 96.2,
        run: (e) => {
          e.playEmptyRoomHum(13.5);
          e.playFeltPiano(57, 4.4, 0.05, 0.6, -0.2);
          e.playFeltPiano(60, 4.8, 0.045, 3.2, 0.18);
        },
      },
      {
        id: 's4-elegy',
        timeSec: 100.4,
        run: (e) => {
          e.playStringChord([33, 45, 52, 57], 8.2, 0.05, 1.4, 0, 1100);
          [69, 64, 60, 57].forEach((m, i) => {
            e.playFeltPiano(m, 3.4, 0.056, i * 1.05, 0.2 - i * 0.12);
          });
        },
      },
      {
        id: 's4-child',
        timeSec: 103.6,
        run: (e) => {
          e.playCelestaChime(84, 2.2, 0.03, 0, 0.1);
          e.playCelestaChime(88, 2.6, 0.026, 0.8, 0.2);
        },
      },
      {
        id: 's4-emptiness',
        timeSec: 108.2,
        run: (e) => {
          e.playStringChord([31, 43, 50, 55], 8.4, 0.052, 1.3, 0, 1000);
          e.playChoirPad([55, 60, 67], 7.6, 0.028, 0.3);
          e.playFeltPiano(74, 3.2, 0.045, 1.1, -0.25);
        },
      },
      {
        id: 's4-bedroom',
        timeSec: 112.2,
        run: (e) => {
          e.playStringChord([38, 45, 53, 60], 7.8, 0.048, 1.2, 0, 1200);
          [62, 65, 69, 74].forEach((m, i) => {
            e.playFeltPiano(m, 3.0, 0.052, i * 0.9, -0.3 + i * 0.2);
          });
          e.playCelestaChime(81, 2.8, 0.03, 1.2, 0.2);
        },
      },
      {
        id: 's4-wave',
        timeSec: 118.4,
        run: (e) => {
          e.playTaikoImpact(0.16, 42, 0);
          e.playStringChord([30, 36, 42, 48], 6.6, 0.058, 0.8, 0, 850);
          [81, 77, 72, 67, 62, 57].forEach((m, i) => {
            e.playCelestaChime(m, 2.2, 0.03, i * 0.4, 0.3 - i * 0.1);
          });
        },
      },
      {
        id: 's4-fade',
        timeSec: 123.6,
        run: (e) => e.enforceTotalSilenceWindow(2.6),
      },

      // --- CAP. 5 (02:06 - 02:32): La isla que no fue alcanzada ---
      {
        id: 's5-island',
        timeSec: 126.2,
        run: (e) => {
          e.playTaikoImpact(0.14, 48, 0);
          e.playStringChord([38, 45, 54, 62], 8.6, 0.056, 1.5, 0, 1950);
          e.playChoirPad([62, 66, 69], 8.2, 0.032, 0.5);
          e.playFrenchHorn(50, 5.2, 0.062, 0.6, 0.2);
        },
      },
      {
        id: 's5-wave-arrives',
        timeSec: 131.4,
        run: (e) => {
          e.playTaikoImpact(0.18, 40, 0);
          e.playStringChord([36, 43, 48, 55], 6.8, 0.056, 1.0, 0, 900);
          for (let i = 0; i < 6; i++) {
            e.playTaikoImpact(0.09, 46, 0.8 + i * 0.85);
          }
        },
      },
      {
        id: 's5-dissolve',
        timeSec: 137.2,
        run: (e) => {
          e.playStringChord([43, 50, 59, 66], 8.4, 0.058, 1.2, 0, 2050);
          e.playChoirPad([59, 66, 71], 7.8, 0.032, 0.4);
          [86, 90, 93, 90].forEach((m, i) => {
            e.playCelestaChime(m, 3.0, 0.042, i * 0.85, -0.3 + i * 0.2);
          });
        },
      },
      {
        id: 's5-glimmer',
        timeSec: 143.4,
        run: (e) => {
          e.playCelestaChime(88, 4.4, 0.034, 0, 0.1);
          e.playCelestaChime(91, 4.0, 0.03, 0.9, -0.1);
          e.playFeltPiano(74, 4.2, 0.042, 0.4, 0.2);
        },
      },
      {
        id: 's5-rise',
        timeSec: 148.0,
        run: (e) => {
          e.playStringChord([38, 45, 54, 62, 69], 6.4, 0.06, 1.1, 0, 2100);
          e.playFrenchHorn(57, 5.0, 0.066, 0.5, 0.3);
          e.playChoirPad([62, 69, 74], 5.8, 0.034, 0.2);
        },
      },
      {
        id: 's5-fade',
        timeSec: 150.4,
        run: (e) => e.enforceTotalSilenceWindow(2.0),
      },

      // --- CAP. 6 (02:32 - 03:00): Después del silencio ---
      {
        id: 's6-signal',
        timeSec: 152.3,
        run: (e) => {
          e.playEmptyRoomHum(7.2);
          e.playCelestaChime(96, 3.2, 0.018, 0.4, 0);
        },
      },
      {
        id: 's6-pixel',
        timeSec: 152.9,
        run: (e) => {
          e.playCelestaChime(90, 3.0, 0.024, 0, -0.1);
          e.playCelestaChime(93, 2.6, 0.02, 0.7, 0.1);
        },
      },
      {
        id: 's6-build',
        timeSec: 155.2,
        run: (e) => {
          e.playCelestaChime(86, 3.0, 0.03, 0, -0.2);
          e.playCelestaChime(90, 3.2, 0.028, 0.6, 0.2);
          e.playFeltPiano(62, 3.4, 0.04, 0.4, 0);
        },
      },
      {
        id: 's6-identity',
        timeSec: 158.0,
        run: (e) => {
          e.playStringChord([38, 45, 54, 62], 8.6, 0.046, 1.6, 0, 1900);
          e.playChoirPad([62, 69, 74], 8.0, 0.03, 0.4);
          [62, 66, 69, 74].forEach((m, i) => {
            e.playFeltPiano(m, 3.4, 0.054, i * 1.05, -0.25 + i * 0.16);
          });
        },
      },
      {
        id: 's6-voice',
        timeSec: 162.0,
        run: (e) => {
          e.playFeltPiano(69, 3.2, 0.045, 0, -0.1);
          e.playFeltPiano(72, 3.2, 0.04, 1.4, 0.15);
        },
      },
      {
        id: 's6-step',
        timeSec: 167.2,
        run: (e) => {
          e.playTaikoImpact(0.1, 62, 0);
          e.playCelestaChime(93, 2.6, 0.038, 0.1, 0);
        },
      },
      {
        id: 's6-title',
        timeSec: 172.2,
        run: (e) => {
          e.playTaikoImpact(0.16, 44, 0);
          e.playPixelverseSignature();
        },
      },
      {
        id: 's6-fade',
        timeSec: 177.0,
        run: (e) => e.enforceTotalSilenceWindow(2.4),
      },

      // --- CAP. 7 (03:00 - 03:14): Una pelota en la oscuridad ---
      {
        id: 's7-signal',
        timeSec: 180.1,
        run: (e) => {
          e.playEmptyRoomHum(7.5);
          e.playCelestaChime(96, 2.8, 0.016, 0, 0);
        },
      },
      {
        id: 's7-bip-1',
        timeSec: 181.6,
        run: (e) => e.playPongBlip(490),
      },
      {
        id: 's7-bip-2',
        timeSec: 183.4,
        run: (e) => e.playPongBlip(245, 0.03),
      },
      {
        id: 's7-bip-3',
        timeSec: 185.2,
        run: (e) => e.playPongBlip(490),
      },
      {
        id: 's7-crush',
        timeSec: 187.0,
        run: (e) => {
          e.playPongBlip(160, 0.05);
          e.playTaikoImpact(0.12, 72, 0);
          e.playArcadeButtonClick();
        },
      },
      {
        id: 's7-bip-4',
        timeSec: 188.8,
        run: (e) => e.playPongBlip(245, 0.028),
      },
      {
        id: 's7-bip-5',
        timeSec: 190.6,
        run: (e) => e.playPongBlip(490),
      },
      {
        id: 's7-dodge',
        timeSec: 192.4,
        run: (e) => {
          e.playPongBlip(245, 0.03);
          e.playArcadeButtonClick();
        },
      },
      {
        id: 's7-bip-6',
        timeSec: 193.4,
        run: (e) => e.playPongBlip(490),
      },

      // --- CAP. 8 (03:14 - 03:23): El primer desafío ---
      {
        id: 's8-rally-1',
        timeSec: 194.5,
        run: (e) => e.playPongBlip(490),
      },
      {
        id: 's8-rally-2',
        timeSec: 195.3,
        run: (e) => e.playPongBlip(245, 0.03),
      },
      {
        id: 's8-rally-3',
        timeSec: 196.1,
        run: (e) => e.playPongBlip(490),
      },
      {
        id: 's8-rally-4',
        timeSec: 196.9,
        run: (e) => e.playPongBlip(245, 0.03),
      },
      {
        id: 's8-win',
        timeSec: 197.7,
        run: (e) => {
          e.playPongBlip(980, 0.04);
          e.playTaikoImpact(0.14, 52, 0);
          e.playStringChord([38, 45, 54, 62], 6.4, 0.06, 0.9, 0, 2000);
          [74, 78, 81, 86].forEach((m, i) => {
            e.playCelestaChime(m, 2.8, 0.05, i * 0.3, -0.3 + i * 0.2);
            e.playFeltPiano(m - 12, 2.6, 0.048, i * 0.3, 0.2 - i * 0.12);
          });
        },
      },
      {
        id: 's8-water',
        timeSec: 199.4,
        run: (e) => {
          e.playChoirPad([62, 69, 74], 5.6, 0.032, 0.2);
          e.playCelestaChime(81, 3.4, 0.038, 0.2, -0.2);
          e.playCelestaChime(86, 3.2, 0.034, 1.2, 0.2);
        },
      },
      {
        id: 's8-mount',
        timeSec: 201.5,
        run: (e) => {
          e.playTaikoImpact(0.12, 54, 0);
          e.playPortalSweep();
          e.playCelestaChime(93, 3.0, 0.04, 0.4, 0);
        },
      },

      // --- CAP. 9 (03:23 - 03:30): Comienza la aventura ---
      {
        id: 's9-adventure',
        timeSec: 203.2,
        run: (e) => {
          e.playTaikoImpact(0.17, 46, 0);
          e.playStringChord([38, 45, 54, 62, 69], 6.6, 0.064, 1.0, 0, 2200);
          e.playFrenchHorn(50, 3.0, 0.064, 0.4, 0.4);
          e.playFrenchHorn(57, 3.4, 0.068, 0.4, 2.6);
          e.playChoirPad([62, 69, 74, 78], 6.0, 0.036, 0.3);
          [62, 69, 74, 78].forEach((m, i) => {
            e.playCelestaChime(m + 12, 2.2, 0.038, i * 0.55, -0.3 + i * 0.2);
          });
        },
      },
      {
        id: 's9-sky-pixel',
        timeSec: 207.2,
        run: (e) => {
          e.playCelestaChime(93, 2.0, 0.03, 0, 0.15);
          e.playCelestaChime(98, 1.6, 0.022, 0.4, -0.1);
        },
      },
      {
        id: 's9-final',
        timeSec: 208.2,
        run: (e) => {
          e.playStringChord([38, 45, 57, 64, 69], 2.6, 0.06, 0.6, 0, 2000);
          e.playFrenchHorn(45, 2.4, 0.062, 0.4, 0.2);
        },
      },
    ];
  }

}

export const cinematicAudio = new CinematicScoreDirector();
