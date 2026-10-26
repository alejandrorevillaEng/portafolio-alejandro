// Por donde se puede andar y nadar, sacado de los pixeles del propio mapa.
// Rejilla de CELDA px: en las capas `objetos` es solido lo que tiene pintura; en
// `terreno` el agua (por color) y la pared de roca; el puente vuelve a ser suelo.
// Las capas `encima` (tejados, copas) no estorban: por debajo se pasa.

import Phaser from 'phaser';
import { WORLD_H, WORLD_W } from '@/config';
import { isOverhead } from './mapa';

export type Punto = [number, number];

const CELDA = 4;
const COLS = WORLD_W / CELDA;
const FILAS = WORLD_H / CELDA;

// fraccion de pixeles de una celda a partir de la cual cuenta
const OPACO = 0.3;
const AGUA = 0.5;

const PUENTE = new Set(['puente', 'puente-2']);
const EN_EL_AGUA = new Set(['barca', 'roca-agua', 'cascada', 'juncos', 'juncos-2']);

interface Muestra {
  opaco: number;
  azul: number;
}

export class Colisiones {
  // 1 = no se pisa (ya engordado con el margen del cuerpo)
  private readonly bloqueado: Uint8Array;
  // 1 = agua abierta, lejos de la orilla
  private readonly agua: Uint8Array;
  private readonly pixeles = new Map<string, ImageData>();

  constructor(map: Phaser.Tilemaps.Tilemap) {
    const solido = new Uint8Array(COLS * FILAS);
    const agua = new Uint8Array(COLS * FILAS);

    for (const layer of map.layers) {
      if (isOverhead(layer)) continue;
      const capa = layer.name;
      if (capa === 'suelo' || capa === 'bordes') continue;
      const objetos = capa.startsWith('objetos');

      for (const row of layer.data) {
        for (const tile of row) {
          if (!tile || tile.index < 0 || !tile.tileset) continue;
          const hoja = tile.tileset.name;
          if (capa === 'detalle' && !PUENTE.has(hoja) && !EN_EL_AGUA.has(hoja) && hoja !== 'agua') continue;

          this.muestrear(tile, (cx, cy, m) => {
            const i = cy * COLS + cx;
            if (objetos) {
              if (m.opaco > OPACO) {
                solido[i] = 1;
                agua[i] = 0;
              }
            } else if (PUENTE.has(hoja)) {
              if (m.opaco > OPACO) {
                solido[i] = 0;
                agua[i] = 0;
              }
            } else if (EN_EL_AGUA.has(hoja) || hoja === 'acantilado') {
              if (m.opaco > OPACO) {
                solido[i] = 1;
                agua[i] = 0;
              }
            } else if (m.azul > AGUA) {
              solido[i] = 1;
              agua[i] = 1;
            }
          });
        }
      }
    }

    // el punto que se mira son los pies: se engorda lo solido medio cuerpo
    this.bloqueado = engordar(solido, 1);
    // y el agua se encoge para que patos y cisnes no monten la orilla
    this.agua = encoger(agua, 2);
  }

  /** Se puede pisar en (x, y) de mundo. */
  libre(x: number, y: number): boolean {
    const i = indice(x, y);
    return i >= 0 && this.bloqueado[i] === 0;
  }

  /** Agua abierta en (x, y) de mundo. */
  nadable(x: number, y: number): boolean {
    const i = indice(x, y);
    return i >= 0 && this.agua[i] === 1;
  }

