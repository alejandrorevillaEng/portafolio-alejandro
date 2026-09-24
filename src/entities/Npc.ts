import Phaser from 'phaser';
import { DEPTH, NPC_SPEED } from '@/config';
import { speaker } from '@/content';
import { moveAnim } from '@/world/animations';
import type { Facing, NpcSpawn } from '@/world/mapa';
import { SpeechBubble } from './SpeechBubble';

export type { Facing };

const BODY = { w: 12, h: 8, offsetX: 26, offsetY: 46 };

// del centro del sprite a los pies
const FEET = BODY.offsetY - 32 + BODY.h;

const PAUSE_MIN = 2200;
const PAUSE_MAX = 5200;
const ARRIVE_EPS = 3;

export class Npc {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly texture: string;

  private readonly route: Phaser.Math.Vector2[];
  private target = 0;
  private waitUntil = 0;
  private facing: Facing;
  private busy = false;
  private readonly hasWorkAnim: boolean;
  private readonly bubble: SpeechBubble;
  private nextChatterAt: number;

  constructor(scene: Phaser.Scene, spawn: NpcSpawn) {
    this.id = spawn.id;
    this.texture = spawn.sprite;
    this.facing = spawn.facing ?? 'down';

    const x = spawn.home[0];
    const y = spawn.home[1] - FEET;
    this.sprite = scene.physics.add.sprite(x, y, spawn.sprite);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY.w, BODY.h);
    body.setOffset(BODY.offsetX, BODY.offsetY);
    body.setImmovable(true);

    this.route = (spawn.route ?? []).map(([rx, ry]) => new Phaser.Math.Vector2(rx, ry - FEET));
    this.hasWorkAnim = scene.anims.exists(`${spawn.sprite}-work`);

    this.bubble = new SpeechBubble(spawn.id);
    this.nextChatterAt = 3000 + Math.random() * 9000;

    this.idle();
  }

  get feetY(): number {
    return this.sprite.y + FEET;
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
    this.bubble.update(time, this.sprite.x, this.feetY - 38);

    // se lee cada vez para que siga el cambio de idioma
    const chatter = speaker(this.id)?.chatter ?? [];
    if (!this.busy && chatter.length && time >= this.nextChatterAt) {
      if (!SpeechBubble.canSpeak()) {
        this.nextChatterAt = time + Phaser.Math.Between(1500, 4000);
      } else {
        const line = chatter[Phaser.Math.Between(0, chatter.length - 1)];
        this.bubble.say(line, this.sprite.x, this.feetY - 38, time);
        this.nextChatterAt = time + 3200 + Phaser.Math.Between(9000, 17000);
      }
    }

    if (this.busy) return;

    if (this.route.length < 2) {
      this.idle();
      return;
    }

    if (time < this.waitUntil) {
      this.sprite.setVelocity(0, 0);
      this.idle();
      return;
    }

    const goal = this.route[this.target];
    const dx = goal.x - this.sprite.x;
    const dy = goal.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist < ARRIVE_EPS) {
      this.sprite.setVelocity(0, 0);
      this.target = (this.target + 1) % this.route.length;
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
