/**
 * Preferencia de movimiento reducido del sistema. La comparten el juego (pulso
 * y bote de los marcadores) y la interfaz, para que ninguno la ignore.
 */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
