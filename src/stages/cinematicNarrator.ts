/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guion cronometrado, capítulos y dirección de voz en español para
 * la cinemática de apertura «El Reinicio del Universo» (03:30 / 210s).
 */

import { Howler } from 'howler';
import { bgmEngine } from '../audio/bgmEngine';

export interface CinematicSceneChapter {
  index: number;
  id: string;
  numberLabel: string;
  title: string;
  startSec: number;
  endSec: number;
}

export interface CinematicNarrationBeat {
  id: string;
  sceneIndex: number;
  startSec: number;
  endSec: number;
  subtitle: string;
  speechText: string;
  rate?: number;
  pitch?: number;
}

export const TOTAL_CINEMATIC_DURATION_SEC = 210.0;

export const CINEMATIC_SCENE_CHAPTERS: CinematicSceneChapter[] = [
  {
    index: 0,
    id: 'all-games-existed',
    numberLabel: '01',
    title: 'Cuando todos los juegos todavía existían',
    startSec: 0,
    endSec: 32,
  },
  {
    index: 1,
    id: 'gran-koopa-assembly',
    numberLabel: '02',
    title: 'El Gran Koopa convoca a los villanos',
    startSec: 32,
    endSec: 72,
  },
  {
    index: 2,
    id: 'reinicio-cero',
    numberLabel: '03',
    title: 'La creación del Reinicio Cero',
    startSec: 72,
    endSec: 96,
  },
  {
    index: 3,
    id: 'world-forgets',
    numberLabel: '04',
    title: 'El mundo olvida',
    startSec: 96,
    endSec: 126,
  },
  {
    index: 4,
    id: 'island-untouched',
    numberLabel: '05',
    title: 'La isla que no fue alcanzada',
    startSec: 126,
    endSec: 152,
  },
  {
    index: 5,
    id: 'after-silence',
    numberLabel: '06',
    title: 'Después del silencio',
    startSec: 152,
    endSec: 180,
  },
  {
    index: 6,
    id: 'ball-in-darkness',
    numberLabel: '07',
    title: 'Una pelota en la oscuridad',
    startSec: 180,
    endSec: 194,
  },
  {
    index: 7,
    id: 'first-challenge',
    numberLabel: '08',
    title: 'El primer desafío',
    startSec: 194,
    endSec: 203,
  },
  {
    index: 8,
    id: 'adventure-begins',
    numberLabel: '09',
    title: 'Comienza la aventura',
    startSec: 203,
    endSec: 210,
  },
];

