/**
 * Reparto de los círculos de acciones/enlaces de una ficha (evento, lugar, artista — OL-163, bitácora 198;
 * corregido en OL-167, bitácora 202, 2026-09-24). Founder, OL-167: «Te había pedido que en los enlaces de
 * artistas distribuyeras elementos en espacio disponible y que lo hicieras a partir de 2, pero quiero que lo
 * cambies a partir de 3, con dos se percibe como error.» Con 1 o 2, quedan a la izquierda con el espacio normal
 * del carril (el `gap` de `.acciones`), sin estirarse — el flex por defecto ya lo hace, sin clase aparte; con 3
 * o 4 se reparten a todo el ancho con el mismo espacio entre sí (`.accionesRepartidas`); con más de los que
 * caben (`.accionesCarril`) van en un carril deslizable con espacio fijo, y el siguiente círculo asoma por el
 * borde porque su ancho no es múltiplo exacto del espacio visible — el mismo efecto que el carril de Destacados.
 * La decisión es pura (sin medir el DOM): el founder fijó el número que caben a 390 px (cuatro círculos de
 * 56 px con espacio de sobra) como el máximo que se reparte; a partir de ahí, carril.
 */
export const MAXIMO_ACCIONES_REPARTIDAS = 4;
const MINIMO_ACCIONES_REPARTIDAS = 3;

export type RepartoAcciones = "izquierda" | "repartidas" | "carril";

export function repartoDeAcciones(cantidad: number): RepartoAcciones {
  if (cantidad < MINIMO_ACCIONES_REPARTIDAS) return "izquierda";
  if (cantidad <= MAXIMO_ACCIONES_REPARTIDAS) return "repartidas";
  return "carril";
}
