// Helpers de DOM

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** **negrita** -> <strong>, el resto escapado */
export function richText(raw: string): string {
  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function transitionMs(node: HTMLElement): number {
  const style = getComputedStyle(node);
  const durations = style.transitionDuration.split(',').map((d) => parseFloat(d) * (d.includes('ms') ? 1 : 1000));
  const delays = style.transitionDelay.split(',').map((d) => parseFloat(d) * (d.includes('ms') ? 1 : 1000));
  return Math.max(0, ...durations.map((d, i) => d + (delays[i] ?? 0)));
}

export function reveal(node: HTMLElement): void {
  node.dataset.state = 'closed';
  node.hidden = false;
  void node.offsetWidth; // reflow para que la transicion arranque
  node.dataset.state = 'open';
}

export function conceal(node: HTMLElement, onDone?: () => void): void {
  if (node.hidden) return;
  node.dataset.state = 'closed';
  window.setTimeout(() => {
    // la han vuelto a abrir mientras salia
    if (node.dataset.state !== 'closed') return;
    node.hidden = true;
    onDone?.();
  }, transitionMs(node) + 20);
}

export function isOpen(node: HTMLElement): boolean {
  return !node.hidden && node.dataset.state === 'open';
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container: HTMLElement, e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
