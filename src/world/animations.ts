// Animaciones de personajes, animales y clima.

import Phaser from 'phaser';
import { ANIMAL_ROWS, ANIMAL_TILE, CHAR_ROWS, FRAMES_PER_ROW, WORK_ROW, rowFrames } from './assets';

const CHARACTERS = [
  'npc_katy',
  'npc_bruno',
  'npc_bob',
  'npc_buba',
  'npc_mike',
  'npc_jack',
  'npc_fin',
  'npc_chloe',
] as const;

// Fin viene en hojas de 9 columnas, el resto de 6
const SHEET_COLS: Record<string, number> = { npc_fin: 9 };

function cols(key: string): number {
  return SHEET_COLS[key] ?? FRAMES_PER_ROW;
}

function add(
  anims: Phaser.Animations.AnimationManager,
  key: string,
  texture: string,
  frames: number[],
  frameRate: number,
  repeat = -1,
): void {
  if (anims.exists(key)) return;
  anims.create({
    key,
    frames: frames.map((frame) => ({ key: texture, frame })),
    frameRate,
    repeat,
  });
}

export function registerAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;

  // --- personajes ---------------------------------------------------------
  for (const key of CHARACTERS) {
    const c = cols(key);
    add(anims, `${key}-idle-down`, key, rowFrames(CHAR_ROWS.idleDown, FRAMES_PER_ROW, c), 5);
    add(anims, `${key}-idle-up`, key, rowFrames(CHAR_ROWS.idleUp, FRAMES_PER_ROW, c), 5);
    add(anims, `${key}-idle-side`, key, rowFrames(CHAR_ROWS.idleSide, FRAMES_PER_ROW, c), 5);
    add(anims, `${key}-walk-down`, key, rowFrames(CHAR_ROWS.walkDown, FRAMES_PER_ROW, c), 9);
    add(anims, `${key}-walk-up`, key, rowFrames(CHAR_ROWS.walkUp, FRAMES_PER_ROW, c), 9);
    add(anims, `${key}-walk-side`, key, rowFrames(CHAR_ROWS.walkSide, FRAMES_PER_ROW, c), 9);

    const work = WORK_ROW[key];
    if (work !== undefined) {
      add(anims, `${key}-work`, key, rowFrames(work, FRAMES_PER_ROW, c), 6);
    }
  }

  // --- animales -----------------------------------------------------------
  // el cerdo tiene 9 columnas y el resto 8, por eso se mide cada hoja
  for (const [key, filas] of Object.entries(ANIMAL_ROWS)) {
    if (!scene.textures.exists(key)) continue;
    const imagen = scene.textures.get(key).getSourceImage();
    const columnas = Math.floor(imagen.width / ANIMAL_TILE);
    const framesDe = ([fila, cuantos]: [number, number]): number[] =>
      Array.from({ length: cuantos }, (_, i) => fila * columnas + i);

    add(anims, `${key}-idle`, key, framesDe(filas.idle), 3);
    add(anims, `${key}-walk`, key, framesDe(filas.walk), 8);
    if (filas.idleDown) add(anims, `${key}-idle-down`, key, framesDe(filas.idleDown), 3);
    if (filas.idleUp) add(anims, `${key}-idle-up`, key, framesDe(filas.idleUp), 3);
    if (filas.walkDown) add(anims, `${key}-walk-down`, key, framesDe(filas.walkDown), 8);
    if (filas.walkUp) add(anims, `${key}-walk-up`, key, framesDe(filas.walkUp), 8);
    if (filas.graze) add(anims, `${key}-graze`, key, framesDe(filas.graze), 5);
    if (filas.swim) add(anims, `${key}-swim`, key, framesDe(filas.swim), 3);
    if (filas.swimMove) add(anims, `${key}-swim-move`, key, framesDe(filas.swimMove), 6);
  }
  add(anims, 'chimney-smoke', 'chimneySmoke', [0, 1, 2, 3, 4], 6);

  // --- clima (se reproducen una vez y desaparecen) --------------------------
  add(anims, 'rain-impact', 'rainImpact', [0, 1, 2, 3, 4, 5, 6], 16, 0);
  add(anims, 'wind-gust', 'wind', Array.from({ length: 14 }, (_, i) => i), 14, 0);
  add(anims, 'butterfly-fly', 'butterfly', [0, 1, 2, 3], 10);
  add(anims, 'bee-fly', 'bee', [0, 1, 2, 3], 12);
}

export function moveAnim(texture: string, dir: 'up' | 'down' | 'left' | 'right', moving: boolean): string {
  const state = moving ? 'walk' : 'idle';
  if (dir === 'up') return `${texture}-${state}-up`;
  if (dir === 'down') return `${texture}-${state}-down`;
  return `${texture}-${state}-side`;
}
