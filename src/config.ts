export const TILE = 16;

// Tamano del mapa en tiles
export const MAP_W = 52;
export const MAP_H = 36;

export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

export const NPC_SPEED = 26;

export const DEPTH = {
  ground: 0,
  groundDecor: 5,
  shadow: 8,
  // 10 + y de los pies
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
