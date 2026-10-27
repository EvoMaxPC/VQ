/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Motor Cinematográfico HD-2D de PIXELVERSE para el prólogo
 * «EL REINICIO DEL UNIVERSO» (00:00–03:30 / 210s).
 *
 * - Ilustraciones cinematográficas de alta densidad (1792×1024) con cámara
 *   virtual (paneo, zoom, sacudida) y encuadre cover dentro de un framebuffer
 *   nítido de 480×270 que se escala sin suavizado a la ventana.
 * - Dirección de escena: 9 capítulos, desde el mundo de los juegos hasta la
 *   asamblea del Gran Koopa, el Reinicio Cero y la isla que no fue alcanzada.
 * - Luz dinámica, partículas, portales, glitch slices y post-proceso
 *   (viñeta, scanlines, grano) calculado a bajo costo.
 * - El sprite del héroe, Pong y la identidad cromática se dibujan en el mismo
 *   framebuffer para que todo pertenezca al mismo universo.
 */

import {
  drawBowserClassic,
  drawDonkeyKongClassic,
  drawEggmanClassic,
  drawGanondorfClassic,
  drawKingKRoolClassic,
  drawMBisonClassic,
  drawSuperCupaSovereign,
} from './cinematicVillains';

export interface CinematicWorldController {
  resize: (width: number, height: number) => void;
  renderAtTime: (tSec: number, dtSec: number) => void;
  dispose: () => void;
}

const FB_W = 480;
const FB_H = 270;

/* =========================================================================
   FONDOS ILUSTRADOS
   ========================================================================= */

type BackdropKey =
  | 'bedroom'
  | 'arcade'
  | 'city'
  | 'cosmos'
  | 'hall'
  | 'island'
  | 'gate'
  | 'crono'
  | 'glitch'
  | 'emblem';

const BACKDROP_SRC: Record<BackdropKey, string> = {
  bedroom: '/assets/cinematic/bedroom.png',
  arcade: '/assets/cinematic/abandoned-arcade.png',
  city: '/assets/cinematic/dying-city.png',
  cosmos: '/assets/cinematic/cosmic-spark.png',
  hall: '/assets/cinematic/hall-of-eras.png',
  island: '/assets/cinematic/origins-island.png',
  gate: '/assets/cinematic/cavern-gate.png',
  crono: '/assets/cinematic/cronoscopio.png',
  glitch: '/assets/cinematic/glitch-trail.png',
  emblem: '/assets/cinematic/emblem.jpg',
};

interface BackdropSurface {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

interface BackdropEntry {
  img: HTMLImageElement;
  surface: BackdropSurface | null;
}

const backdropEntries = new Map<BackdropKey, BackdropEntry>();

function ensureBackdrop(key: BackdropKey): BackdropEntry {
  let entry = backdropEntries.get(key);
  if (!entry) {
    const img = new Image();
    img.decoding = 'async';
    img.src = BACKDROP_SRC[key];
    entry = { img, surface: null };
    backdropEntries.set(key, entry);
  }
  return entry;
}

/** Reduce cada ilustración una sola vez a 1024 px de ancho (2× el framebuffer). */
function getBackdropSurface(key: BackdropKey): BackdropSurface | null {
  const entry = ensureBackdrop(key);
  if (entry.surface) return entry.surface;
  const img = entry.img;
  if (!img.complete || img.naturalWidth === 0) return null;

  const targetW = Math.min(1024, img.naturalWidth);
  const ratio = targetW / img.naturalWidth;
  const w = Math.max(2, Math.round(img.naturalWidth * ratio));
  const h = Math.max(2, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  entry.surface = { canvas, w, h };
  // Liberamos la imagen original: la superficie reducida es la que se dibuja.
  img.src = '';
  return entry.surface;
}

/* =========================================================================
   UTILIDADES NUMÉRICAS / CÁMARA
   ========================================================================= */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0 || 1));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function cuePulse(t: number, at: number, decay = 3.2): number {
  return t >= at ? Math.exp(-(t - at) * decay) : 0;
}

interface Cam {
  x: number;
  y: number;
  zoom: number;
  shakeX: number;
  shakeY: number;
}

function makeCam(x: number, y: number, zoom: number, shakeX = 0, shakeY = 0): Cam {
  return { x, y, zoom, shakeX, shakeY };
}

interface CoverRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

function coverRect(surface: BackdropSurface, cam: Cam): CoverRect {
  const scale = Math.max(FB_W / surface.w, FB_H / surface.h) * cam.zoom;
  const dw = surface.w * scale;
  const dh = surface.h * scale;
  return {
    dx: FB_W / 2 - (cam.x / FB_W) * dw + cam.shakeX,
    dy: FB_H / 2 - (cam.y / FB_H) * dh + cam.shakeY,
    dw,
    dh,
  };
}

type Projector = (artX: number, artY: number) => { x: number; y: number; s: number };

/** Coordenadas normalizadas sobre la ilustración 1792×1024 original. */
function makeProjector(key: BackdropKey, cam: Cam): Projector | null {
  const surface = getBackdropSurface(key);
  if (!surface) return null;
  const r = coverRect(surface, cam);
  return (artX, artY) => ({
    x: r.dx + (artX / 1792) * r.dw,
    y: r.dy + (artY / 1024) * r.dh,
    s: r.dw / 1792,
  });
}

function drawBackdrop(
  c: CanvasRenderingContext2D,
  key: BackdropKey,
  cam: Cam,
  alpha = 1
): boolean {
  const surface = getBackdropSurface(key);
  if (!surface) return false;
  const r = coverRect(surface, cam);
  c.save();
  c.globalAlpha = alpha;
  c.imageSmoothingEnabled = true;
  c.drawImage(surface.canvas, r.dx, r.dy, r.dw, r.dh);
  c.restore();
  return true;
}

function drawBandedSky(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: string[]
): void {
  const bandH = Math.ceil(h / stops.length);
  for (let i = 0; i < stops.length; i++) {
    const by = y + i * bandH;
    const bh = Math.min(bandH, y + h - by);
    if (bh <= 0) break;
    c.fillStyle = stops[i];
    c.fillRect(x, by, w, bh);
  }
}

/** Fallback elegante mientras llega la ilustración (nunca deja la pantalla vacía). */
function drawFallback(c: CanvasRenderingContext2D, key: BackdropKey): void {
  const palettes: Record<BackdropKey, string[]> = {
    bedroom: ['#03050c', '#060a17', '#091022', '#0c152c', '#080d1a'],
    arcade: ['#04050f', '#080b1c', '#0b1226', '#070a18'],
    city: ['#06051a', '#0b0824', '#140b2e', '#0a0618'],
    cosmos: ['#03030d', '#08071f', '#12082e', '#070516'],
    hall: ['#03050f', '#05102a', '#081a38', '#040a1d'],
    island: ['#20183a', '#3a2c58', '#5c4a74', '#141028'],
    gate: ['#040312', '#0a0826', '#110c34', '#05040f'],
    crono: ['#07060f', '#1a1408', '#0e1024', '#06050c'],
    glitch: ['#05020f', '#0d0522', '#16082e', '#060212'],
    emblem: ['#010206', '#050514', '#0a0a20', '#020208'],
  };
  drawBandedSky(c, 0, 0, FB_W, FB_H, palettes[key]);
  drawGlow(c, FB_W / 2, FB_H / 2, 110, '#1e3a8a', 0.18);
}

/* =========================================================================
   LUZ, PARTÍCULAS Y TIPOGRAFÍA PIXEL
   ========================================================================= */

function drawGlow(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number
): void {
  if (alpha <= 0.012 || radius < 1) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 3; i >= 1; i--) {
    const r = Math.round((radius * i) / 3);
    c.globalAlpha = (alpha / 3) * (1.35 - (i / 3) * 0.45);
    c.fillStyle = color;
    c.beginPath();
    c.arc(Math.round(cx), Math.round(cy), r, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawRing(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number,
  width = 1
): void {
  if (alpha <= 0.01 || radius < 1) return;
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.arc(Math.round(cx), Math.round(cy), radius, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

function drawShard(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number
): void {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(Math.round(x), Math.round(y - size));
  c.lineTo(Math.round(x + size * 0.62), Math.round(y));
  c.lineTo(Math.round(x), Math.round(y + size));
  c.lineTo(Math.round(x - size * 0.62), Math.round(y));
  c.closePath();
  c.fill();
  c.globalAlpha = alpha * 0.85;
  c.fillStyle = '#ffffff';
  c.fillRect(Math.round(x), Math.round(y - 1), 1, 2);
  c.restore();
}

function drawMotes(
  c: CanvasRenderingContext2D,
  t: number,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  color: string,
  alpha = 0.35,
  drift = 5
): void {
  c.save();
  c.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const px = Math.round(x + hash(i * 3.17) * w + Math.sin(t * 0.24 + i * 1.7) * drift);
    const py = Math.round(
      y + ((hash(i * 7.31) * h + t * (1.4 + hash(i) * 2.2)) % h)
    );
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.9 + i * 0.83));
    c.globalAlpha = alpha * tw;
    c.fillRect(px, py, 1, 1);
  }
  c.restore();
}

function drawReflectionStreak(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha: number
): void {
  if (alpha <= 0.01) return;
  c.save();
  for (let i = 0; i < 5; i++) {
    c.fillStyle = color;
    const lw = Math.max(1, Math.round(w * (1 - i * 0.16)));
    c.globalAlpha = alpha * (1 - i * 0.18);
    c.fillRect(Math.round(x - lw / 2), Math.round(y + i * (h / 5)), lw, 1);
  }
  c.restore();
}

const PIXEL_FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '111', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  ':': ['000', '010', '000', '010', '000'],
  '-': ['000', '000', '111', '000', '000'],
  '.': ['000', '000', '000', '000', '010'],
  '/': ['001', '001', '010', '100', '100'],
  ' ': ['000', '000', '000', '000', '000'],
};

function drawPixelText(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
  alpha = 1,
  align: 'left' | 'center' | 'right' = 'left'
): void {
  const content = text.toUpperCase();
  const glyphW = 3 * scale;
  const gap = scale;
  const totalW = content.length * (glyphW + gap) - gap;
  let sx = align === 'center' ? x - totalW / 2 : align === 'right' ? x - totalW : x;
  sx = Math.round(sx);
  const sy = Math.round(y);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  for (const ch of content) {
    const glyph = PIXEL_FONT[ch] ?? PIXEL_FONT[' '];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (glyph[row][col] === '1') {
          c.fillRect(sx + col * scale, sy + row * scale, scale, scale);
        }
      }
    }
    sx += glyphW + gap;
  }
  c.restore();
}

/* =========================================================================
   HÉROE DE PÍXEL (PIXEL) — SILUETA, BUFANDA Y RIM-LIGHT
   ========================================================================= */

interface HeroOptions {
  backView?: boolean;
  running?: boolean;
  auraStrength?: number;
  shadow?: boolean;
}

