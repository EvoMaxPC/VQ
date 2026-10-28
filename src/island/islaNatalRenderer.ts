/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RENDERER DE LA ISLA NATAL — Pixel-art procedural estilo GBA (hora dorada).
 *
 * Todo se dibuja por código (sin hojas de sprites externas), en el mismo lenguaje
 * visual que la Isla del Origen pero con identidad propia: mar en calma, arena
 * cálida, pradera verde, un alto rocoso, palmeras con brisa y el resplandor cian
 * del viejo gabinete de Pong dormido en la arboleda.
 *
 * Convención de coordenadas: el escenario aplica el transform (dpr · zoom) y pasa
 * vw/vh en unidades de mundo; este módulo rellena el fondo en espacio de pantalla
 * y después traslada a (-camX, -camY).
 */

import type { AvatarAppearance } from '../avatar/avatarOptions';
import type { FacingDirection } from '../rpg/rpgContent';
import {
  drawPixelAvatar4Dir,
  drawHandcraftedTree,
  drawGbcWoodenSign,
  drawPongHoverboard,
  drawRpgTreasureChest,
  isWorldBoxVisible,
} from './island70sRenderer';
import {
  ISLA_NATAL_ARCADE_ANCHOR,
  ISLA_NATAL_BOULDERS,
  ISLA_NATAL_CABIN,
  ISLA_NATAL_DEPARTURE,
  ISLA_NATAL_FLOWERS,
  ISLA_NATAL_PALMS,
  ISLA_NATAL_PEBBLES,
  ISLA_NATAL_SHELLS,
  ISLA_NATAL_SIGNS,
  ISLA_NATAL_SOLIDS,
  ISLA_NATAL_TRAVELER_SITE,
  ISLA_NATAL_TREES,
  ISLA_NATAL_TUFTS,
  ISLA_NATAL_WALK_RECTS,
  ISLA_NATAL_WORLD_H,
  ISLA_NATAL_WORLD_W,
  isIslaNatalPointOnLand,
  type IslaNatalSurface,
  type IslaNatalWalkRect,
} from './islaNatalData';

export type ArcadeCabinetState = 'dusty' | 'powered' | 'won';

export interface IslaNatalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface IslaNatalPromptSpec {
  x: number;
  y: number;
  label: string;
  accentHex: string;
}

export interface IslaNatalPlayerRender {
  x: number;
  y: number;
  facingDir: FacingDirection;
  walking: boolean;
  sprinting: boolean;
  interactAnim: number;
  ridingPaddle: boolean;
  /** Inclinación de la tabla al surfear (radianes). */
  rideTilt: number;
}

export interface IslaNatalRenderParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  camera: { x: number; y: number };
  elapsed: number;
  reducedMotion: boolean;
  player: IslaNatalPlayerRender;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  arcadeState: ArcadeCabinetState;
  /** 0 = isla en reposo, 1 = máquina encendida y cargando el aire. */
  charge: number;
  /** Pulso de la anomalía tras la victoria (decae de 1 a 0). */
  signalPulse: number;
  /** La paleta sigue en el suelo, esperando junto al gabinete. */
  paddleOnGround: boolean;
  /** El faro de partida de la playa sur está encendido. */
  departureReady: boolean;
  particles: IslaNatalParticle[];
  prompt: IslaNatalPromptSpec | null;
  shockwaves: { x: number; y: number; t: number; life: number }[];
  /** Escena del viajero del futuro: fase y segundos transcurridos dentro de ella. */
  travelerEvent?: {
    phase: 'storm' | 'arrival' | 'descend' | 'talk' | 'board' | 'departure';
    t: number;
  } | null;
}

const CELL = 32;

const CABINET_POS = { x: 1251, y: 588 };
const HUT_POS = { x: 430, y: 694 };
const SHED_POS = { x: 1178, y: 512 };
const SIGN_POS = { x: 872, y: 946 };
const NET_POS = { x: 668, y: 958 };
const SHELLS_POI_POS = { x: 946, y: 974 };
const MAILBOX_POS = { x: 574, y: 792 };
const CRATE_POS = { x: 596, y: 704 };
const MIRADOR_POS = { x: 452, y: 306 };

/** Carteles de zona: mismo formato pequeño que los del Origen. */

interface NatalBushSpec {
  x: number;
  y: number;
  seed: number;
  berry: boolean;
}

/** Arbustos de pradera: rompen la repetición de matas y dan volumen al borde de los caminos. */
const NATAL_BUSHES: NatalBushSpec[] = [
  { x: 604, y: 668, seed: 0.22, berry: false },
  { x: 1000, y: 690, seed: 0.54, berry: true },
  { x: 1088, y: 748, seed: 0.81, berry: false },
  { x: 392, y: 648, seed: 0.36, berry: true },
  { x: 1008, y: 872, seed: 0.64, berry: false },
];

function hash2(x: number, y: number): number {
  let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967295;
}

function pointOnLand(x: number, y: number): boolean {
  for (const r of ISLA_NATAL_WALK_RECTS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* TERRENO PRERENDERIZADO: MÁSCARA DE COSTA Y TEXTURAS ARTESANALES    */
/* ------------------------------------------------------------------ */

const GROUND_PAD = 96;
const COAST_STEP = 4;
const SHELF_RANGE = 86;

const SURFACE_BASE: Record<IslaNatalSurface, string> = {
  sand: '#e6d19b',
  grass: '#4a8f3f',
  path: '#b28d5c',
  rock: '#8b8577',
};

const SURFACE_LIGHT: Record<IslaNatalSurface, string> = {
  sand: '#f4e2ae',
  grass: '#79c96a',
  path: '#d8bd8c',
  rock: '#c2b9a5',
};

const SURFACE_WET: Record<IslaNatalSurface, string> = {
  sand: '#a9854f',
  grass: '#366b31',
  path: '#8d6b42',
  rock: '#5f5a50',
};

/** Campo de distancia a la tierra caminable: permite costas orgánicas y rompiente real. */
interface NatalCoastField {
  cols: number;
  rows: number;
  pad: number;
  step: number;
  /** Distancia (en celdas) desde cualquier punto hasta la tierra caminable. */
  dist: Float32Array;
  /** Distancia (en celdas) desde la tierra hacia el agua: define la orla de marea. */
  inDist: Float32Array;
  rectIndex: Int16Array;
}

interface NatalFoamPoint {
  x: number;
  y: number;
  phase: number;
  band: number;
  horiz: boolean;
  seed: number;
}

let coastField: NatalCoastField | null = null;
let coastGroundLayer: HTMLCanvasElement | null = null;
let coastFoam: NatalFoamPoint[] = [];

/** Borde irregular de la costa (en píxeles) para que la isla no parezca de rectángulos. */
function coastEdgeExtra(wx: number, wy: number): number {
  const a = Math.sin(wx * 0.019 + Math.sin(wy * 0.014) * 2.2);
  const b = Math.sin(wy * 0.027 + wx * 0.011 + 1.7);
  const c = Math.sin((wx + wy) * 0.047 + 2.4);
  const n = hash2(Math.floor(wx / 7) + 17, Math.floor(wy / 7) - 23) - 0.5;
  return Math.max(0.6, Math.min(16, 6.4 + a * 3.8 + b * 3 + c * 1.6 + n * 3));
}

function buildCoastField(): NatalCoastField {
  const pad = GROUND_PAD;
  const step = COAST_STEP;
  const cols = Math.ceil((ISLA_NATAL_WORLD_W + pad * 2) / step) + 1;
  const rows = Math.ceil((ISLA_NATAL_WORLD_H + pad * 2) / step) + 1;
  const dist = new Float32Array(cols * rows);
  const inDist = new Float32Array(cols * rows);
  const rectIndex = new Int16Array(cols * rows);
  dist.fill(9999);
  rectIndex.fill(-1);

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const wx = cx * step - pad + step * 0.5;
      const wy = cy * step - pad + step * 0.5;
      for (let i = ISLA_NATAL_WALK_RECTS.length - 1; i >= 0; i--) {
        const r = ISLA_NATAL_WALK_RECTS[i];
        if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
          dist[cy * cols + cx] = 0;
          rectIndex[cy * cols + cx] = i;
          break;
        }
      }
      inDist[cy * cols + cx] = dist[cy * cols + cx] === 0 ? 9999 : 0;
    }
  }

  const D = Math.SQRT2;
  const relax = (i: number, ni: number, weight: number) => {
    if (dist[ni] + weight < dist[i]) {
      dist[i] = dist[ni] + weight;
      rectIndex[i] = rectIndex[ni];
    }
  };
  const relaxInner = (i: number, ni: number, weight: number) => {
    if (inDist[ni] + weight < inDist[i]) inDist[i] = inDist[ni] + weight;
  };
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      if (cx > 0) {
        relax(i, i - 1, 1);
        relaxInner(i, i - 1, 1);
      }
      if (cy > 0) {
        relax(i, i - cols, 1);
        relaxInner(i, i - cols, 1);
        if (cx > 0) {
          relax(i, i - cols - 1, D);
          relaxInner(i, i - cols - 1, D);
        }
        if (cx < cols - 1) {
          relax(i, i - cols + 1, D);
          relaxInner(i, i - cols + 1, D);
        }
      }
    }
  }
  for (let cy = rows - 1; cy >= 0; cy--) {
    for (let cx = cols - 1; cx >= 0; cx--) {
      const i = cy * cols + cx;
      if (cx < cols - 1) {
        relax(i, i + 1, 1);
        relaxInner(i, i + 1, 1);
      }
      if (cy < rows - 1) {
        relax(i, i + cols, 1);
        relaxInner(i, i + cols, 1);
        if (cx < cols - 1) {
          relax(i, i + cols + 1, D);
          relaxInner(i, i + cols + 1, D);
        }
        if (cx > 0) {
          relax(i, i + cols - 1, D);
          relaxInner(i, i + cols - 1, D);
        }
      }
    }
  }

  return { cols, rows, pad, step, dist, inDist, rectIndex };
}

function sampleDistancePx(field: NatalCoastField, wx: number, wy: number): number {
  const fx = (wx + field.pad) / field.step - 0.5;
  const fy = (wy + field.pad) / field.step - 0.5;
  const x0 = Math.max(0, Math.min(field.cols - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(field.rows - 1, Math.floor(fy)));
  const x1 = Math.min(field.cols - 1, x0 + 1);
  const y1 = Math.min(field.rows - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0));
  const ty = Math.max(0, Math.min(1, fy - y0));
  const i00 = y0 * field.cols + x0;
  const i10 = y0 * field.cols + x1;
  const i01 = y1 * field.cols + x0;
  const i11 = y1 * field.cols + x1;
  const top = field.dist[i00] + (field.dist[i10] - field.dist[i00]) * tx;
  const bottom = field.dist[i01] + (field.dist[i11] - field.dist[i01]) * tx;
  return (top + (bottom - top) * ty) * field.step;
}

function sampleRectIndex(field: NatalCoastField, wx: number, wy: number): number {
  const cx = Math.round((wx + field.pad) / field.step - 0.5);
  const cy = Math.round((wy + field.pad) / field.step - 0.5);
  const x = Math.max(0, Math.min(field.cols - 1, cx));
  const y = Math.max(0, Math.min(field.rows - 1, cy));
  return field.rectIndex[y * field.cols + x];
}

function sampleInnerDistancePx(field: NatalCoastField, wx: number, wy: number): number {
  const fx = (wx + field.pad) / field.step - 0.5;
  const fy = (wy + field.pad) / field.step - 0.5;
  const x0 = Math.max(0, Math.min(field.cols - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(field.rows - 1, Math.floor(fy)));
  const x1 = Math.min(field.cols - 1, x0 + 1);
  const y1 = Math.min(field.rows - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0));
  const ty = Math.max(0, Math.min(1, fy - y0));
  const i00 = y0 * field.cols + x0;
  const i10 = y0 * field.cols + x1;
  const i01 = y1 * field.cols + x0;
  const i11 = y1 * field.cols + x1;
  const top = field.inDist[i00] + (field.inDist[i10] - field.inDist[i00]) * tx;
  const bottom = field.inDist[i01] + (field.inDist[i11] - field.inDist[i01]) * tx;
  return Math.min(60, (top + (bottom - top) * ty) * field.step);
}

function buildFoamPoints(field: NatalCoastField): NatalFoamPoint[] {
  const bands: { min: number; max: number; skip: number }[] = [
    { min: 1.5, max: 7, skip: 0.5 },
    { min: 11, max: 18, skip: 0.68 },
    { min: 23, max: 32, skip: 0.78 },
    { min: 38, max: 50, skip: 0.87 },
  ];
  const pts: NatalFoamPoint[] = [];
  const step = field.step;
  for (let cy = 1; cy < field.rows - 1; cy++) {
    for (let cx = 1; cx < field.cols - 1; cx++) {
      const d = field.dist[cy * field.cols + cx] * step;
      if (d < 1 || d > 52) continue;
      for (let b = 0; b < bands.length; b++) {
        const band = bands[b];
        if (d < band.min || d > band.max) continue;
        const h = hash2(cx * 37 + b * 911, cy * 53 - b * 277);
        if (h < band.skip) continue;
        const gx = field.dist[cy * field.cols + cx + 1] - field.dist[cy * field.cols + cx - 1];
        const gy = field.dist[(cy + 1) * field.cols + cx] - field.dist[(cy - 1) * field.cols + cx];
        const horiz = Math.abs(gy) >= Math.abs(gx);
        pts.push({
          x: cx * step - field.pad + (h - 0.5) * step * 1.7,
          y: cy * step - field.pad + (hash2(cx + 191, cy - 71) - 0.5) * step * 1.7,
          phase: h * 6.283 + b * 1.37,
          band: b,
          horiz,
          seed: h,
        });
      }
    }
  }
  return pts;
}

function shelfColor(d: number): string {
  // Bajío estilo Isla del Origen: franja turquesa estrecha y translúcida que
  // se funde rápido con el mar profundo (sin halo lavado alrededor de la isla).
  if (d <= 2.5) return 'rgba(198, 250, 240, 0.95)';
  if (d <= 6) return 'rgba(45, 180, 210, 0.6)';
  if (d <= 11) return 'rgba(45, 180, 210, 0.44)';
  if (d <= 18) return 'rgba(30, 140, 175, 0.34)';
  if (d <= 28) return 'rgba(24, 112, 148, 0.26)';
  if (d <= 42) return 'rgba(18, 90, 124, 0.2)';
  if (d <= 58) return 'rgba(14, 74, 106, 0.14)';
  if (d <= 76) return 'rgba(11, 60, 92, 0.09)';
  return 'rgba(10, 53, 84, 0.05)';
}

function wetRimColor(surface: IslaNatalSurface, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (surface === 'sand') return `rgba(148, 108, 58, ${(a * 0.58).toFixed(3)})`;
  if (surface === 'grass') return `rgba(26, 64, 29, ${(a * 0.44).toFixed(3)})`;
  if (surface === 'path') return `rgba(102, 74, 42, ${(a * 0.5).toFixed(3)})`;
  return `rgba(50, 46, 40, ${(a * 0.46).toFixed(3)})`;
}

/* ------------------------------ ARENA ----------------------------- */

function paintSandTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  ctx.fillStyle = '#e6d19b';
  ctx.fillRect(x, y, w, h);

  // Grandes mantos tonales: la arena seca se lee en manchas, no en ruido.
  for (let py = y; py < y + h; py += 22) {
    for (let px = x; px < x + w; px += 22) {
      const th = hash2(px * 0.31 + seed, py * 0.47 - seed);
      if (th > 0.74) {
        ctx.fillStyle = th > 0.9 ? '#f0dcaa' : '#eed9a6';
        ctx.fillRect(px + 2, py + 3, 9 + Math.floor(th * 9), 3);
        ctx.fillRect(px + 5, py + 7, 6 + Math.floor(th * 5), 2);
      } else if (th < 0.22) {
        ctx.fillStyle = 'rgba(198, 166, 112, 0.42)';
        ctx.fillRect(px + 4, py + 5, 8 + Math.floor(th * 26), 3);
        ctx.fillRect(px + 2, py + 10, 5 + Math.floor(th * 12), 2);
      }
    }
  }

  // Rizos de viento: líneas de 1 px con cresta iluminada y surco en sombra.
  for (let py = y + 4; py < y + h - 2; py += 9) {
    const off = Math.round(Math.sin(py * 0.12 + seed) * 5);
    for (let px = x + ((py * 7) % 15); px < x + w; px += 19) {
      const len = 6 + Math.floor(hash2(px, py) * 9);
      ctx.fillStyle = 'rgba(188, 151, 95, 0.5)';
      ctx.fillRect(px + off, py, len, 1);
      ctx.fillStyle = 'rgba(255, 246, 214, 0.55)';
      ctx.fillRect(px + off + 1, py - 1, Math.max(2, len - 3), 1);
    }
  }

  // Granos salinos, conchillas y piedritas.
  for (let py = y + 2; py < y + h - 1; py += 6) {
    for (let px = x + 1; px < x + w; px += 7) {
      const th = hash2(px + 41, py - 19);
      if (th < 0.34) continue;
      if (th > 0.93) {
        ctx.fillStyle = 'rgba(255, 250, 236, 0.85)';
        ctx.fillRect(px, py, 2, 1);
      } else if (th > 0.58) {
        ctx.fillStyle = 'rgba(196, 160, 108, 0.45)';
        ctx.fillRect(px, py, 1, 1);
      } else {
        ctx.fillStyle = 'rgba(255, 240, 198, 0.4)';
        ctx.fillRect(px + 1, py, 1, 1);
      }
    }
  }

  // Restos marinos muy esporádicos.
  for (let py = y + 8; py < y + h - 8; py += 31) {
    for (let px = x + 6; px < x + w - 6; px += 37) {
      const th = hash2(px + 7 + seed, py + 13);
      if (th < 0.82) continue;
      if (th > 0.93) {
        ctx.fillStyle = '#fff7eb';
        ctx.fillRect(px, py, 4, 2);
        ctx.fillRect(px + 1, py - 1, 2, 4);
        ctx.fillStyle = '#f3b7c8';
        ctx.fillRect(px + 1, py, 2, 2);
      } else {
        ctx.fillStyle = '#b9ae97';
        ctx.fillRect(px, py, 3, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(px, py, 2, 1);
      }
    }
  }

  // Luz poniente sobre la arena.
  ctx.fillStyle = 'rgba(255, 236, 190, 0.22)';
  ctx.fillRect(x, y, w, 1);
}

/* ------------------------------ CÉSPED ---------------------------- */

function paintGrassTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  ctx.fillStyle = '#457f3b';
  ctx.fillRect(x, y, w, h);

  // Manchas de pradera (macro-parches de 32 px, paleta cálmica de la Isla del Origen).
  for (let py = y; py < y + h; py += 32) {
    for (let px = x; px < x + w; px += 32) {
      const th = hash2(px * 0.17 + seed, py * 0.29 + 13);
      const tone = th > 0.72 ? '#4c8a40' : th < 0.28 ? '#3d7336' : '#437c39';
      ctx.fillStyle = tone;
      ctx.fillRect(px + 2, py + 3, 18 + Math.floor(th * 10), 11);
      ctx.fillRect(px + 9, py + 15, 14 + Math.floor(th * 12), 8);
    }
  }

  // Matas oscuras y calvas soleadas.
  for (let py = y + 5; py < y + h - 4; py += 17) {
    for (let px = x + 4; px < x + w - 6; px += 19) {
      const th = hash2(px + 73, py + 29);
      if (th > 0.82) {
        ctx.fillStyle = 'rgba(34, 76, 34, 0.36)';
        ctx.fillRect(px, py, 7, 3);
      } else if (th < 0.12) {
        ctx.fillStyle = 'rgba(116, 188, 88, 0.3)';
        ctx.fillRect(px, py, 5, 2);
      }
    }
  }

  // Briznas de hierba: dispersas (como en el Origen) para que la pradera
  // se lea lisa de lejos, con detalle fino de cerca. Sin ruido de confeti.
  for (let py = y + 3; py < y + h - 2; py += 12) {
    for (let px = x + 3; px < x + w - 2; px += 12) {
      const th = hash2(px + 11, py + 97);
      if (th < 0.56) continue;
      const gx = px + Math.floor(th * 5);
      const gy = py + Math.floor(hash2(px + 5, py + 3) * 5);
      const tall = 2 + Math.floor(th * 3);
      ctx.fillStyle = 'rgba(28, 66, 32, 0.34)';
      ctx.fillRect(gx - 1, gy + 1, 3, 1);
      ctx.fillStyle = th > 0.78 ? '#74c161' : '#5da847';
      ctx.fillRect(gx, gy - tall + 1, 1, tall);
      ctx.fillRect(gx + 2, gy - tall, 1, tall + 1);
      ctx.fillStyle = '#a4dc80';
      ctx.fillRect(gx + 1, gy - tall, 1, 1);
    }
  }

  // Tréboles y florecillas silvestres muy esporádicas.
  for (let py = y + 6; py < y + h - 5; py += 24) {
    for (let px = x + 6; px < x + w - 6; px += 27) {
      const th = hash2(px - 37, py + 61 + seed);
      if (th < 0.9) continue;
      if (th > 0.965) {
        // Margarita diminuta
        ctx.fillStyle = '#2f6d33';
        ctx.fillRect(px + 1, py + 2, 1, 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(px, py, 3, 1);
        ctx.fillRect(px + 1, py - 1, 1, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 1, py, 1, 1);
      } else {
        // Trébol de tres hojas
        ctx.fillStyle = '#3f8a41';
        ctx.fillRect(px, py, 3, 1);
        ctx.fillRect(px + 1, py - 1, 1, 3);
        ctx.fillStyle = '#7fcf66';
        ctx.fillRect(px, py, 2, 1);
        ctx.fillRect(px + 2, py + 1, 1, 1);
      }
    }
  }

  ctx.fillStyle = 'rgba(168, 224, 128, 0.16)';
  ctx.fillRect(x, y, w, 1);
}

/* ------------------------------ SENDERO --------------------------- */

function paintPathTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  horizontal: boolean
): void {
  ctx.fillStyle = '#b28d5c';
  ctx.fillRect(x, y, w, h);

  // Tierra apelmazada en manchas y calvas claras.
  for (let py = y; py < y + h; py += 18) {
    for (let px = x; px < x + w; px += 18) {
      const th = hash2(px + 17 + seed, py - 39);
      ctx.fillStyle = th > 0.6 ? 'rgba(198, 166, 116, 0.55)' : 'rgba(146, 111, 67, 0.45)';
      ctx.fillRect(px + 1, py + 2, 9 + Math.floor(th * 7), 3);
      ctx.fillRect(px + 8, py + 11, 6 + Math.floor(th * 6), 2);
    }
  }

  // Dos huellas de carro/roderas siguiendo el eje del sendero.
  const drawRut = (offset: number) => {
    const len = horizontal ? w : h;
    for (let i = 4; i < len - 4; i += 3) {
      const t = i / len;
      const wobble = Math.round(Math.sin(i * 0.13 + seed + offset) * 1.6);
      const a = horizontal ? x + i : x + offset + wobble;
      const b = horizontal ? y + offset + wobble : y + i;
      ctx.fillStyle = 'rgba(128, 94, 54, 0.55)';
      ctx.fillRect(a, b, horizontal ? 2 : 4, horizontal ? 4 : 2);
      if (i % 9 === 0) {
        ctx.fillStyle = 'rgba(214, 186, 137, 0.45)';
        ctx.fillRect(a, b - (horizontal ? 1 : 0), horizontal ? 2 : 3, 1);
      }
    }
  };
  if (horizontal) {
    drawRut(Math.max(6, Math.round(h * 0.32)));
    drawRut(Math.max(6, Math.round(h * 0.66)));
  } else {
    drawRut(Math.max(6, Math.round(w * 0.32)));
    drawRut(Math.max(6, Math.round(w * 0.66)));
  }

  // Piedras encastradas con bisel de luz y sombra.
  for (let py = y + 5; py < y + h - 4; py += 15) {
    for (let px = x + 6; px < x + w - 6; px += 21) {
      const th = hash2(px + 5, py + 17 + seed);
      if (th < 0.42) continue;
      const sw = 4 + Math.floor(th * 5);
      const sh = 2 + Math.floor(th * 3);
      ctx.fillStyle = 'rgba(120, 88, 52, 0.55)';
      ctx.fillRect(px + 1, py + sh - 1, sw, 1);
      ctx.fillStyle = th > 0.72 ? '#cdb083' : '#a8875a';
      ctx.fillRect(px, py, sw, sh);
      ctx.fillStyle = '#ead6a9';
      ctx.fillRect(px, py, sw - 1, 1);
      ctx.fillStyle = 'rgba(94, 68, 40, 0.5)';
      ctx.fillRect(px + sw - 1, py, 1, sh);
    }
  }

  // Gravilla y raíces que asoman.
  for (let py = y + 3; py < y + h - 2; py += 6) {
    for (let px = x + 2; px < x + w - 2; px += 8) {
      const th = hash2(px + 89, py - 41);
      if (th < 0.6) continue;
      ctx.fillStyle = th > 0.85 ? 'rgba(232, 208, 162, 0.6)' : 'rgba(140, 104, 62, 0.55)';
      ctx.fillRect(px, py, 1 + (th > 0.9 ? 1 : 0), 1);
    }
  }

  // Grietas de sequía.
  for (let py = y + 9; py < y + h - 8; py += 26) {
    for (let px = x + 12; px < x + w - 12; px += 34) {
      if (hash2(px, py) < 0.7) continue;
      ctx.fillStyle = 'rgba(108, 78, 44, 0.45)';
      ctx.fillRect(px, py, 1, 5);
      ctx.fillRect(px + 1, py + 4, 4, 1);
      ctx.fillRect(px + 5, py + 2, 1, 3);
    }
  }
}

