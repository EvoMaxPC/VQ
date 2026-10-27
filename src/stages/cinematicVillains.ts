/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sprites pixel-art de alta fidelidad (renderizado entero sin suavizado)
 * para los antagonistas clásicos de los videojuegos, SUPER CUPA y Pixel.
 */

function px(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  u: number,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(ox + gx * u),
    Math.round(oy + gy * u),
    Math.max(1, Math.round(gw * u)),
    Math.max(1, Math.round(gh * u))
  );
}

function drawBackAura(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  colorInner: string,
  alpha = 0.24
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  grad.addColorStop(0, colorInner);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* =========================================================================
   ILUMINACIÓN CINEMÁTICA DE SPRITES
   Los villanos se dibujan en un lienzo fuera de pantalla y reciben una pasada
   de luz volumétrica (clave cálida desde arriba, contraluz fría desde los
   portales y rebote cálido desde la derecha). Así dejan de verse como
   recortes planos y se integran a la iluminación del salón.
   ========================================================================= */

interface LitSpriteEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const litSpriteCache = new Map<string, LitSpriteEntry>();

interface LitSpriteBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawLitSprite(
  target: CanvasRenderingContext2D,
  box: LitSpriteBox,
  key: string,
  draw: (c: CanvasRenderingContext2D) => void,
  opts: { rim?: string; warm?: string; shade?: number; alpha?: number } = {}
): void {
  const PAD = 4;
  const bx = Math.round(box.x);
  const by = Math.round(box.y);
  const w = Math.max(1, Math.ceil(box.w));
  const h = Math.max(1, Math.ceil(box.h));
  const cw = w + PAD * 2;
  const ch = h + PAD * 2;

  let entry = litSpriteCache.get(key);
  if (!entry || entry.canvas.width !== cw || entry.canvas.height !== ch) {
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const c2d = canvas.getContext('2d');
    if (!c2d) return;
    entry = { canvas, ctx: c2d };
    litSpriteCache.set(key, entry);
  }

  const c = entry.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.filter = 'none';
  c.clearRect(0, 0, cw, ch);
  c.save();
  c.translate(PAD - bx, PAD - by);
  draw(c);
  c.restore();

  const shade = opts.shade ?? 1;

  c.save();
  c.beginPath();
  c.rect(PAD, PAD, w, h);
  c.clip();
  c.globalCompositeOperation = 'source-atop';

  // Luz clave: incide desde arriba y funde el tercio inferior en sombra
  const keyGrad = c.createLinearGradient(0, PAD, 0, PAD + h);
  keyGrad.addColorStop(0, `rgba(255, 236, 190, ${0.24 * shade})`);
  keyGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.02)');
  keyGrad.addColorStop(1, `rgba(2, 6, 23, ${0.52 * shade})`);
  c.fillStyle = keyGrad;
  c.fillRect(PAD, PAD, w, h);

  // Contraluz fría desde los portales (borde izquierdo)
  const rimGrad = c.createLinearGradient(PAD, PAD, PAD + w * 0.52, PAD + h * 0.95);
  rimGrad.addColorStop(0, opts.rim ?? 'rgba(125, 211, 252, 0.34)');
  rimGrad.addColorStop(0.5, 'rgba(125, 211, 252, 0)');
  c.fillStyle = rimGrad;
  c.fillRect(PAD, PAD, w, h);

  // Rebote cálido del núcleo del Reinicio Cero (borde derecho)
  const warmGrad = c.createLinearGradient(PAD + w, PAD + h, PAD + w * 0.52, PAD + h * 0.3);
  warmGrad.addColorStop(0, opts.warm ?? 'rgba(251, 146, 60, 0.26)');
  warmGrad.addColorStop(0.62, 'rgba(251, 146, 60, 0)');
  c.fillStyle = warmGrad;
  c.fillRect(PAD, PAD, w, h);

  c.restore();

  target.save();
  target.imageSmoothingEnabled = false;
  target.globalAlpha = (target.globalAlpha || 1) * (opts.alpha ?? 1);
  target.drawImage(entry.canvas, bx - PAD, by - PAD, cw, ch);
  target.restore();
}

/* =========================================================================
   1. BOWSER — SUPER MARIO BROS.
      Caparazón verde con púas blancas/naranja, cuernos marfil, melena roja,
      mandíbula carnosa con colmillos, brazaletes con pinchos y aliento ígneo.
   ========================================================================= */
export function drawBowserClassic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  const box = {
    x: cx - 20 * u,
    y: bottomY - 34 * u,
    w: 62 * u,
    h: 37 * u,
  };
  drawLitSprite(
    ctx,
    box,
    `bowser-${u.toFixed(2)}`,
    (c) => drawBowserBody(c, cx, bottomY, u, time),
    { rim: 'rgba(147, 197, 253, 0.4)', warm: 'rgba(251, 146, 60, 0.34)' }
  );
}

function drawBowserBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  // Micro-movimientos cinemáticos de respiración, tensión muscular y dilatación ocular
  const breathBob = Math.sin(time * 3.8) * u * 1.2;
  const chestFlex = Math.cos(time * 3.8) * u * 0.8;
  const jawOpen = Math.sin(time * 5.2) > -0.1 ? 1.5 : 0;
  const ox = cx - 16 * u;
  const oy = bottomY - 30 * u + breathBob;

  drawBackAura(ctx, cx, bottomY - 15 * u, 22 * u, 'rgba(249, 115, 22, 0.88)', 0.32);

  // Sombra de contacto en la roca del castillo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(Math.round(ox + 3 * u), Math.round(bottomY - u), Math.round(25 * u), Math.round(2 * u));

  // Cola escamosa y púa caudal (izquierda) con oscilación de tensión
  px(ctx, ox, oy - breathBob * 0.5, u, 0, 22, 5, 4, '#ca8a04');
  px(ctx, ox, oy - breathBob * 0.5, u, 1, 20, 2, 2, '#f8fafc');

  // Caparazón verde esmeralda con reborde crema y púas cónicas incandescentes
  px(ctx, ox, oy, u, 3, 9, 13, 15, '#14532d');
  px(ctx, ox, oy, u, 4, 10, 11, 13, '#15803d');
  px(ctx, ox, oy, u, 5, 11, 8, 10, '#22c55e');
  // Patrón hexagonal oscuro del caparazón
  px(ctx, ox, oy, u, 6, 13, 3, 3, '#166534');
  px(ctx, ox, oy, u, 6, 17, 3, 3, '#166534');
  // Reborde crema del caparazón
  px(ctx, ox, oy, u, 14, 9, 2, 15, '#fef3c7');
  
  // Púas dorsales del caparazón con pulso de energía volcánica
  const spikeColor = Math.floor(time * 6) % 2 === 0 ? '#ef4444' : '#f97316';
  const spikes = [
    [1, 10],
    [0, 14],
    [1, 18],
  ];
  for (const [sx, sy] of spikes) {
    px(ctx, ox, oy, u, sx + 2, sy, 2, 3, spikeColor);
    px(ctx, ox, oy, u, sx, sy + 1, 2, 2, '#ffffff');
  }

  // Piernas robustas y garras blancas
  px(ctx, ox, oy - breathBob * u, u, 9, 23, 6, 6, '#ca8a04');
  px(ctx, ox, oy - breathBob * u, u, 18, 23, 6, 6, '#eab308');
  px(ctx, ox, oy - breathBob * u, u, 11, 28, 6, 2, '#f8fafc');
  px(ctx, ox, oy - breathBob * u, u, 20, 28, 6, 2, '#f8fafc');

  // Torso robusto + plastrón ventral acanalado amarillo-crema
  px(ctx, ox, oy, u, 12, 11, 12, 13, '#eab308');
  px(ctx, ox, oy, u, 16, 12, 8, 11, '#fde68a');
  px(ctx, ox, oy, u, 16, 15, 8, 1, '#b45309');
  px(ctx, ox, oy, u, 16, 18, 8, 1, '#b45309');
  px(ctx, ox, oy, u, 16, 21, 8, 1, '#b45309');

  // Collar negro con tachuelas en el cuello
  px(ctx, ox, oy, u, 13, 9, 10, 2, '#18181b');
  px(ctx, ox, oy, u, 15, 9, 1, 1, '#f8fafc');
  px(ctx, ox, oy, u, 19, 9, 1, 1, '#f8fafc');

  // Cabeza: cráneo verde, melena roja encendida y cuernos curvos marfil
  px(ctx, ox, oy, u, 9, 1, 9, 4, '#dc2626'); // Melena trasera roja
  px(ctx, ox, oy, u, 10, 0, 6, 2, '#ef4444'); // Cresta superior
  // Cuernos marfil
  px(ctx, ox, oy, u, 13, 1, 3, 3, '#d97706');
  px(ctx, ox, oy, u, 14, -1, 3, 3, '#fef9c3');
  px(ctx, ox, oy, u, 19, 0, 2, 2, '#fef9c3');

  // Rostro verde oscuro + ceja roja feroz + ojo encendido
  px(ctx, ox, oy, u, 13, 3, 10, 6, '#15803d');
  px(ctx, ox, oy, u, 18, 2, 6, 2, '#ef4444'); // Ceja feroz
  px(ctx, ox, oy, u, 19, 4, 3, 2, '#fef08a');
  px(ctx, ox, oy, u, 21, 4, 1, 2, '#dc2626'); // Pupila roja

  // Hocico superior carnoso amarillo-ocre + colmillos
  px(ctx, ox, oy, u, 21, 4, 9, 4, '#facc15');
  px(ctx, ox, oy, u, 27, 4, 2, 1, '#92400e'); // Fosa nasal
  px(ctx, ox, oy, u, 23, 8, 2, 2, '#ffffff'); // Colmillo superior
  px(ctx, ox, oy, u, 28, 8, 2, 2, '#ffffff');

  // Mandíbula inferior articulada + interior carmesí
  px(ctx, ox, oy, u, 20, 8, 8, 2 + jawOpen, '#991b1b');
  px(ctx, ox, oy, u, 19, 9 + jawOpen, 10, 3, '#eab308');
  px(ctx, ox, oy, u, 26, 8 + jawOpen, 2, 1, '#ffffff'); // Colmillo inferior

  // Brazo delantero musculoso con brazaletes negros de pinchos
  const armY = jawOpen ? -1 : 0;
  px(ctx, ox, oy, u, 12, 12 + armY, 6, 5, '#eab308');
  // Brazalete hombro con pinchos
  px(ctx, ox, oy, u, 11, 11 + armY, 5, 2, '#18181b');
  px(ctx, ox, oy, u, 12, 10 + armY, 1, 1, '#ffffff');
  px(ctx, ox, oy, u, 14, 10 + armY, 1, 1, '#ffffff');
  // Antebrazo, brazalete de muñeca y garras
  px(ctx, ox, oy, u, 17, 13 + armY, 6, 4, '#facc15');
  px(ctx, ox, oy, u, 21, 12 + armY, 2, 5, '#18181b');
  px(ctx, ox, oy, u, 22, 11 + armY, 1, 1, '#ffffff');
  px(ctx, ox, oy, u, 23, 13 + armY, 4, 4, '#eab308');
  px(ctx, ox, oy, u, 27, 13 + armY, 2, 1, '#ffffff');
  px(ctx, ox, oy, u, 27, 15 + armY, 2, 1, '#ffffff');

  // Aliento de fuego pixelado clásico saliendo de sus fauces
  if (jawOpen) {
    const flick = Math.floor(time * 14) % 2;
    px(ctx, ox, oy, u, 30, 7, 5 + flick * 2, 3, '#f97316');
    px(ctx, ox, oy, u, 33, 6 - flick, 7, 4, '#ef4444');
    px(ctx, ox, oy, u, 31, 8, 6, 2, '#fde047');
    px(ctx, ox, oy, u, 32, 8, 3, 1, '#ffffff');
  }

  ctx.restore();
}

