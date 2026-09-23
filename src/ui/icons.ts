/**
 * Iconos: cada SVG de ./iconos/ se incluye en el bundle y se pide por su nombre
 * de archivo. Para uno nuevo basta con soltar el SVG en la carpeta (ver su LEEME).
 *
 * Los `ph-*` (Phosphor) usan currentColor y toman el color del texto; los logos
 * de tecnologias traen su propio color.
 */

import { el } from './dom';

const FILES = import.meta.glob('./iconos/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const SVGS = new Map(Object.entries(FILES).map(([path, svg]) => [path.slice('./iconos/'.length, -'.svg'.length), svg]));

/** Iniciales para cuando falta el SVG: "Spring Boot" -> "SB". */
function monogram(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '·';
}

/**
 * Un icono decorativo (aria-hidden: el nombre ya va escrito al lado).
 * Sin archivo con ese nombre, dibuja las iniciales de `fallback`.
 */
export function icon(name: string | undefined, fallback = '', className = 'icon'): HTMLElement {
  const svg = name ? SVGS.get(name) : undefined;
  const node = el('span', className);
  node.setAttribute('aria-hidden', 'true');
  if (svg) {
    node.innerHTML = svg;
    if (name?.startsWith('ph-')) node.classList.add('icon-glyph');
  } else {
    node.classList.add('icon-monogram');
    node.textContent = monogram(fallback);
  }
  return node;
}