  /** Linea recta sin obstaculos segun `ok`. */
  recto(a: Punto, b: Punto, ok: (x: number, y: number) => boolean): boolean {
    const pasos = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
    for (let s = 0; s <= pasos; s++) {
      const t = pasos === 0 ? 0 : s / pasos;
      if (!ok(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
    }
    return true;
  }

  /** El sitio pisable mas cercano a (x, y). */
  cercano(p: Punto): Punto {
    const inicio = indice(p[0], p[1]);
    if (inicio >= 0 && this.bloqueado[inicio] === 0) return p;
    const visto = new Uint8Array(COLS * FILAS);
    const cola = [Math.max(0, inicio)];
    visto[cola[0]] = 1;
    for (let k = 0; k < cola.length; k++) {
      const i = cola[k];
      if (this.bloqueado[i] === 0) return centro(i);
      for (const j of vecinos4(i)) {
        if (!visto[j]) {
          visto[j] = 1;
          cola.push(j);
        }
      }
    }
    return p;
  }

  /** Camino a pie de `desde` a `hasta` (pies), sin el punto de salida. */
  camino(desde: Punto, hasta: Punto): Punto[] {
    const a = this.cercano(desde);
    const b = this.cercano(hasta);
    if (this.recto(a, b, (x, y) => this.libre(x, y))) return [b];

    const celdas = this.aEstrella(indice(a[0], a[1]), indice(b[0], b[1]));
    if (!celdas) return [b];

    // tirar del hilo: de cada punto se salta al mas lejano que se ve en recto
    const puntos = [a, ...celdas.slice(1, -1).map(centro), b];
    const out: Punto[] = [];
    let k = 0;
    while (k < puntos.length - 1) {
      let lejos = k + 1;
      for (let j = puntos.length - 1; j > k + 1; j--) {
        if (this.recto(puntos[k], puntos[j], (x, y) => this.libre(x, y))) {
          lejos = j;
          break;
        }
      }
      out.push(puntos[lejos]);
      k = lejos;
    }
    return out;
  }

  /** Pinta la rejilla encima del mapa (solo para depurar: ?colisiones). */
  dibujar(scene: Phaser.Scene, depth: number): void {
    const g = scene.add.graphics().setDepth(depth);
    for (let i = 0; i < COLS * FILAS; i++) {
      const x = (i % COLS) * CELDA;
      const y = Math.floor(i / COLS) * CELDA;
      if (this.agua[i]) g.fillStyle(0x00aaff, 0.35).fillRect(x, y, CELDA, CELDA);
      else if (this.bloqueado[i]) g.fillStyle(0xff0040, 0.35).fillRect(x, y, CELDA, CELDA);
    }
  }

  private aEstrella(inicio: number, fin: number): number[] | null {
    const total = COLS * FILAS;
    const g = new Float32Array(total).fill(Infinity);
    const de = new Int32Array(total).fill(-1);
    const cerrado = new Uint8Array(total);
    const abierto = new Monticulo();
    const h = (i: number): number => {
      const dx = Math.abs((i % COLS) - (fin % COLS));
      const dy = Math.abs(Math.floor(i / COLS) - Math.floor(fin / COLS));
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };

    g[inicio] = 0;
    abierto.meter(inicio, h(inicio));
    while (abierto.size) {
      const i = abierto.sacar();
      if (i === fin) {
        const camino = [i];
        for (let k = de[i]; k >= 0; k = de[k]) camino.push(k);
        return camino.reverse();
      }
      if (cerrado[i]) continue;
      cerrado[i] = 1;

      const x = i % COLS;
      const y = Math.floor(i / COLS);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= FILAS) continue;
          const j = ny * COLS + nx;
          if (this.bloqueado[j] || cerrado[j]) continue;
          // sin cortar esquinas
          if (dx && dy && (this.bloqueado[y * COLS + nx] || this.bloqueado[ny * COLS + x])) continue;
          const coste = g[i] + (dx && dy ? Math.SQRT2 : 1);
          if (coste < g[j]) {
            g[j] = coste;
            de[j] = i;
            abierto.meter(j, coste + h(j));
          }
        }
      }
    }
    return null;
  }

  // Recorre las celdas de un tile y cuenta cuanto hay pintado y cuanto es agua
  private muestrear(tile: Phaser.Tilemaps.Tile, fn: (cx: number, cy: number, m: Muestra) => void): void {
    const ts = tile.tileset!;
    const img = this.imagen(ts);
    if (!img) return;
    const coords = ts.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
    if (!coords) return;

    const lado = ts.tileWidth / CELDA;
    const n = CELDA * CELDA;
    for (let sy = 0; sy < lado; sy++) {
      for (let sx = 0; sx < lado; sx++) {
        const cx = (tile.pixelX / CELDA) + sx;
        const cy = (tile.pixelY / CELDA) + sy;
        if (cx >= COLS || cy >= FILAS) continue;
        const ox = tile.flipX ? lado - 1 - sx : sx;
        const oy = tile.flipY ? lado - 1 - sy : sy;
        let opaco = 0;
        let azul = 0;
        for (let py = 0; py < CELDA; py++) {
          for (let px = 0; px < CELDA; px++) {
            const ix = coords.x + ox * CELDA + px;
            const iy = coords.y + oy * CELDA + py;
            const k = (iy * img.width + ix) * 4;
            const [r, gr, b, a] = [img.data[k], img.data[k + 1], img.data[k + 2], img.data[k + 3]];
            if (a < 128) continue;
            opaco++;
            if (b > r + 40 && b >= gr) azul++;
          }
        }
        fn(cx, cy, { opaco: opaco / n, azul: azul / n });
      }
    }
  }

  private imagen(ts: Phaser.Tilemaps.Tileset): ImageData | null {
    const cache = this.pixeles.get(ts.name);
    if (cache) return cache;
    const src = ts.image?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!src) return null;
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0);
    const data = ctx.getImageData(0, 0, src.width, src.height);
    this.pixeles.set(ts.name, data);
    return data;
  }
}

