// Copia a public/assets solo los PNG del pack que declara src/world/assets.ts.
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const packRoot = resolve(projectRoot, '..');
const outRoot = join(projectRoot, 'public', 'assets');

const FOLDERS = {
  tiles: 'Tiles',
  buildings: 'Buildings',
  trees: 'Trees',
  crops: 'Crops',
  icons: 'Icons',
  other: 'Other',
  player: 'Player',
  animals: 'Animals',
  outdoor: 'Outdoor decoration',
  npcs: 'NPCs (Premade)',
  weather: 'Weather effects',
};

async function declaredPaths() {
  const source = await readFile(join(projectRoot, 'src', 'world', 'assets.ts'), 'utf8');
  const matches = [...source.matchAll(/path: `\$\{A\}([^`]+)`/g)].map((m) => m[1].replace(/^\//, ''));
  return [...new Set(matches)];
}

function sourceFor(servedPath) {
  const [folder, ...rest] = servedPath.split('/');
  const original = FOLDERS[folder];
  if (!original) return null;
  return join(packRoot, original, ...rest);
}

const paths = await declaredPaths();

await rm(outRoot, { recursive: true, force: true });

const missing = [];
let copied = 0;

for (const servedPath of paths) {
  const from = sourceFor(servedPath);
  if (!from || !existsSync(from)) {
    missing.push(servedPath);
    continue;
  }
  const to = join(outRoot, servedPath);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  copied += 1;
}

if (missing.length) {
  console.error(`No se encontraron en el pack ${missing.length} sprites declarados:`);
  for (const p of missing) console.error(`  · ${p}`);
  process.exitCode = 1;
}

console.log(`${copied} sprites copiados a public/assets (declarados: ${paths.length}).`);
