import Phaser from 'phaser';
import { DEPTH, NPC_SPEED } from '@/config';
import { speaker } from '@/content';
import { moveAnim } from '@/world/animations';
import type { Facing, NpcSpawn } from '@/world/mapa';
import type { Colisiones } from '@/world/colisiones';
import { SpeechBubble } from './SpeechBubble';

export type { Facing };

// los pies dibujados acaban en la fila 41 de los 64
const BODY = { w: 12, h: 8, offsetX: 26, offsetY: 33 };

// del centro del sprite a los pies
const FEET = BODY.offsetY - 32 + BODY.h;
// de los pies a donde sale el bocadillo
const BUBBLE_Y = 25;

const PAUSE_MIN = 2200;
const PAUSE_MAX = 5200;
const ARRIVE_EPS = 2;

export class Npc {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly texture: string;

  // un tramo por cada par de puntos de la ruta, ya rodeando obstaculos
  private readonly legs: Phaser.Math.Vector2[][];
  private leg = 0;
  private step = 0;
  private waitUntil = 0;
  private facing: Facing;
  private busy = false;
  private readonly hasWorkAnim: boolean;
  private readonly bubble: SpeechBubble;
  private nextChatterAt: number;

  constructor(scene: Phaser.Scene, spawn: NpcSpawn, colisiones?: Colisiones) {
    this.id = spawn.id;
    this.texture = spawn.sprite;
    this.facing = spawn.facing ?? 'down';

    const route = (spawn.route ?? [spawn.home]).map((p) => colisiones?.cercano(p) ?? p);
    const [x, feet] = route[0];
    const y = feet - FEET;
    this.sprite = scene.physics.add.sprite(x, y, spawn.sprite);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY.w, BODY.h);
    body.setOffset(BODY.offsetX, BODY.offsetY);
    body.setImmovable(true);

    this.legs =
      route.length < 2
        ? []
        : route.map((from, i) => {
            const to = route[(i + 1) % route.length];
            const path = colisiones ? colisiones.camino(from, to) : [to];
            return path.map(([px, py]) => new Phaser.Math.Vector2(px, py - FEET));
          });
    this.hasWorkAnim = scene.anims.exists(`${spawn.sprite}-work`);

    this.bubble = new SpeechBubble(spawn.id);
    this.nextChatterAt = 3000 + Math.random() * 9000;

    this.idle();
  }

  get feetY(): number {
    return this.sprite.y + FEET;
  }

  /** Base para el marcador: a la misma altura sobre la cabeza que en un cartel. */
  get markerY(): number {
    return this.feetY + 13;
  }

  pause(): void {
    this.busy = true;
    this.sprite.setVelocity(0, 0);
    this.facing = 'down';
    this.bubble.hide();
    this.playMove(false);
  }

  resume(time: number): void {
    this.busy = false;
    this.waitUntil = time + 800;
  }

  update(time: number): void {
    this.sprite.setDepth(DEPTH.entities + this.feetY);
    this.bubble.update(time, this.sprite.x, this.feetY - BUBBLE_Y);

    // se lee cada vez para que siga el cambio de idioma
    const chatter = speaker(this.id)?.chatter ?? [];
    if (!this.busy && chatter.length && time >= this.nextChatterAt) {
      if (!SpeechBubble.canSpeak()) {
        this.nextChatterAt = time + Phaser.Math.Between(1500, 4000);
      } else {
        const line = chatter[Phaser.Math.Between(0, chatter.length - 1)];
        this.bubble.say(line, this.sprite.x, this.feetY - BUBBLE_Y, time);
        this.nextChatterAt = time + 3200 + Phaser.Math.Between(9000, 17000);
      }
    }

    if (this.busy) return;

    if (!this.legs.length) {
      this.idle();
      return;
    }

    if (time < this.waitUntil) {
      this.sprite.setVelocity(0, 0);
      this.idle();
      return;
    }

    const path = this.legs[this.leg];
    const goal = path[this.step];
    const dx = goal.x - this.sprite.x;
    const dy = goal.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    // se encaja en el punto para no recortar la esquina siguiente contra un obstaculo
    if (dist < ARRIVE_EPS) this.sprite.setPosition(goal.x, goal.y);

    // esquina intermedia: se sigue sin pararse
    if (dist < ARRIVE_EPS && this.step < path.length - 1) {
      this.step++;
      return;
    }

    if (dist < ARRIVE_EPS) {
      this.sprite.setVelocity(0, 0);
      this.leg = (this.leg + 1) % this.legs.length;
      this.step = 0;
      this.waitUntil = time + Phaser.Math.Between(PAUSE_MIN, PAUSE_MAX);
      this.idle();
      return;
    }

    this.sprite.setVelocity((dx / dist) * NPC_SPEED, (dy / dist) * NPC_SPEED);
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else this.facing = dy > 0 ? 'down' : 'up';
    this.playMove(true);
  }

  private idle(): void {
    if (this.hasWorkAnim) {
      const key = `${this.texture}-work`;
      if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
      this.sprite.setFlipX(this.facing === 'left');
      return;
    }
    this.playMove(false);
  }

  private playMove(moving: boolean): void {
    const key = moveAnim(this.texture, this.facing, moving);
    this.sprite.setFlipX(this.facing === 'left');
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }
}
