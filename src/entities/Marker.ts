import Phaser from 'phaser';
import { emit } from '@/systems/bus';
import { DEPTH } from '@/config';
import { MARKER_ICONS } from '@/world/assets';

// mismos colores que styles.css
const PAPER = 0xffffff;
const INK = 0x121417;
const ACCENT = 0x1f6b45;
const FONT = "'Segoe UI', system-ui, sans-serif";

const OFFSET_Y = -40;
const ICON_SCALE = 1;
const ICON_SIZE = 16 * ICON_SCALE;
const FLOAT_OFFSET_Y = OFFSET_Y - (ICON_SIZE - 16) / 2 - 2;
const MIN_HIT_RADIUS = 17;
// 44 px de diametro en pantalla como minimo para el dedo
const MIN_SCREEN_RADIUS = 22;
const WAVE_STEP = 280;
const PULSE_MS = 1500;

export class Marker {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly glow: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Arc;
  private readonly badge: Phaser.GameObjects.Arc;
  private readonly mark: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  private readonly seen: Phaser.GameObjects.Graphics;
  private readonly reducedMotion: boolean;
  private readonly floating: boolean;
  private visited = false;
  private hop?: Phaser.Tweens.Tween;
  private readonly offsetY: number;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    feetY: number,
    index: number,
    total: number,
    reducedMotion: boolean,
  ) {
    this.scene = scene;
    this.reducedMotion = reducedMotion;

    // sin icono en MARKER_ICONS sale la chapa blanca con "!"
    const icon = MARKER_ICONS[id];
    this.floating = Boolean(icon);
    this.offsetY = icon ? FLOAT_OFFSET_Y : OFFSET_Y;
    this.glow = icon
      ? scene.add.ellipse(0, ICON_SIZE / 2 + 3, ICON_SIZE * 0.55, 3.5, 0x000000, 0.3)
      : scene.add.circle(0, 1.5, 11.5, 0x000000, 0.28);
    this.ring = scene.add.circle(0, 0, 13, 0x000000, 0).setStrokeStyle(2, PAPER, 0.95);
    this.badge = scene.add.circle(0, 0, 11, PAPER, 1).setStrokeStyle(1.5, INK, 0.9);
    if (icon) {
      this.ring.setVisible(false);
      this.badge.setVisible(false);
    }
    this.mark = icon
      ? scene.add.image(0, 0, icon[0], icon[1]).setScale(ICON_SCALE)
      : scene.add
          .text(0, 0, '!', { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#121417' })
          .setOrigin(0.5, 0.55);
    this.seen = scene.add.graphics().setVisible(false);
    const c = icon ? ICON_SIZE / 2 - 2 : 8.5;
    this.seen.fillStyle(ACCENT, 1).fillCircle(c, -c, 5).lineStyle(1.5, PAPER, 1).strokeCircle(c, -c, 5);
    this.seen.lineStyle(1.6, PAPER, 1).beginPath();
    this.seen.moveTo(c - 2.2, -c - 0.1).lineTo(c - 0.5, -c + 1.6).lineTo(c + 2.4, -c - 1.7).strokePath();

    this.container = scene.add.container(x, feetY + this.offsetY, [this.glow, this.ring, this.badge, this.mark, this.seen]);
    this.container.setDepth(DEPTH.night + 10);
    this.container.setSize(this.floating ? ICON_SIZE : 24, this.floating ? ICON_SIZE : 24);
    this.container.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, MIN_HIT_RADIUS),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true,
    });

    if (reducedMotion) {
      this.ring.setAlpha(0.6);
      return;
    }

    const cycle = Math.max(PULSE_MS + 600, total * WAVE_STEP);
    if (this.floating) {
      // saltito por turnos para que no salten todos a la vez
      scene.tweens.add({ targets: [this.mark, this.seen], y: { from: -1.5, to: 1.5 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: this.glow, scaleX: { from: 0.8, to: 1 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.hop = scene.tweens.add({
        targets: this.container,
        scale: { from: 1, to: 1.2 },
        duration: 260,
        yoyo: true,
        delay: index * WAVE_STEP + 800,
        repeatDelay: cycle,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
      return;
    }

    scene.tweens.add({
      targets: this.ring,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 1, to: 0 },
      duration: PULSE_MS,
      delay: index * WAVE_STEP,
      repeatDelay: cycle - PULSE_MS,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
    scene.tweens.add({
      targets: [this.badge, this.mark, this.seen],
      y: { from: -2, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  follow(x: number, feetY: number): void {
    this.container.setPosition(x, feetY + this.offsetY);
  }

  get top(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y - (this.floating ? ICON_SIZE / 2 + 6 : 18) };
  }

  fitHitArea(screenScale: number): void {
    const radius = Math.max(MIN_HIT_RADIUS, MIN_SCREEN_RADIUS / Math.max(screenScale, 0.01));
    const area = this.container.input?.hitArea as Phaser.Geom.Circle | undefined;
    if (area) area.radius = radius;
  }

  hover(on: boolean): void {
    const duration = this.reducedMotion ? 0 : 120;
    this.scene.tweens.add({ targets: this.container, scale: on ? 1.18 : 1, duration, ease: 'Sine.easeOut' });
  }

  attention(delay: number): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({
      targets: this.container,
      scale: { from: 1, to: 1.45 },
      duration: 220,
      delay,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  setVisited(): void {
    if (this.visited) return;
    this.visited = true;
    this.scene.tweens.killTweensOf(this.ring);
    this.hop?.stop();
    this.container.setScale(1);
    this.ring.setAlpha(0);
    this.badge.setStrokeStyle(2, ACCENT, 1);
    this.seen.setVisible(true);
  }
}

export class MarkerLabel {
  show(label: string, x: number, y: number): void {
    emit('marker:label', { text: label, x, y });
  }

  hide(): void {
    emit('marker:label', null);
  }
}
