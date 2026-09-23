/**
 * Reparto de los círculos de acciones/enlaces de una ficha (evento, lugar, artista — OL-163, bitácora 198).
 * Con pocos, se reparten a todo el ancho con el mismo espacio entre sí (uno solo queda a la izquierda, sin
 * estirarse); con más, van en un carril deslizable con espacio fijo. La decisión es pura (sin medir el DOM):
 * el founder fijó el número que caben a 390 px (cuatro círculos de 56 px con espacio de sobra) como el máximo
 * que se reparte; a partir de ahí, carril. `Ficha.module.css` (`.accionesRepartidas`/`.accionesCarril`) pinta
 * cada caso.
 */
export const MAXIMO_ACCIONES_REPARTIDAS = 4;

export function cabenRepartidas(cantidad: number): boolean {
  return cantidad <= MAXIMO_ACCIONES_REPARTIDAS;
}
