import { ciudadCanonica } from "./ciudad";
import { distanciaKm } from "./geo";

/**
 * Autocompletado de direcciones con Mapbox (Geocoding v6). Se usa UNA vez, al dar de alta el lugar
 * (docs/heredado/mapa/MAPBOX_GEOCODING.md); la ficha nunca vuelve a geocodificar. La ciudad viene en el contexto de
 * Mapbox. El contexto ordena, no limita (founder, 2026-09-16): la ciudad de los artistas ya se busca en cualquier país;
 * las direcciones de lugares siguen en México hasta que los eventos tengan la zona horaria de su ciudad (bitácora 067).
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
    country: "mx", // pendiente, como en buscarLugares: se quita junto con la zona horaria de los eventos (bitácora 067)
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

/** Dónde cae un resultado, según Mapbox: la ciudad (place) o, en poblaciones chicas, la localidad; y el país. */
export type Contexto = { place?: { name?: string }; locality?: { name?: string }; country?: { name?: string; country_code?: string } };
/**
 * El nombre de la ciudad con el que se guarda. Fuera de México lleva el país ("Córdoba, España"), para no juntarla con
 * Córdoba, Veracruz; las de México van sin país porque así están todas las que ya hay.
 */
export function ciudadDelContexto(c: Contexto | undefined): string | null {
  const nombre = c?.place?.name ?? c?.locality?.name ?? null;
  const pais = c?.country;
  if (!nombre || !pais?.name || !pais.country_code || pais.country_code.toLowerCase() === "mx") return nombre;
  return `${nombre}, ${pais.name}`;
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

/** Una ciudad encontrada: el nombre con el que se guarda y dónde queda ("Estado de Jalisco, México"). */
export type CiudadEncontrada = { ciudad: string; donde: string };

/**
 * Búsqueda del renglón Ciudad del alta de artista: solo ciudades (`place`), de cualquier país, en español. El contexto
 * ordena y no limita (founder, 2026-09-16): la cercanía a la ciudad que se ve pone primero las de aquí, y se piden 10
 * porque un nombre repetido ("San José") trae la de Costa Rica hasta el décimo lugar.
 */
export function urlCiudades(q: string, token: string, cerca: { lat: number; lng: number }): string {
  const p = new URLSearchParams({ q, access_token: token, autocomplete: "true", language: "es", limit: "10", proximity: `${cerca.lng},${cerca.lat}`, types: "place" });
  return `https://api.mapbox.com/search/geocode/v6/forward?${p.toString()}`;
}

type RespuestaCiudades = { features?: Array<{ properties?: { name?: string; place_formatted?: string; context?: Contexto } }> };

/**
 * El nombre sale del contexto, como la ciudad de un lugar ("Mexico DF" llega con "Ciudad de México" en el contexto;
 * fuera de México, con su país) y se unifica con su área metropolitana (`ciudadCanonica`). Si el nombre ya dice el
 * país, "dónde" no lo repite ("Córdoba, España" · "Provincia de Córdoba"). La misma ciudad del mismo estado no se repite.
 */
export function interpretarCiudades(json: RespuestaCiudades): CiudadEncontrada[] {
  const vistas = new Set<string>();
  const out: CiudadEncontrada[] = [];
  for (const f of json.features ?? []) {
    const p = f.properties ?? {};
    const ciudad = ciudadCanonica(ciudadDelContexto(p.context) ?? p.name);
    const pais = p.context?.country?.name;
    let donde = (p.place_formatted ?? "").trim();
    if (pais && ciudad.endsWith(`, ${pais}`) && donde.endsWith(`, ${pais}`)) donde = donde.slice(0, -(pais.length + 2));
    if (!ciudad || vistas.has(`${ciudad}|${donde}`)) continue;
    vistas.add(`${ciudad}|${donde}`);
    out.push({ ciudad, donde: donde.charAt(0).toUpperCase() + donde.slice(1) });
  }
  return out;
}

/** Con menos de 2 letras no se busca. Si Mapbox falla, lanza: la hoja lo dice en vez de fingir que no hay ciudades. */
export async function buscarCiudades(q: string, token: string, cerca: { lat: number; lng: number }, fetchFn: FetchFn = fetch): Promise<CiudadEncontrada[]> {
  const texto = q.trim();
  if (texto.length < 2) return [];
  const res = await fetchFn(urlCiudades(texto, token, cerca));
  if (!res.ok) throw new Error(`Mapbox respondió ${res.status}`);
  return interpretarCiudades((await res.json()) as RespuestaCiudades);
}
