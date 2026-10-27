/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MOTOR DE RENDERIZADO PIXEL-ART ESTILO GAME BOY COLOR (CUADRÍCULA LÓGICA 16×16 ESCALADA 2×)
 * ISLA 01 — ISLA DEL ORIGEN:
 *   - Zona 1: El Pueblo del Origen (casas GBC, empedrado, vallas, Terminal de Guardado, carteles)
 *   - Zona 2: Las Praderas del Pixel (hierba verde, flores animadas, arroyo con puente, Pong)
 *   - Zona 3: El Bosque de los Secretos (árboles GBC densos, pasadizo oculto entre copas, Taller)
 *   - Zona 4: La Fortaleza Volcánica (roca basáltica, lava pixel-art animada, murallas, Space Invaders)
 *   - Zona 5: La Costa y las Ruinas del Tiempo (arena, muelle, túneles en rocas, Secreto del Origen)
 */

import { PixelverseProgressState } from '../memories/progressionState';
import type { AvatarAppearance } from '../avatar/avatarOptions';
import {
  AnomalyPortalSpec,
  BROKEN_RELAY_MECHANISM,
  COASTAL_SUBTERRANEAN_TUNNELS,
  evaluateTimeMachineStatus,
  ExteriorBuildingSpec,
  FacingDirection,
  GUARDIAN_CREATURES,
  GuardianCreatureSpec,
  HARBOR_80S_FERRY,
  ISLAND_70S_BUILDINGS,
  ISLAND_ANOMALY_PORTALS,
  ISLAND_NORTH_CAVE_ENTRANCES,
  IslandCaveEntranceSpec,
  ISLAND_WOODEN_SIGNS,
  LABYRINTH_1976_ENTRANCE,
  RPG_CHESTS,
  RPG_EXAMINABLES,
  VILLAGE_SAVE_TERMINAL,
  WATERFALL_SECRET_ENTRANCE,
} from '../rpg/rpgContent';
import {
  DISTANT_DECADE_VISTAS,
  ISLAND_DIAMONDS,
  ISLAND_ECHOES,
  ISLAND_KEY_COORDS,
  ISLAND_ROUTE_RAILS,
  NORTH_ARCADE_LAYOUT,
  VOLCANIC_ARCADE_LAYOUT,
  VOLCANIC_GUARD_ID,
  ISLAND_NPCS,
  IslandNpcSpec,
  ISLAND_SWITCHES,
  ISLAND_WALKABLE_RECTS,
  ISLAND_WORLD_H,
  ISLAND_WORLD_W,
  ISLAND_ZONES,
  IslandZoneId,
  WalkableRect,
  ISLAND_PIER_SPEC,
  ISLAND_SAND_MOUNDS,
  LAVA_STRAIGHT_BRIDGE_SPEC,
} from './island70sData';

export interface IslandStar {
  nx: number;
  ny: number;
  size: number;
  twinkle: number;
  parallax: number;
}

export interface IslandAmbientBit {
  x: number;
  y: number;
  vy: number;
  phase: number;
  color: string;
}

export interface IslandDigitalCritter {
  homeX: number;
  homeY: number;
  phase: number;
  color: string;
}

export interface IslandPickupBurst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface IslandPromptRenderSpec {
  x: number;
  y: number;
  actionLabel: string;
  accentHex: string;
}

/** Celda base de mundo 32×32 px con detalle artesanal de píxel nítido */
const CELL = 32;
const PX = 2;

interface HandcraftedTreeSpec {
  x: number;
  y: number;
  variant: 'forest' | 'meadow' | 'pine';
}

const ISLAND_TREES: HandcraftedTreeSpec[] = [
  // La Aldea de los Orígenes — arboleda variada y línea que disimula el callejón secreto norte
  { x: 260, y: 1740, variant: 'meadow' },
  { x: 304, y: 1968, variant: 'pine' },
  { x: 520, y: 1612, variant: 'meadow' },
  { x: 734, y: 1612, variant: 'meadow' },
  { x: 516, y: 1554, variant: 'forest' },
  { x: 742, y: 1554, variant: 'forest' },
  { x: 856, y: 1765, variant: 'pine' },
  { x: 1028, y: 1812, variant: 'meadow' },
  { x: 368, y: 1620, variant: 'meadow' },
  { x: 440, y: 1604, variant: 'pine' },
  { x: 880, y: 1640, variant: 'meadow' },
  { x: 1060, y: 1930, variant: 'pine' },
  { x: 230, y: 1880, variant: 'meadow' },

  // El Bosque de las Señales Perdidas — dosel frondoso con paso secreto entre x=608 y x=692
  { x: 576, y: 1004, variant: 'forest' },
  { x: 608, y: 1004, variant: 'pine' },
  // Hueco secreto entre x=608 y x=692 hacia el Claro Oculto (MANTENIDO DESPEJADO)
  { x: 692, y: 1004, variant: 'pine' },
  { x: 728, y: 1004, variant: 'forest' },
  { x: 556, y: 928, variant: 'forest' },
  { x: 556, y: 868, variant: 'pine' },
  { x: 756, y: 882, variant: 'forest' },
  { x: 640, y: 1120, variant: 'forest' },
  { x: 760, y: 1156, variant: 'pine' },
  { x: 896, y: 1084, variant: 'forest' },
  { x: 1140, y: 1068, variant: 'pine' },
  { x: 1280, y: 1052, variant: 'forest' },
  { x: 620, y: 1360, variant: 'pine' },
  { x: 1036, y: 1412, variant: 'forest' },
  { x: 1188, y: 1336, variant: 'pine' },
  { x: 816, y: 1468, variant: 'forest' },
  // Arboleda densa perimetral de GBA para el Bosque de las Señales
  { x: 500, y: 1080, variant: 'forest' },
  { x: 504, y: 1240, variant: 'pine' },
  { x: 520, y: 1420, variant: 'forest' },
  { x: 704, y: 1260, variant: 'forest' },
  { x: 830, y: 1220, variant: 'pine' },
  { x: 960, y: 1180, variant: 'forest' },
  { x: 1080, y: 1280, variant: 'pine' },
  { x: 1240, y: 1200, variant: 'forest' },
  { x: 1340, y: 1100, variant: 'pine' },
  { x: 1310, y: 1360, variant: 'forest' },
  { x: 920, y: 1490, variant: 'pine' },
  { x: 1090, y: 1510, variant: 'forest' },

  // Las Ruinas del Primer Pulso
  { x: 1548, y: 1124, variant: 'pine' },
  { x: 2248, y: 1236, variant: 'meadow' },
  { x: 1556, y: 1540, variant: 'meadow' },
  { x: 1720, y: 1140, variant: 'pine' },
  { x: 2180, y: 1380, variant: 'meadow' },
  { x: 2320, y: 1280, variant: 'pine' },

  // Terrazas y Claro de Pong
  { x: 2452, y: 1476, variant: 'meadow' },
  { x: 2496, y: 1316, variant: 'pine' },
  { x: 2880, y: 1320, variant: 'meadow' },
  { x: 3052, y: 1492, variant: 'pine' },
  { x: 2468, y: 1856, variant: 'meadow' },
  { x: 2948, y: 1884, variant: 'pine' },
  { x: 2780, y: 1440, variant: 'meadow' },
  { x: 2820, y: 1750, variant: 'pine' },
  { x: 2580, y: 1820, variant: 'meadow' },
  { x: 3120, y: 1380, variant: 'pine' },
];

/** Farolas de fósforo ámbar y antenas eólicas de señal que dan identidad retrofuturista propia */
const PHOSPHOR_LAMPS: { x: number; y: number; color: string }[] = [
  { x: 468, y: 1796, color: '#fbbf24' },
  { x: 748, y: 1796, color: '#fbbf24' },
  { x: 888, y: 1852, color: '#00f3ff' },
  { x: 1624, y: 1268, color: '#fbbf24' },
  { x: 2042, y: 1218, color: '#00f3ff' },
  { x: 2668, y: 1564, color: '#fbbf24' },
  { x: 3212, y: 1244, color: '#38bdf8' },
];

const SIGNAL_WINDMILLS: { x: number; y: number }[] = [
  { x: 842, y: 1712 },
  { x: 1084, y: 1168 },
  { x: 2236, y: 1098 },
];

interface LavaPoolRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MOONSTONE_PATH_RECT = { x: 1360, y: 580, w: 200, h: 180 };

/** Fosos y canales magmáticos del Bastión de las Oleadas (fuera del paso caminable) */
const VOLCANIC_LAVA_POOLS: LavaPoolRect[] = [
  // Gran foso de lava horizontal (Bajo el puente colgante recto)
  { x: 2060, y: 600, w: 344, h: 140 },
  
  // Foso bajo el camino de piedras lunares
  { x: 1360, y: 580, w: 200, h: 180 },
  
  // Fosos decorativos adicionales
  { x: 2432, y: 960, w: 480, h: 64 },
  { x: 3216, y: 480, w: 96, h: 384 },
  { x: 2880, y: 352, w: 288, h: 64 },
  { x: 1424, y: 576, w: 20, h: 256 }, // Reducido para no solapar con el camino principal
];

export function isWorldBoxVisible(
  wx: number,
  wy: number,
  ww: number,
  wh: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  pad = 160
): boolean {
  return (
    wx + ww >= camX - pad &&
    wx <= camX + vw + pad &&
    wy + bhPad(wh) >= camY - pad &&
    wy <= camY + vh + pad
  );
}

function bhPad(wh: number): number {
  return wh;
}

function hashTile(tx: number, ty: number): number {
  const n = Math.imul(tx * 374761393 + ty * 668265263, 1274126177);
  return (n ^ (n >>> 13)) >>> 0;
}

/**
 * ÁRBOLES ARTESANALES DE CALIDAD GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO / VERDE HOJA)
 * - Perspectiva cenital ligeramente oblicua con copa esférica en múltiples lóbulos.
 * - 6 niveles tonales de sombreado escalonado (crevice, shadow, mid, sunlit, high, specular).
 * - Grupos de píxeles que representan racimos de hojas individuales, sin cajas planas.
 * - Tronco leñoso con aristas de corteza, nudos y raíces extendidas sobre el césped.
 * - Sombra de contacto suave y elíptica en el suelo orientada hacia el sur-este.
 */
export function drawHandcraftedTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  variant: 'forest' | 'meadow' | 'pine'
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);

  ctx.save();
  ctx.translate(x, y);

  // 1. Sombra elíptica escalonada en el suelo con desvanecimiento de borde
  ctx.fillStyle = 'rgba(5, 14, 10, 0.16)';
  ctx.fillRect(-25, 3, 47, 10);
  ctx.fillStyle = 'rgba(5, 14, 10, 0.30)';
  ctx.fillRect(-20, 5, 38, 8);
  ctx.fillStyle = 'rgba(5, 14, 10, 0.42)';
  ctx.fillRect(-15, 7, 28, 5);

  if (variant === 'pine') {
    // ----------------------------------------------------
    // PINO DE AGUJA ALPINO GBA: 4 niveles cónicos escalonados con franjas dentadas
    // ----------------------------------------------------
    const pOutline = '#051e1b';
    const pShadow = '#0a3a33';
    const pMid = '#13675a';
    const pSun = '#289d89';
    const pHigh = '#5eead4';
    const pGlint = '#ccfbf1';

    // Tronco de pino nudoso
    ctx.fillStyle = '#100703';
    ctx.fillRect(-6, -10, 12, 14);
    ctx.fillStyle = '#452613';
    ctx.fillRect(-4, -9, 8, 12);
    ctx.fillStyle = '#784320';
    ctx.fillRect(-2, -9, 3, 11);
    ctx.fillStyle = '#261208';
    ctx.fillRect(1, -8, 2, 10);
    // Raíces
    ctx.fillStyle = '#100703';
    ctx.fillRect(-8, 1, 3, 3);
    ctx.fillRect(5, 1, 3, 3);

    // Tier 1: Faldón inferior de agujas (y = -26 a -10)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-27, -26, 54, 18);
    ctx.fillRect(-25, -8, 12, 4);
    ctx.fillRect(-6, -8, 12, 4);
    ctx.fillRect(13, -8, 12, 4);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-25, -24, 50, 15);
    ctx.fillRect(-23, -6, 8, 2);
    ctx.fillRect(-4, -6, 8, 2);
    ctx.fillRect(15, -6, 8, 2);

    ctx.fillStyle = pMid;
    ctx.fillRect(-23, -25, 46, 12);
    ctx.fillStyle = pSun;
    ctx.fillRect(-21, -25, 20, 6);
    ctx.fillRect(-17, -19, 14, 4);
    ctx.fillRect(3, -24, 14, 5);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-19, -25, 10, 2);
    ctx.fillRect(-15, -19, 6, 2);
    ctx.fillRect(5, -24, 6, 2);

    // Tier 2: Faldón intermedio (y = -40 a -23)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-22, -40, 44, 17);
    ctx.fillRect(-20, -23, 10, 3);
    ctx.fillRect(-5, -23, 10, 3);
    ctx.fillRect(10, -23, 10, 3);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-20, -38, 40, 15);
    ctx.fillRect(-18, -21, 6, 2);
    ctx.fillRect(-3, -21, 6, 2);
    ctx.fillRect(12, -21, 6, 2);

    ctx.fillStyle = pMid;
    ctx.fillRect(-18, -39, 36, 11);
    ctx.fillStyle = pSun;
    ctx.fillRect(-17, -39, 16, 6);
    ctx.fillRect(-13, -33, 10, 4);
    ctx.fillRect(2, -38, 12, 4);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-15, -39, 8, 2);
    ctx.fillRect(-11, -33, 5, 2);
    ctx.fillRect(4, -38, 6, 2);

    // Tier 3: Faldón superior (y = -52 a -37)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-16, -52, 32, 15);
    ctx.fillRect(-14, -37, 8, 3);
    ctx.fillRect(6, -37, 8, 3);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-14, -50, 28, 13);
    ctx.fillStyle = pMid;
    ctx.fillRect(-12, -51, 24, 10);
    ctx.fillStyle = pSun;
    ctx.fillRect(-11, -51, 12, 5);
    ctx.fillRect(1, -50, 8, 4);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-9, -51, 7, 2);

    // Tier 4: Ápice / Espira cónica superior (y = -65 a -49)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-9, -65, 18, 16);
    ctx.fillRect(-4, -68, 8, 4);
    ctx.fillRect(-1, -71, 2, 4);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-7, -63, 14, 13);
    ctx.fillStyle = pMid;
    ctx.fillRect(-6, -64, 12, 10);
    ctx.fillStyle = pSun;
    ctx.fillRect(-5, -64, 7, 6);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-4, -66, 4, 3);
    ctx.fillStyle = pGlint;
    ctx.fillRect(-2, -67, 2, 2);

    // Piñas maduras y escamas de resina
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-12, -18, 3, 4);
    ctx.fillRect(11, -17, 3, 4);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-11, -17, 1, 2);
    ctx.fillRect(12, -16, 1, 2);
  } else {
    // ----------------------------------------------------
    // ROBLE DE BOSQUE / ÁRBOL DE PRADERA GBA:
    // Copa esférica con 5 lóbulos de follaje volumétrico,
    // reflejos superiores, sombras cavernosas e iluminación lateral
    // ----------------------------------------------------
    const isForest = variant === 'forest';

    // Paletas GBA ricas de 6 tonos escalonados
    const cOutline = isForest ? '#081a10' : '#102206';
    const cShadow = isForest ? '#113a21' : '#1f480d';
    const cMid = isForest ? '#1d6b38' : '#3f7c19';
    const cSun = isForest ? '#3aa250' : '#6cb528';
    const cHigh = isForest ? '#74d85e' : '#a8e63e';
    const cGlint = isForest ? '#c4fba8' : '#ecfc98';
    const cSpore = isForest ? '#5eead4' : '#fef08a';

    // Tronco robusto de roble con vetas de corteza y aristas
    ctx.fillStyle = '#100703';
    ctx.fillRect(-8, -16, 16, 20);
    ctx.fillRect(-13, 0, 6, 4);
    ctx.fillRect(7, 0, 6, 4);

    ctx.fillStyle = '#452310';
    ctx.fillRect(-6, -15, 12, 18);
    ctx.fillRect(-11, 1, 4, 3);
    ctx.fillRect(7, 1, 4, 3);

    ctx.fillStyle = '#733e1c';
    ctx.fillRect(-5, -15, 5, 17);
    ctx.fillRect(-10, 1, 3, 2);
    ctx.fillStyle = '#9e5a2c';
    ctx.fillRect(-4, -15, 2, 15);
    ctx.fillStyle = '#c47d44';
    ctx.fillRect(-4, -12, 1, 6);

    ctx.fillStyle = '#261208';
    ctx.fillRect(1, -14, 3, 16);
    // Nudo en el tronco
    ctx.fillStyle = '#1a0c04';
    ctx.fillRect(-1, -7, 3, 3);
    ctx.fillStyle = '#9e5a2c';
    ctx.fillRect(-1, -8, 3, 1);

    // Helper interno para dibujar un lóbulo de follaje redondeado en estilo pixel art GBA
    const drawFoliageLobe = (
      lx: number,
      ly: number,
      rw: number,
      rh: number,
      highlightLobe = false
    ) => {
      // Contorno exterior redondeado (esquinas achaflanadas)
      ctx.fillStyle = cOutline;
      ctx.fillRect(lx - rw + 3, ly - rh, rw * 2 - 6, rh * 2);
      ctx.fillRect(lx - rw, ly - rh + 3, rw * 2, rh * 2 - 6);
      ctx.fillRect(lx - rw + 1, ly - rh + 1, rw * 2 - 2, rh * 2 - 2);

      // Sombra inferior profunda
      ctx.fillStyle = cShadow;
      ctx.fillRect(lx - rw + 4, ly - rh + 2, rw * 2 - 8, rh * 2 - 4);
      ctx.fillRect(lx - rw + 2, ly - rh + 4, rw * 2 - 4, rh * 2 - 8);

      // Cuerpo medio de follaje
      ctx.fillStyle = cMid;
      ctx.fillRect(lx - rw + 4, ly - rh + 2, rw * 2 - 8, Math.floor(rh * 1.5));
      ctx.fillRect(lx - rw + 2, ly - rh + 4, rw * 2 - 4, Math.floor(rh * 1.3));

      // Cara superior iluminada por el sol
      ctx.fillStyle = cSun;
      const sunH = Math.floor(rh * 0.95);
      const sunW = Math.floor(rw * 1.5);
      ctx.fillRect(lx - rw + 4, ly - rh + 2, sunW, sunH);
      ctx.fillRect(lx - rw + 2, ly - rh + 4, Math.floor(rw * 1.7), Math.floor(rh * 0.75));

      // Racimos de hojas brillantes
      ctx.fillStyle = cHigh;
      ctx.fillRect(lx - rw + 6, ly - rh + 3, Math.floor(rw * 0.9), Math.floor(rh * 0.45));
      ctx.fillRect(lx - rw + 4, ly - rh + 5, Math.floor(rw * 1.1), Math.floor(rh * 0.3));

      // Manchas de textura orgánica (hojas individuales agrupadas)
      ctx.fillStyle = cSun;
      ctx.fillRect(lx + 2, ly - 2, 4, 3);
      ctx.fillRect(lx - 4, ly + 2, 5, 2);
      ctx.fillStyle = cShadow;
      ctx.fillRect(lx + Math.floor(rw * 0.4), ly + Math.floor(rh * 0.2), 4, 3);

      if (highlightLobe) {
        ctx.fillStyle = cGlint;
        ctx.fillRect(lx - rw + 8, ly - rh + 3, 5, 2);
        ctx.fillRect(lx - rw + 5, ly - rh + 6, 3, 2);
      }
    };

    // 1. Lóbulo inferior izquierdo
    drawFoliageLobe(-17, -26, 15, 14);
    // 2. Lóbulo inferior derecho
    drawFoliageLobe(17, -24, 15, 14);
    // 3. Lóbulo medio izquierdo
    drawFoliageLobe(-14, -42, 16, 15, true);
    // 4. Lóbulo medio derecho
    drawFoliageLobe(15, -39, 15, 14);
    // 5. Cúpula superior de la corona
    drawFoliageLobe(0, -52, 17, 16, true);

    // Destellos de hojas / esporas bioluminiscentes en el bosque o flores en la pradera
    ctx.fillStyle = cSpore;
    ctx.fillRect(-18, -44, 3, 2);
    ctx.fillRect(-8, -55, 3, 2);
    ctx.fillRect(9, -46, 3, 2);
    ctx.fillRect(19, -28, 2, 2);
    ctx.fillRect(-22, -25, 2, 2);

    ctx.fillStyle = isForest ? '#a7f3d0' : '#ffffff';
    ctx.fillRect(-17, -43, 1, 1);
    ctx.fillRect(-7, -54, 1, 1);
    ctx.fillRect(10, -45, 1, 1);
  }

  ctx.restore();
}

/** Farola retrofuturista de hierro forjado y bulbo de fósforo con estética GBA */
function drawPhosphorStreetlamp(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  glowHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(lx);
  const y = Math.round(ly);
  const pulse = reducedMotion ? 0.25 : 0.2 + Math.sin(elapsed * 3.1 + lx * 0.05) * 0.06;

  ctx.save();
  ctx.translate(x, y);

  // Halo cálido de iluminación sutil sobre el camino
  ctx.fillStyle = glowHex;
  ctx.globalAlpha = pulse * 0.4;
  ctx.beginPath();
  ctx.ellipse(0, -2, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = pulse * 0.8;
  ctx.beginPath();
  ctx.arc(0, -38, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Sombra del poste
  ctx.fillStyle = 'rgba(7, 11, 20, 0.45)';
  ctx.fillRect(-8, 3, 16, 4);

  // Pedestal de hierro fundido con escalonamiento
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-7, -2, 14, 6);
  ctx.fillRect(-5, -6, 10, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, -1, 12, 4);
  ctx.fillRect(-4, -5, 8, 3);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-5, -1, 2, 4);

  // Mástil acanalado de hierro forjado
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-3, -38, 6, 32);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-2, -37, 4, 30);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-2, -37, 1, 30);
  // Anillos ornamentales
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-4, -20, 8, 2);
  ctx.fillRect(-4, -34, 8, 2);

  // Soporte curvo y ménsula de la linterna
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-9, -48, 18, 12);
  ctx.fillRect(-6, -52, 12, 5);
  ctx.fillRect(-2, -55, 4, 4);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-8, -46, 16, 8);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-7, -50, 14, 3);
  ctx.fillRect(-1, -54, 2, 3);

  // Cámara de cristal con bulbo incandescente
  ctx.fillStyle = glowHex;
  ctx.fillRect(-6, -45, 12, 7);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2, -44, 4, 4);
  ctx.fillRect(-1, -43, 2, 2);

  ctx.restore();
}

/** Molino-antena acústica que capta frecuencias antiguas de la isla */
function drawSignalWindmill(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  const angle = reducedMotion ? 0.4 : elapsed * 1.35 + wx * 0.01;

  ctx.save();
  ctx.translate(x, y);

  // Sombra elíptica
  ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
  ctx.fillRect(-16, 2, 32, 6);

  // Pizarras y base de sillería
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-10, -50, 20, 54);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-8, -48, 16, 50);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-7, -47, 4, 48);

  // Celosía y molduras de latón
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-8, -32, 16, 3);
  ctx.fillRect(-8, -16, 16, 3);
  ctx.fillRect(-10, -50, 20, 4);

  // Caja de engranajes y buje acústico
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-6, -56, 12, 7);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-4, -55, 8, 5);

  // Aspas rotatorias en la cúspide con ángulo continuo
  ctx.save();
  ctx.translate(0, -52);
  ctx.rotate(angle);

  // Contorno negro de aspas
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-22, -3, 44, 6);
  ctx.fillRect(-3, -22, 6, 44);

  // Palas aerodinámicas con relieve
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-20, -2, 40, 4);
  ctx.fillRect(-2, -20, 4, 40);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-20, 0, 40, 2);
  ctx.fillRect(0, -20, 2, 40);

  // Núcleo central de señal con diodo cian
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(-3, -3, 6, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  ctx.restore();
}

/** Cartel indicador tallado en madera y latón arqueológico estilo GBA */
export function drawGbcWoodenSign(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  mapLabel?: string,
  large = false,
  kicker = 'SALA ARCADE · 1976'
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  ctx.save();
  ctx.translate(x, y);

  if (large) {
    // Cartel de gran formato: nombre del cruce legible desde la distancia
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-24, 4, 48, 7);

    // Postes reforzados
    ctx.fillStyle = '#100703';
    ctx.fillRect(-20, -10, 7, 18);
    ctx.fillRect(13, -10, 7, 18);
    ctx.fillStyle = '#5c3115';
    ctx.fillRect(-19, -10, 4, 16);
    ctx.fillRect(14, -10, 4, 16);
    ctx.fillStyle = '#8a5c33';
    ctx.fillRect(-19, -10, 1, 16);
    ctx.fillRect(14, -10, 1, 16);

    // Tablón principal con bisel de latón
    ctx.fillStyle = '#100703';
    ctx.fillRect(-34, -46, 68, 38);
    ctx.fillStyle = '#854d24';
    ctx.fillRect(-32, -44, 64, 34);
    ctx.fillStyle = '#a86b32';
    ctx.fillRect(-32, -44, 64, 3);
    ctx.fillStyle = '#5c3115';
    ctx.fillRect(-32, -13, 64, 3);

    // Pergamino frontal
    ctx.fillStyle = '#d4a365';
    ctx.fillRect(-29, -41, 58, 27);
    ctx.fillStyle = '#f3d9aa';
    ctx.fillRect(-29, -41, 58, 3);
    ctx.fillRect(-29, -41, 3, 27);
    ctx.fillStyle = 'rgba(60, 30, 8, 0.14)';
    ctx.fillRect(-6, -41, 2, 27);

    // Cabecera y nombre del cruce
    ctx.fillStyle = '#5c3115';
    ctx.font = '700 4px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(kicker, 0, -34);
    ctx.fillStyle = '#2b1404';
    const boardLabel = mapLabel ?? '4 CAMINOS';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    if (ctx.measureText(boardLabel).width <= 52) {
      ctx.fillText(boardLabel, 0, -23);
    } else {
      // Nombres largos: se ajustan en dos líneas dentro del pergamino para
      // conservar la legibilidad en lugar de desbordar el tablón.
      ctx.font = '700 7px "JetBrains Mono", monospace';
      const words = boardLabel.split(' ');
      const lines: string[] = [];
      let line = words[0] ?? '';
      for (let wi = 1; wi < words.length; wi++) {
        const test = `${line} ${words[wi]}`;
        if (line && ctx.measureText(test).width > 52) {
          lines.push(line);
          line = words[wi];
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      if (lines.length === 1) {
        ctx.fillText(lines[0], 0, -22);
      } else {
        ctx.fillText(lines[0], 0, -31);
        ctx.fillText(lines[1], 0, -21);
      }
    }
    ctx.fillStyle = '#7a4a1c';
    ctx.fillRect(-24, -20, 48, 1);

    // Líneas talladas de direcciones
    ctx.fillStyle = '#3b1d08';
    ctx.fillRect(-23, -16, 20, 2);
    ctx.fillRect(-23, -11, 14, 2);
    ctx.fillRect(3, -16, 20, 2);
    ctx.fillRect(3, -11, 16, 2);

    // Clavos de latón
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-30, -42, 3, 3);
    ctx.fillRect(27, -42, 3, 3);
    ctx.fillRect(-30, -17, 3, 3);
    ctx.fillRect(27, -17, 3, 3);

    ctx.restore();
    return;
  }

  // Sombra arrojada
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(-14, 3, 28, 5);

  // Dos postes de madera tallada
  ctx.fillStyle = '#100703';
  ctx.fillRect(-10, -8, 5, 14);
  ctx.fillRect(5, -8, 5, 14);
  ctx.fillStyle = '#5c3115';
  ctx.fillRect(-9, -8, 3, 12);
  ctx.fillRect(6, -8, 3, 12);

  // Tablón de anuncios con bisel y veta
  ctx.fillStyle = '#100703';
  ctx.fillRect(-17, -29, 34, 23);
  ctx.fillStyle = '#854d24';
  ctx.fillRect(-15, -27, 30, 19);

  // Cara frontal de pergamino / madera clara
  ctx.fillStyle = '#d4a365';
  ctx.fillRect(-13, -25, 26, 15);
  ctx.fillStyle = '#f3d9aa';
  ctx.fillRect(-13, -25, 26, 3);
  ctx.fillRect(-13, -25, 3, 15);

  // Líneas de texto simulado en pixel art
  ctx.fillStyle = '#3b1d08';
  ctx.fillRect(-9, -19, 18, 2);
  ctx.fillRect(-9, -14, 14, 2);
  ctx.fillRect(-9, -9, 8, 2);

  // Clavos de latón en las esquinas
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-14, -26, 2, 2);
  ctx.fillRect(12, -26, 2, 2);

  ctx.restore();
}

/** Terminal / Punto de Guardado estilo Game Boy Advance en el Pueblo del Origen */
function drawGbcSaveTerminal(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  elapsed: number,
  hasSaved: boolean
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const blink = Math.floor(elapsed * 3) % 2 === 0;

  ctx.save();
  ctx.translate(x, y);

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-18, 5, 36, 6);

  // Chasis industrial color marfil y bronce con contorno nítido
  ctx.fillStyle = '#080e18';
  ctx.fillRect(-15, -34, 30, 40);
  ctx.fillStyle = '#e8ecf0';
  ctx.fillRect(-13, -32, 26, 36);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-13, -8, 26, 12);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-13, -32, 26, 3);
  ctx.fillRect(-13, -32, 3, 36);

  // Rejillas de ventilación superiores
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-10, -30, 20, 1);
  ctx.fillRect(-10, -28, 20, 1);

  // Pantalla CRT curva
  ctx.fillStyle = '#080e18';
  ctx.fillRect(-11, -25, 22, 16);
  ctx.fillStyle = hasSaved ? '#14532d' : '#0c4a6e';
  ctx.fillRect(-9, -23, 18, 12);

  // Osciloscopio / onda de memoria pulsante en pantalla
  const waveCol = hasSaved ? (blink ? '#86efac' : '#22c55e') : (blink ? '#7dd3fc' : '#0284c7');
  ctx.fillStyle = waveCol;
  ctx.fillRect(-7, -18, 3, 2);
  ctx.fillRect(-4, -20, 3, 2);
  ctx.fillRect(-1, -16, 3, 3);
  ctx.fillRect(2, -19, 3, 2);
  ctx.fillRect(5, -17, 2, 2);

  // Ranura de cartucho / casete y diodo de actividad
  ctx.fillStyle = '#080e18';
  ctx.fillRect(-8, -5, 16, 2);
  ctx.fillStyle = blink ? '#fbbf24' : '#ef4444';
  ctx.fillRect(9, -7, 2, 2);

  // Rótulo dorado SAVE
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-9, 0, 18, 3);
  ctx.fillStyle = '#080e18';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SAVE', 0, 2);

  ctx.restore();
}

/** Entrada a túnel subterráneo disimulada entre rocas costeras/cavernosas con volumen GBA */
function drawGbcRockTunnelEntrance(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = Math.round(tx);
  const y = Math.round(ty);
  ctx.save();
  ctx.translate(x, y);

  // Sombra de contacto en el suelo
  ctx.fillStyle = 'rgba(5, 8, 14, 0.46)';
  ctx.fillRect(-24, 4, 48, 8);

  // Formación rocosa exterior: contorno oscuro
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-22, -32, 44, 36);
  ctx.fillRect(-16, -38, 32, 8);
  ctx.fillRect(-26, -16, 6, 20);
  ctx.fillRect(20, -16, 6, 20);

  // Rocas basálticas / areniscas exteriores con caras de luz y sombra
  ctx.fillStyle = '#524335';
  ctx.fillRect(-20, -30, 40, 32);
  ctx.fillRect(-14, -36, 28, 8);
  ctx.fillRect(-24, -14, 6, 16);
  ctx.fillRect(18, -14, 6, 16);

  // Facetas iluminadas en la parte superior e izquierda
  ctx.fillStyle = '#8a735c';
  ctx.fillRect(-14, -36, 26, 4);
  ctx.fillRect(-20, -28, 5, 20);
  ctx.fillRect(-24, -14, 3, 14);
  ctx.fillStyle = '#bfa58a';
  ctx.fillRect(-12, -35, 12, 2);
  ctx.fillRect(-19, -26, 2, 10);

  // Facetas en sombra profunda a la derecha
  ctx.fillStyle = '#30251c';
  ctx.fillRect(14, -30, 6, 30);
  ctx.fillRect(18, -12, 4, 14);

  // Parche de musgo clinging en la cornisa superior
  ctx.fillStyle = '#2d6d34';
  ctx.fillRect(-10, -38, 18, 3);
  ctx.fillRect(1, -35, 8, 2);
  ctx.fillStyle = '#65ad4d';
  ctx.fillRect(-8, -38, 10, 1);

  // Boca oscura de la caverna con arco escalonado
  ctx.fillStyle = '#03060a';
  ctx.fillRect(-13, -22, 26, 24);
  ctx.fillRect(-9, -26, 18, 5);

  // Peldaños de piedra descendentes iluminados tenuemente
  ctx.fillStyle = '#241b16';
  ctx.fillRect(-11, -8, 22, 4);
  ctx.fillRect(-10, -2, 20, 4);
  ctx.fillStyle = '#423226';
  ctx.fillRect(-10, -8, 20, 1);
  ctx.fillRect(-9, -2, 18, 1);

  ctx.restore();
}

