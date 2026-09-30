/** Lo que hacen igual los dos mapas de la app: el de Lugares (`components/Mapa`) y el de «¿Dónde es?» (`components/MapaDondeEs`). */

export type EstadoMapa = "cargando" | "listo" | "sin-token" | "error";

/** Radio del toque alrededor de un punto (el punto mide 10 px; el dedo necesita más para acertar). */
export const RADIO_TOQUE = 18;

/** Color de una variable de diseño, porque Mapbox pide el valor literal. */
export function colorDiseno(nombre: string, reserva: string): string {
  if (typeof document === "undefined") return reserva;
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || reserva;
}
