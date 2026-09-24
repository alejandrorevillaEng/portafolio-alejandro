import { emit } from '@/systems/bus';

// Frases sueltas de los vecinos. Se dibujan en DOM (ui/worldText.ts).
export class SpeechBubble {
  static readonly MAX_AT_ONCE = 2;
  private static active = 0;

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
