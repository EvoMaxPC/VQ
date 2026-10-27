/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ISLA NATAL — «EL ARCADE QUE ESPERÓ SU MOMENTO»
 *
 * Primera zona explorable del juego: la isla pequeña donde nació el protagonista.
 * Geografía irregular totalmente rodeada de mar (fuera de los rects caminables sólo
 * hay océano), playa de llegada, pradera con la cabaña familiar, senderos de tierra,
 * un alto rocoso al noroeste, un mirador al sureste y la arboleda del cobertizo
 * donde duerme una vieja máquina de Pong.
 *
 * Este módulo es autónomo: no modifica ni depende de los datos de la Isla del Origen.
 */

export const ISLA_NATAL_WORLD_W = 1680;
export const ISLA_NATAL_WORLD_H = 1240;

export type IslaNatalZoneId =
  | 'playa-aurora'
  | 'pradera-casa'
  | 'alto-rocas'
  | 'arboleda-arcade'
  | 'mirador-oleaje';

export type IslaNatalSurface = 'sand' | 'grass' | 'path' | 'rock';

export interface IslaNatalWalkRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zone: IslaNatalZoneId;
  surface: IslaNatalSurface;
}

export interface IslaNatalSolidRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IslaNatalZoneMeta {
  id: IslaNatalZoneId;
  name: string;
  subtitle: string;
  accentHex: string;
}

/* ------------------------------------------------------------------ */
/* ZONAS                                                              */
/* ------------------------------------------------------------------ */

export const ISLA_NATAL_ZONES: Record<IslaNatalZoneId, IslaNatalZoneMeta> = {
  'playa-aurora': {
    id: 'playa-aurora',
    name: 'Playa del Aurora',
    subtitle: 'Donde el mar te dejó una vez',
    accentHex: '#7dd3fc',
  },
  'pradera-casa': {
    id: 'pradera-casa',
    name: 'Pradera de Casa',
    subtitle: 'La hierba aún recuerda tus pasos',
    accentHex: '#86efac',
  },
  'alto-rocas': {
    id: 'alto-rocas',
    name: 'Alto de las Rocas',
    subtitle: 'El mirador de la infancia',
    accentHex: '#fcd34d',
  },
  'arboleda-arcade': {
    id: 'arboleda-arcade',
    name: 'La Arboleda',
    subtitle: 'Algo espera entre los árboles',
    accentHex: '#67e8f9',
  },
  'mirador-oleaje': {
    id: 'mirador-oleaje',
    name: 'Mirador del Oleaje',
    subtitle: 'Un horizonte que parpadea',
    accentHex: '#a5b4fc',
  },
};

/* ------------------------------------------------------------------ */
/* MASA DE TIERRA: RECTS CAMINABLES (el resto del mundo es océano)     */
/* Orden de pintado: arena → hierba → sendero → roca                   */
/* ------------------------------------------------------------------ */

