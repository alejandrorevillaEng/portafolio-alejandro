// Nubes, viento, hojas y chaparrones de vez en cuando.

import Phaser from 'phaser';
import { DEPTH } from '@/config';

// px/s
const WIND = new Phaser.Math.Vector2(9, 2.5);

const CLEAR_MS: [number, number] = [70_000, 110_000];
const RAIN_MS: [number, number] = [28_000, 42_000];
// segundos en empezar o parar de llover
const RAMP_S = 4;

export class Weather {
  private readonly scene: Phaser.Scene;
  private readonly w: number;
  private readonly h: number;
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly drops: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly splashes: Phaser.GameObjects.Sprite[] = [];

  private raining = false;
  /** 0 despejado, 1 tormenta */
  private intensity = 0;
  private nextChange: number;
  private nextGust = 2000;
  private nextLeaf = 1500;
  private splashDebt = 0;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene;
    this.w = width;
    this.h = height;
    this.nextChange = Phaser.Math.Between(...CLEAR_MS) / 2;

    this.shade = scene.add.rectangle(0, 0, width, height, 0x1c2a3a, 1).setOrigin(0, 0).setAlpha(0);
    this.shade.setDepth(DEPTH.weather - 2);

    // escala entera para que no se deforme el pixel art
    for (let i = 0; i < 7; i++) {
      const cloud = scene.add.image(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        'clouds',
        i % 4,
      );
      cloud.setScale(Phaser.Math.Between(2, 3));
      cloud.setAlpha(0);
      cloud.setDepth(DEPTH.weather);
      cloud.setData('speed', Phaser.Math.FloatBetween(0.7, 1.3));
      cloud.setData('always', i < 3);
      this.clouds.push(cloud);
    }

    // empiezan antes del borde por el viento
    this.drops = scene.add.particles(0, -16, 'rainDrop', {
      x: { min: -120, max: width },
      speedY: { min: 230, max: 270 },
      speedX: { min: 55, max: 70 },
      lifespan: 2600,
      alpha: { min: 0.7, max: 1 },
      // la gota del pack es verdosa, se aclara
      tint: 0xd6ecff,
      scale: 2,
      frequency: 1000,
      quantity: 1,
      emitting: false,
    });
    this.drops.setDepth(DEPTH.weather + 1);
  }

  get isRaining(): boolean {
    return this.raining;
  }

  setRain(on: boolean, time = this.scene.time.now): void {
    this.raining = on;
    const [min, max] = on ? RAIN_MS : CLEAR_MS;
    this.nextChange = time + Phaser.Math.Between(min, max);
    if (on) this.drops.start();
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    if (time >= this.nextChange) this.setRain(!this.raining, time);

    const target = this.raining ? 1 : 0;
    this.intensity = Phaser.Math.Clamp(this.intensity + Math.sign(target - this.intensity) * (dt / RAMP_S), 0, 1);
    if (!this.raining && this.intensity === 0 && this.drops.emitting) this.drops.stop();
    this.drops.frequency = this.intensity > 0 ? Math.max(5, 30 / this.intensity) : 1000;
    this.drops.quantity = this.intensity > 0.6 ? 3 : 1;

    this.shade.setAlpha(this.intensity * 0.3);
    this.updateClouds(dt);
    this.updateSplashes(dt);
    this.updateGusts(time);
    this.updateLeaves(time);
  }

  private updateClouds(dt: number): void {
    const gust = 1 + this.intensity * 1.5;
    for (const cloud of this.clouds) {
      const speed = cloud.getData('speed') as number;
      cloud.x += WIND.x * speed * gust * dt;
      cloud.y += WIND.y * speed * gust * dt;
      const margin = cloud.displayWidth / 2;
      if (cloud.x - margin > this.w) cloud.x = -margin;
      if (cloud.y - margin > this.h) cloud.y = -margin;

      const always = cloud.getData('always') as boolean;
      const alpha = always ? 0.28 + this.intensity * 0.15 : this.intensity * 0.4;
      cloud.setAlpha(alpha);
    }
  }

  private updateSplashes(dt: number): void {
    this.splashDebt += this.intensity * 90 * dt;
    while (this.splashDebt >= 1) {
      this.splashDebt -= 1;
      const splash = this.splashes.find((s) => !s.visible) ?? this.newSplash();
      splash.setPosition(Phaser.Math.Between(0, this.w), Phaser.Math.Between(0, this.h));
      splash.setVisible(true).play('rain-impact');
    }
  }

  private newSplash(): Phaser.GameObjects.Sprite {
    const splash = this.scene.add.sprite(0, 0, 'rainImpact').setDepth(DEPTH.weather + 1).setTint(0xd6ecff);
    splash.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => splash.setVisible(false));
    this.splashes.push(splash);
    return splash;
  }

  private updateGusts(time: number): void {
    if (time < this.nextGust) return;
    const calm = 1 - this.intensity;
    this.nextGust = time + Phaser.Math.Between(700 + calm * 2300, 1500 + calm * 4500);

    const gust = this.scene.add.sprite(
      Phaser.Math.Between(0, this.w),
      Phaser.Math.Between(0, this.h),
      'wind',
    );
    gust.setDepth(DEPTH.weather + 2).setAlpha(0.85);
    gust.play('wind-gust');
    this.scene.tweens.add({
      targets: gust,
      x: gust.x + WIND.x * 4,
      y: gust.y + WIND.y * 4,
      duration: 1000,
    });
    gust.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => gust.destroy());
  }

  private updateLeaves(time: number): void {
    if (time < this.nextLeaf) return;
    this.nextLeaf = time + Phaser.Math.Between(1800, 4200) * (1 - this.intensity * 0.6);

    const leaf = this.scene.add.image(
      Phaser.Math.Between(-20, this.w * 0.8),
      Phaser.Math.Between(-10, this.h * 0.6),
      Math.random() < 0.7 ? 'leafOak' : 'leafBirch',
    );
    leaf.setDepth(DEPTH.overhead + 60).setAlpha(0);
    const life = Phaser.Math.Between(5000, 8000);
    const sway = Phaser.Math.Between(10, 22);
    const startX = leaf.x;
    this.scene.tweens.add({
      targets: leaf,
      y: leaf.y + Phaser.Math.Between(50, 90),
      angle: Phaser.Math.Between(-200, 200),
      duration: life,
      onUpdate: (tween) => {
        const t = tween.progress;
        leaf.x = startX + t * WIND.x * (life / 1000) * 2 + Math.sin(t * Math.PI * 4) * sway;
        leaf.setAlpha(Math.min(1, t * 6, (1 - t) * 4));
      },
      onComplete: () => leaf.destroy(),
    });
  }
}
