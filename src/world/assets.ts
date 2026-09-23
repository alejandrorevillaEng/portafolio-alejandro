/**
 * Catalogo de sprites SUELTOS: lo que se mueve por el mapa (vecinos, animales,
 * nubes). Todo lo demas —suelo, agua, edificios, arboles, decoracion— son
 * tiles y vive en el mapa de Tiled (ver mapa/ y tools/mapa/catalogo.mjs).
 *
 * Para usar un sprite nuevo del pack basta con anadirlo aqui y lanzar
 * `npm run assets`. No hay rutas sueltas por el resto del codigo.
 */

export interface SheetSpec {
  key: string;
  path: string;
  /** Si tiene frameWidth se carga como spritesheet; si no, como imagen suelta. */
  frameWidth?: number;
  frameHeight?: number;
  /**
   * Recortes a medida [x, y, ancho, alto] para hojas que NO son una rejilla
   * uniforme. Algunas del pack mezclan sprites de anchos distintos: cortarlas
   * en celdas iguales parte los dibujos por la mitad.
   */
  cuts?: Array<[number, number, number, number]>;
}

const A = 'assets';

/** Imagenes sueltas y hojas de sprites del mundo. */
export const SHEETS: SheetSpec[] = [
  // --- clima --------------------------------------------------------------
  // Bocanada de humo de chimenea: 5 dibujos de 32x32 que suben hacia la derecha.
  { key: 'chimneySmoke', path: `${A}/buildings/House_Decor/Chimney_smoke_Anim.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'clouds', path: `${A}/weather/Clouds.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'rainDrop', path: `${A}/weather/Rain_Drop.png` },
  // 7 dibujos: la gota cae en diagonal (0-2) y revienta contra el suelo (3-6).
  { key: 'rainImpact', path: `${A}/weather/Rain_Drop_Impact.png`, frameWidth: 16, frameHeight: 16 },
  // 14 dibujos: un remolino de viento que se dibuja y se deshace.
  { key: 'wind', path: `${A}/weather/Wind_Anim.png`, frameWidth: 16, frameHeight: 16 },
  { key: 'leafOak', path: `${A}/trees/Oak_Leaf_Particle.png` },
  { key: 'leafBirch', path: `${A}/trees/Birch_Leaf_Particle.png` },

  // --- animales (32x32) ---------------------------------------------------
  { key: 'chicken', path: `${A}/animals/Chicken/Chicken_01.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'rooster', path: `${A}/animals/Chicken/Rooster.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'duck', path: `${A}/animals/Duck/Duck_01.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'swan', path: `${A}/animals/Swan/Swan_01.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'cow', path: `${A}/animals/Cow/Cow_01.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'pig', path: `${A}/animals/Pig/Pig_01.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'sheep', path: `${A}/animals/Sheep/Sheep_01.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'butterfly', path: `${A}/animals/Butterfly/Butterfly.png`, frameWidth: 16, frameHeight: 16 },
  { key: 'bee', path: `${A}/animals/Bee/Bee_Flying_Animation.png`, frameWidth: 16, frameHeight: 16 },

  // --- iconos del pack (16x16), para los marcadores -----------------------
  { key: 'iconTools', path: `${A}/icons/No Outline/Tool_Icons_NO_Outline.png`, frameWidth: 16, frameHeight: 16 },
  { key: 'iconFood', path: `${A}/icons/No Outline/Food_Icons_NO_Outline.png`, frameWidth: 16, frameHeight: 16 },
  { key: 'iconRes', path: `${A}/icons/No Outline/Resources_Icons_NO_Outline.png`, frameWidth: 16, frameHeight: 16 },

  // --- personajes (64x64, 6 frames por fila) ------------------------------
  { key: 'npc_katy', path: `${A}/npcs/Bartender_Katy.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'npc_bruno', path: `${A}/npcs/Bartender_Bruno.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'npc_bob', path: `${A}/npcs/Farmer_Bob.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'npc_buba', path: `${A}/npcs/Farmer_Buba.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'npc_mike', path: `${A}/npcs/Miner_Mike.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'npc_jack', path: `${A}/npcs/Lumberjack_Jack.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'npc_fin', path: `${A}/npcs/Fisherman_Fin.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'npc_chloe', path: `${A}/npcs/Chef_Chloe.png`, frameWidth: 64, frameHeight: 64 },
];


/**
 * Filas de las hojas de personaje (64x64, 6 frames por fila).
 * Mirado dibujo a dibujo sobre Farmer_Bob: primero los tres reposos (abajo, de
 * lado, arriba) y luego los tres andares en el mismo orden. El perfil mira a
 * la DERECHA; la izquierda se hace volteando. (Antes estaba como parejas
 * reposo/andar y al andar de lado se reproducia la fila de andar hacia arriba:
 * los vecinos parecian caminar de espaldas.)
 * Si algun personaje se anima raro, se corrige SOLO aqui.
 */
