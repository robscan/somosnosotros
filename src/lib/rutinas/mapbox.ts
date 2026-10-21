import "server-only";
import { randomUUID } from "node:crypto";
import type { Punto } from "../geo";
import { normalizarNombre } from "../lugares";
import { cajaAlrededor, dentroDelArea, nombresParecidos, palabrasDeCiudad } from "./filtros";

/**
 * Mapbox desde el servidor para «Buscar lugares» (OL-428): el punto de un candidato que la fuente no ubica, el estado de una ciudad (para
 * pedir su archivo al SIC) y el centro de una ciudad que todavía no lo tiene. Usa el mismo token que la app (`NEXT_PUBLIC_MAPBOX_TOKEN`);
 * si un día se restringe por dominio, estas llamadas (sin página de origen) dejarían de responder y la corrida contaría «sin ubicación».
 * Nunca se escribe la URL en un registro: lleva el token. Cada llamada tiene su tiempo y, si falla, devuelve null: nada aquí tumba un paso.
 * Las búsquedas siguen el criterio del importador de instituciones (OL-424): por dirección solo vale la misma calle; por nombre, un nombre
 * que coincide; las dos, dentro del área de la ciudad.
 */

export type Mapbox = { token: string; pedir?: typeof fetch; api?: string };
export type AreaCiudad = { centro: Punto; radioKm: number; nombres: readonly string[] };
export type Ubicado = Punto & { direccion: string | null; como: "fuente" | "direccion" | "nombre" };

const API = "https://api.mapbox.com";
const PLAZO_MS = 8_000;