/** Escotilla subterránea cifrada hacia el Laberinto de Señales de 1976 */
function drawLabyrinth1976Hatch(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  unlockedBreakout: boolean,
  elapsed: number
): void {
  const x = Math.round(hx);
  const y = Math.round(hy);
  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada
  ctx.fillStyle = 'rgba(5, 8, 18, 0.52)';
  ctx.fillRect(-28, -12, 56, 32);

  // Zócalo octogonal de bronce y acero TTL
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-25, -16, 50, 34);
  ctx.fillRect(-22, -18, 44, 38);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-23, -14, 46, 30);
  ctx.fillRect(-20, -16, 40, 34);

  // Borde biselado de bronce industrial
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-21, -13, 42, 3);
  ctx.fillRect(-21, -13, 3, 26);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-21, 13, 42, 3);
  ctx.fillRect(18, -13, 3, 28);

  // Remaches metálicos en las esquinas
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-19, -12, 2, 2);
  ctx.fillRect(17, -12, 2, 2);
  ctx.fillRect(-19, 12, 2, 2);
  ctx.fillRect(17, 12, 2, 2);

  // Boca de descenso con escalerilla metálica iluminada
  ctx.fillStyle = '#03050c';
  ctx.fillRect(-15, -6, 30, 20);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-13, -5, 2, 18);
  ctx.fillRect(11, -5, 2, 18);
  ctx.fillStyle = '#cbd5e1';
  for (let sy = -3; sy <= 10; sy += 5) {
    ctx.fillRect(-11, sy, 22, 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-10, sy, 20, 1);
    ctx.fillStyle = '#cbd5e1';
  }

  // 4 testigos cromáticos de 1976 (amarillo, verde, naranja, rojo)
  const leds = ['#facc15', '#22c55e', '#f97316', '#ef4444'];
  leds.forEach((col, i) => {
    const active = unlockedBreakout || Math.floor(elapsed * 3 + i) % 4 === 0;
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-17 + i * 9, -12, 8, 5);
    ctx.fillStyle = active ? col : '#334155';
    ctx.fillRect(-16 + i * 9, -11, 6, 3);
    if (active) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-15 + i * 9, -11, 2, 1);
    }
  });

  ctx.restore();
}

/** Criaturas guardianas originales de PIXELVERSE (Lumen-Bit, Sincro-76, Vectra-79) con pixel art GBA */
export function drawGuardianCreatureSprite(
  ctx: CanvasRenderingContext2D,
  creature: GuardianCreatureSpec,
  calmed: boolean,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(creature.x);
  const y = Math.round(creature.y);
  const floatY = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 3.4 + x * 0.05) * 4);
  const wingBeat = reducedMotion ? 0 : Math.sin(elapsed * 9) > 0 ? 3 : -2;

  ctx.save();
  ctx.translate(x, y + floatY);

  // Sombra de oclusión en el suelo
  ctx.fillStyle = 'rgba(4, 8, 18, 0.45)';
  ctx.fillRect(-14, 6 - floatY, 28, 5);
  ctx.fillRect(-8, 9 - floatY, 16, 2);

  // Halo cromático HD-2D RGB
  ctx.globalAlpha = calmed ? 0.35 : 0.22;
  ctx.fillStyle = calmed ? creature.secondaryHex : creature.accentHex;
  ctx.beginPath();
  ctx.arc(0, -14, calmed ? 26 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (creature.id === 'creature-sincro-laberinto') {
    // Sincro-76: Centinela geométrico de anillos TTL
    if (!calmed) {
      // Barrera energética activa en el corredor
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-24, -40, 48, 52);
    }
    // Núcleo central
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-15, -28, 30, 26);
    ctx.fillStyle = calmed ? '#0891b2' : '#c2410c';
    ctx.fillRect(-13, -26, 26, 22);
    ctx.fillStyle = calmed ? '#22d3ee' : '#f97316';
    ctx.fillRect(-11, -24, 22, 18);
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-7, -20, 14, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -17, 6, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1, -16, 3, 3);
  } else if (creature.id === 'creature-vectra-caverna') {
    // Vectra-79: Prisma vectorial XY flotante
    ctx.strokeStyle = calmed ? '#22d3ee' : '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(16 + wingBeat, -14);
    ctx.lineTo(0, 4);
    ctx.lineTo(-16 - wingBeat, -14);
    ctx.closePath();
    ctx.stroke();

    // Aristas interiores
    ctx.strokeStyle = calmed ? '#67e8f9' : '#c084fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(0, 4);
    ctx.moveTo(-16 - wingBeat, -14);
    ctx.lineTo(16 + wingBeat, -14);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -18, 8, 8);
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-2, -16, 4, 4);
  } else {
    // Lumen-Bit: Polilla luminiscente de fósforo esmeralda/ámbar
    // Antenas emplumadas
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-6, -34 + wingBeat, 2, 6);
    ctx.fillRect(4, -34 + wingBeat, 2, 6);
    ctx.fillStyle = calmed ? '#fef08a' : '#67e8f9';
    ctx.fillRect(-7, -35 + wingBeat, 4, 2);
    ctx.fillRect(3, -35 + wingBeat, 4, 2);

    // Alas cristalinas con batido
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-18, -24 + wingBeat, 14, 14);
    ctx.fillRect(4, -24 + wingBeat, 14, 14);
    ctx.fillStyle = calmed ? '#facc15' : '#10b981';
    ctx.fillRect(-16, -22 + wingBeat, 11, 10);
    ctx.fillRect(5, -22 + wingBeat, 11, 10);
    ctx.fillStyle = calmed ? '#fef08a' : '#6ee7b7';
    ctx.fillRect(-14, -20 + wingBeat, 6, 6);
    ctx.fillRect(7, -20 + wingBeat, 6, 6);

    // Cuerpo esponjoso central
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-6, -24, 12, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-4, -22, 8, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -19, 2, 3);
    ctx.fillRect(1, -19, 2, 3);
  }

  ctx.restore();
}

/**
 * PROTAGONISTA PIXEL CON CALIDAD VISUAL GBA RPG (BRENDAN / MAY / RED / LEAF)
 * - Proporciones estilizadas de 16×22 píxeles lógicos con silueta nítida.
 * - Cabello con volumen y brillo cenital, rostro expresivo con ojos vivos.
 * - Chaqueta con cuello, camiseta interior, cinturón con hebilla dorada.
 * - Botas de explorador con suela y puntera en relieve.
 * - Ciclo de 4 fases de animación de marcha con balanceo de brazos y zancada natural.
 */
function drawAvatarOutfit(ctx: CanvasRenderingContext2D, id: string): void {
  const accents: Record<string, string> = {
    rocker: '#f05b50', mage: '#bf91ff', indie: '#d7a77b', hippie: '#f2bd4b', punk: '#f34b75',
    ninja: '#a68bff', knight: '#c2d0da', explorer: '#91b978', pirate: '#da5149', scientist: '#f0eee3',
    athlete: '#57d2e1', cowboy: '#cf843a', cyberpunk: '#ff4bd8', artist: '#f0a638', detective: '#a9b5c9',
    space: '#66d9ed', tribal: '#da8a50', vintage: '#e1cb91', inventor: '#ce9157',
  };
  const a = accents[id] ?? '#f5d675';
  ctx.save();
  switch (id) {
    case 'rocker': ctx.fillStyle = '#20232d'; ctx.fillRect(-9,-18,18,11); ctx.fillStyle=a; ctx.fillRect(-2,-16,2,2);ctx.fillRect(0,-14,2,2);ctx.fillRect(-2,-12,2,2);for(let x=-7;x<=7;x+=7)ctx.fillRect(x,-17,2,1);break;
    case 'mage': ctx.fillStyle=a;ctx.fillRect(-10,-9,20,7);ctx.fillRect(-5,-14,10,2);ctx.fillRect(-1,-17,2,9);ctx.fillStyle='#111827';ctx.fillRect(-10,-38,20,3);ctx.fillRect(-6,-44,12,7);ctx.fillRect(-3,-48,6,5);break;
    case 'indie': ctx.fillStyle='#e7d5bd';ctx.fillRect(-7,-17,14,10);ctx.fillStyle=a;ctx.fillRect(-7,-17,3,9);ctx.fillRect(4,-17,3,9);ctx.fillRect(-2,-15,4,2);break;
    case 'hippie': ctx.fillStyle=a;ctx.fillRect(-8,-16,16,2);ctx.fillRect(-9,-10,18,2);ctx.fillStyle='#ed7464';ctx.fillRect(-6,-13,3,2);ctx.fillStyle='#6fbd76';ctx.fillRect(3,-15,3,2);break;
    case 'punk': ctx.fillStyle='#171b27';ctx.fillRect(-10,-19,20,10);ctx.fillStyle=a;ctx.fillRect(-9,-18,4,2);ctx.fillRect(5,-18,4,2);for(let x=-7;x<9;x+=7)ctx.fillRect(x,-15,2,2);ctx.fillStyle='#d7dde4';ctx.fillRect(4,-12,4,1);break;
    case 'ninja': ctx.fillStyle='#161627';ctx.fillRect(-9,-17,18,12);ctx.fillStyle=a;ctx.fillRect(-8,-20,16,2);ctx.fillRect(-8,-10,16,2);ctx.fillStyle='#eee6d2';ctx.fillRect(-5,-23,10,2);break;
    case 'knight': ctx.fillStyle='#526474';ctx.fillRect(-12,-18,7,6);ctx.fillRect(5,-18,7,6);ctx.fillStyle='#ccd6dd';ctx.fillRect(-10,-17,5,4);ctx.fillRect(5,-17,5,4);ctx.fillStyle=a;ctx.fillRect(-2,-15,4,4);break;
    case 'explorer': ctx.fillStyle='#77502f';ctx.fillRect(-7,-17,2,11);ctx.fillRect(5,-17,2,11);ctx.fillStyle=a;ctx.fillRect(-6,-15,12,2);ctx.fillRect(-6,-9,12,2);break;
    case 'pirate': ctx.fillStyle=a;ctx.fillRect(-9,-17,18,3);ctx.fillRect(-2,-14,4,7);ctx.fillStyle='#15151a';ctx.fillRect(-11,-37,22,3);ctx.fillRect(-7,-40,14,4);break;
    case 'scientist': ctx.fillStyle='#f4f1e8';ctx.fillRect(-8,-17,4,11);ctx.fillRect(4,-17,4,11);ctx.fillStyle=a;ctx.fillRect(-1,-17,2,7);ctx.fillStyle='#65b9b5';ctx.fillRect(4,-11,4,3);break;
    case 'athlete': ctx.fillStyle=a;ctx.fillRect(-9,-17,2,10);ctx.fillRect(7,-17,2,10);ctx.fillStyle='#f7f4e6';ctx.fillRect(-6,-17,2,10);ctx.fillRect(4,-17,2,10);break;
    case 'cowboy': ctx.fillStyle='#75401f';ctx.fillRect(-7,-16,14,8);ctx.fillStyle=a;ctx.fillRect(-8,-18,4,10);ctx.fillRect(4,-18,4,10);ctx.fillStyle='#cf4840';ctx.fillRect(-5,-15,10,3);ctx.fillStyle='#111827';ctx.fillRect(-10,-35,20,2);ctx.fillRect(-6,-40,12,6);break;
    case 'cyberpunk': ctx.fillStyle='#16182a';ctx.fillRect(-9,-18,18,12);ctx.fillStyle=a;ctx.fillRect(-8,-17,2,9);ctx.fillRect(6,-17,2,9);ctx.fillRect(-4,-12,8,1);ctx.fillStyle='#64f6ed';ctx.fillRect(-2,-16,4,3);break;
    case 'artist': ctx.fillStyle='#ded4bd';ctx.fillRect(-8,-17,16,12);ctx.fillStyle='#e75152';ctx.fillRect(-6,-15,3,2);ctx.fillStyle='#397fc0';ctx.fillRect(2,-13,3,2);ctx.fillStyle=a;ctx.fillRect(-8,-18,16,2);break;
    case 'detective': ctx.fillStyle='#263247';ctx.fillRect(-10,-18,20,14);ctx.fillStyle='#ddd6c4';ctx.fillRect(-3,-17,6,3);ctx.fillStyle=a;ctx.fillRect(-1,-14,2,7);ctx.fillStyle='#171923';ctx.fillRect(-12,-36,24,3);ctx.fillRect(-8,-39,16,4);break;
    case 'space': ctx.fillStyle='#dfe7e4';ctx.fillRect(-10,-19,20,14);ctx.fillStyle=a;ctx.fillRect(-8,-17,2,10);ctx.fillRect(6,-17,2,10);ctx.fillStyle='#df6652';ctx.fillRect(-8,-12,4,3);ctx.fillStyle='#53687e';ctx.fillRect(-12,-17,3,9);break;
    case 'tribal': ctx.fillStyle='#8e5336';ctx.fillRect(-10,-18,20,5);ctx.fillRect(-8,-13,16,2);ctx.fillStyle=a;for(let x=-8;x<=8;x+=4)ctx.fillRect(x,-21,2,5);break;
    case 'vintage': ctx.fillStyle='#eee6d0';ctx.fillRect(-7,-17,14,10);ctx.fillStyle=a;ctx.fillRect(-5,-16,10,2);ctx.fillRect(-1,-14,2,6);ctx.fillStyle='#f5d675';ctx.fillRect(4,-10,2,2);break;
    case 'inventor': ctx.fillStyle='#975e35';ctx.fillRect(-8,-16,16,10);ctx.fillStyle=a;ctx.fillRect(-6,-15,12,2);ctx.fillStyle='#e7c96a';ctx.fillRect(-3,-11,6,4);break;
  }
  ctx.restore();
}

function drawAvatarTransformation(ctx: CanvasRenderingContext2D, id: string, t: number): void {
  ctx.save();
  switch (id) {
    case 'monster': ctx.fillStyle='#111827';ctx.fillRect(-11,-36,5,8);ctx.fillRect(6,-36,5,8);ctx.fillStyle='#f4d469';ctx.fillRect(-6,-22,3,2);ctx.fillRect(3,-22,3,2);ctx.fillRect(-11,-18,3,4);ctx.fillRect(8,-18,3,4);break;
    case 'frankenstein': ctx.fillStyle='#101827';ctx.fillRect(-11,-36,22,13);ctx.fillStyle='#8fbd75';ctx.fillRect(-8,-34,16,9);ctx.fillStyle='#f1dfbf';ctx.fillRect(-10,-29,20,1);ctx.fillRect(-8,-26,2,1);ctx.fillRect(6,-26,2,1);ctx.fillStyle='#f2d05d';ctx.fillRect(-13,-29,2,4);ctx.fillRect(11,-29,2,4);break;
    case 'mummy': ctx.fillStyle='#c4b28b';ctx.fillRect(-9,-35,18,17);ctx.fillRect(-10,-17,20,13);ctx.fillStyle='#e5d4a8';for(let y=-33;y<-17;y+=4)ctx.fillRect(-9,y,18,2);for(let y=-16;y<-5;y+=4)ctx.fillRect(-10,y,20,2);ctx.fillStyle='#111827';ctx.fillRect(-6,-25,4,2);ctx.fillRect(2,-25,4,2);break;
    case 'vampire': ctx.fillStyle='#f0dde5';ctx.fillRect(-8,-28,16,11);ctx.fillStyle='#c53e5d';ctx.fillRect(-8,-17,4,12);ctx.fillRect(4,-17,4,12);ctx.fillRect(-11,-17,4,5);ctx.fillRect(7,-17,4,5);ctx.fillStyle='#171321';ctx.fillRect(-6,-23,3,3);ctx.fillRect(3,-23,3,3);ctx.fillStyle='#fff2dc';ctx.fillRect(-2,-19,2,3);ctx.fillRect(1,-19,2,3);break;
    case 'werewolf': ctx.fillStyle='#342922';ctx.fillRect(-11,-37,8,11);ctx.fillRect(3,-37,8,11);ctx.fillStyle='#bd916d';ctx.fillRect(-8,-27,16,10);ctx.fillRect(-10,-19,3,3);ctx.fillRect(7,-19,3,3);ctx.fillStyle='#111827';ctx.fillRect(-5,-23,3,2);ctx.fillRect(2,-23,3,2);ctx.fillRect(-2,-19,4,2);ctx.fillStyle='#f4e7d2';ctx.fillRect(-4,-18,2,3);ctx.fillRect(2,-18,2,3);break;
    case 'skeleton': ctx.fillStyle='#f0e9d5';ctx.fillRect(-8,-35,16,17);ctx.fillRect(-10,-16,20,9);ctx.fillStyle='#111521';ctx.fillRect(-6,-27,4,5);ctx.fillRect(2,-27,4,5);ctx.fillRect(-3,-20,6,2);ctx.fillStyle='#f0e9d5';ctx.fillRect(-1,-16,2,9);ctx.fillRect(-8,-14,16,2);for(let x=-7;x<=5;x+=4)ctx.fillRect(x,-12,2,5);break;
    case 'alien': ctx.fillStyle='#75df91';ctx.fillRect(-10,-31,20,14);ctx.fillStyle='#12252b';ctx.fillRect(-6,-27,5,5);ctx.fillRect(1,-27,5,5);ctx.fillStyle='#b9ffca';ctx.fillRect(-5,-26,2,2);ctx.fillRect(2,-26,2,2);ctx.fillStyle='#75df91';ctx.fillRect(-7,-37,2,7);ctx.fillRect(5,-37,2,7);ctx.fillRect(-10,-39,7,2);ctx.fillRect(3,-39,7,2);break;
    case 'ghost': ctx.globalAlpha=.8;ctx.fillStyle='#b9edf0';ctx.fillRect(-10,-32,20,31);ctx.fillRect(-7,-36,14,5);ctx.fillStyle='#293b62';ctx.fillRect(-6,-25,3,4);ctx.fillRect(3,-25,3,4);ctx.fillRect(-2,-17,4,2);ctx.fillStyle='#b9edf0';ctx.fillRect(-10,-2,5,5);ctx.fillRect(-2,-4,5,7);ctx.fillRect(6,-2,4,5);break;
    case 'demon': ctx.fillStyle='#711e35';ctx.fillRect(-11,-37,7,9);ctx.fillRect(4,-37,7,9);ctx.fillStyle='#ed594b';ctx.fillRect(-9,-34,18,15);ctx.fillRect(-9,-18,18,12);ctx.fillStyle='#fff0a3';ctx.fillRect(-6,-26,4,2);ctx.fillRect(2,-26,4,2);ctx.fillStyle='#f5cf53';ctx.fillRect(-3,-20,2,3);ctx.fillRect(1,-20,2,3);break;
    case 'glitch': { const n=Math.floor(t*14)%3-1;ctx.globalAlpha=.8;ctx.fillStyle='#ff4bd8';ctx.fillRect(-13+n,-32,4,5);ctx.fillRect(8-n,-22,5,4);ctx.fillStyle='#47f5ed';ctx.fillRect(9-n,-37,4,6);ctx.fillRect(-13+n,-12,4,5);ctx.fillStyle='#161b34';ctx.fillRect(-7+n,-25,4,3);ctx.fillRect(3-n,-25,4,3);break; }
  }
  ctx.restore();
}

function drawAvatarAccessories(ctx: CanvasRenderingContext2D, accessories: string[], facing: FacingDirection): void {
  const has=(id:string)=>accessories.includes(id);ctx.save();
  if(has('cape')){ctx.fillStyle='#080d16';ctx.fillRect(-12,-17,5,16);ctx.fillRect(7,-17,5,16);ctx.fillStyle='#b83145';ctx.fillRect(-11,-16,3,13);ctx.fillRect(8,-16,3,13);ctx.fillStyle='#f1cc65';ctx.fillRect(-2,-17,4,3);}
  if(has('backpack')){ctx.fillStyle='#080d16';ctx.fillRect(-13,-18,6,12);ctx.fillStyle='#8c5835';ctx.fillRect(-12,-17,4,10);ctx.fillStyle='#edc45d';ctx.fillRect(-11,-14,2,2);}
  if(has('hat')){ctx.fillStyle='#15141a';ctx.fillRect(-14,-37,28,3);ctx.fillRect(-8,-43,16,7);ctx.fillStyle='#ad773a';ctx.fillRect(-9,-39,18,2);}
  if(has('cap')){ctx.fillStyle='#111725';ctx.fillRect(-10,-38,20,5);ctx.fillRect(-8,-41,16,4);ctx.fillStyle='#d77745';ctx.fillRect(-1,-40,5,2);}
  if(has('bandana')){ctx.fillStyle='#bd354b';ctx.fillRect(-10,-35,20,3);ctx.fillRect(7,-33,6,3);ctx.fillRect(10,-30,3,4);}
  if(has('headphones')){ctx.fillStyle='#161c2a';ctx.fillRect(-12,-35,3,12);ctx.fillRect(9,-35,3,12);ctx.fillRect(-9,-39,18,3);ctx.fillStyle='#5bdbe0';ctx.fillRect(-12,-29,4,5);ctx.fillRect(8,-29,4,5);}
  if(facing!=='up'){
    if(has('glasses')){ctx.fillStyle='#111827';ctx.fillRect(-8,-24,7,6);ctx.fillRect(1,-24,7,6);ctx.fillRect(-1,-22,2,2);ctx.fillStyle='#86e6ef';ctx.fillRect(-6,-23,3,2);ctx.fillRect(2,-23,3,2);}
    if(has('mask')){ctx.fillStyle='#111827';ctx.fillRect(-7,-19,14,5);ctx.fillStyle='#a9bacb';ctx.fillRect(-6,-18,12,3);}
    if(has('scarf')){ctx.fillStyle='#d9503d';ctx.fillRect(-10,-18,20,4);ctx.fillRect(5,-15,4,9);}
    if(has('earrings')){ctx.fillStyle='#f7d45b';ctx.fillRect(-10,-21,2,3);ctx.fillRect(8,-21,2,3);}
  }
  ctx.restore();
}

export function drawPixelAvatar4Dir(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  facingDir: FacingDirection,
  walking: boolean,
  sprinting: boolean,
  t: number,
  skin: string,
  hair: string,
  shirt: string,
  opts?: {
    reducedMotion?: boolean;
    equippedCosmetic?: string | null;
    lanternActive?: boolean;
    interactAnim?: number;
    appearance?: AvatarAppearance;
  }
): void {
  const appearance = opts?.appearance;
  const transformation = appearance?.transformationId;
  if (transformation === 'frankenstein') skin = '#8fbd75';
  else if (transformation === 'mummy') skin = '#d9c79c';
  else if (transformation === 'vampire') skin = '#ead9df';
  else if (transformation === 'werewolf') skin = '#a87955';
  else if (transformation === 'skeleton') skin = '#e7dfc8';
  else if (transformation === 'alien') skin = '#75df91';
  else if (transformation === 'ghost') skin = '#b9edf0';
  else if (transformation === 'demon') skin = '#d94445';
  else if (transformation === 'monster') skin = '#76bd69';
  else if (transformation === 'glitch') skin = '#65d7c8';

  if (transformation === 'skeleton') {
    hair = '#eee5cf';
    shirt = '#e8dfc9';
  } else if (transformation === 'mummy') {
    hair = '#b9a67c';
    shirt = '#d8c69a';
  }
  const reducedMotion = Boolean(opts?.reducedMotion);
  const animT = reducedMotion ? 0 : t;
  const stepPhase = walking ? Math.floor(animT * (sprinting ? 11 : 7.5)) % 4 : 0;
  const bob = walking && (stepPhase === 1 || stepPhase === 3) ? 2 : 0;
  const idleBob = !walking && !reducedMotion && Math.sin(animT * 2.8) > 0.62 ? 1 : 0;
  const idleBlink = !walking && !reducedMotion && (animT % 4.8) > 4.64;
  const stride =
    !walking || reducedMotion ? 0 : stepPhase === 1 ? 3 : stepPhase === 3 ? -3 : 0;
  const armSwing =
    !walking || reducedMotion ? 0 : stepPhase === 1 ? 3 : stepPhase === 3 ? -3 : 0;
  const interactReach = (opts?.interactAnim ?? 0) > 0 ? 3 : 0;

  ctx.save();
  ctx.translate(Math.round(ax), Math.round(ay - bob - idleBob));

  // 1. Sombra suave elíptica de oclusión en el suelo
  ctx.fillStyle = 'rgba(6, 10, 18, 0.24)';
  ctx.fillRect(-10, 5 + bob + idleBob, 20, 5);
  ctx.fillStyle = 'rgba(6, 10, 18, 0.4)';
  ctx.fillRect(-7, 6 + bob + idleBob, 14, 4);
  ctx.fillRect(-4, 9 + bob + idleBob, 8, 1);

  // Halo de la Lámpara de Fósforo si está encendida
  if (opts?.lanternActive) {
    ctx.save();
    ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
    ctx.beginPath();
    ctx.arc(0, -14, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
    ctx.beginPath();
    ctx.arc(0, -14, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const darkOutline = '#070b14';

  // Mochila de exploración visible desde atrás, separada por contorno y luz de borde.
  if (facingDir === 'up') {
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-8, -18, 16, 10);
    ctx.fillStyle = '#8b4e20';
    ctx.fillRect(-6, -17, 12, 8);
    ctx.fillStyle = '#c47d44';
    ctx.fillRect(-5, -16, 3, 5);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(3, -16, 2, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1, -14, 3, 2);
  }

  // 2. PIERNAS Y BOTAS DE EXPLORADOR
  ctx.fillStyle = darkOutline;
  if (facingDir === 'down' || facingDir === 'up') {
    // Vista frontal o trasera: dos piernas simétricas con zancada vertical
    const lStride = Math.max(0, stride);
    const rStride = Math.max(0, -stride);
    ctx.fillRect(-8, -6 + lStride, 7, 9);
    ctx.fillRect(1, -6 + rStride, 7, 9);

    // Pantalones oscuros
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-7, -6 + lStride, 5, 4);
    ctx.fillRect(2, -6 + rStride, 5, 4);

    // Botas con suela y puntera
    ctx.fillStyle = appearance?.bootColor ?? '#334155';
    ctx.fillRect(-7, -2 + lStride, 5, 4);
    ctx.fillRect(2, -2 + rStride, 5, 4);
    ctx.fillStyle = appearance?.bootColor ? '#f1d7a1' : '#64748b';
    ctx.fillRect(-6, -1 + lStride, 3, 2);
    ctx.fillRect(3, -1 + rStride, 3, 2);
  } else {
    // Vista lateral (izquierda o derecha): pierna delantera y trasera
    ctx.fillRect(-6 + stride, -6, 7, 9);
    ctx.fillRect(-1 - stride, -6, 7, 9);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-5 + stride, -6, 5, 4);
    ctx.fillRect(-stride, -6, 5, 4);

    ctx.fillStyle = appearance?.bootColor ?? '#334155';
    ctx.fillRect(-5 + stride, -2, 5, 4);
    ctx.fillRect(-stride, -2, 5, 4);
    ctx.fillStyle = appearance?.bootColor ? '#f1d7a1' : '#64748b';
    ctx.fillRect(-4 + stride, -1, 3, 2);
    ctx.fillRect(1 - stride, -1, 3, 2);
  }

  // 3. TORSO: CHAQUETA DE AVENTURA, CAMISETA Y CINTURÓN
  ctx.fillStyle = darkOutline;
  ctx.fillRect(-9, -18, 18, 14);

  // Chaqueta de color personalizable
  ctx.fillStyle = shirt;
  ctx.fillRect(-8, -17, 16, 12);

  // Cinturón de cuero con hebilla dorada
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-8, -8, 16, 3);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, -8, 4, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -7, 2, 1);

  if (facingDir === 'up') {
    // Espalda: pliegues de chaqueta y costura central
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1, -17, 2, 9);
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-6, -17, 12, 2);
  } else if (facingDir === 'down') {
    // Frontal: solapas de chaqueta y cuello de camiseta interior
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -17, 6, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-2, -15, 4, 3);
    // Solapas de chaqueta
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-4, -17, 1, 7);
    ctx.fillRect(3, -17, 1, 7);
  }

  // 4. BRAZOS EN 4 DIRECCIONES
  ctx.fillStyle = darkOutline;
  if (facingDir === 'down') {
    ctx.fillRect(-12, -17 + armSwing, 4, 9 + interactReach);
    ctx.fillRect(8, -17 - armSwing, 4, 9 + interactReach);
    // Mangas
    ctx.fillStyle = shirt;
    ctx.fillRect(-11, -16 + armSwing, 2, 4);
    ctx.fillRect(9, -16 - armSwing, 2, 4);
    // Manos
    ctx.fillStyle = skin;
    ctx.fillRect(-11, -12 + armSwing, 2, 4 + interactReach);
    ctx.fillRect(9, -12 - armSwing, 2, 4 + interactReach);
  } else if (facingDir === 'up') {
    ctx.fillRect(-12, -17 - armSwing, 4, 9);
    ctx.fillRect(8, -17 + armSwing, 4, 9);
    ctx.fillStyle = shirt;
    ctx.fillRect(-11, -16 - armSwing, 2, 5);
    ctx.fillRect(9, -16 + armSwing, 2, 5);
    ctx.fillStyle = skin;
    ctx.fillRect(-11, -11 - armSwing, 2, 3);
    ctx.fillRect(9, -11 + armSwing, 2, 3);
  } else if (facingDir === 'right') {
    ctx.fillRect(-2 + armSwing + interactReach, -16, 5, 9);
    ctx.fillStyle = shirt;
    ctx.fillRect(-1 + armSwing + interactReach, -15, 3, 4);
    ctx.fillStyle = skin;
    ctx.fillRect(-1 + armSwing + interactReach, -11, 3, 4);
  } else {
    ctx.fillRect(-3 - armSwing - interactReach, -16, 5, 9);
    ctx.fillStyle = shirt;
    ctx.fillRect(-2 - armSwing - interactReach, -15, 3, 4);
    ctx.fillStyle = skin;
    ctx.fillRect(-2 - armSwing - interactReach, -11, 3, 4);
  }

  // 5. CABEZA Y CABELLO CON ESTILO ANIME RETRO GBA
  ctx.fillStyle = darkOutline;
  ctx.fillRect(-10, -34, 20, 18);
  ctx.fillRect(-8, -36, 16, 3);

  if (facingDir === 'up') {
    // Vista trasera del cabello con textura y volumen
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 16);
    ctx.fillRect(-7, -35, 14, 2);
    // Reflejo cenital
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -34, 10, 2);
    // Sombra del cuello
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-4, -18, 8, 2);
  } else if (facingDir === 'down') {
    // Rostro frontal
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -27, 16, 11);
    // Sombra bajo el cabello
    ctx.fillStyle = '#d49b6a';
    ctx.fillRect(-8, -27, 16, 2);

    // Cabello superior con flequillo
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 8);
    ctx.fillRect(-7, -35, 14, 2);
    // Mechones laterales y flequillo
    ctx.fillRect(-9, -27, 3, 6);
    ctx.fillRect(6, -27, 3, 6);
    ctx.fillRect(-3, -27, 2, 3);
    ctx.fillRect(1, -27, 2, 3);

    // Brillo cenital del cabello
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -34, 8, 2);

    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      // Visor vectorial cian brillante
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-8, -25, 16, 6);
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(-7, -24, 14, 4);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(-6, -23, 12, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -23, 4, 1);
    } else {
      // Ojos anime GBA con pupila y destello blanco
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-6, -23, 4, 5);
      ctx.fillRect(2, -23, 4, 5);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5, -22, 2, 3);
      ctx.fillRect(3, -22, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -23, 1, 2);
      ctx.fillRect(3, -23, 1, 2);
    }
  } else if (facingDir === 'right') {
    // Perfil derecho
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -27, 14, 11);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 8);
    ctx.fillRect(-7, -35, 14, 2);
    ctx.fillRect(-9, -27, 7, 9);
    ctx.fillRect(-2, -27, 3, 3);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -34, 8, 2);

    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(0, -25, 9, 6);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(1, -24, 7, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -23, 3, 1);
    } else {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(2, -23, 4, 5);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(3, -22, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, -23, 1, 2);
    }
  } else {
    // Perfil izquierdo
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -27, 14, 11);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 8);
    ctx.fillRect(-7, -35, 14, 2);
    ctx.fillRect(2, -27, 7, 9);
    ctx.fillRect(-1, -27, 3, 3);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -34, 8, 2);

    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-9, -25, 9, 6);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(-8, -24, 7, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -23, 3, 1);
    } else {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-6, -23, 4, 5);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5, -22, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -23, 1, 2);
    }
  }

  // Parpadeo breve y espaciado para dar vida al reposo sin distraer al caminar.
  if (idleBlink && facingDir === 'down') {
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -22, 4, 2);
    ctx.fillRect(2, -22, 4, 2);
  } else if (idleBlink && facingDir === 'right') {
    ctx.fillStyle = skin;
    ctx.fillRect(2, -22, 4, 2);
  } else if (idleBlink && facingDir === 'left') {
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -22, 4, 2);
  }

  // Corona Dorada del Origen (Cosmético de Arquitecto)
  if (opts?.equippedCosmetic === 'item-manto-arquitecto') {
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-8, -41, 16, 8);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-7, -39, 14, 5);
    ctx.fillRect(-7, -41, 3, 3);
    ctx.fillRect(-1, -42, 2, 4);
    ctx.fillRect(4, -41, 3, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-1, -38, 2, 2);
  }

  if (appearance && !transformation) drawAvatarOutfit(ctx, appearance.outfitId);
  if (transformation) drawAvatarTransformation(ctx, transformation, t);
  if (appearance?.accessories.length) drawAvatarAccessories(ctx, appearance.accessories, facingDir);

  ctx.restore();
}

