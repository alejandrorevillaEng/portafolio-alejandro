// Genera mapa/tilesets/*.tsx desde tools/mapa/catalogo.mjs y copia sus PNG a mapa/img.
// No reordenar ni borrar tilesets ya usados en el mapa: solo anadir al final.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESQUINAS, TILESETS } from './mapa/catalogo.mjs';
import { emptyCells } from './mapa/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '..');
const pack = resolve(project, '..');
const imgDir = join(project, 'mapa', 'img');
const tsxDir = join(project, 'mapa', 'tilesets');
mkdirSync(imgDir, { recursive: true });
mkdirSync(tsxDir, { recursive: true });

const TILE = 16;

for (const ts of TILESETS) {
  const to = join(imgDir, `${ts.name}.png`);
  copyFileSync(join(pack, ts.src), to);

  const { cols, rows, width, height } = emptyCells(to, TILE);
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<tileset version="1.10" tiledversion="1.12.2" name="${ts.name}" tilewidth="${TILE}" tileheight="${TILE}" tilecount="${cols * rows}" columns="${cols}">`,
  );
  lines.push(` <image source="../img/${ts.name}.png" width="${width}" height="${height}"/>`);

  if (ts.anim) {
    const porDibujo = ts.anim.ancho / TILE;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < porDibujo; c++) {
        const id = r * cols + c;
        lines.push(` <tile id="${id}">`);
        lines.push('  <animation>');
        for (let f = 0; f < ts.anim.frames; f++) {
          lines.push(`   <frame tileid="${r * cols + f * porDibujo + c}" duration="${ts.anim.ms}"/>`);
        }
        lines.push('  </animation>');
        lines.push(' </tile>');
      }
    }
  }

  if (ts.wang) {
    lines.push(' <wangsets>');
    for (const w of ts.wang) {
      const centro = (w.y + 1) * cols + (w.x + 1);
      lines.push(`  <wangset name="${w.name}" type="corner" tile="${centro}">`);
      lines.push(`   <wangcolor name="${w.name}" color="${w.color}" tile="${centro}" probability="1"/>`);
      for (const [clave, [tl, tr, br, bl]] of Object.entries(ESQUINAS)) {
        const [dc, dr] = clave.split(',').map(Number);
        const id = (w.y + dr) * cols + (w.x + dc);
        lines.push(`   <wangtile tileid="${id}" wangid="0,${tr},0,${br},0,${bl},0,${tl}"/>`);
      }
      lines.push('  </wangset>');
    }
    lines.push(' </wangsets>');
  }

  lines.push('</tileset>');
  writeFileSync(join(tsxDir, `${ts.name}.tsx`), `${lines.join('\n')}\n`);
}

console.log(`${TILESETS.length} tilesets escritos en mapa/tilesets/.`);
