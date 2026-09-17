import "server-only";
import tzlookup from "@photostructure/tz-lookup";
import { ZONA_INICIAL, zonaSegura } from "./fechas";

/**
 * La zona horaria de un punto del mapa ("Europe/Madrid"), para guardarla con el lugar o el evento (migración 0029).
 * Se calcula en el servidor al guardar, sin red: el mapa de zonas viene en el paquete (unos 70 KB, fuera del teléfono).
 * Sin punto, o con uno que no se entiende, la de la ciudad inicial.
 */
export function zonaDePunto(lat: number | null | undefined, lng: number | null | undefined): string {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return ZONA_INICIAL;
  try {
    return zonaSegura(tzlookup(lat, lng));
  } catch {
    return ZONA_INICIAL;
  }
}

/**
 * La zona de un evento en otro sitio, como la calcula el servidor al guardarlo: la del punto del sitio, o la de la
 * dirección reservada si lo es. Con ella se rellena el formulario al editar, para leer y escribir en la misma zona.
 */
export function zonaDelSitio(evento: { sitio_reservado?: boolean; sitio_lat?: number | null; sitio_lng?: number | null } | undefined, privado?: { lat: number | null; lng: number | null } | null): string {
  if (!evento) return ZONA_INICIAL;
  return evento.sitio_reservado ? zonaDePunto(privado?.lat, privado?.lng) : zonaDePunto(evento.sitio_lat, evento.sitio_lng);
}
