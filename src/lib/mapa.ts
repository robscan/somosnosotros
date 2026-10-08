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

/** Radio alrededor del dedo en que se busca un sitio del mapa base al sostenerlo (el icono mide poco y el dedo necesita más para acertar). */
export const RADIO_POI = 16;

/** Un elemento del mapa como lo devuelve `queryRenderedFeatures`: solo lo que hace falta para saber si es un sitio y cómo se llama. */
export type ElementoDelMapa = { sourceLayer?: string; properties: Record<string, unknown> | null; geometry: { type: string; coordinates?: unknown } };

/** Un sitio del mapa base (un museo, un parque, una plaza…): su nombre y su punto, que es el del sitio y no el del dedo. */
export type Poi = { nombre: string; lat: number; lng: number };

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * El sitio del mapa base que está bajo el dedo, de lo que encontró `queryRenderedFeatures` alrededor de él: solo los de la capa `poi_label` (los
 * que el mapa ya rotula, y así están a la vista), con nombre —en español si lo trae— y el más cercano. `proyectar` lleva un punto del mapa a la pantalla.
 */
export function poiBajoElDedo(elementos: ElementoDelMapa[], dedo: PuntoEnPantalla, proyectar: (lng: number, lat: number) => PuntoEnPantalla): Poi | null {
  let mejor: (Poi & { distancia: number }) | null = null;
  for (const e of elementos) {
    const nombre = texto(e.properties?.name_es) ?? texto(e.properties?.name);
    if (e.sourceLayer !== "poi_label" || e.geometry.type !== "Point" || !nombre) continue;
    const [lng, lat] = e.geometry.coordinates as [number, number];
    const p = proyectar(lng, lat);
    const distancia = Math.hypot(p.x - dedo.x, p.y - dedo.y);
    if (!mejor || distancia < mejor.distancia) mejor = { nombre, lat, lng, distancia };
  }
  return mejor && { nombre: mejor.nombre, lat: mejor.lat, lng: mejor.lng };
}

/**
 * ¿Cabe la tarjeta de una pulsación larga arriba de su punto o, si no, abajo, dentro de lo que se ve del mapa (su alto menos lo que la hoja tapa por
 * abajo)? Es la preferencia de la ventanita de Mapbox (arriba si cabe, abajo si no), que solo cuenta la caja entera del mapa y no sabe de la hoja.
 * `separacion` es lo que la tarjeta se aparta del punto y `altoTarjeta`, lo que mide con su flecha.
 */
export function cabeLaTarjeta(puntoY: number, altoTarjeta: number, altoMapa: number, tapaAbajo: number, separacion: number): boolean {
  return puntoY - separacion >= altoTarjeta || altoMapa - tapaAbajo - puntoY - separacion >= altoTarjeta;
}

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

/** Dónde mira la cámara de un mapa: su centro y su acercamiento (el `zoom` de Mapbox). */
export type Vista = { centro: { lat: number; lng: number }; zoom: number };

/** Lo que mide el mundo entero a acercamiento 0 en Mapbox GL (px): cada nivel lo dobla. */
const MUNDO_EN_ZOOM_0 = 512;

/** Un punto en Web Mercator, de 0 a 1 en cada eje (la proyección de Mapbox), y de vuelta. */
function aMercator({ lat, lng }: { lat: number; lng: number }): { x: number; y: number } {
  const s = Math.sin((lat * Math.PI) / 180);
  return { x: (lng + 180) / 360, y: 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI) };
}
function deMercator({ x, y }: { x: number; y: number }): { lat: number; lng: number } {
  return { lat: (Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) * 360) / Math.PI - 90, lng: x * 360 - 180 };
}

/**
 * La vista que deja todos los puntos dentro de una caja de `caja.ancho` × `caja.alto` px con `aire` libre a cada lado (lo que tapan los controles y la
 * tarjeta), sin acercarse más que `zoomMax` (con un solo punto, la caja libre se centra en él a ese acercamiento). Es lo que hace `fitBounds` de Mapbox,
 * pero sin el mapa: así el mapa a pantalla completa de una ficha (OL-350) abre ya encuadrado, sin volar desde otro sitio. Null sin puntos.
 */
export function vistaQueEncuadra(puntos: readonly { lat: number; lng: number }[], caja: { ancho: number; alto: number }, aire: { arriba: number; abajo: number; izq: number; der: number }, zoomMax: number): Vista | null {
  if (!puntos.length) return null;
  const m = puntos.map(aMercator);
  const xs = m.map((p) => p.x);
  const ys = m.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const libreAncho = Math.max(1, caja.ancho - aire.izq - aire.der);
  const libreAlto = Math.max(1, caja.alto - aire.arriba - aire.abajo);
  const escala = Math.min(x1 > x0 ? libreAncho / ((x1 - x0) * MUNDO_EN_ZOOM_0) : Infinity, y1 > y0 ? libreAlto / ((y1 - y0) * MUNDO_EN_ZOOM_0) : Infinity);
  const zoom = Math.min(zoomMax, Math.log2(escala));
  const mundo = MUNDO_EN_ZOOM_0 * 2 ** zoom;
  // El centro de la caja libre está corrido del de la caja entera la mitad de la diferencia de aire en cada eje: el centro del mapa, al revés.
  return { centro: deMercator({ x: (x0 + x1) / 2 - (aire.izq - aire.der) / 2 / mundo, y: (y0 + y1) / 2 - (aire.arriba - aire.abajo) / 2 / mundo }), zoom };
}
