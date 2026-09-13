/**
 * Búsqueda de lugares por nombre con Mapbox Search Box (conoce los lugares, no solo las calles).
 * Dos pasos, como pide Mapbox: sugerir (nombre + dirección) y recuperar (coordenadas) con un
 * mismo session_token. Se usa solo al dar de alta; la ficha nunca vuelve a consultar.
 */
import type { Tipo } from "./lugares";

export type LugarSugerido = {
  mapboxId: string;
  nombre: string;
  direccion: string;
  categorias: string[];
};

export type LugarRecuperado = { nombre: string; direccion: string; lat: number; lng: number; categorias: string[] };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type Punto = { lat: number; lng: number };

const BASE = "https://api.mapbox.com/search/searchbox/v1";

export function urlSugerir(q: string, token: string, cerca: Punto, sesion: string): string {
  const p = new URLSearchParams({
    q,
    access_token: token,
    session_token: sesion,
    language: "es",
    country: "mx",
    limit: "5",
    proximity: `${cerca.lng},${cerca.lat}`,
    types: "poi,address",
  });
  return `${BASE}/suggest?${p.toString()}`;
}

export function urlRecuperar(mapboxId: string, token: string, sesion: string): string {
  const p = new URLSearchParams({ access_token: token, session_token: sesion });
  return `${BASE}/retrieve/${encodeURIComponent(mapboxId)}?${p.toString()}`;
}

type RespuestaSugerir = {
  suggestions?: Array<{ mapbox_id?: string; name?: string; full_address?: string; place_formatted?: string; address?: string; poi_category?: string[] }>;
};
type RespuestaRecuperar = {
  features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; full_address?: string; place_formatted?: string; poi_category?: string[] } }>;
};

export function interpretarSugerencias(json: RespuestaSugerir): LugarSugerido[] {
  return (json.suggestions ?? [])
    .map((s) => ({
      mapboxId: s.mapbox_id ?? "",
      nombre: s.name ?? "",
      direccion: s.full_address ?? [s.address, s.place_formatted].filter(Boolean).join(", "),
      categorias: s.poi_category ?? [],
    }))
    .filter((s) => s.mapboxId && s.nombre);
}

export function interpretarRecuperado(json: RespuestaRecuperar): LugarRecuperado | null {
  const f = json.features?.[0];
  const c = f?.geometry?.coordinates;
  if (!f || !c) return null;
  const p = f.properties ?? {};
  return {
    nombre: p.name ?? "",
    direccion: p.full_address ?? p.place_formatted ?? "",
    lng: c[0],
    lat: c[1],
    categorias: p.poi_category ?? [],
  };
}

export async function sugerirLugares(q: string, token: string, cerca: Punto, sesion: string, fetchFn: FetchFn = fetch): Promise<LugarSugerido[]> {
  const texto = q.trim();
  if (texto.length < 3) return [];
  const res = await fetchFn(urlSugerir(texto, token, cerca, sesion));
  if (!res.ok) return [];
  return interpretarSugerencias((await res.json()) as RespuestaSugerir);
}

export async function recuperarLugar(mapboxId: string, token: string, sesion: string, fetchFn: FetchFn = fetch): Promise<LugarRecuperado | null> {
  const res = await fetchFn(urlRecuperar(mapboxId, token, sesion));
  if (!res.ok) return null;
  return interpretarRecuperado((await res.json()) as RespuestaRecuperar);
}

/** Deduce el tipo desde las categorías de Mapbox o desde palabras del nombre. Null si no hay pista. */
export function deducirTipo(nombre: string, categorias: string[] = []): Tipo | null {
  const c = categorias.join(" ").toLowerCase();
  const n = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/\b(biblioteca|library)\b/.test(n) || /library/.test(c)) return "biblioteca";
  if (/\b(galeria|museo|museum|gallery)\b/.test(n) || /gallery|museum/.test(c)) return "galeria";
  if (/\b(casa de (la )?cultura|centro cultural|centro de las artes|centro de artes)\b/.test(n) || /cultural|community center|arts cent/.test(c)) return "casa_de_cultura";
  if (/\b(teatro|foro|auditorio|theater|theatre)\b/.test(n) || /theat|concert|music venue|performing/.test(c)) return "foro";
  if (/\b(colectivo|taller|cooperativa)\b/.test(n)) return "colectivo";
  return null;
}
