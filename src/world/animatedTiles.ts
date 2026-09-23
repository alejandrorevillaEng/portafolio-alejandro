/**
 * Tiles animados de Tiled (agua, fuente, antorchas, aspas del molino...).
 *
 * Tiled guarda la animacion en el tileset y la reproduce en el editor, pero
 * Phaser no la reproduce por su cuenta: pinta siempre el primer dibujo. Aqui
 * se buscan los tiles animados de cada capa y se les cambia el indice segun el
 * reloj de la escena.
 *
 * Todos van con el mismo reloj a proposito: las piezas del borde del agua y
 * las del centro tienen que cambiar de dibujo a la vez o se ven las costuras.
 */

import Phaser from 'phaser';

interface Anim {
  /** gid de cada dibujo */
  frames: number[];
  /** instante (ms dentro del ciclo) en que empieza cada dibujo */
  starts: number[];
  total: number;
  tiles: Phaser.Tilemaps.Tile[];
  current: number;
}

interface TiledFrame {
  tileid: number;
  duration: number;
}

export class AnimatedTiles {
  private readonly anims: Anim[] = [];

  constructor(map: Phaser.Tilemaps.Tilemap, layers: Phaser.Tilemaps.TilemapLayer[]) {
    const byGid = new Map<number, Anim>();

    for (const tileset of map.tilesets) {
      const data = tileset.tileData as Record<string, { animation?: TiledFrame[] }>;
      for (const [id, info] of Object.entries(data)) {
        if (!info.animation?.length) continue;
        const frames = info.animation.map((f) => tileset.firstgid + f.tileid);
        const starts: number[] = [];
        let total = 0;
        for (const f of info.animation) {
          starts.push(total);
          total += f.duration;
        }
        byGid.set(tileset.firstgid + Number(id), { frames, starts, total, tiles: [], current: 0 });
      }
    }

    for (const layer of layers) {
      layer.forEachTile((tile) => {
        const anim = byGid.get(tile.index);
        if (anim) anim.tiles.push(tile);
      });
    }

    for (const anim of byGid.values()) if (anim.tiles.length) this.anims.push(anim);
  }

  update(time: number): void {
    for (const anim of this.anims) {
      const t = time % anim.total;
      let frame = 0;
      while (frame + 1 < anim.starts.length && anim.starts[frame + 1] <= t) frame++;
      if (frame === anim.current) continue;
      anim.current = frame;
      const gid = anim.frames[frame];
      for (const tile of anim.tiles) tile.index = gid;
    }
  }
}
