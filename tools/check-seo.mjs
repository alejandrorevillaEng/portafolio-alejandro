// Comprueba que el #seo-content de index.html sigue al dia con es.json.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const es = JSON.parse(await readFile(resolve(root, 'src/content/es.json'), 'utf8'));

const seo = html.match(/<div id="seo-content"[\s\S]*?<\/div>/)?.[0] ?? '';
const problems = [];

if (!seo) problems.push('No se encuentra <div id="seo-content"> en index.html.');

const name = es.ui.headerName;
if (!seo.includes(name)) problems.push(`El nombre "${name}" no aparece en #seo-content.`);

const contact = Object.values(es.panels).find((p) => p.type === 'contacto');
for (const link of contact?.links ?? []) {
  if (!seo.includes(link.href)) problems.push(`Falta el enlace de contacto ${link.href} en #seo-content.`);
}

const certs = Object.values(es.panels).find((p) => p.type === 'certificaciones');
for (const shelf of certs?.shelves ?? []) {
  for (const cert of shelf.items) {
    const key = cert.name.match(/CCNA[^,]*|Java SE \d+|Linux Essentials|Software Development Fundamentals/)?.[0];
    if (key && !seo.includes(key.replace(/^CCNA:\s*/, 'CCNA '))) problems.push(`La certificacion "${cert.name}" no aparece en #seo-content.`);
  }
}

if (problems.length) {
  console.error('index.html (#seo-content) no esta al dia con src/content/es.json:');
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('Contenido para buscadores al dia con es.json.');