async function pedirJson(m: Mapbox, ruta: string, parametros: Record<string, string>): Promise<unknown> {
  try {
    const p = new URLSearchParams({ ...parametros, access_token: m.token });
    const r = await (m.pedir ?? fetch)(`${m.api ?? API}${ruta}?${p}`, { signal: AbortSignal.timeout(PLAZO_MS), cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const bbox = (a: AreaCiudad) => {
  const c = cajaAlrededor(a.centro, a.radioKm);
  return `${c.oeste},${c.sur},${c.este},${c.norte}`;
};
const proximidad = (a: AreaCiudad) => `${a.centro.lng},${a.centro.lat}`;

/** «Calle 5 de Mayo 100, Centro, San Luis Potosí» → sin el nombre de la ciudad ni «México» al final: la ciudad va en la caja. */
export function direccionParaBuscar(direccion: string, nombresCiudad: readonly string[]): string {
  const ciudad = new Set(nombresCiudad.map(normalizarNombre));
  const partes = direccion
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  while (partes.length > 1 && (ciudad.has(normalizarNombre(partes.at(-1) ?? "")) || /^(m[eé]xico|mx|s\.?\s?l\.?\s?p\.?)$/i.test(partes.at(-1) ?? ""))) partes.pop();
  return partes.join(", ");
}

/** La respuesta tiene que hablar de la misma calle: la primera palabra larga de la dirección debe aparecer en ella. */
export function mismaCalle(pedida: string, devuelta: string): boolean {
  const palabra = normalizarNombre(pedida)
    .split(" ")
    .find((w) => w.length >= 4 && !/^(calle|avenida|prol|prolongacion|blvd|boulevard|calzada|privada|andador|esquina)$/.test(w));
  return !palabra || normalizarNombre(devuelta).includes(palabra);
}

type Geocodificado = { features?: Array<{ properties?: { feature_type?: string; full_address?: string; name?: string; coordinates?: { latitude?: number; longitude?: number }; context?: Record<string, { name?: string; region_code?: string; country_code?: string }> } }> };

/** Geocoding v6 por dirección: solo vale una dirección (no una colonia o la ciudad) en la misma calle y dentro del área. */
export async function porDireccion(direccion: string, area: AreaCiudad, m: Mapbox): Promise<Ubicado | null> {
  const q = direccionParaBuscar(direccion, area.nombres);
  if (q.length < 4) return null;
  const r = (await pedirJson(m, "/search/geocode/v6/forward", { q, country: "mx", language: "es", limit: "1", types: "address", bbox: bbox(area), proximity: proximidad(area) })) as Geocodificado | null;
  const f = r?.features?.[0]?.properties;
  const lat = f?.coordinates?.latitude, lng = f?.coordinates?.longitude;
  if (f?.feature_type !== "address" || typeof lat !== "number" || typeof lng !== "number") return null;
  const punto = { lat, lng };
  if (!dentroDelArea(punto, area.centro, area.radioKm) || !mismaCalle(q, f.full_address ?? "")) return null;
  return { ...punto, direccion: f.full_address ?? null, como: "direccion" };
}

type Sugerencias = { suggestions?: Array<{ mapbox_id?: string; name?: string }> };
type Recuperado = { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { full_address?: string } }> };

/** Search Box por nombre (sugerir y recuperar, una sesión): el primer sitio de nombre parecido dentro del área. Solo como último recurso. */
export async function porNombre(nombre: string, area: AreaCiudad, m: Mapbox): Promise<Ubicado | null> {
  const sesion = randomUUID();
  const s = (await pedirJson(m, "/search/searchbox/v1/suggest", { q: nombre, session_token: sesion, language: "es", country: "mx", limit: "5", types: "poi", bbox: bbox(area), proximity: proximidad(area) })) as Sugerencias | null;
  const ciudad = palabrasDeCiudad(area.nombres[0] ?? "");
  const elegida = s?.suggestions?.find((x) => x.mapbox_id && x.name && nombresParecidos(nombre, x.name, ciudad));
  if (!elegida?.mapbox_id) return null;
  const r = (await pedirJson(m, `/search/searchbox/v1/retrieve/${encodeURIComponent(elegida.mapbox_id)}`, { session_token: sesion })) as Recuperado | null;
  const f = r?.features?.[0];
  const c = f?.geometry?.coordinates;
  if (!c || typeof c[0] !== "number" || typeof c[1] !== "number") return null;
  const punto = { lat: c[1], lng: c[0] };
  return dentroDelArea(punto, area.centro, area.radioKm) ? { ...punto, direccion: f?.properties?.full_address ?? null, como: "nombre" } : null;
}

/**
 * Dónde va el pin de un candidato: el punto de la fuente si lo trae y cae en el área (el del SIC es el de su ficha, puesto a mano); si no,
 * Mapbox por dirección; si no, Mapbox por nombre. Sin nada, null («sin ubicación»).
 */
export async function ubicar(c: { nombre: string; direccion: string | null; lat: number | null; lng: number | null }, area: AreaCiudad, m: Mapbox | null): Promise<Ubicado | "fuera" | null> {
  if (c.lat != null && c.lng != null) {
    const punto = { lat: c.lat, lng: c.lng };
    if (dentroDelArea(punto, area.centro, area.radioKm)) return { ...punto, direccion: null, como: "fuente" };
    if (!m) return "fuera";
  }
  if (!m) return null;
  const porCalle = c.direccion ? await porDireccion(c.direccion, area, m) : null;
  if (porCalle) return porCalle;
  const porSuNombre = await porNombre(c.nombre, area, m);
  if (porSuNombre) return porSuNombre;
  return c.lat != null && c.lng != null ? "fuera" : null;
}

/** El estado (código ISO y nombre) en el que cae un punto, y si es de México. */
export async function estadoDePunto(p: Punto, m: Mapbox): Promise<{ codigo: string | null; nombre: string | null } | null> {
  const r = (await pedirJson(m, "/search/geocode/v6/reverse", { longitude: String(p.lng), latitude: String(p.lat), types: "place", language: "es", limit: "1" })) as Geocodificado | null;
  const contexto = r?.features?.[0]?.properties?.context;
  if (!contexto || (contexto.country?.country_code ?? "").toUpperCase() !== "MX") return null;
  return { codigo: contexto.region?.region_code ?? null, nombre: contexto.region?.name ?? null };
}

/** El centro de una ciudad que todavía no lo tiene en la tabla (una detectada sin lugares), por su nombre. */
export async function centroDeCiudad(nombre: string, m: Mapbox): Promise<Punto | null> {
  const r = (await pedirJson(m, "/search/geocode/v6/forward", { q: nombre, types: "place", country: "mx", language: "es", limit: "1" })) as Geocodificado | null;
  const c = r?.features?.[0]?.properties?.coordinates;
  return typeof c?.latitude === "number" && typeof c?.longitude === "number" ? { lat: c.latitude, lng: c.longitude } : null;
}
