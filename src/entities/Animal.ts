import Phaser from 'phaser';
import { DEPTH } from '@/config';
import type { AnimalSpawn } from '@/world/mapa';

type Facing = 'side' | 'up' | 'down';

export class Animal {
  readonly kind: AnimalSpawn['kind'];
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bounds: Phaser.Geom.Rectangle;
  private readonly speed: number;
  private goal: Phaser.Math.Vector2;
  private waitUntil = 0;
  private readonly bobPhase: number;
  private facing: Facing = 'side';
  private grazing = false;

  constructor(scene: Phaser.Scene, key: string, spawn: AnimalSpawn) {
    this.kind = spawn.kind;
    this.bounds = new Phaser.Geom.Rectangle(spawn.area.x, spawn.area.y, spawn.area.w, spawn.area.h);

    const start = this.freeSpot();
    this.sprite = scene.add.sprite(start.x, start.y, key);
    this.bobPhase = Math.random() * Math.PI * 2;
    this.speed = this.kind === 'flyer' ? 16 : this.kind === 'swimmer' ? 9 : 11;
    this.goal = this.freeSpot();

    if (this.kind === 'flyer') {
      if (scene.anims.exists(`${key}-fly`)) this.sprite.play(`${key}-fly`);
      this.sprite.setDepth(DEPTH.overhead - 1);
    } else {
      this.playState(false);
    }
  }

  private freeSpot(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Between(this.bounds.left, this.bounds.right),
      Phaser.Math.Between(this.bounds.top, this.bounds.bottom),
    );
  }

  update(time: number, delta: number): void {
    const s = this.sprite;

    // depth por los pies; el termino en x evita que dos a la misma altura parpadeen
    if (this.kind !== 'flyer') {
      s.setDepth(DEPTH.entities + s.y + s.displayHeight / 2 + s.x * 0.001);
    }

    if (time < this.waitUntil) {
      this.playState(false);
      return;
    }

    const dx = this.goal.x - s.x;
    const dy = this.goal.y - s.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) {
      this.goal = this.freeSpot();
      this.waitUntil = this.kind === 'flyer' ? 0 : time + Phaser.Math.Between(1500, 5000);
      this.grazing = this.facing === 'side' && Math.random() < 0.6;
      return;
    }

    const step = (this.speed * delta) / 1000;
    s.x += (dx / dist) * step;
    s.y += (dy / dist) * step;
    if (this.kind === 'flyer') {
      s.y += Math.sin(time / 260 + this.bobPhase) * 0.25;
    } else if (this.kind === 'swimmer') {
      s.y += Math.sin(time / 900 + this.bobPhase) * 0.12;
    }

    // los sprites del pack miran a la izquierda
    if (this.kind !== 'walker' || Math.abs(dx) >= Math.abs(dy)) {
      this.facing = 'side';
      s.setFlipX(dx > 0);
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }
    this.playState(true);
  }

  private playState(moving: boolean): void {
    if (this.kind === 'flyer') return;
    const tex = this.sprite.texture.key;
    const anims = this.sprite.scene.anims;

    let key: string;
    if (this.kind === 'swimmer') {
      key = `${tex}-${moving ? 'swim-move' : 'swim'}`;
    } else if (!moving && this.grazing && anims.exists(`${tex}-graze`)) {
      key = `${tex}-graze`;
    } else {
      const base = `${tex}-${moving ? 'walk' : 'idle'}`;
      const directional = `${base}-${this.facing}`;
      key = this.facing !== 'side' && anims.exists(directional) ? directional : base;
    }

    if (this.sprite.anims.currentAnim?.key !== key && anims.exists(key)) this.sprite.play(key, true);
  }
}