function drawHero(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  t: number,
  opts: HeroOptions = {}
): void {
  const s = Math.max(1, Math.round(scale));
  const running = !!opts.running;
  const bob = running
    ? -Math.round(Math.abs(Math.sin(t * 13)) * 2)
    : Math.round(Math.sin(t * 2.4) * 1.2);
  const aura = opts.auraStrength ?? 0;
  const blink = !opts.backView && Math.sin(t * 1.9 + 1.3) > 0.945;

  if (opts.shadow) {
    c.save();
    c.globalAlpha = 0.42;
    c.fillStyle = '#010208';
    c.beginPath();
    c.ellipse(
      Math.round(cx),
      Math.round(cy + 1),
      Math.round(8 * s),
      Math.max(1, Math.round(2.2 * s)),
      0,
      0,
      Math.PI * 2
    );
    c.fill();
    c.restore();
  }

  if (aura > 0) {
    drawGlow(c, cx, cy - 9 * s + bob, 14 * s, '#00f3ff', aura * 0.32);
    drawGlow(c, cx, cy - 9 * s + bob, 7 * s, '#fde047', aura * 0.2);
  }

  c.save();
  c.translate(Math.round(cx), Math.round(cy + bob));
  c.scale(s, s);

  const out = '#04060f';
  const hairDark = '#1a1026';
  const hairMid = '#2f2450';
  const hairHi = '#67e8f9';
  const skin = '#ffd7b8';
  const skinShade = '#d99b78';
  const suitDark = '#0b4f6c';
  const suitMid = '#0e7490';
  const suitBright = '#22d3ee';
  const scarf = '#fbbf24';
  const scarfShade = '#d97706';

  const stride = running ? Math.round(Math.sin(t * 13) * 3) : 0;

  // Bufanda en dos segmentos ondeando
  const wave = Math.sin(t * 6.4);
  c.fillStyle = out;
  c.fillRect(-13, -13 + Math.round(wave * 1.5), 8, 4);
  c.fillRect(-16, -11 - Math.round(wave), 5, 3);
  c.fillStyle = scarfShade;
  c.fillRect(-12, -13 + Math.round(wave * 1.5), 7, 2);
  c.fillStyle = scarf;
  c.fillRect(-10, -13 + Math.round(wave * 1.5), 5, 1);
  c.fillRect(-15, -11 - Math.round(wave), 4, 1);

  // Piernas y botas
  c.fillStyle = out;
  c.fillRect(-5 + stride, -4, 4, 6);
  c.fillRect(1 - stride, -4, 4, 6);
  c.fillStyle = '#1e293b';
  c.fillRect(-4 + stride, -3, 2, 4);
  c.fillRect(2 - stride, -3, 2, 4);
  c.fillStyle = suitBright;
  c.fillRect(-4 + stride, 0, 2, 1);
  c.fillRect(2 - stride, 0, 2, 1);

  // Torso
  c.fillStyle = out;
  c.fillRect(-6, -13, 12, 10);
  c.fillStyle = suitDark;
  c.fillRect(-5, -12, 10, 8);
  c.fillStyle = suitMid;
  c.fillRect(-4, -11, 3, 6);
  c.fillStyle = suitBright;
  c.fillRect(-2, -10, 4, 3);
  c.fillStyle = scarf;
  c.fillRect(-5, -13, 10, 2);
  c.fillRect(-5, -6, 10, 1);
  // Rim-light derecho
  c.fillStyle = 'rgba(103,232,249,0.85)';
  c.fillRect(4, -12, 1, 7);

  // Brazos
  c.fillStyle = out;
  c.fillRect(-8, -12 - stride * 0.5, 3, 6);
  c.fillRect(5, -12 + stride * 0.5, 3, 6);
  c.fillStyle = skin;
  c.fillRect(-7, -8 - stride * 0.5, 1, 2);
  c.fillRect(6, -8 + stride * 0.5, 1, 2);

  // Cabeza
  c.fillStyle = out;
  c.fillRect(-7, -24, 14, 12);
  if (opts.backView) {
    c.fillStyle = hairDark;
    c.fillRect(-6, -23, 12, 10);
    c.fillStyle = hairMid;
    c.fillRect(-5, -22, 9, 7);
    c.fillStyle = hairHi;
    c.fillRect(4, -22, 2, 5);
    c.fillStyle = 'rgba(251,191,36,0.9)';
    c.fillRect(-6, -14, 12, 1);
  } else {
    c.fillStyle = skinShade;
    c.fillRect(-5, -19, 10, 6);
    c.fillStyle = skin;
    c.fillRect(-4, -19, 8, 5);
    c.fillStyle = hairDark;
    c.fillRect(-6, -23, 12, 5);
    c.fillRect(-6, -19, 2, 4);
    c.fillRect(4, -19, 2, 4);
    c.fillStyle = hairMid;
    c.fillRect(-5, -22, 8, 3);
    c.fillStyle = hairHi;
    c.fillRect(-5, -23, 4, 1);
    if (blink) {
      c.fillStyle = '#0b1220';
      c.fillRect(-3, -16, 2, 1);
      c.fillRect(1, -16, 2, 1);
    } else {
      c.fillStyle = out;
      c.fillRect(-3, -17, 2, 3);
      c.fillRect(1, -17, 2, 3);
      c.fillStyle = '#00f3ff';
      c.fillRect(-3, -16, 2, 2);
      c.fillRect(1, -16, 2, 2);
      c.fillStyle = '#ffffff';
      c.fillRect(-3, -17, 1, 1);
      c.fillRect(1, -17, 1, 1);
    }
  }

  c.restore();
}

/* =========================================================================
   INTERACTIVOS HOLOGRÁFICOS
   ========================================================================= */

interface HoloRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectFromArt(p: Projector, x0: number, y0: number, x1: number, y1: number): HoloRect {
  const a = p(x0, y0);
  const b = p(x1, y1);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}

function holoFrame(
  c: CanvasRenderingContext2D,
  r: HoloRect,
  color: string,
  alpha: number
): void {
  if (r.w <= 4 || r.h <= 4) return;
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  const w = Math.round(r.w);
  const h = Math.round(r.h);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(2,8,18,0.52)';
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(8,28,44,0.35)';
  c.fillRect(x + 1, y + 1, w - 2, Math.round(h * 0.32));
  c.strokeStyle = color;
  c.lineWidth = 1;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  c.globalAlpha = alpha * 0.2;
  c.fillStyle = '#000000';
  for (let yy = y + 2; yy < y + h - 1; yy += 3) c.fillRect(x + 1, yy, w - 2, 1);
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(x - 1, y - 1, 3, 2);
  c.fillRect(x + w - 2, y - 1, 3, 2);
  c.fillRect(x - 1, y + h - 1, 3, 2);
  c.fillRect(x + w - 2, y + h - 1, 3, 2);
  c.restore();
}

function drawPongHolo(c: CanvasRenderingContext2D, r: HoloRect, t: number, color: string): void {
  const { x, y, w, h } = r;
  if (w < 8 || h < 8) return;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const padH = Math.max(3, h * 0.26);
  const leftY = y + h * 0.5 + Math.sin(t * 0.9) * h * 0.2 - padH / 2;
  const rightY = y + h * 0.5 + Math.sin(t * 0.72 + 2.1) * h * 0.18 - padH / 2;
  c.fillStyle = color;
  c.globalAlpha = 0.55;
  for (let ny = y + 9; ny < y + h - 8; ny += 4) {
    c.fillRect(Math.round(x + w * 0.5), Math.round(ny), 1, 2);
  }
  c.globalAlpha = 0.95;
  c.fillRect(Math.round(x + 3), Math.round(leftY), 2, Math.round(padH));
  c.fillRect(Math.round(x + w - 5), Math.round(rightY), 2, Math.round(padH));
  const bx = x + w * 0.5 + Math.sin(t * 1.3) * w * 0.32;
  const by = y + h * 0.5 + Math.cos(t * 1.7) * h * 0.3;
  c.fillStyle = '#f8fafc';
  c.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 2, 2);
  drawPixelText(c, '3 5', x + w / 2, y + 2, 1, '#fbbf24', 0.9, 'center');
  drawPixelText(c, '1972', x + w / 2, y + h - 7, 1, color, 0.85, 'center');
  c.restore();
}

function drawBreakoutHolo(c: CanvasRenderingContext2D, r: HoloRect, t: number, color: string): void {
  const { x, y, w, h } = r;
  if (w < 8 || h < 8) return;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const cols = 6;
  const rows = 3;
  const bw = Math.max(2, (w - 6) / cols);
  const bh = 2;
  const shake = cuePulse(t, 76.4, 5) * 2;
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      const idx = ry * cols + cx;
      const alive = hash(idx * 4.7 + 1.3) > 0.22 && !(idx % 7 === 0 && t > 78);
      if (!alive) continue;
      c.fillStyle = idx % 3 === 0 ? '#fbbf24' : idx % 3 === 1 ? color : '#f472b6';
      c.globalAlpha = 0.9;
      c.fillRect(
        Math.round(x + 3 + cx * bw + shake * (idx % 2 === 0 ? 0.4 : -0.4)),
        Math.round(y + 9 + ry * (bh + 1)),
        Math.max(1, Math.floor(bw) - 1),
        bh
      );
    }
  }
  c.globalAlpha = 1;
  c.fillStyle = color;
  const paddleX = x + w * 0.5 + Math.sin(t * 1.1) * w * 0.3;
  c.fillRect(Math.round(paddleX - 5), Math.round(y + h - 10), 10, 2);
  const bx = x + w * 0.5 + Math.sin(t * 1.35) * w * 0.34;
  const by = y + h * 0.62 + Math.cos(t * 1.9) * h * 0.18;
  c.fillStyle = '#f8fafc';
  c.fillRect(Math.round(bx), Math.round(by), 1, 1);
  drawPixelText(c, '1976', x + w / 2, y + h - 7, 1, color, 0.8, 'center');
  c.restore();
}

function drawInvadersHolo(c: CanvasRenderingContext2D, r: HoloRect, t: number, color: string): void {
  const { x, y, w, h } = r;
  if (w < 8 || h < 8) return;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const step = Math.floor((t * 1.4) % 2) * 2;
  c.fillStyle = color;
  c.globalAlpha = 0.92;
  for (let ry = 0; ry < 2; ry++) {
    for (let cx = 0; cx < 5; cx++) {
      if (hash(cx * 3.1 + ry * 7.7) > 0.82 && t > 77.5) continue;
      const ex = Math.round(x + 4 + cx * ((w - 8) / 5) + step * (cx % 2 === 0 ? 1 : -1));
      const ey = Math.round(y + 9 + ry * 9);
      c.fillRect(ex, ey, 4, 1);
      c.fillRect(ex + 1, ey + 1, 2, 1);
      c.fillRect(ex, ey + 2, 1, 1);
      c.fillRect(ex + 3, ey + 2, 1, 1);
    }
  }
  const shipX = x + w * 0.5 + Math.sin(t * 1.6) * w * 0.26;
  c.globalAlpha = 1;
  c.fillStyle = '#67e8f9';
  c.fillRect(Math.round(shipX) - 2, Math.round(y + h - 12), 5, 2);
  c.fillRect(Math.round(shipX), Math.round(y + h - 14), 1, 2);
  const by = y + h - 18 - ((t * 26) % (h - 24));
  c.fillStyle = '#fde047';
  c.fillRect(Math.round(shipX), Math.round(by), 1, 3);
  drawPixelText(c, '1978', x + w / 2, y + h - 7, 1, color, 0.8, 'center');
  c.restore();
}

function drawAsteroidsHolo(c: CanvasRenderingContext2D, r: HoloRect, t: number, color: string): void {
  const { x, y, w, h } = r;
  if (w < 8 || h < 8) return;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const shipX = x + w * 0.5 + Math.sin(t * 0.8) * w * 0.2;
  const shipY = y + h * 0.58 + Math.cos(t * 1.05) * h * 0.16;
  c.strokeStyle = '#67e8f9';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(shipX, shipY - 4);
  c.lineTo(shipX + 3, shipY + 3);
  c.lineTo(shipX - 3, shipY + 3);
  c.closePath();
  c.stroke();
  for (let i = 0; i < 4; i++) {
    const rx = x + 6 + hash(i * 5.3 + 2) * (w - 12);
    const ry =
      y + 9 + ((hash(i * 2.9 + 5) * (h - 20) + t * (2 + i)) % Math.max(4, h - 20));
    c.fillStyle = i % 2 === 0 ? '#c084fc' : '#a5b4fc';
    c.fillRect(Math.round(rx), Math.round(ry), 2, 2);
    c.fillRect(Math.round(rx + 2), Math.round(ry - 1), 1, 1);
  }
  c.fillStyle = '#fde047';
  c.fillRect(Math.round(shipX), Math.round(shipY - 12), 1, 6);
  drawPixelText(c, '1979', x + w / 2, y + h - 7, 1, color, 0.8, 'center');
  c.restore();
}

