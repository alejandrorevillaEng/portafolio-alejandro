// SVGs de ./iconos/, por nombre de archivo. Los ph-* usan currentColor.

import { el } from './dom';

const FILES = import.meta.glob('./iconos/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const SVGS = new Map(Object.entries(FILES).map(([path, svg]) => [path.slice('./iconos/'.length, -'.svg'.length), svg]));

/** "Spring Boot" -> "SB" */
function monogram(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '·';
}

/** Si no hay SVG con ese nombre, pinta las iniciales de fallback. */
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
