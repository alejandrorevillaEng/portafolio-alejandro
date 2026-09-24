// Eventos entre el juego (Phaser) y la interfaz (DOM).

export interface Events {
  /** 0 a 1 */
  'load:progress': { value: number };
  'dialogue:open': { id: string };
  'dialogue:closed': void;
  'panel:closed': void;
  'journal:toggle': void;
  'journal:visited': { id: string };
  'onboarding:done': void;
  'world:ready': void;
  // Texto sobre el mapa; x/y en pixeles del mundo
  'bubble:show': { key: string; text: string; x: number; y: number };
  'bubble:move': { key: string; x: number; y: number };
  'bubble:hide': { key: string };
  'marker:label': { text: string; x: number; y: number } | null;
  'ui:lang': { lang: 'es' | 'en' };
}

type Handler<K extends keyof Events> = (payload: Events[K]) => void;

const handlers = new Map<keyof Events, Set<Handler<never>>>();

export function on<K extends keyof Events>(event: K, fn: Handler<K>): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(fn as Handler<never>);
  return () => {
    set?.delete(fn as Handler<never>);
  };
}

export function emit<K extends keyof Events>(event: K, payload: Events[K]): void {
  const set = handlers.get(event);
  if (!set) return;
  for (const fn of set) (fn as Handler<K>)(payload);
}