function drawBeamsHolo(c: CanvasRenderingContext2D, r: HoloRect, t: number, color: string): void {
  const { x, y, w, h } = r;
  if (w < 8 || h < 8) return;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = 'rgba(30,2,12,0.28)';
  c.fillRect(x, y, w, h);
  for (let i = 0; i < 4; i++) {
    const bx = x + 5 + (i * (w - 10)) / 3 + Math.sin(t * 0.9 + i) * 2;
    c.fillStyle = i % 2 === 0 ? '#ef4444' : '#f97316';
    c.globalAlpha = 0.55 + Math.sin(t * 3 + i) * 0.25;
    c.fillRect(Math.round(bx), y + 6, 1, h - 14);
  }
  c.globalAlpha = 0.8;
  c.fillStyle = '#fecaca';
  c.fillRect(x + 2, Math.round(y + ((t * 18) % (h - 10))), w - 4, 1);
  drawPixelText(c, '1981', x + w / 2, y + h - 7, 1, color, 0.8, 'center');
  c.restore();
}

function drawStaticPanel(
  c: CanvasRenderingContext2D,
  r: HoloRect,
  t: number,
  color: string,
  alpha: number
): void {
  const { x, y, w, h } = r;
  c.save();
  c.globalAlpha = alpha;
  const tick = Math.floor(t * 9);
  for (let i = 0; i < 26; i++) {
    const px = x + 2 + hash(i * 3.1 + tick) * (w - 4);
    const py = y + 2 + hash(i * 7.3 + tick * 1.7) * (h - 4);
    c.fillStyle = i % 3 === 0 ? '#ffffff' : color;
    c.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  c.restore();
}

/* =========================================================================
   EFECTOS DE CORRUPCIÓN DIGITAL
   ========================================================================= */

function drawGlitchSlices(
  c: CanvasRenderingContext2D,
  key: BackdropKey,
  cam: Cam,
  t: number,
  intensity: number
): void {
  if (intensity < 0.04) return;
  const surface = getBackdropSurface(key);
  if (!surface) return;
  const r = coverRect(surface, cam);
  const tick = Math.floor(t * 18);
  const bands = 3 + Math.floor(intensity * 4);
  c.save();
  for (let i = 0; i < bands; i++) {
    const y = Math.floor(hash(i * 3.13 + tick * 0.71) * (FB_H - 8));
    const h = 2 + Math.floor(hash(i * 9.37 + tick * 1.91) * (5 + intensity * 16));
    const shift = Math.round((hash(i * 5.93 + tick * 2.31) - 0.5) * 58 * intensity);
    c.save();
    c.beginPath();
    c.rect(0, y, FB_W, h);
    c.clip();
    c.imageSmoothingEnabled = true;
    c.drawImage(surface.canvas, r.dx + shift, r.dy, r.dw, r.dh);
    c.fillStyle = i % 2 === 0 ? 'rgba(0,243,255,0.15)' : 'rgba(244,63,94,0.13)';
    c.fillRect(0, y, FB_W, h);
    c.fillStyle = 'rgba(235,255,255,0.22)';
    c.fillRect(0, y, FB_W, 1);
    c.restore();
  }
  c.restore();
}

function drawSignalCorruption(
  c: CanvasRenderingContext2D,
  t: number,
  intensity: number
): void {
  if (intensity < 0.05) return;
  const tick = Math.floor(t * 11);
  c.save();
  for (let i = 0; i < 3; i++) {
    const y = Math.round(hash(i * 4.7 + tick) * FB_H);
    const h = 1 + Math.floor(hash(i * 9.1 + tick * 2) * 3);
    c.fillStyle = i % 2 === 0 ? 'rgba(0,243,255,0.08)' : 'rgba(244,63,94,0.07)';
    c.fillRect(0, y, FB_W, h);
  }
  const sweepY = Math.round((t * 74) % FB_H);
  c.fillStyle = 'rgba(140,240,255,0.06)';
  c.fillRect(0, sweepY, FB_W, 2);
  for (let i = 0; i < 9; i++) {
    const bx = hash(i * 3.7 + tick * 1.3) * FB_W;
    const by = hash(i * 8.3 + tick * 0.9) * FB_H;
    c.fillStyle = i % 3 === 0 ? 'rgba(244,63,94,0.16)' : 'rgba(0,243,255,0.14)';
    c.fillRect(Math.round(bx), Math.round(by), 2 + Math.floor(hash(i) * 5), 1);
  }
  c.restore();
}

function drawSpeedLines(
  c: CanvasRenderingContext2D,
  t: number,
  intensity: number
): void {
  if (intensity < 0.08) return;
  c.save();
  for (let i = 0; i < 14; i++) {
    const y = Math.round(hash(i * 3.3) * FB_H);
    const speed = 320 + hash(i * 7.1) * 520;
    const x = FB_W + 10 - ((t * speed + hash(i) * 640) % (FB_W + 80));
    const len = 14 + hash(i * 5.7) * 60;
    c.globalAlpha = 0.05 + hash(i * 2.1) * 0.16 * intensity;
    c.fillStyle = i % 4 === 0 ? '#f0abfc' : '#67e8f9';
    c.fillRect(Math.round(x), y, Math.round(len), 1);
  }
  c.restore();
}

function drawEyeCutIn(c: CanvasRenderingContext2D, t: number): { alpha: number } {
  const enter = smoothstep(138.35, 139.15, t);
  const exit = 1 - smoothstep(140.85, 141.5, t);
  const alpha = enter * exit;
  if (alpha <= 0.01) return { alpha: 0 };
  const lookX = Math.sin(t * 0.8) * 4;
  const lookY = 2 + Math.sin(t * 1.3) * 1.5;

  c.save();
  c.globalAlpha = alpha;

  // Silueta de un rostro/máscara emergiendo de la corrupción
  c.fillStyle = '#010207';
  c.beginPath();
  c.moveTo(FB_W / 2 - 96, -12);
  c.lineTo(FB_W / 2 + 96, -12);
  c.lineTo(FB_W / 2 + 82, 58);
  c.quadraticCurveTo(FB_W / 2 + 58, 126, FB_W / 2, 146);
  c.quadraticCurveTo(FB_W / 2 - 58, 126, FB_W / 2 - 82, 58);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(168,85,247,0.4)';
  c.lineWidth = 1;
  c.stroke();

  // Grietas
  c.strokeStyle = 'rgba(103,232,249,0.28)';
  c.beginPath();
  c.moveTo(FB_W / 2 - 70, 18);
  c.lineTo(FB_W / 2 - 30, 44);
  c.lineTo(FB_W / 2 - 52, 76);
  c.moveTo(FB_W / 2 + 62, 8);
  c.lineTo(FB_W / 2 + 28, 34);
  c.lineTo(FB_W / 2 + 48, 64);
  c.stroke();

  const eyeY = 66;
  [FB_W / 2 - 34, FB_W / 2 + 34].forEach((ex, idx) => {
    drawGlow(c, ex, eyeY, 17, '#00f3ff', 0.42);
    c.fillStyle = '#02060c';
    c.beginPath();
    c.ellipse(ex, eyeY, 17, 9, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = idx === 0 ? '#22d3ee' : '#67e8f9';
    c.beginPath();
    c.ellipse(ex + lookX, eyeY + lookY, 10, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e0feff';
    c.beginPath();
    c.ellipse(ex + lookX, eyeY + lookY, 6, 3.4, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#04121c';
    c.beginPath();
    c.ellipse(ex + lookX, eyeY + lookY, 2.6, 4.2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.fillRect(Math.round(ex + lookX - 4), Math.round(eyeY + lookY - 3), 2, 2);
    c.fillStyle = '#010207';
    c.beginPath();
    c.ellipse(ex, eyeY - 7, 18, 5, 0, Math.PI, Math.PI * 2);
    c.fill();
  });

  const sy = 34 + ((t * 52) % 72);
  c.fillStyle = 'rgba(0,243,255,0.14)';
  c.fillRect(FB_W / 2 - 92, Math.round(sy), 184, 2);
  c.restore();
  return { alpha };
}

/* =========================================================================
   ESCENAS
   ========================================================================= */

const SCENE_CUTS = [32, 72, 96, 126, 152, 180, 194, 203];

function cutEffects(t: number): { flash: number; dip: number } {
  let flash = 0;
  let dip = 0;
  for (const cut of SCENE_CUTS) {
    const d = Math.abs(t - cut);
    if (d < 0.5) dip = Math.max(dip, 1 - d / 0.5);
    if (t >= cut - 0.16 && t <= cut + 0.22) {
      flash = Math.max(flash, 1 - Math.abs(t - (cut + 0.02)) / 0.19);
    }
  }
  return { flash: clamp01(flash), dip: clamp01(dip) };
}

function veil(c: CanvasRenderingContext2D, alpha: number, color = '1,2,7'): void {
  if (alpha <= 0.004) return;
  c.fillStyle = `rgba(${color},${clamp01(alpha)})`;
  c.fillRect(0, 0, FB_W, FB_H);
}

/* -------------------------------------------------------------------------
   CAP. 1 · 00:00–00:32 — CUANDO TODOS LOS JUEGOS TODAVÍA EXISTÍAN
   ------------------------------------------------------------------------- */

function drawCrtOpening(c: CanvasRenderingContext2D, t: number): void {
  c.fillStyle = '#010206';
  c.fillRect(0, 0, FB_W, FB_H);

  const ignite = smoothstep(0.05, 0.75, t);
  const lineW = lerp(2, 168, smoothstep(0.15, 1.9, t));
  const jitterY = Math.round(Math.sin(t * 37) * 0.8 + Math.sin(t * 91) * 0.4);

  // Zumbido del tubo: línea horizontal que vibra en el centro
  drawGlow(c, FB_W / 2, 135, 14 + lineW * 0.18, '#bae6fd', 0.16 * ignite);
  c.fillStyle = `rgba(224,242,254,${0.72 * ignite})`;
  c.fillRect(Math.round(FB_W / 2 - lineW / 2), 134 + jitterY, Math.round(lineW), 2);
  c.fillStyle = `rgba(255,255,255,${0.85 * ignite})`;
  c.fillRect(Math.round(FB_W / 2 - lineW / 2), 134 + jitterY, Math.round(lineW), 1);

  // Apertura vertical del tubo
  const open = smoothstep(2.4, 4.9, t);
  if (open > 0.01) {
    const h = Math.max(3, 152 * open);
    const w = Math.max(3, 190 * open);
    const grad = c.createLinearGradient(0, 135 - h / 2, 0, 135 + h / 2);
    grad.addColorStop(0, 'rgba(8,47,73,0.0)');
    grad.addColorStop(0.35, 'rgba(125,211,252,0.35)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.92)');
    grad.addColorStop(0.65, 'rgba(125,211,252,0.35)');
    grad.addColorStop(1, 'rgba(8,47,73,0.0)');
    c.fillStyle = grad;
    c.fillRect(Math.round(FB_W / 2 - w / 2), Math.round(135 - h / 2), Math.round(w), Math.round(h));
  }

  // El píxel brillante nace en el centro y se convierte en ventana
  const pixelOn = smoothstep(3.6, 4.6, t);
  if (pixelOn > 0.01) {
    const size = Math.max(2, Math.round(3 + 5 * pixelOn));
    drawGlow(c, FB_W / 2, 135, 10 + 26 * pixelOn, '#e0f2fe', 0.3 * pixelOn);
    c.fillStyle = `rgba(255,255,255,${pixelOn})`;
    c.fillRect(FB_W / 2 - size / 2, 135 - size / 2, size, size);
  }

  // Líneas de barrido del tubo
  c.save();
  c.globalAlpha = 0.16 * ignite;
  c.fillStyle = '#7dd3fc';
  for (let i = 0; i < 8; i++) {
    const y = 20 + i * 30 + Math.sin(t * 3 + i) * 4;
    c.fillRect(0, Math.round(y), FB_W, 1);
  }
  c.restore();

  // Flash de encendido que funde hacia el pasado
  const flash = smoothstep(4.7, 5.55, t);
  if (flash > 0.01) {
    c.fillStyle = `rgba(240,249,255,${flash * 0.88})`;
    c.fillRect(0, 0, FB_W, FB_H);
  }
}

function renderBedroomPast(c: CanvasRenderingContext2D, t: number): void {
  const k = smoothstep(5.6, 16.2, t);
  const cam = makeCam(lerp(248, 272, k), lerp(131, 121, k), lerp(1.07, 1.16, k));
  if (!drawBackdrop(c, 'bedroom', cam, 1)) drawFallback(c, 'bedroom');
  const p = makeProjector('bedroom', cam);

  if (p) {
    const screen = p(1078, 452);
    const lamp = p(352, 470);
    const flicker = 0.82 + 0.18 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 23.1);
    drawGlow(c, screen.x, screen.y, 46, '#67e8f9', 0.22 * flicker);
    drawGlow(c, screen.x, screen.y, 18, '#bae6fd', 0.26 * flicker);
    drawGlow(c, lamp.x, lamp.y, 30, '#fbbf24', 0.16);

    const a = p(858, 288);
    const b = p(1298, 632);
    if (b.x > a.x + 4 && b.y > a.y + 4) {
      c.save();
      c.beginPath();
      c.rect(Math.round(a.x), Math.round(a.y), Math.round(b.x - a.x), Math.round(b.y - a.y));
      c.clip();
      c.globalAlpha = 0.22;
      c.fillStyle = '#67e8f9';
      for (let y = a.y; y < b.y; y += 3) {
        c.fillRect(a.x, Math.round(y), b.x - a.x, 1);
      }
      // Pequeñas escenas de juego dibujadas dentro del televisor
      c.globalAlpha = 0.75;
      const gx = a.x + (b.x - a.x) * 0.5;
      const gy = a.y + (b.y - a.y) * 0.55;
      const bounce = Math.sin(t * 3.1) * 4;
      c.fillStyle = '#fef08a';
      c.fillRect(Math.round(gx + bounce), Math.round(gy), 2, 2);
      c.fillRect(Math.round(gx - 14), Math.round(gy - 6), 1, 10);
      c.fillRect(Math.round(gx + 14), Math.round(gy - 10), 1, 10);
      c.restore();
    }

    drawMotes(c, t, 80, 40, 340, 190, 26, '#cfe9ff', 0.3, 6);
    drawMotes(c, t, 120, 90, 300, 140, 10, '#fde68a', 0.14, 4);
  }
}

const ARCADE_SCREENS = [
  { x: 62, y: 492, color: '#38bdf8' },
  { x: 235, y: 478, color: '#fbbf24' },
  { x: 388, y: 464, color: '#f472b6' },
  { x: 505, y: 452, color: '#67e8f9' },
  { x: 602, y: 442, color: '#a3e635' },
  { x: 1004, y: 470, color: '#a78bfa' },
  { x: 1160, y: 486, color: '#fbbf24' },
  { x: 1302, y: 445, color: '#fbbf24' },
  { x: 1418, y: 458, color: '#38bdf8' },
  { x: 1540, y: 474, color: '#f472b6' },
  { x: 1656, y: 490, color: '#67e8f9' },
];

function renderArcadePast(c: CanvasRenderingContext2D, t: number): void {
  const k = smoothstep(16.4, 32, t);
  const cam = makeCam(
    lerp(232, 262, k),
    lerp(142, 127, k),
    lerp(1.16, 1.02, k),
    0,
    Math.sin(t * 0.8) * 0.6
  );
  if (!drawBackdrop(c, 'arcade', cam, 1)) drawFallback(c, 'arcade');
  const p = makeProjector('arcade', cam);
  if (!p) return;

  // Colección de pantallas encendidas, como pequeñas estrellas
  ARCADE_SCREENS.forEach((screen, i) => {
    const pos = p(screen.x, screen.y);
    const awake = smoothstep(16.6 + i * 0.22, 18.2 + i * 0.22, t);
    if (awake <= 0.01) return;

    const defect = i === 6 && t > 23.2 && t < 24.15;
    const flicker = 0.62 + 0.38 * Math.abs(Math.sin(t * (4.5 + i * 0.4) + i * 1.7));
    const alpha = defect ? 0.18 : awake * flicker;

    drawGlow(c, pos.x, pos.y, 7 + (i % 3) * 2, screen.color, 0.24 * alpha);
    c.save();
    c.globalAlpha = 0.9 * alpha;
    c.fillStyle = screen.color;
    const jx = Math.round(Math.sin(t * 9 + i * 2.1) * 1.2);
    c.fillRect(Math.round(pos.x + jx), Math.round(pos.y), 2, 1);
    if (i % 4 === 0) {
      // Mini sprite reconocible en la pantalla
      c.fillRect(Math.round(pos.x + jx - 3), Math.round(pos.y + 2), 1, 1);
      c.fillRect(Math.round(pos.x + jx + 4), Math.round(pos.y + 2), 1, 1);
    }
    c.restore();

    if (defect) {
      const u = (t - 23.2) / 0.95;
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2 + u * 2;
        c.fillStyle = s % 2 === 0 ? '#e0f2fe' : '#475569';
        c.fillRect(
          Math.round(pos.x + Math.cos(a) * (2 + u * 9)),
          Math.round(pos.y + Math.sin(a) * (1 + u * 5)),
          1,
          1
        );
      }
    }
  });

  // Manos y joystick en primer plano
  const joy = p(760, 820);
  c.save();
  c.globalAlpha = 0.9;
  c.fillStyle = '#0b1220';
  c.fillRect(Math.round(joy.x - 6), Math.round(joy.y - 4), 12, 4);
  c.fillRect(Math.round(joy.x - 2), Math.round(joy.y - 18), 4, 16);
  const knob = Math.round(Math.sin(t * 1.7) * 3);
  c.beginPath();
  c.arc(Math.round(joy.x + knob), Math.round(joy.y - 20), 4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f472b6';
  c.fillRect(Math.round(joy.x + 16), Math.round(joy.y - 8), 5, 2);
  c.restore();

  const buttonPulse = Math.max(cuePulse(t, 18.7, 6), cuePulse(t, 20.2, 6), cuePulse(t, 27.4, 5));
  if (buttonPulse > 0.02) {
    drawGlow(c, joy.x + 18, joy.y - 8, 8, '#f472b6', buttonPulse * 0.35);
  }

  drawMotes(c, t, 40, 40, 400, 180, 30, '#cfe9ff', 0.24, 8);
  drawMotes(c, t, 60, 120, 360, 110, 14, '#fde68a', 0.14, 5);
  drawReflectionStreak(c, 240, 216, 90, 16, '#38bdf8', 0.05);

  // Una sombra se desliza detrás de todas las imágenes
  const shadow = smoothstep(26.4, 31.8, t);
  if (shadow > 0.01) {
    c.save();
    c.globalAlpha = 0.3 * shadow;
    c.fillStyle = '#010206';
    const sx = lerp(90, 390, shadow);
    c.beginPath();
    c.ellipse(sx, 138, 44, 86, 0.1, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(sx - 20, 66);
    c.lineTo(sx - 34, 30);
    c.lineTo(sx - 6, 54);
    c.lineTo(sx + 18, 26);
    c.lineTo(sx + 20, 64);
    c.closePath();
    c.fill();
    c.restore();
  }

  if (t > 24.6) {
    veil(c, smoothstep(24.6, 30, t) * 0.18);
  }
}

function renderScene1(c: CanvasRenderingContext2D, t: number): void {
  if (t < 5.6) {
    drawCrtOpening(c, t);
    return;
  }
  if (t < 16.35) {
    renderBedroomPast(c, t);
    if (t > 15.7) veil(c, smoothstep(15.7, 16.35, t) * 0.9);
    return;
  }
  renderArcadePast(c, t);
  veil(c, 1 - smoothstep(16.35, 17.5, t));
  if (t > 31.1) veil(c, smoothstep(31.1, 32, t) * 0.8);
}

/* -------------------------------------------------------------------------
   CAP. 2 · 00:32–01:12 — EL GRAN KOOPA CONVOCA A LOS VILLANOS
   ------------------------------------------------------------------------- */

interface PortalSpec {
  x: number;
  y: number;
  openAt: number;
  hue: string;
  draw: (ctx: CanvasRenderingContext2D, cx: number, bottomY: number, u: number, time: number) => void;
}

const VILLAIN_PORTALS: PortalSpec[] = [
  { x: 62, y: 174, openAt: 37.6, hue: '#a855f7', draw: drawEggmanClassic },
  { x: 126, y: 212, openAt: 38.6, hue: '#38bdf8', draw: drawKingKRoolClassic },
  { x: 354, y: 214, openAt: 39.6, hue: '#f97316', draw: drawDonkeyKongClassic },
  { x: 418, y: 172, openAt: 40.6, hue: '#ef4444', draw: drawGanondorfClassic },
  { x: 240, y: 84, openAt: 41.6, hue: '#c084fc', draw: drawMBisonClassic },
];

function drawPortal(c: CanvasRenderingContext2D, x: number, y: number, open: number, t: number, hue: string): void {
  if (open <= 0.01) return;
  const pulse = 0.7 + 0.3 * Math.sin(t * 2.1 + x * 0.05);
  drawGlow(c, x, y - 6, 20 + 12 * open, hue, 0.2 * open * pulse);
  drawGlow(c, x, y - 6, 7 + 4 * open, '#f8fafc', 0.14 * open);

  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.55 + i / 3) % 1;
    const rw = (16 + 8 * open) * (0.72 + phase * 0.5);
    const rh = (22 + 10 * open) * (0.72 + phase * 0.5);
    c.save();
    c.globalAlpha = 0.55 * open * (1 - phase);
    c.strokeStyle = hue;
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(x, y - 6, rw, rh, Math.sin(t * 0.5 + i) * 0.08, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // Fragmentos de escenarios suspendidos alrededor del portal
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.24;
    const r = 20 + i * 3;
    c.save();
    c.globalAlpha = 0.26 * open;
    c.fillStyle = i % 2 === 0 ? '#cbd5e1' : hue;
    c.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y - 8 + Math.sin(a) * r * 0.6), 2, 1);
    c.restore();
  }
}

function drawVoidStructure(c: CanvasRenderingContext2D, cx: number, cy: number, t: number, alpha: number): void {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = 'rgba(168,85,247,0.4)';
  c.fillStyle = 'rgba(30,27,75,0.55)';
  c.lineWidth = 1;

  // Anillo incompleto de código y restos de universos
  c.beginPath();
  c.ellipse(cx, cy, 96, 66, Math.sin(t * 0.12) * 0.06, 0.25, Math.PI * 1.82);
  c.stroke();
  c.beginPath();
  c.ellipse(cx, cy, 74, 50, -Math.sin(t * 0.1) * 0.05, 0.6, Math.PI * 1.9);
  c.stroke();

  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + Math.sin(t * 0.2 + i) * 0.03;
    const r = 70 + (i % 4) * 9;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.68;
    const h = 2 + Math.floor(hash(i * 5.3) * 10);
    c.globalAlpha = alpha * (0.24 + 0.4 * Math.abs(Math.sin(t * 1.2 + i)));
    c.fillStyle = i % 3 === 0 ? '#e0f2fe' : i % 3 === 1 ? '#a855f7' : '#22d3ee';
    c.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 3 : 1, h);
  }
  c.restore();
}

