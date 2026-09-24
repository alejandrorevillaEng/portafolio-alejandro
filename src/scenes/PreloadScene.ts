import Phaser from 'phaser';
import { SHEETS } from '@/world/assets';
import { MAP_KEY, MAP_URL, tilesetKey } from '@/world/mapa';
import { emit } from '@/systems/bus';

export class PreloadScene extends Phaser.Scene {
  private watchdog = 0;

  constructor() {
    super('preload');
  }

  preload(): void {
    // Con todo en cache la cola del loader a veces se queda parada; esto la empuja.
    this.watchdog = window.setInterval(() => {
      if (!this.load.isLoading()) return;
      (this.load as unknown as { checkLoadQueue(): void }).checkLoadQueue();
    }, 120);

    this.load.on('progress', (value: number) => emit('load:progress', { value }));

    // Mapa de Tiled y, cuando llega, sus tilesets
    this.load.tilemapTiledJSON(MAP_KEY, MAP_URL);
    this.load.once(`filecomplete-tilemapJSON-${MAP_KEY}`, () => {
      const data = this.cache.tilemap.get(MAP_KEY)?.data as { tilesets: Array<{ name: string; image: string }> };
      for (const ts of data?.tilesets ?? []) this.load.image(tilesetKey(ts.name), `mapa/${ts.image}`);
    });

    for (const sheet of SHEETS) {
      if (sheet.cuts) {
        // hoja irregular: se recorta a mano al cargar
        this.load.image(sheet.key, sheet.path);
      } else if (sheet.frameWidth && sheet.frameHeight) {
        this.load.spritesheet(sheet.key, sheet.path, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
        });
      } else {
        this.load.image(sheet.key, sheet.path);
      }
    }
  }

  create(): void {
    window.clearInterval(this.watchdog);

    for (const sheet of SHEETS) {
      if (!sheet.cuts || !this.textures.exists(sheet.key)) continue;
      const texture = this.textures.get(sheet.key);
      sheet.cuts.forEach(([x, y, w, h], i) => texture.add(i, 0, x, y, w, h));
    }

    this.scene.start('world');
  }
}
