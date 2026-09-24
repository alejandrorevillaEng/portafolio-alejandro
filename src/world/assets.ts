// Sprites sueltos (vecinos, animales, clima, iconos). El resto son tiles del mapa.
// Tras anadir uno: npm run assets

export interface SheetSpec {
  key: string;
  path: string;
  frameWidth?: number;
  frameHeight?: number;
  /** [x, y, ancho, alto] para hojas que no son una rejilla uniforme */
  cuts?: Array<[number, number, number, number]>;
}

const A = 'assets';

export const SHEETS: SheetSpec[] = [
  // --- clima --------------------------------------------------------------
  { key: 'chimneySmoke', path: `${A}/buildings/House_Decor/Chimney_smoke_Anim.png`, frameWidth: 32, frameHeight: 32 },
  { key: 'clouds', path: `${A}/weather/Clouds.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'rainDrop', path: `${A}/weather/Rain_Drop.png` },
  // 0-2 cae, 3-6 revienta
  { key: 'rainImpact', path: `${A}/weather/Rain_Drop_Impact.png`, frameWidth: 16, frameHeight: 16 },
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

  // --- iconos de los marcadores (16x16) -----------------------------------
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


// Filas: reposo abajo/lado/arriba y luego andar en el mismo orden.
// El perfil mira a la derecha; la izquierda es con flipX.
export const CHAR_ROWS = {
  idleDown: 0,
  idleSide: 1,
  idleUp: 2,
  walkDown: 3,
  walkSide: 4,
  walkUp: 5,
} as const;

export const FRAMES_PER_ROW = 6;

// Fila de la animacion de oficio (solo en las hojas largas)
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

// Animales: todos miran a la izquierda. [fila, cuantos dibujos]; los indices
// se calculan en animations.ts porque no todas las hojas tienen las mismas columnas.
export interface AnimalRows {
  idle: [number, number];
  walk: [number, number];
  idleDown?: [number, number];
  idleUp?: [number, number];
  walkDown?: [number, number];
  walkUp?: [number, number];
  graze?: [number, number];
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

export const ANIMAL_TILE = 32;

// Icono sobre cada vecino: [hoja, dibujo] (Tool 10 por fila, Food 8, Resources 6)
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
