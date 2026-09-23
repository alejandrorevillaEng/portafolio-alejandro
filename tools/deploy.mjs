/**
 * Publica dist/ en la rama gh-pages (la que sirve GitHub Pages).
 *
 *   npm run deploy
 *
 * Hace un repositorio git de usar y tirar dentro de dist/ y lo sube a la fuerza
 * a gh-pages del mismo remoto. Se anade todo con -f a proposito: el .gitignore
 * del proyecto deja fuera los sprites del pack (su licencia no permite
 * redistribuirlos en el codigo), pero la web publicada SI tiene que llevarlos.
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const run = (cmd, cwd = dist) => execSync(cmd, { cwd, stdio: 'inherit' });

if (!existsSync(join(dist, 'index.html'))) throw new Error('No hay dist/: ejecuta antes npm run build');

const remote = execSync('git remote get-url origin', { cwd: root }).toString().trim();

rmSync(join(dist, '.git'), { recursive: true, force: true });
// GitHub Pages pasa por Jekyll salvo que exista este archivo; sin el, ignoraria
// carpetas que empiezan por "_".
writeFileSync(join(dist, '.nojekyll'), '');

run('git init -q -b gh-pages');
run('git add -A -f');
run('git -c core.safecrlf=false commit -q -m "Publicar web"');
run(`git push -f "${remote}" gh-pages`);
rmSync(join(dist, '.git'), { recursive: true, force: true });
console.log('Publicado en gh-pages.');