/* ------------------------------ ROCA ------------------------------ */

function paintRockTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  ctx.fillStyle = '#8b8577';
  ctx.fillRect(x, y, w, h);

  // Tonalidad macro: vetas grandes de mineral que rompen la uniformidad.
  for (let py = y; py < y + h; py += 26) {
    for (let px = x; px < x + w; px += 30) {
      const th = hash2(px * 0.23 + seed, py * 0.41 + 7);
      const tone =
        th > 0.74 ? 'rgba(158, 150, 133, 0.4)' : th < 0.24 ? 'rgba(112, 106, 94, 0.42)' : null;
      if (!tone) continue;
      ctx.fillStyle = tone;
      ctx.fillRect(px + 2, py + 1, 16 + Math.floor(th * 12), 9 + Math.floor((1 - th) * 8));
      ctx.fillRect(px + 7, py + 13, 10 + Math.floor(th * 9), 6);
    }
  }

  // Losas irregulares grandes: junta quebrada, no rejilla de ladrillos.
  const slabH = 26;
  for (let py = y; py < y + h; py += slabH) {
    const row = Math.floor((py - y) / slabH);
    ctx.fillStyle = 'rgba(60, 56, 50, 0.22)';
    ctx.fillRect(x, py + slabH - 2, w, 2);
    const joint = x + Math.floor(hash2(row * 17 + 3, py) * (w - 30));
    ctx.fillStyle = 'rgba(60, 56, 50, 0.24)';
    ctx.fillRect(joint, py, 2, slabH);
    for (let px = x; px < x + w; px += 52) {
      const off = Math.floor(hash2(px + 13, py + seed) * 8) - 4;
      const sx = px + off;
      const sxw = Math.min(50, x + w - sx);
      if (sxw <= 4 || sx + sxw <= joint + 2) continue;
      ctx.fillStyle = 'rgba(178, 170, 150, 0.26)';
      ctx.fillRect(sx + 1, py + 1, sxw - 2, 1);
      ctx.fillRect(sx + 1, py + 1, 1, slabH - 4);
      ctx.fillStyle = 'rgba(66, 62, 55, 0.28)';
      ctx.fillRect(sx + sxw - 2, py + 2, 1, slabH - 5);
    }
  }

  // Estratos horizontales y vetas.
  ctx.fillStyle = 'rgba(94, 87, 75, 0.3)';
  for (let py = y + 9; py < y + h - 6; py += 19) {
    ctx.fillRect(x + (py % 3 === 0 ? 12 : 0), py, w - (py % 3 === 0 ? 16 : 4), 1);
  }

  // Grietas finas.
  for (let py = y + 8; py < y + h - 10; py += 31) {
    for (let px = x + 14; px < x + w - 10; px += 43) {
      const th = hash2(px + 3, py + 71);
      if (th < 0.45) continue;
      ctx.fillStyle = 'rgba(58, 54, 47, 0.55)';
      let cx = px;
      let cy = py;
      for (let s = 0; s < 5; s++) {
        cx += hash2(px + s, py - s) > 0.5 ? 2 : -1;
        cy += 2;
        ctx.fillRect(cx, cy, 1, 2);
      }
    }
  }

  // Musgo en juntas y líquenes.
  for (let py = y + 12; py < y + h - 8; py += 23) {
    for (let px = x + 8; px < x + w - 8; px += 29) {
      const th = hash2(px - 17, py + 137);
      if (th > 0.72) {
        ctx.fillStyle = 'rgba(116, 152, 90, 0.5)';
        ctx.fillRect(px, py, 6 + Math.floor(th * 7), 2);
        ctx.fillStyle = 'rgba(86, 124, 68, 0.45)';
        ctx.fillRect(px + 2, py + 2, 4, 1);
      } else if (th < 0.09) {
        ctx.fillStyle = 'rgba(196, 214, 168, 0.42)';
        ctx.fillRect(px + 1, py, 2, 2);
      }
    }
  }

  // Pedruscos sueltos y polvo de roca.
  for (let py = y + 4; py < y + h - 3; py += 11) {
    for (let px = x + 4; px < x + w - 3; px += 13) {
      const th = hash2(px + 23, py + 53);
      if (th < 0.74) continue;
      ctx.fillStyle = th > 0.88 ? '#b8ae9a' : '#6f6a5e';
      ctx.fillRect(px, py, 2, 1);
    }
  }
}

/* --------------------- FRANJAS DE TRANSICIÓN ---------------------- */

const SURFACE_PRIORITY: Record<IslaNatalSurface, number> = {
  sand: 0,
  grass: 1,
  path: 2,
  rock: 3,
};

function paintSurfaceFringe(ctx: CanvasRenderingContext2D, r: IslaNatalWalkRect): void {
  const paint = (x: number, y: number, nx: number, ny: number) => {
    const other = isIslaNatalPointOnLand(x + nx * 4, y + ny * 4);
    if (!other || other.surface === r.surface) return;
    if (SURFACE_PRIORITY[r.surface] <= SURFACE_PRIORITY[other.surface]) return;
    const th = hash2(Math.round(x) + 331 + nx * 7, Math.round(y) + 977 + ny * 11);
    if (th < 0.32) return;
    const px = Math.round(x + nx * 2);
    const py = Math.round(y + ny * 2);

    // Costura oscura de oclusión sobre la superficie inferior: los bordes
    // ya no parecen calcomanías, como en las losetas GBC del Origen.
    const seamX = Math.round(x + nx * 1);
    const seamY = Math.round(y + ny * 1);
    if (r.surface === 'grass') {
      ctx.fillStyle = 'rgba(22, 50, 24, 0.42)';
      ctx.fillRect(
        seamX - (nx === 0 ? 1 : 0),
        seamY - (ny === 0 ? 1 : 0),
        nx === 0 ? 3 : 1,
        ny === 0 ? 2 : 3
      );
      // Matas que muerden el borde de arena o sendero.
      ctx.fillStyle = th > 0.66 ? '#6fba5c' : '#549e44';
      ctx.fillRect(px + nx * 4 - 1, py + ny * 4 - 2, 1, 3);
      ctx.fillRect(px + nx * 7 + 1, py + ny * 7 - 3, 1, 4);
      ctx.fillRect(px + nx * 10 - 2, py + ny * 10 - 1, 1, 2);
      ctx.fillStyle = '#a4dc80';
      ctx.fillRect(px + nx * 7 + 1, py + ny * 7 - 3, 1, 1);
      ctx.fillStyle = 'rgba(26, 62, 29, 0.5)';
      ctx.fillRect(px - 2, py + 1, 5, 1);
    } else if (r.surface === 'path') {
      ctx.fillStyle = 'rgba(66, 48, 26, 0.5)';
      ctx.fillRect(
        seamX - (nx === 0 ? 1 : 0),
        seamY - (ny === 0 ? 1 : 0),
        nx === 0 ? 3 : 1,
        ny === 0 ? 2 : 3
      );
      // Tierra y gravilla que invaden la hierba.
      ctx.fillStyle = 'rgba(146, 111, 67, 0.7)';
      ctx.fillRect(px + nx * 5, py + ny * 5, nx === 0 ? 2 : 3, ny === 0 ? 3 : 2);
      ctx.fillStyle = '#cdb083';
      ctx.fillRect(px + nx * 8, py + ny * 8, 2, 1);
      ctx.fillStyle = 'rgba(94, 68, 40, 0.5)';
      ctx.fillRect(px + nx * 8 + 2, py + ny * 8 + 1, 2, 1);
    } else if (r.surface === 'rock') {
      ctx.fillStyle = 'rgba(40, 36, 30, 0.55)';
      ctx.fillRect(
        seamX - (nx === 0 ? 1 : 0),
        seamY - (ny === 0 ? 1 : 0),
        nx === 0 ? 3 : 1,
        ny === 0 ? 2 : 3
      );
      // Musgo y esquirlas al pie de la meseta.
      ctx.fillStyle = 'rgba(116, 152, 90, 0.6)';
      ctx.fillRect(px + nx * 4 - 2, py + ny * 4, 5, 2);
      ctx.fillStyle = '#8d8779';
      ctx.fillRect(px + nx * 4 + 1, py + ny * 4 + 2, 3, 2);
      ctx.fillStyle = 'rgba(255, 244, 220, 0.35)';
      ctx.fillRect(px + nx * 4 + 1, py + ny * 4 + 2, 2, 1);
    }
  };

  for (let x = r.x + 3; x < r.x + r.w - 3; x += 9) {
    paint(x, r.y, 0, -1);
    paint(x, r.y + r.h, 0, 1);
  }
  for (let y = r.y + 3; y < r.y + r.h - 3; y += 9) {
    paint(r.x, y, -1, 0);
    paint(r.x + r.w, y, 1, 0);
  }
}

function paintRockCliffs(ctx: CanvasRenderingContext2D, r: IslaNatalWalkRect): void {
  const faceH = 18;
  for (let x = r.x; x < r.x + r.w; x += 5) {
    const below = isIslaNatalPointOnLand(x + 2, r.y + r.h + 5);
    if (below && below.surface === 'rock') continue;
    const th = hash2(x + 11, r.y + r.h);
    const hh = faceH + Math.floor(hash2(x + 5, r.y + 3) * 5) - 2;
    ctx.fillStyle = th > 0.55 ? '#6f6a5e' : '#7a7468';
    ctx.fillRect(x, r.y + r.h, 5, hh);
    ctx.fillStyle = '#a49c8b';
    ctx.fillRect(x, r.y + r.h, 5, 2);
    ctx.fillStyle = 'rgba(226, 216, 192, 0.6)';
    ctx.fillRect(x, r.y + r.h, 5, 1);
    ctx.fillStyle = 'rgba(52, 48, 42, 0.55)';
    ctx.fillRect(x, r.y + r.h + 6, 5, 2);
    ctx.fillRect(x, r.y + r.h + 13, 5, 2);
    if (th > 0.78) {
      ctx.fillStyle = 'rgba(40, 36, 30, 0.6)';
      ctx.fillRect(x + 2, r.y + r.h + 4, 1, hh - 6);
    }
    ctx.fillStyle = 'rgba(18, 26, 18, 0.35)';
    ctx.fillRect(x, r.y + r.h + hh - 2, 5, 2);
  }
  ctx.fillStyle = 'rgba(12, 22, 14, 0.16)';
  ctx.fillRect(r.x, r.y + r.h + faceH, r.w, 5);
}

/* ----------------- COSTA, BAJÍO Y MAREA PRERENDERIZADOS ----------- */

function paintCoastBand(ctx: CanvasRenderingContext2D, field: NatalCoastField): void {
  const step = 2;
  const width = ISLA_NATAL_WORLD_W + field.pad * 2;
  const height = ISLA_NATAL_WORLD_H + field.pad * 2;

  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      const wx = px - field.pad + step * 0.5;
      const wy = py - field.pad + step * 0.5;
      const d = sampleDistancePx(field, wx, wy);
      if (d > SHELF_RANGE + 24) continue;

      const extra = coastEdgeExtra(wx, wy);
      const dd = d - extra;
      const th = hash2(px + 17, py + 89);

      if (dd <= 0) {
        if (d <= 0.9) {
          // Interior de la isla: sólo la orla húmeda cercana a la costa.
          const inner = sampleInnerDistancePx(field, wx, wy);
          if (inner < 16) {
            const idx = sampleRectIndex(field, wx, wy);
            const surface = idx >= 0 ? ISLA_NATAL_WALK_RECTS[idx].surface : 'sand';
            ctx.fillStyle = wetRimColor(surface, 1 - inner / 16);
            ctx.fillRect(px, py, step, step);
          }
          continue;
        }
        // Franja orgánica que sobresale de la tierra caminable.
        const idx = sampleRectIndex(field, wx, wy);
        const surface = idx >= 0 ? ISLA_NATAL_WALK_RECTS[idx].surface : 'sand';
        const dry = dd < -6;
        ctx.fillStyle = dry ? SURFACE_BASE[surface] : SURFACE_WET[surface];
        ctx.fillRect(px, py, step, step);
        if (dry && th > 0.7) {
          ctx.fillStyle = SURFACE_LIGHT[surface];
          ctx.fillRect(px, py, 1, 1);
        }
        if (!dry && th > 0.55) {
          ctx.fillStyle = 'rgba(226, 250, 246, 0.3)';
          ctx.fillRect(px, py, 2, 1);
        }
        if (d < 13) {
          ctx.fillStyle = wetRimColor(surface, 1 - d / 13);
          ctx.fillRect(px, py, step, step);
        }
        continue;
      }

      // Bajío: bandas turquesa con ondulación propia y degradado hacia mar abierto.
      const wobble =
        Math.sin(wx * 0.058 + wy * 0.021) * 2.4 + Math.sin(wy * 0.079 - wx * 0.013) * 1.8;
      const band = dd + wobble;
      if (band > SHELF_RANGE) continue;
      if (band > SHELF_RANGE - 24) {
        const chance = (band - (SHELF_RANGE - 24)) / 28;
        if (th < chance) continue;
      }
      ctx.fillStyle = shelfColor(band);
      ctx.fillRect(px, py, step, step);

      // Detalle submarino: destellos, praderas de posidonia y arena sumergida.
      if (band < 26 && th > 0.88) {
        ctx.fillStyle = 'rgba(224, 255, 250, 0.4)';
        ctx.fillRect(px, py, 2 + Math.floor(th * 3), 1);
      } else if (band > 8 && band < 34 && th < 0.035) {
        ctx.fillStyle = 'rgba(18, 78, 68, 0.35)';
        ctx.fillRect(px + 1, py + 1, 3, 2);
      }
      if (band < 12 && th > 0.74) {
        ctx.fillStyle = 'rgba(214, 240, 214, 0.32)';
        ctx.fillRect(px + 1, py, 2, 1);
      }
    }
  }
}

function paintGroundLayer(field: NatalCoastField): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ISLA_NATAL_WORLD_W + field.pad * 2;
  canvas.height = ISLA_NATAL_WORLD_H + field.pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  // Las texturas de superficie se dibujan en coordenadas de mundo: hay que
  // compensar el margen extra de la capa (la costa ya lo resta por su cuenta).
  ctx.save();
  ctx.translate(field.pad, field.pad);

  // 1. Superficies caminables con textura artesanal.
  for (const r of ISLA_NATAL_WALK_RECTS) {
    const seed = hash2(Math.round(r.x), Math.round(r.y)) * 100;
    if (r.surface === 'sand') {
      paintSandTexture(ctx, r.x, r.y, r.w, r.h, seed);
    } else if (r.surface === 'grass') {
      paintGrassTexture(ctx, r.x, r.y, r.w, r.h, seed);
    } else if (r.surface === 'path') {
      paintPathTexture(ctx, r.x, r.y, r.w, r.h, seed, r.w >= r.h);
    } else {
      paintRockTexture(ctx, r.x, r.y, r.w, r.h, seed);
    }
  }

  // 2. Bordes vivos entre superficies distintas.
  for (const r of ISLA_NATAL_WALK_RECTS) paintSurfaceFringe(ctx, r);

  // 3. Caras de roca de la meseta, que caen sobre la pradera o el mar.
  for (const r of ISLA_NATAL_WALK_RECTS) {
    if (r.surface === 'rock') paintRockCliffs(ctx, r);
  }

  ctx.restore();

  // 4. Costa, bajío y orla húmeda (por encima de las texturas).
  paintCoastBand(ctx, field);

  return canvas;
}

function ensureCoastLayer(): HTMLCanvasElement | null {
  if (coastGroundLayer) return coastGroundLayer;
  if (typeof document === 'undefined') return null;
  coastField = buildCoastField();
  coastFoam = buildFoamPoints(coastField);
  coastGroundLayer = paintGroundLayer(coastField);
  return coastGroundLayer;
}

/* ------------------------------------------------------------------ */
/* MAR                                                                */
/* ------------------------------------------------------------------ */