export const CINEMATIC_NARRATION_BEATS: CinematicNarrationBeat[] = [
  // Escena 1 (00:00 - 00:32)
  {
    id: 'sc1-a',
    sceneIndex: 0,
    startSec: 4.6,
    endSec: 9.6,
    subtitle: 'Hubo un tiempo en que cada pantalla era una puerta.',
    speechText: 'Hubo un tiempo en que cada pantalla era una puerta.',
    rate: 0.88,
    pitch: 0.86,
  },
  {
    id: 'sc1-b',
    sceneIndex: 0,
    startSec: 10.4,
    endSec: 16.2,
    subtitle:
      'Detrás de cada puerta existía un mundo. Mundos de aventuras, desafíos imposibles, héroes extraordinarios y villanos que jamás aceptaban la derrota.',
    speechText:
      'Detrás de cada puerta existía un mundo. Mundos de aventuras, desafíos imposibles, héroes extraordinarios y villanos que jamás aceptaban la derrota.',
    rate: 0.89,
    pitch: 0.86,
  },
  {
    id: 'sc1-c',
    sceneIndex: 0,
    startSec: 17.2,
    endSec: 24.2,
    subtitle: 'Durante generaciones, millones de jugadores dieron vida a esos universos.',
    speechText: 'Durante generaciones, millones de jugadores dieron vida a esos universos.',
    rate: 0.88,
    pitch: 0.85,
  },
  {
    id: 'sc1-d',
    sceneIndex: 0,
    startSec: 25.2,
    endSec: 30.6,
    subtitle: 'Y mientras alguien recordara sus historias, ningún mundo estaría realmente perdido.',
    speechText: 'Y mientras alguien recordara sus historias, ningún mundo estaría realmente perdido.',
    rate: 0.87,
    pitch: 0.84,
  },

  // Escena 2 (00:32 - 01:12)
  {
    id: 'sc2-a',
    sceneIndex: 1,
    startSec: 37.4,
    endSec: 42.4,
    subtitle: 'Durante demasiado tiempo hemos vivido bajo las reglas de otros.',
    speechText: 'Durante demasiado tiempo hemos vivido bajo las reglas de otros.',
    rate: 0.86,
    pitch: 0.62,
  },
  {
    id: 'sc2-b',
    sceneIndex: 1,
    startSec: 43.0,
    endSec: 48.2,
    subtitle: 'Ellos juegan. Ellos ganan. Ellos deciden cuándo termina nuestra historia.',
    speechText: 'Ellos juegan. Ellos ganan. Ellos deciden cuándo termina nuestra historia.',
    rate: 0.85,
    pitch: 0.6,
  },
  {
    id: 'sc2-c',
    sceneIndex: 1,
    startSec: 48.8,
    endSec: 54.8,
    subtitle:
      'Y cuando finalmente caemos, simplemente vuelven a empezar. Otra vez. Y otra vez. Como si nunca hubiéramos existido.',
    speechText:
      'Y cuando finalmente caemos, simplemente vuelven a empezar. Otra vez. Y otra vez. Como si nunca hubiéramos existido.',
    rate: 0.86,
    pitch: 0.6,
  },
  {
    id: 'sc2-d',
    sceneIndex: 1,
    startSec: 55.8,
    endSec: 60.2,
    subtitle: 'Pero ¿qué ocurriría si ya no pudieran recordar quiénes somos?',
    speechText: 'Pero ¿qué ocurriría si ya no pudieran recordar quiénes somos?',
    rate: 0.85,
    pitch: 0.62,
  },
  {
    id: 'sc2-e',
    sceneIndex: 1,
    startSec: 60.8,
    endSec: 65.8,
    subtitle:
      '¿Qué ocurriría si olvidaran nuestros mundos, nuestras batallas y hasta el motivo por el que alguna vez encendieron una pantalla?',
    speechText:
      '¿Qué ocurriría si olvidaran nuestros mundos, nuestras batallas y hasta el motivo por el que alguna vez encendieron una pantalla?',
    rate: 0.87,
    pitch: 0.61,
  },
  {
    id: 'sc2-f',
    sceneIndex: 1,
    startSec: 66.6,
    endSec: 69.6,
    subtitle: 'No conquistaremos sus mundos. No destruiremos sus máquinas. Haremos algo mucho peor.',
    speechText: 'No conquistaremos sus mundos. No destruiremos sus máquinas. Haremos algo mucho peor.',
    rate: 0.84,
    pitch: 0.58,
  },
  {
    id: 'sc2-g',
    sceneIndex: 1,
    startSec: 69.9,
    endSec: 71.6,
    subtitle: 'BORRAREMOS SUS RECUERDOS.',
    speechText: 'Borraremos sus recuerdos.',
    rate: 0.8,
    pitch: 0.55,
  },

  // Escena 3 (01:12 - 01:36)
  {
    id: 'sc3-a',
    sceneIndex: 2,
    startSec: 78.0,
    endSec: 82.4,
    subtitle: 'Una onda digital se expande desde el núcleo.',
    speechText: 'Una onda digital se expande desde el núcleo.',
    rate: 0.88,
    pitch: 0.7,
  },
  {
    id: 'sc3-b',
    sceneIndex: 2,
    startSec: 83.2,
    endSec: 88.2,
    subtitle:
      'Por donde pasa, las imágenes dejan de tener sentido. Los escenarios siguen existiendo, pero pierden sus colores, sus símbolos y sus referencias.',
    speechText:
      'Por donde pasa, las imágenes dejan de tener sentido. Los escenarios siguen existiendo, pero pierden sus colores, sus símbolos y sus referencias.',
    rate: 0.89,
    pitch: 0.72,
  },
  {
    id: 'sc3-c',
    sceneIndex: 2,
    startSec: 90.6,
    endSec: 95.2,
    subtitle: 'El Reinicio Cero ha comenzado.',
    speechText: 'El Reinicio Cero ha comenzado.',
    rate: 0.82,
    pitch: 0.58,
  },

  // Escena 4 (01:36 - 02:06)
  {
    id: 'sc4-a',
    sceneIndex: 3,
    startSec: 100.0,
    endSec: 103.6,
    subtitle: '¿Qué se supone que tengo que hacer con esto?',
    speechText: '¿Qué se supone que tengo que hacer con esto?',
    rate: 0.92,
    pitch: 1.15,
  },
  {
    id: 'sc4-b',
    sceneIndex: 3,
    startSec: 108.2,
    endSec: 113.8,
    subtitle: 'No destruyeron el pasado. Lo hicieron irreconocible.',
    speechText: 'No destruyeron el pasado. Lo hicieron irreconocible.',
    rate: 0.87,
    pitch: 0.8,
  },
  {
    id: 'sc4-c',
    sceneIndex: 3,
    startSec: 114.6,
    endSec: 120.4,
    subtitle:
      'Las máquinas permanecieron. Los cartuchos continuaron existiendo. Las pantallas siguieron encendiéndose.',
    speechText:
      'Las máquinas permanecieron. Los cartuchos continuaron existiendo. Las pantallas siguieron encendiéndose.',
    rate: 0.89,
    pitch: 0.8,
  },
  {
    id: 'sc4-d',
    sceneIndex: 3,
    startSec: 121.0,
    endSec: 125.4,
    subtitle:
      'Pero las historias habían desaparecido de la memoria de quienes alguna vez las vivieron.',
    speechText:
      'Pero las historias habían desaparecido de la memoria de quienes alguna vez las vivieron.',
    rate: 0.87,
    pitch: 0.78,
  },

  // Escena 5 (02:06 - 02:32)
  {
    id: 'sc5-a',
    sceneIndex: 4,
    startSec: 130.6,
    endSec: 135.2,
    subtitle: 'Sin embargo, en algún lugar, algo quedó fuera del alcance del olvido.',
    speechText: 'Sin embargo, en algún lugar, algo quedó fuera del alcance del olvido.',
    rate: 0.88,
    pitch: 0.84,
  },
  {
    id: 'sc5-b',
    sceneIndex: 4,
    startSec: 136.0,
    endSec: 140.2,
    subtitle: 'Una isla permaneció en pie.',
    speechText: 'Una isla permaneció en pie.',
    rate: 0.85,
    pitch: 0.82,
  },
  {
    id: 'sc5-c',
    sceneIndex: 4,
    startSec: 141.0,
    endSec: 146.6,
    subtitle:
      'El Reinicio Cero había borrado los recuerdos de innumerables mundos, pero no había conseguido completar su recorrido.',
    speechText:
      'El Reinicio Cero había borrado los recuerdos de innumerables mundos, pero no había conseguido completar su recorrido.',
    rate: 0.88,
    pitch: 0.83,
  },
  {
    id: 'sc5-d',
    sceneIndex: 4,
    startSec: 147.2,
    endSec: 151.2,
    subtitle: 'Y nadie sabía por qué.',
    speechText: 'Y nadie sabía por qué.',
    rate: 0.84,
    pitch: 0.78,
  },

  // Escena 6 (02:32 - 03:00)
  {
    id: 'sc6-a',
    sceneIndex: 5,
    startSec: 157.2,
    endSec: 161.4,
    subtitle: 'Si nadie recuerda los mundos… ¿significa que han desaparecido?',
    speechText: 'Si nadie recuerda los mundos... ¿significa que han desaparecido?',
    rate: 0.8,
    pitch: 0.92,
  },
  {
    id: 'sc6-b',
    sceneIndex: 5,
    startSec: 162.2,
    endSec: 166.2,
    subtitle: '¿O significa que todavía pueden volver a existir?',
    speechText: '¿O significa que todavía pueden volver a existir?',
    rate: 0.8,
    pitch: 0.94,
  },
  {
    id: 'sc6-c',
    sceneIndex: 5,
    startSec: 166.2,
    endSec: 170.8,
    subtitle:
      'No eres un héroe porque alguien haya escrito tu nombre en una historia. Eres un héroe porque puedes decidir qué hacer cuando todas las historias han desaparecido.',
    speechText:
      'No eres un héroe porque alguien haya escrito tu nombre en una historia. Eres un héroe porque puedes decidir qué hacer cuando todas las historias han desaparecido.',
    rate: 0.88,
    pitch: 0.86,
  },
  {
    id: 'sc6-d',
    sceneIndex: 5,
    startSec: 170.9,
    endSec: 172.55,
    subtitle: 'El universo ha olvidado sus juegos. Ahora necesita a alguien capaz de reconstruirlos.',
    speechText: 'El universo ha olvidado sus juegos. Ahora necesita a alguien capaz de reconstruirlos.',
    rate: 0.86,
    pitch: 0.88,
  },

  // Escena 7 (03:00 - 03:14)
  {
    id: 'sc7-a',
    sceneIndex: 6,
    startSec: 189.4,
    endSec: 192.6,
    subtitle: '¿En serio? ¿Esto es lo primero que queda?',
    speechText: '¿En serio? ¿Esto es lo primero que queda?',
    rate: 0.92,
    pitch: 1.02,
  },

  // Escena 8 (03:14 - 03:23)
  {
    id: 'sc8-a',
    sceneIndex: 7,
    startSec: 200.2,
    endSec: 202.8,
    subtitle: 'Bueno… supongo que esto también puede servir.',
    speechText: 'Bueno... supongo que esto también puede servir.',
    rate: 0.92,
    pitch: 0.98,
  },

  // Escena 9 (03:23 - 03:30)
  {
    id: 'sc9-a',
    sceneIndex: 8,
    startSec: 203.8,
    endSec: 209.0,
    subtitle:
      'Los mundos han sido olvidados. Sus historias han perdido sus nombres. Pero mientras quede un solo píxel capaz de encender una nueva aventura, el universo todavía tendrá una oportunidad.',
    speechText:
      'Los mundos han sido olvidados. Sus historias han perdido sus nombres. Pero mientras quede un solo píxel capaz de encender una nueva aventura, el universo todavía tendrá una oportunidad.',
    rate: 0.89,
    pitch: 0.86,
  },
];
export function getChapterAtTime(elapsedSec: number): CinematicSceneChapter {
  for (let i = CINEMATIC_SCENE_CHAPTERS.length - 1; i >= 0; i--) {
    if (elapsedSec >= CINEMATIC_SCENE_CHAPTERS[i].startSec) {
      return CINEMATIC_SCENE_CHAPTERS[i];
    }
  }
  return CINEMATIC_SCENE_CHAPTERS[0];
}