/* =========================================================================
   2. DR. EGGMAN / DR. ROBOTNIK — SONIC THE HEDGEHOG
      Cabeza calva, gafas azules redondas, gran bigote anaranjado,
      chaqueta roja clásica con triángulos amarillos y pantalones negros.
   ========================================================================= */
export function drawEggmanClassic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  const box = { x: cx - 17 * u, y: bottomY - 33 * u, w: 35 * u, h: 35 * u };
  drawLitSprite(ctx, box, `eggman-${u.toFixed(2)}`, (c) => drawEggmanBody(c, cx, bottomY, u, time), {
    rim: 'rgba(56, 189, 248, 0.42)',
    warm: 'rgba(239, 68, 68, 0.3)',
  });
}

function drawEggmanBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const laughShift = Math.floor(time * 7) % 2;
  const ox = cx - 15 * u;
  const oy = bottomY - 30 * u;

  drawBackAura(ctx, cx, bottomY - 15 * u, 18 * u, 'rgba(239, 68, 68, 0.78)', 0.24);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.fillRect(Math.round(ox + 5 * u), Math.round(bottomY - u), Math.round(20 * u), Math.round(2 * u));

  // Piernas delgadas negras y botas clásicas
  px(ctx, ox, oy, u, 10, 21, 3, 8, '#0f172a');
  px(ctx, ox, oy, u, 17, 21, 3, 8, '#0f172a');
  px(ctx, ox, oy, u, 8, 28, 6, 2, '#1e293b');
  px(ctx, ox, oy, u, 16, 28, 6, 2, '#1e293b');
  px(ctx, ox, oy, u, 9, 28, 2, 1, '#e2e8f0');
  px(ctx, ox, oy, u, 19, 28, 2, 1, '#e2e8f0');

  // Torso ovoide caricaturesco: chaqueta roja + faldón negro inferior
  px(ctx, ox, oy, u, 6, 17, 18, 5, '#09090b');
  px(ctx, ox, oy, u, 5, 9 + laughShift * 0.4, 20, 10, '#b91c1c');
  px(ctx, ox, oy, u, 6, 9 + laughShift * 0.4, 18, 9, '#dc2626');
  // Solapas/triángulos amarillos icónicos del pecho de Eggman (Mega Drive)
  px(ctx, ox, oy, u, 10, 10 + laughShift * 0.4, 3, 7, '#facc15');
  px(ctx, ox, oy, u, 17, 10 + laughShift * 0.4, 3, 7, '#facc15');
  px(ctx, ox, oy, u, 13, 12 + laughShift * 0.4, 4, 3, '#facc15');
  // Botones blancos laterales
  px(ctx, ox, oy, u, 8, 13, 1, 2, '#f8fafc');
  px(ctx, ox, oy, u, 21, 13, 1, 2, '#f8fafc');

  // Brazos extendidos accionando controles + puños blancos + guantes
  const armWave = laughShift === 0 ? 0 : -1;
  px(ctx, ox, oy, u, 1, 10 + armWave, 5, 4, '#dc2626');
  px(ctx, ox, oy, u, 24, 10 - armWave, 5, 4, '#dc2626');
  px(ctx, ox, oy, u, 0, 12 + armWave, 3, 3, '#f8fafc');
  px(ctx, ox, oy, u, 27, 12 - armWave, 3, 3, '#f8fafc');

  // Cabeza calva redondeada
  px(ctx, ox, oy - laughShift * u * 0.5, u, 10, 1, 10, 8, '#fdba74');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 11, 0, 8, 2, '#fed7aa'); // Brillo en la calva

  // Gafas redondas azul cian opacas con reflejo blanco
  px(ctx, ox, oy - laughShift * u * 0.5, u, 10, 3, 4, 3, '#0284c7');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 16, 3, 4, 3, '#0284c7');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 11, 3, 3, 2, '#38bdf8');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 17, 3, 3, 2, '#38bdf8');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 11, 3, 1, 1, '#ffffff');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 17, 3, 1, 1, '#ffffff');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 14, 4, 2, 1, '#1e293b'); // Puente gafas

  // Nariz redonda rosada característica
  px(ctx, ox, oy - laughShift * u * 0.5, u, 14, 5, 2, 2, '#fb7185');

  // Gran bigote anaranjado desbordante y dentado hacia ambos lados
  px(ctx, ox, oy - laughShift * u * 0.5, u, 3, 6, 24, 3, '#ea580c');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 1, 5, 4, 2, '#f97316');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 25, 5, 4, 2, '#f97316');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 2, 8, 3, 2, '#c2410c');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 25, 8, 3, 2, '#c2410c');

  // Sonrisa dentada arrogante blanca
  px(ctx, ox, oy - laughShift * u * 0.5, u, 11, 8, 8, 2, '#ffffff');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 13, 8, 1, 2, '#94a3b8');
  px(ctx, ox, oy - laughShift * u * 0.5, u, 16, 8, 1, 2, '#94a3b8');

  ctx.restore();
}