function renderScene2(c: CanvasRenderingContext2D, t: number): void {
  const k = smoothstep(32, 72, t);
  const pulse = cuePulse(t, 69.7, 3.4);
  const cam = makeCam(
    240,
    lerp(122, 132, k),
    lerp(1.06, 1.12, k),
    Math.sin(t * 43) * pulse * 2.4,
    Math.cos(t * 37) * pulse * 1.6
  );
  if (!drawBackdrop(c, 'hall', cam, 1)) drawFallback(c, 'hall');
  veil(c, 0.62);
  drawVoidStructure(c, 240, 128, t, smoothstep(63, 69, t) * 0.7);

  const p = makeProjector('hall', cam);
  if (p) {
    const orb = p(897, 56);
    drawGlow(c, orb.x, orb.y, 18, '#a855f7', 0.18 + 0.05 * Math.sin(t * 1.3));
  }

  // Portales
  const closing = 1 - smoothstep(60.6, 61.9, t);
  if (t > 37.4 && closing > 0.01) {
    VILLAIN_PORTALS.forEach((portal) => {
      const open = smoothstep(portal.openAt, portal.openAt + 1.3, t) * closing;
      drawPortal(c, portal.x, portal.y, open, t, portal.hue);
      if (open > 0.25) {
        c.save();
        c.globalAlpha = open * 0.92;
        c.filter = 'brightness(0.5) saturate(0.85)';
        portal.draw(c, portal.x, portal.y + 12 - 4 * open, 1.45, t);
        c.filter = 'none';
        c.restore();
        drawGlow(c, portal.x, portal.y + 4, 12, portal.hue, open * 0.1);
      }
    });
  }

  // El Gran Koopa: primero silueta y ojos; después, presencia completa
  const reveal = smoothstep(35.2, 39.4, t);
  const koopaU = lerp(2.0, 2.35, smoothstep(32, 70, t));
  const breathe = Math.sin(t * 1.4) * 0.4;

  c.save();
  c.globalAlpha = 1 - reveal * 0.85;
  c.filter = 'brightness(0)';
  drawBowserClassic(c, 240, 246 + breathe, koopaU, t);
  c.filter = 'none';
  c.restore();

  const eyeY = 246 + breathe - 26 * koopaU;
  const eyeX = 240 + 4.4 * koopaU;
  const eyeGlow = 0.28 + 0.16 * Math.sin(t * 3.4);
  drawGlow(c, eyeX, eyeY, 6, '#ef4444', eyeGlow * (1 - reveal * 0.5));
  c.fillStyle = `rgba(254,240,138,${0.55 + 0.3 * Math.sin(t * 4.1)})`;
  c.fillRect(Math.round(eyeX), Math.round(eyeY), 1, 2);

  if (reveal > 0.01) {
    c.save();
    c.globalAlpha = reveal;
    drawBowserClassic(c, 240, 246 + breathe, koopaU, t);
    c.restore();
    drawGlow(c, 240, 214, 46, '#f97316', reveal * 0.1);
    drawGlow(c, eyeX, eyeY, 4, '#fef08a', reveal * 0.2);
  }

  // Portales que se encienden de nuevo con la orden final
  if (t > 69.4) {
    const ignite = smoothstep(69.4, 70.6, t);
    VILLAIN_PORTALS.forEach((portal, i) => {
      drawPortal(c, portal.x, portal.y, ignite, t * 1.3, portal.hue);
      drawGlow(c, portal.x, portal.y, 26, portal.hue, ignite * 0.14);
      if (i === 0) drawRing(c, 240, 136, 20 + ignite * 150, '#a855f7', ignite * 0.3 * (1 - ignite * 0.6));
    });
    c.fillStyle = `rgba(168,85,247,${ignite * 0.12})`;
    c.fillRect(0, 0, FB_W, FB_H);
  }

  drawMotes(c, t, 40, 30, 400, 200, 26, '#a855f7', 0.16, 7);
  drawMotes(c, t, 90, 60, 300, 160, 12, '#e0f2fe', 0.12, 4);

  if (t > 70.9) {
    veil(c, smoothstep(70.9, 72, t) * 0.92);
  }
}

