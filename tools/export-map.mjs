// mapa/aldea.tmx -> public/mapa/aldea.json con el tiled.exe (o la ruta en TILED).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '..');
const source = join(project, 'mapa', 'aldea.tmx');
const outDir = join(project, 'public', 'mapa');
const out = join(outDir, 'aldea.json');

const candidates = [
  process.env.TILED,
  'C:\\Program Files\\Tiled\\tiled.exe',
  'C:\\Program Files (x86)\\Tiled\\tiled.exe',
  '/Applications/Tiled.app/Contents/MacOS/Tiled',
  '/usr/bin/tiled',
].filter(Boolean);
const tiled = candidates.find((p) => existsSync(p));
if (!tiled) {
  console.error('No encuentro Tiled. Instalalo (mapeditor.org) o pon su ruta en la variable TILED.');
  process.exit(1);
}

mkdirSync(join(outDir, 'img'), { recursive: true });

// Se exporta fuera de public/: el temporal de Tiled tumbaba el watcher de Vite (EBUSY).
const tmp = mkdtempSync(join(tmpdir(), 'aldea-'));
const exported = join(tmp, 'aldea.json');

execFileSync(tiled, [
  '--project',
  join(project, 'mapa', 'aldea.tiled-project'),
  '--export-map',
  'json',
  '--embed-tilesets',
  '--resolve-types-and-properties',
  source,
  exported,
]);

const map = JSON.parse(readFileSync(exported, 'utf8'));
rmSync(tmp, { recursive: true, force: true });

const usados = new Set();
for (const layer of map.layers) if (layer.type === 'tilelayer') for (const g of layer.data) if (g) usados.add(g & 0x1fffffff);
const enUso = (ts) => [...usados].some((g) => g >= ts.firstgid && g < ts.firstgid + ts.tilecount);

const total = map.tilesets.length;
map.tilesets = map.tilesets.filter(enUso);
for (const ts of map.tilesets) {
  const file = basename(ts.image);
  copyFileSync(join(project, 'mapa', 'img', file), join(outDir, 'img', file));
  ts.image = `img/${file}`;
}
const copiados = map.tilesets.length;

const vigentes = new Set(map.tilesets.map((ts) => basename(ts.image)));
for (const file of readdirSync(join(outDir, 'img'))) if (!vigentes.has(file)) rmSync(join(outDir, 'img', file));

const content = JSON.parse(readFileSync(join(project, 'src', 'content', 'es.json'), 'utf8'));
const avisos = [];
for (const layer of map.layers) {
  if (layer.type !== 'objectgroup') continue;
  for (const o of layer.objects) {
    if (o.type === 'vecino' && !content.npcs[o.name]) avisos.push(`vecino "${o.name}" no esta en content/es.json (npcs)`);
    if (o.type === 'cartel' && !content.signs[o.name]) avisos.push(`cartel "${o.name}" no esta en content/es.json (signs)`);
  }
}

writeFileSync(out, JSON.stringify(map));
console.log(`Mapa ${map.width}x${map.height} exportado a public/mapa/aldea.json (${copiados} de ${total} tilesets en uso).`);
if (avisos.length) {
  for (const a of avisos) console.warn(`  aviso: ${a}`);
  process.exitCode = 1;
}