/* =========================================================================
   3A. DONKEY KONG — UNIVERSO DONKEY KONG
       Gorila de pelaje marrón con cresta superior, rostro bronce y corbata
       roja con sus iniciales DK en amarillo.
   ========================================================================= */
export function drawDonkeyKongClassic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  const box = { x: cx - 18 * u, y: bottomY - 32 * u, w: 36 * u, h: 34 * u };
  drawLitSprite(
    ctx,
    box,
    `dk-${u.toFixed(2)}`,
    (c) => drawDonkeyKongBody(c, cx, bottomY, u, time),
    { rim: 'rgba(253, 224, 71, 0.34)', warm: 'rgba(245, 158, 11, 0.32)' }
  );
}

function drawDonkeyKongBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const beat = Math.floor(time * 5.5) % 2;
  const ox = cx - 15 * u;
  const oy = bottomY - 28 * u;

  drawBackAura(ctx, cx, bottomY - 14 * u, 16 * u, 'rgba(245, 158, 11, 0.72)', 0.22);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(Math.round(ox + 4 * u), Math.round(bottomY - u), Math.round(22 * u), Math.round(2 * u));

  // Piernas robustas de gorila + pies bronce
  px(ctx, ox, oy, u, 6, 20, 6, 6, '#451a03');
  px(ctx, ox, oy, u, 18, 20, 6, 6, '#451a03');
  px(ctx, ox, oy, u, 5, 26, 7, 2, '#d4a373');
  px(ctx, ox, oy, u, 18, 26, 7, 2, '#d4a373');

  // Torso colosal de pelaje marrón + pectorales bronce
  px(ctx, ox, oy, u, 6, 9, 18, 12, '#78350f');
  px(ctx, ox, oy, u, 8, 10, 14, 10, '#92400e');
  px(ctx, ox, oy, u, 9, 11, 12, 7, '#d4a373');

  // Brazos musculosos articulados
  const leftLift = beat === 0 ? -3 : 1;
  const rightLift = beat === 0 ? 1 : -3;
  px(ctx, ox, oy, u, 1, 9 + leftLift, 6, 11, '#78350f');
  px(ctx, ox, oy, u, 2, 10 + leftLift, 4, 8, '#92400e');
  px(ctx, ox, oy, u, 1, 19 + leftLift, 5, 4, '#d4a373');

  px(ctx, ox, oy, u, 23, 9 + rightLift, 6, 11, '#451a03');
  px(ctx, ox, oy, u, 24, 10 + rightLift, 4, 8, '#78350f');
  px(ctx, ox, oy, u, 24, 19 + rightLift, 5, 4, '#d4a373');

  // Cabeza con el icónico mechón/cresta superior de Donkey Kong
  px(ctx, ox, oy, u, 13, -1, 4, 2, '#92400e'); // Punta del mechón
  px(ctx, ox, oy, u, 11, 1, 8, 2, '#78350f');
  px(ctx, ox, oy, u, 9, 3, 12, 6, '#78350f');
  px(ctx, ox, oy, u, 8, 4, 1, 3, '#d4a373'); // Orejas
  px(ctx, ox, oy, u, 21, 4, 1, 3, '#d4a373');

  // Ojos expresivos bajo ceño fuerte + hocico ancho
  px(ctx, ox, oy, u, 11, 4, 3, 2, '#ffffff');
  px(ctx, ox, oy, u, 16, 4, 3, 2, '#ffffff');
  px(ctx, ox, oy, u, 12, 4, 1, 2, '#09090b');
  px(ctx, ox, oy, u, 17, 4, 1, 2, '#09090b');

  px(ctx, ox, oy, u, 9, 6, 12, 4, '#e6be94');
  px(ctx, ox, oy, u, 11, 8, 8, 1, '#ffffff'); // Sonrisa blanca

  // Corbata roja icónica con iniciales DK en amarillo
  px(ctx, ox, oy, u, 13, 10, 4, 2, '#b91c1c');
  px(ctx, ox, oy, u, 12, 12, 6, 9, '#dc2626');
  px(ctx, ox, oy, u, 13, 21, 4, 2, '#dc2626');
  // Iniciales "DK" amarillas nítidas
  px(ctx, ox, oy, u, 13, 15, 2, 3, '#fde047');
  px(ctx, ox, oy, u, 16, 15, 2, 3, '#fde047');

  ctx.restore();
}

/* =========================================================================
   3B. KING K. ROOL — UNIVERSO DONKEY KONG COUNTRY
       Cocodrilo corpulento de piel verde, gran vientre dorado blindado,
       capa real roja, corona dorada y su característico ojo desorbitado.
   ========================================================================= */
export function drawKingKRoolClassic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  const box = { x: cx - 20 * u, y: bottomY - 33 * u, w: 40 * u, h: 35 * u };
  drawLitSprite(
    ctx,
    box,
    `krool-${u.toFixed(2)}`,
    (c) => drawKingKRoolBody(c, cx, bottomY, u, time),
    { rim: 'rgba(74, 222, 128, 0.34)', warm: 'rgba(185, 28, 28, 0.3)' }
  );
}

function drawKingKRoolBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const capeWave = Math.floor(time * 6) % 2;
  const ox = cx - 16 * u;
  const oy = bottomY - 31 * u;

  drawBackAura(ctx, cx, bottomY - 15 * u, 19 * u, 'rgba(34, 197, 94, 0.72)', 0.25);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(Math.round(ox + 4 * u), Math.round(bottomY - u), Math.round(24 * u), Math.round(2 * u));

  // Capa real roja ondeando detrás
  px(ctx, ox, oy, u, 16, 9, 14 + capeWave, 19, '#7f1d1d');
  px(ctx, ox, oy, u, 17, 10, 12 + capeWave, 17, '#b91c1c');

  // Cola verde escamosa derecha
  px(ctx, ox, oy, u, 24, 24, 6, 4, '#15803d');

  // Piernas verdes robustas y garras blancas
  px(ctx, ox, oy, u, 8, 24, 6, 6, '#15803d');
  px(ctx, ox, oy, u, 17, 24, 6, 6, '#166534');
  px(ctx, ox, oy, u, 6, 29, 5, 2, '#f8fafc');
  px(ctx, ox, oy, u, 16, 29, 5, 2, '#f8fafc');

  // Cuerpo corpulento verde + prominente vientre dorado metálico
  px(ctx, ox, oy, u, 6, 10, 18, 15, '#16a34a');
  px(ctx, ox, oy, u, 5, 12, 14, 12, '#eab308'); // Placa ventral dorada
  px(ctx, ox, oy, u, 6, 13, 11, 10, '#facc15');
  px(ctx, ox, oy, u, 7, 14, 5, 4, '#fef08a'); // Brillo especular en el vientre
  px(ctx, ox, oy, u, 6, 18, 11, 1, '#a16207');

  // Broche dorado de la capa al cuello
  px(ctx, ox, oy, u, 8, 10, 13, 2, '#dc2626');
  px(ctx, ox, oy, u, 11, 10, 3, 2, '#fde047');

  // Cabeza de cocodrilo mirando a la izquierda + hocico dentado
  px(ctx, ox, oy, u, 3, 5, 16, 5, '#16a34a');
  px(ctx, ox, oy, u, 2, 6, 8, 3, '#22c55e'); // Hocico prominente
  px(ctx, ox, oy, u, 3, 9, 9, 1, '#ffffff'); // Dientes afilados
  px(ctx, ox, oy, u, 4, 10, 10, 2, '#15803d'); // Mandíbula inferior

  // Ojos asimétricos icónicos (ojo izquierdo enorme e inyectado)
  px(ctx, ox, oy, u, 9, 3, 4, 4, '#ffffff');
  px(ctx, ox, oy, u, 9, 3, 4, 1, '#ef4444'); // Vena roja característica
  px(ctx, ox, oy, u, 10, 5, 2, 2, '#09090b');
  px(ctx, ox, oy, u, 14, 4, 3, 3, '#ffffff');
  px(ctx, ox, oy, u, 14, 5, 1, 2, '#09090b');

  // Corona dorada alta con puntas y joya roja central
  px(ctx, ox, oy, u, 10, 1, 9, 3, '#eab308');
  px(ctx, ox, oy, u, 10, -1, 2, 2, '#fde047');
  px(ctx, ox, oy, u, 14, -2, 2, 3, '#fde047');
  px(ctx, ox, oy, u, 17, -1, 2, 2, '#fde047');
  px(ctx, ox, oy, u, 14, 2, 2, 1, '#ef4444'); // Rubí de la corona

  // Brazos cruzados/alzados con brazaletes dorados
  px(ctx, ox, oy, u, 2, 13, 4, 7, '#16a34a');
  px(ctx, ox, oy, u, 2, 18, 4, 2, '#facc15'); // Brazalete dorado
  px(ctx, ox, oy, u, 19, 12 - capeWave, 5, 7, '#15803d');
  px(ctx, ox, oy, u, 20, 17 - capeWave, 4, 2, '#facc15');

  ctx.restore();
}

/* =========================================================================
   4. BLINKY, PINKY, INKY Y CLYDE — PAC-MAN (1980)
      Matriz auténtica de 14x14 píxeles, colores originales exactos y ojos
      clásicos mirando en su dirección de persecución.
   ========================================================================= */
const PAC_GHOST_FRAME_A = [
  '.....XXXX.....',
  '...XXXXXXXX...',
  '..XXXXXXXXXX..',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XX.XXX..XXX.XX',
  'X...XX..XX...X',
];

const PAC_GHOST_FRAME_B = [
  '.....XXXX.....',
  '...XXXXXXXX...',
  '..XXXXXXXXXX..',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXX..XXXX..XXX',
  '.XX...XX...XX.',
];

export type PacGhostId = 'blinky' | 'pinky' | 'inky' | 'clyde';

const PAC_GHOST_COLORS: Record<PacGhostId, string> = {
  blinky: '#ff0000', // Rojo clásico
  pinky: '#ffb8ff',  // Rosa clásico
  inky: '#00ffff',   // Azul cian clásico
  clyde: '#ffb852',  // Naranja clásico
};

export function drawPacManGhostClassic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  ghostId: PacGhostId,
  time: number,
  lookDir: -1 | 0 | 1 = -1
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const bodyColor = PAC_GHOST_COLORS[ghostId];
  const frame = Math.floor(time * 8) % 2 === 0 ? PAC_GHOST_FRAME_A : PAC_GHOST_FRAME_B;
  const ox = cx - 7 * u;
  const oy = bottomY - 14 * u;

  drawBackAura(ctx, cx, bottomY - 7 * u, 10 * u, bodyColor, 0.22);

  ctx.fillStyle = bodyColor;
  for (let r = 0; r < 14; r++) {
    const row = frame[r];
    for (let c = 0; c < 14; c++) {
      if (row[c] === 'X') {
        ctx.fillRect(
          Math.round(ox + c * u),
          Math.round(oy + r * u),
          Math.max(1, Math.round(u)),
          Math.max(1, Math.round(u))
        );
      }
    }
  }

  // Ojos geométricos blancos exactos (4x5) + pupilas azul cobalto (2x2)
  const eyeShift = lookDir;
  const eyeBasesX = [3 + eyeShift, 9 + eyeShift];
  for (const ex of eyeBasesX) {
    px(ctx, ox, oy, u, ex + 1, 3, 2, 5, '#ffffff');
    px(ctx, ox, oy, u, ex, 4, 4, 3, '#ffffff');
    const pupilX = lookDir < 0 ? ex : lookDir > 0 ? ex + 2 : ex + 1;
    px(ctx, ox, oy, u, pupilX, 5, 2, 2, '#2121de');
  }

  ctx.restore();
}

