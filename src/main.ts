import Phaser from 'phaser';
import { PreloadScene } from '@/scenes/PreloadScene';
import { WorldScene } from '@/scenes/WorldScene';
import { mountUI } from '@/ui/ui';
import { getLang } from '@/content';
import { WORLD_H, WORLD_W } from '@/config';

document.documentElement.lang = getLang();

mountUI();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b1a',
  pixelArt: true,
  roundPixels: true,
  // Sin esto el mapa no se puede arrastrar en el movil.
  input: { touch: { capture: false } },
  scale: {
    // Se dibuja siempre a 832x576 y el CSS lo escala; a escala fraccionaria
    // salen costuras entre tiles.
    mode: Phaser.Scale.FIT,
    parent: 'game',
    expandParent: false,
    autoRound: true,
    width: WORLD_W,
    height: WORLD_H,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [PreloadScene, WorldScene],
});

if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
