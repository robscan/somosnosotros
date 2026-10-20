/**
 * Las búsquedas en Mapbox de los importadores (lugares de importar.ts y sitios sin punto de importar-eventos.ts), acotadas a la ciudad.
 * El `fetch` y la dirección de la API se pueden cambiar para probar sin red (la respuesta simulada de las pruebas y del ensayo local).
 */
import { randomUUID } from "node:crypto";
import { CAJA_CIUDAD, direccionParaBuscar, elegirPunto, enCiudad, mismaCalle, nombresCoinciden, type Candidato, type Eleccion } from "./instituciones";

export type Mapbox = {
  token: string;
  fetch?: typeof fetch;
  /** Sin la barra final. Por omisión la de Mapbox; `MAPBOX_API_URL` la cambia para ensayar con una respuesta simulada. */
  api?: string;
};

const CENTRO = { lat: 22.1497, lng: -100.9764 };
const BBOX = `${CAJA_CIUDAD.oeste},${CAJA_CIUDAD.sur},${CAJA_CIUDAD.este},${CAJA_CIUDAD.norte}`;

type Sugerencias = { suggestions?: Array<{ mapbox_id?: string; name?: string }> };
type Recuperado = { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; full_address?: string } }> };
type Geocodificado = { features?: Array<{ properties?: { feature_type?: string; full_address?: string; coordinates?: { latitude: number; longitude: number } } }> };

const api = (m: Mapbox) => m.api ?? process.env.MAPBOX_API_URL ?? "https://api.mapbox.com";

/** Mapbox Search Box: el primer lugar de la ciudad cuyo nombre coincide con el nombre o algún alias. */
export async function porNombre(nombres: string[], m: Mapbox): Promise<Candidato | null> {
  const pedir = m.fetch ?? fetch;
  for (const nombre of nombres) {
    const sesion = randomUUID();
    const p = new URLSearchParams({ q: nombre, access_token: m.token, session_token: sesion, language: "es", country: "mx", limit: "5", proximity: `${CENTRO.lng},${CENTRO.lat}`, bbox: BBOX, types: "poi" });
    const r = await pedir(`${api(m)}/search/searchbox/v1/suggest?${p}`);
    if (!r.ok) continue;
    const s = ((await r.json()) as Sugerencias).suggestions?.find((x) => x.mapbox_id && x.name && nombresCoinciden(nombre, x.name));
    if (!s?.mapbox_id) continue;
    const rr = await pedir(`${api(m)}/search/searchbox/v1/retrieve/${encodeURIComponent(s.mapbox_id)}?${new URLSearchParams({ access_token: m.token, session_token: sesion })}`);
    if (!rr.ok) continue;
    const f = ((await rr.json()) as Recuperado).features?.[0];
    const c = f?.geometry?.coordinates;
    if (!c) continue;
    const punto = { lat: c[1], lng: c[0] };
    if (enCiudad(punto)) return { ...punto, direccion: f?.properties?.full_address ?? "", nombre: f?.properties?.name ?? s.name };
  }
  return null;
}

/** Mapbox Geocoding v6 por dirección: solo vale un número exacto en la misma calle. */
export async function porDireccion(direccion: string, m: Mapbox): Promise<Candidato | null> {
  if (!direccion.trim()) return null;
  const p = new URLSearchParams({ q: direccionParaBuscar(direccion), access_token: m.token, country: "mx", language: "es", limit: "1", bbox: BBOX, proximity: `${CENTRO.lng},${CENTRO.lat}`, types: "address" });
  const r = await (m.fetch ?? fetch)(`${api(m)}/search/geocode/v6/forward?${p}`);
  if (!r.ok) return null;
  const f = ((await r.json()) as Geocodificado).features?.[0]?.properties;
  if (!f?.coordinates || f.feature_type !== "address") return null;
  const punto = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
  const devuelta = f.full_address ?? "";
  return enCiudad(punto) && mismaCalle(direccion, devuelta) ? { ...punto, direccion: devuelta } : null;
}

/**
 * El punto de un sitio que no está en el directorio («El Meteorito. Museo Interactivo», «Plaza de Armas»), como el de un lugar nuevo: por su
 * nombre y, si la agenda trae la dirección, también por ella, contrastados con `elegirPunto`. Solo dentro de la ciudad. Sin resultado, null:
 * el evento no se carga y el informe lo lista como «sitio sin punto».
 */
export async function ubicarSitio(sitio: string, direccion: string | null | undefined, m: Mapbox): Promise<Eleccion | null> {
  const nombre = sitio.replace(/[.…]+\s*$/, "").trim();
  if (!nombre) return null;
  const [n, d] = await Promise.all([porNombre([nombre], m), porDireccion(direccion ?? "", m)]);
  return elegirPunto(null, n, d, direccion ?? "");
}
