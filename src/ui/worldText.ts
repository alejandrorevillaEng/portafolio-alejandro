// Bocadillos y etiqueta de marcador en DOM (en el canvas escalado salian borrosos).
// #ui-root tiene la proporcion del mapa, asi que se colocan en % del mundo.

import { on } from '@/systems/bus';
import { onLangChange } from '@/content';
import { WORLD_H, WORLD_W } from '@/config';
import { el } from './dom';

function place(node: HTMLElement, x: number, y: number): void {
  node.style.left = `${(x / WORLD_W) * 100}%`;
  node.style.top = `${(y / WORLD_H) * 100}%`;
}

export function mountWorldText(root: HTMLElement): void {
  const layer = el('div', 'world-text');
  layer.setAttribute('aria-hidden', 'true');
  root.append(layer);

  const bubbles = new Map<string, HTMLElement>();

  const remove = (key: string) => {
    const node = bubbles.get(key);
    if (!node) return;
    bubbles.delete(key);
    node.dataset.state = 'closed';
    window.setTimeout(() => node.remove(), 160);
  };

  on('bubble:show', ({ key, text, x, y }) => {
    bubbles.get(key)?.remove();
    const node = el('p', 'world-bubble', text);
    place(node, x, y);
    layer.append(node);
    bubbles.set(key, node);
    requestAnimationFrame(() => (node.dataset.state = 'open'));
  });
  on('bubble:move', ({ key, x, y }) => {
    const node = bubbles.get(key);
    if (node) place(node, x, y);
  });
  on('bubble:hide', ({ key }) => remove(key));

  onLangChange(() => [...bubbles.keys()].forEach(remove));

  const label = el('p', 'world-label');
  label.hidden = true;
  layer.append(label);
  on('marker:label', (data) => {
    if (!data) {
      label.hidden = true;
      return;
    }
    label.textContent = data.text;
    label.hidden = false;
    place(label, data.x, data.y);
    const half = label.offsetWidth / 2;
    const px = (data.x / WORLD_W) * layer.clientWidth;
    const clamped = Math.min(Math.max(px, half + 4), layer.clientWidth - half - 4);
    label.style.left = `${clamped}px`;
  });
}