export const ISLA_NATAL_WALK_RECTS: IslaNatalWalkRect[] = [
  // Arena
  { id: 's-playa-sur', x: 600, y: 900, w: 420, h: 112, zone: 'playa-aurora', surface: 'sand' },
  { id: 's-ensenada-oeste', x: 470, y: 830, w: 152, h: 112, zone: 'playa-aurora', surface: 'sand' },
  { id: 's-ensenada-este', x: 990, y: 848, w: 172, h: 104, zone: 'mirador-oleaje', surface: 'sand' },
  { id: 's-punta-sureste', x: 1130, y: 758, w: 132, h: 122, zone: 'mirador-oleaje', surface: 'sand' },

  // Hierba
  { id: 'g-pradera', x: 520, y: 600, w: 560, h: 322, zone: 'pradera-casa', surface: 'grass' },
  { id: 'g-loma-norte', x: 600, y: 500, w: 400, h: 122, zone: 'pradera-casa', surface: 'grass' },
  { id: 'g-brazo-oeste', x: 430, y: 680, w: 122, h: 202, zone: 'pradera-casa', surface: 'grass' },
  { id: 'g-brazo-este', x: 1050, y: 660, w: 122, h: 222, zone: 'mirador-oleaje', surface: 'grass' },
  { id: 'g-arboleda', x: 1090, y: 480, w: 282, h: 222, zone: 'arboleda-arcade', surface: 'grass' },
  { id: 'g-approach-rocas', x: 380, y: 520, w: 182, h: 182, zone: 'pradera-casa', surface: 'grass' },

  // Senderos de tierra
  { id: 'p-playa', x: 740, y: 760, w: 64, h: 172, zone: 'playa-aurora', surface: 'path' },
  { id: 'p-casa', x: 540, y: 724, w: 212, h: 48, zone: 'pradera-casa', surface: 'path' },
  { id: 'p-arboleda', x: 800, y: 600, w: 332, h: 52, zone: 'pradera-casa', surface: 'path' },
  { id: 'p-rocas', x: 470, y: 560, w: 162, h: 48, zone: 'pradera-casa', surface: 'path' },

  // Alto rocoso
  { id: 'r-meseta', x: 300, y: 340, w: 282, h: 202, zone: 'alto-rocas', surface: 'rock' },
  { id: 'r-cresta', x: 360, y: 280, w: 172, h: 82, zone: 'alto-rocas', surface: 'rock' },
];

export const ISLA_NATAL_SOLIDS: IslaNatalSolidRect[] = [
  { id: 'cabana', x: 430, y: 694, w: 112, h: 94 },
  { id: 'cobertizo', x: 1178, y: 512, w: 146, h: 122 },
  { id: 'bolo-norte', x: 328, y: 296, w: 62, h: 52 },
  { id: 'bolo-este', x: 498, y: 356, w: 54, h: 46 },
  { id: 'bolo-meseta-sur', x: 386, y: 486, w: 46, h: 40 },
  { id: 'tronco', x: 878, y: 836, w: 92, h: 26 },
  { id: 'roca-punta', x: 1196, y: 786, w: 46, h: 38 },
  { id: 'roca-ensenada', x: 486, y: 892, w: 44, h: 34 },
];

/**
 * Tablones del muelle del Puerto Norte. No forman parte de la masa de tierra
 * (el agua sigue pintándose debajo), pero sí son transitables para que la
 * pasarela visible se pueda recorrer hasta la proa.
 */
export const ISLA_NATAL_DECK_RECTS: IslaNatalSolidRect[] = [
  { id: 'muelle-norte', x: 802, y: 458, w: 36, h: 62 },
];

/* ------------------------------------------------------------------ */
/* CONSULTAS DE COLISIÓN                                              */
/* ------------------------------------------------------------------ */

