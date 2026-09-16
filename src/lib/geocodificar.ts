import { distanciaKm } from "./geo";

/**
 * Autocompletado de direcciones con Mapbox (Geocoding v6). Se usa UNA vez, al dar de alta el lugar
 * (docs/heredado/mapa/MAPBOX_GEOCODING.md); la ficha nunca vuelve a geocodificar. Se puede registrar en cualquier
 * ciudad de México (decisión del founder, 2026-09-16); la ciudad viene en el contexto de Mapbox.
 */
export type Sugerencia = { nombre: string; direccion: string; lat: number; lng: number; ciudad: string | null };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/** Cuántas sugerencias se muestran, ya ordenadas por cercanía (ver buscarDirecciones). */
const MAX_SUGERENCIAS = 5;

export function urlGeocodificar(q: string, token: string, cerca: { lat: number; lng: number }): string {
  const p = new URLSearchParams({
    q,
    access_token: token,
    autocomplete: "true",
    country: "mx", // ver buscarLugares: sin país, Mapbox pone otras ciudades del mundo antes que la propia
    language: "es",
    // Se piden más de las que se muestran porque Mapbox no siempre ordena por cercanía real dentro del país
    // (buscando "Plaza de Armas" desde San Luis, antepone las de Querétaro, Zacatecas o Saltillo); se reordenan
    // aquí (buscarDirecciones) y se recorta a MAX_SUGERENCIAS.
    limit: "10",
    proximity: `${cerca.lng},${cerca.lat}`,
    types: "address,street,place,locality,neighborhood",
  });
  return `https://api.mapbox.com/search/geocode/v6/forward?${p.toString()}`;
}

/** Dónde cae un resultado, según Mapbox: la ciudad (place) o, en poblaciones chicas, la localidad. */
export type Contexto = { place?: { name?: string }; locality?: { name?: string } };
export function ciudadDelContexto(c: Contexto | undefined): string | null {
  return c?.place?.name ?? c?.locality?.name ?? null;
}

type RespuestaV6 = {
  features?: Array<{
    properties?: { name?: string; full_address?: string; place_formatted?: string; coordinates?: { latitude: number; longitude: number }; context?: Contexto };
  }>;
};

export function interpretarRespuesta(json: RespuestaV6): Sugerencia[] {
  return (json.features ?? [])
    .map((f) => {
      const p = f.properties ?? {};
      if (!p.coordinates) return null;
      return {
        nombre: p.name ?? "",
        direccion: p.full_address ?? [p.name, p.place_formatted].filter(Boolean).join(", "),
        lat: p.coordinates.latitude,
        lng: p.coordinates.longitude,
        ciudad: ciudadDelContexto(p.context),
      };
    })
    .filter((s): s is Sugerencia => !!s && !!s.direccion);
}

export async function buscarDirecciones(q: string, token: string, cerca: { lat: number; lng: number }, fetchFn: FetchFn = fetch): Promise<Sugerencia[]> {
  const texto = q.trim();
  if (texto.length < 3) return [];
  const res = await fetchFn(urlGeocodificar(texto, token, cerca));
  if (!res.ok) return [];
  const sugerencias = interpretarRespuesta((await res.json()) as RespuestaV6);
  // Se reordena por distancia real al punto de cercanía (Mapbox no siempre lo hace bien) y se muestran las más cercanas.
  return sugerencias.sort((a, b) => distanciaKm(cerca, a) - distanciaKm(cerca, b)).slice(0, MAX_SUGERENCIAS);
}

/** Dirección aproximada y ciudad de un punto (para cuando el pin se pone con el dedo o con "Estoy aquí"). */
export async function lugarDesdePunto(p: { lat: number; lng: number }, token: string, fetchFn: FetchFn = fetch): Promise<{ direccion: string; ciudad: string | null } | null> {
  const q = new URLSearchParams({ longitude: String(p.lng), latitude: String(p.lat), access_token: token, language: "es", types: "address,street", limit: "1" });
  const res = await fetchFn(`https://api.mapbox.com/search/geocode/v6/reverse?${q.toString()}`);
  if (!res.ok) return null;
  const s = interpretarRespuesta((await res.json()) as RespuestaV6);
  return s[0] ? { direccion: s[0].direccion, ciudad: s[0].ciudad } : null;
}

export async function direccionDesdePunto(p: { lat: number; lng: number }, token: string, fetchFn: FetchFn = fetch): Promise<string | null> {
  return (await lugarDesdePunto(p, token, fetchFn))?.direccion ?? null;
}
