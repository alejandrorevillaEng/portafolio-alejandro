// Lee public/mapa/aldea.json (exportado de Tiled).
// Capas de objetos: vecinos (punto o polilinea, el nombre es su id), carteles,
// animales (rectangulos) y efectos (humo, luz). Capas con encima=true van sobre los personajes.

import Phaser from 'phaser';

export type Facing = 'up' | 'down' | 'left' | 'right';

export interface NpcSpawn {
  id: string;
  sprite: string;
  /** pies */
  home: [number, number];
  route?: Array<[number, number]>;
  facing?: Facing;
}

export interface SignSpawn {
  id: string;
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnimalSpawn {
  key: string;
  area: Rect;
  count: number;
  kind: 'walker' | 'swimmer' | 'flyer';
}

export interface Aldea {
  npcs: NpcSpawn[];
  signs: SignSpawn[];
  animals: AnimalSpawn[];
  smoke: Array<[number, number]>;
  lights: Array<[number, number]>;
}

export const MAP_KEY = 'aldea';
export const MAP_URL = 'mapa/aldea.json';

export const tilesetKey = (name: string): string => `tileset:${name}`;

type Props = Record<string, string | number | boolean>;

function props(obj: Phaser.Types.Tilemaps.TiledObject): Props {
  const out: Props = {};
  const list = (obj.properties ?? []) as Array<{ name: string; value: string | number | boolean }>;
  for (const p of list) out[p.name] = p.value;
  return out;
}

function objects(map: Phaser.Tilemaps.Tilemap, layer: string): Phaser.Types.Tilemaps.TiledObject[] {
  return map.getObjectLayer(layer)?.objects ?? [];
}

export function readAldea(map: Phaser.Tilemaps.Tilemap): Aldea {
  const npcs: NpcSpawn[] = objects(map, 'vecinos').map((o) => {
    const p = props(o);
    const x = o.x ?? 0;
    const y = o.y ?? 0;
    const route = o.polyline?.map((pt): [number, number] => [x + pt.x, y + pt.y]);
    return {
      id: o.name,
      sprite: String(p.sprite ?? 'npc_bob'),
      home: [x, y],
      route: route && route.length > 1 ? route : undefined,
      facing: (p.mirada as Facing) ?? 'down',
    };
  });

  const signs: SignSpawn[] = objects(map, 'carteles').map((o) => ({ id: o.name, x: o.x ?? 0, y: o.y ?? 0 }));

  const animals: AnimalSpawn[] = objects(map, 'animales').map((o) => {
    const p = props(o);
    return {
      key: String(p.especie ?? o.name),
      kind: (p.tipo as AnimalSpawn['kind']) ?? 'walker',
      count: Number(p.cantidad ?? 1),
      area: { x: o.x ?? 0, y: o.y ?? 0, w: o.width ?? 16, h: o.height ?? 16 },
    };
  });

  const efectos = objects(map, 'efectos');
  const puntos = (tipo: string): Array<[number, number]> =>
    efectos.filter((o) => o.type === tipo).map((o) => [o.x ?? 0, o.y ?? 0]);

  return { npcs, signs, animals, smoke: puntos('humo'), lights: puntos('luz') };
}

export function isOverhead(layer: Phaser.Tilemaps.LayerData): boolean {
  const list = (layer.properties ?? []) as Array<{ name: string; value: unknown }>;
  return list.some((p) => p.name === 'encima' && p.value === true);
}
