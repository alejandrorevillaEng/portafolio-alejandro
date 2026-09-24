import Phaser from 'phaser';
import { DEPTH, WORLD_H, WORLD_W } from '@/config';
import { registerAnimations } from '@/world/animations';
import { AnimatedTiles } from '@/world/animatedTiles';
import { Weather } from '@/world/weather';
import {
  MAP_KEY,
  isOverhead,
  readAldea,
  tilesetKey,
  type Aldea,
  type AnimalSpawn,
  type NpcSpawn,
  type SignSpawn,
} from '@/world/mapa';
import { Npc } from '@/entities/Npc';
import { Animal } from '@/entities/Animal';
import { Marker, MarkerLabel } from '@/entities/Marker';
import { emit, on } from '@/systems/bus';
import { prefersReducedMotion } from '@/systems/motion';
import { panel, sectionNumber, speaker } from '@/content';

interface Interactable {
  id: string;
  npc?: Npc;
  marker: Marker;
}

// ms
const DAY_CYCLE = 240_000;

export class WorldScene extends Phaser.Scene {
  private npcs: Npc[] = [];
  private animals: Animal[] = [];
  private interactables: Interactable[] = [];
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  weather!: Weather;
  private animatedTiles?: AnimatedTiles;
  private talkingWith: Npc | null = null;
  private markerLabel!: MarkerLabel;
  private journalKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('world');
  }

  create(): void {
    registerAnimations(this);

    const aldea = this.buildMap();
    this.buildSmoke(aldea.smoke);
    this.buildLights(aldea.lights);

    this.markerLabel = new MarkerLabel();
    this.buildMarkers(aldea.npcs, aldea.signs);
    this.buildAnimals(aldea.animals);
    this.buildAmbience();

    this.cameras.main.setRoundPixels(true);
    this.applyZoom();
    this.fitMarkers();
    this.scale.on('resize', () => {
      this.applyZoom();
      this.fitMarkers();
    });

    this.journalKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    on('dialogue:closed', () => {
      this.talkingWith?.resume(this.time.now);
      this.talkingWith = null;
    });
    on('journal:visited', ({ id }) => this.interactables.find((i) => i.id === id)?.marker.setVisited());
    on('onboarding:done', () => this.interactables.forEach((item, i) => item.marker.attention(i * 90)));

    emit('world:ready', undefined);
  }

  // --- Mapa de Tiled ---

  private buildMap(): Aldea {
    const map = this.make.tilemap({ key: MAP_KEY });
    const tilesets = map.tilesets.map((ts) => {
      const tileset = map.addTilesetImage(ts.name, tilesetKey(ts.name));
      if (!tileset) throw new Error(`No se pudo cargar el tileset "${ts.name}"`);
      return tileset;
    });

    const layers: Phaser.Tilemaps.TilemapLayer[] = [];
    let below = 0;
    let above = 0;
    for (const data of map.layers) {
      const layer = map.createLayer(data.name, tilesets);
      if (!layer) continue;
      layer.setDepth(isOverhead(data) ? DEPTH.overhead + above++ : Math.min(below++, DEPTH.entities - 1));
      layers.push(layer);
    }

    this.animatedTiles = new AnimatedTiles(map, layers);
    return readAldea(map);
  }

  private buildSmoke(points: Array<[number, number]>): void {
    for (const [x, y] of points) {
      // origen en el pie de la columna de humo
      const bocanada = this.add.sprite(x, y, 'chimneySmoke').setOrigin(0.19, 0.66);
      bocanada.play({ key: 'chimney-smoke', startFrame: Phaser.Math.Between(0, 4) });
      bocanada.setDepth(DEPTH.overhead + 51);
    }
  }

  private buildLights(points: Array<[number, number]>): void {
    if (!this.textures.exists('halo')) {
      const size = 64;
      const canvas = this.textures.createCanvas('halo', size, size);
      const ctx = canvas?.getContext();
      if (canvas && ctx) {
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255, 196, 110, 0.9)');
        g.addColorStop(0.35, 'rgba(255, 170, 80, 0.35)');
        g.addColorStop(1, 'rgba(255, 150, 60, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        canvas.refresh();
      }
    }

    for (const [x, y] of points) {
      const glow = this.add.image(x, y, 'halo');
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(DEPTH.night + 1);
      glow.setAlpha(0);
      this.glows.push(glow);
    }
  }

  // --- Habitantes e interaccion ---

  private buildMarkers(npcs: NpcSpawn[], signs: SignSpawn[]): void {
    const reduced = prefersReducedMotion();
    const total = npcs.length + signs.length;
    let index = 0;

    for (const spawn of npcs) {
      const npc = new Npc(this, spawn);
      this.npcs.push(npc);
      const marker = new Marker(this, spawn.id, npc.sprite.x, npc.feetY, index++, total, reduced);
      this.bindMarker(marker, spawn.id);
      this.interactables.push({ id: spawn.id, npc, marker });
    }

    for (const sign of signs) {
      const marker = new Marker(this, sign.id, sign.x, sign.y, index++, total, reduced);
      this.bindMarker(marker, sign.id);
      this.interactables.push({ id: sign.id, marker });
    }
  }

  private bindMarker(marker: Marker, id: string): void {
    marker.container.on('pointerover', () => {
      marker.hover(true);
      // "01 · Katy · Sobre mi"
      const who = speaker(id);
      const title = who ? panel(who.panel)?.title : undefined;
      const { x, y } = marker.top;
      this.markerLabel.show([sectionNumber(id), who?.name, title].filter(Boolean).join(' · '), x, y);
    });
    marker.container.on('pointerout', () => {
      marker.hover(false);
      this.markerLabel.hide();
    });
    marker.container.on('pointerdown', () => this.openInteractable(id));
  }

  private fitMarkers(): void {
    const screenScale = this.scale.displaySize.width / this.scale.gameSize.width;
    for (const item of this.interactables) item.marker.fitHitArea(screenScale);
  }

  private openInteractable(id: string): void {
    const item = this.interactables.find((i) => i.id === id);
    if (!item) return;

    this.talkingWith?.resume(this.time.now);
    item.npc?.pause();
    this.talkingWith = item.npc ?? null;

    this.markerLabel.hide();
    emit('dialogue:open', { id });
  }

  private buildAnimals(spawns: AnimalSpawn[]): void {
    for (const spawn of spawns) {
      for (let i = 0; i < spawn.count; i++) {
        this.animals.push(new Animal(this, spawn.key, spawn));
      }
    }
  }

  private buildAmbience(): void {
    // relleno a 1 y alpha en el objeto; con relleno 0 setAlpha no hace nada
    this.nightOverlay = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x0a1030, 1).setAlpha(0);
    this.nightOverlay.setOrigin(0, 0);
    this.nightOverlay.setDepth(DEPTH.night);

    this.weather = new Weather(this, WORLD_W, WORLD_H);
  }

  // camara 1:1; el escalado lo hace el CSS
  private applyZoom(): void {
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);
  }

  // --- Bucle ---

  override update(time: number, delta: number): void {
    this.animatedTiles?.update(time);
    for (const npc of this.npcs) npc.update(time);
    for (const animal of this.animals) animal.update(time, delta);

    for (const item of this.interactables) {
      if (item.npc) item.marker.follow(item.npc.sprite.x, item.npc.feetY);
    }

    this.updateAmbience(time, delta);

    if (this.journalKey && Phaser.Input.Keyboard.JustDown(this.journalKey)) emit('journal:toggle', undefined);
  }

  private updateAmbience(time: number, delta: number): void {
    const phase = (time % DAY_CYCLE) / DAY_CYCLE;
    const darkness = Math.max(0, Math.sin((phase - 0.25) * Math.PI * 2)) * 0.5;
    this.nightOverlay.setAlpha(darkness);
    for (const glow of this.glows) glow.setAlpha(Math.min(1, darkness * 1.4));

    this.weather.update(time, delta);
  }
}
