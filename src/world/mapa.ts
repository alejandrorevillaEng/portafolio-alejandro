/**
 * LA ALDEA, leida del mapa de Tiled.
 *
 * El mapa se dibuja en Tiled (mapa/aldea.tmx) y se exporta con `npm run mapa`
 * a public/mapa/aldea.json. Aqui se traduce a lo que el juego necesita:
 *
 *   - capas de tiles: se pintan tal cual. Las que llevan la propiedad
 *     `encima = true` van por encima de vecinos y animales (tejados, copas).
 *   - capa de objetos "vecinos": un punto o una polilinea por vecino. El nombre
 *     del objeto es su id en content/*.json; el primer punto es su casa (donde
 *     tiene los pies) y el resto, su paseo.
 *   - "carteles": un punto por cartel que abre panel (nombre = id del cartel).
 *   - "animales": rectangulos donde pasea cada especie.
 *   - "efectos": puntos de humo (chimeneas) y de luz (se encienden de noche).
 *
 * Todas las coordenadas salen en pixeles del mundo.
 */

import Phaser from 'phaser';

export type Facing = 'up' | 'down' | 'left' | 'right';

export interface NpcSpawn {
  /** Coincide con la clave del NPC en content/*.json. */
  id: string;
  sprite: string;
  /** Punto de los pies donde vive y hace su oficio. */
  home: [number, number];
  /** Paseo (pies), si lo tiene. */
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

/** Clave de textura de un tileset del mapa. */
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

/** Lee los objetos del mapa: vecinos, carteles, animales y efectos. */
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

/** Capa de tiles que va por encima de los personajes. */
export function isOverhead(layer: Phaser.Tilemaps.LayerData): boolean {
  const list = (layer.properties ?? []) as Array<{ name: string; value: unknown }>;
  return list.some((p) => p.name === 'encima' && p.value === true);
}