/* =========================================================================
   5A. M. BISON — STREET FIGHTER II
       Gorra militar roja con insignia alada, ojos blancos brillantes,
       hombreras plateadas, capa oscura y llamas púrpura de Psycho Power.
   ========================================================================= */
export function drawMBisonClassic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  const box = { x: cx - 18 * u, y: bottomY - 34 * u, w: 36 * u, h: 36 * u };
  drawLitSprite(ctx, box, `bison-${u.toFixed(2)}`, (c) => drawMBisonBody(c, cx, bottomY, u, time), {
    rim: 'rgba(192, 132, 252, 0.44)',
    warm: 'rgba(239, 68, 68, 0.26)',
  });
}

function drawMBisonBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const hover = Math.sin(time * 4.2) * u * 1.2;
  const ox = cx - 14 * u;
  const oy = bottomY - 30 * u + hover;

  drawBackAura(ctx, cx, oy + 14 * u, 17 * u, 'rgba(168, 85, 247, 0.85)', 0.3);

  // Capa oscura ondeando detrás
  const capeShift = Math.floor(time * 7) % 2;
  px(ctx, ox, oy, u, 3 - capeShift, 8, 22 + capeShift * 2, 18, '#1e1b4b');
  px(ctx, ox, oy, u, 4, 9, 20, 15, '#312e81');

  // Piernas rojas + espinilleras metálicas plateadas + botas negras
  px(ctx, ox, oy, u, 8, 19, 5, 5, '#b91c1c');
  px(ctx, ox, oy, u, 15, 19, 5, 5, '#b91c1c');
  px(ctx, ox, oy, u, 8, 24, 4, 4, '#cbd5e1');
  px(ctx, ox, oy, u, 16, 24, 4, 4, '#cbd5e1');
  px(ctx, ox, oy, u, 7, 28, 5, 2, '#09090b');
  px(ctx, ox, oy, u, 16, 28, 5, 2, '#09090b');

  // Torso militar rojo + cinturón plateado
  px(ctx, ox, oy, u, 7, 9, 14, 10, '#dc2626');
  px(ctx, ox, oy, u, 8, 16, 12, 2, '#94a3b8');
  px(ctx, ox, oy, u, 12, 16, 4, 2, '#f8fafc');

  // Grandes hombreras metálicas plateadas características
  px(ctx, ox, oy, u, 3, 8, 6, 4, '#cbd5e1');
  px(ctx, ox, oy, u, 4, 8, 4, 2, '#f8fafc');
  px(ctx, ox, oy, u, 19, 8, 6, 4, '#cbd5e1');
  px(ctx, ox, oy, u, 20, 8, 4, 2, '#f8fafc');

  // Rostro severo con ojos blancos luminosos sin pupila
  px(ctx, ox, oy, u, 10, 4, 8, 5, '#d97706');
  px(ctx, ox, oy, u, 11, 5, 2, 1, '#ffffff');
  px(ctx, ox, oy, u, 15, 5, 2, 1, '#ffffff');
  px(ctx, ox, oy, u, 12, 7, 4, 1, '#ffffff'); // Sonrisa blanca

  // Gorra militar roja de plato alto + visera negra + emblema alado
  px(ctx, ox, oy, u, 8, 0, 12, 3, '#dc2626');
  px(ctx, ox, oy, u, 9, 3, 10, 1, '#09090b'); // Visera
  px(ctx, ox, oy, u, 12, 1, 4, 2, '#facc15'); // Emblema central

  // Brazo derecho canalizando Psycho Power púrpura
  px(ctx, ox, oy, u, 22, 10, 4, 5, '#dc2626');
  px(ctx, ox, oy, u, 23, 13, 3, 2, '#e2e8f0'); // Muñequera
  // Llama Psycho Power pixelada
  px(ctx, ox, oy, u, 23, 5 - capeShift, 5, 6, '#a855f7');
  px(ctx, ox, oy, u, 24, 6 - capeShift, 3, 4, '#f0abfc');

  ctx.restore();
}

/* =========================================================================
   5B. DR. WILY EN SU WILY CAPSULE — MEGA MAN
       Cráneo calvo con mechones blancos laterales alborotados, gran bigote
       blanco, bata de laboratorio y cápsula semiesférica con emblema 'W'.
   ========================================================================= */
