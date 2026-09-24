// Falla si alguna ruta de src/world/assets.ts o del mapa no existe en public/.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '..', 'src', 'world', 'assets.ts'), 'utf8');
const publicDir = resolve(here, '..', 'public');

const paths = [...source.matchAll(/path: `\$\{A\}([^`]+)`/g)].map((m) => `assets${m[1]}`);

const mapa = join(publicDir, 'mapa', 'aldea.json');
if (existsSync(mapa)) {
  const { tilesets } = JSON.parse(await readFile(mapa, 'utf8'));
  for (const ts of tilesets) paths.push(`mapa/${ts.image}`);
} else {
  paths.push('mapa/aldea.json');
}
const missing = paths.filter((p) => !existsSync(join(publicDir, p)));

if (missing.length) {
  console.error(`Faltan ${missing.length} de ${paths.length} assets:`);
  for (const p of missing) console.error(`  · ${p}`);
  process.exit(1);
}
console.log(`${paths.length} assets comprobados, todos presentes.`);
