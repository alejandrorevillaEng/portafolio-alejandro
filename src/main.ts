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
  // En el movil el mapa es mas ancho que la pantalla y se arrastra con el dedo:
  // Phaser no debe quedarse los gestos tactiles, o el navegador no puede
  // desplazarlo. Los toques en los iconos siguen funcionando igual.
  input: { touch: { capture: false } },
  scale: {
    // El juego se dibuja SIEMPRE al tamano real del mundo (832x576) y es el
    // CSS quien agranda el canvas entero para llenar el marco. Es la diferencia
    // entre pixel art nitido y pixel art sucio: si Phaser dibujara a una escala
    // fraccionaria, cada tile caeria entre pixeles y saldrian costuras en los
    // bordes y parpadeo en los sprites pequenos (los animales).
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

// Solo en desarrollo: acceso al juego desde la consola del navegador.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
