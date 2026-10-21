import "server-only";
import type { Punto } from "@/lib/geo";
import { leerLugaresMapbox, puntosDeMuestra, type LugarMapbox } from "./alta";

/**
 * Mapbox desde el servidor para «Añadir ciudad» (OL-432): las ciudades que sugiere al escribir y qué municipio hay en un punto (Geocoding v6,
 * `types=place`), con el token de la app (`NEXT_PUBLIC_MAPBOX_TOKEN`, el mismo que usan las rutinas en `src/lib/rutinas/mapbox.ts`). Nunca se
 * escribe la URL en un registro: lleva el token. Cada llamada tiene su plazo y, si falla, devuelve null: la hoja lo dice y no se cae.
 */

const API = "https://api.mapbox.com";
const PLAZO_MS = 6_000;

/**
 * Las capturas del respaldo local contestan a Mapbox con datos inventados: `MAPBOX_API_URL` cambia la dirección solo si apunta a 127.0.0.1
 * (el respaldo en la misma máquina). Cualquier otro valor se ignora: el token nunca sale hacia otro sitio.
 */
export function baseMapbox(valor: string | undefined = process.env.MAPBOX_API_URL): string {
  const v = valor?.trim() ?? "";
  return /^http:\/\/127\.0\.0\.1(:\d{2,5})?(\/[a-z0-9/_-]*)?$/i.test(v) ? v.replace(/\/+$/, "") : API;
}

export type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

async function pedirJson(ruta: string, parametros: Record<string, string>, token: string, pedir: Pedir = fetch): Promise<unknown | null> {
  try {
    const p = new URLSearchParams({ ...parametros, access_token: token });
    const r = await pedir(`${baseMapbox()}${ruta}?${p}`, { signal: AbortSignal.timeout(PLAZO_MS), cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Las ciudades que Mapbox sugiere para lo escrito, las cercanas primero (el contexto ordena, no limita: sin país). null si no respondió. */
export async function sugerenciasMapbox(q: string, token: string, cerca: Punto, pedir?: Pedir): Promise<LugarMapbox[] | null> {
  const r = await pedirJson("/search/geocode/v6/forward", { q, types: "place", language: "es", limit: "6", autocomplete: "true", proximity: `${cerca.lng},${cerca.lat}` }, token, pedir);
  return r === null ? null : leerLugaresMapbox(r);
}

/** La ciudad (municipio) en la que cae un punto, o null. */
export async function lugarEnPunto(p: Punto, token: string, pedir?: Pedir): Promise<LugarMapbox | null> {
  const r = await pedirJson("/search/geocode/v6/reverse", { longitude: String(p.lng), latitude: String(p.lat), types: "place", language: "es", limit: "1" }, token, pedir);
  return r === null ? null : (leerLugaresMapbox(r)[0] ?? null);
}

/** Una ciudad por su nombre (una detectada que todavía no tiene centro), o null. */
export async function lugarPorNombre(nombre: string, token: string, cerca: Punto, pedir?: Pedir): Promise<LugarMapbox | null> {
  const r = await pedirJson("/search/geocode/v6/forward", { q: nombre, types: "place", language: "es", limit: "1", proximity: `${cerca.lng},${cerca.lat}` }, token, pedir);
  return r === null ? null : (leerLugaresMapbox(r)[0] ?? null);
}

/**
 * Qué municipio hay en cada muestra del área (`puntosDeMuestra`: el centro, medio radio y casi el borde), en paralelo. null si Mapbox no
 * contestó ninguna; si contestó algunas, lo que dijo (lo que no, null).
 */
export async function nombresAlrededor(centro: Punto, radioKm: number, token: string, pedir?: Pedir): Promise<(string | null)[] | null> {
  const r = await Promise.all(puntosDeMuestra(centro, radioKm).map((p) => lugarEnPunto(p, token, pedir)));
  return r.every((x) => x === null) ? null : r.map((x) => x?.nombre ?? null);
}