/* -------------------------------------------------------------------------
   CAP. 3 · 01:12–01:36 — LA CREACIÓN DEL REINICIO CERO
   ------------------------------------------------------------------------- */

function renderScene3(c: CanvasRenderingContext2D, t: number): void {
  const k = smoothstep(72, 96, t);
  const shake = cuePulse(t, 69.9, 4) * 2 + cuePulse(t, 80.6, 2.6) * 1.4;
  const cam = makeCam(
    240,
    lerp(130, 136, k),
    lerp(1.17, 1.03, k),
    Math.sin(t * 51) * shake,
    Math.cos(t * 47) * shake * 0.7
  );
  if (!drawBackdrop(c, 'hall', cam, 1)) drawFallback(c, 'hall');
  veil(c, 0.68);

  drawVoidStructure(c, 240, 132, t, 0.9);

  // Gran Koopa observa desde un costado, en penumbra
  drawGlow(c, 74, 196, 40, '#f97316', 0.12);
  c.save();
  c.globalAlpha = 0.84;
  c.filter = 'brightness(0.58) saturate(0.85)';
  drawBowserClassic(c, 74, 252, 2.05, t + 2);
  c.filter = 'none';
  c.restore();
  drawGlow(c, 74, 198, 20, '#fb923c', 0.1);

  // SUPER CUPA en el centro de la energía acumulada
  const cupa = smoothstep(74.8, 80.4, t);
  if (cupa > 0.01) {
    drawGlow(c, 240, 144, 48 + 20 * cupa, '#f43f5e', 0.16 * cupa);
    drawGlow(c, 240, 144, 24, '#a855f7', 0.18 * cupa);
    c.save();
    c.globalAlpha = cupa;
    drawSuperCupaSovereign(c, 240, 146, 2.0 + 0.9 * cupa, t);
    c.restore();
    drawReflectionStreak(c, 240, 214, 44, 18, '#f43f5e', cupa * 0.1);
  }

  // Onda digital: primero una línea oscura, después una esfera de distorsión
  const wave = smoothstep(80.3, 90.2, t);
  if (wave > 0.01) {
    const radius = 6 + wave * 300;
    drawRing(c, 240, 138, radius, '#e0f2fe', 0.32 * (1 - wave * 0.75), 2);
    drawRing(c, 240, 138, radius * 0.78, '#a855f7', 0.26 * (1 - wave * 0.7), 2);
    drawGlow(c, 240, 138, 22 + wave * 90, '#0f172a', 0.3 * (1 - wave * 0.5));
  }

  // Fragmentos de imágenes y símbolos que se descomponen
  for (let i = 0; i < 42; i++) {
    const fly = smoothstep(78 + hash(i * 3.1) * 6, 94, t);
    if (fly <= 0 || fly >= 1) continue;
    const angle = hash(i * 7.7) * Math.PI * 2;
    const radius = lerp(46, 330, fly);
    const x = 240 + Math.cos(angle) * radius;
    const y = 138 + Math.sin(angle) * radius * 0.62;
    c.save();
    c.globalAlpha = Math.sin(fly * Math.PI) * 0.8;
    c.fillStyle = i % 4 === 0 ? '#f0abfc' : i % 4 === 1 ? '#67e8f9' : i % 4 === 2 ? '#e2e8f0' : '#f43f5e';
    c.fillRect(Math.round(x), Math.round(y), 1 + (i % 3), 1);
    if (i % 6 === 0) {
      drawPixelText(c, ['PONG', '1972', 'NIVEL', 'VIDAS', 'JUGAR'][i % 5], x + 2, y + 2, 1, '#cbd5e1', 0.5);
    }
    c.restore();
  }

  // Fecha y anuncio del Reinicio Cero
  const dateA = smoothstep(89.4, 90.6, t) * (1 - smoothstep(93.7, 94.4, t));
  if (dateA > 0.01) {
    c.fillStyle = `rgba(2,6,23,${dateA * 0.82})`;
    c.fillRect(44, 34, 392, 54);
    drawGlow(c, 240, 58, 70, '#a855f7', dateA * 0.12);
    drawPixelText(c, '23 DE OCTUBRE DE 2026', 240, 44, 2, '#e0f2fe', dateA, 'center');
    drawPixelText(c, 'EL REINICIO CERO HA COMENZADO.', 240, 70, 1, '#f0abfc', dateA * 0.92, 'center');
    c.fillStyle = `rgba(224,242,254,${dateA * 0.24})`;
    c.fillRect(120, 63, 240, 1);
  }

  if (t > 93.9) {
    veil(c, smoothstep(93.9, 95.9, t) * 0.98);
  }
}

/* -------------------------------------------------------------------------
   CAP. 4 · 01:36–02:06 — EL MUNDO OLVIDA
   ------------------------------------------------------------------------- */

function drawPersonSilhouette(
  c: CanvasRenderingContext2D,
  x: number,
  bottomY: number,
  h: number,
  color: string,
  armReach = 0
): void {
  const head = h * 0.16;
  const paint = (dx: number, fill: string) => {
    c.fillStyle = fill;
    c.strokeStyle = fill;
    // Cabeza y gorra
    c.beginPath();
    c.arc(x + dx, bottomY - h + head, head, 0, Math.PI * 2);
    c.fill();
    c.fillRect(x + dx - head, bottomY - h + head * 0.1, head * 2, head * 0.9);
    // Torso
    c.beginPath();
    c.moveTo(x + dx - h * 0.16, bottomY - h * 0.78);
    c.lineTo(x + dx + h * 0.16, bottomY - h * 0.78);
    c.lineTo(x + dx + h * 0.12, bottomY - h * 0.3);
    c.lineTo(x + dx - h * 0.12, bottomY - h * 0.3);
    c.closePath();
    c.fill();
    // Piernas
    c.fillRect(x + dx - h * 0.11, bottomY - h * 0.32, h * 0.09, h * 0.32);
    c.fillRect(x + dx + h * 0.02, bottomY - h * 0.32, h * 0.09, h * 0.32);
    // Brazo que se extiende hacia los controles
    c.lineWidth = Math.max(2, h * 0.07);
    c.beginPath();
    c.moveTo(x + dx + h * 0.13, bottomY - h * 0.7);
    c.lineTo(x + dx + h * 0.13 + armReach, bottomY - h * 0.56);
    c.stroke();
  };

  c.save();
  // Contraluz que separa la silueta de la penumbra del salón
  c.globalAlpha = 0.5;
  paint(1.6, '#1e3a5f');
  c.globalAlpha = 1;
  paint(0, color);
  c.restore();
}

