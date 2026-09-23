import { emit } from '@/systems/bus';

/**
 * Bocadillo de charla ambiental: un NPC dice una frase suelta de vez en cuando,
 * como si comentara algo con el vecino de al lado. No tiene nada que ver con el
 * dialogo de los paneles.
 *
 * El juego solo decide QUE se dice, CUANDO y DONDE (en pixeles del mundo). El
 * bocadillo lo dibuja la interfaz en DOM (ui/worldText.ts): el canvas se pinta a
 * 832x576 y se agranda con CSS, asi que un texto dibujado en el canvas saldria
 * borroso; en DOM se ve nitido a cualquier tamano.
 */
export class SpeechBubble {
  /** Como mucho, estos bocadillos a la vez en todo el mapa: mas seria ruido. */
  static readonly MAX_AT_ONCE = 2;
  private static active = 0;

  /** Si ahora mismo cabe un bocadillo mas. */
  static canSpeak(): boolean {
    return SpeechBubble.active < SpeechBubble.MAX_AT_ONCE;
  }

  private readonly key: string;
  private hideAt = 0;
  private shown = false;
  private lastX = NaN;
  private lastY = NaN;

  constructor(key: string) {
    this.key = key;
  }

  say(text: string, x: number, y: number, now: number, durationMs = 3200): void {
    if (!this.shown) SpeechBubble.active++;
    this.shown = true;
    this.hideAt = now + durationMs;
    this.lastX = x;
    this.lastY = y;
    emit('bubble:show', { key: this.key, text, x, y });
  }

  hide(): void {
    if (!this.shown) return;
    this.shown = false;
    SpeechBubble.active--;
    emit('bubble:hide', { key: this.key });
  }

  /** Sigue al vecino mientras esta a la vista (solo avisa si se ha movido). */
  update(time: number, x: number, y: number): void {
    if (!this.shown) return;
    if (time >= this.hideAt) {
      this.hide();
      return;
    }
    if (Math.abs(x - this.lastX) < 0.25 && Math.abs(y - this.lastY) < 0.25) return;
    this.lastX = x;
    this.lastY = y;
    emit('bubble:move', { key: this.key, x, y });
  }
}