function drawOcean(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number,
  animFrame4: number,
  charge: number
): void {
  const startTileX = Math.floor(camX / CELL) - 1;
  const endTileX = Math.ceil((camX + vw) / CELL) + 1;
  const startTileY = Math.floor(camY / CELL) - 1;
  const endTileY = Math.ceil((camY + vh) / CELL) + 1;

  // Gradiente de profundidad: el mar pierde luz hacia el sur, como en la hora dorada.
  const depth = ctx.createLinearGradient(0, camY, 0, camY + vh);
  depth.addColorStop(0, '#0d3553');
  depth.addColorStop(0.45, '#0a2b47');
  depth.addColorStop(1, '#061e33');
  ctx.fillStyle = depth;
  ctx.fillRect(camX, camY, vw, vh);

  for (let ty = startTileY; ty <= endTileY; ty++) {
    for (let tx = startTileX; tx <= endTileX; tx++) {
      const wx = tx * CELL;
      const wy = ty * CELL;
      const th = hash2(tx, ty);
      // Manto de profundidad continuo: sin bloques de 3×3 celdas.
      const macro =
        0.5 +
        0.28 * Math.sin(wx * 0.011 + Math.sin(wy * 0.007) * 2.3) +
        0.22 * Math.sin(wy * 0.015 + 1.7);
      // Tinte de profundidad muy suave: al bajar el alfa, la retícula de celdas
      // deja de leerse como cuadrados y el mar se ve continuo como en el Origen.
      const macroAlpha = 0.04 + macro * 0.12;

      ctx.fillStyle = `rgba(18, 66, 98, ${macroAlpha.toFixed(3)})`;
      ctx.fillRect(wx, wy, CELL, CELL);
      if (macro < 0.24) {
        ctx.fillStyle = 'rgba(3, 16, 28, 0.12)';
        ctx.fillRect(wx, wy, CELL, CELL);
      }

      const shift = (animFrame4 + (tx % 4) + (ty % 3)) % 4;

      // Oleaje principal: dos crestas desfasadas que no siempre aparecen.
      const w1x = wx + 2 + Math.floor(th * 12) + shift * 3;
      const w1y = wy + 7 + (shift % 3);
      const w2x = wx + 18 - shift * 3 + Math.floor((1 - th) * 8);
      const w2y = wy + 22 - (shift % 3);
      const len1 = 7 + Math.floor(th * 5);
      const len2 = 6 + Math.floor((1 - th) * 6);

      if (th > 0.18) {
        ctx.fillStyle = '#04182a';
        ctx.fillRect(w1x - 1, w1y + 2, len1 + 2, 2);
        ctx.fillStyle = charge > 0.4 ? '#1f719b' : '#195f86';
        ctx.fillRect(w1x, w1y, len1, 2);
        ctx.fillStyle = charge > 0.4 ? '#63d4ce' : '#4fbdbd';
        ctx.fillRect(w1x + 2, w1y, Math.max(2, len1 - 4), 1);
      }
      if (th < 0.84) {
        ctx.fillStyle = '#04182a';
        ctx.fillRect(w2x - 1, w2y + 2, len2 + 2, 2);
        ctx.fillStyle = charge > 0.4 ? '#1f719b' : '#195f86';
        ctx.fillRect(w2x, w2y, len2, 2);
        ctx.fillStyle = charge > 0.4 ? '#63d4ce' : '#4fbdbd';
        ctx.fillRect(w2x + 2, w2y, Math.max(2, len2 - 3), 1);
      }

      // Cresta corta de relleno, en posición variable.
      if (th > 0.52) {
        const w3x = wx + 6 + Math.floor(hash2(tx + 7, ty - 3) * 18);
        const w3y = wy + 14 + Math.floor(hash2(tx - 2, ty + 9) * 12);
        const len3 = 3 + Math.floor(th * 3);
        ctx.fillStyle = 'rgba(41, 118, 148, 0.7)';
        ctx.fillRect(w3x, w3y, len3, 1);
        ctx.fillStyle = 'rgba(132, 214, 208, 0.5)';
        ctx.fillRect(w3x + 1, w3y - 1, Math.max(1, len3 - 2), 1);
      }

      // Espuma suelta sobre las crestas.
      if (th > 0.8) {
        ctx.fillStyle = 'rgba(223, 247, 238, 0.9)';
        ctx.fillRect(w1x + 3, w1y - 1, 2, 1);
      }
      if (th < 0.13) {
        ctx.fillStyle = '#dff7ee';
        ctx.fillRect(w2x + 4, w2y - 1, 2, 1);
      }

      // Swell largo: líneas tenues que atraviesan varias celdas.
      if (th > 0.62) {
        const sx = wx + 4 + Math.floor(th * 10);
        const sy = wy + 15 + (shift % 3);
        ctx.fillStyle = 'rgba(30, 96, 128, 0.5)';
        ctx.fillRect(sx, sy, 13 + Math.floor(th * 8), 1);
        ctx.fillStyle = 'rgba(88, 183, 180, 0.35)';
        ctx.fillRect(sx + 2, sy - 1, 6, 1);
      }

      // Pequeños remolinos y destellos de corriente.
      if (macro > 0.7) {
        const gl = Math.sin(elapsed * 1.3 + tx * 0.8 + ty * 0.5);
        if (gl > 0.55) {
          ctx.fillStyle = 'rgba(150, 226, 220, 0.5)';
          ctx.fillRect(wx + 12, wy + 18, 3, 1);
        }
      }

      // Reflejo dorado del sol poniente sobre la mitad oeste.
      if (wx < 820 && th % 5 === 0) {
        const glint = Math.sin(elapsed * 1.6 + tx * 0.7 + ty * 0.4);
        if (glint > 0.35) {
          ctx.fillStyle = `rgba(247, 212, 137, ${(0.24 + glint * 0.34).toFixed(3)})`;
          ctx.fillRect(w2x + 1, w2y - 2, 6 + Math.floor(glint * 5), 1);
          if (glint > 0.8) {
            ctx.fillStyle = 'rgba(255, 244, 214, 0.8)';
            ctx.fillRect(w2x + 3, w2y - 2, 2, 1);
          }
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* TIERRA: bajío, arena húmeda, superficies y espuma                   */
/* ------------------------------------------------------------------ */

function drawLandmass(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number
): void {
  const layer = ensureCoastLayer();

  if (layer) {
    const sx = Math.max(0, Math.round(camX) + GROUND_PAD - 6);
    const sy = Math.max(0, Math.round(camY) + GROUND_PAD - 6);
    const sw = Math.min(layer.width - sx, Math.ceil(vw) + 12);
    const sh = Math.min(layer.height - sy, Math.ceil(vh) + 12);
    if (sw > 0 && sh > 0) {
      ctx.drawImage(layer, sx, sy, sw, sh, sx - GROUND_PAD, sy - GROUND_PAD, sw, sh);
    }
  } else {
    // Respaldo mínimo si el canvas no está disponible.
    ctx.fillStyle = '#e8d3a0';
    for (const r of ISLA_NATAL_WALK_RECTS) {
      if (!isWorldBoxVisible(r.x, r.y, r.w, r.h, camX, camY, vw, vh)) continue;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  drawShoreWater(ctx, camX, camY, vw, vh, elapsed);
}

/** Brillo, ondulación y espuma animada sobre la costa prerenderizada. */
function drawShoreWater(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number
): void {
  const field = coastField;
  if (!field) return;

  // Cáusticas del bajío: destellos quietos que respiran con la marea.
  const grid = 14;
  const gx0 = Math.floor(camX / grid) * grid;
  const gy0 = Math.floor(camY / grid) * grid;
  for (let wy = gy0; wy < camY + vh + grid; wy += grid) {
    for (let wx = gx0; wx < camX + vw + grid; wx += grid) {
      const th = hash2(wx + 61, wy - 37);
      if (th < 0.82) continue;
      const d = sampleDistancePx(field, wx + 7, wy + 7);
      if (d < 2 || d > 46) continue;
      const shimmer = Math.sin(elapsed * 2.1 + th * 34 + d * 0.18);
      if (shimmer < 0.15) continue;
      const alpha = 0.1 + (shimmer + 0.5) * 0.2;
      ctx.fillStyle = `rgba(196, 255, 249, ${alpha.toFixed(3)})`;
      const len = 3 + Math.floor(th * 5);
      ctx.fillRect(wx + Math.floor(th * 8), wy + Math.floor(th * 10), len, 1);
    }
  }

  // Rompiente: espuma que sube y baja siguiendo el contorno real de la isla.
  const foam = coastFoam;
  for (let i = 0; i < foam.length; i++) {
    const f = foam[i];
    if (!isWorldBoxVisible(f.x - 14, f.y - 14, 28, 28, camX, camY, vw, vh)) continue;
    const wave = Math.sin(elapsed * (1.5 + f.band * 0.18) + f.phase);
    const tide = wave * (1.3 + f.band * 0.7);
    const x = Math.round(f.x + (f.horiz ? 0 : tide));
    const y = Math.round(f.y + (f.horiz ? tide : 0));

    if (f.band === 0) {
      // Lengua de espuma que lame la arena.
      const a = 0.28 + Math.max(0, wave) * 0.55;
      ctx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 7, 2);
      else ctx.fillRect(x, y, 2, 6);
      if (f.seed > 0.62) {
        ctx.fillStyle = 'rgba(190, 246, 236, 0.75)';
        if (f.horiz) ctx.fillRect(x + 2, y - 1, 3, 1);
        else ctx.fillRect(x - 1, y + 1, 1, 3);
      }
    } else if (f.band === 1) {
      const a = 0.16 + Math.max(0, wave) * 0.34;
      ctx.fillStyle = `rgba(232, 255, 250, ${a.toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 8, 1);
      else ctx.fillRect(x, y, 1, 7);
    } else if (f.band === 2) {
      const a = 0.08 + Math.max(0, wave) * 0.18;
      ctx.fillStyle = `rgba(190, 240, 236, ${a.toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 5, 1);
      else ctx.fillRect(x, y, 1, 5);
    } else if (wave > 0.5) {
      ctx.fillStyle = `rgba(220, 250, 246, ${(0.05 + wave * 0.1).toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 4, 1);
      else ctx.fillRect(x, y, 1, 4);
    }
  }
}

/* ------------------------------------------------------------------ */
/* VEGETACIÓN Y ROCAS                                                 */
/* ------------------------------------------------------------------ */

function drawTuft(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, sway: number): void {
  const h = 3 + Math.floor(seed * 6);
  const kind = Math.floor(hash2(x, y) * 3);
  ctx.fillStyle = 'rgba(30, 68, 32, 0.35)';
  ctx.fillRect(x - 2, y, 6, 1);

  // Tres variantes de mata: abanico alto, penacho bajo y brote doble. Así el
  // campo no repite la misma silueta por todas partes.
  if (kind === 0) {
    ctx.fillStyle = seed > 0.5 ? '#356f36' : '#3d7c3c';
    ctx.fillRect(x - 3, y - h + 2, 1, h - 1);
    ctx.fillRect(x + 3, y - h + 1, 1, h - 1);
    ctx.fillStyle = seed > 0.5 ? '#5fae4e' : '#4f9a45';
    ctx.fillRect(x - 2, y - h, 1, h);
    ctx.fillRect(x + 2, y - h + 1, 1, h - 1);
    ctx.fillStyle = seed > 0.5 ? '#8ddb74' : '#79c96a';
    ctx.fillRect(x - 1 + sway, y - h, 1, h - 1);
    ctx.fillRect(x + 1 + sway, y - h - 1, 1, h);
    ctx.fillRect(x + sway, y - h + 2, 1, h - 3);
    if (seed > 0.62) {
      ctx.fillStyle = '#b7e88f';
      ctx.fillRect(x + 1 + sway, y - h - 1, 1, 1);
    }
  } else if (kind === 1) {
    // Penacho bajo y tupido, sin punta brillante.
    ctx.fillStyle = '#3d7c3c';
    ctx.fillRect(x - 2, y - h + 1, 5, h - 1);
    ctx.fillStyle = '#589c48';
    ctx.fillRect(x - 1 + sway, y - h, 3, h - 1);
    ctx.fillStyle = '#74c161';
    ctx.fillRect(x + sway, y - h, 1, h - 2);
  } else {
    // Brote doble, más oscuro y discreto.
    ctx.fillStyle = '#356f36';
    ctx.fillRect(x - 2, y - h + 2, 1, h - 2);
    ctx.fillRect(x + 1, y - h + 1, 1, h - 1);
    ctx.fillStyle = '#549e44';
    ctx.fillRect(x - 1 + sway, y - h, 1, h - 1);
    ctx.fillRect(x + 2 + sway, y - h + 1, 1, h - 2);
  }
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  ctx.fillStyle = 'rgba(30, 68, 32, 0.35)';
  ctx.fillRect(x - 1, y, 4, 1);
  ctx.fillStyle = '#3f8a41';
  ctx.fillRect(x, y - 4, 1, 4);
  ctx.fillRect(x + 1, y - 2, 2, 1);
  const petal = seed > 0.8 ? '#f9a8d4' : seed > 0.55 ? '#fde68a' : seed > 0.3 ? '#f8fafc' : '#c4b5fd';
  ctx.fillStyle = petal;
  ctx.fillRect(x - 1, y - 6, 3, 1);
  ctx.fillRect(x - 1, y - 5, 1, 3);
  ctx.fillRect(x + 1, y - 5, 1, 3);
  ctx.fillRect(x, y - 7, 1, 1);
  ctx.fillRect(x, y - 3, 1, 1);
  ctx.fillStyle = seed > 0.5 ? '#fbbf24' : '#f59e0b';
  ctx.fillRect(x, y - 5, 1, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(x - 1, y - 6, 1, 1);
}

function drawPebble(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  const s = 2 + Math.floor(seed * 3);
  ctx.fillStyle = 'rgba(60, 50, 36, 0.28)';
  ctx.fillRect(x, y + 1, s + 1, 1);
  ctx.fillStyle = seed > 0.5 ? '#b9ae97' : '#9a9080';
  ctx.fillRect(x, y, s, s - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(x, y, Math.max(1, s - 1), 1);
  ctx.fillStyle = 'rgba(80, 70, 54, 0.5)';
  ctx.fillRect(x + s - 1, y, 1, s - 1);
}

function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  ctx.fillStyle = 'rgba(90, 70, 40, 0.25)';
  ctx.fillRect(x, y + 2, 5, 1);
  ctx.fillStyle = seed > 0.5 ? '#fbcfe8' : '#fde9d3';
  ctx.fillRect(x, y, 4, 3);
  ctx.fillRect(x + 1, y - 1, 2, 1);
  ctx.fillStyle = 'rgba(190, 130, 150, 0.7)';
  ctx.fillRect(x + 1, y, 1, 3);
  ctx.fillRect(x + 3, y + 1, 1, 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(x, y, 2, 1);
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const sway = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.6 + seed * 8) * 0.8);
  const w = 26 + Math.floor(seed * 10);
  const half = Math.round(w / 2);
  const rows = 4;

  // Sombra de contacto.
  ctx.fillStyle = 'rgba(18, 44, 22, 0.34)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 1, half - 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Silueta con contorno oscuro y tres capas de follaje.
  const rowW = [w, w - 2, w - 9, w - 18];
  for (let i = rows - 1; i >= 0; i--) {
    const rw = rowW[i];
    const ry = y - 4 - i * 5;
    const rx = x - Math.round(rw / 2) + (i < 2 ? sway : 0);
    ctx.fillStyle = '#173c1d';
    ctx.fillRect(rx - 1, ry - 1, rw + 2, 7);
    ctx.fillStyle = i >= 2 ? '#245f2b' : i === 1 ? '#2f7d3a' : '#3d8f43';
    ctx.fillRect(rx, ry, rw, 5);
    // Bisel superior iluminado del costado oeste.
    ctx.fillStyle = i >= 2 ? '#357f3a' : '#4f9f4c';
    ctx.fillRect(rx + 1, ry, rw - 3, 1);
  }

  // Hojas sueltas que rompen el contorno.
  for (let i = 0; i < 7; i++) {
    const th = hash2(x + i * 13, y - i * 7);
    if (th < 0.4) continue;
    const lx = x - half + Math.round(th * (w - 6));
    const ly = y - 6 - Math.floor(hash2(i + 3, x) * 16);
    ctx.fillStyle = th > 0.7 ? '#7fc460' : '#2b6f33';
    ctx.fillRect(lx, ly, 3, 2);
  }

  // Bayas rojas sobre el follaje (sólo en los arbustos marcados).
  if (seed > 0.5) {
    for (let i = 0; i < 4; i++) {
      const bx = x - half + 6 + Math.round(hash2(x + i, y + 5) * (w - 14));
      const by = y - 8 - Math.floor(hash2(y - i, x + 9) * 12);
      ctx.fillStyle = '#8b1e24';
      ctx.fillRect(bx, by, 3, 3);
      ctx.fillStyle = '#e0524e';
      ctx.fillRect(bx, by, 2, 2);
      ctx.fillStyle = '#ffd9cf';
      ctx.fillRect(bx, by, 1, 1);
    }
  }

  // Pastito de la base.
  ctx.fillStyle = '#2f6d33';
  ctx.fillRect(x - half + 2, y, 5, 2);
  ctx.fillRect(x + half - 7, y + 1, 4, 2);
  ctx.fillStyle = '#7fc460';
  ctx.fillRect(x - half + 3, y - 1, 2, 2);
}

interface NatalMote {
  x: number;
  y: number;
  phase: number;
  speed: number;
  size: number;
}

/** Polen dorado flotando sobre la pradera y la playa. */
const NATAL_MOTES: NatalMote[] = (() => {
  const out: NatalMote[] = [];
  let guard = 0;
  while (out.length < 120 && guard < 4000) {
    guard++;
    const x = 280 + hash2(guard, 13) * 1160;
    const y = 250 + hash2(guard + 421, 29) * 830;
    if (!pointOnLand(x, y)) continue;
    out.push({
      x: Math.round(x),
      y: Math.round(y),
      phase: hash2(guard + 7, 3) * 6.283,
      speed: 0.25 + hash2(guard + 3, 11) * 0.5,
      size: hash2(guard + 5, 17) > 0.78 ? 2 : 1,
    });
  }
  return out;
})();

interface NatalButterfly {
  x: number;
  y: number;
  phase: number;
  color: string;
}

/** Mariposas que rondan las flores silvestres. */
const NATAL_BUTTERFLIES: NatalButterfly[] = ISLA_NATAL_FLOWERS.filter(
  (_, index) => index % 24 === 5
).map((f, i) => ({
  x: f.x,
  y: f.y,
  phase: f.seed * 6.283 + i,
  color: i % 2 === 0 ? '#fde68a' : '#fbcfe8',
}));

function drawAmbientLife(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  for (let i = 0; i < NATAL_MOTES.length; i++) {
    const m = NATAL_MOTES[i];
    if (!isWorldBoxVisible(m.x - 12, m.y - 12, 24, 24, camX, camY, vw, vh)) continue;
    const t = elapsed * m.speed + m.phase;
    const x = Math.round(m.x + Math.sin(t) * 13 + Math.cos(t * 0.6) * 5);
    const y = Math.round(m.y + Math.cos(t * 0.8) * 7 - Math.sin(t * 0.4) * 4);
    const a = 0.18 + (Math.sin(t * 1.7) * 0.5 + 0.5) * 0.4;
    ctx.fillStyle = `rgba(255, 238, 184, ${a.toFixed(3)})`;
    ctx.fillRect(x, y, m.size, m.size);
  }

  if (reducedMotion) return;
  for (let i = 0; i < NATAL_BUTTERFLIES.length; i++) {
    const b = NATAL_BUTTERFLIES[i];
    const t = elapsed * 0.7 + b.phase;
    const x = Math.round(b.x + Math.sin(t) * 26 + Math.sin(t * 0.37) * 9);
    const y = Math.round(b.y - 10 + Math.cos(t * 0.8) * 12);
    if (!isWorldBoxVisible(x - 8, y - 8, 16, 16, camX, camY, vw, vh)) continue;
    const flap = Math.sin(elapsed * 12 + b.phase) > 0 ? 1 : 0;
    ctx.fillStyle = b.color;
    ctx.fillRect(x - 2, y - flap, 2, 2);
    ctx.fillRect(x + 1, y - flap, 2, 2);
    ctx.fillStyle = 'rgba(80, 60, 40, 0.8)';
    ctx.fillRect(x, y, 1, 2);
  }
}


function drawPalm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const sway = reducedMotion ? 0 : Math.sin(elapsed * 1.08 + seed * 9) * 2.6;
  const h = 48 + Math.floor(seed * 20);
  const baseX = Math.round(x);
  const baseY = Math.round(y);

  // Sombra alargada hacia el este (sol bajo al oeste) y sombra de contacto.
  ctx.fillStyle = 'rgba(20, 50, 30, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x + 22, y + 4, 29, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(16, 42, 26, 0.34)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 2, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base de pradera, hojarasca y piedra al pie del tronco.
  ctx.fillStyle = '#3d7c3c';
  ctx.fillRect(baseX - 8, baseY - 3, 16, 3);
  ctx.fillStyle = '#79c96a';
  ctx.fillRect(baseX - 6, baseY - 6, 2, 4);
  ctx.fillRect(baseX + 4, baseY - 5, 2, 3);
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(baseX - 10, baseY - 2, 5, 2);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.3)';
  ctx.fillRect(baseX - 10, baseY - 2, 2, 1);
  ctx.fillStyle = 'rgba(74, 48, 26, 0.5)';
  ctx.fillRect(baseX - 5, baseY - 1, 11, 2);

  // Tronco curvado por segmentos: corteza, anillos y brillo izquierdo.
  for (let i = 0; i < h; i += 3) {
    const t = i / h;
    const tx = Math.round(baseX + t * t * 11 + sway * t * 0.75);
    const ty = baseY - i;
    const wide = i < 6 ? 7 : i > h * 0.68 ? 4 : 5;
    ctx.fillStyle = '#4a2f1b';
    ctx.fillRect(tx - 3, ty - 3, wide + 2, 4);
    ctx.fillStyle = i % 9 === 0 ? '#6e4a29' : '#7d5530';
    ctx.fillRect(tx - 2, ty - 3, wide, 4);
    ctx.fillStyle = '#a67c48';
    ctx.fillRect(tx - 2, ty - 3, 1, 4);
    ctx.fillStyle = 'rgba(48, 28, 14, 0.55)';
    ctx.fillRect(tx + wide - 2, ty - 3, 1, 4);
    if (i % 9 === 0) {
      ctx.fillStyle = 'rgba(58, 36, 20, 0.6)';
      ctx.fillRect(tx - 2, ty - 1, wide, 1);
      ctx.fillStyle = 'rgba(196, 150, 96, 0.4)';
      ctx.fillRect(tx - 1, ty - 2, wide - 2, 1);
    }
  }

  // Vainas secas colgando bajo la corona.
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(baseX + 7, baseY - h + 2, 3, 8);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(baseX + 8, baseY - h + 3, 1, 6);
  ctx.fillStyle = '#5a3c22';
  ctx.fillRect(baseX + 12, baseY - h + 1, 2, 6);

  const crownX = baseX + 11 + Math.round(sway * 0.9);
  const crownY = baseY - h;

  const fronds = 10;
  const specs: { ang: number; len: number; droop: number }[] = [];
  for (let i = 0; i < fronds; i++) {
    const ang = (i / fronds) * Math.PI * 2 + 0.28 + seed * 1.6;
    specs.push({
      ang,
      len: 19 + Math.floor(hash2(i + 3, Math.round(seed * 90)) * 9),
      droop: 5 + hash2(i - 7, Math.round(seed * 40)) * 7,
    });
  }
  specs.sort((a, b) => Math.sin(a.ang) - Math.sin(b.ang));

  const paintFrond = (
    ang: number,
    len: number,
    droop: number,
    shade: string,
    mid: string,
    light: string,
    offsetY: number
  ) => {
    const dirX = Math.cos(ang);
    const dirY = Math.sin(ang) * 0.55;
    const perpX = -Math.sin(ang);
    const perpY = Math.cos(ang) * 0.6;
    for (let s = 2; s <= len; s++) {
      const t = s / len;
      const wob = reducedMotion ? 0 : Math.sin(elapsed * 1.7 + s * 0.4 + seed * 5) * 1.1 * t;
      const px = Math.round(crownX + dirX * s + sway * t * 1.4 + wob);
      const py = Math.round(crownY + dirY * s + droop * t * t * 1.5 + offsetY);
      ctx.fillStyle = shade;
      ctx.fillRect(px - 1, py, 2, 2);
      if (s % 2 === 0) {
        const leaf = Math.min(4, 1 + Math.round((1 - t) * 3));
        ctx.fillStyle = mid;
        ctx.fillRect(px + Math.round(perpX * leaf) - 1, py + Math.round(perpY * leaf), 1, 1);
        ctx.fillRect(px - Math.round(perpX * leaf) - 1, py - Math.round(perpY * leaf), 1, 1);
        if (s % 4 === 0) {
          ctx.fillStyle = light;
          ctx.fillRect(px + Math.round(perpX * leaf), py + Math.round(perpY * leaf) - 1, 1, 1);
        }
      }
    }
    ctx.fillStyle = light;
    const tipX = Math.round(crownX + dirX * (len + 1) + sway * 1.4);
    const tipY = Math.round(crownY + dirY * (len + 1) + droop * 1.5 + offsetY);
    ctx.fillRect(tipX, tipY, 1, 1);
  };

  // Capa de sombra de la copa.
  for (let i = 0; i < specs.length; i++) {
    const f = specs[i];
    paintFrond(f.ang, f.len, f.droop, '#1c4b27', '#245f2e', '#245f2e', 2);
  }
  // Capa iluminada, con dos verdes alternados.
  for (let i = 0; i < specs.length; i++) {
    const f = specs[i];
    const even = i % 2 === 0;
    paintFrond(
      f.ang,
      f.len,
      f.droop,
      even ? '#2f7d3a' : '#286f34',
      even ? '#3f9c4a' : '#379044',
      '#a8e08c',
      0
    );
  }

  // Corona fibrosa y brote central.
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(crownX - 3, crownY + 1, 7, 4);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(crownX - 2, crownY, 5, 2);
  ctx.fillStyle = '#6bbf5c';
  ctx.fillRect(crownX - 2, crownY - 1, 5, 3);
  ctx.fillStyle = '#a8e08c';
  ctx.fillRect(crownX - 1, crownY - 2, 3, 2);

  // Racimo de cocos con brillo.
  const coconuts: [number, number][] = [
    [-4, 4],
    [2, 5],
    [-1, 7],
  ];
  for (let i = 0; i < coconuts.length; i++) {
    const [ox, oy] = coconuts[i];
    ctx.fillStyle = '#5e3d22';
    ctx.fillRect(crownX + ox - 1, crownY + oy - 1, 4, 4);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(crownX + ox, crownY + oy, 3, 3);
    ctx.fillStyle = 'rgba(255, 214, 150, 0.4)';
    ctx.fillRect(crownX + ox, crownY + oy, 1, 1);
  }
}

function drawBoulder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number
): void {
  const w = 16 + Math.floor(seed * 14);
  const h = 11 + Math.floor(seed * 10);
  const left = Math.round(x - w / 2);
  const top = Math.round(y - h);

  // Sombra de contacto y sombra proyectada al este.
  ctx.fillStyle = 'rgba(24, 40, 26, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 2, w * 0.62, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Silueta facetada por filas: luz del oeste, base en sombra.
  for (let i = 0; i < h; i++) {
    const t = i / Math.max(1, h - 1);
    const inset = Math.round(Math.pow(Math.abs(t - 0.42) * 1.5, 1.7) * (w * 0.24));
    const rowW = Math.max(3, w - inset * 2);
    const rx = left + inset;
    const ry = top + i;
    ctx.fillStyle = t < 0.32 ? '#8d8779' : t < 0.72 ? '#797366' : '#6a6559';
    ctx.fillRect(rx, ry, rowW, 1);
    if (i === 0) {
      ctx.fillStyle = 'rgba(255, 244, 220, 0.4)';
      ctx.fillRect(rx + 1, ry, rowW - 2, 1);
    }
  }

  // Faceta iluminada superior izquierda y cara este en sombra.
  ctx.fillStyle = 'rgba(255, 244, 220, 0.28)';
  ctx.fillRect(left + Math.round(w * 0.16), top + 1, Math.round(w * 0.32), 2);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
  ctx.fillRect(left + Math.round(w * 0.1), top + 3, Math.round(w * 0.2), 1);
  ctx.fillStyle = 'rgba(38, 36, 32, 0.45)';
  ctx.fillRect(left + Math.round(w * 0.66), top + Math.round(h * 0.32), Math.round(w * 0.24), Math.round(h * 0.58));

  // Grietas y vetas.
  ctx.fillStyle = 'rgba(48, 45, 40, 0.6)';
  ctx.fillRect(left + Math.round(w * 0.34), top + 3, 1, Math.max(3, h - 5));
  if (seed > 0.45) {
    ctx.fillRect(left + Math.round(w * 0.52), top + Math.round(h * 0.4), Math.round(w * 0.2), 1);
    ctx.fillRect(left + Math.round(w * 0.56), top + Math.round(h * 0.4), 1, 3);
  }

  // Musgo y liquen en la cara superior.
  if (seed > 0.35) {
    ctx.fillStyle = '#5f9a52';
    ctx.fillRect(left + Math.round(w * 0.18), top, Math.floor(w * 0.44), 3);
    ctx.fillStyle = '#7bb967';
    ctx.fillRect(left + Math.round(w * 0.24), top, Math.floor(w * 0.2), 1);
    ctx.fillStyle = 'rgba(196, 214, 168, 0.55)';
    ctx.fillRect(left + Math.round(w * 0.52), top + 1, 2, 1);
  }

  // Pedruscos al pie.
  ctx.fillStyle = '#6f6a5e';
  ctx.fillRect(left + Math.round(w * 0.08), y - 1, 3, 2);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.35)';
  ctx.fillRect(left + Math.round(w * 0.08), y - 1, 2, 1);
}

/** Grandes peñascos que dan cuerpo a los bloqueos de la meseta y de la costa. */
function drawRockOutcrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  const left = Math.round(x);
  const top = Math.round(y);

  ctx.fillStyle = 'rgba(24, 40, 26, 0.26)';
  ctx.beginPath();
  ctx.ellipse(left + w * 0.55, top + h + 2, w * 0.55, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo en dos bloques superpuestos, con silueta redondeada por filas.
  const blocks: [number, number, number, number, number][] = [
    [0, 0.24, 1, 1, 0],
    [0.16, 0.06, 0.78, 0.62, 1],
  ];
  for (let b = 0; b < blocks.length; b++) {
    const [bx, by, bw, bh] = blocks[b];
    const bwPx = w * bw;
    const bhPx = h * bh;
    const bxPx = left + w * bx;
    const byPx = top + h * by;
    for (let i = 0; i < bhPx; i++) {
      const t = i / Math.max(1, bhPx - 1);
      const inset = Math.round(Math.pow(Math.abs(t - 0.5) * 1.45, 1.8) * (bwPx * 0.16));
      const rowW = Math.max(3, bwPx - inset * 2);
      const tone =
        t < 0.26 ? '#9a9384' : t < 0.6 ? '#857f71' : t < 0.85 ? '#726c60' : '#625d52';
      ctx.fillStyle = tone;
      ctx.fillRect(bxPx + inset, byPx + i, rowW, 1);
      if (i === 0) {
        ctx.fillStyle = 'rgba(255, 244, 220, 0.32)';
        ctx.fillRect(bxPx + inset + 2, byPx + i, Math.max(2, rowW - 5), 1);
      }
    }
    if (b === 1) {
      ctx.fillStyle = 'rgba(255, 244, 220, 0.2)';
      ctx.fillRect(bxPx + bwPx * 0.18, byPx + 3, bwPx * 0.3, 2);
    }
  }

  // Estratos, grietas y musgo.
  ctx.fillStyle = 'rgba(62, 58, 50, 0.5)';
  ctx.fillRect(left + 4, top + h * 0.55, w - 8, 2);
  ctx.fillRect(left + w * 0.24, top + h * 0.72, w * 0.44, 1);
  ctx.fillStyle = 'rgba(42, 39, 34, 0.55)';
  ctx.fillRect(left + w * 0.36, top + 4, 1, h * 0.42);
  ctx.fillRect(left + w * 0.37, top + h * 0.42, w * 0.16, 1);
  if (seed > 0.28) {
    ctx.fillStyle = '#5f9a52';
    ctx.fillRect(left + w * 0.14, top, w * 0.38, 3);
    ctx.fillStyle = '#86bd6e';
    ctx.fillRect(left + w * 0.22, top, w * 0.16, 1);
    ctx.fillStyle = '#4c7f44';
    ctx.fillRect(left + w * 0.15, top + 3, w * 0.2, 1);
  }
  ctx.fillStyle = 'rgba(196, 214, 168, 0.5)';
  ctx.fillRect(left + w * 0.62, top + h * 0.18, 2, 1);
  ctx.fillRect(left + w * 0.7, top + h * 0.28, 1, 1);

  // Esquirlas al pie.
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(left + 3, top + h - 1, 4, 2);
  ctx.fillRect(left + w - 8, top + h - 2, 3, 2);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.32)';
  ctx.fillRect(left + 3, top + h - 1, 3, 1);
}

/** Tronco caído del claro: corteza, anillos y musgo húmedo. */
function drawFallenLog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  const left = Math.round(x);
  const top = Math.round(y);
  const logH = Math.max(12, h - 6);

  ctx.fillStyle = 'rgba(24, 40, 26, 0.3)';
  ctx.beginPath();
  ctx.ellipse(left + w * 0.5, top + h + 1, w * 0.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sombra bajo el tronco.
  ctx.fillStyle = '#3e2816';
  ctx.fillRect(left, top + logH - 4, w, 5);

  // Cuerpo del tronco con vetas.
  ctx.fillStyle = '#6b4626';
  ctx.fillRect(left, top, w, logH);
  ctx.fillStyle = '#825833';
  ctx.fillRect(left, top + 1, w, logH - 6);
  ctx.fillStyle = '#9c6b3d';
  ctx.fillRect(left, top + 2, w, 3);
  ctx.fillStyle = 'rgba(255, 220, 170, 0.28)';
  ctx.fillRect(left + 2, top + 1, w - 6, 1);
  for (let px = left + 8; px < left + w - 6; px += 13) {
    const th = hash2(px + 3, top + seed * 100);
    ctx.fillStyle = 'rgba(74, 48, 26, 0.55)';
    ctx.fillRect(px, top + 3, 1 + Math.floor(th * 3), logH - 8);
    ctx.fillStyle = 'rgba(196, 142, 90, 0.4)';
    ctx.fillRect(px + 2, top + 5, 4 + Math.floor(th * 5), 1);
  }

  // Anillos del corte en el extremo oeste.
  ctx.fillStyle = '#c89a63';
  ctx.fillRect(left - 2, top + 2, 5, logH - 6);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(left - 1, top + 4, 1, logH - 10);
  ctx.fillStyle = '#6b4626';
  ctx.fillRect(left - 2, top + 2, 1, logH - 6);

  // Musgo sobre la corteza.
  ctx.fillStyle = '#5f9a52';
  ctx.fillRect(left + 6, top + 1, Math.floor(w * 0.22), 3);
  ctx.fillRect(left + w * 0.62, top + 2, Math.floor(w * 0.18), 2);
  ctx.fillStyle = '#86bd6e';
  ctx.fillRect(left + 8, top + 1, Math.floor(w * 0.1), 1);

  // Hongos y hojas al pie.
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(left + w * 0.28, top + logH - 1, 2, 3);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(left + w * 0.28 - 1, top + logH - 2, 4, 2);
}

/* ------------------------------------------------------------------ */
/* CONSTRUCCIONES                                                     */
/* ------------------------------------------------------------------ */

function drawHut(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const { x, y } = HUT_POS;
  const s = ISLA_NATAL_SOLIDS.find((v) => v.id === 'cabana');
  const w = s ? s.w : 112;
  const h = s ? s.h : 94;

  // Sombra proyectada hacia el este.
  ctx.fillStyle = 'rgba(24, 44, 28, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.62, y + h - 3, w * 0.78, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(16, 34, 20, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.4, y + h - 1, w * 0.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cimiento de piedra.
  ctx.fillStyle = '#5c564c';
  ctx.fillRect(x - 2, y + h - 8, w + 4, 9);
  ctx.fillStyle = '#8d8779';
  for (let sx = x; sx < x + w; sx += 14) {
    const th = hash2(sx, y + h);
    ctx.fillStyle = th > 0.5 ? '#8d8779' : '#797366';
    ctx.fillRect(sx + 1, y + h - 7, 12, 6);
    ctx.fillStyle = 'rgba(255, 244, 220, 0.25)';
    ctx.fillRect(sx + 1, y + h - 7, 10, 1);
  }
  ctx.fillStyle = 'rgba(36, 40, 30, 0.45)';
  ctx.fillRect(x - 2, y + h + 1, w + 4, 2);

  // Muros de madera con tablas, vetas y nudos.
  ctx.fillStyle = '#6b482c';
  ctx.fillRect(x, y + 26, w, h - 26);
  ctx.fillStyle = '#7d5738';
  ctx.fillRect(x + 3, y + 28, w - 6, h - 32);
  for (let py = y + 30; py < y + h - 8; py += 8) {
    ctx.fillStyle = 'rgba(52, 33, 19, 0.5)';
    ctx.fillRect(x + 3, py + 7, w - 6, 1);
    ctx.fillStyle = 'rgba(214, 164, 108, 0.18)';
    ctx.fillRect(x + 4, py, w - 9, 1);
    for (let px = x + 7; px < x + w - 8; px += 17) {
      const th = hash2(px + 3, py - 7);
      if (th > 0.82) {
        ctx.fillStyle = 'rgba(64, 38, 20, 0.55)';
        ctx.fillRect(px, py + 2, 2, 2);
      }
    }
  }

  // Esquineros y vigas verticales.
  ctx.fillStyle = '#4f3521';
  ctx.fillRect(x, y + 26, 5, h - 26);
  ctx.fillRect(x + w - 5, y + 26, 5, h - 26);
  ctx.fillStyle = '#9a6f45';
  ctx.fillRect(x + 1, y + 26, 1, h - 26);
  ctx.fillRect(x + w - 5, y + 26, 1, h - 26);
  ctx.fillStyle = 'rgba(52, 33, 19, 0.4)';
  for (let py = y + 34; py < y + h - 10; py += 14) {
    ctx.fillRect(x + 1, py, 2, 4);
    ctx.fillRect(x + w - 3, py + 5, 2, 4);
  }

  // Ventana del este con postigos y luz cálida.
  const winX = x + w - 24;
  const winY = y + 42;
  ctx.fillStyle = '#3b2717';
  ctx.fillRect(winX - 3, winY - 3, 22, 20);
  ctx.fillStyle = '#6b482c';
  ctx.fillRect(winX - 3, winY - 3, 22, 2);
  ctx.fillRect(winX - 3, winY + 14, 22, 2);
  const flicker = reducedMotion ? 0.85 : 0.78 + Math.sin(elapsed * 3.1) * 0.07;
  ctx.fillStyle = `rgba(255, 196, 106, ${flicker.toFixed(2)})`;
  ctx.fillRect(winX, winY, 16, 14);
  ctx.fillStyle = 'rgba(255, 236, 178, 0.55)';
  ctx.fillRect(winX + 1, winY + 1, 6, 4);
  ctx.fillStyle = '#3b2717';
  ctx.fillRect(winX + 7, winY, 2, 14);
  ctx.fillRect(winX, winY + 6, 16, 2);
  // Postigos azules a los lados.
  ctx.fillStyle = '#3f5f6b';
  ctx.fillRect(winX - 8, winY - 1, 5, 16);
  ctx.fillRect(winX + 16, winY - 1, 5, 16);
  ctx.fillStyle = '#4d7180';
  ctx.fillRect(winX - 8, winY - 1, 5, 2);
  ctx.fillRect(winX + 16, winY - 1, 5, 2);
  ctx.fillStyle = 'rgba(20, 34, 40, 0.5)';
  for (let sy = winY + 3; sy < winY + 14; sy += 4) {
    ctx.fillRect(winX - 7, sy, 3, 1);
    ctx.fillRect(winX + 17, sy, 3, 1);
  }
  // Jardinera con flores.
  ctx.fillStyle = '#5d3f28';
  ctx.fillRect(winX - 3, winY + 16, 22, 4);
  ctx.fillStyle = '#8a6242';
  ctx.fillRect(winX - 2, winY + 16, 20, 1);
  const blooms = ['#f9a8d4', '#fde68a', '#f8fafc'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#3f8a41';
    ctx.fillRect(winX + 1 + i * 5, winY + 13, 1, 3);
    ctx.fillStyle = blooms[i % 3];
    ctx.fillRect(winX + i * 5, winY + 12, 3, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(winX + 1 + i * 5, winY + 12, 1, 1);
  }

  // Puerta al este, con umbral y pomo.
  const doorX = x + w - 46;
  const doorY = y + h - 40;
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(doorX - 3, doorY - 3, 30, 43);
  ctx.fillStyle = '#5d3f28';
  ctx.fillRect(doorX, doorY, 24, 40);
  ctx.fillStyle = '#6e4a2d';
  ctx.fillRect(doorX + 2, doorY + 2, 20, 36);
  for (let dy = doorY + 5; dy < doorY + 37; dy += 7) {
    ctx.fillStyle = 'rgba(52, 33, 19, 0.5)';
    ctx.fillRect(doorX + 2, dy, 20, 1);
  }
  ctx.fillStyle = '#8a5f3a';
  ctx.fillRect(doorX + 11, doorY + 2, 1, 36);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(doorX + 18, doorY + 20, 2, 3);
  ctx.fillStyle = 'rgba(255, 236, 160, 0.6)';
  ctx.fillRect(doorX + 18, doorY + 20, 1, 1);
  // Umbral de piedra.
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(doorX - 2, y + h - 2, 28, 3);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.3)';
  ctx.fillRect(doorX - 2, y + h - 2, 26, 1);

  // Farol del porche y su halo suave.
  const lanternX = doorX + 27;
  const lanternY = doorY - 8;
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(lanternX, doorY - 16, 2, 10);
  ctx.fillStyle = '#6b6259';
  ctx.fillRect(lanternX - 3, lanternY - 2, 8, 2);
  ctx.fillStyle = `rgba(255, 198, 108, ${(0.66 + flicker * 0.2).toFixed(2)})`;
  ctx.fillRect(lanternX - 2, lanternY, 6, 6);
  ctx.fillStyle = '#fde9b0';
  ctx.fillRect(lanternX - 1, lanternY + 1, 4, 3);
  ctx.fillStyle = '#4a3120';
  ctx.fillRect(lanternX - 3, lanternY + 6, 8, 2);
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(lanternX + 1, lanternY + 3, 1, lanternX + 1, lanternY + 3, 22);
    gl.addColorStop(0, 'rgba(255, 196, 106, 0.28)');
    gl.addColorStop(1, 'rgba(255, 196, 106, 0)');
    ctx.fillStyle = gl;
    ctx.fillRect(lanternX - 21, lanternY - 18, 44, 44);
    ctx.restore();
  }

  // Techo de paja a dos aguas, con haces y borde deshilachado.
  const roofTop = y - 12;
  const roofBottom = y + 31;
  for (let i = 0; i < roofBottom - roofTop; i += 3) {
    const t = i / (roofBottom - roofTop);
    const halfW = (w / 2 + 2) * (0.56 + 0.44 * t);
    const left = Math.round(x + w / 2 - halfW);
    const width = Math.round(halfW * 2);
    const row = Math.floor(i / 3);
    ctx.fillStyle = row % 2 === 0 ? '#c9a24a' : '#bd9642';
    ctx.fillRect(left, roofTop + i, width, 3);
    ctx.fillStyle = row % 3 === 0 ? 'rgba(255, 226, 154, 0.4)' : 'rgba(150, 116, 54, 0.38)';
    ctx.fillRect(left + 2, roofTop + i, width - 4, 1);
    // Hebras de paja.
    for (let px = left + 3; px < left + width - 3; px += 7) {
      const th = hash2(px, roofTop + i);
      if (th < 0.45) continue;
      ctx.fillStyle = th > 0.72 ? 'rgba(255, 236, 176, 0.5)' : 'rgba(126, 94, 42, 0.5)';
      ctx.fillRect(px, roofTop + i + 1, 2 + Math.floor(th * 4), 1);
    }
  }
  // Alero y sombra bajo el techo.
  ctx.fillStyle = '#8f6f30';
  ctx.fillRect(x - 10, roofBottom - 2, w + 20, 4);
  ctx.fillStyle = 'rgba(42, 32, 18, 0.45)';
  ctx.fillRect(x - 10, roofBottom + 2, w + 20, 2);
  ctx.fillStyle = 'rgba(255, 236, 180, 0.3)';
  ctx.fillRect(x - 6, roofTop + 2, w * 0.5, 2);
  // Borde deshilachado de la paja.
  for (let px = x - 9; px < x + w + 9; px += 6) {
    const th = hash2(px, roofBottom);
    if (th < 0.4) continue;
    ctx.fillStyle = th > 0.6 ? '#b8913f' : '#a8823a';
    ctx.fillRect(px, roofBottom + 1, 2, 1 + Math.floor(th * 3));
  }
  // Viga cumbrera y ataduras.
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x + w / 2 - w * 0.3, roofTop - 2, w * 0.6, 4);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x + w / 2 - w * 0.28, roofTop - 1, w * 0.56, 1);
  for (let px = x + w * 0.26; px < x + w * 0.76; px += 17) {
    ctx.fillStyle = '#4f3521';
    ctx.fillRect(px, roofTop - 3, 2, 6);
  }

  // Chimenea de piedra y humo lento.
  ctx.fillStyle = '#5c564c';
  ctx.fillRect(x + 24, roofTop - 8, 13, 17);
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(x + 24, roofTop - 8, 13, 3);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.3)';
  ctx.fillRect(x + 25, roofTop - 8, 10, 1);
  ctx.fillStyle = 'rgba(60, 56, 48, 0.5)';
  ctx.fillRect(x + 29, roofTop - 5, 1, 12);
  ctx.fillRect(x + 33, roofTop - 3, 1, 10);
  if (!reducedMotion) {
    for (let i = 0; i < 6; i++) {
      const st = (elapsed * 0.28 + i / 6) % 1;
      const alpha = 0.28 * (1 - st);
      ctx.fillStyle = `rgba(228, 234, 240, ${alpha.toFixed(3)})`;
      const sx = x + 30 + Math.sin(st * 7 + i) * 8;
      const sy = roofTop - 12 - st * 42;
      const size = 2 + Math.round(st * 5);
      ctx.fillRect(Math.round(sx), Math.round(sy), size, size - 1);
    }
  }

  // Pila de leña y macetas junto al muro oeste.
  ctx.fillStyle = '#4f3521';
  ctx.fillRect(x - 14, y + h - 18, 16, 18);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#7d5530';
    ctx.fillRect(x - 13, y + h - 16 + i * 5, 14, 4);
    ctx.fillStyle = '#c89a63';
    ctx.fillRect(x - 13, y + h - 16 + i * 5, 2, 4);
    ctx.fillStyle = 'rgba(60, 38, 22, 0.5)';
    ctx.fillRect(x - 13, y + h - 13 + i * 5, 14, 1);
  }
  ctx.fillStyle = '#9a5a3a';
  ctx.fillRect(x + 10, y + h - 3, 8, 4);
  ctx.fillStyle = '#c97a4a';
  ctx.fillRect(x + 10, y + h - 3, 8, 1);
  ctx.fillStyle = '#5f9a52';
  ctx.fillRect(x + 12, y + h - 4, 3, 1);

  // ---------------------------------------------------------------
  // PORCHE DE ENTRADA: alero, postes, banco y rótulo tallado.
  // ---------------------------------------------------------------
  const porchY = doorY - 22;
  const postLeft = doorX - 16;
  const postRight = doorX + 42;
  // Sombra del porche sobre el muro.
  ctx.fillStyle = 'rgba(36, 20, 10, 0.3)';
  ctx.fillRect(doorX - 8, porchY + 2, 58, 6);
  // Postes torneados.
  for (const px of [postLeft, postRight]) {
    ctx.fillStyle = '#3f2a19';
    ctx.fillRect(px, porchY - 2, 5, doorY - porchY + 22);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(px + 1, porchY - 1, 2, doorY - porchY + 20);
    ctx.fillStyle = '#5c3f26';
    ctx.fillRect(px - 1, porchY - 3, 7, 3);
    ctx.fillRect(px - 1, y + h - 6, 7, 3);
  }
  // Viga del alero y tablillas.
  ctx.fillStyle = '#4f3521';
  ctx.fillRect(postLeft - 4, porchY - 8, postRight - postLeft + 13, 7);
  ctx.fillStyle = '#8f6f30';
  ctx.fillRect(postLeft - 3, porchY - 8, postRight - postLeft + 11, 2);
  for (let px = postLeft - 2; px < postRight + 8; px += 9) {
    ctx.fillStyle = 'rgba(50, 32, 18, 0.45)';
    ctx.fillRect(px, porchY - 6, 1, 4);
  }
  // Alero de paja inclinado.
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath();
  ctx.moveTo(postLeft - 6, porchY - 8);
  ctx.lineTo(postRight + 10, porchY - 8);
  ctx.lineTo(postRight + 4, porchY - 16);
  ctx.lineTo(postLeft - 1, porchY - 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 226, 154, 0.45)';
  ctx.fillRect(postLeft - 1, porchY - 16, postRight - postLeft + 5, 1);
  ctx.fillStyle = 'rgba(126, 94, 42, 0.6)';
  ctx.fillRect(postLeft - 2, porchY - 10, postRight - postLeft + 8, 1);
  for (let px = postLeft - 2; px < postRight + 4; px += 5) {
    const th = hash2(px, porchY);
    if (th < 0.45) continue;
    ctx.fillStyle = th > 0.7 ? '#b8913f' : '#a8823a';
    ctx.fillRect(px, porchY - 8, 1, 1 + Math.floor(th * 2));
  }
  // Rótulo tallado «CASA» colgado bajo el alero.
  const signCx = doorX + 12;
  ctx.fillStyle = '#2f1d0f';
  ctx.fillRect(signCx - 26, porchY - 6, 52, 14);
  ctx.fillStyle = '#a87c45';
  ctx.fillRect(signCx - 25, porchY - 5, 50, 12);
  ctx.fillStyle = '#c69a5c';
  ctx.fillRect(signCx - 24, porchY - 5, 48, 1);
  ctx.fillStyle = '#4a2f18';
  ctx.fillRect(signCx - 22, porchY - 10, 1, 5);
  ctx.fillRect(signCx + 21, porchY - 10, 1, 5);
  ctx.fillStyle = '#2c1a0d';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CASA', signCx, porchY + 4);
  ctx.textAlign = 'left';
  // Banco de madera junto a la ventana.
  const benchX = winX - 16;
  const benchY = y + h - 14;
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(benchX, benchY, 30, 3);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(benchX + 1, benchY - 1, 28, 2);
  ctx.fillRect(benchX + 2, benchY + 2, 2, 8);
  ctx.fillRect(benchX + 26, benchY + 2, 2, 8);
  ctx.fillStyle = 'rgba(50, 32, 18, 0.5)';
  ctx.fillRect(benchX + 4, benchY + 4, 22, 1);
  // Maceta de barro con lavanda sobre el banco.
  ctx.fillStyle = '#9a5a3a';
  ctx.fillRect(benchX + 20, benchY - 7, 7, 6);
  ctx.fillStyle = '#c97a4a';
  ctx.fillRect(benchX + 20, benchY - 7, 7, 1);
  ctx.fillStyle = '#6b8f5a';
  ctx.fillRect(benchX + 21, benchY - 11, 1, 4);
  ctx.fillRect(benchX + 24, benchY - 12, 1, 5);
  ctx.fillStyle = '#a78bd0';
  ctx.fillRect(benchX + 20, benchY - 13, 3, 2);
  ctx.fillRect(benchX + 24, benchY - 13, 3, 2);
  // Piedras del sendero que salen de la puerta hacia el este.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(40, 28, 16, 0.3)';
    ctx.fillRect(doorX + 20 + i * 16, y + h + 6 + i * 3, 12, 4);
    ctx.fillStyle = i % 2 === 0 ? '#a9a190' : '#bdb5a2';
    ctx.fillRect(doorX + 19 + i * 16, y + h + 5 + i * 3, 11, 3);
    ctx.fillStyle = 'rgba(255, 250, 236, 0.35)';
    ctx.fillRect(doorX + 19 + i * 16, y + h + 5 + i * 3, 9, 1);
  }
  // Charco de luz cálida que la ventana proyecta en la hierba.
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const spill = ctx.createRadialGradient(winX + 6, y + h + 2, 2, winX + 6, y + h + 2, 26);
    spill.addColorStop(0, `rgba(255, 196, 110, ${(0.14 * flicker).toFixed(2)})`);
    spill.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = spill;
    ctx.fillRect(winX - 20, y + h - 18, 56, 48);
    ctx.restore();
  }
}

function drawShed(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  arcadeState: ArcadeCabinetState,
  reducedMotion: boolean
): void {
  const s = ISLA_NATAL_SOLIDS.find((v) => v.id === 'cobertizo');
  const x = SHED_POS.x;
  const y = SHED_POS.y;
  const w = s ? s.w : 146;
  const h = s ? s.h : 122;
  const lit = arcadeState !== 'dusty';

  ctx.fillStyle = 'rgba(18, 40, 26, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.62, y + h - 1, w * 0.72, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(12, 30, 18, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h + 1, w * 0.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Interior en sombra con profundidad.
  ctx.fillStyle = '#1d150e';
  ctx.fillRect(x + 6, y + 20, w - 12, h - 22);
  ctx.fillStyle = '#241a12';
  ctx.fillRect(x + 8, y + 22, w - 16, h - 28);
  ctx.fillStyle = 'rgba(10, 12, 10, 0.55)';
  ctx.fillRect(x + 10, y + 26, w - 20, 22);
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(x + 14, y + 44, w - 28, 4);

  // Maderos traseros y tablones del fondo.
  ctx.fillStyle = '#4f3a26';
  ctx.fillRect(x + 10, y + 24, 6, h - 30);
  ctx.fillRect(x + w - 16, y + 24, 6, h - 30);
  ctx.fillStyle = 'rgba(104, 76, 48, 0.5)';
  ctx.fillRect(x + 12, y + 30, 2, h - 40);
  ctx.fillRect(x + w - 14, y + 30, 2, h - 40);

  // Postes y tablas del frente.
  ctx.fillStyle = '#6f5136';
  ctx.fillRect(x, y + 16, 9, h - 16);
  ctx.fillRect(x + w - 9, y + 16, 9, h - 16);
  ctx.fillStyle = '#9a7248';
  ctx.fillRect(x + 1, y + 16, 2, h - 16);
  ctx.fillRect(x + w - 8, y + 16, 1, h - 16);
  ctx.fillStyle = 'rgba(52, 36, 22, 0.5)';
  for (let py = y + 24; py < y + h - 8; py += 12) {
    ctx.fillRect(x + 1, py, 7, 1);
    ctx.fillRect(x + w - 8, py, 7, 1);
  }
  ctx.fillStyle = '#5c4229';
  ctx.fillRect(x, y + h - 8, w, 8);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(x, y + h - 8, w, 2);

  // Tejadillo de chapa acanalada, con óxido y tornillos.
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 4 === 0 ? '#3f3225' : i % 3 === 0 ? '#584634' : '#4a3a2a';
    ctx.fillRect(x - 10, y - 4 + i, w + 20, 1);
  }
  for (let px = x - 6; px < x + w + 6; px += 14) {
    ctx.fillStyle = 'rgba(24, 20, 16, 0.4)';
    ctx.fillRect(px, y - 4, 1, 24);
    ctx.fillStyle = 'rgba(196, 160, 110, 0.18)';
    ctx.fillRect(px + 1, y - 4, 2, 2);
    if (hash2(px, y) > 0.7) {
      ctx.fillStyle = 'rgba(154, 88, 52, 0.5)';
      ctx.fillRect(px + 3, y + 3, 2, 14);
    }
  }
  ctx.fillStyle = '#3b2f22';
  ctx.fillRect(x - 12, y + 18, w + 24, 5);
  ctx.fillStyle = 'rgba(255, 232, 190, 0.22)';
  ctx.fillRect(x - 8, y - 2, w * 0.6, 2);
  ctx.fillStyle = 'rgba(20, 26, 16, 0.35)';
  ctx.fillRect(x - 12, y + 23, w + 24, 2);
  // Herrajes y cadenas.
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(x + 20, y + 18, 3, 5);
  ctx.fillRect(x + w - 32, y + 18, 3, 5);

  // Lona medio caída sobre el lateral este.
  ctx.fillStyle = '#3f5f6b';
  ctx.fillRect(x + w - 48, y + 36, 42, 50);
  ctx.fillStyle = '#4d7180';
  ctx.fillRect(x + w - 48, y + 36, 42, 5);
  ctx.fillStyle = 'rgba(20, 34, 40, 0.45)';
  ctx.fillRect(x + w - 30, y + 41, 2, 43);
  ctx.fillRect(x + w - 15, y + 41, 2, 43);
  ctx.fillStyle = 'rgba(126, 168, 178, 0.45)';
  ctx.fillRect(x + w - 44, y + 42, 3, 40);
  ctx.fillStyle = '#2b3e46';
  ctx.fillRect(x + w - 46, y + 80, 3, 3);
  ctx.fillRect(x + w - 12, y + 80, 3, 3);

  // Cajones, taburete y herramientas.
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x + 16, y + 78, 26, 20);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x + 16, y + 78, 26, 3);
  ctx.fillStyle = 'rgba(52, 33, 19, 0.5)';
  ctx.fillRect(x + 18, y + 86, 22, 2);
  ctx.fillRect(x + 18, y + 93, 22, 2);
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(x + 20, y + 96, 2, 4);
  ctx.fillRect(x + 36, y + 96, 2, 4);
  // Taburete.
  ctx.fillStyle = '#5d3f28';
  ctx.fillRect(x + 50, y + 90, 14, 4);
  ctx.fillRect(x + 52, y + 94, 2, 10);
  ctx.fillRect(x + 60, y + 94, 2, 10);
  // Herramientas colgadas.
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(x + 48, y + 34, 2, 26);
  ctx.fillRect(x + 45, y + 34, 8, 3);
  ctx.fillStyle = '#9a7248';
  ctx.fillRect(x + 56, y + 34, 2, 18);
  ctx.fillStyle = '#6b6259';
  ctx.fillRect(x + 54, y + 50, 6, 3);
  // Cable que sale hacia ninguna parte.
  ctx.strokeStyle = '#2b2b33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CABINET_POS.x + 14, CABINET_POS.y + 26);
  ctx.quadraticCurveTo(x + w - 4, y + h - 10, x + w + 16, y + h - 2);
  ctx.stroke();

  // Bombilla colgante del interior.
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(x + 88, y + 24, 1, 16);
  ctx.fillStyle = lit ? '#fef3c7' : '#8d8168';
  ctx.fillRect(x + 86, y + 39, 5, 5);
  if (lit && !reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x + 88, y + 42, 1, x + 88, y + 42, 26);
    g.addColorStop(0, 'rgba(255, 236, 160, 0.24)');
    g.addColorStop(1, 'rgba(255, 236, 160, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 62, y + 16, 52, 52);
    ctx.restore();
  }

  drawCabinet(ctx, elapsed, arcadeState, reducedMotion);
}

function drawCabinet(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  arcadeState: ArcadeCabinetState,
  reducedMotion: boolean
): void {
  const x = CABINET_POS.x - 18;
  const y = CABINET_POS.y - 40;
  const lit = arcadeState !== 'dusty';

  // Sombra del gabinete.
  ctx.fillStyle = 'rgba(10, 16, 10, 0.4)';
  ctx.fillRect(x - 3, y + 62, 42, 5);

  // Cuerpo con moldura, vetas y laterales de madera.
  ctx.fillStyle = '#2c2114';
  ctx.fillRect(x - 2, y + 2, 40, 63);
  ctx.fillStyle = lit ? '#d9a521' : '#8f7233';
  ctx.fillRect(x, y + 4, 36, 59);
  ctx.fillStyle = lit ? '#f0bf3c' : '#a8893f';
  ctx.fillRect(x + 2, y + 6, 32, 9);
  ctx.fillStyle = 'rgba(60, 40, 12, 0.5)';
  ctx.fillRect(x, y + 52, 36, 11);
  ctx.fillStyle = 'rgba(92, 60, 20, 0.55)';
  ctx.fillRect(x + 1, y + 8, 2, 44);
  ctx.fillRect(x + 33, y + 8, 2, 44);
  // Vetas laterales.
  ctx.fillStyle = 'rgba(255, 226, 150, 0.16)';
  for (let py = y + 10; py < y + 50; py += 8) {
    ctx.fillRect(x + 1, py, 1, 4);
    ctx.fillRect(x + 34, py + 3, 1, 3);
  }
  // T-molding.
  ctx.fillStyle = '#1c1a16';
  ctx.fillRect(x - 2, y + 2, 40, 2);
  ctx.fillRect(x - 2, y + 60, 40, 2);

  // Marquesina con bisel y brillo.
  ctx.fillStyle = '#1c1a16';
  ctx.fillRect(x + 2, y - 6, 32, 12);
  ctx.fillStyle = lit ? '#0d2136' : '#2a2118';
  ctx.fillRect(x + 3, y - 5, 30, 10);
  ctx.fillStyle = lit ? '#fef3c7' : '#8d8168';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PONG', x + 18, y + 3);
  if (lit) {
    ctx.fillStyle = 'rgba(254, 243, 199, 0.22)';
    ctx.fillRect(x + 4, y - 4, 28, 1);
  }

  // Pantalla con marco, bisel interior y reflejos.
  const sx = x + 5;
  const sy = y + 16;
  const sw = 26;
  const sh = 22;
  ctx.fillStyle = '#1c1a16';
  ctx.fillRect(sx - 2, sy - 2, sw + 4, sh + 4);
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);

  if (!lit) {
    ctx.fillStyle = 'rgba(190, 200, 210, 0.14)';
    ctx.fillRect(sx + 2, sy + 2, sw - 8, 3);
    ctx.fillStyle = 'rgba(120, 130, 140, 0.2)';
    ctx.fillRect(sx + 4, sy + sh - 6, 10, 2);
    ctx.fillStyle = 'rgba(120, 130, 140, 0.16)';
    ctx.fillRect(sx + 15, sy + 6, 4, 8);
  } else if (arcadeState === 'powered') {
    ctx.fillStyle = '#0d2136';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';
    ctx.fillRect(sx, sy, sw, sh);
    const bounce = reducedMotion
      ? sh / 2
      : sh / 2 + Math.sin(elapsed * 2.6) * (sh / 2 - 4);
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(sx + 3, sy + sh / 2 - 4, 2, 8);
    ctx.fillRect(sx + sw - 5, sy + sh / 2 - 4, 2, 8);
    ctx.fillRect(sx + sw / 2 - 1 + Math.round(Math.sin(elapsed * 1.7) * 6), sy + bounce - 1, 2, 2);
    // Líneas de barrido del tubo.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let ly = sy; ly < sy + sh; ly += 3) ctx.fillRect(sx, ly, sw, 1);
  } else {
    for (let i = 0; i < sh; i += 2) {
      const n = hash2(Math.floor(elapsed * 12) + i, i);
      ctx.fillStyle = n > 0.72 ? 'rgba(232, 251, 255, 0.9)' : 'rgba(20, 60, 80, 0.8)';
      ctx.fillRect(sx, sy + i, sw, 1 + Math.floor(n));
    }
    ctx.fillStyle = '#39ff14';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('3-0', sx + sw / 2, sy + sh / 2 + 2);
  }
  // Reflejo de pantalla.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(sx + 2, sy + 2, 8, 2);
  ctx.fillRect(sx + 2, sy + 5, 4, 8);

  // Panel de control con dos perillas, monedero y ranura.
  ctx.fillStyle = '#2b2116';
  ctx.fillRect(x + 4, y + 41, 28, 10);
  ctx.fillStyle = 'rgba(255, 226, 150, 0.12)';
  ctx.fillRect(x + 4, y + 41, 28, 1);
  const knob = (kx: number) => {
    ctx.fillStyle = '#0f0d0a';
    ctx.fillRect(kx - 2, y + 44, 5, 5);
    ctx.fillStyle = lit ? '#f8fafc' : '#6b7280';
    ctx.fillRect(kx - 1, y + 45, 3, 3);
    ctx.fillStyle = lit ? '#fbbf24' : '#6b5a2a';
    ctx.fillRect(kx, y + 45, 1, 2);
  };
  knob(x + 9);
  knob(x + 27);
  ctx.fillStyle = lit ? '#fbbf24' : '#6b5a2a';
  ctx.fillRect(x + 16, y + 54, 4, 3);
  ctx.fillStyle = '#0f0d0a';
  ctx.fillRect(x + 17, y + 54, 2, 1);
  // Rejilla inferior.
  ctx.fillStyle = 'rgba(20, 16, 10, 0.5)';
  for (let px = x + 6; px < x + 30; px += 4) {
    ctx.fillRect(px, y + 58, 2, 2);
  }

  if (lit) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = reducedMotion ? 0.5 : 0.42 + Math.sin(elapsed * 2.2) * 0.1;
    const g = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, 2, sx + sw / 2, sy + sh / 2, 66);
    g.addColorStop(0, `rgba(0, 243, 255, ${(0.34 * pulse * 2).toFixed(3)})`);
    g.addColorStop(0.45, `rgba(0, 243, 255, ${(0.1 * pulse * 2).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0, 243, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 64, sy - 64, sw + 128, sh + 128);
    ctx.restore();
  }
}

function drawSign(ctx: CanvasRenderingContext2D): void {
  // Mismo cartel pequeño del Origen; el texto se lee pulsando [E].
  drawGbcWoodenSign(ctx, SIGN_POS.x, SIGN_POS.y);
}

function drawNet(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const { x, y } = NET_POS;
  ctx.fillStyle = 'rgba(120, 96, 60, 0.55)';
  ctx.fillRect(x - 22, y - 8, 44, 16);
  ctx.strokeStyle = '#9fb6a8';
  ctx.lineWidth = 1;
  for (let i = -20; i <= 20; i += 5) {
    ctx.beginPath();
    ctx.moveTo(x + i, y - 8);
    ctx.lineTo(x + i + 3, y + 8);
    ctx.stroke();
  }
  for (let j = -6; j <= 6; j += 4) {
    ctx.beginPath();
    ctx.moveTo(x - 22, y + j + Math.sin(elapsed * 1.4 + j) * 0.6);
    ctx.lineTo(x + 22, y + j);
    ctx.stroke();
  }
  // Remiendo de hilo cian imposible
  ctx.strokeStyle = '#22d3ee';
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 6);
  ctx.lineTo(x + 16, y + 2);
  ctx.lineTo(x + 9, y + 6);
  ctx.stroke();
  // Flotadores
  ctx.fillStyle = '#f97316';
  ctx.fillRect(x - 20, y - 10, 3, 3);
  ctx.fillRect(x + 18, y - 10, 3, 3);
}

function drawShellCluster(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const { x, y } = SHELLS_POI_POS;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#fbcfe8' : '#fde9d3';
    ctx.fillRect(x - 10 + i * 9, y - 2 + (i % 2), 5, 4);
    ctx.fillStyle = 'rgba(190, 130, 150, 0.6)';
    ctx.fillRect(x - 9 + i * 9, y - 2 + (i % 2), 1, 4);
  }
  // Cangrejo que recoloca y huye
  const scuttle = (Math.sin(elapsed * 0.9) + 1) / 2;
  const cx = x + 16 + scuttle * 14;
  const cy = y + 8 - scuttle * 3;
  ctx.fillStyle = '#f4763c';
  ctx.fillRect(cx - 3, cy - 2, 6, 4);
  ctx.fillRect(cx - 5, cy - 1, 2, 2);
  ctx.fillRect(cx + 3, cy - 1, 2, 2);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(cx - 2, cy - 3, 1, 1);
  ctx.fillRect(cx + 1, cy - 3, 1, 1);
}

function drawMailbox(ctx: CanvasRenderingContext2D): void {
  const { x, y } = MAILBOX_POS;
  ctx.fillStyle = 'rgba(24, 44, 28, 0.3)';
  ctx.fillRect(x + 1, y, 12, 3);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x, y - 18, 3, 19);
  ctx.fillStyle = '#8b95a5';
  ctx.fillRect(x - 7, y - 30, 18, 13);
  ctx.fillStyle = '#a8b2c1';
  ctx.fillRect(x - 7, y - 30, 18, 4);
  ctx.fillStyle = '#3f4a5a';
  ctx.fillRect(x - 4, y - 24, 12, 2);
  // Postal asomando
  ctx.fillStyle = '#f8f5e6';
  ctx.fillRect(x - 2, y - 27, 8, 5);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(x - 1, y - 26, 6, 1);
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean
): void {
  // Reutiliza el cofre de Isla Orígenes como caja de herramientas del viejo viajero.
  drawRpgTreasureChest(ctx, CRATE_POS.x, CRATE_POS.y, false, '#d97706', elapsed, reducedMotion);
}

/**
 * Mirador del Alto de las Rocas: tarima de tablones, baranda y catalejo de latón
 * apuntando hacia adelante, sobre el horizonte donde duerme la Isla del Origen.
 */
function drawAltoMirador(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean
): void {
  const { x, y } = MIRADOR_POS;
  const glint = reducedMotion ? 0.55 : 0.35 + (Math.sin(elapsed * 1.7) + 1) * 0.18;

  // Sombra sobre la roca.
  ctx.fillStyle = 'rgba(14, 20, 26, 0.34)';
  ctx.fillRect(x - 62, y - 2, 124, 9);

  // Tarima de tablones.
  ctx.fillStyle = '#3a2413';
  ctx.fillRect(x - 62, y - 8, 124, 10);
  ctx.fillStyle = '#7a4f2a';
  ctx.fillRect(x - 62, y - 10, 124, 5);
  ctx.fillStyle = '#9a6a3c';
  ctx.fillRect(x - 62, y - 10, 124, 1);
  for (let i = -56; i <= 56; i += 12) {
    ctx.fillStyle = 'rgba(36, 20, 8, 0.45)';
    ctx.fillRect(x + i, y - 5, 1, 7);
  }

  // Postes y doble baranda de madera.
  for (const px of [x - 58, x - 4, x + 50]) {
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(px, y - 33, 6, 25);
    ctx.fillStyle = '#8a5a30';
    ctx.fillRect(px, y - 33, 2, 25);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(px, y - 34, 6, 2);
  }
  ctx.fillStyle = '#5c3a1f';
  ctx.fillRect(x - 60, y - 31, 120, 4);
  ctx.fillRect(x - 60, y - 18, 120, 3);
  ctx.fillStyle = '#a8743f';
  ctx.fillRect(x - 60, y - 32, 120, 2);
  ctx.fillStyle = `rgba(255, 214, 150, ${glint.toFixed(2)})`;
  ctx.fillRect(x - 60, y - 32, 120, 1);

  // Catalejo de latón sobre trípode, apuntando al horizonte (arriba).
  const tx = x - 8;
  const ty = y - 24;
  ctx.fillStyle = '#1c120a';
  ctx.beginPath();
  ctx.moveTo(tx, ty + 1);
  ctx.lineTo(tx - 16, y + 2);
  ctx.lineTo(tx - 11, y + 2);
  ctx.lineTo(tx + 1, ty + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx, ty + 1);
  ctx.lineTo(tx + 17, y + 2);
  ctx.lineTo(tx + 12, y + 2);
  ctx.lineTo(tx + 1, ty + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2616';
  ctx.fillRect(tx - 4, ty, 9, 4);

  // Tubo largo inclinado hacia adelante.
  ctx.save();
  ctx.translate(tx, ty - 2);
  ctx.rotate(-1.08);
  ctx.fillStyle = '#5b3a16';
  ctx.fillRect(-12, -4, 58, 9);
  ctx.fillStyle = '#a97a35';
  ctx.fillRect(-12, -4, 58, 4);
  ctx.fillStyle = '#e0b766';
  ctx.fillRect(-12, -4, 58, 1);
  // Refuerzos del tubo.
  ctx.fillStyle = '#3d260f';
  ctx.fillRect(-8, -5, 4, 11);
  ctx.fillRect(28, -5, 4, 11);
  // Campana del objetivo.
  ctx.fillStyle = '#3d260f';
  ctx.fillRect(42, -6, 9, 13);
  ctx.fillStyle = '#d9c082';
  ctx.fillRect(45, -4, 5, 9);
  ctx.fillStyle = `rgba(186, 244, 255, ${glint.toFixed(2)})`;
  ctx.fillRect(47, -2, 3, 6);
  // Ocular y contrapeso.
  ctx.fillStyle = '#6b471f';
  ctx.fillRect(-17, -5, 6, 11);
  ctx.fillStyle = '#2a1a0b';
  ctx.fillRect(-20, -3, 4, 7);
  ctx.restore();
}

function drawPaddleItem(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const x = CABINET_POS.x + 60;
  const y = CABINET_POS.y + 76;
  const bob = reducedMotion ? 0 : Math.sin(elapsed * 2.4) * 1.6;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 10 + bob, 1, x, y - 10 + bob, 34);
  g.addColorStop(0, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.4, 'rgba(0,243,255,0.22)');
  g.addColorStop(1, 'rgba(0,243,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 36, y - 46 + bob, 72, 72);
  ctx.restore();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x - 3, y - 26 + bob, 7, 22);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x - 3, y - 26 + bob, 2, 22);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x - 1, y - 4 + bob, 3, 8);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(x + 4, y - 20 + bob, 2, 12);
}

/** Muelle de madera del Puerto Norte: la rampa desde la que parte la barra. */
/** Pasarela de tablones donde el sendero de tierra entra en la arena de la playa. */
function drawBeachBoardwalk(ctx: CanvasRenderingContext2D): void {
  const x = 740;
  const y = 912;
  const w = 64;
  const h = 26;

  // Sombra húmeda sobre la arena y bajo los tablones.
  ctx.fillStyle = 'rgba(58, 42, 22, 0.26)';
  ctx.fillRect(x - 3, y + 5, w + 6, h + 4);
  ctx.fillStyle = 'rgba(30, 22, 12, 0.4)';
  ctx.fillRect(x, y + h, w, 3);

  // Tablones horizontales con veta, brillo y clavos.
  for (let row = 0; row < 4; row++) {
    const py = y + row * 6;
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(x, py, w, 6);
    ctx.fillStyle = row % 2 === 0 ? '#8a6238' : '#7c5732';
    ctx.fillRect(x + 1, py + 1, w - 2, 4);
    ctx.fillStyle = 'rgba(255, 226, 170, 0.22)';
    ctx.fillRect(x + 1, py + 1, w - 2, 1);
    ctx.fillStyle = 'rgba(52, 33, 19, 0.5)';
    for (let px = x + 9; px < x + w - 4; px += 16) {
      ctx.fillRect(px, py + 3, 1, 1);
    }
  }

  // Largueros laterales planos que enmarcan la pasarela sin levantar barandas
  // (una baranda alta se leería como un obstáculo sobre el camino).
  for (const px of [x - 3, x + w]) {
    ctx.fillStyle = 'rgba(30, 22, 12, 0.35)';
    ctx.fillRect(px, y, 3, h + 2);
    ctx.fillStyle = '#5c4229';
    ctx.fillRect(px, y, 3, h);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(px, y, 1, h);
  }

  // Cabeceras transversales en los dos extremos, al ras del suelo.
  for (const py of [y - 1, y + h - 3]) {
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(x - 3, py, w + 6, 4);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(x - 2, py, w + 4, 2);
    ctx.fillStyle = 'rgba(255, 226, 170, 0.28)';
    ctx.fillRect(x - 2, py, w + 4, 1);
  }
}

function drawNorthPortDock(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  ready: boolean,
  reducedMotion: boolean
): void {
  const { x, y } = ISLA_NATAL_DEPARTURE;
  const left = Math.round(x - 26);
  const bottom = Math.round(y + 4);
  const top = Math.round(y - 56);

  // Sombra sobre el agua.
  ctx.fillStyle = 'rgba(4, 20, 30, 0.35)';
  ctx.fillRect(left + 4, top + 8, 48, bottom - top + 2);

  // Pilotes que se hunden en el mar.
  for (let i = 0; i < 3; i++) {
    const px = left + 3 + i * 21;
    ctx.fillStyle = '#2e1d10';
    ctx.fillRect(px, top + 6, 5, bottom - top + 12);
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(px + 1, top + 6, 3, bottom - top + 8);
    ctx.fillStyle = 'rgba(30, 52, 58, 0.55)';
    ctx.fillRect(px, bottom + 6, 5, 6);
  }

  // Plataforma de tablones, con vetas y clavos.
  for (let py = top; py < bottom; py += 6) {
    const row = Math.round((py - top) / 6);
    const tone = row % 2 === 0 ? '#8a6238' : '#7a5530';
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(left, py, 52, 6);
    ctx.fillStyle = tone;
    ctx.fillRect(left + 1, py + 1, 50, 4);
    ctx.fillStyle = 'rgba(255, 226, 170, 0.22)';
    ctx.fillRect(left + 2, py + 1, 48, 1);
    ctx.fillStyle = 'rgba(52, 33, 19, 0.45)';
    for (let px = left + 8; px < left + 48; px += 14) {
      ctx.fillRect(px, py + 3, 1, 1);
    }
  }

  // Barandas laterales.
  for (const railX of [left + 1, left + 47]) {
    ctx.fillStyle = '#4f3521';
    ctx.fillRect(railX, top + 4, 4, bottom - top - 4);
    ctx.fillStyle = '#9a6f45';
    ctx.fillRect(railX, top + 4, 1, bottom - top - 4);
  }
  ctx.fillStyle = '#9a6f45';
  ctx.fillRect(left + 1, top + 6, 4, 3);
  ctx.fillRect(left + 47, top + 6, 4, 3);

  // Amarre y farolillo cian: señal de que el carril está disponible.
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(left + 45, top + 2, 2, 14);
  const glow = ready && !reducedMotion ? 0.6 + Math.sin(elapsed * 3.2) * 0.22 : ready ? 0.7 : 0.25;
  ctx.fillStyle = `rgba(0, 243, 255, ${glow.toFixed(2)})`;
  ctx.fillRect(left + 43, top - 3, 6, 6);
  ctx.fillStyle = 'rgba(224, 250, 255, 0.9)';
  ctx.fillRect(left + 44, top - 2, 4, 3);

  if (!ready) return;

  // Carril de luz que se pierde hacia el norte.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lane = ctx.createLinearGradient(0, top, 0, top - 120);
  lane.addColorStop(0, 'rgba(0, 243, 255, 0.28)');
  lane.addColorStop(1, 'rgba(0, 243, 255, 0)');
  ctx.fillStyle = lane;
  ctx.fillRect(left + 16, top - 118, 20, 122);
  for (let i = 0; i < 6; i++) {
    const t = reducedMotion ? i / 6 : ((elapsed * 0.24 + i / 6) % 1);
    const ly = top - 10 - t * 96;
    const alpha = 0.12 + (1 - t) * 0.32;
    ctx.fillStyle = `rgba(190, 246, 255, ${alpha.toFixed(3)})`;
    ctx.fillRect(left + 21 + Math.sin(t * 9 + i) * 6, Math.round(ly), 8, 2);
  }
  ctx.restore();
}

function drawDepartureBeacon(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  active: boolean,
  reducedMotion: boolean
): void {
  const { x, y } = ISLA_NATAL_DEPARTURE;
  if (!active) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const t = reducedMotion ? i / 3 : ((elapsed * 0.55 + i / 3) % 1);
    const r = 10 + t * 46;
    ctx.strokeStyle = `rgba(0, 243, 255, ${(0.5 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(224, 250, 255, 0.7)';
  ctx.fillRect(x - 1, y - 26 - Math.sin(elapsed * 2) * 2, 2, 12);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* AVATARES Y PARTÍCULAS                                              */
/* ------------------------------------------------------------------ */

type NatalAvatarParams = Pick<
  IslaNatalRenderParams,
  'player' | 'reducedMotion' | 'skinColor' | 'hairColor' | 'shirtColor' | 'appearance'
>;

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  params: NatalAvatarParams,
  elapsed: number
): void {
  const p = params.player;

  if (p.ridingPaddle) {
    const hover = params.reducedMotion ? 0 : Math.round(Math.sin(elapsed * 5.2) * 2.5);
    const boardY = p.y + 4;
    const avatarY = boardY + hover - 3;
    const tilt = p.rideTilt;

    // Estela en V: chorro de plasma y espuma que se abren tras la tabla
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, avatarY + 6);
    ctx.rotate(tilt);
    const plasma = ctx.createLinearGradient(-128, 0, 0, 0);
    plasma.addColorStop(0, 'rgba(0, 243, 255, 0)');
    plasma.addColorStop(0.6, 'rgba(0, 243, 255, 0.2)');
    plasma.addColorStop(1, 'rgba(0, 243, 255, 0.55)');
    ctx.fillStyle = plasma;
    ctx.fillRect(-128, -5, 128, 10);
    ctx.restore();

    // Espuma en abanico: dos filas de guiones que se abren tras la tabla
    ctx.save();
    ctx.translate(p.x, avatarY + 6);
    ctx.rotate(tilt);
    for (let i = 0; i < 6; i++) {
      const dist = 16 + i * 20;
      const spread = 3 + i * 2.2;
      const drift = Math.sin(elapsed * 8 - i * 1.15) * 2;
      const alpha = Math.max(0.08, 0.52 - i * 0.07);
      ctx.fillStyle = `rgba(224, 250, 255, ${alpha.toFixed(2)})`;
      ctx.fillRect(-dist - 10, -spread - 2 + drift, 12, 2);
      ctx.fillRect(-dist - 10, spread - 1 - drift, 12, 2);
      ctx.fillStyle = `rgba(165, 243, 252, ${(alpha * 0.85).toFixed(2)})`;
      ctx.fillRect(-dist - 3, 0, 9, 3);
    }
    // Cresta de proa: el canto corta el agua y levanta espuma delante
    const bow = params.reducedMotion
      ? 0.7
      : 0.55 + Math.sin(elapsed * 11) * 0.25;
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.55 + bow * 0.25).toFixed(2)})`;
    ctx.fillRect(20, -3, 7, 2);
    ctx.fillRect(26, 0, 5, 2);
    ctx.restore();

    // Rocío marino levantado por el canto de la tabla
    ctx.fillStyle = 'rgba(224, 250, 255, 0.6)';
    for (let i = 1; i <= 5; i++) {
      const back = i * 14;
      const wobble = Math.sin(elapsed * 7 + i) * 3;
      ctx.fillRect(
        p.x - Math.cos(tilt) * back + wobble - 2,
        avatarY - Math.sin(tilt) * back + 9,
        4,
        2
      );
    }

    // La Barra de Pong: la misma pieza del viejo viajero que espera en la Isla del Origen
    drawPongHoverboard(
      ctx,
      p.x,
      boardY,
      tilt,
      false,
      elapsed,
      params.skinColor,
      params.hairColor,
      params.shirtColor,
      params.reducedMotion,
      params.appearance
    );

    // Postura de surf: el cuerpo acompaña la inclinación de la tabla
    ctx.save();
    ctx.translate(p.x, avatarY);
    ctx.rotate(tilt * 0.72);
    drawPixelAvatar4Dir(
      ctx,
      0,
      0,
      p.facingDir,
      false,
      false,
      elapsed,
      params.skinColor,
      params.hairColor,
      params.shirtColor,
      {
        reducedMotion: params.reducedMotion,
        interactAnim: p.interactAnim,
        appearance: params.appearance,
      }
    );
    ctx.restore();
    return;
  }

  ctx.fillStyle = 'rgba(20, 44, 28, 0.34)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 3, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawPixelAvatar4Dir(
    ctx,
    p.x,
    p.y,
    p.facingDir,
    p.walking,
    p.sprinting,
    elapsed,
    params.skinColor,
    params.hairColor,
    params.shirtColor,
    {
      reducedMotion: params.reducedMotion,
      interactAnim: p.interactAnim,
      appearance: params.appearance,
    }
  );
}

function drawPromptBadge(ctx: CanvasRenderingContext2D, prompt: IslaNatalPromptSpec, bob: number): void {
  const px = Math.round(prompt.x);
  const py = Math.round(prompt.y - 52 + bob);
  ctx.save();
  ctx.font = '700 10px "JetBrains Mono", monospace';
  const text = `[E] ${prompt.label}`;
  const tw = Math.ceil(ctx.measureText(text).width) + 20;
  const left = Math.round(px - tw / 2);

  ctx.fillStyle = '#050811';
  ctx.fillRect(left - 2, py - 16, tw + 4, 24);
  ctx.fillStyle = prompt.accentHex || '#d8be88';
  ctx.fillRect(left, py - 14, tw, 20);
  ctx.fillStyle = '#0b1324';
  ctx.fillRect(left + 2, py - 12, tw - 4, 16);
  ctx.fillStyle = '#f8f5e6';
  ctx.textAlign = 'center';
  ctx.fillText(text, px, py);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* EL VIAJERO Y SU MÁQUINA DEL TIEMPO                                  */
/* ------------------------------------------------------------------ */

/** Geometría de la escena, derivada del punto de aterrizaje. */
const SHIP_HALF_W = 54;
const SHIP_LEG = 16;
const SHIP_HULL_H = 34;
const RAMP_LEN = 76;
const TALK_OFFSET = 104;
const DOOR_OFFSET = 46;
const DOOR_HEIGHT = 34;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smoothstep = (v: number): number => {
  const p = clamp01(v);
  return p * p * (3 - 2 * p);
};

/** Rastro chamuscado y polvo asentado en el punto de aterrizaje. */
function drawLandingScorch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(28, 26, 18, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 66, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(46, 38, 22, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 42, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trizas radiales en la hierba.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + hash2(i, 41) * 0.25;
    const r = 46 + hash2(i, 9) * 26;
    const len = 4 + hash2(i, 5) * 8;
    ctx.strokeStyle = `rgba(34, 30, 20, ${(0.18 + hash2(i, 3) * 0.16).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.26);
    ctx.lineTo(x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len) * 0.26);
    ctx.stroke();
  }

  // Brasas que aún respiran.
  for (let i = 0; i < 4; i++) {
    const pulse = 0.15 + 0.5 * Math.abs(Math.sin(elapsed * 1.6 + i * 1.7));
    ctx.fillStyle = `rgba(103, 232, 249, ${(pulse * 0.4).toFixed(3)})`;
    ctx.fillRect(
      Math.round(x - 30 + hash2(i, 21) * 60),
      Math.round(y - 1 + hash2(i, 13) * 3),
      2,
      2
    );
  }
  ctx.restore();
}

/**
 * Nave del viajero: casco metálico con remaches y paneles, cúpula de cristal,
 * patas hidráulicas, rampa de descenso y luces de aterrizaje.
 */
function drawTravelerShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  lift: number,
  elapsed: number,
  reducedMotion: boolean,
  landed: boolean
): void {
  const bob = !landed && !reducedMotion ? Math.sin(elapsed * 1.7) * 1.2 : 0;
  const cy = groundY - lift + bob;
  const hullBottom = cy - SHIP_LEG;
  const hullTop = hullBottom - SHIP_HULL_H;
  const left = x - SHIP_HALF_W;
  const right = x + SHIP_HALF_W;
  const shrink = clamp01(1 - lift / 300);
  const blink = reducedMotion ? 0.6 : 0.35 + Math.abs(Math.sin(elapsed * 3.4)) * 0.65;

  ctx.save();

  // Haz de aterrizaje: una columna de luz suave mientras baja.
  if (lift > 6) {
    const beam = ctx.createLinearGradient(0, hullBottom, 0, groundY);
    beam.addColorStop(0, 'rgba(150, 240, 255, 0.26)');
    beam.addColorStop(1, 'rgba(150, 240, 255, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(x - 34, hullBottom, 68, groundY - hullBottom);
  }

  // Sombra proyectada, se achica a medida que sube.
  ctx.fillStyle = `rgba(8, 20, 30, ${(0.3 * shrink).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(x, groundY + 3, 62 * (0.55 + 0.45 * shrink), 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Patas hidráulicas.
  for (const legX of [x - 38, x + 30]) {
    ctx.fillStyle = '#4b6172';
    ctx.fillRect(Math.round(legX), hullBottom, 5, SHIP_LEG);
    ctx.fillStyle = '#7e97a6';
    ctx.fillRect(Math.round(legX + 1), hullBottom, 1, SHIP_LEG - 3);
    ctx.fillStyle = '#2b3b48';
    ctx.fillRect(Math.round(legX - 4), groundY - 2, 13, 4);
    ctx.fillStyle = '#93a9b6';
    ctx.fillRect(Math.round(legX - 4), groundY - 2, 13, 1);
  }

  // Rampa de descenso hacia el oeste, sólo con la nave apoyada.
  if (landed) {
    const doorX = x - DOOR_OFFSET;
    const doorY = hullBottom - 4;
    const footX = doorX - RAMP_LEN;
    ctx.fillStyle = '#53697a';
    ctx.beginPath();
    ctx.moveTo(doorX - 2, doorY);
    ctx.lineTo(doorX + 14, doorY);
    ctx.lineTo(footX + 16, groundY + 1);
    ctx.lineTo(footX, groundY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7d95a4';
    ctx.beginPath();
    ctx.moveTo(doorX - 2, doorY);
    ctx.lineTo(doorX + 2, doorY);
    ctx.lineTo(footX + 2, groundY + 1);
    ctx.lineTo(footX, groundY + 1);
    ctx.closePath();
    ctx.fill();
    // Travesaños y luces de borde.
    for (let i = 1; i < 6; i++) {
      const p = i / 6;
      const px = doorX + (footX - doorX) * p;
      const py = doorY + (groundY - doorY) * p;
      ctx.fillStyle = 'rgba(24, 34, 42, 0.5)';
      ctx.fillRect(Math.round(px), Math.round(py), 14, 1);
    }
    ctx.fillStyle = `rgba(150, 240, 255, ${(0.4 + blink * 0.3).toFixed(3)})`;
    ctx.fillRect(Math.round(footX), Math.round(groundY - 1), 2, 2);
    ctx.fillRect(Math.round(footX + 13), Math.round(groundY - 1), 2, 2);
  }

  // Casco principal con degradado metálico.
  const hull = ctx.createLinearGradient(0, hullTop, 0, hullBottom);
  hull.addColorStop(0, '#54707f');
  hull.addColorStop(0.28, '#334c5c');
  hull.addColorStop(0.72, '#223542');
  hull.addColorStop(1, '#121e27');
  ctx.fillStyle = hull;
  ctx.fillRect(left, hullTop, SHIP_HALF_W * 2, SHIP_HULL_H);

  // Borde superior iluminado y panza en sombra.
  ctx.fillStyle = 'rgba(196, 228, 238, 0.5)';
  ctx.fillRect(left + 3, hullTop, SHIP_HALF_W * 2 - 6, 1);
  ctx.fillStyle = 'rgba(178, 208, 220, 0.22)';
  ctx.fillRect(left + 3, hullTop + 1, SHIP_HALF_W * 2 - 6, 3);
  ctx.fillStyle = 'rgba(8, 14, 18, 0.6)';
  ctx.fillRect(left, hullBottom - 5, SHIP_HALF_W * 2, 5);

  // Paneles verticales y remaches.
  for (let px = left + 12; px < right - 6; px += 18) {
    ctx.fillStyle = 'rgba(12, 20, 26, 0.45)';
    ctx.fillRect(px, hullTop + 4, 1, SHIP_HULL_H - 8);
    ctx.fillStyle = 'rgba(150, 186, 200, 0.14)';
    ctx.fillRect(px + 1, hullTop + 4, 1, SHIP_HULL_H - 8);
  }
  ctx.fillStyle = 'rgba(168, 200, 212, 0.4)';
  for (let px = left + 8; px < right - 4; px += 18) {
    for (let py = hullTop + 8; py < hullBottom - 8; py += 9) {
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // Franjas de advertencia en los costados.
  for (const sx of [left + 2, right - 10]) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c9a227' : '#1b262e';
      ctx.fillRect(sx + i * 2, hullBottom - 12, 2, 6);
    }
  }

  // Compuerta lateral izquierda.
  const doorX = x - DOOR_OFFSET;
  ctx.fillStyle = '#0d161d';
  ctx.fillRect(doorX - 2, hullBottom - DOOR_HEIGHT, 15, DOOR_HEIGHT - 4);
  ctx.fillStyle = '#3f5a6b';
  ctx.fillRect(doorX + 13, hullBottom - DOOR_HEIGHT, 2, DOOR_HEIGHT - 4);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.55)';
  ctx.fillRect(doorX - 1, hullBottom - DOOR_HEIGHT + 2, 13, 1);

  // Ventanillas.
  for (const wx of [x + 8, x + 26]) {
    ctx.fillStyle = '#0e1a22';
    ctx.fillRect(wx - 2, hullTop + 10, 12, 10);
    ctx.fillStyle = '#5fd7e8';
    ctx.fillRect(wx - 1, hullTop + 11, 10, 8);
    ctx.fillStyle = 'rgba(230, 253, 255, 0.85)';
    ctx.fillRect(wx, hullTop + 12, 4, 2);
    ctx.fillStyle = 'rgba(24, 70, 84, 0.5)';
    ctx.fillRect(wx + 6, hullTop + 14, 3, 4);
  }

  // Toberas y llama de los propulsores.
  for (const nx of [x - 30, x + 22]) {
    ctx.fillStyle = '#18262f';
    ctx.fillRect(nx, hullBottom - 2, 14, 4);
    ctx.fillStyle = '#4c6575';
    ctx.fillRect(nx + 1, hullBottom - 2, 12, 1);
  }
  if (lift > 2 && !reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const nx of [x - 27, x + 25]) {
      const flame = 8 + Math.abs(Math.sin(elapsed * 22 + nx)) * 10;
      const g = ctx.createLinearGradient(0, hullBottom, 0, hullBottom + flame);
      g.addColorStop(0, 'rgba(220, 252, 255, 0.95)');
      g.addColorStop(0.5, 'rgba(103, 232, 249, 0.55)');
      g.addColorStop(1, 'rgba(103, 232, 249, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(nx - 2, hullBottom, 8, flame);
    }
    ctx.restore();
  }

  // Cúpula de cristal: anillos de píxeles y reflejos.
  const domeH = 34;
  const domeTop = hullTop - domeH;
  const rows = [26, 40, 50, 58, 64, 68];
  for (let i = 0; i < rows.length; i++) {
    const w = rows[i];
    const ry = domeTop + i * 5;
    ctx.fillStyle = i < 2 ? '#9fb6c4' : i > 3 ? '#6f8798' : '#8aa3b3';
    ctx.fillRect(Math.round(x - w / 2), ry, w, 5);
  }
  const glass = ctx.createLinearGradient(0, domeTop, 0, hullTop);
  glass.addColorStop(0, 'rgba(176, 236, 246, 0.85)');
  glass.addColorStop(0.45, 'rgba(74, 152, 176, 0.85)');
  glass.addColorStop(1, 'rgba(20, 58, 76, 0.9)');
  ctx.fillStyle = glass;
  ctx.fillRect(x - 26, domeTop + 4, 52, domeH - 8);
  ctx.fillRect(x - 32, domeTop + 14, 64, domeH - 18);
  // Reflejo vertical.
  ctx.fillStyle = 'rgba(236, 254, 255, 0.5)';
  ctx.fillRect(x - 20, domeTop + 6, 5, domeH - 14);
  ctx.fillRect(x - 16, domeTop + 9, 2, domeH - 20);
  // Costillas de la cúpula.
  ctx.fillStyle = 'rgba(28, 54, 68, 0.55)';
  ctx.fillRect(x - 1, domeTop + 2, 2, domeH - 4);
  ctx.fillRect(x - 32, hullTop - 4, 64, 4);
  ctx.fillStyle = '#b9cdd8';
  ctx.fillRect(x - 32, hullTop - 4, 64, 1);
  // Luces internas.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const domeGlow = ctx.createRadialGradient(x, domeTop + 18, 2, x, domeTop + 18, 34);
  domeGlow.addColorStop(0, `rgba(103, 232, 249, ${(0.28 + blink * 0.18).toFixed(3)})`);
  domeGlow.addColorStop(1, 'rgba(103, 232, 249, 0)');
  ctx.fillStyle = domeGlow;
  ctx.fillRect(x - 34, domeTop - 6, 68, 52);
  ctx.restore();

  // Antena con baliza.
  ctx.fillStyle = '#5c7484';
  ctx.fillRect(x + 18, domeTop - 16, 2, 18);
  ctx.fillRect(x + 16, domeTop - 18, 6, 2);
  ctx.fillStyle = `rgba(255, 120, 90, ${blink.toFixed(3)})`;
  ctx.fillRect(x + 17, domeTop - 21, 4, 3);

  // Luces de aterrizaje en el borde del casco.
  const lightA = 0.35 + Math.abs(Math.sin(elapsed * 2.4)) * 0.65;
  const lightB = 0.35 + Math.abs(Math.sin(elapsed * 2.4 + Math.PI)) * 0.65;
  ctx.fillStyle = `rgba(150, 240, 255, ${lightA.toFixed(3)})`;
  ctx.fillRect(left + 4, hullTop + 2, 3, 3);
  ctx.fillStyle = `rgba(255, 170, 120, ${lightB.toFixed(3)})`;
  ctx.fillRect(right - 7, hullTop + 2, 3, 3);

  // Motas de energía alrededor de la nave.
  if (!reducedMotion) {
    for (let i = 0; i < 6; i++) {
      const a = (elapsed * 0.6 + i * 0.17) % 1;
      const mx = x - 46 + hash2(i * 3 + 1, Math.floor(elapsed * 3)) * 92;
      const my = hullBottom - 6 - a * 54;
      ctx.fillStyle = `rgba(150, 240, 255, ${((1 - a) * 0.4).toFixed(3)})`;
      ctx.fillRect(Math.round(mx), Math.round(my), 1, 2);
    }
  }

  ctx.restore();
}

/**
 * El viajero: silueta encapuchada. Bajo la capucha no hay rostro, sólo una
 * sombra fría. Camina con el peso de alguien que ya no debería estar aquí.
 */
function drawFutureTraveler(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number,
  facing: -1 | 1,
  walking: boolean
): void {
  const step = walking && Math.floor(elapsed * 7) % 2 === 0 ? 1 : 0;
  const bob = walking ? Math.abs(Math.sin(elapsed * 7)) * 1.5 : Math.sin(elapsed * 1.4) * 0.6;
  const bx = Math.round(x);
  const by = Math.round(y - bob);
  const look = facing >= 0 ? 1 : -1;
  const sway = walking ? Math.sin(elapsed * 7) * 1.3 : Math.sin(elapsed * 1.1) * 0.5;

  ctx.save();

  // Sombra doble: cuerpo y halo frío de la máquina.
  ctx.fillStyle = 'rgba(6, 16, 26, 0.36)';
  ctx.beginPath();
  ctx.ellipse(bx, y + 2, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(103, 232, 249, 0.08)';
  ctx.beginPath();
  ctx.ellipse(bx, y + 2, 9, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Botas de suela gruesa.
  ctx.fillStyle = '#090d15';
  ctx.fillRect(bx - 9 + step, by - 6, 7, 5);
  ctx.fillRect(bx + 2 - step, by - 6, 7, 5);
  ctx.fillStyle = '#39465f';
  ctx.fillRect(bx - 9 + step, by - 6, 6, 1);
  ctx.fillRect(bx + 2 - step, by - 6, 6, 1);
  ctx.fillStyle = '#05080e';
  ctx.fillRect(bx - 10 + step, by - 2, 8, 2);
  ctx.fillRect(bx + 2 - step, by - 2, 8, 2);

  // Túnica larga con vuelo y pliegues profundos.
  const hemL = bx - 13 + sway * 0.45;
  const hemR = bx + 13 + sway * 0.45;
  ctx.fillStyle = '#1b2238';
  ctx.beginPath();
  ctx.moveTo(bx - 8, by - 31);
  ctx.lineTo(bx + 8, by - 31);
  ctx.lineTo(hemR, by - 6);
  ctx.lineTo(hemL, by - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#242e4b';
  ctx.beginPath();
  ctx.moveTo(bx - 7, by - 30);
  ctx.lineTo(bx + 1, by - 30);
  ctx.lineTo(bx + 3 + sway * 0.3, by - 7);
  ctx.lineTo(bx - 9 + sway * 0.45, by - 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(8, 12, 22, 0.6)';
  ctx.fillRect(bx - 1, by - 29, 2, 21);
  ctx.fillRect(bx - 6, by - 28, 1, 18);
  ctx.fillRect(bx + 6, by - 28, 1, 18);
  // Dobladillo reforzado.
  ctx.fillStyle = '#39456a';
  ctx.fillRect(Math.round(hemL), by - 7, Math.round(hemR - hemL), 2);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.28)';
  ctx.fillRect(Math.round(hemL) + 1, by - 6, Math.round(hemR - hemL) - 2, 1);

  // Torso y capa corta de viaje.
  ctx.fillStyle = '#242e4b';
  ctx.fillRect(bx - 9, by - 40, 18, 11);
  ctx.fillStyle = '#303d63';
  ctx.beginPath();
  ctx.moveTo(bx - 13, by - 37);
  ctx.lineTo(bx - 8, by - 42);
  ctx.lineTo(bx + 8, by - 42);
  ctx.lineTo(bx + 13, by - 37);
  ctx.lineTo(bx + 10, by - 31);
  ctx.lineTo(bx - 10, by - 31);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d4b78';
  ctx.fillRect(bx - 8, by - 42, 16, 1);
  ctx.fillStyle = '#141a2a';
  ctx.fillRect(bx - 10, by - 32, 20, 2);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.18)';
  ctx.fillRect(bx - 12, by - 36, 1, 5);
  ctx.fillRect(bx + 11, by - 36, 1, 5);

  // Mangas anchas y guantes.
  ctx.fillStyle = '#202944';
  ctx.beginPath();
  ctx.moveTo(bx - 12, by - 39);
  ctx.lineTo(bx - 16, by - 27);
  ctx.lineTo(bx - 11, by - 25);
  ctx.lineTo(bx - 8, by - 35);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx + 12, by - 39);
  ctx.lineTo(bx + 16, by - 27);
  ctx.lineTo(bx + 11, by - 25);
  ctx.lineTo(bx + 8, by - 35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f3c60';
  ctx.fillRect(bx - 15, by - 39, 2, 10);
  ctx.fillRect(bx + 13, by - 39, 2, 10);
  ctx.fillStyle = '#0a0f1b';
  ctx.fillRect(bx - 13, by - 26, 5, 4);
  ctx.fillRect(bx + 8, by - 26, 5, 4);

  // Cinturón con hebilla de energía.
  ctx.fillStyle = '#0d1320';
  ctx.fillRect(bx - 9, by - 23, 18, 3);
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(bx + look * 2 - 1, by - 23, 3, 2);
  ctx.fillStyle = 'rgba(224, 255, 255, 0.8)';
  ctx.fillRect(bx + look * 2, by - 23, 1, 1);

  // Capucha alta y capa de viaje.
  ctx.fillStyle = '#1a2138';
  ctx.fillRect(bx - 8, by - 45, 16, 5);
  ctx.beginPath();
  ctx.moveTo(bx - 9, by - 41);
  ctx.lineTo(bx - 8, by - 48);
  ctx.lineTo(bx - 4, by - 53);
  ctx.lineTo(bx + 4, by - 53);
  ctx.lineTo(bx + 8, by - 47);
  ctx.lineTo(bx + 9, by - 40);
  ctx.lineTo(bx + 6, by - 37);
  ctx.lineTo(bx - 6, by - 37);
  ctx.closePath();
  ctx.fillStyle = '#2c3859';
  ctx.fill();
  ctx.fillStyle = '#3d4b75';
  ctx.beginPath();
  ctx.moveTo(bx - 4, by - 52);
  ctx.lineTo(bx + 4, by - 52);
  ctx.lineTo(bx + 6, by - 46);
  ctx.lineTo(bx - 6, by - 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(103, 232, 249, 0.3)';
  ctx.fillRect(bx + look * 7, by - 46, 1, 6);
  ctx.fillStyle = '#101524';
  ctx.fillRect(bx - 8, by - 39, 16, 2);

  // Velo del rostro: un vacío frío, sin rasgos.
  const faceX = bx + look;
  const faceGrad = ctx.createLinearGradient(0, by - 50, 0, by - 40);
  faceGrad.addColorStop(0, '#03050a');
  faceGrad.addColorStop(0.7, '#070c16');
  faceGrad.addColorStop(1, 'rgba(10, 18, 32, 0.9)');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(faceX, by - 45, 4.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
  ctx.fillRect(bx + look * 5, by - 48, 1, 6);

  // Estrellas diminutas atrapadas en el vacío.
  for (let i = 0; i < 3; i++) {
    const drift = (elapsed * 0.3 + i * 0.31) % 1;
    const sx = faceX - 2 + Math.round(hash2(i + 3, 7) * 4);
    const sy = Math.round(by - 48 + drift * 5);
    ctx.fillStyle = `rgba(186, 230, 253, ${(0.25 + (1 - drift) * 0.5).toFixed(3)})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Motas de tiempo alrededor de la figura.
  if (!walking) {
    for (let i = 0; i < 4; i++) {
      const a = (elapsed * 0.5 + i * 0.26) % 1;
      ctx.fillStyle = `rgba(140, 226, 248, ${((1 - a) * 0.5).toFixed(3)})`;
      ctx.fillRect(bx - 13 + i * 8, Math.round(by - 12 - a * 24), 1, 2);
    }
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* INTERIOR DE LA CABAÑA                                              */
/* ------------------------------------------------------------------ */

export interface IslaNatalCabinRenderParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  camera: { x: number; y: number };
  elapsed: number;
  reducedMotion: boolean;
  player: IslaNatalPlayerRender;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  prompt: IslaNatalPromptSpec | null;
  /** La mochila sigue colgada del clavo junto a la ventana. */
  backpackOnHook: boolean;
  /** La radio de la mesa está encendida y suena durante la intro. */
  radioOn?: boolean;
  /** Tormenta del aviso: el cielo se parte mientras Pixel está adentro. */
  storm?: { t: number } | null;
}

/** Sala de la cabaña: madera cálida, luz de tarde y la mochila familiar. */
function drawCabinShell(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const W = ISLA_NATAL_CABIN.roomW;
  const H = ISLA_NATAL_CABIN.roomH;
  const wallH = 132;

  // Suelo de tablones anchos.
  ctx.fillStyle = '#5b3a22';
  ctx.fillRect(0, wallH, W, H - wallH);
  for (let y = wallH; y < H; y += 14) {
    ctx.fillStyle = 'rgba(46, 27, 14, 0.55)';
    ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = 'rgba(122, 84, 50, 0.55)';
    ctx.fillRect(0, y + 1, W, 1);
    const seam = (Math.floor(y / 14) % 2 === 0 ? 96 : 188) + (y % 3) * 23;
    ctx.fillStyle = 'rgba(40, 24, 12, 0.5)';
    ctx.fillRect(seam % W, y, 1, 13);
    for (let x = 24; x < W; x += 58) {
      const k = hash2(x + y, 17);
      if (k < 0.7) continue;
      ctx.fillStyle = 'rgba(48, 28, 13, 0.5)';
      ctx.fillRect(x, y + 4, 3, 2);
    }
  }

  // Pared del fondo con tablas verticales.
  const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
  wallGrad.addColorStop(0, '#432b1a');
  wallGrad.addColorStop(0.62, '#372216');
  wallGrad.addColorStop(1, '#2a1a10');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, wallH);
  for (let x = 18; x < W; x += 26) {
    ctx.fillStyle = 'rgba(22, 12, 6, 0.45)';
    ctx.fillRect(x, 0, 1, wallH);
    ctx.fillStyle = 'rgba(146, 100, 58, 0.16)';
    ctx.fillRect(x + 1, 0, 1, wallH);
    const knot = hash2(x, 5);
    if (knot > 0.6) {
      ctx.fillStyle = 'rgba(26, 14, 7, 0.5)';
      ctx.fillRect(x + 8, 34 + Math.floor(knot * 60), 3, 2);
    }
  }

  // Viga superior y zócalo.
  ctx.fillStyle = '#24150c';
  ctx.fillRect(0, 0, W, 9);
  ctx.fillStyle = '#54351f';
  ctx.fillRect(0, 9, W, 3);
  for (let x = 10; x < W; x += 34) {
    ctx.fillStyle = 'rgba(20, 11, 5, 0.55)';
    ctx.fillRect(x, 0, 3, 9);
  }
  ctx.fillStyle = '#24150c';
  ctx.fillRect(0, wallH - 7, W, 7);
  ctx.fillStyle = '#5d3d24';
  ctx.fillRect(0, wallH - 7, W, 2);
  ctx.fillStyle = 'rgba(16, 9, 4, 0.5)';
  ctx.fillRect(0, wallH - 1, W, 1);

  // Ventana al atardecer con cortinas y jardinera.
  const wx = 94;
  const wy = 26;
  const ww = 84;
  const wh = 60;
  ctx.fillStyle = '#24140a';
  ctx.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#6f87a8');
  sky.addColorStop(0.55, '#e8a86a');
  sky.addColorStop(1, '#f6d39a');
  ctx.fillStyle = sky;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = '#2f6a74';
  ctx.fillRect(wx, wy + wh - 20, ww, 20);
  ctx.fillStyle = '#fce9b8';
  ctx.fillRect(wx + 52, wy + wh - 26, 12, 4);
  ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
  ctx.fillRect(wx + 50, wy + wh - 22, 16, 8);
  // Silueta de la arboleda lejana.
  ctx.fillStyle = 'rgba(38, 52, 46, 0.7)';
  ctx.fillRect(wx + 6, wy + wh - 22, 16, 3);
  ctx.fillRect(wx + 12, wy + wh - 27, 3, 6);
  ctx.fillRect(wx + 20, wy + wh - 25, 2, 4);
  // Reflejo y marcos.
  ctx.fillStyle = 'rgba(255, 245, 214, 0.28)';
  ctx.fillRect(wx + 2, wy + 2, 20, 1);
  ctx.fillStyle = '#3b2415';
  ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
  ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2);
  // Cortinas de lino.
  ctx.fillStyle = '#a65c3a';
  ctx.fillRect(wx - 11, wy - 8, 9, wh + 18);
  ctx.fillRect(wx + ww + 2, wy - 8, 9, wh + 18);
  ctx.fillStyle = '#c07a4e';
  ctx.fillRect(wx - 9, wy - 6, 3, wh + 14);
  ctx.fillRect(wx + ww + 4, wy - 6, 3, wh + 14);
  ctx.fillStyle = 'rgba(70, 32, 16, 0.55)';
  for (let y = wy - 2; y < wy + wh + 8; y += 7) {
    ctx.fillRect(wx - 7, y, 2, 3);
    ctx.fillRect(wx + ww + 6, y, 2, 3);
  }
  // Jardinera de la ventana.
  ctx.fillStyle = '#4d3320';
  ctx.fillRect(wx - 8, wy + wh + 2, ww + 16, 8);
  ctx.fillStyle = '#77502f';
  ctx.fillRect(wx - 7, wy + wh + 2, ww + 14, 2);
  const blooms = ['#f9a8d4', '#fde68a', '#f8fafc', '#f472b6'];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = '#3f7a3c';
    ctx.fillRect(wx - 4 + i * 12, wy + wh - 4, 2, 6);
    ctx.fillStyle = blooms[i % blooms.length];
    ctx.fillRect(wx - 6 + i * 12, wy + wh - 7, 5, 3);
  }

  // Haz de luz que cae de la ventana sobre el suelo.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createLinearGradient(wx + 10, wy + wh, wx + 40, H);
  beam.addColorStop(0, 'rgba(255, 214, 150, 0.2)');
  beam.addColorStop(1, 'rgba(255, 190, 120, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(wx + 4, wy + wh);
  ctx.lineTo(wx + ww - 4, wy + wh);
  ctx.lineTo(wx + ww + 46, H);
  ctx.lineTo(wx - 40, H);
  ctx.closePath();
  ctx.fill();
  const pool = ctx.createRadialGradient(wx + 36, 212, 6, wx + 36, 212, 104);
  pool.addColorStop(0, 'rgba(255, 200, 130, 0.22)');
  pool.addColorStop(1, 'rgba(255, 190, 120, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(wx - 70, 108, 210, 190);
  ctx.restore();

  // Retrato familiar y estante con frascos.
  ctx.fillStyle = '#2a180c';
  ctx.fillRect(256, 32, 50, 42);
  ctx.fillStyle = '#6d4a2b';
  ctx.fillRect(258, 34, 46, 38);
  ctx.fillStyle = '#d9c39a';
  ctx.fillRect(262, 38, 38, 30);
  ctx.fillStyle = 'rgba(96, 72, 46, 0.6)';
  ctx.fillRect(263, 39, 36, 3);
  ctx.fillStyle = '#4a3120';
  ctx.fillRect(272, 50, 6, 14);
  ctx.fillRect(273, 44, 4, 5);
  ctx.fillRect(286, 52, 6, 12);
  ctx.fillRect(288, 46, 3, 5);
  ctx.fillStyle = 'rgba(40, 24, 12, 0.4)';
  ctx.fillRect(262, 62, 38, 1);

  ctx.fillStyle = '#3a2414';
  ctx.fillRect(318, 40, 62, 3);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(318, 43, 62, 4);
  ctx.fillRect(322, 47, 3, 6);
  ctx.fillRect(372, 47, 3, 6);
  const jarColors = ['#9bbf7a', '#d8a24a', '#b45a3c'];
  for (let i = 0; i < 3; i++) {
    const jx = 326 + i * 17;
    ctx.fillStyle = jarColors[i];
    ctx.fillRect(jx, 31, 9, 10);
    ctx.fillStyle = 'rgba(255, 248, 220, 0.45)';
    ctx.fillRect(jx + 1, 32, 2, 6);
    ctx.fillStyle = '#5c3a20';
    ctx.fillRect(jx - 1, 29, 11, 3);
  }

  // Lámpara colgante de aceite.
  ctx.fillStyle = '#241408';
  ctx.fillRect(239, 8, 2, 18);
  ctx.fillStyle = '#8a5f30';
  ctx.beginPath();
  ctx.moveTo(232, 26);
  ctx.lineTo(248, 26);
  ctx.lineTo(244, 34);
  ctx.lineTo(236, 34);
  ctx.closePath();
  ctx.fill();
  const flicker = reducedMotion ? 0.9 : 0.82 + Math.sin(elapsed * 4.7) * 0.1 + Math.sin(elapsed * 11.3) * 0.04;
  ctx.fillStyle = `rgba(255, 214, 138, ${flicker.toFixed(2)})`;
  ctx.fillRect(237, 34, 6, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lampGlow = ctx.createRadialGradient(240, 36, 2, 240, 36, 96);
  lampGlow.addColorStop(0, `rgba(255, 208, 132, ${(0.34 * flicker).toFixed(2)})`);
  lampGlow.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = lampGlow;
  ctx.fillRect(144, -60, 192, 192);
  ctx.restore();

  // Alfombra tejida.
  ctx.fillStyle = '#6f3b2b';
  ctx.fillRect(154, 198, 168, 76);
  ctx.fillStyle = '#d9be8c';
  ctx.fillRect(154, 198, 168, 3);
  ctx.fillRect(154, 271, 168, 3);
  ctx.fillRect(154, 198, 3, 76);
  ctx.fillRect(319, 198, 3, 76);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#a5653c' : '#8b4d31';
    ctx.fillRect(164 + i * 40, 208, 26, 56);
  }
  ctx.fillStyle = 'rgba(246, 226, 186, 0.5)';
  for (let i = 0; i < 4; i++) {
    const dx = 177 + i * 40;
    ctx.fillRect(dx, 220, 3, 3);
    ctx.fillRect(dx - 4, 230, 11, 2);
    ctx.fillRect(dx + 1, 238, 3, 3);
    ctx.fillRect(dx - 4, 248, 11, 2);
  }

  // Puerta al sur, con umbral cálido.
  const dx0 = 206;
  const dy0 = 258;
  ctx.fillStyle = '#1c0f07';
  ctx.fillRect(dx0 - 6, dy0 - 6, 74, 48);
  ctx.fillStyle = '#4f3320';
  ctx.fillRect(dx0 - 3, dy0 - 3, 68, 45);
  ctx.fillStyle = '#6b482c';
  ctx.fillRect(dx0, dy0, 62, 42);
  for (let y = dy0 + 4; y < 296; y += 8) {
    ctx.fillStyle = 'rgba(46, 27, 14, 0.5)';
    ctx.fillRect(dx0 + 2, y, 58, 1);
  }
  ctx.fillStyle = '#8a5f3a';
  ctx.fillRect(dx0 + 31, dy0 + 2, 1, 40);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(dx0 + 48, dy0 + 22, 3, 4);
  ctx.fillStyle = 'rgba(255, 236, 160, 0.7)';
  ctx.fillRect(dx0 + 48, dy0 + 22, 1, 1);
  // Umbral de piedra y felpudo.
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(dx0 - 8, 296, 78, 4);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.3)';
  ctx.fillRect(dx0 - 8, 296, 76, 1);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(dx0 + 4, 284, 54, 10);
  ctx.fillStyle = '#96703f';
  ctx.fillRect(dx0 + 5, 285, 52, 2);
  ctx.fillStyle = 'rgba(52, 33, 19, 0.55)';
  ctx.fillRect(dx0 + 5, 289, 52, 1);
}

function drawCabinFurniture(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  // Cama de madera junto a la pared oeste.
  const bx = 30;
  const by = 150;
  const bw = 112;
  const bh = 114;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.28)';
  ctx.beginPath();
  ctx.ellipse(bx + bw * 0.55, by + bh - 2, bw * 0.62, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d2615';
  ctx.fillRect(bx, by, 9, bh);
  ctx.fillRect(bx + 2, by + bh - 8, bw - 2, 8);
  ctx.fillStyle = '#6b482a';
  ctx.fillRect(bx + 1, by + 2, 3, bh - 12);
  ctx.fillRect(bx + 8, by + 18, bw - 12, bh - 30);
  ctx.fillStyle = '#dfd0ae';
  ctx.fillRect(bx + 10, by + 20, bw - 16, bh - 36);
  ctx.fillStyle = '#f2e9d2';
  ctx.fillRect(bx + 12, by + 24, 28, 18);
  ctx.fillStyle = 'rgba(180, 160, 122, 0.5)';
  ctx.fillRect(bx + 12, by + 40, 28, 2);
  // Edredón de retales.
  ctx.fillStyle = '#4f7a54';
  ctx.fillRect(bx + 40, by + 22, bw - 46, bh - 40);
  ctx.fillStyle = '#63976a';
  for (let y = by + 28; y < by + bh - 24; y += 14) {
    ctx.fillRect(bx + 42, y, bw - 50, 4);
  }
  ctx.fillStyle = '#c96f4a';
  ctx.fillRect(bx + 56, by + 48, 22, 20);
  ctx.fillStyle = '#e0a15a';
  ctx.fillRect(bx + 60, by + 52, 14, 12);
  ctx.fillStyle = 'rgba(30, 18, 10, 0.35)';
  ctx.fillRect(bx + 40, by + bh - 24, bw - 46, 2);
  // Almohada y cabecero.
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(bx + 6, by + 14, bw - 10, 3);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(bx + 6, by + 17, bw - 12, 2);
  ctx.fillStyle = '#3a2414';
  for (let i = 0; i < 5; i++) ctx.fillRect(bx + 20 + i * 18, by + 4, 2, 12);

  // Mesa camilla con mantel, radio y café.
  const tx = 318;
  const ty = 148;
  const tw = 86;
  const th = 58;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.26)';
  ctx.beginPath();
  ctx.ellipse(tx + tw / 2, ty + th, tw * 0.55, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4d3320';
  ctx.fillRect(tx + 4, ty + 10, 6, th - 8);
  ctx.fillRect(tx + tw - 10, ty + 10, 6, th - 8);
  ctx.fillStyle = '#7d5738';
  ctx.fillRect(tx, ty, tw, 12);
  ctx.fillStyle = '#9a6f45';
  ctx.fillRect(tx, ty, tw, 2);
  // Mantel de cuadros.
  ctx.fillStyle = '#e7d4ae';
  ctx.fillRect(tx + 4, ty + 10, tw - 8, 20);
  ctx.fillStyle = 'rgba(178, 84, 64, 0.65)';
  for (let x = tx + 10; x < tx + tw - 8; x += 12) ctx.fillRect(x, ty + 10, 4, 20);
  ctx.fillRect(tx + 4, ty + 18, tw - 8, 3);
  // Cafetera esmaltada.
  ctx.fillStyle = '#3f5f6b';
  ctx.fillRect(tx + 12, ty - 2, 12, 10);
  ctx.fillStyle = '#5c8491';
  ctx.fillRect(tx + 13, ty - 1, 10, 2);
  ctx.fillStyle = '#2b424c';
  ctx.fillRect(tx + 24, ty + 1, 3, 5);
  ctx.fillStyle = '#c8dbe0';
  ctx.fillRect(tx + 15, ty + 7, 6, 2);
  // Radio de transistores.
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(tx + 34, ty - 4, 22, 14);
  ctx.fillStyle = '#a8732f';
  ctx.fillRect(tx + 35, ty - 3, 20, 12);
  ctx.fillStyle = '#f0d9a8';
  ctx.fillRect(tx + 37, ty - 1, 10, 5);
  ctx.fillStyle = '#2a1a10';
  for (let i = 0; i < 4; i++) ctx.fillRect(tx + 38 + i * 2, ty + 6, 1, 2);
  ctx.fillStyle = '#c9b27c';
  ctx.fillRect(tx + 50, ty + 4, 3, 3);
  ctx.fillStyle = '#8e8a80';
  ctx.fillRect(tx + 55, ty - 12, 1, 9);
  // Taza y plato.
  ctx.fillStyle = '#e8e2d2';
  ctx.fillRect(tx + 62, ty + 2, 8, 5);
  ctx.fillStyle = '#b7ad96';
  ctx.fillRect(tx + 63, ty + 7, 9, 2);
  ctx.fillStyle = '#e8e2d2';
  ctx.fillRect(tx + 69, ty + 3, 2, 2);
  // Silla arrimada.
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(tx + 26, ty + 44, 24, 4);
  ctx.fillRect(tx + 26, ty + 48, 3, 16);
  ctx.fillRect(tx + 47, ty + 48, 3, 16);
  ctx.fillStyle = '#7d5530';
  ctx.fillRect(tx + 26, ty + 30, 3, 16);
  ctx.fillRect(tx + 27, ty + 32, 22, 3);

  // Guitarra acústica colgada sobre la cama.
  drawCabinGuitar(ctx);

  // Teclado musical sobre su banco, bajo el retrato familiar.
  drawCabinKeyboard(ctx);

  // Cocina económica contra la pared este.
  const kx = 404;
  const ky = 112;
  const kw = 64;
  const kh = 92;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.3)';
  ctx.beginPath();
  ctx.ellipse(kx + kw / 2, ky + kh, kw * 0.6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3e2a1a';
  ctx.fillRect(kx, ky + 8, kw, kh - 8);
  ctx.fillStyle = '#937f68';
  ctx.fillRect(kx - 2, ky + 4, kw + 4, 8);
  ctx.fillStyle = '#b5a48c';
  ctx.fillRect(kx - 2, ky + 4, kw + 4, 2);
  ctx.fillStyle = '#2f2014';
  ctx.fillRect(kx + 4, ky + 16, kw - 8, 34);
  // Hornillas y caldero.
  ctx.fillStyle = '#5a5148';
  ctx.fillRect(kx + 8, ky + 10, 20, 4);
  ctx.fillRect(kx + 36, ky + 10, 20, 4);
  ctx.fillStyle = '#1b1410';
  ctx.fillRect(kx + 10, ky + 8, 16, 4);
  ctx.fillRect(kx + 38, ky + 8, 16, 4);
  ctx.fillStyle = '#3b3330';
  ctx.beginPath();
  ctx.ellipse(kx + 18, ky + 2, 11, 8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b615a';
  ctx.fillRect(kx + 8, ky - 6, 20, 2);
  ctx.fillStyle = '#2a221d';
  ctx.fillRect(kx + 4, ky - 8, 4, 4);
  // Fuego bajo el caldero.
  const ember = reducedMotion ? 0.7 : 0.55 + Math.sin(elapsed * 6.1) * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const emberGlow = ctx.createRadialGradient(kx + 18, ky + 4, 1, kx + 18, ky + 4, 34);
  emberGlow.addColorStop(0, `rgba(255, 142, 60, ${(0.4 * ember).toFixed(2)})`);
  emberGlow.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = emberGlow;
  ctx.fillRect(kx - 18, ky - 32, 72, 72);
  ctx.restore();
  ctx.fillStyle = `rgba(255, 176, 92, ${ember.toFixed(2)})`;
  ctx.fillRect(kx + 12, ky + 4, 14, 3);
  // Puertas del armario y tiradores.
  ctx.fillStyle = '#4f3722';
  ctx.fillRect(kx + 6, ky + 56, 22, 26);
  ctx.fillRect(kx + 34, ky + 56, 22, 26);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(kx + 8, ky + 58, 18, 22);
  ctx.fillRect(kx + 36, ky + 58, 18, 22);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(kx + 24, ky + 68, 2, 3);
  ctx.fillRect(kx + 36, ky + 68, 2, 3);
  // Vapor de la tetera.
  if (!reducedMotion) {
    for (let i = 0; i < 3; i++) {
      const st = (elapsed * 0.42 + i / 3) % 1;
      ctx.fillStyle = `rgba(236, 232, 220, ${(0.22 * (1 - st)).toFixed(2)})`;
      ctx.fillRect(Math.round(kx + 16 + Math.sin(st * 6 + i) * 5), Math.round(ky - 14 - st * 26), 2 + Math.round(st * 3), 2);
    }
  }
  // Estante con cacharros de cobre.
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(kx - 2, 74, kw + 6, 3);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(kx - 2, 77, kw + 6, 3);
  for (let i = 0; i < 3; i++) {
    const px = kx + 4 + i * 20;
    ctx.fillStyle = i % 2 === 0 ? '#b06a3a' : '#8f8a7c';
    ctx.fillRect(px, 62, 16, 12);
    ctx.fillStyle = 'rgba(255, 226, 180, 0.45)';
    ctx.fillRect(px + 1, 63, 3, 9);
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(px + 5, 58, 2, 4);
  }
}

/** Guitarra eléctrica roja de la familia, colgada de un clavo sobre la cama. */
function drawCabinGuitar(ctx: CanvasRenderingContext2D): void {
  const cx = 52;
  ctx.save();

  // Clavo y cordón de cuero.
  ctx.fillStyle = '#1d1008';
  ctx.fillRect(cx - 1, 46, 3, 5);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(cx, 50, 1, 6);

  // Mástil de palo rosa con trastes claros.
  ctx.fillStyle = '#170c06';
  ctx.fillRect(cx - 3, 62, 7, 26);
  ctx.fillStyle = '#4a2a17';
  ctx.fillRect(cx - 2, 62, 5, 26);
  ctx.fillStyle = '#7d4a2b';
  ctx.fillRect(cx - 2, 62, 1, 26);
  ctx.fillStyle = 'rgba(226, 214, 190, 0.55)';
  for (let y = 67; y < 88; y += 5) ctx.fillRect(cx - 2, y, 5, 1);

  // Pala roja con clavijas de cromo.
  ctx.fillStyle = '#170c06';
  ctx.fillRect(cx - 6, 51, 13, 12);
  ctx.fillStyle = '#b3241c';
  ctx.fillRect(cx - 5, 52, 11, 10);
  ctx.fillStyle = '#e04a36';
  ctx.fillRect(cx - 4, 52, 9, 1);
  ctx.fillStyle = '#d7dbe2';
  ctx.fillRect(cx - 8, 54, 2, 2);
  ctx.fillRect(cx - 8, 58, 2, 2);
  ctx.fillRect(cx + 6, 54, 2, 2);
  ctx.fillRect(cx + 6, 58, 2, 2);
  ctx.fillStyle = '#8f949c';
  ctx.fillRect(cx - 8, 55, 2, 1);
  ctx.fillRect(cx + 6, 55, 2, 1);

  // Cuerpo sólido rojo con doble cutaway.
  const outline: [number, number][] = [
    [cx - 4, 84],
    [cx - 13, 87],
    [cx - 15, 97],
    [cx - 12, 107],
    [cx - 13, 117],
    [cx - 6, 124],
    [cx + 6, 124],
    [cx + 13, 117],
    [cx + 12, 107],
    [cx + 15, 97],
    [cx + 13, 87],
    [cx + 4, 84],
  ];
  const body: [number, number][] = [
    [cx - 4, 86],
    [cx - 11, 89],
    [cx - 13, 97],
    [cx - 10, 107],
    [cx - 11, 116],
    [cx - 5, 122],
    [cx + 5, 122],
    [cx + 11, 116],
    [cx + 10, 107],
    [cx + 13, 97],
    [cx + 11, 89],
    [cx + 4, 86],
  ];
  const trace = (pts: [number, number][]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };
  ctx.fillStyle = '#2a0a08';
  trace(outline);
  ctx.fill();
  ctx.fillStyle = '#c22a20';
  trace(body);
  ctx.fill();

  // Brillo del barniz en el lóbulo superior izquierdo.
  ctx.fillStyle = '#e04a36';
  ctx.beginPath();
  ctx.moveTo(cx - 9, 92);
  ctx.lineTo(cx - 3, 90);
  ctx.lineTo(cx - 3, 110);
  ctx.lineTo(cx - 8, 112);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 200, 0.35)';
  ctx.fillRect(cx - 11, 90, 2, 8);
  ctx.fillRect(cx - 10, 88, 5, 1);

  // Golpeador perla.
  ctx.fillStyle = '#ece6d6';
  ctx.beginPath();
  ctx.moveTo(cx + 3, 94);
  ctx.lineTo(cx + 12, 100);
  ctx.lineTo(cx + 10, 113);
  ctx.lineTo(cx + 3, 116);
  ctx.lineTo(cx + 1, 106);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 150, 130, 0.35)';
  ctx.fillRect(cx + 4, 96, 1, 18);

  // Pastillas dobles y puente cromado.
  for (const py of [96, 106]) {
    ctx.fillStyle = '#171310';
    ctx.fillRect(cx - 7, py, 12, 4);
    ctx.fillStyle = '#c9ced6';
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - 6 + i * 2, py + 1, 1, 2);
  }
  ctx.fillStyle = '#b9bfc8';
  ctx.fillRect(cx - 7, 116, 14, 3);
  ctx.fillStyle = '#6f7680';
  for (let i = 0; i < 6; i++) ctx.fillRect(cx - 6 + i * 2, 117, 1, 2);
  // Perillas de volumen y tono.
  ctx.fillStyle = '#dfe3e8';
  ctx.fillRect(cx + 8, 115, 3, 3);
  ctx.fillRect(cx + 8, 120, 3, 3);
  ctx.fillStyle = '#5c6169';
  ctx.fillRect(cx + 9, 116, 1, 1);
  ctx.fillRect(cx + 9, 121, 1, 1);

  // Palanca de vibrato.
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 6, 118);
  ctx.lineTo(cx + 12, 124);
  ctx.lineTo(cx + 14, 121);
  ctx.stroke();

  // Cuerdas.
  ctx.fillStyle = 'rgba(236, 240, 246, 0.6)';
  ctx.fillRect(cx - 2, 60, 1, 57);
  ctx.fillRect(cx, 60, 1, 57);
  ctx.fillRect(cx + 2, 60, 1, 57);
  ctx.fillRect(cx + 4, 62, 1, 55);

  ctx.restore();
}

/** Teclado musical blanco sobre su banco, en el rincón del retrato. */
function drawCabinKeyboard(ctx: CanvasRenderingContext2D): void {
  const x = 252;
  const y = 100;
  const w = 56;

  ctx.save();

  // Sombra sobre la pared.
  ctx.fillStyle = 'rgba(16, 9, 4, 0.35)';
  ctx.fillRect(x - 2, y + 24, w + 4, 4);

  // Patas claras hasta el zócalo.
  ctx.fillStyle = '#8f897c';
  ctx.fillRect(x + 4, y + 16, 4, 17);
  ctx.fillRect(x + w - 8, y + 16, 4, 17);
  ctx.fillStyle = '#ddd6c6';
  ctx.fillRect(x + 5, y + 17, 2, 15);
  ctx.fillRect(x + w - 7, y + 17, 2, 15);

  // Mueble blanco marfil con contorno gris cálido.
  ctx.fillStyle = '#5a544a';
  ctx.fillRect(x - 1, y - 1, w + 2, 19);
  ctx.fillStyle = '#ece7da';
  ctx.fillRect(x, y, w, 17);
  ctx.fillStyle = '#fbf7ec';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = '#c9c2b2';
  ctx.fillRect(x, y + 14, w, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 1, y, w - 2, 1);

  // Fieltro rojo bajo las teclas.
  ctx.fillStyle = '#a83226';
  ctx.fillRect(x + 3, y + 4, w - 6, 3);

  // Teclas blancas con separaciones y teclas negras en patrón de piano.
  const keysY = y + 6;
  const keysW = w - 6;
  ctx.fillStyle = '#f8f3e6';
  ctx.fillRect(x + 3, keysY, keysW, 7);
  ctx.fillStyle = 'rgba(140, 130, 112, 0.5)';
  for (let i = 1; i < 14; i++) {
    ctx.fillRect(x + 3 + Math.round((i * keysW) / 14), keysY, 1, 7);
  }
  // Negras: dos, tres, dos, tres...
  const blackPattern = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13];
  ctx.fillStyle = '#1f1a16';
  for (const k of blackPattern) {
    const kx = x + 3 + Math.round((k * keysW) / 14) - 1;
    ctx.fillRect(kx, keysY, 2, 4);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(x + 3, keysY, keysW, 1);

  // Nombre grabado en metal y un par de perillas.
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(x + w - 15, y + 1, 11, 2);
  ctx.fillStyle = '#3a3630';
  ctx.fillRect(x + 5, y + 1, 2, 2);
  ctx.fillRect(x + 10, y + 1, 2, 2);

  // Reflejo cálido de la lámpara sobre el mueble.
  ctx.fillStyle = 'rgba(255, 214, 150, 0.16)';
  ctx.fillRect(x + 4, y + 2, 20, 2);

  ctx.restore();
}

/** Mochila de lona colgada del clavo, con brillo suave para que se descubra. */
function drawCabinBackpack(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const { x, y } = ISLA_NATAL_CABIN.backpack;
  const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.6) * 0.6;
  ctx.save();
  ctx.translate(0, Math.round(bob));
  // Clavo y correas.
  ctx.fillStyle = '#241408';
  ctx.fillRect(x - 1, y - 12, 3, 5);
  ctx.fillStyle = '#8a6a45';
  ctx.fillRect(x, y - 9, 1, 3);
  ctx.fillStyle = '#6b4728';
  ctx.fillRect(x - 9, y - 8, 3, 14);
  ctx.fillRect(x + 7, y - 8, 3, 14);
  // Cuerpo de lona.
  ctx.fillStyle = 'rgba(20, 12, 6, 0.35)';
  ctx.fillRect(x - 11, y - 6, 24, 32);
  ctx.fillStyle = '#8c5835';
  ctx.fillRect(x - 12, y - 7, 24, 31);
  ctx.fillStyle = '#a86c42';
  ctx.fillRect(x - 10, y - 5, 20, 9);
  ctx.fillStyle = '#72452a';
  ctx.fillRect(x - 12, y + 4, 24, 3);
  // Solapa y hebilla.
  ctx.fillStyle = '#9c6239';
  ctx.fillRect(x - 10, y + 8, 20, 6);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(x - 2, y + 10, 4, 3);
  ctx.fillStyle = '#f4d27a';
  ctx.fillRect(x - 1, y + 10, 1, 1);
  // Bolsillo y costuras.
  ctx.fillStyle = '#a06c45';
  ctx.fillRect(x - 7, y + 15, 14, 7);
  ctx.fillStyle = '#7a4f31';
  ctx.fillRect(x - 7, y + 15, 14, 1);
  ctx.fillStyle = 'rgba(255, 224, 180, 0.35)';
  ctx.fillRect(x - 11, y - 6, 1, 24);
  ctx.fillRect(x - 11, y + 14, 23, 1);
  // Asa superior.
  ctx.fillStyle = '#5c3a22';
  ctx.fillRect(x - 4, y - 12, 8, 2);
  ctx.fillRect(x - 6, y - 10, 2, 4);
  ctx.fillRect(x + 4, y - 10, 2, 4);
  ctx.restore();
}

/** Radio encendida sobre la mesa: dial cálido y ondas de sonido. */
function drawCabinRadioLive(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean
): void {
  const rx = 363;
  const ry = 149;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.5 + Math.sin(elapsed * 3.1) * 0.25;
  const glow = ctx.createRadialGradient(rx, ry, 1, rx, ry, 26);
  glow.addColorStop(0, `rgba(255, 206, 130, ${(0.3 * pulse).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255, 180, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rx - 28, ry - 24, 56, 48);

  // Ondas que salen del altavoz.
  for (let i = 0; i < 3; i++) {
    const p = ((reducedMotion ? 0.5 : elapsed * 0.9) + i / 3) % 1;
    ctx.strokeStyle = `rgba(255, 214, 150, ${((1 - p) * 0.4).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rx + 7, ry + 2, 6 + p * 24, -0.8, 0.6);
    ctx.stroke();
  }

  // Dial encendido.
  ctx.fillStyle = `rgba(255, 236, 190, ${(0.55 + pulse * 0.35).toFixed(3)})`;
  ctx.fillRect(rx - 6, ry - 2, 4, 2);
  ctx.restore();
}

export function renderIslaNatalCabin(params: IslaNatalCabinRenderParams): void {
  const { ctx, vw, vh, camera, elapsed, reducedMotion } = params;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#080604';
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
  drawCabinShell(ctx, elapsed, reducedMotion);
  drawCabinFurniture(ctx, elapsed, reducedMotion);
  if (params.radioOn) drawCabinRadioLive(ctx, elapsed, reducedMotion);
  if (params.backpackOnHook) drawCabinBackpack(ctx, elapsed, reducedMotion);
  drawPlayer(ctx, params, elapsed);
  if (params.prompt) {
    const bob = reducedMotion ? 0 : (Math.floor(elapsed * 3.2) % 2 === 0 ? 0 : -2);
    drawPromptBadge(ctx, params.prompt, bob);
  }
  ctx.restore();

  // Calidez interior: viñeta de madera y polvo flotando en la luz.
  const vig = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.26, vw / 2, vh / 2, Math.max(vw, vh) * 0.72);
  vig.addColorStop(0, 'rgba(24, 12, 4, 0)');
  vig.addColorStop(1, 'rgba(12, 6, 2, 0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);
  const grade = ctx.createLinearGradient(0, 0, 0, vh);
  grade.addColorStop(0, 'rgba(255, 176, 96, 0.05)');
  grade.addColorStop(0.5, 'rgba(255, 150, 80, 0.015)');
  grade.addColorStop(1, 'rgba(40, 18, 8, 0.16)');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, vw, vh);

  // Tormenta del aviso: la sala se oscurece y la ventana devuelve destellos.
  if (params.storm) {
    const st = params.storm.t;
    const dark = Math.min(0.46, 0.1 + st * 0.14);
    ctx.fillStyle = `rgba(9, 15, 28, ${dark.toFixed(3)})`;
    ctx.fillRect(0, 0, vw, vh);

    const gaussian = (center: number, spread: number) => {
      const d = (st - center) / spread;
      return Math.exp(-d * d);
    };
    const flash = Math.max(
      gaussian(0.3, 0.1),
      gaussian(1.15, 0.13),
      gaussian(2.25, 0.15),
      gaussian(3.0, 0.12)
    );
    if (flash > 0.01) {
      // Luz fría que entra por la ventana y trepa por la pared.
      const wx = 136 - Math.round(camera.x);
      const wy = 56 - Math.round(camera.y);
      const beam = ctx.createRadialGradient(wx, wy, 6, wx, wy, 300);
      beam.addColorStop(0, `rgba(196, 238, 255, ${(flash * 0.66).toFixed(3)})`);
      beam.addColorStop(0.42, `rgba(140, 200, 245, ${(flash * 0.3).toFixed(3)})`);
      beam.addColorStop(1, 'rgba(120, 180, 230, 0)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, vw, vh);

      ctx.fillStyle = `rgba(226, 245, 255, ${(flash * 0.3).toFixed(3)})`;
      ctx.fillRect(0, 0, vw, vh);

      // El rayo, dibujado dentro del marco de la ventana.
      const wx0 = 94 - Math.round(camera.x);
      const wy0 = 26 - Math.round(camera.y);
      const strike = Math.max(
        Math.exp(-Math.pow((st - 0.3) / 0.055, 2)),
        Math.exp(-Math.pow((st - 2.25) / 0.06, 2))
      );
      if (strike > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(240, 253, 255, ${(strike * 0.95).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx0 + 54, wy0 + 2);
        ctx.lineTo(wx0 + 48, wy0 + 14);
        ctx.lineTo(wx0 + 55, wy0 + 16);
        ctx.lineTo(wx0 + 42, wy0 + 38);
        ctx.lineTo(wx0 + 48, wy0 + 40);
        ctx.lineTo(wx0 + 36, wy0 + 58);
        ctx.stroke();
        ctx.strokeStyle = `rgba(150, 226, 255, ${(strike * 0.5).toFixed(3)})`;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
      }

      // Destello cegador del primer impacto: la sala entera se vuelve blanca.
      const blind = Math.exp(-Math.pow((st - 0.28) / 0.06, 2));
      if (blind > 0.01) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(blind * 0.92).toFixed(3)})`;
        ctx.fillRect(0, 0, vw, vh);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* CUADRO COMPLETO                                                    */
/* ------------------------------------------------------------------ */

export function renderIslaNatalFrame(params: IslaNatalRenderParams): void {
  const {
    ctx,
    vw,
    vh,
    camera,
    elapsed,
    reducedMotion,
    arcadeState,
    charge,
    signalPulse,
    paddleOnGround,
    departureReady,
    particles,
    prompt,
    shockwaves,
    travelerEvent,
  } = params;

  ctx.imageSmoothingEnabled = false;

  const animFrame4 = reducedMotion ? 0 : Math.floor(elapsed * 3.2) % 4;
  const camX = Math.round(camera.x);
  const camY = Math.round(camera.y);

  // Fondo de mar profundo (cubre todo el viewport antes de trasladar)
  ctx.fillStyle = '#0a2b46';
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(-camX, -camY);

  drawOcean(ctx, camX, camY, vw, vh, elapsed, animFrame4, charge);
  drawLandmass(ctx, camX, camY, vw, vh, elapsed);

  // Muelle del Puerto Norte: se dibuja como parte del suelo para que el
  // jugador pueda caminar sobre los tablones sin quedar oculto por la pasarela.
  drawNorthPortDock(ctx, elapsed, departureReady, reducedMotion);
  drawBeachBoardwalk(ctx);

  // Detalle de suelo (matas, flores, guijarros, conchas)
  const sway = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.4) * 0.6);
  for (const t of ISLA_NATAL_TUFTS) {
    if (!isWorldBoxVisible(t.x - 6, t.y - 10, 12, 12, camX, camY, vw, vh)) continue;
    drawTuft(ctx, t.x, t.y, t.seed, sway);
  }
  for (const f of ISLA_NATAL_FLOWERS) {
    if (!isWorldBoxVisible(f.x - 4, f.y - 8, 8, 10, camX, camY, vw, vh)) continue;
    drawFlower(ctx, f.x, f.y, f.seed);
  }
  for (const p of ISLA_NATAL_PEBBLES) {
    if (!isWorldBoxVisible(p.x - 4, p.y - 4, 8, 8, camX, camY, vw, vh)) continue;
    drawPebble(ctx, p.x, p.y, p.seed);
  }
  for (const s of ISLA_NATAL_SHELLS) {
    if (!isWorldBoxVisible(s.x - 4, s.y - 4, 8, 8, camX, camY, vw, vh)) continue;
    drawShell(ctx, s.x, s.y, s.seed);
  }

  // Elementos ordenados por profundidad (oclusión correcta con el jugador)
  const ySorted: { sortY: number; draw: () => void }[] = [];

  for (const tree of ISLA_NATAL_TREES) {
    if (!isWorldBoxVisible(tree.x - 28, tree.y - 80, 56, 92, camX, camY, vw, vh)) continue;
    ySorted.push({
      sortY: tree.y + 10,
      draw: () =>
        drawHandcraftedTree(ctx, tree.x, tree.y, tree.variant, elapsed, reducedMotion),
    });
  }
  for (const p of ISLA_NATAL_PALMS) {
    if (!isWorldBoxVisible(p.x - 40, p.y - 78, 80, 90, camX, camY, vw, vh)) continue;
    ySorted.push({ sortY: p.y + 4, draw: () => drawPalm(ctx, p.x, p.y, p.seed, elapsed, reducedMotion) });
  }
  for (const b of ISLA_NATAL_BOULDERS) {
    if (!isWorldBoxVisible(b.x - 24, b.y - 30, 48, 38, camX, camY, vw, vh)) continue;
    ySorted.push({ sortY: b.y, draw: () => drawBoulder(ctx, b.x, b.y, b.seed) });
  }
  for (const b of NATAL_BUSHES) {
    if (!isWorldBoxVisible(b.x - 22, b.y - 26, 44, 34, camX, camY, vw, vh)) continue;
    ySorted.push({ sortY: b.y + 2, draw: () => drawBush(ctx, b.x, b.y, b.seed, elapsed, reducedMotion) });
  }

  // Peñascos, tronco y rocas costeras que dan cuerpo a los bloqueos del mapa.
  for (const solid of ISLA_NATAL_SOLIDS) {
    if (solid.id === 'cabana' || solid.id === 'cobertizo') continue;
    if (!isWorldBoxVisible(solid.x - 16, solid.y - 26, solid.w + 32, solid.h + 36, camX, camY, vw, vh)) {
      continue;
    }
    const seed = hash2(solid.x + 3, solid.y - 7);
    if (solid.id === 'tronco') {
      ySorted.push({
        sortY: solid.y + solid.h,
        draw: () => drawFallenLog(ctx, solid.x, solid.y, solid.w, solid.h, seed),
      });
    } else {
      ySorted.push({
        sortY: solid.y + solid.h,
        draw: () => drawRockOutcrop(ctx, solid.x, solid.y, solid.w, solid.h, seed),
      });
    }
  }

  ySorted.push({ sortY: HUT_POS.y + 96, draw: () => drawHut(ctx, elapsed, reducedMotion) });
  ySorted.push({ sortY: SHED_POS.y + 124, draw: () => drawShed(ctx, elapsed, arcadeState, reducedMotion) });
  for (const sign of ISLA_NATAL_SIGNS) {
    if (!isWorldBoxVisible(sign.x - 20, sign.y - 30, 40, 40, camX, camY, vw, vh)) continue;
    ySorted.push({
      sortY: sign.y + 1,
      draw: () => drawGbcWoodenSign(ctx, sign.x, sign.y),
    });
  }
  ySorted.push({ sortY: SIGN_POS.y + 2, draw: () => drawSign(ctx) });
  ySorted.push({ sortY: NET_POS.y + 8, draw: () => drawNet(ctx, elapsed) });
  ySorted.push({ sortY: SHELLS_POI_POS.y + 8, draw: () => drawShellCluster(ctx, elapsed) });
  ySorted.push({ sortY: MAILBOX_POS.y + 1, draw: () => drawMailbox(ctx) });
  ySorted.push({ sortY: CRATE_POS.y + 1, draw: () => drawCrate(ctx, elapsed, reducedMotion) });
  if (isWorldBoxVisible(MIRADOR_POS.x - 64, MIRADOR_POS.y - 40, 128, 52, camX, camY, vw, vh)) {
    ySorted.push({
      sortY: MIRADOR_POS.y + 2,
      draw: () => drawAltoMirador(ctx, elapsed, reducedMotion),
    });
  }
  if (paddleOnGround) {
    ySorted.push({
      sortY: CABINET_POS.y + 24,
      draw: () => drawPaddleItem(ctx, elapsed, reducedMotion),
    });
  }
  if (travelerEvent && travelerEvent.phase !== 'storm') {
    const phase = travelerEvent.phase;
    const tt = travelerEvent.t;
    const site = ISLA_NATAL_TRAVELER_SITE;
    let lift = 0;
    if (phase === 'arrival') {
      lift = 240 * (1 - smoothstep(tt / 2.4));
    } else if (phase === 'departure') {
      lift = 260 * smoothstep(tt / 2.0);
    }
    const landed = lift < 1.5;
    ySorted.push({
      sortY: site.y + 2,
      draw: () => {
        if (lift < 40) drawLandingScorch(ctx, site.x, site.y, elapsed);
        drawTravelerShip(ctx, site.x, site.y, lift, elapsed, reducedMotion, landed);
      },
    });

    if (phase === 'descend' || phase === 'talk' || phase === 'board') {
      const doorX = site.x - DOOR_OFFSET;
      const talkX = site.x - TALK_OFFSET;
      let px = talkX;
      let walking = false;
      if (phase === 'descend') {
        const p = clamp01(tt / 1.7);
        px = doorX + (talkX - doorX) * smoothstep(p);
        walking = p > 0.08 && p < 0.95;
      } else if (phase === 'board') {
        const p = clamp01(tt / 1.4);
        px = talkX + (doorX - talkX) * smoothstep(p);
        walking = p > 0.08 && p < 0.95;
      }
      ySorted.push({
        sortY: site.y + 4,
        draw: () => drawFutureTraveler(ctx, px, site.y, elapsed, -1, walking),
      });
    }
  }

  ySorted.push({ sortY: params.player.y + 4, draw: () => drawPlayer(ctx, params, elapsed) });

  ySorted.sort((a, b) => a.sortY - b.sortY);
  for (const item of ySorted) item.draw();

  // Partículas (polen, chispas de la señal)
  for (const pt of particles) {
    const a = Math.max(0, Math.min(1, pt.life / pt.maxLife));
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  drawAmbientLife(ctx, camX, camY, vw, vh, elapsed, reducedMotion);

  drawDepartureBeacon(ctx, elapsed, departureReady, reducedMotion);

  // Ondas de choque de la anomalía sobre el mar
  if (shockwaves.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sw of shockwaves) {
      const t = sw.t / sw.life;
      const r = 20 + t * 1500;
      ctx.strokeStyle = `rgba(180, 245, 255, ${(0.55 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth = 6 - t * 4;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(0, 243, 255, ${(0.3 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, r * 0.72, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Luz ambiental: farol de la cabaña, resplandor del cobertizo y sol poniente
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const pools: { x: number; y: number; r: number; rgba: string }[] = [
    { x: HUT_POS.x + 96, y: HUT_POS.y + 52, r: 74, rgba: 'rgba(255, 178, 92, 0.16)' },
    { x: MAILBOX_POS.x, y: MAILBOX_POS.y - 24, r: 40, rgba: 'rgba(255, 214, 140, 0.1)' },
  ];

  if (arcadeState !== 'dusty') {
    const intensity = arcadeState === 'won' ? 0.3 + signalPulse * 0.35 : 0.18 + charge * 0.16;
    pools.push({
      x: ISLA_NATAL_ARCADE_ANCHOR.x,
      y: ISLA_NATAL_ARCADE_ANCHOR.y - 46,
      r: 150,
      rgba: `rgba(0, 243, 255, ${intensity.toFixed(3)})`,
    });
  }

  for (const pool of pools) {
    const g = ctx.createRadialGradient(pool.x, pool.y, 2, pool.x, pool.y, pool.r);
    g.addColorStop(0, pool.rgba);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(pool.x - pool.r, pool.y - pool.r, pool.r * 2, pool.r * 2);
  }

  // Sol bajo al oeste: baño cálido sobre la isla
  const sunX = 120;
  const sunY = 420;
  const sun = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 1500);
  sun.addColorStop(0, 'rgba(255, 196, 120, 0.26)');
  sun.addColorStop(0.35, 'rgba(255, 168, 100, 0.1)');
  sun.addColorStop(1, 'rgba(255, 150, 90, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(camX, camY, vw, vh);
  ctx.restore();

  // Corrupción de señal en el cielo de la isla durante la anomalía
  if (signalPulse > 0.02) {
    ctx.save();
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const n = hash2(Math.floor(elapsed * 9) + i * 31, i);
      if (n < 0.45) continue;
      const by = camY + n * vh;
      const bh = 2 + Math.floor(n * 6);
      ctx.globalAlpha = 0.28 * signalPulse;
      ctx.fillStyle = i % 2 === 0 ? '#67e8f9' : '#f0abfc';
      ctx.fillRect(camX + (n * 80) % 120, by, vw, bh);
    }
    ctx.restore();
  }

  if (prompt) {
    drawPromptBadge(ctx, prompt, animFrame4 % 2 === 0 ? 0 : -2);
  }

  // Pájaros sobre la isla (se dispersan con la señal)
  ctx.save();
  const birdScatter = signalPulse > 0.3 ? 2.4 : 1;
  for (let i = 0; i < 3; i++) {
    const bt = elapsed * 0.06 * birdScatter + i * 0.33;
    const bx = ISLA_NATAL_WORLD_W * 0.5 + Math.cos(bt * (1 + i * 0.2)) * (420 + i * 90);
    const by = ISLA_NATAL_WORLD_H * 0.42 + Math.sin(bt * 1.6) * 210;
    if (!isWorldBoxVisible(bx - 10, by - 6, 20, 12, camX, camY, vw, vh)) continue;
    const flap = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 9 + i * 2) * 1.6);
    ctx.fillStyle = 'rgba(226, 240, 250, 0.85)';
    ctx.fillRect(Math.round(bx) - 3, Math.round(by) - flap, 2, 2);
    ctx.fillRect(Math.round(bx) + 1, Math.round(by) - flap, 2, 2);
    ctx.fillRect(Math.round(bx) - 1, Math.round(by), 2, 1);
    ctx.fillStyle = 'rgba(20, 40, 60, 0.22)';
    ctx.fillRect(Math.round(bx) - 14, Math.round(by) + 26, 5, 2);
  }
  ctx.restore();

  ctx.restore();

  // Viñeta suave en espacio de pantalla
  const vig = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.32, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(4, 10, 20, 0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);

  // Neblina cálida del atardecer y frescor del mar en el borde inferior
  const haze = ctx.createLinearGradient(0, 0, 0, vh);
  haze.addColorStop(0, 'rgba(255, 186, 120, 0.1)');
  haze.addColorStop(0.42, 'rgba(255, 168, 110, 0.035)');
  haze.addColorStop(0.78, 'rgba(90, 120, 170, 0.04)');
  haze.addColorStop(1, 'rgba(52, 46, 96, 0.14)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, vw, vh);

  // Rayo de sol rasante desde el oeste (sutil, acompaña al sol del mapa)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ray = ctx.createLinearGradient(0, vh * 0.18, vw * 0.7, vh * 0.82);
  ray.addColorStop(0, 'rgba(255, 200, 130, 0.07)');
  ray.addColorStop(1, 'rgba(255, 160, 100, 0)');
  ctx.fillStyle = ray;
  ctx.fillRect(0, 0, vw, vh);
  ctx.restore();

  // Tormenta de la llegada: el cielo se oscurece y se parte en destellos.
  if (travelerEvent?.phase === 'storm') {
    const st = travelerEvent.t;
    ctx.fillStyle = `rgba(8, 16, 28, ${(0.34 * Math.min(1, st / 0.5)).toFixed(3)})`;
    ctx.fillRect(0, 0, vw, vh);

    const gaussian = (center: number, spread: number) => {
      const d = (st - center) / spread;
      return Math.exp(-d * d);
    };
    const flash = Math.max(
      gaussian(0.3, 0.11),
      gaussian(1.05, 0.13),
      gaussian(1.9, 0.16)
    );
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(226, 245, 255, ${(flash * 0.62).toFixed(3)})`;
      ctx.fillRect(0, 0, vw, vh);
    }
  }
}