/** Cofre de tesoro arqueológico con riqueza de madera y herrajes GBA */
export function drawRpgTreasureChest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opened: boolean,
  accentHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-15, 4, 30, 6);

  // Contorno negro GBA
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-15, -19, 30, 24);

  // Cuerpo de roble tostado con vetas
  ctx.fillStyle = opened ? '#3f2b1d' : '#8b4e20';
  ctx.fillRect(-13, -11, 26, 14);
  ctx.fillStyle = opened ? '#281a10' : '#683612';
  ctx.fillRect(-13, 0, 26, 3);

  // Tapa abombada del cofre
  if (opened) {
    // Tapa abierta hacia atrás: interior de terciopelo y bisagras
    ctx.fillStyle = '#1e140d';
    ctx.fillRect(-13, -17, 26, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-11, -15, 22, 4);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-4, -14, 8, 2);
  } else {
    // Tapa cerrada con curvatura y reflejo de barniz
    ctx.fillStyle = '#b4672e';
    ctx.fillRect(-13, -17, 26, 7);
    ctx.fillStyle = '#d98b4c';
    ctx.fillRect(-13, -17, 26, 2);
  }

  // Bandas de refuerzo de oro / latón y cerradura
  ctx.fillStyle = opened ? '#64748b' : '#facc15';
  ctx.fillRect(-13, -12, 26, 3);
  ctx.fillRect(-10, -17, 3, 20);
  ctx.fillRect(7, -17, 3, 20);

  // Cerradura central con bocallave
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-4, -13, 8, 7);
  ctx.fillStyle = opened ? '#94a3b8' : '#fde047';
  ctx.fillRect(-3, -12, 6, 5);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-1, -11, 2, 3);

  // Destello de tesoro esperando ser abierto
  if (!opened && !reducedMotion && Math.floor(elapsed * 3) % 2 === 0) {
    ctx.fillStyle = accentHex;
    ctx.fillRect(-1, -13, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -12, 1, 1);
  }

  ctx.restore();
}

/** Gabinete de arcade Pong 1972 con lateral de madera noble y monitor CRT vivo */
function drawPong1972CabinetWorld(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  restored: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Tarima ceremonial de losas sobre la pradera
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-46, -10, 92, 36);
  ctx.fillStyle = '#d9b878';
  ctx.fillRect(-42, -6, 84, 28);
  ctx.fillStyle = '#f3e2be';
  ctx.fillRect(-42, -6, 84, 3);
  ctx.fillStyle = '#9c7b44';
  ctx.fillRect(-38, 0, 76, 18);

  // Mueble arcade vertical Atari 1972: laterales de nogal y perfil amarillo
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-24, -64, 48, 66);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-22, -62, 44, 62);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-18, -60, 36, 58);
  ctx.fillStyle = '#a16207';
  ctx.fillRect(-17, -59, 4, 56);

  // Marquesina retroiluminada PONG
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, -58, 36, 12);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-16, -56, 32, 8);
  ctx.fillStyle = '#070b14';
  ctx.font = '900 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PONG', 0, -50);

  // Monitor CRT curvo con fósforo verde/negro
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-17, -44, 34, 26);
  ctx.fillStyle = restored ? '#062817' : '#0f172a';
  ctx.fillRect(-15, -42, 30, 22);

  // Partido de Pong animado en tiempo real
  const bx = Math.round(Math.sin(elapsed * 4.5) * 9);
  const by = Math.round(Math.cos(elapsed * 3.1) * 5);
  ctx.fillStyle = '#ffffff';
  // Paletas izquierda y derecha
  ctx.fillRect(-12, -36, 2, 9);
  ctx.fillRect(10, -36 + (by > 0 ? 2 : -2), 2, 9);
  // Red discontinua central
  for (let ny = -40; ny < -22; ny += 4) {
    ctx.fillRect(-0.5, ny, 1, 2);
  }
  // Pelota cuadrada
  ctx.fillRect(bx - 1, -33 + by, 3, 3);

  // Monedero de latón con ranuras para 25 centavos
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-10, -14, 20, 12);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-8, -12, 16, 8);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-5, -9, 3, 2);
  ctx.fillRect(2, -9, 3, 2);

  ctx.restore();
}

/** Gabinete de arcade Space Invaders 1978 con mueble upright y pantalla espacial */
function drawSpaceInvaders1978CabinetWorld(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  restored: boolean,
  unlocked: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Pedestal de basalto volcánico esculpido
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-48, -10, 96, 36);
  ctx.fillStyle = '#3f2832';
  ctx.fillRect(-44, -6, 88, 28);
  ctx.fillStyle = '#5c3d4b';
  ctx.fillRect(-44, -6, 88, 3);
  ctx.fillStyle = restored ? '#22c55e' : unlocked ? '#f97316' : '#64748b';
  ctx.fillRect(-40, 14, 80, 4);

  // Mueble arcade upright crema y naranja 1978
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-26, -68, 52, 70);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-24, -66, 48, 66);
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-22, -64, 44, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-20, -48, 40, 46);

  // Marquesina retroiluminada de marcianos
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-20, -64, 40, 12);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-18, -62, 36, 8);
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 6px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('INVADERS', 0, -56);

  // Pantalla CRT espacial con invasores pixelados marchando
  ctx.fillStyle = '#050a14';
  ctx.fillRect(-16, -46, 32, 24);
  const shift = Math.floor(elapsed * 2) % 2 === 0 ? -2 : 2;
  ctx.fillStyle = unlocked ? '#4ade80' : '#94a3b8';
  for (let ix = -9; ix <= 7; ix += 8) {
    // Marciano fila 1
    ctx.fillRect(ix + shift, -42, 4, 3);
    // Marciano fila 2
    ctx.fillRect(ix - shift, -36, 4, 3);
  }
  // Cañón láser defensor en la base de la pantalla
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-3, -28, 6, 3);
  ctx.fillRect(-1, -30, 2, 2);

  ctx.restore();
}

type NorthArcadeId = 'breakout' | 'asteroids' | 'seaWolf' | 'tank' | 'lunarLander' | 'galaxian';

/** Rutas legibles y pequeñas plazas temáticas del cruce septentrional. */
function drawNorthernArcadeDistrict(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const { junction: j, arcades: a } = NORTH_ARCADE_LAYOUT;
  const road = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#171b22'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#687078'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#89908e'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = '#59625f';
    for (let tx = x + 8; tx < x + w - 4; tx += 24) ctx.fillRect(tx, y + Math.floor(h / 2), 10, 2);
    for (let ty = y + 8; ty < y + h - 4; ty += 24) ctx.fillRect(x + Math.floor(w / 2), ty, 2, 10);
  };
  road(1896, -552, 112, 232);
  road(1896, -176, 112, 336);
  road(2032, -296, 256, 112);
  road(1568, -296, 304, 112);
  ctx.fillStyle = '#342c25'; ctx.fillRect(j.x - 80, j.y - 80, 160, 160);
  ctx.fillStyle = '#a88955'; ctx.fillRect(j.x - 76, j.y - 76, 152, 152);
  ctx.fillStyle = '#686d69'; ctx.fillRect(j.x - 68, j.y - 68, 136, 136);
  ctx.fillStyle = '#9b8a64'; ctx.fillRect(j.x - 58, j.y - 58, 116, 116);
  ctx.fillStyle = '#4a514d';
  for (let x = j.x - 52; x <= j.x + 44; x += 24) {
    ctx.fillRect(x, j.y - 44, 16, 2); ctx.fillRect(x, j.y + 42, 16, 2);
  }

  // Cuatro pequeñas áreas de juego a los extremos de los caminos.
  const alcove = (x: number, y: number, fill: string, edge: string) => {
    ctx.fillStyle = '#171a1c'; ctx.fillRect(x - 42, y - 28, 84, 56);
    ctx.fillStyle = edge; ctx.fillRect(x - 38, y - 24, 76, 48);
    ctx.fillStyle = fill; ctx.fillRect(x - 34, y - 20, 68, 40);
  };
  alcove(a.seaWolf.x, a.seaWolf.y, '#2d7883', '#a5d6c7');
  for (let i = 0; i < 4; i++) {
    const wave = Math.round(Math.sin(elapsed * 2 + i) * 2);
    ctx.fillStyle = i % 2 ? '#5dc1c1' : '#d3e9bc';
    ctx.fillRect(a.seaWolf.x - 30 + i * 18, a.seaWolf.y + 13 + wave, 10, 2);
  }
  alcove(a.tank.x, a.tank.y, '#745b39', '#d6bd7c');
  ctx.fillStyle = '#3c4633';
  for (let i = 0; i < 3; i++) {
    const ox = a.tank.x - 24 + i * 22;
    ctx.fillRect(ox, a.tank.y - 13, 12, 3); ctx.fillRect(ox + 4, a.tank.y + 7, 16, 3);
  }
  alcove(a.lunarLander.x, a.lunarLander.y, '#777b7d', '#c5c2a8');
  ctx.fillStyle = '#d7d1b1';
  for (const [dx, dy, r] of [[-22, -8, 6], [8, 8, 9], [23, -10, 4]] as const) {
    ctx.fillRect(a.lunarLander.x + dx, a.lunarLander.y + dy, r * 2, 3);
    ctx.fillRect(a.lunarLander.x + dx + 3, a.lunarLander.y + dy - 2, r, 2);
  }
  alcove(a.galaxian.x, a.galaxian.y, '#1e1b4b', '#f43f5e');
  ctx.fillStyle = '#facc15';
  ctx.fillRect(a.galaxian.x - 12, a.galaxian.y + 8, 24, 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(a.galaxian.x - 18, a.galaxian.y + 14, 36, 2);

  // Placas de latón guían al jugador desde el centro hacia cada descubrimiento.
  ctx.fillStyle = '#47351f'; ctx.fillRect(j.x - 10, j.y - 10, 20, 20);
  ctx.fillStyle = '#e5cc8a'; ctx.fillRect(j.x - 6, j.y - 6, 12, 12);
}

/** Gabinetes originales de siluetas CRT diferentes para el cruce norte. */
function drawNorthernArcadeCabinet(
  ctx: CanvasRenderingContext2D,
  id: NorthArcadeId,
  wx: number,
  wy: number,
  elapsed: number,
  restored: boolean
): void {
  const palettes: Record<NorthArcadeId, { body: string; trim: string; screen: string; glow: string; title: string }> = {
    breakout: { body: '#ead9ad', trim: '#bd7138', screen: '#16352c', glow: '#fff1a6', title: 'BREAKOUT' },
    asteroids: { body: '#373d43', trim: '#9ad7c8', screen: '#061923', glow: '#b6fff0', title: 'ASTEROIDS' },
    seaWolf: { body: '#d6d1b5', trim: '#286b70', screen: '#092c36', glow: '#8df5db', title: 'SEA WOLF' },
    tank: { body: '#65513a', trim: '#b1a165', screen: '#1d281c', glow: '#d9dc80', title: 'TANK' },
    lunarLander: { body: '#d4d1c5', trim: '#777b80', screen: '#131a2b', glow: '#f2edc4', title: 'LUNAR' },
    galaxian: { body: '#1e1b4b', trim: '#f43f5e', screen: '#08051a', glow: '#facc15', title: 'GALAXIAN' },
  };
  const p = palettes[id];
  ctx.save(); ctx.translate(Math.round(wx), Math.round(wy));
  ctx.fillStyle = 'rgba(9,10,12,.58)'; ctx.fillRect(-35, 8, 70, 11); ctx.fillRect(-29, 6, 58, 15);
  ctx.fillStyle = '#34261b'; ctx.fillRect(-36, -2, 72, 12);
  ctx.fillStyle = '#9e8052'; ctx.fillRect(-33, -1, 66, 9);
  ctx.fillStyle = '#17191c'; ctx.fillRect(-24, -68, 48, 68);
  ctx.fillStyle = p.body; ctx.fillRect(-21, -65, 42, 63);
  ctx.fillStyle = p.trim; ctx.fillRect(-19, -63, 38, 12);
  ctx.fillStyle = '#201a17'; ctx.fillRect(-18, -61, 36, 8);
  ctx.fillStyle = p.glow; ctx.font = 'bold 5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(p.title, 0, -55);
  // Sea Wolf tiene el periscopio distintivo; el resto conserva marquesina upright.
  if (id === 'seaWolf') {
    ctx.fillStyle = '#25272a'; ctx.fillRect(-12, -78, 24, 10); ctx.fillRect(-8, -70, 16, 8);
    ctx.fillStyle = '#b3b7a1'; ctx.fillRect(-10, -76, 20, 4);
  }
  ctx.fillStyle = '#11171b'; ctx.fillRect(-16, -47, 32, 25);
  ctx.fillStyle = restored ? (id === 'galaxian' ? '#0b0c26' : '#0f3c2c') : p.screen; ctx.fillRect(-14, -45, 28, 21);
  ctx.fillStyle = p.glow;
  if (id === 'breakout') {
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) ctx.fillRect(-12 + col * 5, -42 + row * 4, 4, 2);
    ctx.fillRect(-5, -27, 10, 2); ctx.fillRect(-1, -31, 2, 2);
  } else if (id === 'asteroids') {
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8,-38); ctx.lineTo(-4,-43); ctx.lineTo(1,-40); ctx.lineTo(0,-35); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8,-30); ctx.lineTo(11,-34); ctx.lineTo(14,-30); ctx.closePath(); ctx.stroke();
    ctx.fillRect(-1,-29,2,4); ctx.fillRect(-4,-27,8,1);
  } else if (id === 'seaWolf') {
    ctx.fillRect(-11,-34,22,1); ctx.fillRect(-7,-38,12,2); ctx.fillRect(2,-41,2,13);
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(2,-35,7,Math.PI,Math.PI*2); ctx.stroke();
  } else if (id === 'tank') {
    ctx.fillStyle = '#536344'; ctx.fillRect(-11,-41,7,2); ctx.fillRect(4,-36,8,2); ctx.fillRect(-7,-29,9,2);
    ctx.fillStyle = p.glow; ctx.fillRect(-1,-35,5,5); ctx.fillRect(1,-39,2,4); ctx.fillRect(4,-37,4,1);
  } else if (id === 'galaxian') {
    // Galaxian Flagship and Fighter
    ctx.fillStyle = '#facc15'; ctx.fillRect(-3, -42, 6, 3); ctx.fillRect(-1, -44, 2, 2);
    ctx.fillStyle = '#f43f5e'; ctx.fillRect(-7, -37, 4, 2); ctx.fillRect(3, -37, 4, 2);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(-2, -28, 4, 4); ctx.fillRect(0, -31, 1, 3);
  } else {
    ctx.fillRect(-2,-43,4,2); ctx.fillRect(-5,-41,10,3); ctx.fillRect(-8,-37,16,1);
    ctx.fillRect(-6,-32,3,1); ctx.fillRect(4,-29,4,1);
    const blink = Math.floor(elapsed * 3) % 2;
    ctx.fillRect(-1,-34 + blink,2,3);
  }
  // Control deck, joystick, buttons and side-lit bevels.
  ctx.fillStyle = '#211b16'; ctx.fillRect(-18, -20, 36, 12);
  ctx.fillStyle = p.trim; ctx.fillRect(-15, -18, 30, 7);
  ctx.fillStyle = '#17191c'; ctx.fillRect(-8, -16, 3, 3); ctx.fillRect(4, -16, 3, 2); ctx.fillRect(9, -16, 3, 2);
  ctx.fillStyle = '#e9d49e'; ctx.fillRect(-7, -18, 1, 3);
  ctx.fillStyle = p.trim; ctx.fillRect(-21, -63, 2, 59); ctx.fillRect(19, -63, 2, 59);
  ctx.fillStyle = restored ? '#61db90' : p.glow; ctx.fillRect(-23, 0, 46, 2);
  ctx.restore();
}

function drawVolcanicGuard(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number, approved: boolean): void {
  const step = Math.floor(elapsed * 2) % 2;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = 'rgba(5, 8, 12, .48)'; ctx.fillRect(-14, 0, 28, 6);
  // Botas altas y pantalón ignífugo con bandas reflectantes.
  ctx.fillStyle = '#15191c'; ctx.fillRect(-10, -8 + step, 8, 9); ctx.fillRect(2, -8 - step, 8, 9);
  ctx.fillStyle = '#f2a51a'; ctx.fillRect(-10, -6 + step, 8, 2); ctx.fillRect(2, -6 - step, 8, 2);
  ctx.fillStyle = '#351b17'; ctx.fillRect(-11, -25, 22, 20);
  ctx.fillStyle = '#9b321f'; ctx.fillRect(-10, -24, 20, 18);
  ctx.fillStyle = '#e66a22'; ctx.fillRect(-8, -23, 16, 14);
  ctx.fillStyle = '#f7bd35'; ctx.fillRect(-9, -19, 18, 4); ctx.fillRect(-3, -24, 6, 15);
  ctx.fillStyle = '#22282b'; ctx.fillRect(-14, -23, 5, 15); ctx.fillRect(9, -23, 5, 15);
  ctx.fillStyle = '#e66a22'; ctx.fillRect(-14, -11, 5, 5); ctx.fillRect(9, -11, 5, 5);
  // Casco integral, respirador frontal, visor tintado y mangueras laterales.
  ctx.fillStyle = '#181c20'; ctx.fillRect(-11, -39, 22, 16); ctx.fillRect(-13, -36, 26, 9);
  ctx.fillStyle = '#e66a22'; ctx.fillRect(-10, -38, 20, 5); ctx.fillRect(-13, -35, 3, 8); ctx.fillRect(10, -35, 3, 8);
  ctx.fillStyle = '#9fe8e0'; ctx.fillRect(-8, -32, 16, 5);
  ctx.fillStyle = '#274e52'; ctx.fillRect(-6, -31, 11, 3);
  ctx.fillStyle = '#d9d6c4'; ctx.fillRect(-5, -25, 10, 5);
  ctx.fillStyle = '#374348'; ctx.fillRect(-3, -24, 6, 3); ctx.fillRect(-2, -20, 4, 2);
  ctx.fillStyle = '#f5c34b'; ctx.fillRect(-12, -40, 24, 3); ctx.fillRect(-8, -43, 16, 3);
  ctx.fillStyle = '#fff0b5'; ctx.fillRect(-8, -42, 5, 1);
  if (approved) {
    // Brazo alzado en saludo de aprobación.
    ctx.fillStyle = '#e66a22'; ctx.fillRect(12, -34, 7, 8); ctx.fillRect(16, -42, 5, 10);
    ctx.fillStyle = '#f7bd35'; ctx.fillRect(16, -44, 5, 4);
  } else {
    ctx.fillStyle = '#c8c4ad'; ctx.fillRect(-3, -16, 6, 3);
  }
  ctx.restore();
}

function drawBreakoutLegendStone(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number, extracted: boolean, extracting: boolean): void {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = 'rgba(4, 6, 9, .56)'; ctx.fillRect(-33, 14, 66, 9);
  // Silueta irregular de basalto, vetas y cristales cobrizos.
  ctx.fillStyle = '#100d12'; ctx.fillRect(-29, -21, 58, 39); ctx.fillRect(-23, -27, 46, 6); ctx.fillRect(-35, -13, 6, 24); ctx.fillRect(29, -12, 6, 22);
  ctx.fillStyle = '#352831'; ctx.fillRect(-27, -19, 54, 34); ctx.fillRect(-21, -25, 42, 6); ctx.fillRect(-33, -11, 6, 20); ctx.fillRect(27, -10, 6, 19);
  ctx.fillStyle = '#58414a'; ctx.fillRect(-22, -22, 18, 4); ctx.fillRect(7, -18, 14, 3); ctx.fillRect(-27, -8, 4, 11);
  ctx.fillStyle = '#170f14'; ctx.fillRect(-18, -4, 4, 15); ctx.fillRect(8, -1, 3, 12);
  ctx.fillStyle = '#b84b22'; ctx.fillRect(-20, 0, 2, 7); ctx.fillRect(11, 1, 2, 7);
  ctx.fillStyle = '#f5bb44'; ctx.fillRect(-27, 8, 4, 3); ctx.fillRect(23, -13, 3, 4); ctx.fillRect(16, 11, 3, 2);
  const lift = extracting ? 24 + Math.round(Math.sin(elapsed * 9) * 4) : extracted ? 46 : 0;
  if (!extracted || extracting) {
    ctx.fillStyle = 'rgba(249, 115, 22, .22)';
    if (extracting) ctx.fillRect(-16, -54 - lift, 32, 45);
    ctx.fillStyle = '#17252b'; ctx.fillRect(-4, -27 - lift, 8, 25);
    ctx.fillStyle = '#50b7c5'; ctx.fillRect(-2, -26 - lift, 4, 21);
    ctx.fillStyle = '#273038'; ctx.fillRect(-16, -34 - lift, 32, 10);
    ctx.fillStyle = '#11191e'; ctx.fillRect(-18, -36 - lift, 36, 12);
    ctx.fillStyle = '#f6c74c'; ctx.fillRect(-15, -33 - lift, 30, 6);
    ctx.fillStyle = '#fff4bc'; ctx.fillRect(-13, -32 - lift, 26, 2);
    ctx.fillStyle = '#df7729'; ctx.fillRect(-6, -24 - lift, 12, 4);
  }
  ctx.restore();
}

/** Gabinete de arcade con manillar de motocicleta para Night Driver (1976). */
function drawNightDriverArcadeTerminal(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  elapsed: number,
  restored: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(wx), Math.round(wy));

  // Base shadow
  ctx.fillStyle = 'rgba(5, 8, 12, 0.55)';
  ctx.fillRect(-32, 6, 64, 12);

  // Cabinet body (Chasis negro y cian con líneas de carreras)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-22, -64, 44, 66);
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(-20, -62, 40, 14);

  // Marquee "NIGHT DRIVER"
  ctx.fillStyle = '#020617';
  ctx.fillRect(-18, -60, 36, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NIGHT DRV', 0, -53);

  // CRT Screen
  ctx.fillStyle = '#05070d';
  ctx.fillRect(-16, -46, 32, 24);
  ctx.fillStyle = restored ? '#082f49' : '#020408';
  ctx.fillRect(-14, -44, 28, 20);

  // Road posts on screen
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-10, -32, 2, 4);
  ctx.fillRect(8, -32, 2, 4);
  ctx.fillRect(-6, -38, 1, 2);
  ctx.fillRect(5, -38, 1, 2);

  // Motorcycle Handlebars mounted to front deck
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-18, -20, 36, 12);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, -14);
  ctx.lineTo(-4, -10);
  ctx.lineTo(4, -10);
  ctx.lineTo(16, -14);
  ctx.stroke();

  // Headlight beam glow
  const blink = (Math.sin(elapsed * 6) + 1) * 0.5;
  ctx.fillStyle = restored ? `rgba(56, 189, 248, ${0.4 + blink * 0.3})` : 'rgba(250, 204, 21, 0.35)';
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(6, -10);
  ctx.lineTo(16, 8);
  ctx.lineTo(-16, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Dibuja al técnico Dylan acompañando físicamente al jugador (compañero de escolta). */
function drawEscortDylan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 'up' | 'down' | 'left' | 'right' | string,
  walking: boolean,
  elapsed: number
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const step = walking ? Math.floor(elapsed * 6) % 2 : 0;
  const bob = walking ? (step === 0 ? -1 : 0) : 0;

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(5, 8, 12, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Botas de trabajo
  ctx.fillStyle = '#331100';
  ctx.fillRect(-6, -5 + step, 5, 6);
  ctx.fillRect(1, -5 + (1 - step), 5, 6);

  // Mono de trabajo / Overall de mecánico (Naranja retro con cincha azul)
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(-7, -20 + bob, 14, 16);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-5, -17 + bob, 10, 3);

  // Cabeza y rostro de Dylan
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(-5, -28 + bob, 10, 9);

  // Cabello castaño despeinado con visera
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-6, -32 + bob, 12, 5);
  ctx.fillRect(-6, -29 + bob, 3, 4);

  // Ojos según dirección
  ctx.fillStyle = '#0f172a';
  if (facing === 'right') {
    ctx.fillRect(0, -25 + bob, 2, 2);
    ctx.fillRect(3, -25 + bob, 2, 2);
  } else if (facing === 'left') {
    ctx.fillRect(-5, -25 + bob, 2, 2);
    ctx.fillRect(-2, -25 + bob, 2, 2);
  } else if (facing === 'down') {
    ctx.fillRect(-3, -25 + bob, 2, 2);
    ctx.fillRect(1, -25 + bob, 2, 2);
  }

  // Llave inglesa / herramienta en la mano de Dylan
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(6, -18 + bob, 3, 8);
  ctx.fillRect(5, -20 + bob, 5, 3);
  ctx.fillStyle = '#020617';
  ctx.fillRect(7, -19 + bob, 1, 1);

  // Bocadillo sutil "Técnico Dylan" flotando
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DYLAN', 0, -36 + bob);

  ctx.restore();
}

function drawVolcanicFortressDetails(ctx: CanvasRenderingContext2D, elapsed: number, gateOpen: boolean): void {
  // Formaciones de basalto en los márgenes del patio, lejos de los pasos y los frentes de las máquinas.
  const rocks = [
    { x: 2660, y: 486, s: 1 }, { x: 3128, y: 528, s: 1.2 },
    { x: 2650, y: 898, s: 1.2 }, { x: 3118, y: 884, s: 1 },
  ];
  for (const rock of rocks) {
    const s = rock.s;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(rock.x - 22*s, rock.y + 4, 44*s, 8);
    ctx.fillStyle = '#171319'; ctx.fillRect(rock.x - 18*s, rock.y - 12*s, 36*s, 18*s); ctx.fillRect(rock.x - 11*s, rock.y - 21*s, 23*s, 12*s);
    ctx.fillStyle = '#503743'; ctx.fillRect(rock.x - 15*s, rock.y - 12*s, 29*s, 14*s); ctx.fillRect(rock.x - 8*s, rock.y - 18*s, 17*s, 7*s);
    ctx.fillStyle = '#8c5960'; ctx.fillRect(rock.x - 8*s, rock.y - 17*s, 10*s, 2); ctx.fillRect(rock.x - 14*s, rock.y - 8*s, 8*s, 2);
    ctx.fillStyle = '#f05a27'; ctx.fillRect(rock.x + 5*s, rock.y - 4*s, 2, 6);
  }
  // Fisuras pequeñas, de borde amarillo y núcleo incandescente, incrustadas en el basalto.
  const cracks = [[2700, 512], [3068, 594], [2658, 782], [3090, 846]] as const;
  for (let i = 0; i < cracks.length; i++) {
    const [x, y] = cracks[i];
    ctx.fillStyle = '#170d12'; ctx.fillRect(x, y, 34, 4); ctx.fillRect(x + 12, y - 5, 3, 12);
    ctx.fillStyle = i % 2 === 0 ? '#e65325' : '#f18725'; ctx.fillRect(x + 2, y + 1, 27, 2); ctx.fillRect(x + 13, y - 3, 2, 9);
    ctx.fillStyle = '#ffd45b'; ctx.fillRect(x + 6 + (Math.floor(elapsed * 2) % 4), y + 1, 7, 1);
  }
  if (!gateOpen) {
    const gx = VOLCANIC_ARCADE_LAYOUT.accessGateX;
    ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fillRect(gx - 8, 380, 18, 572);
    ctx.fillStyle = '#20151b'; ctx.fillRect(gx - 5, 368, 10, 592);
    ctx.fillStyle = '#7b3025'; ctx.fillRect(gx - 2, 368, 4, 592);
    for (let y = 376; y < 950; y += 40) {
      ctx.fillStyle = y % 80 === 16 ? '#f7c145' : '#e15b2f';
      ctx.fillRect(gx - 9, y, 18, 5);
      ctx.fillStyle = '#130f14'; ctx.fillRect(gx - 4, y + 8, 8, 10);
    }
    ctx.fillStyle = '#ffb52f'; ctx.fillRect(gx - 15, 668, 30, 36);
    ctx.fillStyle = '#20151b'; ctx.fillRect(gx - 12, 671, 24, 30);
    ctx.fillStyle = '#ffe28a'; ctx.font = 'bold 5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('ZONA', gx, 682); ctx.fillText('DE RIESGO', gx, 690);
  }
}

/**
 * TABLA FLOTANTE DE PONG (1972) ESTILO GBA SCI-FI VINTAGE
 * - Chasis aerodinámico con palas de Pong en los extremos, carcasa marfil/crema con biseles sombreados
 * - Pista central de Pong con fósforo cian, pelota luminosa animada y red de puntos
 * - Almohadillas de tracción de goma texturizada para las botas del héroe
 * - Retropropulsores de plasma con aura pulsante sobre el suelo
 */
export function drawPongHoverboard(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  tilt: number,
  mounted: boolean,
  elapsed: number,
  skinColor: string,
  hairColor: string,
  shirtColor: string,
  reducedMotion: boolean,
  appearance?: AvatarAppearance
): void {
  const hover = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 5.2) * 2.5);
  const px = Math.round(hx);
  const py = Math.round(hy + hover);

  ctx.save();
  ctx.translate(px, py);
  if (tilt !== 0) ctx.rotate(tilt);

  // Sombra elíptica suave en el suelo con escala según la altura
  const shadowDist = 10 - hover;
  ctx.fillStyle = 'rgba(5, 8, 14, 0.42)';
  ctx.fillRect(-26, shadowDist, 52, 6);
  ctx.fillRect(-20, shadowDist - 1, 40, 8);

  // Aura de plasma inferior proyectada por los antigravitatorios
  const glowPulse = reducedMotion ? 0.3 : 0.25 + 0.15 * Math.sin(elapsed * 8);
  ctx.fillStyle = `rgba(56, 189, 248, ${glowPulse})`;
  ctx.fillRect(-22, 4, 44, 4);
  ctx.fillStyle = `rgba(0, 243, 255, ${glowPulse * 1.5})`;
  ctx.fillRect(-14, 5, 28, 2);

  // Toberas de levitación magnética inferiores
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, 2, 8, 4);
  ctx.fillRect(10, 2, 8, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-16, 2, 4, 3);
  ctx.fillRect(12, 2, 4, 3);

  // Contorno exterior nítido estilo GBA
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-27, -5, 54, 9);
  ctx.fillRect(-25, -6, 50, 11);
  ctx.fillRect(-28, -3, 56, 5);

  // Carcasa aerodinámica principal (marfil vintage de consola de los 70)
  ctx.fillStyle = '#f8f5e6';
  ctx.fillRect(-26, -4, 52, 7);
  // Bisel de luz superior
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-24, -5, 48, 2);
  // Bisel de sombra inferior
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-25, 1, 50, 2);

  // Paragolpes / palas de Pong en los extremos (estilo paleta analógica 1972)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-26, -4, 5, 7);
  ctx.fillRect(21, -4, 5, 7);
  ctx.fillStyle = '#f26419';
  ctx.fillRect(-25, -3, 3, 5);
  ctx.fillRect(22, -3, 3, 5);

  // Almohadillas de goma antideslizantes para los pies de Pixel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-18, -3, 10, 5);
  ctx.fillRect(8, -3, 10, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-16, -2, 6, 3);
  ctx.fillRect(10, -2, 6, 3);

  // Pista central de Pong incrustada en el chasis
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-6, -4, 12, 7);
  // Red discontinua de Pong
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-1, -3, 2, 1);
  ctx.fillRect(-1, -1, 2, 1);
  ctx.fillRect(-1, 1, 2, 1);

  // Pelota de Pong luminosa oscilando de lado a lado
  const ballOffset = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 6) * 4);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(ballOffset - 1, -2, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ballOffset, -2, 1, 1);

  // Si Pixel está montado sobre la tabla
  if (mounted) {
    drawPixelAvatar4Dir(
      ctx,
      0,
      -3,
      tilt < 0 ? 'up' : 'down',
      false,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      { reducedMotion, appearance }
    );
  }

  ctx.restore();
}

/**
 * LANZADERA ESTELAR (SPACE INVADERS 1978) ESTILO GBA RPG
 * - Fuselaje delta aerodinámico con placas cerámicas esmaltadas y biselado de sombras
 * - Cabina de mando en cúpula ahumada con reflejos de luz y cuadro de instrumentos
 * - Alerones laterales con franjas de carreras retro (rojo y azul) y luces de navegación
 * - Toberas dobles de propulsión con estela de fuego escalonado en 4 tonos
 */