function renderForgettingArcade(c: CanvasRenderingContext2D, t: number): void {
  const k = smoothstep(96, 112, t);
  const cam = makeCam(lerp(238, 260, k), lerp(137, 129, k), lerp(1.05, 1.14, k));
  if (!drawBackdrop(c, 'arcade', cam, 1)) drawFallback(c, 'arcade');
  veil(c, 0.34);
  const p = makeProjector('arcade', cam);
  if (!p) return;

  ARCADE_SCREENS.forEach((screen, i) => {
    const pos = p(screen.x, screen.y);
    const offAt = 98.8 + i * 0.82;
    if (t < offAt) {
      const flicker = 0.55 + 0.45 * Math.abs(Math.sin(t * (3 + i) + i));
      drawGlow(c, pos.x, pos.y, 7, screen.color, 0.22 * flicker);
      c.save();
      c.globalAlpha = 0.8 * flicker;
      c.fillStyle = screen.color;
      c.fillRect(Math.round(pos.x), Math.round(pos.y), 2, 1);
      c.restore();
    } else {
      // La pantalla sigue encendida, pero vacía
      const age = t - offAt;
      const staticFlicker = 0.16 + 0.12 * Math.abs(Math.sin(t * 11 + i));
      c.save();
      c.globalAlpha = staticFlicker;
      c.fillStyle = '#94a3b8';
      c.fillRect(Math.round(pos.x - 4), Math.round(pos.y - 2), 9, 5);
      c.globalAlpha = staticFlicker * 0.7;
      for (let s = 0; s < 6; s++) {
        c.fillStyle = s % 2 === 0 ? '#e2e8f0' : '#475569';
        c.fillRect(
          Math.round(pos.x - 3 + hash(s * 3.1 + age * 7) * 7),
          Math.round(pos.y - 1 + hash(s * 7.3 + age * 3) * 3),
          1,
          1
        );
      }
      c.restore();
      if (age < 0.8) {
        drawGlow(c, pos.x, pos.y, 8, screen.color, 0.18 * (1 - age / 0.8));
      }
    }
  });

  // Gabinete apagado que el niño observa, sin nada que jugar
  c.save();
  c.globalAlpha = 0.9;
  c.fillStyle = '#080d18';
  c.fillRect(214, 150, 48, 88);
  c.fillStyle = '#0f172a';
  c.fillRect(218, 155, 40, 50);
  c.strokeStyle = 'rgba(148,163,184,0.45)';
  c.lineWidth = 1;
  c.strokeRect(218.5, 155.5, 39, 49);
  c.fillStyle = '#111c30';
  c.fillRect(216, 206, 44, 10);
  c.fillStyle = '#1e293b';
  c.fillRect(226, 220, 24, 3);
  c.restore();

  // Estática tenue en la pantalla vacía
  c.save();
  c.globalAlpha = 0.16 + 0.08 * Math.sin(t * 9);
  for (let i = 0; i < 26; i++) {
    c.fillStyle = i % 4 === 0 ? '#e2e8f0' : '#64748b';
    c.fillRect(
      220 + Math.floor(hash(i * 3.7 + Math.floor(t * 12)) * 36),
      157 + Math.floor(hash(i * 7.9 + Math.floor(t * 9)) * 46),
      1,
      1
    );
  }
  c.restore();
  drawGlow(c, 238, 178, 16, '#38bdf8', 0.05);

  // Niño frente a la máquina vacía; su padre frente a otra consola
  drawPersonSilhouette(c, 188, 240, 54, '#05070d', 12 + Math.sin(t * 0.8) * 2);
  drawPersonSilhouette(c, 344, 232, 68, '#05070d', 5);

  // Etiquetas y cartuchos que pierden su identidad
  for (let i = 0; i < 5; i++) {
    const x = 390 + i * 14;
    const y = 210 - i * 4;
    const blank = smoothstep(104 + i * 0.7, 107 + i * 0.7, t);
    c.fillStyle = '#0b1220';
    c.fillRect(x, y, 10, 14);
    c.fillStyle = blank > 0.5 ? '#64748b' : ['#f472b6', '#fbbf24', '#38bdf8', '#a3e635', '#c084fc'][i];
    c.fillRect(x + 1, y + 1, 8, 5);
    c.fillStyle = '#1e293b';
    c.fillRect(x + 2, y + 8, 6, 5);
  }

  drawMotes(c, t, 60, 80, 360, 130, 18, '#94a3b8', 0.16, 5);
  veil(c, smoothstep(108.4, 111.6, t) * 0.4);
}

function renderForgettingRoom(c: CanvasRenderingContext2D, t: number): void {
  const k = smoothstep(112, 126, t);
  const cam = makeCam(lerp(250, 268, k), lerp(130, 124, k), lerp(1.08, 1.18, k));
  if (!drawBackdrop(c, 'bedroom', cam, 1)) drawFallback(c, 'bedroom');
  veil(c, 0.5);
  const p = makeProjector('bedroom', cam);

  // El joven frente a sus objetos, sin poder recordar por qué importan
  c.save();
  c.globalAlpha = 0.95;
  drawHero(c, 322, 210, 2.6, t, { backView: true, shadow: true, auraStrength: 0 });
  c.restore();

  // Cartucho sin etiqueta en la mano
  c.save();
  c.translate(356, 180);
  c.rotate(-0.24 + Math.sin(t * 0.9) * 0.03);
  c.fillStyle = '#1e293b';
  c.fillRect(-6, -8, 12, 16);
  c.fillStyle = '#64748b';
  c.fillRect(-4, -6, 8, 6);
  c.fillStyle = '#0f172a';
  c.fillRect(-4, 2, 8, 5);
  c.restore();
  drawGlow(c, 356, 180, 10, '#38bdf8', 0.07);

  // Recuerdos que aparecen y se disuelven sobre la pantalla del televisor
  if (p) {
    const screen = p(1078, 452);
    for (let i = 0; i < 4; i++) {
      const life = ((t - 113.2 - i * 1.9) % 7.6) / 7.6;
      if (life <= 0 || life >= 1) continue;
      const x = screen.x - 26 + i * 15;
      const y = screen.y - 8 - i * 4;
      c.save();
      c.globalAlpha = Math.sin(life * Math.PI) * 0.3;
      c.fillStyle = i % 2 === 0 ? '#fbbf24' : '#38bdf8';
      c.fillRect(Math.round(x), Math.round(y), 13, 9);
      c.fillStyle = '#f8fafc';
      c.fillRect(Math.round(x + 2), Math.round(y + 2), 9, 1);
      c.fillRect(Math.round(x + 2), Math.round(y + 5), 6, 1);
      c.restore();
      drawGlow(c, x + 6, y + 4, 7, i % 2 === 0 ? '#fbbf24' : '#38bdf8', Math.sin(life * Math.PI) * 0.12);
    }
  }

  // La onda atraviesa la habitación
  const wave = smoothstep(118.5, 124.4, t);
  if (wave > 0.01) {
    const y = lerp(270, -20, wave);
    c.save();
    c.globalAlpha = 0.5;
    const grad = c.createLinearGradient(0, y - 26, 0, y + 12);
    grad.addColorStop(0, 'rgba(2,6,23,0)');
    grad.addColorStop(0.6, 'rgba(168,85,247,0.35)');
    grad.addColorStop(0.7, 'rgba(2,6,23,0.9)');
    grad.addColorStop(1, 'rgba(2,6,23,0)');
    c.fillStyle = grad;
    c.fillRect(0, y - 26, FB_W, 38);
    for (let i = 0; i < 30; i++) {
      c.fillStyle = i % 2 === 0 ? '#f0abfc' : '#e2e8f0';
      c.fillRect(Math.round(hash(i * 3.1) * FB_W), Math.round(y - 20 + hash(i * 7.7) * 28), 1, 1);
    }
    c.restore();
  }

  drawMotes(c, t, 80, 70, 320, 140, 16, '#cbd5e1', 0.12, 4);
  veil(c, smoothstep(124.4, 126, t) * 0.9);
}

function renderScene4(c: CanvasRenderingContext2D, t: number): void {
  if (t < 111.4) {
    renderForgettingArcade(c, t);
    return;
  }
  if (t < 112.4) {
    renderForgettingArcade(c, t);
    veil(c, smoothstep(111.4, 112.4, t));
    return;
  }
  renderForgettingRoom(c, t);
}

/* -------------------------------------------------------------------------
   CAP. 5 · 02:06–02:32 — LA ISLA QUE NO FUE ALCANZADA
   ------------------------------------------------------------------------- */

function renderScene5(c: CanvasRenderingContext2D, t: number): void {
  const descend = smoothstep(126, 137, t);
  const rise = smoothstep(147, 152, t);
  const cam = makeCam(
    lerp(238, 252, descend * 0.35),
    lerp(54, 150, descend) - rise * 34,
    lerp(1.38, 1.04, descend) + rise * 0.02
  );
  if (!drawBackdrop(c, 'island', cam, 1)) drawFallback(c, 'island');

  // Vista del planeta cubierto por pulsos oscuros
  if (t < 133) {
    const a = 1 - smoothstep(131.4, 133, t);
    c.save();
    c.globalAlpha = a * 0.7;
    c.fillStyle = 'rgba(2,6,23,0.72)';
    c.fillRect(0, 0, FB_W, FB_H);
    for (let i = 0; i < 8; i++) {
      c.strokeStyle = i % 2 === 0 ? 'rgba(168,85,247,0.35)' : 'rgba(244,63,94,0.28)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(
        240,
        136,
        70 + i * 22 + Math.sin(t * 0.2 + i) * 4,
        44 + i * 15,
        t * 0.03 + i * 0.22,
        0,
        Math.PI * 1.7
      );
      c.stroke();
    }
    c.restore();
  }

  const p = makeProjector('island', cam);

  // La onda del Reinicio Cero avanza sobre el agua y se disuelve antes de la orilla
  const advance = smoothstep(133.2, 139.6, t);
  const dissolve = smoothstep(138.6, 141.8, t);
  if (advance > 0.01 && dissolve < 0.98) {
    const waveX = lerp(FB_W + 40, 306, advance);
    c.save();
    for (let i = 0; i < 70; i++) {
      const wx = waveX + hash(i * 3.7) * 18 - 9;
      const wy = 184 + hash(i * 7.9) * 76;
      const energy = (1 - dissolve) * (0.35 + 0.5 * Math.abs(Math.sin(t * 4 + i)));
      c.globalAlpha = energy * 0.7;
      c.fillStyle = i % 5 === 0 ? '#f0abfc' : i % 3 === 0 ? '#e2e8f0' : '#1e1b4b';
      c.fillRect(Math.round(wx), Math.round(wy), 1 + (i % 2), 1);
    }
    c.globalAlpha = (1 - dissolve) * 0.3;
    c.fillStyle = '#a855f7';
    c.fillRect(Math.round(waveX) - 1, 182, 2, 82);
    c.restore();
    drawGlow(c, waveX, 222, 26, '#a855f7', (1 - dissolve) * 0.1);
  }

  // Los píxeles se separan y la energía se desvanece sobre el agua
  if (dissolve > 0.01) {
    for (let i = 0; i < 34; i++) {
      const u = clamp01(dissolve - hash(i * 5.1) * 0.35);
      if (u <= 0.01) continue;
      const x = 306 - u * (70 + hash(i * 3.3) * 90);
      const y = 188 + hash(i * 9.1) * 68 - u * 22;
      c.save();
      c.globalAlpha = (1 - u) * 0.7;
      c.fillStyle = i % 3 === 0 ? '#f0abfc' : i % 3 === 1 ? '#e2e8f0' : '#67e8f9';
      c.fillRect(Math.round(x), Math.round(y), 1, 1);
      c.restore();
    }
  }

  // Una ola llega a la orilla; la costa permanece intacta
  const surf = smoothstep(139.5, 146.5, t);
  if (surf > 0.01) {
    const foam = 232 + Math.sin(t * 1.6) * 4;
    c.save();
    c.globalAlpha = 0.5 * surf;
    c.fillStyle = '#e0f2fe';
    for (let i = 0; i < 26; i++) {
      c.fillRect(
        Math.round(90 + i * 12 + Math.sin(t * 1.2 + i) * 3),
        Math.round(foam + Math.sin(i * 0.9 + t) * 2),
        3 + (i % 3),
        1
      );
    }
    c.restore();
  }

  // Vibración luminosa muy débil entre los reflejos del agua
  const glimmer = smoothstep(141, 147, t) * (1 - smoothstep(149.5, 152, t));
  if (glimmer > 0.01) {
    for (let i = 0; i < 10; i++) {
      const gx = 292 + Math.sin(t * 0.9 + i * 1.3) * 22;
      const gy = 210 + i * 5 + Math.cos(t * 1.4 + i) * 2;
      drawGlow(c, gx, gy, 3, i % 2 === 0 ? '#a5f3fc' : '#fef3c7', 0.18 * glimmer);
      c.fillStyle = `rgba(255,255,255,${0.35 * glimmer})`;
      c.fillRect(Math.round(gx), Math.round(gy), 1 + (i % 2), 1);
    }
  }

  drawMotes(c, t, 60, 60, 360, 150, 20, '#e0f2fe', 0.14, 5);

  // Oscurecimiento final hacia un único punto de luz
  const dark = smoothstep(148.6, 151.9, t);
  if (dark > 0.01) {
    const radius = lerp(220, 2, dark);
    const g = c.createRadialGradient(240, 134, Math.max(1, radius * 0.18), 240, 134, Math.max(2, radius));
    g.addColorStop(0, 'rgba(1,2,7,0)');
    g.addColorStop(0.62, `rgba(1,2,7,${dark * 0.85})`);
    g.addColorStop(1, `rgba(1,2,7,${dark})`);
    c.fillStyle = g;
    c.fillRect(0, 0, FB_W, FB_H);
    drawGlow(c, 240, 134, 4 + 6 * (1 - dark), '#e0f2fe', 0.3 + 0.4 * dark);
    c.fillStyle = '#ffffff';
    c.fillRect(240, 134, 1, 1);
  }
}

/* -------------------------------------------------------------------------
   CAP. 6 · 02:32–03:00 — DESPUÉS DEL SILENCIO
   ------------------------------------------------------------------------- */