export function isIslaNatalPointOnLand(x: number, y: number): IslaNatalWalkRect | null {
  for (let i = ISLA_NATAL_WALK_RECTS.length - 1; i >= 0; i--) {
    const r = ISLA_NATAL_WALK_RECTS[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

export function isIslaNatalPointOnDeck(x: number, y: number): boolean {
  for (const d of ISLA_NATAL_DECK_RECTS) {
    if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return true;
  }
  return false;
}

export function isIslaNatalPointBlockedBySolid(x: number, y: number): boolean {
  for (const s of ISLA_NATAL_SOLIDS) {
    // Margen mínimo: el bloqueo coincide con la silueta dibujada para no
    // generar muros invisibles sobre senderos ni junto a las puertas.
    if (x >= s.x - 2 && x <= s.x + s.w + 2 && y >= s.y - 2 && y <= s.y + s.h + 3) {
      return true;
    }
  }
  return false;
}

/** Un punto es transitable si está sobre tierra (o el muelle) y no dentro de un obstáculo. */
export function isIslaNatalPointWalkable(x: number, y: number): boolean {
  if (!isIslaNatalPointOnLand(x, y) && !isIslaNatalPointOnDeck(x, y)) return false;
  return !isIslaNatalPointBlockedBySolid(x, y);
}

export function isIslaNatalBoxWalkable(
  x: number,
  y: number,
  halfW = 8,
  footTolerance = 2
): boolean {
  return (
    isIslaNatalPointWalkable(x - halfW, y) &&
    isIslaNatalPointWalkable(x + halfW, y) &&
    isIslaNatalPointWalkable(x, y - footTolerance) &&
    isIslaNatalPointWalkable(x, y + footTolerance)
  );
}

/** Prioriza la superficie más específica (roca > sendero > hierba > arena). */
export function islaNatalZoneAt(x: number, y: number): IslaNatalZoneId {
  if (isIslaNatalPointOnDeck(x, y)) return 'pradera-casa';
  const order: IslaNatalSurface[] = ['rock', 'path', 'grass', 'sand'];
  for (const surface of order) {
    for (const r of ISLA_NATAL_WALK_RECTS) {
      if (r.surface !== surface) continue;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.zone;
    }
  }
  const fallback = isIslaNatalPointOnLand(x, y);
  return fallback ? fallback.zone : 'playa-aurora';
}

/* ------------------------------------------------------------------ */
/* PUNTOS DE LLEGADA Y PARTIDA                                        */
/* ------------------------------------------------------------------ */

export const ISLA_NATAL_SPAWN = { x: 806, y: 986 };
/**
 * Puerto Norte: única salida de la isla. Está en la costa norte de la pradera,
 * frente al mar abierto que separa la Isla Natal de la Isla del Origen.
 */
export const ISLA_NATAL_DEPARTURE = { x: 820, y: 516, radius: 68 };
/** Punto de llegada tras ganar Pong: a unos pasos del puerto norte. */
export const ISLA_NATAL_NORTH_PORT_SPAWN = { x: 820, y: 574 };
export const ISLA_NATAL_ARCADE_ANCHOR = { x: 1251, y: 668, radius: 78 };
/** Posición donde la paleta queda apoyada tras la victoria (debe coincidir con el renderer). */
export const ISLA_NATAL_PADDLE_ANCHOR = { x: 1311, y: 664, radius: 64 };

/* ------------------------------------------------------------------ */
/* MARCADORES NARRATIVOS (se guardan en island70s.narrativeEvents)     */
/* ------------------------------------------------------------------ */

export const ISLA_NATAL_FLAGS = {
  firstLight: 'isla-natal-primera-luz',
  arcadeFound: 'isla-natal-arcade-hallado',
  arcadePowered: 'isla-natal-arcade-encendido',
  pongWon: 'isla-natal-pong-victoria',
  signal: 'isla-natal-senal',
  paddle: 'isla-natal-paleta',
  departed: 'isla-natal-partida',
} as const;

/* ------------------------------------------------------------------ */
/* PUNTOS DE INTERÉS Y DIÁLOGOS                                       */
/* ------------------------------------------------------------------ */

export type IslaNatalPoiKind =
  | 'sign'
  | 'net'
  | 'shells'
  | 'window'
  | 'mailbox'
  | 'crate'
  | 'viewpoint-sea'
  | 'viewpoint-island'
  | 'arcade'
  | 'paddle'
  | 'departure';

export interface IslaNatalDialog {
  title: string;
  subtitle?: string;
  paragraphs: string[];
  hint?: string;
}

export interface IslaNatalPoi {
  id: string;
  kind: IslaNatalPoiKind;
  x: number;
  y: number;
  radius: number;
  label: string;
  accentHex: string;
  dialog: IslaNatalDialog;
}

export const ISLA_NATAL_POIS: IslaNatalPoi[] = [
  {
    id: 'cartel-playa',
    kind: 'sign',
    x: 872,
    y: 946,
    radius: 62,
    label: 'Leer el cartel',
    accentHex: '#fcd34d',
    dialog: {
      title: 'Cartel de madera',
      subtitle: 'Playa del Aurora',
      paragraphs: [
        'La sal se ha comido casi todas las letras. Sólo se lee entero el nombre de la isla.',
        'Debajo, con una caligrafía que conoces mejor que la tuya, alguien añadió: «Aquí aprendiste a jugar».',
      ],
      hint: 'No recuerdas quién lo escribió. Tampoco recuerdas haberlo olvidado.',
    },
  },
  {
    id: 'red-pesca',
    kind: 'net',
    x: 668,
    y: 958,
    radius: 58,
    label: 'Examinar la red',
    accentHex: '#7dd3fc',
    dialog: {
      title: 'Red de pesca',
      paragraphs: [
        'Una red vieja, remendada una y otra vez con hilo de un cian imposible de encontrar en la isla.',
        'Entre las mallas quedan escamas que brillan un instante más de lo que deberían.',
      ],
      hint: 'El nudo del remiendo es idéntico al de los cables de la máquina de la arboleda.',
    },
  },
  {
    id: 'puerta-cabana',
    kind: 'window',
    x: 506,
    y: 752,
    radius: 56,
    label: 'Llamar a la puerta',
    accentHex: '#fdba74',
    dialog: {
      title: 'La cabaña',
      subtitle: 'Puerta del este',
      paragraphs: [
        'La puerta está entornada. Del otro lado llega el mismo olor a madera caliente que sale por la ventana, y una luz que no parpadea.',
        'La aldaba de latón cede apenas: algo la sostiene desde dentro. No insistes; la ventana del este sigue abierta a la tarde.',
      ],
      hint: 'La casa te deja mirar, pero todavía no entrar.',
    },
  },
  {
    id: 'caja-taller',
    kind: 'crate',
    x: 596,
    y: 704,
    radius: 56,
    label: 'Revisar la caja',
    accentHex: '#d6b98c',
    dialog: {
      title: 'Caja de herramientas',
      paragraphs: [
        'Alicates, estaño, una lámpara de fósforo y recambios que no corresponden a ninguna herramienta de la isla.',
        'Al fondo descansa una tabla de madera gastada: rectangular, blanca por el uso, del tamaño exacto de una paleta.',
      ],
      hint: 'Al tocarla, la madera vibra un segundo, como si recordara un rebote.',
    },
  },
  {
    id: 'mirador-oleaje',
    kind: 'viewpoint-sea',
    x: 1176,
    y: 848,
    radius: 68,
    label: 'Contemplar el horizonte',
    accentHex: '#a5b4fc',
    dialog: {
      title: 'Mirador del Oleaje',
      paragraphs: [
        'Desde la punta sureste el mar se estira hasta perder el borde. Las olas rompen con un ritmo tranquilo, casi de bucle.',
        'Muy lejos, sobre la línea del horizonte, algo parpadea tres veces y se apaga. No es un faro: es un fallo.',
        'El agua tarda un instante de más en volver a su sitio, como si la isla tuviera que dibujarla otra vez.',
      ],
      hint: 'No puedes dejar de mirar ese punto. Algo ahí fuera está perdiendo la señal.',
    },
  },
  {
    id: 'oteo-isla',
    kind: 'viewpoint-island',
    x: 424,
    y: 330,
    radius: 66,
    label: 'Otear la isla',
    accentHex: '#fcd34d',
    dialog: {
      title: 'Alto de las Rocas',
      paragraphs: [
        'Toda la Isla Natal cabe desde aquí: la playa donde despiertas, la pradera, el techo de la cabaña y el sendero que sube a la arboleda.',
        'Entre los árboles del noreste se filtra un resplandor cian muy tenue, constante, que no viene del sol.',
      ],
      hint: 'Lleva años encendido esperando a que alguien lo note.',
    },
  },
];

/* ------------------------------------------------------------------ */
/* DIÁLOGOS DINÁMICOS DE LA MÁQUINA (según su estado)                  */
/* ------------------------------------------------------------------ */

export const ARCADE_DIALOG_DUSTY: IslaNatalDialog = {
  title: 'Máquina olvidada',
  subtitle: 'Cobertizo de la arboleda',
  paragraphs: [
    'Un gabinete de Pong de 1972, con la madera hinchada por la humedad y la pantalla llena de polvo.',
    'No debería estar aquí: nadie trajo nunca electricidad a esta isla.',
    'Recuerdas la tarde en que llegó. Un viajero viejo, con las manos llenas de estática, la dejó bajo los árboles y dijo que venía de un tiempo que todavía no existe.',
    '«Es tuya —dijo—. Juega. Y no pares hasta ganarme.» Luego se fue hacia el mar y el mar no se lo tragó: simplemente dejó de estar.',
  ],
  hint: 'El interruptor sigue ahí. Podrías encenderla.',
};

export const ARCADE_DIALOG_POWER_ON: IslaNatalDialog = {
  title: 'Encender la máquina',
  paragraphs: [
    'Al pulsar el interruptor, el tubo tarda en despertar: un zumbido grave, una línea blanca que tiembla y por fin el punto de luz.',
    'La pantalla no refleja tu cara. Refleja la isla entera, vista desde muy arriba, y algo más que aún no reconoces.',
    'Tres goles. Como entonces. Como siempre.',
  ],
  hint: 'W / S para mover la paleta · Primer jugador en 3 goles gana',
};

export const ARCADE_DIALOG_AFTER_WIN: IslaNatalDialog = {
  title: 'Señal en la pantalla',
  paragraphs: [
    'El marcador se queda en 3 y la máquina no vuelve al atractivo: la pantalla se llena de bandas que caen como lluvia.',
    'Entre la estática se dibuja una silueta enorme —arcos, torres, un cielo roto— y una voz sin boca dice una sola palabra que no llegas a entender.',
    'Después, silencio. Sobre el cristal queda escrita una dirección que no está en ningún mapa: la Isla del Origen.',
  ],
  hint: 'Algo se ha despertado muy lejos de aquí… y ha aprendido tu nombre.',
};

export const ARCADE_DIALOG_SPENT: IslaNatalDialog = {
  title: 'Máquina en reposo',
  paragraphs: [
    'La pantalla respira una línea blanca muy despacio, como un animal dormido.',
    'Ya no hay partida que jugar: la máquina sólo mantiene abierta la señal.',
  ],
  hint: 'La paleta descansa apoyada en el lateral del gabinete.',
};

export const PADDLE_DIALOG: IslaNatalDialog = {
  title: 'La paleta',
  paragraphs: [
    'Apoyada contra el gabinete hay una barra blanca, lisa y tibia, del tamaño de tu antebrazo. La madera de la caja de herramientas tenía exactamente esta forma.',
    'Al levantarla no pesa. Se acomoda sola en tu mano y el aire de la isla se ordena alrededor, como si la reconociera.',
    'Y entonces lo entiendes sin que nadie te lo explique: esto no es un trofeo. Es un medio de transporte.',
  ],
  hint: 'Con la paleta en la mano, el mar deja de ser un límite.',
};

export const DEPARTURE_DIALOG: IslaNatalDialog = {
  title: 'El carril del puerto norte',
  subtitle: 'Costa norte',
  paragraphs: [
    'La paleta brilla apuntando al norte. Más allá de la rompiente, el agua se abre en un carril de luz quieta que cruza el mar abierto.',
    'Detrás queda la cabaña, el cartel medio borrado y una máquina que por fin ha cumplido su encargo.',
    'Delante, la Isla del Origen y todo lo que el mundo olvidó.',
  ],
  hint: 'Surcar hacia la Isla del Origen',
};

export const DEPARTURE_BLOCKED_DIALOG: IslaNatalDialog = {
  title: 'El puerto está cerrado',
  paragraphs: [
    'El muelle de madera cruje sobre el agua, pero el carril de luz todavía no existe.',
    'Sin la Barra de Pong no hay forma de cruzar el mar. La respuesta sigue esperando en la arboleda, junto al viejo gabinete.',
  ],
  hint: 'Gana Pong y recoge la barra antes de volver al puerto norte.',
};

/* ------------------------------------------------------------------ */
/* VEGETACIÓN Y DETALLES (deterministas, sin recursos externos)        */
/* ------------------------------------------------------------------ */

export interface DecorPoint {
  x: number;
  y: number;
  seed: number;
}

function hash2(x: number, y: number): number {
  let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967295;
}

export const ISLA_NATAL_PALMS: DecorPoint[] = [
  { x: 636, y: 878, seed: 0.12 },
  { x: 1002, y: 886, seed: 0.44 },
  { x: 586, y: 846, seed: 0.71 },
  { x: 1128, y: 512, seed: 0.28 },
  { x: 1342, y: 566, seed: 0.63 },
  { x: 1058, y: 632, seed: 0.9 },
  { x: 566, y: 618, seed: 0.35 },
  { x: 978, y: 800, seed: 0.57 },
  { x: 690, y: 512, seed: 0.81 },
  { x: 1244, y: 700, seed: 0.19 },
];

export const ISLA_NATAL_BOULDERS: DecorPoint[] = [
  { x: 344, y: 402, seed: 0.2 },
  { x: 512, y: 452, seed: 0.55 },
  { x: 402, y: 356, seed: 0.8 },
  { x: 556, y: 392, seed: 0.33 },
  { x: 1156, y: 848, seed: 0.6 },
  { x: 618, y: 994, seed: 0.41 },
  { x: 1020, y: 918, seed: 0.77 },
];

export interface IslaNatalTreeSpec {
  x: number;
  y: number;
  variant: 'forest' | 'meadow' | 'pine';
}

/** Árboles artesanales del motor de Isla Orígenes: robles de bosque/pradera y pinos. */
export const ISLA_NATAL_TREES: IslaNatalTreeSpec[] = [
  { x: 1124, y: 672, variant: 'forest' },
  { x: 1152, y: 688, variant: 'forest' },
  { x: 1136, y: 654, variant: 'forest' },
  { x: 1352, y: 678, variant: 'pine' },
  { x: 1360, y: 642, variant: 'pine' },
  { x: 470, y: 720, variant: 'forest' },
  { x: 560, y: 540, variant: 'forest' },
  { x: 720, y: 520, variant: 'forest' },
  { x: 960, y: 540, variant: 'meadow' },
];

/** Dispersión sembrada de matas, flores y guijarros dentro de la tierra útil. */
function scatter(
  count: number,
  surfaces: IslaNatalSurface[],
  salt: number
): DecorPoint[] {
  const out: DecorPoint[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard++;
    const x = 260 + hash2(guard, salt) * (ISLA_NATAL_WORLD_W - 500);
    const y = 250 + hash2(guard + 7919, salt + 13) * (ISLA_NATAL_WORLD_H - 460);
    const rect = isIslaNatalPointOnLand(x, y);
    if (!rect || !surfaces.includes(rect.surface)) continue;
    if (isIslaNatalPointBlockedBySolid(x, y)) continue;
    if (Math.abs(x - ISLA_NATAL_SPAWN.x) < 90 && Math.abs(y - ISLA_NATAL_SPAWN.y) < 90) continue;
    out.push({ x: Math.round(x), y: Math.round(y), seed: hash2(guard + 104729, salt + 71) });
  }
  return out;
}

export const ISLA_NATAL_TUFTS: DecorPoint[] = scatter(210, ['grass'], 11);
export const ISLA_NATAL_FLOWERS: DecorPoint[] = scatter(72, ['grass'], 29);
export const ISLA_NATAL_PEBBLES: DecorPoint[] = scatter(120, ['sand', 'path', 'rock'], 47);
export const ISLA_NATAL_SHELLS: DecorPoint[] = scatter(34, ['sand'], 83);