export const CHAR_ROWS = {
  idleDown: 0,
  idleSide: 1,
  idleUp: 2,
  walkDown: 3,
  walkSide: 4,
  walkUp: 5,
} as const;

export const FRAMES_PER_ROW = 6;

/**
 * Fila de "oficio" de cada NPC: la animacion que hace cuando esta parado en su
 * sitio. Solo las hojas largas (10 o 13 filas) traen animaciones de herramienta;
 * las de 7 filas solo tienen movimiento, asi que esos NPCs se quedan en reposo.
 */
export const WORK_ROW: Record<string, number> = {
  npc_mike: 7, // pico
  npc_jack: 7, // hacha
  npc_bob: 7, // guadana
  npc_buba: 11, // regadera
  npc_fin: 7, // cana de pescar
};

export function rowFrames(row: number, count = FRAMES_PER_ROW, cols = FRAMES_PER_ROW): number[] {
  const start = row * cols;
  return Array.from({ length: count }, (_, i) => start + i);
}

/**
 * Filas de las hojas de animales (sprites de 32x32), verificadas hoja por hoja
 * contando los dibujos reales de cada fila.
 *
 * TODAS las hojas de animales miran a la IZQUIERDA: para ir a la derecha se
 * voltean (al reves que los vecinos).
 *
 * Hay dos familias:
 *   - Aves: fila 0 quieta (2 dibujos), fila 1 andando (6), solo de perfil. La
 *     gallina y el gallo traen una fila 2 de picoteo (8), que queda mejor de
 *     reposo. Patos y cisnes: fila 7 flotando y 8 nadando.
 *   - Cuadrupedos: filas 0-2 quietos de perfil, de frente y de espaldas (2
 *     dibujos), 3-5 andando en esas mismas direcciones (8) y 6 pastando (8; 9
 *     en el cerdo).
 *
 * El numero de COLUMNAS no es el mismo en todas: el cerdo tiene 9 y el resto 8.
 * Por eso aqui se guarda la fila y cuantos dibujos tiene, y los indices se
 * calculan en animations.ts midiendo la hoja. Pedir mas dibujos de los que hay
 * es justo lo que hacia que los animales parpadearan: la animacion incluia
 * celdas vacias.
 */
export interface AnimalRows {
  /** [fila, cuantos dibujos] */
  idle: [number, number];
  walk: [number, number];
  /** Cuadrupedos: quieto y andando hacia abajo/arriba, y pastando. */
  idleDown?: [number, number];
  idleUp?: [number, number];
  walkDown?: [number, number];
  walkUp?: [number, number];
  graze?: [number, number];
  /** Solo aves de agua: flotando quietas y nadando (filas con la linea de agua). */
  swim?: [number, number];
  swimMove?: [number, number];
}

export const ANIMAL_ROWS: Record<string, AnimalRows> = {
  chicken: { idle: [2, 8], walk: [1, 6] },
  rooster: { idle: [2, 8], walk: [1, 6] },
  duck: { idle: [0, 2], walk: [1, 6], swim: [7, 2], swimMove: [8, 4] },
  swan: { idle: [0, 2], walk: [1, 6], swim: [7, 2], swimMove: [8, 3] },
  cow: { idle: [0, 2], idleDown: [1, 2], idleUp: [2, 2], walk: [3, 8], walkDown: [4, 8], walkUp: [5, 8], graze: [6, 8] },
  pig: { idle: [0, 2], idleDown: [1, 2], idleUp: [2, 2], walk: [3, 8], walkDown: [4, 8], walkUp: [5, 8], graze: [6, 9] },
  sheep: { idle: [0, 2], idleDown: [1, 2], idleUp: [2, 2], walk: [3, 8], walkDown: [4, 8], walkUp: [5, 8], graze: [6, 8] },
};

/** Lado del sprite de un animal, en pixeles. */
export const ANIMAL_TILE = 32;

/**
 * El icono de oficio que lleva cada vecino (o cartel) en su marcador: dice que
 * hay dentro antes de pulsar. [hoja, dibujo]; el dibujo cuenta de izquierda a
 * derecha y fila a fila (Tool 10 por fila, Food 8, Resources 6).
 * Un id sin icono aqui sale con un "!".
 */
export const MARKER_ICONS: Record<string, [key: string, frame: number]> = {
  bienvenida: ['iconFood', 64], // girasol: la plaza, la bienvenida
  'sobre-mi': ['iconFood', 15], // huevo frito: el desayuno de la posada
  proyectos: ['iconRes', 14], // lingote de oro: el mercado
  backend: ['iconTools', 8], // martillo: la herreria
  datos: ['iconTools', 2], // pico: la mina
  ia: ['iconRes', 4], // cristal: el invernadero
  redes: ['iconFood', 24], // trigo: el molino
  certificaciones: ['iconTools', 9], // antorcha: la capilla
  aprendiendo: ['iconTools', 6], // regadera: el huerto
  contacto: ['iconTools', 7], // cana de pescar: el estanque
};