export function drawDrWilyCapsule(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const hoverY = Math.sin(time * 3.8) * u * 1.6;
  const ox = cx - 15 * u;
  const oy = cy - 14 * u + hoverY;

  drawBackAura(ctx, cx, oy + 14 * u, 16 * u, 'rgba(56, 189, 248, 0.72)', 0.25);

  // Domo transparente azulado de la cápsula (fondo)
  px(ctx, ox, oy, u, 5, 2, 20, 12, 'rgba(14, 116, 144, 0.42)');
  px(ctx, ox, oy, u, 7, 1, 16, 2, 'rgba(56, 189, 248, 0.55)');

  // Dr. Wily dentro de la cabina: mechones blancos laterales, calva, cejas y bigote
  const browLift = Math.floor(time * 6) % 2;
  // Mechones blancos erizados a izquierda y derecha
  px(ctx, ox, oy, u, 7, 5, 4, 4, '#f1f5f9');
  px(ctx, ox, oy, u, 6, 6, 2, 2, '#cbd5e1');
  px(ctx, ox, oy, u, 19, 5, 4, 4, '#f1f5f9');
  px(ctx, ox, oy, u, 22, 6, 2, 2, '#cbd5e1');
  // Cráneo calvo superior y rostro
  px(ctx, ox, oy, u, 11, 4, 8, 6, '#fdba74');
  // Cejas blancas pobladas arqueadas + ojos
  px(ctx, ox, oy, u, 11, 5 - browLift * 0.5, 3, 1, '#ffffff');
  px(ctx, ox, oy, u, 16, 5 - browLift * 0.5, 3, 1, '#ffffff');
  px(ctx, ox, oy, u, 12, 6, 2, 2, '#0f172a');
  px(ctx, ox, oy, u, 16, 6, 2, 2, '#0f172a');
  // Bigote blanco ancho
  px(ctx, ox, oy, u, 10, 8, 10, 2, '#ffffff');
  // Bata blanca + corbata roja
  px(ctx, ox, oy, u, 9, 10, 12, 4, '#f8fafc');
  px(ctx, ox, oy, u, 14, 10, 2, 4, '#dc2626');

  // Reflejo especular sobre la cúpula de cristal
  px(ctx, ox, oy, u, 8, 3, 3, 5, 'rgba(255, 255, 255, 0.55)');

  // Chasis metálico inferior de la Wily Capsule + emblema 'W'
  px(ctx, ox, oy, u, 3, 14, 24, 7, '#475569');
  px(ctx, ox, oy, u, 4, 14, 22, 2, '#94a3b8');
  px(ctx, ox, oy, u, 6, 21, 18, 3, '#1e293b');
  // Emblema rojo y dorado 'W' en el frente
  px(ctx, ox, oy, u, 11, 16, 8, 4, '#b91c1c');
  px(ctx, ox, oy, u, 12, 17, 1, 2, '#fde047');
  px(ctx, ox, oy, u, 14, 17, 2, 2, '#fde047');
  px(ctx, ox, oy, u, 17, 17, 1, 2, '#fde047');

  // Propulsores inferiores de plasma
  const thrust = Math.floor(time * 16) % 2;
  px(ctx, ox, oy, u, 8, 24, 4, 2 + thrust, '#38bdf8');
  px(ctx, ox, oy, u, 18, 24, 4, 2 + thrust, '#38bdf8');

  ctx.restore();
}

/* =========================================================================
   5C. GANONDORF — THE LEGEND OF ZELDA
       Rey Gerudo de piel oliva, cabellera y barba pelirroja encendida,
       joya dorada en la frente, armadura oscura y magia carmesí.
   ========================================================================= */
export function drawGanondorfClassic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  const box = { x: cx - 18 * u, y: bottomY - 33 * u, w: 38 * u, h: 35 * u };
  drawLitSprite(
    ctx,
    box,
    `ganon-${u.toFixed(2)}`,
    (c) => drawGanondorfBody(c, cx, bottomY, u, time),
    { rim: 'rgba(248, 113, 113, 0.4)', warm: 'rgba(253, 224, 71, 0.3)' }
  );
}

function drawGanondorfBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const pulse = Math.floor(time * 5) % 2;
  const ox = cx - 14 * u;
  const oy = bottomY - 31 * u;

  drawBackAura(ctx, cx, bottomY - 16 * u, 18 * u, 'rgba(220, 38, 38, 0.75)', 0.26);

  // Capa granate real Gerudo
  px(ctx, ox, oy, u, 5, 9, 19 + pulse, 20, '#450a0a');
  px(ctx, ox, oy, u, 6, 10, 17 + pulse, 18, '#7f1d1d');

  // Botas y grebas oscuras con filigrana dorada
  px(ctx, ox, oy, u, 9, 21, 4, 9, '#18181b');
  px(ctx, ox, oy, u, 15, 21, 4, 9, '#18181b');
  px(ctx, ox, oy, u, 9, 24, 4, 1, '#d97706');
  px(ctx, ox, oy, u, 15, 24, 4, 1, '#d97706');

  // Armadura negra y dorada Gerudo
  px(ctx, ox, oy, u, 7, 9, 14, 12, '#1c1917');
  px(ctx, ox, oy, u, 9, 10, 10, 6, '#78350f');
  px(ctx, ox, oy, u, 8, 9, 12, 2, '#eab308'); // Hombreras/cuello dorado
  px(ctx, ox, oy, u, 9, 17, 10, 2, '#eab308'); // Cinturón dorado

  // Cabeza: piel oliva Gerudo, cabello y barba pelirroja, joya dorada frontal
  px(ctx, ox, oy, u, 9, 1, 10, 4, '#c2410c'); // Cabello pelirrojo
  px(ctx, ox, oy, u, 10, 0, 8, 2, '#ea580c');
  px(ctx, ox, oy, u, 10, 3, 8, 6, '#5c6f3e'); // Piel oliva Gerudo
  px(ctx, ox, oy, u, 13, 2, 2, 2, '#fde047'); // Joya dorada en la frente
  px(ctx, ox, oy, u, 10, 7, 8, 2, '#c2410c'); // Barba pelirroja
  px(ctx, ox, oy, u, 11, 5, 2, 1, '#facc15'); // Ojos ámbar brillantes
  px(ctx, ox, oy, u, 15, 5, 2, 1, '#facc15');

  // Guantelete blanco/dorado alzando orbe de magia oscura
  px(ctx, ox, oy, u, 4, 10 - pulse, 4, 5, '#1c1917');
  px(ctx, ox, oy, u, 3, 8 - pulse, 3, 3, '#f8fafc');
  // Orbe de magia oscura carmesí-violeta
  px(ctx, ox, oy, u, 1, 3 - pulse, 6, 5, '#991b1b');
  px(ctx, ox, oy, u, 2, 4 - pulse, 4, 3, '#f43f5e');
  px(ctx, ox, oy, u, 3, 5 - pulse, 2, 1, '#fde047');

  ctx.restore();
}