function renderScene6(c: CanvasRenderingContext2D, t: number): void {
  c.fillStyle = '#010206';
  c.fillRect(0, 0, FB_W, FB_H);

  // Señal tenue entre interferencias
  const alive = smoothstep(152.2, 154, t);
  if (alive > 0.01) {
    c.save();
    c.globalAlpha = alive * 0.2;
    c.fillStyle = '#67e8f9';
    for (let i = 0; i < 20; i++) {
      c.fillRect(
        Math.round(hash(i * 3.3 + Math.floor(t * 8) * 0.7) * FB_W),
        Math.round(hash(i * 7.7 + Math.floor(t * 8) * 0.4) * FB_H),
        1,
        1
      );
    }
    c.restore();
  }

  const px = 240;
  const py = 134;

  // Un píxel blanco aparece, tiembla y se multiplica
  const appear = smoothstep(152.6, 153.9, t);
  if (appear > 0.01) {
    const tremble = Math.round(Math.sin(t * 27) * 0.7);
    drawGlow(c, px + tremble, py, 3 + 4 * appear, '#f8fafc', 0.3 * appear);
    c.fillStyle = `rgba(255,255,255,${appear})`;
    c.fillRect(px + tremble, py, 1, 1);
  }

  for (let i = 0; i < 34; i++) {
    const born = 153.8 + i * 0.11;
    if (t < born) continue;
    const a = hash(i * 5.3) * Math.PI * 2;
    const r = 6 + hash(i * 3.1) * 24;
    const drift = (t - born) * 3;
    const x = px + Math.cos(a) * (r + drift) + Math.sin(t * 1.3 + i) * 2;
    const y = py + Math.sin(a) * (r + drift) * 0.9;
    if (y > 226) continue;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.2 + i));
    c.fillStyle = `rgba(255,255,255,${tw * 0.75})`;
    c.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  // La silueta se construye de arriba hacia abajo
  const build = smoothstep(157.4, 166.4, t);
  const colored = smoothstep(163.2, 168.2, t);
  const step = smoothstep(167.2, 168.6, t);
  const feetX = lerp(240, 249, step);
  const feetY = 226;
  if (build > 0.01) {
    c.save();
    c.beginPath();
    c.rect(0, 150, FB_W, Math.max(1, 78 * build));
    c.clip();

    if (colored < 0.99) {
      c.save();
      c.globalAlpha = 1 - colored;
      c.filter = 'brightness(0)';
      drawHero(c, feetX, feetY, 3.1, t, { auraStrength: 0, shadow: false });
      c.filter = 'none';
      c.restore();
    }
    if (colored > 0.01) {
      c.save();
      c.globalAlpha = colored;
      drawHero(c, feetX, feetY, 3.1, t, {
        auraStrength: 0.2 + 0.22 * smoothstep(166, 172, t),
        shadow: false,
      });
      c.restore();
    }
    c.restore();

    drawMotes(c, t, 120, 130, 240, 100, 18, '#e0f2fe', 0.28, 7);
  }

  // El primer paso produce una onda luminosa
  if (step > 0.01) {
    const age = clamp01((t - 167.2) / 2.2);
    drawRing(c, feetX, feetY + 1, 3 + age * 30, '#a5f3fc', 0.4 * (1 - age));
    drawRing(c, feetX, feetY + 1, 2 + age * 18, '#fde68a', 0.28 * (1 - age));
    if (age < 0.35) drawGlow(c, feetX, feetY, 12, '#e0f2fe', (1 - age / 0.35) * 0.2);
  }

  // Chispa sobre la mano que se convierte en un píxel blanco
  const spark = smoothstep(169.4, 171.2, t);
  if (spark > 0.01 && t < 176.6) {
    const sx = feetX + 16;
    const sy = feetY - 34 - (t - 169.4) * 7;
    drawGlow(c, sx, sy, 6 + 4 * Math.sin(t * 4), '#fef3c7', 0.22 * spark);
    c.fillStyle = `rgba(255,255,255,${spark})`;
    c.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    for (let i = 0; i < 4; i++) {
      const a = t * 1.4 + (i / 4) * Math.PI * 2;
      c.fillStyle = `rgba(253,230,138,${spark * 0.55})`;
      c.fillRect(Math.round(sx + Math.cos(a) * 9), Math.round(sy + Math.sin(a) * 9), 1, 1);
    }
  }

  drawGlow(c, 240, 200, 70, '#22d3ee', smoothstep(165, 174, t) * 0.05);

  // El título aparece dentro de la escena; la capa React lo corona
  const titleMotes = smoothstep(172.4, 176.4, t) * (1 - smoothstep(176.8, 179.2, t));
  if (titleMotes > 0.01) {
    for (let i = 0; i < 24; i++) {
      const a = hash(i * 3.9) * Math.PI * 2;
      const r = 24 + hash(i * 7.1) * 120;
      const x = 240 + Math.cos(a) * r;
      const y = 132 + Math.sin(a) * r * 0.5;
      c.fillStyle = `rgba(224,242,254,${titleMotes * 0.4})`;
      c.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  if (t > 177.2) {
    veil(c, smoothstep(177.2, 179.4, t));
  }
}

/* -------------------------------------------------------------------------
   CAP. 7 · 03:00–03:14 — UNA PELOTA EN LA OSCURIDAD
   ------------------------------------------------------------------------- */

const PONG_BOUNCES = [179.9, 181.7, 183.5, 185.3, 187.1, 188.9, 190.7, 192.5, 194.3];

function ballXAt(t: number): number {
  const start = PONG_BOUNCES[0];
  const period = 3.6;
  const phase = (((t - start) / period) % 2 + 2) % 2;
  const tri = phase < 1 ? phase : 2 - phase;
  return 56 + tri * 360;
}

function ballYAt(t: number): number {
  return 138 + Math.sin((t - 179.9) * 1.05) * 40;
}

function drawPongCourt(
  c: CanvasRenderingContext2D,
  t: number,
  opts: { reveal: number; rightBarMiss?: boolean }
): number {
  const reveal = opts.reveal;
  if (reveal <= 0.01) return 0;

  c.save();
  c.globalAlpha = reveal;
  // Suelo de la cancha
  c.strokeStyle = 'rgba(148,163,184,0.16)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, 196);
  c.lineTo(FB_W, 196);
  c.stroke();

  // Límite invisible
  c.strokeStyle = 'rgba(148,163,184,0.2)';
  c.setLineDash([3, 5]);
  c.beginPath();
  c.moveTo(56, 96);
  c.lineTo(56, 196);
  c.stroke();
  c.beginPath();
  c.moveTo(424, 96);
  c.lineTo(424, 196);
  c.stroke();
  c.setLineDash([]);

  // Línea central de la cancha
  c.strokeStyle = 'rgba(148,163,184,0.14)';
  c.beginPath();
  c.moveTo(240, 96);
  c.lineTo(240, 196);
  c.stroke();

  const bx = ballXAt(t);
  let by = ballYAt(t);
  const impact = smoothstep(186.4, 187.05, t) * (1 - smoothstep(187.05, 187.4, t));
  by = lerp(by, 172, impact);
  const squashOut = t > 187.0 && t < 189.4;

  // Paleta derecha que sigue la pelota
  const rightY = opts.rightBarMiss ? 96 + Math.sin(t * 0.7) * 20 : by;
  c.fillStyle = '#f8fafc';
  c.fillRect(421, Math.round(rightY - 15), 3, 30);

  // Paleta izquierda del jugador
  const leftY = 138 + Math.sin(t * 0.9) * 24;
  c.fillRect(54, Math.round(leftY - 15), 3, 30);

  // Estela de la pelota
  for (let i = 1; i <= 4; i++) {
    const tx = ballXAt(t - i * 0.045);
    const ty = ballYAt(t - i * 0.045);
    c.globalAlpha = reveal * (0.28 - i * 0.055);
    c.fillStyle = '#e2e8f0';
    c.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3);
  }
  c.globalAlpha = reveal;

  if (!squashOut) {
    drawGlow(c, bx, by, 12, '#e0f2fe', 0.3);
    c.fillStyle = '#ffffff';
    c.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3);
  }

  c.restore();
  return bx;
}

function renderScene7(c: CanvasRenderingContext2D, t: number): void {
  c.fillStyle = '#010206';
  c.fillRect(0, 0, FB_W, FB_H);

  const reveal = smoothstep(179.6, 181.4, t);
  const bx = drawPongCourt(c, t, { reveal });

  // El protagonista observa la pelota
  const heroX = 138 + Math.sin(t * 0.8) * 2;
  const heroY = 214;
  const squash = t >= 187.0 && t < 189.4;
  const recover = smoothstep(188.6, 189.6, t);
  const dodge = smoothstep(192.0, 192.6, t) * (1 - smoothstep(193.3, 194, t));
  const jump = Math.sin(dodge * Math.PI) * 10;

  c.save();
  if (squash) {
    const flat = 1 - recover * 0.85;
    c.translate(heroX, heroY);
    c.scale(1.18, flat);
    drawHero(c, 0, 0, 3.1, t, { auraStrength: 0.18, shadow: false });
    c.restore();
    if (recover < 0.85) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 3;
        c.fillStyle = '#fde68a';
        c.fillRect(
          Math.round(heroX + Math.cos(a) * 20),
          Math.round(heroY - 6 + Math.sin(a) * 5),
          2,
          1
        );
      }
      drawRing(c, heroX, heroY + 1, 8 + (1 - recover) * 18, '#e2e8f0', (1 - recover) * 0.3);
    }
  } else {
    drawHero(c, heroX - dodge * 46, heroY - jump, 3.1, t, {
      auraStrength: 0.2,
      shadow: true,
    });
    if (dodge > 0.1) {
      drawGlow(c, heroX - 20, heroY - 8, 14, '#a5f3fc', dodge * 0.1);
    }
  }
  c.restore();

  // La cámara se aleja y revela el desafío
  const pull = smoothstep(193.2, 194, t);
  if (pull > 0.01) {
    c.save();
    c.globalAlpha = pull * 0.24;
    c.fillStyle = '#22d3ee';
    for (let i = 0; i < 20; i++) {
      c.fillRect(
        Math.round(240 + Math.cos(hash(i * 3.1) * Math.PI * 2) * (60 + hash(i * 7.7) * 160)),
        Math.round(140 + Math.sin(hash(i * 5.3) * Math.PI * 2) * 60),
        1,
        1
      );
    }
    c.restore();
    veil(c, smoothstep(193.6, 194, t) * 0.4);
  }

  // BIP visual: ondas en cada rebote
  for (const bounce of PONG_BOUNCES) {
    const age = t - bounce;
    if (age < 0 || age > 0.6) continue;
    drawRing(c, ballXAt(bounce), ballYAt(bounce), 3 + age * 18, '#e0f2fe', 0.28 * (1 - age / 0.6));
  }
}

/* -------------------------------------------------------------------------
   CAP. 8 · 03:14–03:23 — EL PRIMER DESAFÍO
   ------------------------------------------------------------------------- */

