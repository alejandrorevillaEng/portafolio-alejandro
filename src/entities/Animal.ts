import Phaser from 'phaser';
import { DEPTH } from '@/config';
import type { AnimalSpawn } from '@/world/mapa';
import { FLYER_COLOURS } from '@/world/assets';
import type { Colisiones, Punto } from '@/world/colisiones';

type Facing = 'side' | 'up' | 'down';

// del centro del sprite (32x32) a las patas
const FEET = 8;
const INTENTOS = 30;

export class Animal {
  readonly kind: AnimalSpawn['kind'];
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bounds: Phaser.Geom.Rectangle;
  private readonly speed: number;
  private goal: Phaser.Math.Vector2;
  private waitUntil = 0;
  private readonly bobPhase: number;
  private bob = 0;
  private facing: Facing = 'side';
  private grazing = false;
  private readonly colisiones?: Colisiones;

  constructor(scene: Phaser.Scene, key: string, spawn: AnimalSpawn, colisiones?: Colisiones) {
    this.kind = spawn.kind;
    this.bounds = new Phaser.Geom.Rectangle(spawn.area.x, spawn.area.y, spawn.area.w, spawn.area.h);
    this.colisiones = colisiones;

    const start = this.freeSpot();
    this.sprite = scene.add.sprite(start.x, start.y, key);
    this.bobPhase = Math.random() * Math.PI * 2;
    this.speed = this.kind === 'flyer' ? 16 : this.kind === 'swimmer' ? 9 : 11;
    this.goal = this.freeSpot(start);

    if (this.kind === 'flyer') {
      const colours = FLYER_COLOURS[key];
      const anim = colours ? `${key}-fly-${Phaser.Math.Between(0, colours - 1)}` : `${key}-fly`;
      if (scene.anims.exists(anim)) this.sprite.play({ key: anim, startFrame: Phaser.Math.Between(0, 1) });
      this.sprite.setDepth(DEPTH.overhead - 1);
    } else {
      this.playState(false);
    }
  }

  // Un punto del area donde puede estar; si se da `from`, al que se llega en recto
  private freeSpot(from?: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    for (let i = 0; i < INTENTOS; i++) {
      const q = new Phaser.Math.Vector2(
        Phaser.Math.Between(this.bounds.left, this.bounds.right),
        Phaser.Math.Between(this.bounds.top, this.bounds.bottom),
      );
      if (!this.colisiones || this.kind === 'flyer') return q;
      const ok = this.puedeEstar();
      const b: Punto = [q.x, q.y + FEET];
      const a: Punto = from ? [from.x, from.y + FEET] : b;
      if (ok(b[0], b[1]) && this.colisiones.recto(a, b, ok)) return q;
    }
    // sin hueco a la vista: se queda donde esta
    return from?.clone() ?? new Phaser.Math.Vector2(this.bounds.centerX, this.bounds.centerY);
  }

  private puedeEstar(): (x: number, y: number) => boolean {
    const c = this.colisiones!;
    return this.kind === 'swimmer' ? (x, y) => c.nadable(x, y) : (x, y) => c.libre(x, y);
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
      this.goal = this.freeSpot(this.goal);
      this.waitUntil = this.kind === 'flyer' ? 0 : time + Phaser.Math.Between(1500, 5000);
      this.grazing = this.facing === 'side' && Math.random() < 0.6;
      return;
    }

    const step = (this.speed * delta) / 1000;
    s.x += (dx / dist) * step;
    s.y += (dy / dist) * step;
    // vaiven sin acumular: se suma solo lo que cambia el seno desde el fotograma anterior
    if (this.kind !== 'walker') {
      const bob = this.kind === 'flyer' ? Math.sin(time / 260 + this.bobPhase) * 3 : Math.sin(time / 900 + this.bobPhase);
      s.y += bob - this.bob;
      this.bob = bob;
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