/* =========================================================================
   6. SUPER CUPA — ENTIDAD SOBERANA CENTRAL DE PIXELVERSE
      Diseño original imponente: coloso cyber-abisal que intenta reescribir
      y someter las reglas físicas del universo sin reemplazar a los clásicos.
   ========================================================================= */
export function drawSuperCupaSovereign(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  u: number,
  time: number
): void {
  const box = { x: cx - 22 * u, y: cy - 24 * u, w: 48 * u, h: 48 * u };
  drawLitSprite(
    ctx,
    box,
    `cupa-${u.toFixed(2)}`,
    (c) => drawSuperCupaBody(c, cx, cy, u, time),
    { rim: 'rgba(244, 63, 94, 0.44)', warm: 'rgba(253, 224, 71, 0.3)', shade: 0.85 }
  );
}

function drawSuperCupaBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  u: number,
  time: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  const hover = Math.sin(time * 2.6) * u * 1.5;
  const ox = cx - 18 * u;
  const oy = cy - 18 * u + hover;

  // Halo abisal de distorsión soberana
  drawBackAura(ctx, cx, cy + hover, 26 * u, 'rgba(244, 63, 94, 0.85)', 0.34);
  drawBackAura(ctx, cx, cy + hover, 16 * u, 'rgba(168, 85, 247, 0.9)', 0.28);

  // Astas / Corona fractal flotante de autoridad sobre el código
  const crownLift = Math.sin(time * 4.2) * u;
  px(ctx, ox, oy - crownLift, u, 8, -2, 3, 6, '#f43f5e');
  px(ctx, ox, oy - crownLift, u, 25, -2, 3, 6, '#f43f5e');
  px(ctx, ox, oy - crownLift, u, 13, -4, 2, 6, '#fde047');
  px(ctx, ox, oy - crownLift, u, 21, -4, 2, 6, '#fde047');
  px(ctx, ox, oy - crownLift, u, 17, -6, 2, 7, '#ffffff');

  // Hombreras monolíticas suspendidas a ambos lados
  const padShift = Math.cos(time * 3.4) * u;
  px(ctx, ox - padShift, oy, u, 1, 7, 7, 10, '#0f051d');
  px(ctx, ox - padShift, oy, u, 2, 8, 5, 2, '#f43f5e');
  px(ctx, ox + padShift, oy, u, 28, 7, 7, 10, '#0f051d');
  px(ctx, ox + padShift, oy, u, 29, 8, 5, 2, '#f43f5e');

  // Silueta central acorazada obsidiana y púrpura oscuro
  px(ctx, ox, oy, u, 9, 4, 18, 22, '#090312');
  px(ctx, ox, oy, u, 11, 6, 14, 18, '#1e0936');
  px(ctx, ox, oy, u, 13, 26, 10, 6, '#090312');
  px(ctx, ox, oy, u, 15, 32, 6, 4, '#f43f5e');

  // Visor / ojos soberanos incandescentes
  px(ctx, ox, oy, u, 11, 8, 5, 2, '#f43f5e');
  px(ctx, ox, oy, u, 20, 8, 5, 2, '#f43f5e');
  px(ctx, ox, oy, u, 12, 8, 3, 1, '#ffffff');
  px(ctx, ox, oy, u, 21, 8, 3, 1, '#ffffff');

  // Núcleo hexagonal de control universal en el pecho
  px(ctx, ox, oy, u, 14, 14, 8, 8, '#be123c');
  px(ctx, ox, oy, u, 15, 15, 6, 6, '#f43f5e');
  px(ctx, ox, oy, u, 16, 16, 4, 4, '#fde047');
  px(ctx, ox, oy, u, 17, 17, 2, 2, '#ffffff');

  ctx.restore();
}

/* =========================================================================
   7. PIXEL — EL ARQUITECTO DEL PIXEL (Protagonista nítido 12x16)
   ========================================================================= */
const ARCHITECT_SPRITE = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '.HHhhhhhhHH.',
  '.HHSSSSSSHH.',
  '..SSSSSSSS..',
  '..SEWSSEWS..',
  '..SSSSSSSS..',
  '...sSSSSs...',
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
  '.SScCCCCcSS.',
  '.SS.BBBB.SS.',
  '...CCCCCC...',
  '...CC..CC...',
  '..cCC..CCc..',
  '..KKK..KKK..',
];

export function drawPixelArchitectCrisp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  u: number,
  alpha = 1
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;
  ctx.globalAlpha = alpha;

  const ox = cx - 6 * u;
  const oy = bottomY - 16 * u;

  drawBackAura(ctx, cx, bottomY - 8 * u, 12 * u, 'rgba(0, 243, 255, 0.9)', 0.35 * alpha);

  const palette: Record<string, string> = {
    H: '#00f3ff',
    h: '#0891b2',
    S: '#fde2c8',
    s: '#d4a373',
    E: '#05070f',
    W: '#ffffff',
    C: '#00f3ff',
    c: '#0284c7',
    B: '#facc15',
    K: '#1e293b',
  };

  for (let r = 0; r < ARCHITECT_SPRITE.length; r++) {
    const row = ARCHITECT_SPRITE[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const col = palette[ch];
      if (col) {
        px(ctx, ox, oy, u, c, r, 1, 1, col);
      }
    }
  }

  ctx.restore();
}
