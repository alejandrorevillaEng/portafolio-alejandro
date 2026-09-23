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
    // Mientras se carga, la escena no recibe update, asi que el cargador de
    // Phaser depende de encadenar los eventos de cada fichero. Si todos vienen
    // de cache pueden completarse antes de tiempo y la cola se queda parada a
    // medias. Este vigilante la empuja hasta que termina.
    this.watchdog = window.setInterval(() => {
      if (!this.load.isLoading()) return;
      (this.load as unknown as { checkLoadQueue(): void }).checkLoadQueue();
    }, 120);

    // La barra de carga es DOM: se le avisa por el bus, no se toca desde aqui.
    this.load.on('progress', (value: number) => emit('load:progress', { value }));

    // El mapa de Tiled, y en cuanto llega, las imagenes de sus tilesets. El
    // exportador ya ha quitado del JSON los tilesets que no se usan.
    this.load.tilemapTiledJSON(MAP_KEY, MAP_URL);
    this.load.once(`filecomplete-tilemapJSON-${MAP_KEY}`, () => {
      const data = this.cache.tilemap.get(MAP_KEY)?.data as { tilesets: Array<{ name: string; image: string }> };
      for (const ts of data?.tilesets ?? []) this.load.image(tilesetKey(ts.name), `mapa/${ts.image}`);
    });

    for (const sheet of SHEETS) {
      if (sheet.cuts) {
        // Hoja irregular: se carga entera y los recortes se anaden a mano
        // cuando el PNG ya esta en memoria.
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

    // Recortes a medida de las hojas que no son una rejilla uniforme.
    for (const sheet of SHEETS) {
      if (!sheet.cuts || !this.textures.exists(sheet.key)) continue;
      const texture = this.textures.get(sheet.key);
      sheet.cuts.forEach(([x, y, w, h], i) => texture.add(i, 0, x, y, w, h));
    }

    this.scene.start('world');
  }
}