function indice(x: number, y: number): number {
  const cx = Math.floor(x / CELDA);
  const cy = Math.floor(y / CELDA);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= FILAS) return -1;
  return cy * COLS + cx;
}

function centro(i: number): Punto {
  return [(i % COLS) * CELDA + CELDA / 2, Math.floor(i / COLS) * CELDA + CELDA / 2];
}

function vecinos4(i: number): number[] {
  const x = i % COLS;
  const y = Math.floor(i / COLS);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < COLS - 1) out.push(i + 1);
  if (y > 0) out.push(i - COLS);
  if (y < FILAS - 1) out.push(i + COLS);
  return out;
}

function engordar(src: Uint8Array, r: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) {
    if (!src[i]) continue;
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < COLS && ny < FILAS) out[ny * COLS + nx] = 1;
      }
    }
  }
  return out;
}

function encoger(src: Uint8Array, r: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) {
    if (!src[i]) continue;
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    let dentro = true;
    for (let dy = -r; dy <= r && dentro; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= FILAS || !src[ny * COLS + nx]) {
          dentro = false;
          break;
        }
      }
    }
    out[i] = dentro ? 1 : 0;
  }
  return out;
}

// cola de prioridad minima para el A*
class Monticulo {
  private readonly ids: number[] = [];
  private readonly pesos: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  meter(id: number, peso: number): void {
    this.ids.push(id);
    this.pesos.push(peso);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.pesos[p] <= this.pesos[i]) break;
      this.cambiar(i, p);
      i = p;
    }
  }

  sacar(): number {
    const top = this.ids[0];
    const ultimo = this.ids.length - 1;
    this.cambiar(0, ultimo);
    this.ids.pop();
    this.pesos.pop();
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < this.ids.length && this.pesos[l] < this.pesos[m]) m = l;
      if (r < this.ids.length && this.pesos[r] < this.pesos[m]) m = r;
      if (m === i) break;
      this.cambiar(i, m);
      i = m;
    }
    return top;
  }

  private cambiar(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.pesos[a], this.pesos[b]] = [this.pesos[b], this.pesos[a]];
  }
}