function drawStarShuttle(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  scale: number,
  tilt: number,
  thrustersOn: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.scale(scale, scale);
  if (tilt !== 0) ctx.rotate(tilt);

  // Sombra de contacto en plataforma
  ctx.fillStyle = 'rgba(5, 8, 14, 0.46)';
  ctx.fillRect(-34, 12, 68, 10);
  ctx.fillRect(-26, 10, 52, 14);

  // Silueta base exterior
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-36, -18, 72, 30);
  ctx.fillRect(-28, -26, 56, 42);
  ctx.fillRect(-14, -34, 28, 52);
  ctx.fillRect(-6, -38, 12, 8);

  // Fuselaje principal: placas cerámicas blancas y grises
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-34, -16, 68, 26);
  ctx.fillRect(-26, -24, 52, 38);
  ctx.fillRect(-12, -32, 24, 48);

  // Reflejos de luz en el flanco izquierdo (sol cenital)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-12, -32, 4, 46);
  ctx.fillRect(-24, -22, 6, 32);
  ctx.fillRect(-32, -14, 8, 22);

  // Sombreado de volumen en el flanco derecho
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(8, -32, 4, 46);
  ctx.fillRect(18, -22, 6, 32);
  ctx.fillRect(24, -14, 8, 22);

  // Franjas aerodinámicas de carreras estilo 70s
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-22, -12, 44, 4);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-20, -6, 40, 4);

  // Luces estroboscópicas en las puntas de las alas
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-34, -8, 3, 4);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(31, -8, 3, 4);

  // Cúpula de la cabina de mando (cristal ahumado con reflejo y HUD verde)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-10, -22, 20, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-8, -20, 16, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-6, -19, 4, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-6, -19, 2, 2);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(1, -16, 4, 3);

  // Alerón vertical / timón con emblema retro
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-4, 0, 8, 14);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-3, 1, 6, 12);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, 3, 4, 4);

  // Toberas de propulsión traseras
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-22, 12, 14, 8);
  ctx.fillRect(8, 12, 14, 8);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-20, 14, 10, 5);
  ctx.fillRect(10, 14, 10, 5);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-18, 16, 6, 3);
  ctx.fillRect(12, 16, 6, 3);

  // Estelas de propulsión de cohete
  if (thrustersOn) {
    // Llamarada izquierda
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, 19, 6, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-20, 23, 10, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-19, 29, 8, 8);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-17, 35, 4, 6);

    // Llamarada derecha
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 19, 6, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(10, 23, 10, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(11, 29, 8, 8);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(13, 35, 4, 6);
  }

  ctx.restore();
}

/**
 * SPRITE DE PERSONAJES NO JUGABLES (NPCs) ESTILO GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO)
 * - Proporciones estándar GBA de 16×24 píxeles lógicos con contornos nítidos y paletas ricas
 * - Sombra elíptica de contacto en suelo
 * - Ropa con luces, sombras de pliegues, cinturones y accesorios de profesión
 * - Rasgos faciales anime con ojos definidos y destellos blancos
 * - Sombreros y atuendos personalizados según el rol de cada cronista, arqueólogo o explorador
 * - Animación sutil de respiración o balanceo rítmico
 */
function drawGbaNpcSprite(
  ctx: CanvasRenderingContext2D,
  npc: IslandNpcSpec,
  elapsed: number,
  reducedMotion: boolean,
  animFrame4: number
): void {
  const nbob = reducedMotion ? 0 : (animFrame4 + Math.floor(npc.x * 0.05)) % 2 === 0 ? 0 : -1;
  const x = Math.round(npc.x);
  const y = Math.round(npc.y + nbob);

  ctx.save();
  ctx.translate(x, y);

  // 1. Sombra de contacto en el suelo
  ctx.fillStyle = 'rgba(5, 8, 14, 0.44)';
  ctx.fillRect(-8, 2, 16, 5);
  ctx.fillRect(-6, 1, 12, 7);

  // 2. Calzado / botas (estilo explorador con suela de cuero y puntera iluminada)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-7, 0, 5, 5);
  ctx.fillRect(2, 0, 5, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, 1, 3, 3);
  ctx.fillRect(3, 1, 3, 3);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-6, 1, 2, 1);
  ctx.fillRect(3, 1, 2, 1);

  // 3. Pantalones / piernas
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-7, -8, 14, 9);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-6, -7, 5, 7);
  ctx.fillRect(1, -7, 5, 7);
  // Separación de perneras
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-1, -7, 2, 7);

  // 4. Cinturón con hebilla decorativa
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-7, -10, 14, 3);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-6, -9, 12, 2);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, -10, 4, 3);

  // 5. Torso / atuendo principal con sombras y luces volumétricas
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-8, -20, 16, 11);

  // Tonalidad principal
  ctx.fillStyle = npc.palette.primary;
  ctx.fillRect(-7, -19, 14, 9);

  // Pliegues y sombreado lateral en el torso
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(4, -19, 3, 9);
  ctx.fillRect(-7, -12, 14, 2);
  // Realce de luz cenital en el hombro izquierdo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(-7, -19, 4, 3);

  // Cuello / solapas / chaleco con el color secundario
  ctx.fillStyle = npc.palette.secondary;
  ctx.fillRect(-4, -19, 8, 4);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-1, -19, 2, 5);

  // Brazos y manos a los lados
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-9, -18, 3, 10);
  ctx.fillRect(6, -18, 3, 10);
  ctx.fillStyle = npc.palette.primary;
  ctx.fillRect(-8, -17, 2, 6);
  ctx.fillRect(6, -17, 2, 6);
  // Manos en tono de piel
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(-8, -11, 2, 3);
  ctx.fillRect(6, -11, 2, 3);

  // 6. Cabeza y rostro (tono piel cálido anime)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-6, -29, 12, 10);
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(-5, -28, 10, 8);
  // Sombra suave bajo la barbilla
  ctx.fillStyle = '#fba373';
  ctx.fillRect(-4, -21, 8, 1);

  // Ojos estilo GBA (pupila expresiva con destello blanco)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-4, -25, 2, 3);
  ctx.fillRect(2, -25, 2, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-4, -25, 1, 1);
  ctx.fillRect(2, -25, 1, 1);

  // 7. Accesorios y tocados específicos según el rol del NPC
  if (npc.id === 'npc-bit01') {
    // Bit-01: Boina de erudito/cronista con pluma dorada y monóculo
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -32, 16, 5);
    ctx.fillRect(-9, -30, 4, 3);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-7, -31, 14, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -31, 4, 1);
    // Rollo de pergamino en bandolera
    ctx.fillStyle = '#070b14';
    ctx.fillRect(4, -16, 4, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, -15, 2, 6);
  } else if (npc.id === 'npc-ambar') {
    // Ámbar: Sombrero de ala ancha de arqueóloga con cinta marrón
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-9, -30, 18, 4);
    ctx.fillRect(-6, -34, 12, 5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-8, -29, 16, 2);
    ctx.fillRect(-5, -33, 10, 4);
    // Cinta marrón del sombrero
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-5, -30, 10, 2);
    // Libreta o lupa arqueológica
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(5, -14, 3, 3);
  } else if (npc.id === 'npc-guardabosques-nilo') {
    // Nilo: Gorra de guardabosques con visera y cantimplora de campo
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -32, 14, 5);
    ctx.fillRect(-8, -28, 6, 2);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-6, -31, 12, 4);
    ctx.fillStyle = '#4ca64c';
    ctx.fillRect(-7, -28, 5, 1);
    // Cantimplora al cinto
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -13, 3, 4);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-7, -12, 2, 3);
  } else if (npc.id === 'npc-eco-caverna') {
    // Cuarzo: Casco de minero/espeleólogo con linterna frontal brillante
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -33, 14, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -32, 12, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-5, -32, 5, 2);
    // Lámpara minera frontal cian
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-2, -31, 4, 4);
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#38bdf8' : '#00f3ff';
    ctx.fillRect(-1, -30, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -30, 1, 1);
  } else if (npc.id === 'npc-cartografo-isla') {
    // Cartógrafo del Caos: Capucha carmesí de viajero y estuche de mapas
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -32, 16, 6);
    ctx.fillRect(-8, -28, 3, 8);
    ctx.fillRect(5, -28, 3, 8);
    ctx.fillStyle = '#8c2d19';
    ctx.fillRect(-7, -31, 14, 5);
    ctx.fillRect(-7, -27, 2, 7);
    ctx.fillRect(5, -27, 2, 7);
    // Tubo porta-mapas a la espalda
    ctx.fillStyle = '#070b14';
    ctx.fillRect(5, -22, 3, 12);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(6, -21, 2, 10);
  } else {
    // Vigía del Cráter y otros: Gorro de montaña con bufanda al cuello
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -32, 14, 6);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-6, -31, 12, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -34, 3, 3); // pompón
    // Bufanda enrollada al cuello
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-6, -21, 12, 4);
    ctx.fillRect(4, -18, 3, 6);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-5, -20, 10, 3);
    ctx.fillRect(5, -17, 2, 5);
  }

  ctx.restore();
}

/**
 * BOCA DE CAVERNA BOREAL ESTILO GBA RPG
 * - Pared rocosa de montaña con estratos geológicos, bloques de piedra biselados y sombras profundas
 * - Cavidad en arco natural que conduce a la oscuridad interior con peldaños de piedra labrada
 * - Cornisa superior con vegetación alpina y carámbanos/líquenes
 * - Cristales rúnicos luminosos en las jambas que pulsan con la tonalidad mística de la cueva
 */
function drawGbaNorthCaveEntrance(
  ctx: CanvasRenderingContext2D,
  entrance: IslandCaveEntranceSpec,
  elapsed: number
): void {
  const x = Math.round(entrance.x);
  const y = Math.round(entrance.y);

  ctx.save();
  ctx.translate(x, y);

  // 1. Sombra de contacto en la base
  ctx.fillStyle = 'rgba(5, 8, 14, 0.48)';
  ctx.fillRect(-36, 6, 72, 8);

  // 2. Bloque rocoso de montaña circundante (silueta exterior)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-36, -42, 72, 48);
  ctx.fillRect(-28, -48, 56, 8);
  ctx.fillRect(-18, -52, 36, 6);

  // 3. Estratos de piedra de montaña (grises azulados y pizarras)
  ctx.fillStyle = '#334155';
  ctx.fillRect(-34, -40, 68, 44);
  ctx.fillRect(-26, -46, 52, 8);
  ctx.fillRect(-16, -50, 32, 6);

  // Facetas iluminadas en la cornisa superior e izquierda
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-34, -40, 6, 38);
  ctx.fillRect(-26, -46, 14, 6);
  ctx.fillRect(-16, -50, 12, 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-24, -45, 8, 2);
  ctx.fillRect(-14, -49, 8, 2);

  // Facetas en sombra profunda en el lateral derecho
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(26, -40, 8, 42);
  ctx.fillRect(18, -46, 8, 6);

  // 4. Salientes de roca y líquenes alpinos en la cornisa
  ctx.fillStyle = '#15803d';
  ctx.fillRect(-22, -48, 14, 4);
  ctx.fillRect(4, -46, 16, 4);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-20, -48, 10, 2);
  ctx.fillRect(6, -46, 12, 2);

  // 5. Boca de la caverna (arco de oscuridad profunda con degradado hacia el interior)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-20, -26, 40, 32);
  ctx.fillRect(-16, -32, 32, 8);
  ctx.fillRect(-10, -36, 20, 6);

  // Interior tenebroso de la gruta
  ctx.fillStyle = '#020408';
  ctx.fillRect(-18, -24, 36, 30);
  ctx.fillRect(-14, -30, 28, 8);
  ctx.fillRect(-8, -34, 16, 6);

  // Peldaños de piedra labrada que descienden hacia la penumbra
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-14, -6, 28, 4);
  ctx.fillRect(-12, -1, 24, 4);
  ctx.fillRect(-10, 4, 20, 3);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-14, -6, 28, 1);
  ctx.fillRect(-12, -1, 24, 1);
  ctx.fillRect(-10, 4, 20, 1);

  // Estalactitas de roca que cuelgan del dintel
  ctx.fillStyle = '#475569';
  ctx.fillRect(-12, -30, 4, 6);
  ctx.fillRect(8, -30, 4, 8);
  ctx.fillRect(-2, -33, 4, 5);

  // 6. Cristales rúnicos o gemas guardianas que titilan a los lados de la entrada
  const pulseR = Math.sin(elapsed * 3) * 0.2 + 0.8;
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-26, -26, 6, 12);
  ctx.fillRect(20, -26, 6, 12);

  ctx.fillStyle = entrance.accentHex;
  ctx.fillRect(-25, -25, 4, 10);
  ctx.fillRect(21, -25, 4, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-24, -24, 2, 3);
  ctx.fillRect(22, -24, 2, 3);

  // Halo luminoso sutil en el umbral
  ctx.fillStyle = `rgba(103, 232, 249, ${0.12 * pulseR})`;
  ctx.fillRect(-16, -2, 32, 8);

  ctx.restore();
}

/**
 * SUPERFICIES NATURALES Y ARQUEOLÓGICAS ESTILO GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO / VERDE HOJA)
 * - Césped con parches armónicos, penachos de hierba de 3 briznas, flores silvestres de 4 pétalos y tréboles.
 * - Arena con ondulaciones eólicas, conchas marinas, guijarros pulidos y charcos cristalinos.
 * - Losas de piedra con biseles de luz/sombra, juntas de mortero y musgo rastrero.
 * - Puentes y muelles de madera noble con vetas, clavos de forja y aristas trabajadas.
 * - Basalto volcánico con fisuras magmáticas incandescentes.
 */
function drawGbcWalkableSurfaceTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  wx: number,
  wy: number,
  surface: WalkableRect['surface'],
  zoneId: IslandZoneId,
  animFrame4: number
): void {
  const h = hashTile(tx, ty);

  if (surface === 'sand') {
    // ----------------------------------------------------
    // ARENA DE PLAYA DORADA GBA (COSTA DEL DESPERTAR)
    // ----------------------------------------------------
    const sandBase = (h & 3) === 0 ? '#dfc17a' : (h & 1) === 0 ? '#e8cc88' : '#e4c781';
    ctx.fillStyle = sandBase;
    ctx.fillRect(wx, wy, CELL, CELL);

    // Ondulaciones eólicas (suaves líneas onduladas de dunas)
    ctx.fillStyle = '#caa356';
    const ripY1 = 6 + (h % 5);
    const ripY2 = 20 + ((h >> 2) % 6);
    ctx.fillRect(wx + 2, wy + ripY1, 12, 1);
    ctx.fillRect(wx + 16, wy + ripY1 + 1, 14, 1);
    ctx.fillRect(wx + 4, wy + ripY2, 16, 1);
    ctx.fillRect(wx + 22, wy + ripY2 - 1, 8, 1);

    // Resaltes luminosos de arena secada al sol
    ctx.fillStyle = '#f4e2a8';
    ctx.fillRect(wx + 2, wy + ripY1 - 1, 10, 1);
    ctx.fillRect(wx + 4, wy + ripY2 - 1, 12, 1);

    // Pequeños guijarros costeros y conchas marinas
    if (h % 4 === 0) {
      // Concha marina rosada/blanca
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx + 7 + (h % 16), wy + 8 + ((h >> 3) % 16), 2, 2);
      ctx.fillStyle = '#fecdd3';
      ctx.fillRect(wx + 8 + (h % 16), wy + 8 + ((h >> 3) % 16), 1, 1);
    }
    if (h % 6 === 2) {
      // Guijarro gris de playa redondeado
      ctx.fillStyle = '#64748b';
      ctx.fillRect(wx + 18, wy + 16, 3, 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wx + 18, wy + 16, 2, 1);
    }
    if (h % 11 === 0) {
      // Juncos de mar / mata costera
      ctx.fillStyle = '#5c4028';
      ctx.fillRect(wx + 10, wy + 20, 10, 2);
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(wx + 20, wy + 12, 2, 10);
      ctx.fillRect(wx + 23, wy + 14, 2, 8);
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(wx + 20, wy + 12, 1, 4);
    } else if (h % 17 === 0) {
      // Charco mareal cristalino
      ctx.fillStyle = '#1e627d';
      ctx.fillRect(wx + 8, wy + 10, 15, 11);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wx + 9, wy + 11, 13, 9);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(wx + 11, wy + 13, 6, 3);
    }
    return;
  }

  if (surface === 'cobble') {
    // ----------------------------------------------------
    // EMPEDRADO ARTESANAL GBA (ALDEA DE LOS ORÍGENES Y RUINAS)
    // ----------------------------------------------------
    const isRuins = zoneId === 'ruinas-primer-arcade';

    // Base de mortero
    ctx.fillStyle = isRuins ? '#374151' : '#655331';
    ctx.fillRect(wx, wy, CELL, CELL);

    // 4 grandes losas talladas de 14×14 px por celda de 32×32 con biseles de luz y sombra
    const stoneCol = isRuins ? '#8b98a8' : '#d6c394';
    const stoneHi = isRuins ? '#cbd5e1' : '#f2e7c4';
    const stoneShadow = isRuins ? '#64748b' : '#a99464';

    const drawPaver = (px: number, py: number, pw: number, ph: number, variantH: number) => {
      // Cara de la losa
      ctx.fillStyle = stoneCol;
      ctx.fillRect(px, py, pw, ph);

      // Biseles de luz superior e izquierdo (estilo GBA nítido)
      ctx.fillStyle = stoneHi;
      ctx.fillRect(px, py, pw, 1);
      ctx.fillRect(px, py, 1, ph);

      // Biseles de sombra inferior y derecho
      ctx.fillStyle = stoneShadow;
      ctx.fillRect(px, py + ph - 1, pw, 1);
      ctx.fillRect(px + pw - 1, py, 1, ph);

      // Grietas o texturas internas en algunas piedras
      if (variantH % 3 === 0) {
        ctx.fillStyle = stoneShadow;
        ctx.fillRect(px + 4, py + 5, 4, 1);
        ctx.fillRect(px + 7, py + 6, 1, 3);
      }
    };

    drawPaver(wx + 1, wy + 1, 14, 14, h);
    drawPaver(wx + 17, wy + 1, 14, 14, h >> 2);
    drawPaver(wx + 1, wy + 17, 14, 14, h >> 4);
    drawPaver(wx + 17, wy + 17, 14, 14, h >> 6);

    // Detalles entre juntas: musgo vivo en aldea o circuito de pulso en ruinas
    if (isRuins) {
      if (h % 5 === 0) {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(wx + 15, wy + 4, 2, 8);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(wx + 8, wy + 15, 16, 2);
      }
    } else {
      if (h % 4 === 0) {
        // Mata de musgo entre losas
        ctx.fillStyle = '#2d6d34';
        ctx.fillRect(wx + 14, wy + 14, 4, 4);
        ctx.fillStyle = '#65ad4d';
        ctx.fillRect(wx + 15, wy + 15, 2, 2);
      }
    }
    return;
  }

  if (surface === 'grass' || surface === 'circuit' || surface === 'secret-grass') {
    // ----------------------------------------------------
    // CÉSPED CON VOLUMEN Y MICRO-DETALLE GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO)
    // ----------------------------------------------------
    const isForest = zoneId === 'bosque-circuitos';
    const isSecret = surface === 'secret-grass';
    const isCircuit = surface === 'circuit';

    // Macro-parches armónicos de 2×2 baldosas para evitar ruido aleatorio
    const macroX = Math.floor(tx / 2);
    const macroY = Math.floor(ty / 2);
    const patch = (macroX * 3 + macroY * 7 + (h & 1)) % 4;

    // Paletas GBA de césped
    let grassBase = '#42a344';
    let grassDark = '#349237';
    let grassLight = '#50b552';
    let tuftTip = '#74db5e';
    let tuftShadow = '#267b2a';

    if (isForest) {
      grassBase = patch === 0 ? '#1b5a38' : patch === 1 ? '#206841' : '#1d5f3c';
      grassDark = '#144429';
      grassLight = '#2b7e52';
      tuftTip = '#48be7c';
      tuftShadow = '#0d321d';
    } else if (isSecret) {
      grassBase = '#1c634a';
      grassDark = '#124835';
      grassLight = '#2a7c5e';
      tuftTip = '#4ade80';
      tuftShadow = '#0d3627';
    } else {
      grassBase = patch === 0 ? '#44a646' : patch === 1 ? '#4db34f' : patch === 2 ? '#3c9a3e' : '#41a243';
      grassDark = '#338f36';
      grassLight = '#57c059';
      tuftTip = '#78df62';
      tuftShadow = '#27782b';
    }

    // 1. Fondo de césped
    ctx.fillStyle = grassBase;
    ctx.fillRect(wx, wy, CELL, CELL);

    // 2. Ondulaciones tonales suaves dentro de la celda
    ctx.fillStyle = patch === 1 ? grassLight : grassDark;
    if (patch === 0 || patch === 2) {
      ctx.fillRect(wx + 2, wy + 18, 14, 5);
      ctx.fillRect(wx + 18, wy + 4, 12, 4);
    } else {
      ctx.fillRect(wx + 4, wy + 4, 12, 5);
      ctx.fillRect(wx + 16, wy + 20, 14, 5);
    }

    // Motas de hoja y sombras pequeñas: variación cromática legible sin ruido de píxel.
    const fleckX = 3 + ((h >> 8) % 25);
    const fleckY = 3 + ((h >> 13) % 25);
    ctx.fillStyle = grassDark;
    ctx.fillRect(wx + fleckX, wy + fleckY, 3 + (h % 3), 1);
    ctx.fillRect(wx + ((fleckX + 13) % 29), wy + ((fleckY + 9) % 29), 2, 2);
    ctx.fillStyle = grassLight;
    ctx.fillRect(wx + ((fleckX + 7) % 29), wy + ((fleckY + 16) % 29), 2, 1);

    // 3. Penachos de hierba GBA auténticos de 3 briznas (izquierda, centro alta, derecha)
    const drawGrassTuft = (gx: number, gy: number) => {
      // Sombra en la base
      ctx.fillStyle = tuftShadow;
      ctx.fillRect(gx - 1, gy + 3, 5, 1);
      // Brizna central (más alta)
      ctx.fillStyle = tuftTip;
      ctx.fillRect(gx + 1, gy, 1, 4);
      // Brizna izquierda
      ctx.fillRect(gx, gy + 1, 1, 3);
      // Brizna derecha
      ctx.fillRect(gx + 2, gy + 1, 1, 3);
      // Reflejo en la punta
      ctx.fillStyle = isForest ? '#86efac' : '#bbf78a';
      ctx.fillRect(gx + 1, gy, 1, 1);
    };

    // Penacho 1 fijo por hash
    drawGrassTuft(wx + 6 + (h % 7), wy + 6 + ((h >> 2) % 6));
    // Penacho 2 en el cuadrante inferior
    if ((h & 3) !== 0) {
      drawGrassTuft(wx + 18 + ((h >> 4) % 8), wy + 18 + ((h >> 6) % 7));
    }
    if ((h & 7) === 3) {
      const sprigX = wx + 10 + ((h >> 9) % 12);
      const sprigY = wy + 10 + ((h >> 14) % 12);
      ctx.fillStyle = tuftShadow;
      ctx.fillRect(sprigX, sprigY + 3, 6, 1);
      ctx.fillStyle = tuftTip;
      ctx.fillRect(sprigX + 1, sprigY + 1, 1, 2);
      ctx.fillRect(sprigX + 3, sprigY, 1, 3);
      ctx.fillRect(sprigX + 5, sprigY + 1, 1, 2);
      ctx.fillStyle = isForest ? '#a7f3d0' : '#d9f99d';
      ctx.fillRect(sprigX + 3, sprigY, 1, 1);
    }

    // 4. Flores silvestres de 4 pétalos (margaritas, dientes de león, amapolas)
    if (!isForest && !isSecret && (h % 7 === 1 || h % 11 === 3)) {
      const fx = wx + 8 + ((h >> 3) % 16);
      const fy = wy + 8 + ((h >> 5) % 14);
      const flowerKind = (h >> 2) % 3;
      const petalCol = flowerKind === 0 ? '#fef08a' : flowerKind === 1 ? '#fb7185' : '#f8fafc';
      const centerCol = flowerKind === 1 ? '#9f1239' : '#f59e0b';

      // Tallo verde
      ctx.fillStyle = '#226027';
      ctx.fillRect(fx + 1, fy + 3, 1, 3);

      // 4 pétalos
      ctx.fillStyle = petalCol;
      ctx.fillRect(fx, fy + 1, 3, 1);
      ctx.fillRect(fx + 1, fy, 1, 3);
      // Centro
      ctx.fillStyle = centerCol;
      ctx.fillRect(fx + 1, fy + 1, 1, 1);
    }

    // 5. Trazas arqueológicas enterradas bajo el musgo (Bosque de Circuitos)
    if (isCircuit && h % 5 === 0) {
      ctx.fillStyle = '#0f3824';
      ctx.fillRect(wx + 4, wy + 23, 24, 5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(wx + 5, wy + 24, 22, 3);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#2dd4bf' : '#06b6d4';
      ctx.fillRect(wx + 8, wy + 25, 16, 1);
      // Micro-nodo
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wx + 6, wy + 24, 2, 2);
      ctx.fillRect(wx + 22, wy + 24, 2, 2);
    }

    // 6. Setas bioluminiscentes en el bosque profundo
    if (isForest && h % 9 === 0) {
      const mx = wx + 12;
      const my = wy + 14;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(mx + 2, my + 3, 2, 4);
      ctx.fillStyle = h % 2 === 0 ? '#38bdf8' : '#c084fc';
      ctx.fillRect(mx, my, 6, 3);
      ctx.fillRect(mx + 1, my - 1, 4, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx + 2, my, 1, 1);
      ctx.fillRect(mx + 4, my + 1, 1, 1);
    } else if (isSecret && h % 4 === 0) {
      // Destellos feéricos en el claro oculto
      ctx.fillStyle = '#5eead4';
      ctx.fillRect(wx + 14, wy + 14, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx + 15, wy + 15, 1, 1);
    }
    return;
  }

  if (surface === 'fortress') {
    // ----------------------------------------------------
    // BASALTO VOLCÁNICO Y FISURAS DE LAVA (BASTIÓN DE LAS OLEADAS)
    // ----------------------------------------------------
    ctx.fillStyle = (h & 1) === 0 ? '#32242c' : '#3c2b35';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Juntas de mortero basáltico oscuro
    ctx.fillStyle = '#1c1318';
    ctx.fillRect(wx, wy + 15, CELL, 1);
    ctx.fillRect(wx + 15, wy, 1, CELL);

    // Caras de roca ígnea
    ctx.fillStyle = '#513b48';
    ctx.fillRect(wx + 2, wy + 2, 11, 2);
    ctx.fillRect(wx + 18, wy + 18, 11, 2);
    ctx.fillStyle = '#24171f';
    ctx.fillRect(wx + 2, wy + 13, 11, 2);
    ctx.fillRect(wx + 18, wy + 29, 11, 2);

    // Grieta de magma pulsante
    if (h % 5 === 0) {
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#ef4444' : '#f97316';
      ctx.fillRect(wx + 8, wy + 14, 14, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wx + 12, wy + 14, 6, 1);
    }
    return;
  }

  if (surface === 'crystal') {
    // ----------------------------------------------------
    // LECHO DE CRISTAL VECTORIAL ARCANO
    // ----------------------------------------------------
    ctx.fillStyle = (h & 1) === 0 ? '#221b33' : '#28203c';
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = '#140f22';
    ctx.fillRect(wx + 15, wy, 1, CELL);
    ctx.fillRect(wx, wy + 15, CELL, 1);

    // Facetas de cuarzo reflectante
    ctx.fillStyle = '#4c3f73';
    ctx.fillRect(wx + 3, wy + 3, 10, 10);
    ctx.fillRect(wx + 19, wy + 19, 10, 10);
    ctx.fillStyle = '#818cf8';
    ctx.fillRect(wx + 4, wy + 4, 3, 3);
    ctx.fillRect(wx + 20, wy + 20, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 4, wy + 4, 1, 1);
    ctx.fillRect(wx + 20, wy + 20, 1, 1);
    return;
  }

  if (surface === 'pier') {
    // ----------------------------------------------------
    // MUELLE DE TABLAS DE MADERA PORTUARIA
    // ----------------------------------------------------
    ctx.fillStyle = '#8f5c2c';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Juntas entre maderos y clavos de hierro
    ctx.fillStyle = '#4a2c12';
    for (let py = 0; py < CELL; py += 8) {
      ctx.fillRect(wx, wy + py, CELL, 2);
      // Clavos cuadrados de forja
      ctx.fillStyle = '#1f1308';
      ctx.fillRect(wx + 3, wy + py + 3, 2, 2);
      ctx.fillRect(wx + CELL - 5, wy + py + 3, 2, 2);
      ctx.fillStyle = '#4a2c12';
    }
    // Veta clara iluminada de las tablas
    ctx.fillStyle = '#b87c42';
    ctx.fillRect(wx + 5, wy + 2, 20, 1);
    ctx.fillRect(wx + 6, wy + 10, 18, 1);
    ctx.fillRect(wx + 4, wy + 18, 22, 1);
    ctx.fillRect(wx + 8, wy + 26, 16, 1);
    return;
  }

  if (surface === 'bridge') {
    // ----------------------------------------------------
    // PUENTE COLGANTE DE MADERA CON BARANDILLAS
    // ----------------------------------------------------
    ctx.fillStyle = '#a66e35';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Tablas transversales
    ctx.fillStyle = '#45260c';
    for (let bx = 0; bx < CELL; bx += 8) {
      ctx.fillRect(wx + bx, wy, 2, CELL);
    }
    // Resaltes superiores e inferiores de la madera
    ctx.fillStyle = '#d49b5c';
    ctx.fillRect(wx, wy + 4, CELL, 2);
    ctx.fillRect(wx, wy + CELL - 6, CELL, 2);

    // Vigas guía de sujeción
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(wx, wy, CELL, 3);
    ctx.fillRect(wx, wy + CELL - 3, CELL, 3);
    return;
  }

  // 'stone' — Terrazas y miradores tallados en roca antigua
  ctx.fillStyle = (h & 1) === 0 ? '#788494' : '#828e9e';
  ctx.fillRect(wx, wy, CELL, CELL);
  ctx.fillStyle = '#4d5968';
  ctx.fillRect(wx, wy + 15, CELL, 2);
  ctx.fillRect(wx + 15, wy, 2, CELL);
  ctx.fillStyle = '#b6c2d1';
  ctx.fillRect(wx + 2, wy + 2, 12, 2);
  ctx.fillRect(wx + 18, wy + 18, 12, 2);
  ctx.fillStyle = '#606c7c';
  ctx.fillRect(wx + 2, wy + 13, 12, 2);
  ctx.fillRect(wx + 18, wy + 29, 12, 2);
}

/**
 * SENDEROS ORGÁNICOS DE TIERRA APISONADA Y ESCALINATAS TALLADAS ESTILO GBA RPG
 * - Bordes orgánicos irregulares con flequillos de hierba que muerden la tierra.
 * - Degradado natural de tierra batida: borde de tránsito oscuro, cuerpo de arcilla y centro arenoso claro.
 * - Guijarros y piedras incrustadas a lo largo de las rutas.
 * - Escalinatas con relieve 3D: parapetos laterales de contención, huellas iluminadas y tabicas en sombra.
 */
