/**
 * Puente entre el juego (Phaser, canvas) y la interfaz (DOM).
 *
 * El juego nunca toca el DOM y la interfaz nunca toca Phaser: se hablan por aqui.
 */

export interface Events {
  /** Progreso de la carga de recursos, de 0 a 1 (la pantalla de carga es DOM). */
  'load:progress': { value: number };
  /** Empieza una conversacion con un vecino o un cartel. */
  'dialogue:open': { id: string };
  'dialogue:closed': void;
  'panel:closed': void;
  /** Perfil completo (el indice). La tecla Q llega desde el juego. */
  'journal:toggle': void;
  /** Se ha leido la seccion de este vecino o cartel: su marcador cambia a "visto". */
  'journal:visited': { id: string };
  /** La tarjeta de bienvenida se ha cerrado: el mapa senala sus marcadores. */
  'onboarding:done': void;
  /** El mundo esta listo para jugarse. */
  'world:ready': void;
  /**
   * Texto sobre el mapa (bocadillos y etiqueta de marcador). El juego manda la
   * posicion en pixeles del mundo; la interfaz lo dibuja en DOM, nitido.
   */
  'bubble:show': { key: string; text: string; x: number; y: number };
  'bubble:move': { key: string; x: number; y: number };
  'bubble:hide': { key: string };
  'marker:label': { text: string; x: number; y: number } | null;
  /** Cambios de ajustes. */
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
