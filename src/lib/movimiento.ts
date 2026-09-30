/**
 * El movimiento de la app, en un solo sitio (docs/rediseno/50, ajustes del founder del 2026-09-30): lo que entra y sale con el resorte
 * de `globals.css` —la hoja de Lugares con su ficha y los chips que se ponen o se quitan de la fila de contexto— lee sus tiempos y sus
 * curvas de allí y respeta a quien pidió menos movimiento. Solo navegador: `window` y `getComputedStyle`.
 */

/** Quien pidió menos movimiento en su teléfono no ve nada entrar ni salir, ni desplazarse despacio. */
export const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Un tiempo de CSS (`--duracion-resorte`) en milisegundos. El minificador reescribe la unidad de las variables (`800ms` sale como `.8s`),
 * así que se entienden las dos.
 */
export function tiempoEnMs(css: string): number {
  const tiempo = css.trim();
  return tiempo.endsWith("ms") ? parseFloat(tiempo) : parseFloat(tiempo) * 1000;
}

/** Cómo se mueve algo, según `globals.css` (`--duracion-<nombre>` y `--curva-<nombre>`): el resorte de la entrada y su recorte, la salida. */
export function movimiento(nombre: "resorte" | "salida"): KeyframeAnimationOptions {
  const css = getComputedStyle(document.documentElement);
  return { duration: tiempoEnMs(css.getPropertyValue(`--duracion-${nombre}`)), easing: css.getPropertyValue(`--curva-${nombre}`) };
}