function drawHandcraftedPathsAndStairs(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  const drawGbaPathSegment = (
    pts: [number, number][],
    coreHex: string,
    bodyHex: string,
    edgeHex: string
  ) => {
    const width = 26;

    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const horizontal = y0 === y1;
      const x = horizontal ? Math.min(x0, x1) - width / 2 : x0 - width / 2;
      const y = horizontal ? y0 - width / 2 : Math.min(y0, y1) - width / 2;
      const segmentWidth = horizontal ? Math.abs(x1 - x0) + width : width;
      const segmentHeight = horizontal ? width : Math.abs(y1 - y0) + width;

      if (!isWorldBoxVisible(x - 8, y - 8, segmentWidth + 16, segmentHeight + 16, camX, camY, vw, vh)) {
        continue;
      }

      // 1. Capa exterior de tierra húmeda de borde (28 px de ancho)
      ctx.fillStyle = edgeHex;
      ctx.fillRect(x - 1, y - 1, segmentWidth + 2, segmentHeight + 2);

      // 2. Cuerpo de arcilla apisonada (24 px de ancho)
      ctx.fillStyle = bodyHex;
      ctx.fillRect(x + 1, y + 1, segmentWidth - 2, segmentHeight - 2);

      // 3. Huella central más clara y desgastada por el paso (14 px de ancho)
      ctx.fillStyle = coreHex;
      if (horizontal) {
        ctx.fillRect(x + 2, y + 6, segmentWidth - 4, width - 12);
      } else {
        ctx.fillRect(x + 6, y + 2, width - 12, segmentHeight - 4);
      }

      // Borde tallado y sombra de pisada para separar el camino del césped con píxeles nítidos.
      ctx.fillStyle = '#6f4928';
      if (horizontal) {
        ctx.fillRect(x + 2, y + segmentHeight - 3, segmentWidth - 4, 2);
        ctx.fillStyle = '#e8c982';
        ctx.fillRect(x + 2, y + 2, segmentWidth - 4, 1);
      } else {
        ctx.fillRect(x + segmentWidth - 3, y + 2, 2, segmentHeight - 4);
        ctx.fillStyle = '#e8c982';
        ctx.fillRect(x + 2, y + 2, 1, segmentHeight - 4);
      }

      // 4. Flequillos de hierba orgánicos en los bordes para eliminar la línea recta artificial
      const grassGreen = '#42a344';
      ctx.fillStyle = grassGreen;
      if (horizontal) {
        for (let fx = x; fx < x + segmentWidth - 6; fx += 8) {
          const tooth = Math.round(Math.abs(Math.sin(fx * 0.17)) * 4);
          // Dientes de hierba arriba y abajo
          ctx.fillRect(fx, y - 1, 3, tooth);
          ctx.fillRect(fx + 4, y + segmentHeight - tooth, 3, tooth + 1);
        }
      } else {
        for (let fy = y; fy < y + segmentHeight - 6; fy += 8) {
          const tooth = Math.round(Math.abs(Math.sin(fy * 0.17)) * 4);
          // Dientes de hierba izquierda y derecha
          ctx.fillRect(x - 1, fy, tooth, 3);
          ctx.fillRect(x + segmentWidth - tooth, fy + 4, tooth + 1, 3);
        }
      }

      // 5. Pequeños guijarros incrustados a lo largo del sendero
      ctx.fillStyle = '#f5eedb';
      if (horizontal) {
        for (let px = x + 12; px < x + segmentWidth - 12; px += 36) {
          ctx.fillRect(px, y + 9, 3, 2);
          ctx.fillStyle = '#7a5a30';
          ctx.fillRect(px, y + 11, 3, 1);
          ctx.fillStyle = '#f5eedb';
        }
      } else {
        for (let py = y + 12; py < y + segmentHeight - 12; py += 36) {
          ctx.fillRect(x + 9, py, 2, 3);
          ctx.fillStyle = '#7a5a30';
          ctx.fillRect(x + 9, py + 3, 2, 1);
          ctx.fillStyle = '#f5eedb';
        }
      }
    }
  };

  // 1. Senderos de la Aldea de los Orígenes (tierra ocre dorada de pueblo GBA)
  drawGbaPathSegment(
    [
      [416, 1760],
      [560, 1760],
      [560, 1808],
      [688, 1808],
      [688, 1856],
      [944, 1856],
    ],
    '#dfc38a',
    '#c8a568',
    '#8b6837'
  );
  drawGbaPathSegment(
    [
      [560, 1808],
      [544, 1808],
      [544, 1936],
      [672, 1936],
      [672, 1952],
      [816, 1952],
    ],
    '#dfc38a',
    '#c8a568',
    '#8b6837'
  );

  // 2. Sendero serpenteante del Bosque de las Señales hacia el Claro
  drawGbaPathSegment(
    [
      [640, 1600],
      [640, 1488],
      [672, 1488],
      [672, 1408],
      [816, 1408],
      [816, 1360],
      [928, 1360],
      [928, 1280],
      [960, 1280],
      [960, 1104],
    ],
    '#bfa373',
    '#a28253',
    '#684f2b'
  );
  drawGbaPathSegment(
    [[928, 1280], [1616, 1280]],
    '#c8ac7c',
    '#af8f5d',
    '#73562e'
  );

  // 3. Paseo monumental hacia las Ruinas del Primer Pulso (losas y polvo de piedra)
  drawGbaPathSegment(
    [
      [1616, 1280],
      [1888, 1280],
      [1888, 1200],
      [1936, 1200],
      [2144, 1200],
      [2144, 1424],
      [2144, 1584],
      [2592, 1584],
      [2816, 1584],
      [2816, 1616],
    ],
    '#cbd5e1',
    '#94a3b8',
    '#475569'
  );
  drawGbaPathSegment(
    [
      [1888, 1280],
      [1760, 1280],
      [1760, 1424],
      [1664, 1424],
      [1664, 1536],
    ],
    '#cbd5e1',
    '#94a3b8',
    '#475569'
  );
  drawGbaPathSegment(
    [[1648, 1280], [1648, 1056]],
    '#e2e8f0',
    '#94a3b8',
    '#475569'
  );

  // 4. Sendero de Pong y Terrazas
  drawGbaPathSegment(
    [[2688, 1568], [2688, 1360]],
    '#e2d2a4',
    '#beaa78',
    '#7e6a3c'
  );

  // 5. Rutas de la Cumbre Boreal (Expansión Norte)
  drawGbaPathSegment(
    [[1952, 160], [1952, 80], [1952, -112], [1952, -448], [1952, -640]],
    '#e2e8f0',
    '#94a3b8',
    '#475569'
  );
  drawGbaPathSegment(
    [[1952, -144], [1552, -144], [1392, -144], [1240, -144]],
    '#dfc38a',
    '#c8a568',
    '#8b6837'
  );
  drawGbaPathSegment(
    [[1952, -128], [2352, -128], [2608, -128], [2848, -128]],
    '#e2e8f0',
    '#94a3b8',
    '#475569'
  );

  // ESCALINATAS TALLADAS EN PIEDRA CON PERSPECTIVA 3D (DESNIVELES ENTRE TERRAZAS)
  const stairConnectors = [
    { x: 576, y: 1528, w: 112, steps: 5, isBastionMain: false },
    { x: 1760, y: 960, w: 256, steps: 7, isBastionMain: true },
  ];

  for (const st of stairConnectors) {
    const stairH = st.steps * 13;
    if (!isWorldBoxVisible(st.x - 300, st.y - 20, st.w + 600, stairH + 60, camX, camY, vw, vh)) {
      continue;
    }

    // Si es la gran escalinata del Bastión de las Oleadas, renderizar el muro de contención del desnivel a los lados
    if (st.isBastionMain) {
      const wallY = st.y;
      const wallH = 28;

      // 1. Muro de contención de piedra a la izquierda de la escalera (x: 1504 a 1752)
      // Base y cara vertical en sombra
      ctx.fillStyle = '#070b14';
      ctx.fillRect(1504, wallY - 2, 248, wallH + 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(1504, wallY, 248, wallH);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(1504, wallY + 12, 248, wallH - 12);
      // Albardilla (remate superior iluminado del muro)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(1504, wallY - 2, 248, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1504, wallY - 2, 248, 1);
      // Bloques de sillería y fisuras
      ctx.fillStyle = '#475569';
      for (let wx = 1520; wx < 1740; wx += 32) {
        ctx.fillRect(wx, wallY, 1, wallH);
        ctx.fillRect(wx + 16, wallY + 14, 1, wallH - 14);
      }
      // Sombra arrojada sobre la plaza inferior
      ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
      ctx.fillRect(1504, wallY + wallH, 248, 8);

      // 2. Muro de contención de piedra a la derecha de la escalera (x: 2024 a 2272)
      ctx.fillStyle = '#070b14';
      ctx.fillRect(2024, wallY - 2, 248, wallH + 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(2024, wallY, 248, wallH);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(2024, wallY + 12, 248, wallH - 12);
      // Albardilla (remate superior iluminado)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(2024, wallY - 2, 248, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2024, wallY - 2, 248, 1);
      // Bloques de sillería
      ctx.fillStyle = '#475569';
      for (let wx = 2040; wx < 2260; wx += 32) {
        ctx.fillRect(wx, wallY, 1, wallH);
        ctx.fillRect(wx + 16, wallY + 14, 1, wallH - 14);
      }
      // Sombra arrojada sobre la plaza
      ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
      ctx.fillRect(2024, wallY + wallH, 248, 8);
    }

    // Parapetos / Pretiles de sillería monumentales a los lados de la escalera
    const railW = st.isBastionMain ? 10 : 8;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(st.x - railW, st.y - 6, railW, stairH + 12);
    ctx.fillRect(st.x + st.w, st.y - 6, railW, stairH + 12);

    ctx.fillStyle = '#475569';
    ctx.fillRect(st.x - railW + 1, st.y - 5, railW - 2, stairH + 10);
    ctx.fillRect(st.x + st.w + 1, st.y - 5, railW - 2, stairH + 10);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(st.x - railW + 1, st.y - 5, 2, stairH + 10);
    ctx.fillRect(st.x + st.w + 1, st.y - 5, 2, stairH + 10);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(st.x - railW + 1, st.y - 5, 1, stairH + 10);

    // Pilastras de remate en los extremos de la barandilla
    const drawPillar = (px: number, py: number) => {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(px - 2, py - 2, railW + 4, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(px - 1, py - 1, railW + 2, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1, py - 1, railW + 2, 2);
    };
    drawPillar(st.x - railW, st.y - 6);
    drawPillar(st.x + st.w, st.y - 6);
    drawPillar(st.x - railW, st.y + stairH);
    drawPillar(st.x + st.w, st.y + stairH);

    // Peldaños individuales (huella clara iluminada, tabica vertical en sombra y resalte frontal)
    for (let i = 0; i < st.steps; i++) {
      const sy = st.y + i * 13;

      // Sombra de contacto inferior
      ctx.fillStyle = '#070b14';
      ctx.fillRect(st.x - 1, sy, st.w + 2, 13);

      // Tabica (cara vertical en sombra de piedra tallada)
      ctx.fillStyle = '#334155';
      ctx.fillRect(st.x, sy + 5, st.w, 7);

      // Huella (cara horizontal superior iluminada)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(st.x, sy + 1, st.w, 5);

      // Resalte brillante frontal de mármol/sillería
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(st.x, sy + 1, st.w, 1);

      // Textura de junta central de piedra para escalinatas anchas
      if (st.w >= 160) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(st.x + Math.floor(st.w / 2), sy + 1, 2, 11);
        ctx.fillRect(st.x + Math.floor(st.w / 4), sy + 2, 1, 9);
        ctx.fillRect(st.x + Math.floor((st.w * 3) / 4), sy + 2, 1, 9);
      }
    }
  }
}

/** Barandilla de madera artesanal con postes torneados y vetas */
/** Barandilla de madera artesanal de alta calidad con postes torneados, vetas y acabados GBA RPG */
function drawWoodenRail(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): void {
  const horizontal = startY === endY;
  const start = horizontal ? startX : startY;
  const end = horizontal ? endX : endY;
  const length = end - start;
  if (length <= 0) return;

  const drawWoodenPost = (px: number, py: number) => {
    ctx.save();
    ctx.translate(Math.round(px), Math.round(py));
    // Sombra de contacto circular suave
    ctx.fillStyle = 'rgba(5, 10, 18, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 1. Cuerpo del poste (Contorno y masa)
    ctx.fillStyle = '#070b14'; // Outlines
    ctx.fillRect(-5, -12, 10, 22);
    ctx.fillStyle = '#8b5a2b'; // Tono medio
    ctx.fillRect(-4, -11, 8, 20);
    ctx.fillStyle = '#a16207'; // Veta de madera / Sombra lateral
    ctx.fillRect(1, -11, 3, 20);
    ctx.fillStyle = '#d8be88'; // Luz lateral
    ctx.fillRect(-4, -11, 2, 20);
    // 2. Capuchón / Remate superior torneado
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-6, -15, 12, 5);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(-5, -14, 10, 3);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-3, -14, 4, 1);
    ctx.fillRect(-5, -12, 10, 1);
    // 3. Perno / Clavo de fijación
    ctx.fillStyle = '#334155';
    ctx.fillRect(-1, -4, 2, 2);
    ctx.fillRect(-1, 4, 2, 2);
    ctx.restore();
  };

  // Sombra arrojada larga de la estructura sobre el suelo
  ctx.fillStyle = 'rgba(5, 10, 18, 0.28)';
  if (horizontal) {
    ctx.fillRect(startX, startY + 6, length, 4);
  } else {
    ctx.fillRect(startX + 6, startY, 4, length);
  }

  // Travesaños dobles con relieve
  const drawSingleBar = (x: number, y: number, w: number, h: number, isH: boolean) => {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#783e1c';
    ctx.fillRect(x, y + (isH ? 1 : 0), w, h - (isH ? 2 : 0));
    ctx.fillStyle = '#d8be88';
    if (isH) ctx.fillRect(x, y + 1, w, 1);
    else ctx.fillRect(x + 1, y, 1, h);
    ctx.fillStyle = '#4a2c12';
    if (isH) ctx.fillRect(x, y + h - 2, w, 1);
    else ctx.fillRect(x + w - 2, y, 1, h);
  };

  if (horizontal) {
    drawSingleBar(startX, startY - 8, length, 4, true);
    drawSingleBar(startX, startY + 2, length, 4, true);
  } else {
    drawSingleBar(startX - 8, startY, 4, length, false);
    drawSingleBar(startX + 2, startY, 4, length, false);
  }

  // Postes: uno al inicio, uno al final, y intermedios cada ~40px
  const postStep = 40;
  const postCount = Math.max(1, Math.floor(length / postStep));
  const actualStep = length / postCount;

  // Escuadras / Soportes de esquina decorativos
  ctx.fillStyle = '#4a2c12';
  if (horizontal) {
    // Escuadra inicio
    ctx.beginPath(); ctx.moveTo(startX, startY - 8); ctx.lineTo(startX + 12, startY); ctx.lineTo(startX, startY + 8); ctx.fill();
    // Escuadra fin
    ctx.beginPath(); ctx.moveTo(endX, startY - 8); ctx.lineTo(endX - 12, startY); ctx.lineTo(endX, startY + 8); ctx.fill();
  } else {
    // Escuadra inicio
    ctx.beginPath(); ctx.moveTo(startX - 8, startY); ctx.lineTo(startX, startY + 12); ctx.lineTo(startX + 8, startY); ctx.fill();
    // Escuadra fin
    ctx.beginPath(); ctx.moveTo(startX - 8, endY); ctx.lineTo(startX, endY - 12); ctx.lineTo(startX + 8, endY); ctx.fill();
  }

  for (let i = 0; i <= postCount; i++) {
    const pos = start + i * actualStep;
    if (horizontal) drawWoodenPost(pos, startY);
    else drawWoodenPost(startX, pos);
  }
}

type IslandPerimeterEdge = {
  side: 'top' | 'bottom' | 'left' | 'right';
  fixed: number;
  start: number;
  end: number;
};

const ISLAND_PERIMETER_TILE = 16;
const ISLAND_PERIMETER_OPENINGS: IslandPerimeterEdge[] = [
  { side: 'bottom', fixed: 2192, start: 380, end: 560 }, // Apertura muelle sur (Isla Natal)
  { side: 'left', fixed: 224, start: 1950, end: 2100 },  // Costa oeste
  { side: 'right', fixed: 2992, start: 1056, end: 1392 }, // Puerto oriental
];

const ISLAND_PERIMETER_EDGES: IslandPerimeterEdge[] = (() => {
  const cellKey = (x: number, y: number) => `${x},${y}`;
  const occupied = new Set<string>();
  const railCells: Array<{ x: number; y: number }> = [];
  const railCellKeys = new Set<string>();

  for (const rect of ISLAND_WALKABLE_RECTS) {
    for (let y = rect.y; y < rect.y + rect.h; y += ISLAND_PERIMETER_TILE) {
      for (let x = rect.x; x < rect.x + rect.w; x += ISLAND_PERIMETER_TILE) {
        const key = cellKey(x, y);
        occupied.add(key);
        if (rect.surface !== 'bridge' && rect.surface !== 'pier' && !railCellKeys.has(key)) {
          railCellKeys.add(key);
          railCells.push({ x, y });
        }
      }
    }
  }

  const spansByEdge = new Map<string, { side: IslandPerimeterEdge['side']; fixed: number; start: number; end: number }[]>();
  const addSpan = (side: IslandPerimeterEdge['side'], fixed: number, start: number) => {
    const key = `${side}:${fixed}`;
    const spans = spansByEdge.get(key) ?? [];
    spans.push({ side, fixed, start, end: start + ISLAND_PERIMETER_TILE });
    spansByEdge.set(key, spans);
  };

  for (const { x, y } of railCells) {
    if (!occupied.has(cellKey(x, y - ISLAND_PERIMETER_TILE))) addSpan('top', y, x);
    if (!occupied.has(cellKey(x, y + ISLAND_PERIMETER_TILE))) addSpan('bottom', y + ISLAND_PERIMETER_TILE, x);
    if (!occupied.has(cellKey(x - ISLAND_PERIMETER_TILE, y))) addSpan('left', x, y);
    if (!occupied.has(cellKey(x + ISLAND_PERIMETER_TILE, y))) addSpan('right', x + ISLAND_PERIMETER_TILE, y);
  }

  const edges: IslandPerimeterEdge[] = [];
  for (const spans of spansByEdge.values()) {
    spans.sort((a, b) => a.start - b.start);
    let current = { ...spans[0] };
    for (let i = 1; i < spans.length; i++) {
      const next = spans[i];
      if (next.start <= current.end) {
        current.end = Math.max(current.end, next.end);
      } else {
        edges.push(current);
        current = { ...next };
      }
    }
    edges.push(current);
  }
  return edges;
})();

function drawIslandPerimeterRails(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  for (const edge of ISLAND_PERIMETER_EDGES) {
    let spans = [{ start: edge.start, end: edge.end }];
    for (const opening of ISLAND_PERIMETER_OPENINGS) {
      if (opening.side !== edge.side || opening.fixed !== edge.fixed) continue;
      const nextSpans: typeof spans = [];
      for (const span of spans) {
        if (opening.end <= span.start || opening.start >= span.end) {
          nextSpans.push(span);
          continue;
        }
        if (opening.start > span.start) nextSpans.push({ start: span.start, end: opening.start });
        if (opening.end < span.end) nextSpans.push({ start: opening.end, end: span.end });
      }
      spans = nextSpans;
    }

    for (const span of spans) {
      const horizontal = edge.side === 'top' || edge.side === 'bottom';
      const railX = horizontal
        ? span.start
        : edge.side === 'left'
        ? edge.fixed + 8
        : edge.fixed - 8;
      const railY = horizontal
        ? edge.side === 'top'
          ? edge.fixed + 8
          : edge.fixed - 8
        : span.start;
      const length = span.end - span.start;
      if (length <= 0) continue;
      const boxX = horizontal ? railX : railX - 10;
      const boxY = horizontal ? railY - 10 : railY;
      if (!isWorldBoxVisible(boxX, boxY, horizontal ? length : 20, horizontal ? 20 : length, camX, camY, vw, vh)) {
        continue;
      }
      drawWoodenRail(
        ctx,
        railX,
        railY,
        horizontal ? span.end : railX,
        horizontal ? railY : span.end
      );
    }
  }
}

function drawRusticFence(ctx: CanvasRenderingContext2D, fx: number, fy: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = fx + i * 16;
    // Sombra de contacto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + 2, fy + 11, 12, 3);

    // Estacas verticales
    ctx.fillStyle = '#070b14'; // Outline
    ctx.fillRect(x + 2, fy, 4, 13);
    ctx.fillRect(x + 10, fy, 4, 13);
    
    ctx.fillStyle = '#8b5a2b'; // Body
    ctx.fillRect(x + 3, fy + 1, 2, 11);
    ctx.fillRect(x + 11, fy + 1, 2, 11);
    
    // Puntas afiladas
    ctx.fillStyle = '#070b14';
    ctx.beginPath();
    ctx.moveTo(x + 2, fy); ctx.lineTo(x + 4, fy - 3); ctx.lineTo(x + 6, fy); ctx.fill();
    ctx.moveTo(x + 10, fy); ctx.lineTo(x + 12, fy - 3); ctx.lineTo(x + 14, fy); ctx.fill();

    // Travesaños horizontales
    ctx.fillStyle = '#070b14';
    ctx.fillRect(x, fy + 4, 16, 4);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(x, fy + 5, 16, 2);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(x, fy + 5, 16, 1);
  }
}

function drawIslandWoodRailSystem(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  southShortcutActive: boolean,
  glitchTrailCleared: boolean
): void {
  if (southShortcutActive && isWorldBoxVisible(864, 1632, 720, 112, camX, camY, vw, vh)) {
    drawWoodenRail(ctx, 912, 1640, 1536, 1640);
    drawWoodenRail(ctx, 912, 1736, 1536, 1736);
  }

  if (isWorldBoxVisible(2992, 1056, 528, 336, camX, camY, vw, vh)) {
    drawWoodenRail(ctx, 3000, 1136, 3000, 1344);
    drawWoodenRail(ctx, 3512, 1088, 3512, 1280);
  }

  for (const rail of ISLAND_ROUTE_RAILS) {
    if (rail.id.startsWith('bridge-rail')) continue; // Saltar barandas del puente (ya dibujadas por el renderer especializado)
    if (isWorldBoxVisible(rail.x1, rail.y1 - 12, rail.x2 - rail.x1, 24, camX, camY, vw, vh)) {
      drawWoodenRail(ctx, rail.x1, rail.y1, rail.x2, rail.y2);
    }
  }

  drawIslandPerimeterRails(ctx, camX, camY, vw, vh);
}

/** Dibuja un Portal Anómalo con distinción visual clara entre estado latente y activo estilo GBA */
function drawAnomalyPortalWorld(
  ctx: CanvasRenderingContext2D,
  portal: AnomalyPortalSpec,
  unlocked: boolean,
  syncedGlyphsCount: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(portal.x);
  const y = Math.round(portal.y);
  const t = reducedMotion ? 0 : elapsed;

  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada del monolito
  ctx.fillStyle = 'rgba(5, 8, 18, 0.52)';
  ctx.fillRect(-38, -6, 76, 20);

  // Zócalo escalonado de roca basáltica grabada
  ctx.fillStyle = '#060a14';
  ctx.fillRect(-36, -12, 72, 24);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-34, -10, 68, 20);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-34, -10, 68, 2);
  ctx.fillStyle = unlocked ? portal.accentHex : '#475569';
  ctx.fillRect(-26, 4, 52, 3);

  // Pilares gemelos de obsidiana y bronce que enmarcan la anomalía
  ctx.fillStyle = '#060a14';
  ctx.fillRect(-30, -60, 16, 54);
  ctx.fillRect(14, -60, 16, 54);
  ctx.fillRect(-32, -66, 64, 12);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-28, -58, 12, 50);
  ctx.fillRect(16, -58, 12, 50);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-28, -58, 3, 50);
  ctx.fillRect(16, -58, 3, 50);

  // Entablamento superior de bronce con runas
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-30, -64, 60, 6);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-28, -63, 56, 1);

  // 3 Engastes superiores para mostrar progreso de los 3 Símbolos de Pulso
  if (portal.requiredSecretIds && portal.requiredSecretIds.length === 3) {
    for (let i = 0; i < 3; i++) {
      const lit = i < syncedGlyphsCount;
      const gx = -14 + i * 14;
      ctx.fillStyle = '#060a14';
      ctx.fillRect(gx - 4, -73, 8, 8);
      ctx.fillStyle = lit ? '#00f3ff' : '#334155';
      ctx.fillRect(gx - 3, -72, 6, 6);
      if (lit) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx - 1, -70, 2, 2);
      }
    }
  }

  if (unlocked) {
    // Vórtice dimensional activo con nebulosa y fragmentos
    const pulse = reducedMotion ? 0.88 : 0.75 + Math.sin(t * 4.5) * 0.2;
    ctx.fillStyle = '#050c1a';
    ctx.fillRect(-16, -54, 32, 46);

    ctx.globalAlpha = pulse;
    ctx.fillStyle = portal.style === 'abyssal-chamber' ? '#6b21a8' : '#0369a1';
    ctx.fillRect(-14, -51, 28, 40);
    ctx.fillStyle = portal.accentHex;
    ctx.fillRect(-10, -44, 20, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -36, 10, 10);
    ctx.globalAlpha = 1;

    // Fragmentos digitales orbitando
    for (let k = 0; k < 5; k++) {
      const ang = t * 2.2 + (k * Math.PI * 2) / 5;
      const fx = Math.round(Math.cos(ang) * 21);
      const fy = Math.round(-32 + Math.sin(ang * 1.3) * 15);
      ctx.fillStyle = k % 2 === 0 ? '#00f3ff' : '#fde047';
      ctx.fillRect(fx - 2, fy - 2, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx - 1, fy - 1, 2, 2);
    }
  } else {
    // Estado latente / inactivo: fisura estática tenue
    ctx.fillStyle = '#080d18';
    ctx.fillRect(-16, -54, 32, 46);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -50);
    ctx.lineTo(4, -36);
    ctx.lineTo(-3, -24);
    ctx.lineTo(3, -12);
    ctx.stroke();
  }

  ctx.restore();
}

/** Estela arqueológica tallada con los glifos de pulso [ ◈ ], [ ◈◈ ], [ ◈◈◈ ] */
function drawPulseGlyphStele(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  glyphIndex: 1 | 2 | 3,
  discovered: boolean,
  accentHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const glow = discovered
    ? 0.95
    : reducedMotion
    ? 0.45
    : 0.35 + Math.sin(elapsed * 3 + glyphIndex) * 0.2;

  ctx.save();
  ctx.translate(x, y);

  // Sombra
  ctx.fillStyle = 'rgba(5, 8, 17, 0.46)';
  ctx.fillRect(-18, 3, 36, 6);

  // Obelisco con contorno oscuro y facetas
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-15, -38, 30, 42);
  ctx.fillRect(-11, -44, 22, 8);

  ctx.fillStyle = discovered ? '#334155' : '#475569';
  ctx.fillRect(-13, -36, 26, 38);
  ctx.fillStyle = discovered ? '#64748b' : '#64748b';
  ctx.fillRect(-13, -36, 3, 38);
  ctx.fillRect(-9, -42, 18, 6);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-9, -42, 3, 6);

  // Rombos de pulso grabados en la piedra
  ctx.globalAlpha = glow;
  ctx.fillStyle = discovered ? accentHex : '#cbd5e1';
  for (let i = 0; i < glyphIndex; i++) {
    const gy = -31 + i * 10;
    ctx.fillRect(-5, gy, 10, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, gy + 1, 4, 4);
    ctx.fillStyle = discovered ? accentHex : '#cbd5e1';
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

/** Chasis de máquina recreativa olvidada semienterrada en la arena de la costa */
function drawForgottenCoastalCabinet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  inspected: boolean,
  elapsed: number
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.save();
  ctx.translate(x, y);

  // Duna de arena que cubre la base inclinada
  ctx.fillStyle = '#caa356';
  ctx.fillRect(-26, -3, 52, 12);
  ctx.fillStyle = '#e4c781';
  ctx.fillRect(-24, -2, 48, 8);

  ctx.rotate(-0.14);
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-19, -46, 38, 46);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(-17, -44, 34, 42);
  ctx.fillStyle = '#9c5a28';
  ctx.fillRect(-17, -44, 4, 42);

  // Marquesina desgastada
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-14, -40, 28, 9);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-12, -38, 24, 5);

  // Monitor CRT apagado con un destello fantasma ocasional
  ctx.fillStyle = '#080d16';
  ctx.fillRect(-13, -29, 26, 18);
  if (inspected || Math.floor(elapsed * 2) % 5 === 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-7, -22, 14, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -22, 6, 1);
  }

  // Musgo costero y salitre sobre el mueble
  ctx.fillStyle = '#2d6d34';
  ctx.fillRect(-17, -44, 12, 4);
  ctx.fillRect(7, -16, 10, 6);
  ctx.fillStyle = '#65ad4d';
  ctx.fillRect(-15, -43, 6, 2);

  ctx.restore();
}

/**
 * ARQUITECTURA DETALLADA DE EDIFICIOS ESTILO GBA RPG
 * - Tejas cerámicas o de pizarra con aristas y líneas de sombra.
 * - Fachadas de mampostería, entramado de madera y sillares en las esquinas (quoins).
 * - Sombra de caída bajo el alero que da volumen 3D al edificio.
 * - Ventanas con cristal reflectante, parteluces y jardineras florales en la aldea.
 * - Puertas de madera maciza con herrajes de forja, escalón de piedra y rótulo pulido.
 */