export function getActiveSubtitleAtTime(elapsedSec: number): CinematicNarrationBeat | null {
  for (let i = 0; i < CINEMATIC_NARRATION_BEATS.length; i++) {
    const b = CINEMATIC_NARRATION_BEATS[i];
    if (elapsedSec >= b.startSec && elapsedSec <= b.endSec) {
      return b;
    }
  }
  return null;
}

class CinematicVoiceNarrator {
  private spokenBeatIds: Set<string> = new Set();
  private activeSpeaking = false;
  private speechFallbackTimer: number | null = null;
  private cachedVoice: SpeechSynthesisVoice | null = null;

  public preloadAll(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return;
        this.cachedVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('es') &&
              /natural|neural|alvaro|jorge|alonso|diego|pablo|google español/i.test(v.name)
          ) ||
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('es') &&
              /google|microsoft|apple|paulina|monica|mónica/i.test(v.name)
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('es')) ||
          null;
      };
      loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    } catch {
      // Continuar silenciosamente con subtítulos si el navegador restringe SpeechSynthesis
    }
  }

  public isAudioUnlocked(): boolean {
    if (typeof window === 'undefined') return true;
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } })
      .userActivation;
    if (ua && ua.hasBeenActive) return true;
    if (Howler.ctx && Howler.ctx.state === 'running') return true;
    return false;
  }

  public async unlockAudioContext(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    try {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        await Howler.ctx.resume();
      }
      this.preloadAll();
      return !Howler.ctx || Howler.ctx.state === 'running';
    } catch {
      return false;
    }
  }

  public resetTimeline(fromSec = 0): void {
    this.stopCurrent();
    this.spokenBeatIds.clear();
    // Si el usuario adelanta en la línea de tiempo, marcar los beats previos como ya emitidos
    for (const beat of CINEMATIC_NARRATION_BEATS) {
      if (beat.endSec < fromSec) {
        this.spokenBeatIds.add(beat.id);
      }
    }
  }

  public syncTimeline(elapsedSec: number, isPaused: boolean): void {
    if (isPaused || bgmEngine.isMuted()) return;

    for (const beat of CINEMATIC_NARRATION_BEATS) {
      if (
        elapsedSec >= beat.startSec &&
        elapsedSec < beat.endSec - 0.6 &&
        !this.spokenBeatIds.has(beat.id)
      ) {
        this.spokenBeatIds.add(beat.id);
        this.speakBeat(beat);
        break;
      }
    }
  }

  private speakBeat(beat: CinematicNarrationBeat): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (bgmEngine.isMuted()) return;

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(beat.speechText);
      utter.lang = this.cachedVoice?.lang || 'es-ES';
      utter.rate = beat.rate ?? 0.87;
      utter.pitch = beat.pitch ?? 0.84;
      utter.volume = 0.95;

      if (!this.cachedVoice) {
        this.preloadAll();
      }
      if (this.cachedVoice) {
        utter.voice = this.cachedVoice;
      }

      this.activeSpeaking = true;

      const finish = () => {
        if (this.speechFallbackTimer !== null) {
          window.clearTimeout(this.speechFallbackTimer);
          this.speechFallbackTimer = null;
        }
        this.activeSpeaking = false;
      };

      utter.onend = finish;
      utter.onerror = finish;

      const maxMs = Math.max(2500, (beat.endSec - beat.startSec + 0.6) * 1000);
      this.speechFallbackTimer = window.setTimeout(finish, maxMs);

      window.speechSynthesis.speak(utter);
    } catch {
      this.activeSpeaking = false;
    }
  }

  public isSpeaking(): boolean {
    return this.activeSpeaking;
  }

  public stopCurrent(): void {
    this.activeSpeaking = false;
    if (this.speechFallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.speechFallbackTimer);
      this.speechFallbackTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorar errores de cancelación
      }
    }
  }
}

export const cinematicNarrator = new CinematicVoiceNarrator();
