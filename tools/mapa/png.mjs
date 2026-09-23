/**
 * Lector minimo de PNG (sin dependencias). Solo hace falta para saber que
 * celdas de 16x16 de una hoja estan vacias, y asi no estampar huecos
 * transparentes encima de lo que ya hay pintado.
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export function readPng(path) {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 8;
  let colorType = 6;
  let palette = null;
  let trns = null;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error(`${path}: PNG entrelazado, no soportado`);
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bpp = Math.max(1, (channels * depth) >> 3);
  const stride = Math.ceil((width * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[i] = v & 0xff;
    }
    prev = out;
  }

  /** Alfa del pixel (x, y), 0-255. */
  function alpha(x, y) {
    const row = y * stride;
    if (colorType === 6) return pixels[row + x * 4 * (depth / 8) + 3 * (depth / 8)];
    if (colorType === 4) return pixels[row + x * 2 * (depth / 8) + (depth / 8)];
    if (colorType === 3) {
      const bit = x * depth;
      const idx = (pixels[row + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
      return trns && idx < trns.length ? trns[idx] : 255;
    }
    return 255;
  }

  /** Color del pixel (x, y) como [r, g, b, a]. Solo profundidad de 8 bits (o paleta). */
  function rgba(x, y) {
    const row = y * stride;
    if (colorType === 6) return [...pixels.subarray(row + x * 4, row + x * 4 + 4)];
    if (colorType === 2) return [...pixels.subarray(row + x * 3, row + x * 3 + 3), 255];
    if (colorType === 4) return [pixels[row + x * 2], pixels[row + x * 2], pixels[row + x * 2], pixels[row + x * 2 + 1]];
    if (colorType === 0) return [pixels[row + x], pixels[row + x], pixels[row + x], 255];
    const bit = x * depth;
    const idx = (pixels[row + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    return [palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2], trns && idx < trns.length ? trns[idx] : 255];
  }

  return { width, height, alpha, rgba, palette };
}

/** Mapa de celdas vacias de una hoja: vacia[fila][columna] = true si es transparente del todo. */
export function emptyCells(path, tile = 16) {
  const png = readPng(path);
  const cols = Math.floor(png.width / tile);
  const rows = Math.floor(png.height / tile);
  const empty = [];
  for (let r = 0; r < rows; r++) {
    empty[r] = [];
    for (let c = 0; c < cols; c++) {
      let blank = true;
      for (let y = 0; y < tile && blank; y++) {
        for (let x = 0; x < tile; x++) {
          if (png.alpha(c * tile + x, r * tile + y) > 8) {
            blank = false;
            break;
          }
        }
      }
      empty[r][c] = blank;
    }
  }
  return { cols, rows, empty, width: png.width, height: png.height };
}