function drawPixelverseBuilding(
  ctx: CanvasRenderingContext2D,
  bldg: ExteriorBuildingSpec,
  elapsed: number,
  reducedMotion: boolean,
  tmReadyFor80s: boolean
): void {
  const bx = Math.round(bldg.x);
  const by = Math.round(bldg.y);
  const style = bldg.archStyle ?? 'cottage-archive';

  ctx.save();

  // 1. Sombra suave en el suelo para anclar el edificio al terreno
  ctx.fillStyle = 'rgba(5, 9, 18, 0.48)';
  ctx.fillRect(bx - 10, by + bldg.h - 2, bldg.w + 20, 16);
  ctx.fillRect(bx - 6, by + bldg.h + 8, bldg.w + 12, 4);

  // Zócalo de cimentación de piedra
  ctx.fillStyle = '#524332';
  ctx.fillRect(bx - 4, by + bldg.h - 4, bldg.w + 8, 6);
  ctx.fillStyle = '#7a654c';
  ctx.fillRect(bx - 4, by + bldg.h - 4, bldg.w + 8, 2);

  // Helper para tejas cerámicas con biseles GBA
  const drawRoofTiles = (
    rx: number,
    ry: number,
    rWidth: number,
    rHeight: number,
    shadeHex: string,
    glintHex: string,
    tileWidth = 14
  ) => {
    for (let row = 0; row < rHeight; row += 6) {
      const offset = row % 12 === 0 ? 0 : Math.floor(tileWidth / 2);
      ctx.fillStyle = shadeHex;
      ctx.fillRect(rx, ry + row + 5, rWidth, 1);
      for (let tileX = rx - offset; tileX < rx + rWidth; tileX += tileWidth) {
        const visibleX = Math.max(rx + 1, tileX + 2);
        const tileEnd = Math.min(rx + rWidth - 1, tileX + tileWidth - 2);
        if (tileEnd > visibleX) {
          ctx.fillStyle = glintHex;
          ctx.fillRect(visibleX, ry + row + 1, tileEnd - visibleX, 2);
          ctx.fillStyle = shadeHex;
          ctx.fillRect(visibleX, ry + row + 3, tileEnd - visibleX, 1);
        }
      }
    }
  };

  if (style === 'chrono-dome') {
    // ----------------------------------------------------
    // OBSERVATORIO DEL CRONOSCOPIO (RUINAS DEL PRIMER PULSO)
    // Cúpula octogonal de sillería de basalto, bronce y lente temporal cian
    // ----------------------------------------------------
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 2, by + 22, bldg.w + 4, bldg.h - 20);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 24, bldg.w, bldg.h - 24);

    // Contrafuertes y pilares de sillería
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(bx, by + 24, 12, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 12, by + 24, 12, bldg.h - 24);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(bx, by + 24, 3, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 12, by + 24, 3, bldg.h - 24);

    // Hiladas de sillares horizontales
    ctx.fillStyle = '#64748b';
    for (let courseY = by + 38; courseY < by + bldg.h - 10; courseY += 14) {
      ctx.fillRect(bx + 14, courseY, bldg.w - 28, 2);
    }
    ctx.fillStyle = '#e2d1a7';
    ctx.fillRect(bx + 12, by + 25, bldg.w - 24, 3);

    // Cúpula escalonada
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx + 8, by + 4, bldg.w - 16, 22);
    ctx.fillRect(bx + 26, by - 10, bldg.w - 52, 16);
    ctx.fillRect(bx + 52, by - 18, bldg.w - 104, 10);

    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx + 10, by + 6, bldg.w - 20, 18);
    ctx.fillRect(bx + 28, by - 8, bldg.w - 56, 14);
    drawRoofTiles(bx + 12, by + 6, bldg.w - 24, 14, bldg.roofShadeHex, '#67e8f9', 18);

    // Meridiano astronómico de latón y lente ocular del Cronoscopio
    const cx = Math.round(bx + bldg.w / 2);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(cx - 4, by - 16, 8, 38);
    ctx.fillStyle = '#060a12';
    ctx.beginPath();
    ctx.arc(cx, by + 6, 14, 0, Math.PI * 2);
    ctx.fill();

    // Lente temporal viva
    const lensCol = tmReadyFor80s ? '#00f3ff' : (reducedMotion || Math.floor(elapsed * 2) % 2 === 0 ? '#38bdf8' : '#0284c7');
    ctx.fillStyle = lensCol;
    ctx.beginPath();
    ctx.arc(cx, by + 6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, by + 2, 4, 3);
  } else if (style === 'forest-workshop') {
    // ----------------------------------------------------
    // TALLER ANALÓGICO DE KERTZ (BOSQUE DE LAS SEÑALES)
    // Cubierta de cobre oxidado, entramado de vigas, chimenea de forja
    // ----------------------------------------------------
    // Chimenea de ladrillo
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx + bldg.w - 30, by - 18, 16, 26);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(bx + bldg.w - 28, by - 16, 12, 22);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(bx + bldg.w - 28, by - 16, 3, 22);
    // Humo sutil
    const puff = Math.floor(elapsed * 2) % 3;
    ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
    ctx.fillRect(bx + bldg.w - 26 + puff * 2, by - 24, 6, 4);

    // Fachada de madera
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 2, by + 24, bldg.w + 4, bldg.h - 22);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 26, bldg.w, bldg.h - 26);

    // Entramado de vigas de madera
    ctx.fillStyle = '#5c3115';
    ctx.fillRect(bx, by + 26, 8, bldg.h - 26);
    ctx.fillRect(bx + bldg.w - 8, by + 26, 8, bldg.h - 26);
    ctx.fillRect(bx, by + 52, bldg.w, 5);
    ctx.fillStyle = '#8b4b1e';
    ctx.fillRect(bx, by + 26, 2, bldg.h - 26);
    ctx.fillRect(bx, by + 52, bldg.w, 1);

    // Tablones horizontales
    ctx.fillStyle = '#bca982';
    for (let boardY = by + 60; boardY < by + bldg.h - 8; boardY += 8) {
      ctx.fillRect(bx + 9, boardY, bldg.w - 18, 1);
    }

    // Cubierta de cobre verde-azulado
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 8, by + 4, bldg.w + 16, 24);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 6, by + 6, bldg.w + 12, 20);
    drawRoofTiles(bx - 4, by + 6, bldg.w + 8, 16, bldg.roofShadeHex, '#5eead4', 18);

    // Tragaluz del taller
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx + 20, by + 9, 30, 14);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(bx + 22, by + 11, 26, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 24, by + 12, 8, 3);
  } else if (style === 'ruins-sanctuary') {
    // ----------------------------------------------------
    // SANTUARIO DEL ARCHIVO PIONERO (TEMPLO CLÁSICO DE PIEDRA)
    // ----------------------------------------------------
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 4, by + 18, bldg.w + 8, bldg.h - 16);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx - 2, by + 20, bldg.w + 4, bldg.h - 20);

    // Columnas frontales de sillería estriada
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(bx + 8, by + 28, 14, bldg.h - 32);
    ctx.fillRect(bx + bldg.w - 22, by + 28, 14, bldg.h - 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(bx + 8, by + 28, 3, bldg.h - 32);
    ctx.fillRect(bx + bldg.w - 22, by + 28, 3, bldg.h - 32);

    // Capitel y base de columnas de latón dorado
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(bx + 6, by + 28, 18, 4);
    ctx.fillRect(bx + bldg.w - 24, by + 28, 18, 4);
    ctx.fillRect(bx + 6, by + bldg.h - 8, 18, 4);
    ctx.fillRect(bx + bldg.w - 24, by + bldg.h - 8, 18, 4);

    // Frontón clásico triangular
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 8, by + 4, bldg.w + 16, 18);
    ctx.fillRect(bx + 18, by - 6, bldg.w - 36, 12);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 6, by + 6, bldg.w + 12, 14);
    ctx.fillRect(bx + 20, by - 4, bldg.w - 40, 10);
    drawRoofTiles(bx - 4, by + 6, bldg.w + 8, 12, bldg.roofShadeHex, '#fbbf24', 16);

    // Friso de circuitos dorados en el dintel
    ctx.fillStyle = '#fde047';
    ctx.fillRect(bx + 4, by + 16, bldg.w - 8, 3);
  } else if (style === 'museum-hall') {
    // ----------------------------------------------------
    // MUSEO VIVIENTE DE LOS 70 (GALERÍA NEOCLÁSICA RETROFUTURISTA)
    // ----------------------------------------------------
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 4, by + 18, bldg.w + 8, bldg.h - 16);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx - 2, by + 20, bldg.w + 4, bldg.h - 20);

    // Columnata de mármol
    ctx.fillStyle = '#94a3b8';
    for (const cxOff of [10, 44, bldg.w - 56, bldg.w - 22]) {
      ctx.fillRect(bx + cxOff, by + 28, 12, bldg.h - 32);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx + cxOff, by + 28, 2, bldg.h - 32);
      ctx.fillStyle = '#94a3b8';
    }

    // Tejado de pizarra con claraboya
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 8, by + 2, bldg.w + 16, 18);
    ctx.fillRect(bx + 24, by - 10, bldg.w - 48, 14);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 6, by + 4, bldg.w + 12, 14);
    drawRoofTiles(bx - 4, by + 4, bldg.w + 8, 12, bldg.roofShadeHex, '#bae6fd', 16);

    // Friso de 4 bandas cromáticas de los 70 (Cian, Amarillo, Naranja, Verde)
    const frieze = ['#00f3ff', '#facc15', '#f97316', '#22c55e'];
    const segW = Math.floor((bldg.w - 16) / 4);
    frieze.forEach((hex, idx) => {
      ctx.fillStyle = hex;
      ctx.fillRect(bx + 8 + idx * segW, by + 21, segW - 2, 4);
    });
  } else if (style === 'arcade-hall') {
    // ----------------------------------------------------
    // SALA ARCADE DE LOS CUATRO CAMINOS (SALÓN CLAUSURADO)
    // Ladrillo oscuro, parapeto plano, ventanas tapiadas y neón moribundo
    // ----------------------------------------------------
    // Fachada de ladrillo
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 2, by + 22, bldg.w + 4, bldg.h - 20);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 24, bldg.w, bldg.h - 24);

    for (let ry = by + 30, row = 0; ry < by + bldg.h - 8; ry += 8, row++) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(bx, ry, bldg.w, 1);
      for (let rx = bx + (row % 2 === 0 ? 0 : -10); rx < bx + bldg.w; rx += 20) {
        if ((Math.abs(rx) * 13 + ry * 7) % 5 === 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
          ctx.fillRect(rx + 1, ry + 1, 18, 6);
        } else {
          ctx.fillStyle = 'rgba(255, 214, 160, 0.025)';
          ctx.fillRect(rx + 1, ry + 1, 18, 1);
        }
      }
    }

    // Desconchones de ladrillo y humedad
    ctx.fillStyle = 'rgba(20, 14, 9, 0.55)';
    ctx.fillRect(bx + 34, by + 70, 22, 10);
    ctx.fillRect(bx + 120, by + 36, 16, 14);
    ctx.fillStyle = 'rgba(120, 96, 64, 0.18)';
    ctx.fillRect(bx + 52, by + 84, 34, 8);

    // Pilastras de ladrillo claro en los extremos
    ctx.fillStyle = '#5d4431';
    ctx.fillRect(bx, by + 24, 9, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 9, by + 24, 9, bldg.h - 24);
    ctx.fillStyle = '#7a5a3e';
    ctx.fillRect(bx, by + 24, 2, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 9, by + 24, 2, bldg.h - 24);

    // Parapeto plano con alero y grava del techo
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 6, by + 2, bldg.w + 12, 24);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 4, by + 4, bldg.w + 8, 20);
    ctx.fillStyle = bldg.roofShadeHex;
    ctx.fillRect(bx - 4, by + 20, bldg.w + 8, 3);
    for (let gi = 0; gi < 46; gi++) {
      const gx = bx - 2 + ((gi * 37) % (bldg.w + 4));
      const gy = by + 6 + ((gi * 13) % 14);
      ctx.fillStyle = gi % 3 === 0 ? 'rgba(200, 190, 170, 0.18)' : 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(gx, gy, 2, 1);
    }
    // Cornisa de piedra
    ctx.fillStyle = '#8a7458';
    ctx.fillRect(bx - 4, by + 22, bldg.w + 8, 3);
    ctx.fillStyle = '#5d4a36';
    ctx.fillRect(bx - 4, by + 25, bldg.w + 8, 2);

    // Letrero vertical de neón roto junto a la esquina
    const bladeOn = reducedMotion || Math.sin(elapsed * 5.1) > -0.4;
    ctx.fillStyle = '#0b0705';
    ctx.fillRect(bx + 4, by - 18, 22, 42);
    ctx.fillStyle = '#241a12';
    ctx.fillRect(bx + 6, by - 16, 18, 38);
    ctx.fillStyle = bladeOn ? '#f59e0b' : '#6b4a1c';
    ctx.font = '700 6px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ['A', 'R', 'C', 'A'].forEach((letter, idx) => {
      ctx.fillText(letter, bx + 15, by - 7 + idx * 8);
    });
    ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
    ctx.fillRect(bx + 8, by - 14, 14, 34);

    // Ventanas tapiadas con tablones de madera
    const boardWindow = (wx: number, wy: number) => {
      ctx.fillStyle = '#060a12';
      ctx.fillRect(wx - 2, wy - 2, 26, 24);
      ctx.fillStyle = '#2e2117';
      ctx.fillRect(wx, wy, 22, 20);
      ctx.fillStyle = '#6b5236';
      ctx.fillRect(wx + 1, wy + 1, 20, 18);
      ctx.fillStyle = '#8a6b48';
      ctx.fillRect(wx + 1, wy + 1, 20, 2);
      ctx.fillStyle = '#4d3a25';
      ctx.fillRect(wx + 1, wy + 7, 20, 1);
      ctx.fillRect(wx + 1, wy + 13, 20, 1);
      ctx.strokeStyle = '#3a2a19';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + 2, wy + 2);
      ctx.lineTo(wx + 20, wy + 18);
      ctx.moveTo(wx + 20, wy + 2);
      ctx.lineTo(wx + 2, wy + 18);
      ctx.stroke();
      ctx.fillStyle = '#c9b98f';
      ctx.fillRect(wx + 1, wy + 1, 2, 2);
      ctx.fillRect(wx + 19, wy + 1, 2, 2);
      ctx.fillRect(wx + 1, wy + 17, 2, 2);
      ctx.fillRect(wx + 19, wy + 17, 2, 2);
    };
    boardWindow(bx + 16, by + 40);
    boardWindow(bx + bldg.w - 38, by + 40);

    // Cartel descolorido pegado al ladrillo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(bx + 48, by + 40, 16, 20);
    ctx.fillStyle = '#c9b98f';
    ctx.fillRect(bx + 47, by + 39, 16, 20);
    ctx.fillStyle = '#a3271f';
    ctx.fillRect(bx + 51, by + 46, 8, 2);
    ctx.fillRect(bx + 51, by + 51, 6, 2);

    // Canalón oxidado y mancha de óxido
    ctx.fillStyle = '#4a3a2c';
    ctx.fillRect(bx + bldg.w - 4, by + 24, 4, bldg.h - 26);
    ctx.fillStyle = 'rgba(148, 64, 32, 0.35)';
    ctx.fillRect(bx + bldg.w - 8, by + 60, 8, 20);
  } else {
    // ----------------------------------------------------
    // CASA DEL CRONISTA / ALDEA DE LOS ORÍGENES (COTTAGE GBA)
    // Mampostería cálida, teja terracota con alero, chimenea y jardineras
    // ----------------------------------------------------
    // Chimenea de piedra con humo
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx + 20, by - 18, 12, 22);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(bx + 22, by - 16, 8, 18);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(bx + 19, by - 19, 14, 3);
    // Humo blanco
    const puff = Math.floor(elapsed * 2) % 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(bx + 23 + puff * 2, by - 25, 6, 4);

    // Fachada principal
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 2, by + 24, bldg.w + 4, bldg.h - 22);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 26, bldg.w, bldg.h - 26);

    // Sillares esquineros (quoins)
    ctx.fillStyle = '#bca982';
    for (let qy = by + 28; qy < by + bldg.h - 10; qy += 12) {
      ctx.fillRect(bx, qy, 8, 5);
      ctx.fillRect(bx + bldg.w - 8, qy, 8, 5);
      ctx.fillRect(bx, qy + 6, 5, 5);
      ctx.fillRect(bx + bldg.w - 5, qy + 6, 5, 5);
    }

    // Tejado a dos aguas de terracota
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 8, by + 6, bldg.w + 16, 22);
    ctx.fillRect(bx + 24, by - 4, bldg.w - 48, 12);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 6, by + 8, bldg.w + 12, 18);
    ctx.fillRect(bx + 26, by - 2, bldg.w - 52, 10);
    drawRoofTiles(bx - 4, by + 8, bldg.w + 8, 16, bldg.roofShadeHex, '#fca5a5', 14);

    // Sombra de caída bajo el alero del tejado
    ctx.fillStyle = 'rgba(7, 12, 20, 0.35)';
    ctx.fillRect(bx, by + 26, bldg.w, 4);
  }

  // Ventanas artesanales con cristales reflectantes y jardineras florales
  const drawGbaWindow = (wx: number, wy: number, glowHex: string, hasFlowerBox = false) => {
    // Marco exterior con dintel
    ctx.fillStyle = '#060a12';
    ctx.fillRect(wx - 1, wy - 2, 24, 22);
    ctx.fillRect(wx + 1, wy - 4, 20, 2);

    // Dintel de madera / piedra
    ctx.fillStyle = style === 'ruins-sanctuary' || style === 'museum-hall' ? '#d8be88' : '#78350f';
    ctx.fillRect(wx, wy - 3, 22, 2);

    // Vidrio interior cálido
    ctx.fillStyle = glowHex;
    ctx.fillRect(wx + 1, wy, 20, 18);

    // Parteluces en cruz
    ctx.fillStyle = '#060a12';
    ctx.fillRect(wx + 10, wy, 2, 18);
    ctx.fillRect(wx + 1, wy + 8, 20, 2);

    // Destellos diagonales de vidrio
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 3, wy + 2, 4, 2);
    ctx.fillRect(wx + 13, wy + 2, 4, 2);

    // Jardinera con flores bajo la ventana
    if (hasFlowerBox) {
      ctx.fillStyle = '#5c3115';
      ctx.fillRect(wx, wy + 19, 22, 5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(wx + 1, wy + 17, 20, 3);
      // Flores
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(wx + 3, wy + 16, 3, 2);
      ctx.fillRect(wx + 15, wy + 16, 3, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wx + 9, wy + 16, 3, 2);
    }
  };

  const winGlow = style === 'chrono-dome' ? '#67e8f9' : '#fef08a';
  const isCottage = style === 'cottage-archive';
  if (style !== 'arcade-hall') {
    drawGbaWindow(bx + 16, by + 40, winGlow, isCottage);
    drawGbaWindow(bx + bldg.w - 38, by + 40, winGlow, isCottage);
  }

  // Puerta de entrada con dintel de forja, escalón de piedra y pomo de latón
  const dLeft = Math.round(bldg.doorX - 16);
  // Escalón de acceso
  ctx.fillStyle = '#060a12';
  ctx.fillRect(dLeft - 4, by + bldg.h - 38, 40, 42);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(dLeft - 2, by + bldg.h - 1, 36, 5);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(dLeft - 2, by + bldg.h + 2, 36, 2);

  // Marco de la puerta
  ctx.fillStyle =
    style === 'ruins-sanctuary' || style === 'museum-hall'
      ? '#d8be88'
      : style === 'arcade-hall'
        ? '#8a949b'
        : '#6b3c1b';
  ctx.fillRect(dLeft - 2, by + bldg.h - 36, 36, 36);

  // Puerta de madera maciza (persiana metálica en el salón arcade)
  const isArcadeDoor = style === 'arcade-hall';
  ctx.fillStyle = isArcadeDoor ? '#3f474c' : '#45230e';
  ctx.fillRect(dLeft, by + bldg.h - 34, 32, 34);
  // Tablas y molduras de la puerta
  ctx.fillStyle = isArcadeDoor ? '#5b666d' : '#733e1c';
  ctx.fillRect(dLeft + 3, by + bldg.h - 30, 11, 12);
  ctx.fillRect(dLeft + 18, by + bldg.h - 30, 11, 12);
  ctx.fillRect(dLeft + 3, by + bldg.h - 14, 11, 13);
  ctx.fillRect(dLeft + 18, by + bldg.h - 14, 11, 13);
  if (isArcadeDoor) {
    // Lama de persiana y luz cálida escapándose por la rendija inferior
    ctx.fillStyle = '#2c3337';
    for (let ly = by + bldg.h - 32; ly < by + bldg.h - 2; ly += 4) {
      ctx.fillRect(dLeft + 1, ly, 30, 1);
    }
    ctx.fillStyle = 'rgba(253, 224, 139, 0.55)';
    ctx.fillRect(dLeft + 1, by + bldg.h - 2, 30, 2);
    ctx.fillStyle = 'rgba(253, 224, 139, 0.12)';
    ctx.fillRect(dLeft - 2, by + bldg.h, 36, 4);
    // Cadena y candado
    ctx.strokeStyle = '#8a949b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dLeft - 2, by + bldg.h - 20);
    ctx.quadraticCurveTo(dLeft + 16, by + bldg.h - 12, dLeft + 34, by + bldg.h - 22);
    ctx.stroke();
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(dLeft + 14, by + bldg.h - 15, 4, 4);
  }

  // Pomo de latón dorado
  ctx.fillStyle = isArcadeDoor ? '#9aa3a8' : '#fde047';
  ctx.fillRect(dLeft + 24, by + bldg.h - 18, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(dLeft + 25, by + bldg.h - 17, 1, 1);

  // Rótulo arquitectónico pulido sobre el dintel
  const signHalfW = isArcadeDoor ? 50 : 44;
  ctx.fillStyle = '#060a12';
  ctx.fillRect(bldg.doorX - signHalfW, by + 8, signHalfW * 2, 16);
  ctx.fillStyle = isArcadeDoor ? '#f59e0b' : '#d8be88';
  ctx.fillRect(bldg.doorX - signHalfW + 2, by + 10, signHalfW * 2 - 4, 12);
  ctx.fillStyle = isArcadeDoor ? '#241206' : '#0f172a';
  ctx.fillRect(bldg.doorX - signHalfW + 4, by + 12, signHalfW * 2 - 8, 8);
  ctx.fillStyle = isArcadeDoor ? '#fbbf24' : '#fef08a';
  ctx.font = `700 ${isArcadeDoor ? 8 : 7}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(bldg.signText, bldg.doorX, by + (isArcadeDoor ? 20 : 19));

  if (isArcadeDoor) {
    // Neón "ABIERTO" moribundo junto a la puerta
    const openOn = reducedMotion || Math.sin(elapsed * 4.3) > 0.1;
    ctx.fillStyle = '#0b0705';
    ctx.fillRect(bldg.doorX - 62, by + 34, 26, 9);
    ctx.fillStyle = openOn ? '#f59e0b' : '#5a401c';
    ctx.font = '700 5px "JetBrains Mono", monospace';
    ctx.fillText('ABIERTO', bldg.doorX - 49, by + 40);
    // Graffiti desvaído y colillas en el umbral
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.fillRect(bldg.doorX + 38, by + 44, 12, 2);
    ctx.fillRect(bldg.doorX + 44, by + 47, 8, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(bldg.doorX - 24, by + bldg.h + 3, 5, 1);
    ctx.fillRect(bldg.doorX + 10, by + bldg.h + 4, 4, 1);
  }

  ctx.restore();
}

/**
 * EL CASTILLO DEL REY CORRUPTO — Fachada colosal, almenas de basalto, torres centinela,
 * estandarte oscuro ondeando en la niebla, foso abisal, puente levadizo articulado
 * y los 4 pedestales de sellos rúnicos (Sol, Luna, Estrella, Rayo).
 */
export function drawCastleCorruptoExterior(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  elapsed: number,
  reducedMotion: boolean,
  drawbridgeDown: boolean,
  discoveredSecrets: string[]
): void {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  // 1. Aura de corrupción violeta de Super KOOPA en lo alto del castillo
  const auraPulse = reducedMotion ? 1 : 0.85 + Math.sin(elapsed * 2.5) * 0.2;
  const auraGrad = ctx.createRadialGradient(0, -90, 20, 0, -90, 180 * auraPulse);
  auraGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
  auraGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.18)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, -90, 180 * auraPulse, 0, Math.PI * 2);
  ctx.fill();

  // 2. Gran cuerpo central de la fortaleza (basalto negro y piedra milenaria)
  ctx.fillStyle = '#090710';
  ctx.fillRect(-140, -100, 280, 160);
  ctx.fillStyle = '#161224';
  ctx.fillRect(-136, -96, 272, 152);

  // Sillares y bloques de muralla
  ctx.fillStyle = '#261f38';
  for (let row = -90; row < 50; row += 16) {
    for (let col = -130; col < 130; col += 32) {
      const shift = ((row + 90) / 16) % 2 === 0 ? 0 : 16;
      ctx.fillRect(col + shift, row, 28, 2);
    }
  }

  // 3. Torre Central de la Corona (Keep)
  ctx.fillStyle = '#090710';
  ctx.fillRect(-60, -170, 120, 80);
  ctx.fillStyle = '#1a152b';
  ctx.fillRect(-56, -166, 112, 74);
  // Almenas de la torre central
  ctx.fillStyle = '#2d2448';
  for (let ax = -56; ax < 56; ax += 18) {
    ctx.fillRect(ax, -182, 12, 14);
  }

  // Ventanal gótico de la cima iluminado con fulgor violeta (despacho del trono)
  const winGlow = reducedMotion ? 0.7 : 0.5 + Math.sin(elapsed * 4) * 0.4;
  ctx.fillStyle = '#090710';
  ctx.fillRect(-18, -145, 36, 42);
  ctx.fillStyle = `rgba(192, 132, 252, ${winGlow})`;
  ctx.fillRect(-14, -141, 28, 34);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-3, -128, 6, 6);

  // Estandarte oscuro de la fortaleza en lo alto ondeando
  const flagWave = reducedMotion ? 0 : Math.sin(elapsed * 3.5) * 6;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-2, -210, 4, 30);
  ctx.fillStyle = '#090710';
  ctx.fillRect(2, -208, 36 + flagWave, 18);
  ctx.fillStyle = '#581c87';
  ctx.fillRect(2, -206, 32 + flagWave, 14);
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(14 + flagWave * 0.5, -202, 8, 6);

  // 4. Torres centinelas izquierda y derecha
  const drawTower = (tx: number) => {
    ctx.fillStyle = '#090710';
    ctx.fillRect(tx - 36, -140, 72, 170);
    ctx.fillStyle = '#1e1830';
    ctx.fillRect(tx - 32, -136, 64, 162);
    // Almenas
    ctx.fillStyle = '#32284f';
    for (let ax = tx - 32; ax < tx + 32; ax += 16) {
      ctx.fillRect(ax, -150, 10, 12);
    }
    // Tronera / aspillera vertical con luz violeta
    ctx.fillStyle = '#090710';
    ctx.fillRect(tx - 4, -90, 8, 30);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(tx - 2, -88, 4, 26);
  };
  drawTower(-140);
  drawTower(140);

  // 5. Portón y Rastrillo de entrada
  ctx.fillStyle = '#090710';
  ctx.beginPath();
  ctx.arc(0, 10, 36, Math.PI, 0);
  ctx.lineTo(36, 60);
  ctx.lineTo(-36, 60);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1a1329';
  ctx.beginPath();
  ctx.arc(0, 12, 32, Math.PI, 0);
  ctx.lineTo(32, 60);
  ctx.lineTo(-32, 60);
  ctx.closePath();
  ctx.fill();

  // Rastrillo de hierro
  ctx.fillStyle = '#0f172a';
  for (let barX = -26; barX <= 26; barX += 9) {
    ctx.fillRect(barX, -10, 3, 70);
  }
  ctx.fillRect(-28, 16, 56, 3);
  ctx.fillRect(-28, 36, 56, 3);

  // 6. Foso abisal y Puente Levadizo
  ctx.fillStyle = '#05040a';
  ctx.fillRect(-90, 60, 180, 40);

  if (drawbridgeDown) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-32, 60, 64, 40);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-30, 62, 60, 36);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-32, 72, 64, 3);
    ctx.fillRect(-32, 86, 64, 3);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, 100);
    ctx.lineTo(-36, 30);
    ctx.moveTo(32, 100);
    ctx.lineTo(36, 30);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-32, 20, 64, 40);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, 20);
    ctx.lineTo(-36, 0);
    ctx.moveTo(32, 20);
    ctx.lineTo(36, 0);
    ctx.stroke();
  }

  // 7. Los 4 Pedestales de Sellos Rúnicos (Sol, Luna, Estrella, Rayo) y Estela de la Clave
  const seals = [
    { id: 'castle-seal-sol', x: -112, y: 160, sym: '☀', label: 'SOL', hex: '#f59e0b' },
    { id: 'castle-seal-luna', x: -62, y: 180, sym: '☾', label: 'LUNA', hex: '#38bdf8' },
    { id: 'castle-seal-estrella', x: 62, y: 180, sym: '★', label: 'ESTRELLA', hex: '#fde047' },
    { id: 'castle-seal-rayo', x: 112, y: 160, sym: '⚡', label: 'RAYO', hex: '#c084fc' },
  ];

  for (const s of seals) {
    const isLit = discoveredSecrets.includes(s.id);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(s.x - 14, s.y - 18, 28, 24);
    ctx.fillStyle = '#334155';
    ctx.fillRect(s.x - 12, s.y - 16, 24, 20);
    ctx.strokeStyle = isLit ? s.hex : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x - 12, s.y - 16, 24, 20);

    ctx.fillStyle = isLit ? s.hex : '#1e293b';
    ctx.beginPath();
    ctx.arc(s.x, s.y - 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isLit ? '#ffffff' : '#94a3b8';
    ctx.font = '900 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.sym, s.x, s.y - 5);

    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.fillText(s.label, s.x, s.y + 16);
  }

  // Estela Rúnica Central con la pista del acertijo
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, 170, 36, 32);
  ctx.fillStyle = '#1e1b2e';
  ctx.fillRect(-16, 172, 32, 28);
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-16, 172, 32, 28);
  ctx.fillStyle = '#c084fc';
  ctx.font = '700 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◈ CLAVE ◈', 0, 186);
  ctx.font = '700 6px "JetBrains Mono", monospace';
  ctx.fillText('4 SELLOS', 0, 196);

  ctx.restore();
}

export interface IslandRenderFrameParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  camera: { x: number; y: number };
  elapsed: number;
  reducedMotion: boolean;
  stars: IslandStar[];
  ambientBits: IslandAmbientBit[];
  digitalCritters: IslandDigitalCritter[];
  pickupBursts: IslandPickupBurst[];
  player: {
    x: number;
    y: number;
    facing: 1 | -1;
    facingDir?: FacingDirection;
    walking: boolean;
    sprinting?: boolean;
    interactAnim?: number;
  };
  flight: {
    type:
      | 'none'
      | 'pong-landing'
      | 'pong-to-garganta'
      | 'garganta-to-pong'
      | 'shuttle-landing'
      | 'hoverboard';
    elapsed: number;
    duration: number;
    /** Inclinación de la tabla durante el descenso del surf. */
    tilt?: number;
  };
  pongBoardDeparture?: { x: number; y: number; elapsed: number; duration: number } | null;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance?: AvatarAppearance;
  pongRestored: boolean;
  breakoutRestored: boolean;
  glitchTrailCleared: boolean;
  invadersRestored: boolean;
  invadersCabinetUnlocked: boolean;
  volcanicPassageOpen: boolean;
  breakoutSwordExtracting: boolean;
  southShortcutActive: boolean;
  allUnlocked: boolean;
  progressState: PixelverseProgressState;
  activeZoneId: IslandZoneId | null;
  prompt: IslandPromptRenderSpec | null;
  scannerPulse?: { active: boolean; elapsed: number };
}

export function renderIsland70sFrame(params: IslandRenderFrameParams): void {
  const {
    ctx,
    vw,
    vh,
    camera,
    elapsed,
    reducedMotion,
    digitalCritters,
    pickupBursts,
    player,
    flight,
    pongBoardDeparture,
    skinColor,
    hairColor,
    shirtColor,
    appearance,
    pongRestored,
    breakoutRestored,
    glitchTrailCleared,
    invadersRestored,
    invadersCabinetUnlocked,
    volcanicPassageOpen,
    breakoutSwordExtracting,
    southShortcutActive,
    allUnlocked,
    progressState,
    activeZoneId,
    prompt,
    scannerPulse,
  } = params;

  ctx.imageSmoothingEnabled = false;

  const animFrame4 = reducedMotion ? 0 : Math.floor(elapsed * 3.2) % 4;
  const camX = Math.round(camera.x);
  const camY = Math.round(camera.y);
  const tmStatus = evaluateTimeMachineStatus(progressState, allUnlocked);

  // 1. MAR PROFUNDO DEL ARCHIPIÉLAGO CON CORRIENTES Y CRESTAS DE ESPUMA ARTESANALES ESTILO GBA
  ctx.fillStyle = '#0a233a';
  ctx.fillRect(0, 0, vw, vh);

  const startTileX = Math.floor(camX / CELL) - 1;
  const endTileX = Math.ceil((camX + vw) / CELL) + 1;
  const startTileY = Math.floor(camY / CELL) - 1;
  const endTileY = Math.ceil((camY + vh) / CELL) + 1;

  ctx.save();
  ctx.translate(-camX, -camY);

  for (let ty = startTileY; ty <= endTileY; ty++) {
    for (let tx = startTileX; tx <= endTileX; tx++) {
      const wx = tx * CELL;
      const wy = ty * CELL;
      const th = hashTile(tx, ty);

      // Fondo marino con gradiente de profundidad
      ctx.fillStyle = th % 4 === 0 ? '#0d2d4a' : th % 3 === 0 ? '#113b5e' : '#0a233a';
      ctx.fillRect(wx, wy, CELL, CELL);

      // Olas marinas rítmicas animadas estilo Pokémon Esmeralda
      // Patrón de rombos desplazados que se mueven en 4 fases
      const waveShift = ((animFrame4 + (tx % 3) + (ty % 3)) % 4);
      const waveX1 = wx + 4 + waveShift * 4;
      const waveY1 = wy + 8 + (waveShift % 2);
      const waveX2 = wx + 18 - waveShift * 3;
      const waveY2 = wy + 24 - (waveShift % 2);

      // Seno de la ola (sombra marina profunda)
      ctx.fillStyle = '#061726';
      ctx.fillRect(waveX1 - 1, waveY1 + 2, 10, 2);
      ctx.fillRect(waveX2 - 1, waveY2 + 2, 12, 2);

      // Cuerpo de la ola turquesa
      ctx.fillStyle = '#1e688e';
      ctx.fillRect(waveX1, waveY1, 8, 2);
      ctx.fillRect(waveX2, waveY2, 10, 2);

      // Cresta de espuma brillante blanca y cian
      ctx.fillStyle = '#4ecdc4';
      ctx.fillRect(waveX1 + 2, waveY1, 4, 1);
      ctx.fillRect(waveX2 + 3, waveY2, 5, 1);

      // Destello de espuma viva
      if (th % 3 === 0) {
        ctx.fillStyle = '#d1fae5';
        ctx.fillRect(waveX1 + 3, waveY1 - 1, 2, 1);
      }
      if (th % 5 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(waveX2 + 4, waveY2 - 1, 2, 1);
      }
    }
  }

  // 2. COSTAS Y ACANTILADOS ESTRATIFICADOS CON RELIEVE Y ROMPIENTE DE OLAS GBA
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (!isWorldBoxVisible(r.x - 24, r.y - 24, r.w + 48, r.h + 56, camX, camY, vw, vh)) {
      continue;
    }

    if (r.surface !== 'bridge' && r.surface !== 'pier') {
      const isBeach = r.surface === 'sand';

      if (isBeach) {
        // ----------------------------------------------------
        // TRANSICIÓN COSTERA DE PLAYA GBA:
        // Bajío de agua turquesa translúcida + rompiente de espuma animada que lame la arena
        // ----------------------------------------------------
        // 1. Bajío turquesa somero alrededor de la arena
        ctx.fillStyle = 'rgba(45, 180, 210, 0.45)';
        ctx.fillRect(r.x - 14, r.y - 12, r.w + 28, r.h + 24);

        // 2. Línea de marea de arena húmeda más oscura
        ctx.fillStyle = '#ab8942';
        ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 10);

        // 3. Rompiente de espuma blanca animada con oleaje continuo
        ctx.fillStyle = '#ffffff';
        for (let surfX = r.x - 10; surfX < r.x + r.w + 6; surfX += 16) {
          const tideY = Math.round(Math.sin(elapsed * 2.5 + surfX * 0.1) * 3);
          // Espuma norte y sur
          ctx.fillRect(surfX, r.y - 9 + tideY, 10, 2);
          ctx.fillRect(surfX + 6, r.y + r.h + 5 - tideY, 10, 2);
        }
        for (let surfY = r.y; surfY < r.y + r.h; surfY += 16) {
          const tideX = Math.round(Math.cos(elapsed * 2.5 + surfY * 0.1) * 3);
          // Espuma este y oeste
          ctx.fillRect(r.x - 9 + tideX, surfY, 2, 10);
          ctx.fillRect(r.x + r.w + 6 - tideX, surfY + 4, 2, 10);
        }
      } else {
        // ----------------------------------------------------
        // ACANTILADO ROCOSO ESTRATIFICADO GBA:
        // Visera de césped superior con sombra arrojada, cara de roca con pilastras y rompiente
        // ----------------------------------------------------
        const cliffWallH = 22;

        // Espuma de mar en la base del acantilado
        ctx.fillStyle = animFrame4 % 2 === 0 ? '#bbf7d0' : '#67e8f9';
        ctx.fillRect(r.x - 6, r.y + r.h + cliffWallH - 4, r.w + 12, 8);
        ctx.fillStyle = '#ffffff';
        for (let fx = r.x; fx < r.x + r.w; fx += 18) {
          const spray = ((animFrame4 + Math.floor(fx / 18)) % 3) * 2;
          ctx.fillRect(fx, r.y + r.h + cliffWallH - 2 - spray, 8, 3);
        }

        // Base submarina oscura sumergida
        ctx.fillStyle = '#06101a';
        ctx.fillRect(r.x - 2, r.y + r.h + cliffWallH - 2, r.w + 4, 6);

        // Colores geológicos según bioma
        const rockBase = r.surface === 'fortress' ? '#261720' : r.surface === 'crystal' ? '#181329' : '#4d361e';
        const rockFace = r.surface === 'fortress' ? '#3d2735' : r.surface === 'crystal' ? '#2a2245' : '#705130';
        const rockHi = r.surface === 'fortress' ? '#5a3d4f' : r.surface === 'crystal' ? '#3f3468' : '#96724a';
        const rockShadow = r.surface === 'fortress' ? '#1a0e15' : r.surface === 'crystal' ? '#0f0a1d' : '#2d1e10';

        // Pared vertical del acantilado
        ctx.fillStyle = rockFace;
        ctx.fillRect(r.x, r.y + r.h, r.w, cliffWallH);

        // Estratos y pilastras rocosas verticales cada 20 px
        for (let px = r.x; px < r.x + r.w; px += 20) {
          const pw = Math.min(20, r.x + r.w - px);
          // Faceta iluminada en el lado izquierdo de la pilastra
          ctx.fillStyle = rockHi;
          ctx.fillRect(px + 1, r.y + r.h + 1, Math.min(6, pw), cliffWallH - 2);
          // Faceta en sombra en el lado derecho
          ctx.fillStyle = rockShadow;
          ctx.fillRect(px + pw - 4, r.y + r.h + 1, 4, cliffWallH - 2);
          // Fisura vertical
          ctx.fillStyle = '#060a12';
          ctx.fillRect(px, r.y + r.h, 1, cliffWallH);
        }

        // Estratos sedimentarios horizontales
        ctx.fillStyle = rockShadow;
        ctx.fillRect(r.x, r.y + r.h + 8, r.w, 2);
        ctx.fillRect(r.x, r.y + r.h + 15, r.w, 2);
        ctx.fillStyle = rockHi;
        ctx.fillRect(r.x, r.y + r.h + 10, r.w, 1);

        // Sombra arrojada de la visera superior sobre la pared
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(r.x, r.y + r.h, r.w, 4);

        // Visera del terreno que sobresale ligeramente
        ctx.fillStyle = r.surface === 'fortress' ? '#513b48' : r.surface === 'cobble' ? '#d6c394' : '#2d6d34';
        ctx.fillRect(r.x - 2, r.y + r.h - 1, r.w + 4, 2);
      }
    }
  }

  // 3. SUPERFICIES NATURALES Y ARQUEOLÓGICAS DE LOS 10 SECTORES
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (!isWorldBoxVisible(r.x, r.y, r.w, r.h, camX, camY, vw, vh)) continue;

    const rTx0 = Math.max(startTileX, Math.floor(r.x / CELL));
    const rTx1 = Math.min(endTileX, Math.ceil((r.x + r.w) / CELL) - 1);
    const rTy0 = Math.max(startTileY, Math.floor(r.y / CELL));
    const rTy1 = Math.min(endTileY, Math.ceil((r.y + r.h) / CELL) - 1);

    for (let ty = rTy0; ty <= rTy1; ty++) {
      for (let tx = rTx0; tx <= rTx1; tx++) {
        drawGbcWalkableSurfaceTile(
          ctx,
          tx,
          ty,
          tx * CELL,
          ty * CELL,
          r.surface,
          r.zoneId,
          animFrame4
        );
      }
    }
  }

  // 3B. SENDEROS ORGÁNICOS Y ESCALINATAS TALLADAS ENTRE DESNIVELES
  drawHandcraftedPathsAndStairs(ctx, camX, camY, vw, vh);
  drawIslandWoodRailSystem(
    ctx,
    camX,
    camY,
    vw,
    vh,
    southShortcutActive,
    glitchTrailCleared
  );
  drawVolcanicFortressDetails(ctx, elapsed, volcanicPassageOpen);
  if (isWorldBoxVisible(1560, -580, 760, 760, camX, camY, vw, vh)) {
    drawNorthernArcadeDistrict(ctx, elapsed);
  }

  // 4. COMPOSICIÓN AMBIENTAL ARTESANAL POR SECTOR
  // 4A. Arroyo cristalino y puente de madera hacia el Claro de Pong (1972)
  if (isWorldBoxVisible(2592, 1440, 64, 480, camX, camY, vw, vh)) {
    for (let cy = 1440; cy < 1920; cy += CELL) {
      // Lecho del río de grava visible bajo el agua
      ctx.fillStyle = '#1e3a4e';
      ctx.fillRect(2598, cy, 44, CELL);
      ctx.fillStyle = '#2d5a7b';
      ctx.fillRect(2602, cy, 36, CELL);

      // Corriente de agua transparente
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fillRect(2602, cy, 36, CELL);

      // Ondas animadas de corriente que fluyen hacia el sur
      const flowShift = (animFrame4 * 7) % 24;
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(2606, cy + flowShift, 10, 2);
      ctx.fillRect(2622, cy + ((flowShift + 12) % 24), 12, 2);

      // Orillas de piedra y césped del arroyo
      ctx.fillStyle = '#060a12';
      ctx.fillRect(2598, cy, 2, CELL);
      ctx.fillRect(2640, cy, 2, CELL);
      ctx.fillStyle = '#2d6d34';
      ctx.fillRect(2596, cy + 4, 3, 6);
      ctx.fillRect(2641, cy + 12, 3, 6);
    }

    // Puente de madera arqueado sobre el arroyo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(2588, 1588, 64, 68);

    ctx.fillStyle = '#060a12';
    ctx.fillRect(2590, 1582, 60, 68);
    ctx.fillStyle = '#b47336';
    ctx.fillRect(2592, 1584, 56, 64);

    // Tablas del puente
    ctx.fillStyle = '#5c3115';
    for (let px = 2596; px < 2648; px += 8) {
      ctx.fillRect(px, 1584, 2, 64);
    }
    // Barandillas laterales del puente
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(2592, 1584, 56, 5);
    ctx.fillRect(2592, 1643, 56, 5);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(2592, 1584, 56, 1);
    ctx.fillRect(2592, 1643, 56, 1);
  }

  // 4B. Fosos magmáticos y murallas del Bastión de las Oleadas (1978)
  for (const lava of VOLCANIC_LAVA_POOLS) {
    if (!isWorldBoxVisible(lava.x, lava.y, lava.w, lava.h, camX, camY, vw, vh)) continue;
    ctx.fillStyle = '#060a12';
    ctx.fillRect(lava.x - 4, lava.y - 4, lava.w + 8, lava.h + 8);
    ctx.fillStyle = '#2e1215';
    ctx.fillRect(lava.x - 2, lava.y - 2, lava.w + 4, lava.h + 4);

    for (let ly = lava.y; ly < lava.y + lava.h; ly += CELL) {
      for (let lx = lava.x; lx < lava.x + lava.w; lx += CELL) {
        const cw = Math.min(CELL, lava.x + lava.w - lx);
        const ch = Math.min(CELL, lava.y + lava.h - ly);

        // Magma incandescente con burbujas y calor ascendente
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(lx, ly, cw, ch);
        const shift = ((animFrame4 + Math.floor(lx / CELL)) % 4) * 4;
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(lx + 3, ly + 3 + (shift % 12), Math.max(4, cw - 6), 7);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(lx + 6, ly + 6 + (shift % 9), Math.max(2, cw - 14), 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lx + 8, ly + 7 + (shift % 9), 2, 2);
      }
    }
  }

  // Murallas del Bastión de las Oleadas
  if (isWorldBoxVisible(2400, 400, 816, 48, camX, camY, vw, vh)) {
    ctx.fillStyle = '#060a12';
    ctx.fillRect(2866, 410, 352, 28);
    ctx.fillStyle = '#4c333f';
    ctx.fillRect(2868, 412, 348, 24);
    ctx.fillStyle = '#6b4759';
    ctx.fillRect(2868, 412, 348, 2);

    // Almenas
    for (let mx = 2872; mx < 3210; mx += 20) {
      ctx.fillStyle = '#060a12';
      ctx.fillRect(mx - 1, 403, 12, 10);
      ctx.fillStyle = '#5a3d4c';
      ctx.fillRect(mx, 404, 10, 8);
      ctx.fillStyle = '#82596e';
      ctx.fillRect(mx, 404, 10, 2);
    }
  }

  // 4C. Cascada animada con pasadizo secreto a la Gruta Subterránea
  if (
    isWorldBoxVisible(
      WATERFALL_SECRET_ENTRANCE.x - 48,
      WATERFALL_SECRET_ENTRANCE.y - 64,
      96,
      96,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const wx = WATERFALL_SECRET_ENTRANCE.x - 24;
    const wy = WATERFALL_SECRET_ENTRANCE.y - 44;

    // Pared rocosa que enmarca la cascada
    ctx.fillStyle = '#060a12';
    ctx.fillRect(wx - 4, wy - 4, 56, 60);
    ctx.fillStyle = '#423226';
    ctx.fillRect(wx - 2, wy - 2, 52, 56);

    // Caverna oscura interior si ha sido descubierta
    const discoveredWf =
      progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
    if (discoveredWf) {
      ctx.fillStyle = '#03060c';
      ctx.fillRect(wx + 10, wy + 16, 28, 36);
    }

    // Cortina de agua en caída vertical
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(wx, wy, 48, 52);

    // Franjas de agua torrencial animadas en tiempo real
    ctx.fillStyle = '#38bdf8';
    for (let sy = 0; sy < 48; sy += 10) {
      const dropY = wy + ((sy + animFrame4 * 5) % 48);
      ctx.fillRect(wx + 3, dropY, 8, 8);
      ctx.fillRect(wx + 37, dropY, 8, 8);
      if (!discoveredWf) {
        ctx.fillRect(wx + 18, dropY, 12, 8);
      }
    }

    // Resaltes espumosos blancos de agua rápida
    ctx.fillStyle = '#ffffff';
    for (let sy = 0; sy < 48; sy += 14) {
      const dropY = wy + ((sy + animFrame4 * 6) % 48);
      ctx.fillRect(wx + 5, dropY, 4, 4);
      ctx.fillRect(wx + 39, dropY, 4, 4);
    }

    // Poza de agua con espuma hirviente en la base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx - 4, wy + 48, 56, 7);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(wx - 2, wy + 52, 52, 4);
  }

  // 4D. La Aldea de los Orígenes: Fuente de las Primeras Señales, bancos de madera y cercas rústicas
  if (isWorldBoxVisible(340, 1700, 520, 220, camX, camY, vw, vh)) {
    drawRusticFence(ctx, 352, 1712, 7);
    drawRusticFence(ctx, 724, 1712, 5);

    // Fuente ornamental circular en la plazuela (x=592, y=1848)
    const fx = 592;
    const fy = 1848;

    // Sombra de la fuente
    ctx.fillStyle = 'rgba(5, 8, 14, 0.45)';
    ctx.fillRect(fx - 24, fy - 6, 48, 22);

    // Basamento octogonal de sillería labrada
    ctx.fillStyle = '#060a12';
    ctx.fillRect(fx - 22, fy - 12, 44, 24);
    ctx.fillRect(fx - 18, fy - 16, 36, 32);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(fx - 20, fy - 10, 40, 20);
    ctx.fillRect(fx - 16, fy - 14, 32, 28);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(fx - 18, fy - 14, 36, 3);
    ctx.fillRect(fx - 20, fy - 10, 3, 20);

    // Estanque de agua cristalina
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(fx - 14, fy - 6, 28, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(fx - 11, fy - 4, 22, 10);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(fx - 7, fy - 3, 14, 3);

    // Pedestal central y surtidor de agua
    ctx.fillStyle = '#060a12';
    ctx.fillRect(fx - 6, fy - 16, 12, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(fx - 5, fy - 15, 10, 10);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(fx - 4, fy - 17, 8, 3);

    // Chorro de agua que danza
    const jetH = (animFrame4 % 2 === 0 ? 8 : 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(fx - 2, fy - 17 - jetH, 4, jetH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx - 1, fy - 18 - jetH, 2, 3);

    // Bancos de descanso de madera artesanal
    const drawBench = (bx: number, by: number) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(bx - 14, by + 3, 28, 5);
      ctx.fillStyle = '#060a12';
      ctx.fillRect(bx - 14, by - 8, 28, 14);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(bx - 12, by - 6, 24, 10);
      ctx.fillStyle = '#d8be88';
      ctx.fillRect(bx - 12, by - 6, 24, 2);
      ctx.fillRect(bx - 12, by - 2, 24, 2);
      // Patas de hierro
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 10, by + 2, 3, 4);
      ctx.fillRect(bx + 7, by + 2, 3, 4);
    };
    drawBench(544, 1848);
    drawBench(640, 1848);
  }

  // Puente Colgante Recto sobre la lava (Camino obligatorio)
  const bSpec = LAVA_STRAIGHT_BRIDGE_SPEC;
  if (isWorldBoxVisible(bSpec.x - 60, bSpec.y - 60, bSpec.w + 120, bSpec.h + 120, camX, camY, vw, vh)) {
    const drawSuspensionArch = (tx: number, ty: number) => {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(tx - 12, ty - 24, 24, 48);
      
      // Pilares del arco (Piedra volcánica tallada)
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(tx - 10, ty - 60, 6, 64); // Pillar Norte
      ctx.fillRect(tx + 4, ty - 60, 6, 64); // Pillar Sur
      
      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(tx - 8, ty - 58, 2, 60);
      ctx.fillRect(tx + 6, ty - 58, 2, 60);

      // Travesaño superior del arco
      ctx.fillStyle = '#2c2c2e';
      ctx.fillRect(tx - 12, ty - 64, 24, 12);
      ctx.fillStyle = '#451a03'; // Madera de refuerzo
      ctx.fillRect(tx - 10, ty - 62, 20, 8);
      
      // Luz de baliza integrada
      const glow = 0.5 + Math.sin(elapsed * 4) * 0.4;
      ctx.fillStyle = `rgba(239, 68, 68, ${glow})`;
      ctx.fillRect(tx - 3, ty - 60, 6, 3);
    };

    // 1. Sombra arrojada sobre la lava
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(bSpec.x + 8, bSpec.y + 8, bSpec.w, bSpec.h);
    
    // 2. Cuerdas principales
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4a2c12';
    ctx.beginPath();
    ctx.moveTo(bSpec.x, bSpec.y + 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y + 4);
    ctx.moveTo(bSpec.x, bSpec.y + bSpec.h - 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y + bSpec.h - 4);
    ctx.stroke();

    // 3. Tablones de madera colgantes
    ctx.fillStyle = '#5c3115';
    const plankGap = 12;
    for (let px = bSpec.x; px < bSpec.x + bSpec.w; px += plankGap) {
      const sway = Math.sin(elapsed * 2.5 + px * 0.08) * 1.5;
      ctx.fillRect(px, bSpec.y + 6 + sway, 8, bSpec.h - 12);
      ctx.fillStyle = '#783e1c';
      ctx.fillRect(px + 2, bSpec.y + 8 + sway, 2, bSpec.h - 16);
      ctx.fillStyle = '#5c3115';
    }

    // 4. Barandillas de cuerda
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bSpec.x, bSpec.y - 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y - 4);
    ctx.moveTo(bSpec.x, bSpec.y + bSpec.h + 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y + bSpec.h + 4);
    ctx.stroke();

    // 5. Ataduras verticales
    ctx.fillStyle = '#b45309';
    for (let px = bSpec.x + 8; px < bSpec.x + bSpec.w; px += 24) {
      ctx.fillRect(px, bSpec.y - 4, 2, 8);
      ctx.fillRect(px, bSpec.y + bSpec.h - 4, 2, 8);
    }

    // Efecto de partículas de calor y brasas ascendentes
    for (let i = 0; i < 40; i++) {
      const pSeed = hashTile(i, 999);
      const px = bSpec.x + (pSeed % bSpec.w);
      const py = bSpec.y + (pSeed % bSpec.h);
      const pSpeed = 15 + (pSeed % 20);
      const pLift = (elapsed * pSpeed) % 80;
      const pFlicker = reducedMotion ? 0.8 : 0.4 + Math.sin(elapsed * 12 + i) * 0.4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pFlicker * (1 - pLift / 80));
      ctx.fillStyle = pSeed % 3 === 0 ? '#facc15' : '#ef4444';
      ctx.fillRect(px, py - pLift + 20, 2, 2);
      ctx.restore();
    }

    // Arcos de entrada y salida
    drawSuspensionArch(bSpec.x, bSpec.y + bSpec.h / 2);
    drawSuspensionArch(bSpec.x + bSpec.w, bSpec.y + bSpec.h / 2);

    // Balizas de seguridad industrial sobre los arcos
    const beacons = [{ x: bSpec.x, y: bSpec.y + bSpec.h / 2 - 58 }, { x: bSpec.x + bSpec.w, y: bSpec.y + bSpec.h / 2 - 58 }];
    for (const b of beacons) {
      const pulse = reducedMotion ? 1 : 0.5 + Math.sin(elapsed * 10) * 0.5;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      const grad = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 12);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
      grad.addColorStop(1, 'rgba(127, 29, 29, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  for (const mound of ISLAND_SAND_MOUNDS) {
    if (isWorldBoxVisible(mound.x - 24, mound.y - 24, 48, 48, camX, camY, vw, vh)) {
      const collected = progressState.rpg.openedChestIds.includes(mound.id);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(mound.x - 14, mound.y - 4, 28, 10);
      ctx.fillStyle = '#d9b878';
      ctx.fillRect(mound.x - 12, mound.y - 10, 24, 14);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(mound.x - 8, mound.y - 10, 16, 4);
      if (!collected && mound.rewardItemId) {
        ctx.fillStyle = animFrame4 % 2 === 0 ? '#00f3ff' : '#fde047';
        ctx.fillRect(mound.x - 2, mound.y - 14, 4, 4);
      }
    }
  }

  // 4E. Puente de Asteroides Lunares (Conexión entre Lava y Zona Lunar)
  if (isWorldBoxVisible(MOONSTONE_PATH_RECT.x - 40, MOONSTONE_PATH_RECT.y - 40, MOONSTONE_PATH_RECT.w + 80, MOONSTONE_PATH_RECT.h + 80, camX, camY, vw, vh)) {
    // Lava petrificada a los costados
    const drawPetrifiedLava = (px: number, py: number, pw: number, ph: number) => {
      ctx.fillStyle = '#1a1414';
      ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
      ctx.fillStyle = '#2d2424';
      ctx.fillRect(px, py, pw, ph);
      // Grietas de calor residual
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(px + 4, py + ph / 2, pw - 8, 2);
    };

    // Dibujar bordes de lava petrificada
    drawPetrifiedLava(1360, 580, 200, 20); // Borde norte
    drawPetrifiedLava(1360, 740, 200, 20); // Borde sur

    // Dibujar un asteroide individual con detalle rocoso y cráteres lunares
    const drawAsteroid = (ax: number, ay: number, size: number, index: number) => {
      const floatY = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 2.2 + index * 0.7) * 2);
      const x = Math.round(ax);
      const y = Math.round(ay + floatY);

      // Sombra arrojada sobre la lava inferior
      ctx.fillStyle = 'rgba(10, 5, 20, 0.55)';
      ctx.fillRect(x - size / 2, y + size / 2 + 4, size, 6);

      // Aura de energía gravítica lunar cian/púrpura
      const pulse = 0.4 + Math.sin(elapsed * 3.5 + index * 1.1) * 0.25;
      const grad = ctx.createRadialGradient(x, y, 2, x, y, size * 0.9);
      grad.addColorStop(0, `rgba(168, 85, 247, ${pulse * 0.5})`);
      grad.addColorStop(0.7, `rgba(56, 189, 248, ${pulse * 0.25})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Silueta exterior del asteroide (piedra facetada irregular)
      ctx.fillStyle = '#0f0e26';
      ctx.fillRect(x - size / 2 - 1, y - size / 2 - 1, size + 2, size + 2);

      // Cuerpo principal de basalto estelar
      ctx.fillStyle = '#2e1065';
      ctx.fillRect(x - size / 2, y - size / 2, size, size);

      // Faceta sombreada inferior
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(x - size / 2 + 1, y, size - 2, size / 2 - 1);

      // Faceta iluminada superior lunar
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(x - size / 2 + 2, y - size / 2 + 1, size - 4, size / 2 - 1);

      // Cráteres de impacto lunares
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(x - 4, y - 3, 4, 3);
      ctx.fillRect(x + 2, y + 2, 3, 3);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(x - 3, y - 2, 2, 1);
      ctx.fillRect(x + 3, y + 3, 1, 1);

      // Crestas brillantes de cristal de lunarita en los bordes
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(x - size / 2 + 2, y - size / 2 + 1, size / 3, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - size / 2 + 3, y - size / 2 + 1, 2, 1);
    };

    // Travesaño / Conexión de puente de plasma entre asteroides consecutivos
    const drawBridgeConnector = (x1: number, y1: number, x2: number, y2: number, index: number) => {
      const pulse = 0.5 + Math.sin(elapsed * 4 + index) * 0.3;
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(168, 85, 247, ${pulse})`;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // Secuencia continua de asteroides alineados como un puente (de oeste a este, 3 filas entrelazadas)
    const bridgeCols = [1370, 1395, 1420, 1445, 1470, 1495, 1520, 1545];
    const bridgeRows = [625, 665, 705];

    // 1. Dibujar conectores de puente entre asteroides adyacentes
    for (let r = 0; r < bridgeRows.length; r++) {
      for (let c = 0; c < bridgeCols.length - 1; c++) {
        drawBridgeConnector(
          bridgeCols[c],
          bridgeRows[r],
          bridgeCols[c + 1],
          bridgeRows[r],
          c + r * 10
        );
      }
    }
    // Conectores transversales verticales
    for (let c = 0; c < bridgeCols.length; c++) {
      for (let r = 0; r < bridgeRows.length - 1; r++) {
        drawBridgeConnector(
          bridgeCols[c],
          bridgeRows[r],
          bridgeCols[c],
          bridgeRows[r + 1],
          c * 5 + r
        );
      }
    }

    // 2. Dibujar la cadena alineada de asteroides uno tras otro
    let astIdx = 0;
    for (let c = 0; c < bridgeCols.length; c++) {
      for (let r = 0; r < bridgeRows.length; r++) {
        const bx = bridgeCols[c];
        const by = bridgeRows[r];
        const size = (c % 2 === 0 && r === 1) ? 24 : 20;
        drawAsteroid(bx, by, size, astIdx++);
      }
    }
  }


  // 4F. Mosaico Astral en la Plaza de Las Ruinas del Primer Pulso
  if (isWorldBoxVisible(1860, 1220, 260, 140, camX, camY, vw, vh)) {
    const mx = 1996;
    const my = 1284;
    ctx.fillStyle = 'rgba(5, 9, 18, 0.45)';
    ctx.fillRect(mx - 34, my - 44, 68, 88);
    ctx.fillRect(mx - 44, my - 34, 88, 68);

    // Marco exterior de basalto
    ctx.fillStyle = '#060a12';
    ctx.fillRect(mx - 32, my - 42, 64, 84);
    ctx.fillRect(mx - 42, my - 32, 84, 64);

    // Anillo cerámico de lapislázuli
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(mx - 30, my - 40, 60, 80);
    ctx.fillRect(mx - 40, my - 30, 80, 60);

    // Incrustaciones de oro con constelaciones
    ctx.fillStyle = '#facc15';
    ctx.fillRect(mx - 26, my - 34, 52, 68);
    ctx.fillRect(mx - 34, my - 26, 68, 52);
    ctx.fillStyle = '#172554';
    ctx.fillRect(mx - 22, my - 28, 44, 56);
    ctx.fillRect(mx - 28, my - 22, 56, 44);

    // Rombos de pulso astral grabados
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(mx - 4, my - 20, 8, 4);
    ctx.fillRect(mx - 20, my - 4, 4, 8);
    ctx.fillRect(mx + 16, my - 4, 4, 8);
    ctx.fillRect(mx - 4, my + 16, 8, 4);

    // Núcleo central pulsante
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#00f3ff' : '#fde047';
    ctx.fillRect(mx - 4, my - 4, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  // 4F. La Costa de las Máquinas Olvidadas: Columnas jónicas y Altar
  if (isWorldBoxVisible(3080, 1390, 260, 190, camX, camY, vw, vh)) {
    const drawRuinPillar = (px: number, py: number, broken: boolean) => {
      const h = broken ? 24 : 40;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(px - 10, py + 2, 20, 4);
      ctx.fillStyle = '#060a12';
      ctx.fillRect(px - 10, py - h, 20, h + 4);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(px - 8, py - h + 2, 16, h);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(px + 2, py - h + 2, 6, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 8, py - h + 2, 3, h);
      // Capitel y base
      ctx.fillStyle = '#d8be88';
      ctx.fillRect(px - 10, py - h, 20, 4);
      ctx.fillRect(px - 10, py - 2, 20, 4);
    };

    drawRuinPillar(3196, 1488, false);
    drawRuinPillar(3300, 1488, true);
    drawRuinPillar(3196, 1548, true);
    drawRuinPillar(3300, 1548, false);

    // Altar central
    ctx.fillStyle = '#060a12';
    ctx.fillRect(3228, 1482, 40, 30);
    ctx.fillStyle = '#d9b878';
    ctx.fillRect(3230, 1484, 36, 26);
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#00f3ff' : '#fde047';
    ctx.fillRect(3242, 1492, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3245, 1495, 6, 6);

    drawForgottenCoastalCabinet(
      ctx,
      3128,
      1428,
      progressState.rpg.discoveredSecretIds.includes('secret-costa-recreativa'),
      elapsed
    );
  }

  // 4G. Las 3 Estelas Arqueológicas de Símbolos de Pulso ([ ◈ ], [ ◈◈ ], [ ◈◈◈ ])
  const glyphSteles: { x: number; y: number; idx: 1 | 2 | 3; sec: string; hex: string }[] = [
    { x: 828, y: 1948, idx: 1, sec: 'secret-glyph-1', hex: '#38bdf8' },
    { x: 1192, y: 956, idx: 2, sec: 'secret-glyph-2', hex: '#34d399' },
    { x: 3064, y: 1764, idx: 3, sec: 'secret-glyph-3', hex: '#fde047' },
  ];
  for (const gs of glyphSteles) {
    if (isWorldBoxVisible(gs.x - 24, gs.y - 48, 48, 56, camX, camY, vw, vh)) {
      drawPulseGlyphStele(
        ctx,
        gs.x,
        gs.y,
        gs.idx,
        allUnlocked || progressState.rpg.discoveredSecretIds.includes(gs.sec),
        gs.hex,
        elapsed,
        reducedMotion
      );
    }
  }

  // 5. TÚNELES SUBTERRÁNEOS EN ROCAS, CARTELES Y TERMINAL DE GUARDADO
  for (const tunnel of COASTAL_SUBTERRANEAN_TUNNELS) {
    if (isWorldBoxVisible(tunnel.x - 28, tunnel.y - 38, 56, 48, camX, camY, vw, vh)) {
      drawGbcRockTunnelEntrance(ctx, tunnel.x, tunnel.y);
    }
  }

  // Escotilla Cifrada hacia el Laberinto de Señales (1976) al norte de las Praderas de Pong
  if (
    isWorldBoxVisible(
      LABYRINTH_1976_ENTRANCE.x - 32,
      LABYRINTH_1976_ENTRANCE.y - 28,
      64,
      56,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    drawLabyrinth1976Hatch(
      ctx,
      LABYRINTH_1976_ENTRANCE.x,
      LABYRINTH_1976_ENTRANCE.y,
      Boolean(progressState.games['breakout']?.memoryUnlocked) || allUnlocked,
      elapsed
    );
  }

  for (const sign of ISLAND_WOODEN_SIGNS) {
    if (isWorldBoxVisible(sign.x - 20, sign.y - 30, 40, 40, camX, camY, vw, vh)) {
      drawGbcWoodenSign(ctx, sign.x, sign.y, sign.mapLabel, sign.large);
    }
  }

  if (
    isWorldBoxVisible(
      VILLAGE_SAVE_TERMINAL.x - 24,
      VILLAGE_SAVE_TERMINAL.y - 36,
      48,
      48,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    drawGbcSaveTerminal(
      ctx,
      VILLAGE_SAVE_TERMINAL.x,
      VILLAGE_SAVE_TERMINAL.y,
      elapsed,
      Boolean(progressState.rpg.lastManualSaveIso)
    );
  }

  // 5B. PORTALES ANÓMALOS DE PIXELVERSE (Inactivos vs Sincronizados)
  const syncedGlyphsCount = ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'].filter(
    (id) => allUnlocked || progressState.rpg.discoveredSecretIds.includes(id)
  ).length;

  for (const portal of ISLAND_ANOMALY_PORTALS) {
    if (!isWorldBoxVisible(portal.x - 40, portal.y - 76, 80, 96, camX, camY, vw, vh)) {
      continue;
    }
    const unlocked =
      allUnlocked ||
      !portal.requiredSecretIds ||
      portal.requiredSecretIds.every((req) =>
        progressState.rpg.discoveredSecretIds.includes(req)
      );
    drawAnomalyPortalWorld(
      ctx,
      portal,
      unlocked,
      syncedGlyphsCount,
      elapsed,
      reducedMotion
    );
  }

  // Criaturas ambientales amistosas (luciérnagas de señal en Bosque y Praderas)
  for (const critter of digitalCritters) {
    const cx = Math.round(
      critter.homeX + (reducedMotion ? 0 : Math.sin(elapsed * 1.6 + critter.phase) * 24)
    );
    const cy = Math.round(
      critter.homeY + (reducedMotion ? 0 : Math.cos(elapsed * 2.1 + critter.phase) * 14)
    );
    if (!isWorldBoxVisible(cx - 8, cy - 8, 16, 16, camX, camY, vw, vh)) continue;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(cx - 4, cy - 4, 8, 6);
    ctx.fillStyle = critter.color;
    ctx.fillRect(cx - 2, cy - 2, 4, 3);
  }

  // 6. PORTAL DEL SENDERO DEL GLITCH, PLATAFORMA ESTELAR, MONOLITOS Y OBJETOS DE SUELO
  {
    const gp = ISLAND_KEY_COORDS.glitchTrailPortal;
    if (isWorldBoxVisible(gp.x - 54, gp.y - 80, 108, 100, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(gp.x), Math.round(gp.y));

      // Sombra de contacto
      ctx.fillStyle = 'rgba(5, 8, 14, 0.5)';
      ctx.fillRect(-44, 2, 88, 8);

      // Portal megalítico de dolmen / torii de piedra antigua
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-44, -72, 88, 76);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-40, -68, 16, 70);
      ctx.fillRect(24, -68, 16, 70);
      ctx.fillRect(-44, -74, 88, 14);

      // Biseles de cantería
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-44, -74, 86, 2);
      ctx.fillRect(-40, -68, 3, 68);
      ctx.fillRect(24, -68, 3, 68);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-27, -68, 3, 68);
      ctx.fillRect(37, -68, 3, 68);

      // Vórtice de distorsión del Glitch interior (artefactos cromáticos animados)
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-24, -64, 48, 66);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#4338ca' : '#7c3aed';
      ctx.fillRect(-22, -62, 44, 64);

      // Franjas de desfase digital y ruido cuántico
      ctx.fillStyle = '#00f3ff';
      const gShift = (animFrame4 * 7) % 36;
      ctx.fillRect(-18, -56 + gShift, 36, 4);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-16, -42 - (gShift % 20), 32, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -50 + (animFrame4 % 4) * 6, 20, 4);

      ctx.restore();
    }
  }

  {
    const pad = ISLAND_KEY_COORDS.starShuttlePad;
    if (isWorldBoxVisible(pad.x - 220, pad.y - 340, 340, 400, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(pad.x), Math.round(pad.y + 12));
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-56, -20, 112, 40);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-52, -16, 104, 32);
      ctx.strokeStyle = invadersRestored ? '#5cc8ff' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(-44, -10, 88, 20);
      ctx.restore();

      if (flight.type === 'shuttle-landing') {
        const p = Math.min(1, flight.elapsed / flight.duration);
        const lp = Math.min(1, p / 0.72);
        const easeOut = 1 - Math.pow(1 - lp, 3);
        const sx = pad.x - 190 * (1 - easeOut);
        const sy = pad.y - 310 * (1 - easeOut);
        drawStarShuttle(ctx, sx, sy, 0.8 + 0.25 * easeOut, (1 - easeOut) * 0.14, p < 0.74);
      } else if (invadersRestored) {
        drawStarShuttle(ctx, pad.x, pad.y, 1.05, 0, false);
      }
    }
  }

  {
    const ast = ISLAND_KEY_COORDS.architectAstrolabe;
    if (isWorldBoxVisible(ast.x - 70, ast.y - 70, 140, 110, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(ast.x), Math.round(ast.y));

      // Sombra en el suelo
      ctx.fillStyle = 'rgba(5, 8, 14, 0.46)';
      ctx.fillRect(-48, 16, 96, 12);

      // Basamento escalonado de mármol y bronce
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-48, 2, 96, 24);
      ctx.fillRect(-40, -6, 80, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-46, 4, 92, 20);
      ctx.fillRect(-38, -4, 76, 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-46, 4, 90, 2);
      ctx.fillRect(-38, -4, 74, 2);

      // Columna / pedestal del astrolabio
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-20, -46, 40, 42);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-18, -44, 36, 40);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-18, -44, 36, 3);
      ctx.fillRect(-18, -44, 3, 38);

      // Anillos concéntricos del astrolabio armilar (latón labrado)
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-24, -40, 48, 4);
      ctx.fillRect(-30, -30, 60, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-22, -39, 44, 2);
      ctx.fillRect(-28, -29, 56, 2);

      // 3 Gemas de hito histórico que se encienden al restaurar los juegos:
      // Gema 1: Pong (1972) - Esmeralda verde
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-14, -36, 10, 10);
      ctx.fillStyle = pongRestored ? '#22c55e' : '#334155';
      ctx.fillRect(-13, -35, 8, 8);
      if (pongRestored) {
        ctx.fillStyle = '#86efac';
        ctx.fillRect(-12, -34, 3, 3);
      }

      // Gema 2: Glitch Trail - Zafiro cian
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-5, -24, 10, 10);
      ctx.fillStyle = glitchTrailCleared ? '#00f3ff' : '#334155';
      ctx.fillRect(-4, -23, 8, 8);
      if (glitchTrailCleared) {
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(-3, -22, 3, 3);
      }

      // Gema 3: Space Invaders (1978) - Rubí solar
      ctx.fillStyle = '#070b14';
      ctx.fillRect(4, -36, 10, 10);
      ctx.fillStyle = invadersRestored ? '#ef4444' : '#334155';
      ctx.fillRect(5, -35, 8, 8);
      if (invadersRestored) {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(6, -34, 3, 3);
      }

      ctx.restore();
    }
  }

  for (const vista of DISTANT_DECADE_VISTAS) {
    if (!isWorldBoxVisible(vista.x - 20, vista.y - 30, 40, 40, camX, camY, vw, vh)) {
      continue;
    }
    ctx.save();
    ctx.translate(Math.round(vista.x), Math.round(vista.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.42)';
    ctx.fillRect(-8, 2, 16, 4);

    // Trípode de forja / pedestal
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-2, -16, 4, 18);
    ctx.fillRect(-6, 0, 12, 3);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-1, -15, 2, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-5, 0, 10, 1);

    // Tubo óptico del catalejo / telescopio panorámico de costa
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-10, -26, 22, 11);
    ctx.fillRect(10, -24, 4, 7);
    // Carcasa de latón pulido
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-8, -24, 18, 7);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-8, -24, 18, 2);
    // Franja con el acento cromático de la década
    ctx.fillStyle = vista.accentHex;
    ctx.fillRect(-2, -24, 6, 7);
    // Lente frontal de cristal azul reflectante
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(10, -23, 2, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, -23, 1, 2);

    ctx.restore();
  }

  for (const sw of ISLAND_SWITCHES) {
    if (!isWorldBoxVisible(sw.x - 24, sw.y - 32, 48, 48, camX, camY, vw, vh)) continue;
    const active = progressState.island70s.activatedIslandSwitches.includes(sw.id);
    ctx.save();
    ctx.translate(Math.round(sw.x), Math.round(sw.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.44)';
    ctx.fillRect(-14, 2, 28, 6);

    // Pedestal de piedra labrada estilo templo/ruinas GBA
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-12, -20, 24, 24);
    ctx.fillRect(-14, -22, 28, 4);
    ctx.fillRect(-14, 0, 28, 4);

    ctx.fillStyle = '#475569';
    ctx.fillRect(-10, -18, 20, 20);
    // Biseles de luz y sombra en el fuste
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-12, -22, 26, 2);
    ctx.fillRect(-10, -18, 3, 18);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(7, -18, 3, 18);
    ctx.fillRect(-14, 2, 28, 2);

    // Ranura del mecanismo
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-4, -14, 8, 12);

    // Palanca / interruptor físico (arriba si inactivo, abajo/activado con brillo si activo)
    if (active) {
      // Posición activada: palanca bajada, gema encendida
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -6, 4, 6);
      ctx.fillStyle = sw.accentHex;
      ctx.fillRect(-4, -4, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -3, 3, 2);

      // Chispas de energía activa
      if (animFrame4 % 2 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -16, 2, 2);
        ctx.fillRect(4, -16, 2, 2);
      }
    } else {
      // Posición inactiva: palanca alzada
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -18, 4, 10);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3, -20, 6, 4);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -19, 2, 2);
    }

    ctx.restore();
  }

  for (const echo of ISLAND_ECHOES) {
    if (!isWorldBoxVisible(echo.x - 26, echo.y - 36, 52, 52, camX, camY, vw, vh)) continue;
    const discovered = progressState.island70s.discoveredEchoIds.includes(echo.id);
    ctx.save();
    ctx.translate(Math.round(echo.x), Math.round(echo.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.45)';
    ctx.fillRect(-16, 2, 32, 6);

    // Estela monolítica de basalto con silueta y biseles
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-14, -30, 28, 34);
    ctx.fillRect(-12, -32, 24, 4);
    ctx.fillRect(-16, 0, 32, 4);

    // Cuerpo de piedra oscura tallada
    ctx.fillStyle = discovered ? '#334155' : '#1e293b';
    ctx.fillRect(-12, -28, 24, 30);
    // Biseles de iluminación
    ctx.fillStyle = discovered ? '#64748b' : '#475569';
    ctx.fillRect(-12, -31, 22, 2);
    ctx.fillRect(-12, -28, 3, 28);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(9, -28, 3, 28);

    // Placa de visualización cronológica (estilo display de cuarzo o nixie)
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-10, -24, 20, 14);
    ctx.fillStyle = discovered ? '#0f172a' : '#172554';
    ctx.fillRect(-9, -23, 18, 12);

    // Borde de fósforo con el color del eco
    ctx.fillStyle = echo.accentHex;
    ctx.fillRect(-9, -23, 18, 1);
    ctx.fillRect(-9, -12, 18, 1);

    // Tipografía nítida para el año
    ctx.fillStyle = discovered ? '#cbd5e1' : echo.accentHex;
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(echo.year), 0, -14);

    // Glifos grabados en la base del monolito
    ctx.fillStyle = discovered ? '#475569' : echo.accentHex;
    ctx.fillRect(-6, -6, 3, 2);
    ctx.fillRect(3, -6, 3, 2);
    ctx.fillRect(-2, -3, 4, 2);

    ctx.restore();
  }

  for (const dia of ISLAND_DIAMONDS) {
    if (progressState.island70s.collectedDiamondIds.includes(dia.id)) continue;
    if (dia.requiresShortcut && !southShortcutActive) continue;
    if (!isWorldBoxVisible(dia.x - 24, dia.y - 32, 48, 48, camX, camY, vw, vh)) continue;
    const bob = reducedMotion ? 0 : animFrame4 % 2 === 0 ? -2 : 0;
    const dx = Math.round(dia.x);
    const dy = Math.round(dia.y + bob);

    ctx.save();
    ctx.translate(dx, dy);

    // Sombra elíptica en el suelo que no bobea
    ctx.fillStyle = 'rgba(5, 8, 14, 0.4)';
    ctx.fillRect(-8, 8 - bob, 16, 4);

    // Contorno exterior nítido del diamante
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-9, -18, 18, 12);
    ctx.fillRect(-7, -21, 14, 18);
    ctx.fillRect(-4, -23, 8, 22);

    // Facetas del diamante (corte brillante con gradiente de luz cian/zafiro)
    // Faceta superior izquierda (luz pura)
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(-7, -19, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -20, 4, 3);
    // Faceta central
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-2, -19, 8, 6);
    // Facetas inferiores (sombra zafiro)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-6, -13, 6, 7);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, -13, 6, 7);
    // Punta inferior del diamante
    ctx.fillStyle = '#075985';
    ctx.fillRect(-2, -6, 4, 4);

    // Destello blanco especular animado en la esquina superior izquierda
    if (animFrame4 % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -17, 3, 3);
      ctx.fillRect(-8, -16, 5, 1);
      ctx.fillRect(-6, -18, 1, 5);
    }

    ctx.restore();
  }

  if (
    pongRestored &&
    flight.type !== 'pong-to-garganta' &&
    flight.type !== 'garganta-to-pong' &&
    flight.type !== 'pong-landing'
  ) {
    drawPongHoverboard(
      ctx,
      ISLAND_KEY_COORDS.pongBoardLaunch.x,
      ISLAND_KEY_COORDS.pongBoardLaunch.y,
      0,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
  }
  if (
    pongRestored &&
    flight.type !== 'pong-to-garganta' &&
    flight.type !== 'garganta-to-pong' &&
    flight.type !== 'pong-landing' &&
    !pongBoardDeparture
  ) {
    drawPongHoverboard(
      ctx,
      ISLAND_KEY_COORDS.pongBoardLanding.x - 42,
      ISLAND_KEY_COORDS.pongBoardLanding.y + 16,
      0,
      false,
      elapsed + 1.2,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
  }

  if (
    isWorldBoxVisible(
      HARBOR_80S_FERRY.x - 60,
      HARBOR_80S_FERRY.y - 45,
      120,
      90,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const ferryReady =
      invadersRestored ||
      allUnlocked ||
      progressState.rpg.unlockedIslands.includes('island-80s');
    const bobFerry = reducedMotion ? 0 : animFrame4 % 2 === 0 ? 0 : 2;
    ctx.save();
    ctx.translate(Math.round(HARBOR_80S_FERRY.x), Math.round(HARBOR_80S_FERRY.y + bobFerry));

    // Estela de agua y oleaje suave alrededor del casco del barco
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(-48, 14, 96, 4);
    ctx.fillRect(-52, 16, 104, 3);

    // Silueta general del casco
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-46, -18, 92, 34);
    ctx.fillRect(-50, -6, 100, 22);

    // Casco del navío: rojo granate o azul oscuro según estado
    ctx.fillStyle = ferryReady ? '#991b1b' : '#334155';
    ctx.fillRect(-48, -4, 96, 18);
    // Franja de flotación en la línea de agua
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-48, 6, 96, 3);
    // Quilla inferior sumergida
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-44, 9, 88, 4);

    // Cubierta de madera con tablazón
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-44, -7, 88, 4);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-42, -7, 84, 1);

    // Barandilla de cubierta
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-44, -11, 88, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-43, -10, 86, 2);

    // Cabina superior de mando y camarotes (blanco marfil con ventanas iluminadas)
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-34, -26, 68, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-32, -24, 64, 13);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-32, -15, 64, 3);

    // Ventanas / ojos de buey de la cabina
    ctx.fillStyle = '#0284c7';
    for (let wx = -26; wx <= 22; wx += 12) {
      ctx.fillRect(wx, -21, 6, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wx + 1, -20, 2, 2);
      ctx.fillStyle = '#0284c7';
    }

    // Chimenea / chimenea de vapor con franjas retro
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-4, -36, 12, 11);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-3, -34, 10, 8);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-4, -36, 12, 2);
    // Humillo de vapor saliendo de la chimenea
    if (!reducedMotion) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
      const smk = (animFrame4 % 3) * 2;
      ctx.fillRect(0 - smk, -40 - smk, 4, 3);
      ctx.fillRect(2 - smk, -44 - smk, 6, 4);
    }

    // Salvavidas ornamental rojo y blanco en la amura
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-38, -3, 8, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-37, -2, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-36, -1, 4, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-35, 0, 2, 2);

    // Rótulo del navío
    ctx.fillStyle = '#070b14';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ferryReady ? 'TRANS-80s' : 'FERRY 70s', 4, -13);

    ctx.restore();
  }

  if (
    isWorldBoxVisible(
      BROKEN_RELAY_MECHANISM.x - 24,
      BROKEN_RELAY_MECHANISM.y - 28,
      48,
      48,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const repaired = progressState.rpg.repairedMechanismIds.includes(
      BROKEN_RELAY_MECHANISM.id
    );
    ctx.save();
    ctx.translate(Math.round(BROKEN_RELAY_MECHANISM.x), Math.round(BROKEN_RELAY_MECHANISM.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.45)';
    ctx.fillRect(-16, 2, 32, 6);

    // Bastidor de hierro forjado
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-16, -26, 32, 30);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-14, -24, 28, 26);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-14, -24, 26, 2);
    ctx.fillRect(-14, -24, 2, 24);

    // Bobinas de cobre
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-10, -18, 8, 16);
    ctx.fillRect(2, -18, 8, 16);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-9, -17, 6, 2);
    ctx.fillRect(-9, -13, 6, 2);
    ctx.fillRect(-9, -9, 6, 2);
    ctx.fillRect(3, -17, 6, 2);
    ctx.fillRect(3, -13, 6, 2);
    ctx.fillRect(3, -9, 6, 2);

    // Válvulas de vacío / tubos termoiónicos en la parte superior
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -28, 6, 5);
    ctx.fillRect(2, -28, 6, 5);
    if (repaired) {
      // Válvulas activas con cálido resplandor de filamento y luz verde
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-7, -27, 4, 3);
      ctx.fillRect(3, -27, 4, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-2, -4, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -3, 2, 2);
    } else {
      // Válvulas apagadas y led rojo de avería parpadeante
      ctx.fillStyle = '#475569';
      ctx.fillRect(-7, -27, 4, 3);
      ctx.fillRect(3, -27, 4, 3);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#ef4444' : '#7f1d1d';
      ctx.fillRect(-2, -4, 4, 4);
      if (animFrame4 % 2 === 0) {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(-1, -3, 2, 2);
      }
    }

    ctx.restore();
  }

  for (const chest of RPG_CHESTS) {
    if (chest.areaId !== 'exterior-70s') continue;
    if (!isWorldBoxVisible(chest.x - 24, chest.y - 24, 48, 48, camX, camY, vw, vh)) {
      continue;
    }
    const opened = progressState.rpg.openedChestIds.includes(chest.id);
    drawRpgTreasureChest(
      ctx,
      chest.x,
      chest.y,
      opened,
      chest.accentHex,
      elapsed,
      reducedMotion
    );
  }

  // 6C. EL CASTILLO DEL REY CORRUPTO (CUMBRE SEPTENTRIONAL)
  const castleX = 1952;
  const castleY = -680;
  if (isWorldBoxVisible(castleX - 220, castleY - 240, 440, 480, camX, camY, vw, vh)) {
    const drawbridgeDown =
      allUnlocked ||
      progressState.rpg.discoveredSecretIds.includes('castle-drawbridge-lowered') ||
      progressState.rpg.solvedPuzzleIds.includes('puzzle-sellos-castillo');
    drawCastleCorruptoExterior(
      ctx,
      castleX,
      castleY,
      elapsed,
      reducedMotion,
      drawbridgeDown,
      progressState.rpg.discoveredSecretIds
    );
  }

  // 7. CAPAS DE PROFUNDIDAD CON ORDENAMIENTO Y (Y-SORTING)
  // Permite que Pixel pase detrás de copas de árboles, farolas, tejados y arcos cuando está al norte,
  // y delante cuando camina al sur de su base.
  const ySortedDrawables: { sortY: number; draw: () => void }[] = [];

  for (const tree of ISLAND_TREES) {
    if (isWorldBoxVisible(tree.x - 32, tree.y - 58, 64, 72, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: tree.y,
        draw: () => drawHandcraftedTree(ctx, tree.x, tree.y, tree.variant),
      });
    }
  }

  for (const lamp of PHOSPHOR_LAMPS) {
    if (isWorldBoxVisible(lamp.x - 34, lamp.y - 54, 68, 68, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: lamp.y,
        draw: () =>
          drawPhosphorStreetlamp(ctx, lamp.x, lamp.y, lamp.color, elapsed, reducedMotion),
      });
    }
  }

  for (const mill of SIGNAL_WINDMILLS) {
    if (isWorldBoxVisible(mill.x - 28, mill.y - 68, 56, 76, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: mill.y,
        draw: () => drawSignalWindmill(ctx, mill.x, mill.y, elapsed, reducedMotion),
      });
    }
  }

  const northernArcades: { id: NorthArcadeId; x: number; y: number; restored: boolean }[] = [
    { id: 'seaWolf', ...NORTH_ARCADE_LAYOUT.arcades.seaWolf, restored: Boolean(progressState.games['sea-wolf']?.memoryUnlocked) || allUnlocked },
    { id: 'tank', ...NORTH_ARCADE_LAYOUT.arcades.tank, restored: Boolean(progressState.games['tank']?.memoryUnlocked) || allUnlocked },
    { id: 'lunarLander', ...NORTH_ARCADE_LAYOUT.arcades.lunarLander, restored: Boolean(progressState.games['lunar-lander']?.memoryUnlocked) || allUnlocked },
    { id: 'galaxian', ...NORTH_ARCADE_LAYOUT.arcades.galaxian, restored: Boolean(progressState.games['galaxian']?.memoryUnlocked) || allUnlocked },
  ];
  for (const arcade of northernArcades) {
    if (!isWorldBoxVisible(arcade.x - 54, arcade.y - 90, 108, 120, camX, camY, vw, vh)) continue;
    ySortedDrawables.push({
      sortY: arcade.y,
      draw: () => drawNorthernArcadeCabinet(ctx, arcade.id, arcade.x, arcade.y, elapsed, arcade.restored),
    });
  }

  // Terminal de Conducción Night Driver (1976) en la Costa Oriental
  const ndPos = ISLAND_KEY_COORDS.nightDriverTerminal;
  if (isWorldBoxVisible(ndPos.x - 40, ndPos.y - 70, 80, 90, camX, camY, vw, vh)) {
    ySortedDrawables.push({
      sortY: ndPos.y,
      draw: () =>
        drawNightDriverArcadeTerminal(
          ctx,
          ndPos.x,
          ndPos.y,
          elapsed,
          Boolean(progressState.games['night-driver']?.memoryUnlocked) || allUnlocked
        ),
    });
  }

  const volcanicArcades: { id: 'asteroids' | 'breakout'; x: number; y: number; restored: boolean }[] = [
    { id: 'asteroids', ...VOLCANIC_ARCADE_LAYOUT.asteroids, restored: Boolean(progressState.games['asteroids']?.memoryUnlocked) || allUnlocked },
    { id: 'breakout', ...VOLCANIC_ARCADE_LAYOUT.breakout, restored: Boolean(progressState.games['breakout']?.memoryUnlocked) || allUnlocked },
  ];
  for (const arcade of volcanicArcades) {
    if (!isWorldBoxVisible(arcade.x - 54, arcade.y - 90, 108, 120, camX, camY, vw, vh)) continue;
    ySortedDrawables.push({
      sortY: arcade.y,
      draw: () => drawNorthernArcadeCabinet(ctx, arcade.id, arcade.x, arcade.y, elapsed, arcade.restored),
    });
  }

  if (isWorldBoxVisible(VOLCANIC_ARCADE_LAYOUT.breakoutStone.x - 44, VOLCANIC_ARCADE_LAYOUT.breakoutStone.y - 50, 88, 84, camX, camY, vw, vh)) {
    const swordClaimed = breakoutRestored && progressState.rpg.discoveredSecretIds.includes('breakout-sword-extracted');
    ySortedDrawables.push({
      sortY: VOLCANIC_ARCADE_LAYOUT.breakoutStone.y + 18,
      draw: () => drawBreakoutLegendStone(ctx, VOLCANIC_ARCADE_LAYOUT.breakoutStone.x, VOLCANIC_ARCADE_LAYOUT.breakoutStone.y, elapsed, swordClaimed, breakoutSwordExtracting),
    });
  }

  if (isWorldBoxVisible(VOLCANIC_ARCADE_LAYOUT.guard.x - 24, VOLCANIC_ARCADE_LAYOUT.guard.y - 48, 48, 58, camX, camY, vw, vh)) {
    const guardApproved = allUnlocked || progressState.island70s.talkedNpcIds.includes(VOLCANIC_GUARD_ID);
    ySortedDrawables.push({
      sortY: VOLCANIC_ARCADE_LAYOUT.guard.y,
      draw: () => drawVolcanicGuard(ctx, VOLCANIC_ARCADE_LAYOUT.guard.x, VOLCANIC_ARCADE_LAYOUT.guard.y, elapsed, guardApproved),
    });
  }

  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.pongCabinet.x - 75,
      ISLAND_KEY_COORDS.pongCabinet.y - 80,
      150,
      120,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ISLAND_KEY_COORDS.pongCabinet.y,
      draw: () =>
        drawPong1972CabinetWorld(
          ctx,
          ISLAND_KEY_COORDS.pongCabinet.x,
          ISLAND_KEY_COORDS.pongCabinet.y,
          pongRestored,
          elapsed
        ),
    });
  }

  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.invadersCabinet.x - 80,
      ISLAND_KEY_COORDS.invadersCabinet.y - 85,
      160,
      125,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ISLAND_KEY_COORDS.invadersCabinet.y,
      draw: () =>
        drawSpaceInvaders1978CabinetWorld(
          ctx,
          ISLAND_KEY_COORDS.invadersCabinet.x,
          ISLAND_KEY_COORDS.invadersCabinet.y,
          invadersRestored,
          invadersCabinetUnlocked,
          elapsed
        ),
    });
  }

  for (const bldg of ISLAND_70S_BUILDINGS) {
    if (
      isWorldBoxVisible(
        bldg.x - 28,
        bldg.y - 48,
        bldg.w + 56,
        bldg.h + 76,
        camX,
        camY,
        vw,
        vh
      )
    ) {
      ySortedDrawables.push({
        sortY: bldg.y + bldg.h,
        draw: () =>
          drawPixelverseBuilding(
            ctx,
            bldg,
            elapsed,
            reducedMotion,
            tmStatus.canTravelTo80s
          ),
      });
    }
  }

  for (const entrance of ISLAND_NORTH_CAVE_ENTRANCES) {
    if (!isWorldBoxVisible(entrance.x - 36, entrance.y - 46, 72, 58, camX, camY, vw, vh)) {
      continue;
    }
    ySortedDrawables.push({
      sortY: entrance.y,
      draw: () => drawGbaNorthCaveEntrance(ctx, entrance, elapsed),
    });
  }

  for (const npc of ISLAND_NPCS) {
    if (!isWorldBoxVisible(npc.x - 20, npc.y - 36, 40, 48, camX, camY, vw, vh)) continue;
    ySortedDrawables.push({
      sortY: npc.y,
      draw: () => drawGbaNpcSprite(ctx, npc, elapsed, reducedMotion, animFrame4),
    });
  }

  // Criaturas guardianas originales en el mundo exterior (Lumen-Bit y Vectra-79)
  for (const creature of GUARDIAN_CREATURES) {
    if (creature.areaId !== 'exterior-70s') continue;
    if (!isWorldBoxVisible(creature.x - 32, creature.y - 40, 64, 56, camX, camY, vw, vh)) {
      continue;
    }
    const calmed =
      allUnlocked || progressState.rpg.calmedCreatureIds.includes(creature.id);
    ySortedDrawables.push({
      sortY: creature.y,
      draw: () =>
        drawGuardianCreatureSprite(ctx, creature, calmed, elapsed, reducedMotion),
    });
  }

  // Jugador Pixel integrado en el ordenamiento de profundidad cuando camina en tierra
  const playerFlyingHover =
    flight.type === 'pong-landing' ||
    flight.type === 'pong-to-garganta' ||
    flight.type === 'garganta-to-pong' ||
    flight.type === 'hoverboard';
  if (
    !playerFlyingHover &&
    (flight.type !== 'shuttle-landing' || flight.elapsed / flight.duration >= 0.72)
  ) {
    ySortedDrawables.push({
      // Ordenar por el contacto de las botas con el suelo conserva la oclusión de copas y troncos.
      sortY: player.y + 4,
      draw: () =>
        drawPixelAvatar4Dir(
          ctx,
          player.x,
          player.y,
          player.facingDir ?? (player.facing >= 0 ? 'right' : 'left'),
          player.walking,
          Boolean(player.sprinting),
          elapsed,
          skinColor,
          hairColor,
          shirtColor,
          {
            reducedMotion,
            equippedCosmetic: progressState.rpg.equippedCosmetic,
            lanternActive: progressState.rpg.lanternActive,
            interactAnim: player.interactAnim,
            appearance,
          }
        ),
    });

    if (progressState.rpg.dylanEscortActive) {
      const dir = player.facingDir ?? 'down';
      const dylanOx = dir === 'left' ? 24 : dir === 'right' ? -24 : -16;
      const dylanOy = dir === 'up' ? 20 : dir === 'down' ? -20 : 0;
      ySortedDrawables.push({
        sortY: player.y + dylanOy + 4,
        draw: () =>
          drawEscortDylan(
            ctx,
            player.x + dylanOx,
            player.y + dylanOy,
            dir,
            player.walking,
            elapsed
          ),
      });
    }
  }

  ySortedDrawables.sort((a, b) => a.sortY - b.sortY);
  for (const item of ySortedDrawables) {
    item.draw();
  }

  // Si Pixel vuela por el aire sobre la Tabla de Pong, se dibuja por encima del dosel
  if (playerFlyingHover) {
    const rideTilt =
      flight.type === 'pong-to-garganta'
        ? -0.18
        : flight.type === 'garganta-to-pong'
          ? 0.18
          : flight.type === 'pong-landing'
            ? flight.tilt ?? 0
            : 0;
    // Estela acuática bajo la tabla cuando el surf avanza sobre el mar
    if (flight.type === 'pong-landing' || flight.type === 'pong-to-garganta') {
      ctx.save();
      ctx.translate(player.x, player.y + 8);
      ctx.rotate(rideTilt);
      const wake = ctx.createLinearGradient(-120, 0, 0, 0);
      wake.addColorStop(0, 'rgba(224, 250, 255, 0)');
      wake.addColorStop(0.6, 'rgba(190, 246, 255, 0.28)');
      wake.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
      ctx.fillStyle = wake;
      ctx.fillRect(-120, -4, 120, 9);
      for (let i = 0; i < 5; i++) {
        const dist = 18 + i * 21;
        const spread = 3 + i * 2.3;
        const drift = Math.sin(elapsed * 8 - i * 1.1) * 2;
        ctx.fillStyle = `rgba(224, 250, 255, ${(0.5 - i * 0.08).toFixed(2)})`;
        ctx.fillRect(-dist - 10, -spread, 11, 2);
        ctx.fillRect(-dist - 10, spread, 11, 2);
      }
      const bowPulse = reducedMotion ? 0.7 : 0.5 + Math.sin(elapsed * 11) * 0.25;
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 + bowPulse * 0.3).toFixed(2)})`;
      ctx.fillRect(19, -3, 7, 2);
      ctx.restore();
    }
    drawPongHoverboard(
      ctx,
      player.x,
      player.y,
      rideTilt,
      true,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
  }

  // La Barra de Pong despega del punto de aterrizaje y se pierde en el horizonte
  if (pongBoardDeparture && pongBoardDeparture.duration > 0) {
    const depT = Math.min(1, pongBoardDeparture.elapsed / pongBoardDeparture.duration);
    const depEase = 1 - Math.pow(1 - depT, 2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - depT);
    drawPongHoverboard(
      ctx,
      pongBoardDeparture.x + depEase * 260,
      pongBoardDeparture.y - depEase * 150,
      -0.12 - depT * 0.22,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
    ctx.restore();
  }

  // 8. ONDA DE PULSO DEL SONAR DE FRECUENCIAS TTL [R]
  if (scannerPulse && scannerPulse.active) {
    const pRatio = Math.min(1, scannerPulse.elapsed / 1.45);
    const radius = Math.round(24 + pRatio * 480);
    ctx.save();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(Math.round(player.x), Math.round(player.y - 10), radius, 0, Math.PI * 2);
    ctx.stroke();

    const secretTargets: { x: number; y: number; tag: string }[] = [
      {
        x: WATERFALL_SECRET_ENTRANCE.x,
        y: WATERFALL_SECRET_ENTRANCE.y,
        tag: '¡GRUTA TRAS CASCADA!',
      },
      ...ISLAND_NORTH_CAVE_ENTRANCES.map((entrance) => ({
        x: entrance.x,
        y: entrance.y,
        tag: 'CAVIDAD BOREAL',
      })),
      {
        x: LABYRINTH_1976_ENTRANCE.x,
        y: LABYRINTH_1976_ENTRANCE.y,
        tag: 'ESCOTILLA LABERINTO 1976',
      },
      ...GUARDIAN_CREATURES.filter((cr) => cr.areaId === 'exterior-70s').map((cr) => ({
        x: cr.x,
        y: cr.y,
        tag: 'GUARDIÁN DE FRECUENCIA',
      })),
      ...ISLAND_ANOMALY_PORTALS.map((ap) => ({
        x: ap.x,
        y: ap.y,
        tag: 'PORTAL ANÓMALO',
      })),
      ...COASTAL_SUBTERRANEAN_TUNNELS.map((t) => ({
        x: t.x,
        y: t.y,
        tag: 'TÚNEL EN ROCA',
      })),
      ...RPG_CHESTS.filter(
        (c) =>
          c.areaId === 'exterior-70s' &&
          !progressState.rpg.openedChestIds.includes(c.id)
      ).map((c) => ({ x: c.x, y: c.y, tag: 'COFRE OCULTO' })),
      ...RPG_EXAMINABLES.filter((ex) => ex.areaId === 'exterior-70s').map((ex) => ({
        x: ex.x,
        y: ex.y,
        tag: ex.id.startsWith('exam-simbolo-pulso') ? 'GLIFO DE PULSO' : 'HALLAZGO ARQUEOLÓGICO',
      })),
    ];

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const st of secretTargets) {
      if (Math.hypot(st.x - player.x, st.y - player.y) <= radius + 30) {
        ctx.fillStyle = '#070b14';
        ctx.fillRect(st.x - 66, st.y - 46, 132, 16);
        ctx.fillStyle = '#f8f5e6';
        ctx.fillText(`▶ ${st.tag}`, st.x, st.y - 35);
      }
    }
    ctx.restore();
  }

  // Etiqueta flotante de interacción [E] con marco propio de PIXELVERSE (obsidiana + bronce)
  if (prompt && (flight.type === 'none' || flight.type === 'hoverboard')) {
    const py = Math.round(prompt.y - 54 + (animFrame4 % 2 === 0 ? 0 : -2));
    const px = Math.round(prompt.x);
    ctx.save();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const badgeText = `[E] ${prompt.actionLabel}`;
    const tw = Math.ceil(ctx.measureText(badgeText).width) + 20;
    const left = Math.round(px - tw / 2);

    ctx.fillStyle = '#050811';
    ctx.fillRect(left - 2, py - 16, tw + 4, 24);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(left, py - 14, tw, 20);
    ctx.fillStyle = '#0b1324';
    ctx.fillRect(left + 2, py - 12, tw - 4, 16);
    ctx.fillStyle = '#f8f5e6';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, px, py);
    ctx.restore();
  }

  for (const pb of pickupBursts) {
    ctx.fillStyle = pb.color;
    ctx.fillRect(Math.round(pb.x - 2), Math.round(pb.y - 2), 6, 6);
  }

  // 9. ILUMINACIÓN ATMOSFÉRICA HD-2D + RGB PLAYGROUNDS (halos aditivos limpios y semánticos)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lightPools: { x: number; y: number; r: number; rgba: string }[] = [
    ...PHOSPHOR_LAMPS.map((l) => ({
      x: l.x,
      y: l.y - 18,
      r: 72,
      rgba: l.color === '#00f3ff' ? 'rgba(0, 243, 255, 0.11)' : 'rgba(251, 191, 36, 0.12)',
    })),
    {
      x: ISLAND_KEY_COORDS.pongCabinet.x,
      y: ISLAND_KEY_COORDS.pongCabinet.y - 24,
      r: 92,
      rgba: pongRestored ? 'rgba(0, 243, 255, 0.14)' : 'rgba(250, 204, 21, 0.1)',
    },
    {
      x: ISLAND_KEY_COORDS.invadersCabinet.x,
      y: ISLAND_KEY_COORDS.invadersCabinet.y - 26,
      r: 96,
      rgba: invadersRestored ? 'rgba(57, 255, 20, 0.14)' : 'rgba(249, 115, 22, 0.12)',
    },
    {
      x: ISLAND_KEY_COORDS.glitchTrailPortal.x,
      y: ISLAND_KEY_COORDS.glitchTrailPortal.y - 28,
      r: 105,
      rgba: 'rgba(168, 85, 247, 0.14)',
    },
    {
      x: 1640,
      y: 990,
      r: 110,
      rgba: 'rgba(34, 211, 238, 0.11)',
    },
    {
      x: LABYRINTH_1976_ENTRANCE.x,
      y: LABYRINTH_1976_ENTRANCE.y,
      r: 68,
      rgba: 'rgba(249, 115, 22, 0.13)',
    },
  ];
  for (const lp of lightPools) {
    if (!isWorldBoxVisible(lp.x - lp.r, lp.y - lp.r, lp.r * 2, lp.r * 2, camX, camY, vw, vh)) {
      continue;
    }
    const g = ctx.createRadialGradient(lp.x, lp.y, 4, lp.x, lp.y, lp.r);
    g.addColorStop(0, lp.rgba);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, lp.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();

  if (activeZoneId) {
    ctx.fillStyle = ISLAND_ZONES[activeZoneId].ambientTint;
    ctx.fillRect(0, 0, vw, vh);
  }

  // Viñeta cinematográfica sutil estilo Octopath / HD-2D sin oscurecer el centro jugable
  const vig = ctx.createRadialGradient(
    vw * 0.5,
    vh * 0.5,
    Math.min(vw, vh) * 0.36,
    vw * 0.5,
    vh * 0.5,
    Math.max(vw, vh) * 0.74
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(2, 6, 18, 0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);
}
