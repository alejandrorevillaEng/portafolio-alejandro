/** Constantes globales. Aqui no hay numeros magicos repartidos por el codigo. */

export const TILE = 16;

/** Tamano del mundo en tiles. Ampliar la aldea = subir estos numeros. */
export const MAP_W = 52;
export const MAP_H = 36;

export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/**
 * Vista fija: la camara siempre encaja la aldea entera en pantalla (sin
 * seguir a nadie). El marco en torno al canvas (#stage-frame) ya tiene la
 * proporcion real del mapa, asi que este margen es solo un pequeno respiro
 * para que el terreno no toque el borde del marco.
 */

export const NPC_SPEED = 26;

/** Profundidad de las capas de render. */
export const DEPTH = {
  ground: 0,
  groundDecor: 5,
  shadow: 8,
  /** Los sprites con y-sorting viven entre 10 y 10000 (depth = 10 + y). */
  entities: 10,
  overhead: 20000,
  weather: 30000,
  night: 40000,
  hud: 50000,
} as const;

export const COLORS = {
  night: 0x0a1030,
  dusk: 0x2a1a4a,
} as const;