function drawSurfBoard(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  t: number,
  alpha: number
): void {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.rotate(Math.sin(t * 1.6) * 0.03);
  c.fillStyle = '#e2e8f0';
  c.beginPath();
  c.ellipse(0, 0, w / 2, 4, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#94a3b8';
  c.fillRect(-w / 2 + 3, 2, w - 6, 1);
  c.fillStyle = '#f8fafc';
  c.fillRect(-w / 2 + 4, -2, w - 8, 1);
  c.fillStyle = '#38bdf8';
  c.beginPath();
  c.moveTo(0, 3);
  c.lineTo(2, 11);
  c.lineTo(-3, 6);
  c.closePath();
  c.fill();
  c.restore();
}

function renderScene8(c: CanvasRenderingContext2D, t: number): void {
  c.fillStyle = '#010206';
  c.fillRect(0, 0, FB_W, FB_H);

  const won = t >= 197.6;
  const win = smoothstep(197.6, 198.4, t);
  const bx = drawPongCourt(c, t, { reveal: 1, rightBarMiss: won });

  // El jugador está detrás de su paleta
  const heroX = 42 + win * 196;
  const heroY = 214 - win * 4;
  drawHero(c, heroX, heroY, 3.0, t, { auraStrength: 0.24 + win * 0.2, shadow: !won });

  // La barra se extiende y se transforma en tabla improvisada
  const morph = smoothstep(198.2, 200.6, t);
  if (morph > 0.01) {
    const boardW = lerp(6, 46, morph);
    const boardX = lerp(56, 240, smoothstep(198.9, 200.8, t));
    const boardY = lerp(138, 206, smoothstep(198.9, 200.8, t));
    drawSurfBoard(c, boardX, boardY, boardW, t, morph);
    drawGlow(c, boardX, boardY, 18, '#38bdf8', morph * 0.12);
  }

  // El agua aparece bajo la tabla
  const water = smoothstep(199.4, 202.2, t);
  if (water > 0.01) {
    const grad = c.createLinearGradient(0, 212, 0, FB_H);
    grad.addColorStop(0, 'rgba(8,47,73,0)');
    grad.addColorStop(0.4, `rgba(8,64,92,${0.5 * water})`);
    grad.addColorStop(1, `rgba(2,17,30,${0.92 * water})`);
    c.fillStyle = grad;
    c.fillRect(0, 212, FB_W, FB_H - 212);

    for (let i = 0; i < 18; i++) {
      const y = 220 + i * 3;
      const d = Math.sin(t * 1.2 + i * 0.6) * 10;
      c.save();
      c.globalAlpha = water * (0.1 + (i % 3) * 0.04);
      c.fillStyle = i % 4 === 0 ? '#67e8f9' : '#bae6fd';
      c.fillRect(Math.round(120 + d + i * 8), y, 26 + (i % 3) * 12, 1);
      c.restore();
    }

    // Reflejo de la tabla
    if (morph > 0.01) {
      drawReflectionStreak(c, 240, 214, 40, 30, '#e2e8f0', water * 0.16);
    }
  }

  // El personaje se sube a la tabla
  const mount = smoothstep(201.4, 202.4, t);
  if (mount > 0.01) {
    drawGlow(c, 240, 208, 20, '#67e8f9', mount * 0.12);
    for (let i = 0; i < 10; i++) {
      const age = (t * 1.6 + i * 0.17) % 1;
      c.fillStyle = `rgba(224,242,254,${(1 - age) * 0.5 * mount})`;
      c.fillRect(
        Math.round(240 + (hash(i * 3.1) - 0.5) * 60),
        Math.round(212 + age * 22),
        1,
        1
      );
    }
  }

  if (t > 197.7) {
    drawGlow(c, 240, 140, 40 + win * 20, '#fde68a', win * 0.09);
  }

  if (t > 202.3) {
    veil(c, smoothstep(202.3, 203, t) * 0.55);
  }
}

/* -------------------------------------------------------------------------
   CAP. 9 · 03:23–03:30 — COMIENZA LA AVENTURA
   ------------------------------------------------------------------------- */

function renderScene9(c: CanvasRenderingContext2D, t: number): void {
  const rise = smoothstep(203, 209.4, t);
  const cam = makeCam(lerp(240, 256, rise), lerp(150, 112, rise), lerp(1.16, 1.02, rise));
  if (!drawBackdrop(c, 'island', cam, 1)) drawFallback(c, 'island');

  // Bruma sobre la costa
  const mist = 0.1 + 0.06 * Math.sin(t * 0.7);
  c.save();
  const grad = c.createLinearGradient(0, 70, 0, 210);
  grad.addColorStop(0, `rgba(214,235,255,${mist * 0.4})`);
  grad.addColorStop(0.5, `rgba(214,235,255,${mist})`);
  grad.addColorStop(1, 'rgba(214,235,255,0)');
  c.fillStyle = grad;
  c.fillRect(0, 70, FB_W, 140);
  c.restore();

  // El protagonista y la barra avanzan hacia la siguiente etapa
  const heroX = lerp(176, 236, rise);
  const bob = Math.sin(t * 2.4) * 1.2;
  const heroY = 224 + bob;
  drawHero(c, heroX, heroY, 2.6 - rise * 0.4, t, {
    backView: true,
    auraStrength: 0.3,
    shadow: false,
  });
  drawSurfBoard(c, heroX, heroY + 2, 54 - rise * 8, t, 0.95);

  // Estela sobre el agua
  for (let i = 0; i < 16; i++) {
    const age = (t * 0.9 + i * 0.13) % 1;
    c.save();
    c.globalAlpha = (1 - age) * 0.32;
    c.fillStyle = i % 3 === 0 ? '#a5f3fc' : '#e0f2fe';
    c.fillRect(
      Math.round(heroX - 26 - age * 70 + Math.sin(i + t) * 4),
      Math.round(heroY + 8 + (i % 4) * 2),
      2 + (i % 3),
      1
    );
    c.restore();
  }
  drawReflectionStreak(c, heroX, heroY + 12, 34, 16, '#67e8f9', 0.08);

  // Un pequeño píxel blanco aparece en el cielo, parpadea y desaparece
  const skyPixel = smoothstep(207.1, 207.5, t) * (1 - smoothstep(208.0, 208.5, t));
  if (skyPixel > 0.01) {
    drawGlow(c, 356, 54, 10, '#f8fafc', skyPixel * 0.24);
    c.fillStyle = `rgba(255,255,255,${skyPixel})`;
    c.fillRect(356, 54, 1, 1);
  }

  drawMotes(c, t, 50, 60, 380, 150, 20, '#e0f2fe', 0.14, 6);

  // Fundido suave hacia la aventura jugable
  if (t > 208.7) {
    veil(c, smoothstep(208.7, 209.8, t) * 0.9);
  }
}
/* =========================================================================
   FÁBRICA / POST-PROCESO
   ========================================================================= */

const PRELOAD_SCHEDULE: { at: number; key: BackdropKey }[] = [
  { at: 0, key: 'bedroom' },
  { at: 0.4, key: 'arcade' },
  { at: 28, key: 'hall' },
  { at: 92, key: 'city' },
  { at: 108, key: 'bedroom' },
  { at: 120, key: 'island' },
  { at: 148, key: 'hall' },
];

export function createCinematicWorld64Bit(mountEl: HTMLElement): CinematicWorldController {
  const displayCanvas = document.createElement('canvas');
  displayCanvas.style.width = '100%';
  displayCanvas.style.height = '100%';
  displayCanvas.style.display = 'block';
  displayCanvas.style.imageRendering = 'pixelated';
  mountEl.innerHTML = '';
  mountEl.appendChild(displayCanvas);

  const fbCanvas = document.createElement('canvas');
  fbCanvas.width = FB_W;
  fbCanvas.height = FB_H;

  const dispCtx = displayCanvas.getContext('2d');
  const ctx = fbCanvas.getContext('2d');

  let viewW = mountEl.clientWidth || window.innerWidth;
  let viewH = mountEl.clientHeight || window.innerHeight;

  const resize = (w: number, h: number) => {
    viewW = Math.max(1, w);
    viewH = Math.max(1, h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    displayCanvas.width = Math.floor(viewW * dpr);
    displayCanvas.height = Math.floor(viewH * dpr);
    if (dispCtx) dispCtx.imageSmoothingEnabled = false;
  };
  resize(viewW, viewH);

  // ---- Post-proceso cacheado ----
  const vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = FB_W;
  vignetteCanvas.height = FB_H;
  const vignetteCtx = vignetteCanvas.getContext('2d');
  if (vignetteCtx) {
    const g = vignetteCtx.createRadialGradient(
      FB_W / 2,
      FB_H / 2,
      Math.min(FB_W, FB_H) * 0.32,
      FB_W / 2,
      FB_H / 2,
      Math.max(FB_W, FB_H) * 0.68
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.72, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    vignetteCtx.fillStyle = g;
    vignetteCtx.fillRect(0, 0, FB_W, FB_H);
  }

  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = 1;
  scanCanvas.height = 4;
  const scanCtx = scanCanvas.getContext('2d');
  if (scanCtx) {
    scanCtx.fillStyle = 'rgba(0,0,0,0.34)';
    scanCtx.fillRect(0, 0, 1, 1);
    scanCtx.fillStyle = 'rgba(0,0,0,0.08)';
    scanCtx.fillRect(0, 2, 1, 1);
  }
  const scanPattern = ctx ? ctx.createPattern(scanCanvas, 'repeat') : null;

  const grainCanvases: HTMLCanvasElement[] = [];
  for (let g = 0; g < 3; g++) {
    const gc = document.createElement('canvas');
    gc.width = 160;
    gc.height = 90;
    const gg = gc.getContext('2d');
    if (!gg) continue;
    const imgData = gg.createImageData(160, 90);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = hash(i * 0.37 + g * 91.7) > 0.5 ? 255 : 0;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = Math.floor(hash(i * 1.13 + g * 17.3) * 90);
    }
    gg.putImageData(imgData, 0, 0);
    grainCanvases.push(gc);
  }

  const applyPost = (c: CanvasRenderingContext2D, t: number) => {
    if (vignetteCtx) c.drawImage(vignetteCanvas, 0, 0);
    if (scanPattern) {
      c.save();
      c.globalAlpha = 0.6;
      c.fillStyle = scanPattern;
      c.fillRect(0, 0, FB_W, FB_H);
      c.restore();
    }
    if (grainCanvases.length > 0) {
      const grain = grainCanvases[Math.floor(t * 9) % grainCanvases.length];
      c.save();
      c.globalAlpha = 0.05;
      c.imageSmoothingEnabled = false;
      c.drawImage(
        grain,
        (Math.floor(t * 13) % 5) - 2,
        (Math.floor(t * 17) % 5) - 2,
        FB_W + 4,
        FB_H + 4
      );
      c.restore();
    }
  };

  const primeBackdrops = (t: number) => {
    for (const item of PRELOAD_SCHEDULE) {
      if (t >= item.at) ensureBackdrop(item.key);
    }
  };

  ensureBackdrop('bedroom');
  ensureBackdrop('arcade');

  const renderAtTime = (tSec: number) => {
    if (!ctx || !dispCtx) return;
    const t = Math.max(0, tSec);
    primeBackdrops(t);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;

    if (t < 32) renderScene1(ctx, t);
    else if (t < 72) renderScene2(ctx, t);
    else if (t < 96) renderScene3(ctx, t);
    else if (t < 126) renderScene4(ctx, t);
    else if (t < 152) renderScene5(ctx, t);
    else if (t < 180) renderScene6(ctx, t);
    else if (t < 194) renderScene7(ctx, t);
    else if (t < 203) renderScene8(ctx, t);
    else renderScene9(ctx, t);

    applyPost(ctx, t);

    const cut = cutEffects(t);
    if (cut.dip > 0.01) {
      ctx.fillStyle = `rgba(1,2,7,${cut.dip * 0.62})`;
      ctx.fillRect(0, 0, FB_W, FB_H);
    }
    if (cut.flash > 0.01) {
      ctx.fillStyle = `rgba(226,248,255,${cut.flash * 0.52})`;
      ctx.fillRect(0, 0, FB_W, FB_H);
    }

    const dw = displayCanvas.width;
    const dh = displayCanvas.height;
    dispCtx.imageSmoothingEnabled = false;
    dispCtx.fillStyle = '#010206';
    dispCtx.fillRect(0, 0, dw, dh);

    const scale = Math.max(dw / FB_W, dh / FB_H);
    const drawW = Math.round(FB_W * scale);
    const drawH = Math.round(FB_H * scale);
    const ox = Math.round((dw - drawW) / 2);
    const oy = Math.round((dh - drawH) / 2);
    dispCtx.drawImage(fbCanvas, ox, oy, drawW, drawH);
  };

  const dispose = () => {
    if (displayCanvas.parentNode === mountEl) {
      mountEl.removeChild(displayCanvas);
    }
  };

  return { resize, renderAtTime, dispose };
}
