import type { MapOptions } from "mapbox-gl";

/** Lo que hacen igual los dos mapas de la app: el de Lugares (`components/Mapa`) y el de «¿Dónde es?» (`components/MapaDondeEs`). */

export type EstadoMapa = "cargando" | "listo" | "sin-token" | "error";

/**
 * Lo que Mapbox nombra por su cuenta (la ⓘ de la atribución, el logotipo y el propio mapa) sale en inglés si no se le dice otra
 * cosa: `language` solo traduce las etiquetas del mapa. `locale` es un parche sobre su tabla, así que basta con lo que estos dos
 * mapas muestran; los controles que la app no añade (zoom, brújula, pantalla completa, ubicación) no traen texto que traducir.
 */
export const TEXTOS_MAPBOX = {
  "AttributionControl.ToggleAttribution": "Mostrar atribución",
  "LogoControl.Title": "Página de Mapbox",
  "Map.Title": "Mapa",
} satisfies MapOptions["locale"];

/** Radio del toque alrededor de un punto (el punto mide 10 px; el dedo necesita más para acertar). */
export const RADIO_TOQUE = 18;

/** Un punto en la pantalla del mapa, en px desde su esquina de arriba a la izquierda. */
export type PuntoEnPantalla = { x: number; y: number };

/**
 * ¿Hay lugares que ver y ninguno cae en lo que se ve del mapa? Lo que se ve es su caja menos lo que la hoja tapa por abajo (`tapaAbajo`, px).
 * Sin lugares no hay nada que encuadrar y no cuenta como perdido. Recibe los lugares ya llevados a la pantalla (`map.project`), así que vale
 * también con el mapa girado.
 */
export function resultadosPerdidos(puntos: PuntoEnPantalla[], mapa: { ancho: number; alto: number }, tapaAbajo: number): boolean {
  const visible = mapa.alto - tapaAbajo;
  return puntos.length > 0 && !puntos.some(({ x, y }) => x >= 0 && x <= mapa.ancho && y >= 0 && y <= visible);
}

/** Color de una variable de diseño, porque Mapbox pide el valor literal. */
export function colorDiseno(nombre: string, reserva: string): string {
  if (typeof document === "undefined") return reserva;
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || reserva;
}
