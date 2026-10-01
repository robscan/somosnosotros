/**
 * Acercar una imagen en el visor (OL-249, ajuste 5): la cuenta de los gestos, sin DOM. La imagen está centrada en la ventana y su vista es
 * una escala y un desplazamiento del centro (en px) respecto a ese sitio; los puntos de la pantalla se dan respecto al centro de la ventana.
 */
export type Punto = { x: number; y: number };
export type Vista = { escala: number; x: number; y: number };
export type Caja = { ancho: number; alto: number };

/** Cuánto se puede acercar (founder, 2026-10-01: «hasta 4×»). */
export const ESCALA_MAXIMA = 4;
/** A cuánto acerca un doble toque (founder: 2,5×). */
export const ESCALA_DOBLE_TOQUE = 2.5;
export const SIN_ACERCAR: Vista = { escala: 1, x: 0, y: 0 };

/** Entre `a` y `b`. */
const entre = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * La vista dentro de lo permitido: la escala entre 1 y `ESCALA_MAXIMA` y la imagen sin salirse de sus bordes; en el eje donde cabe entera (o
 * justo), queda centrada. `imagen` es lo que mide a 1×.
 */
export function limitar(v: Vista, imagen: Caja, ventana: Caja): Vista {
  const escala = entre(v.escala, 1, ESCALA_MAXIMA);
  const tope = (de: number, en: number) => Math.max(0, (de * escala - en) / 2);
  return { escala, x: entre(v.x, -tope(imagen.ancho, ventana.ancho), tope(imagen.ancho, ventana.ancho)), y: entre(v.y, -tope(imagen.alto, ventana.alto), tope(imagen.alto, ventana.alto)) };
}

/** Acerca (`razon` mayor que 1) o aleja (menor) la vista, sin pasar de los límites de la escala, dejando bajo `foco` el punto de la imagen que estaba
 *  bajo `focoAntes` (el centro de los dedos al pellizcar; el punto tocado al dar doble toque; el cursor con la rueda). El desplazamiento aún
 *  puede salirse de los bordes: pasa por `limitar`. */
export function escalarEn(v: Vista, razon: number, focoAntes: Punto, foco: Punto): Vista {
  const escala = entre(v.escala * razon, 1, ESCALA_MAXIMA);
  const r = escala / v.escala;
  return { escala, x: foco.x - (focoAntes.x - v.x) * r, y: foco.y - (focoAntes.y - v.y) * r };
}

/** Un doble toque alterna: acercado, vuelve a 1×; a 1×, acerca a `ESCALA_DOBLE_TOQUE` alrededor del punto tocado. */
export function dobleToque(v: Vista, foco: Punto): Vista {
  return v.escala > 1 ? SIN_ACERCAR : escalarEn(SIN_ACERCAR, ESCALA_DOBLE_TOQUE, foco, foco);
}

/** Cuánto acerca (mayor que 1) o aleja (menor) la rueda, o el pellizco de un trackpad: cada punto de `deltaY` pesa lo mismo a cualquier escala. */
export const razonConRueda = (deltaY: number) => Math.exp(-deltaY * 0.002);
