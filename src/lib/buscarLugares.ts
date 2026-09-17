/**
 * Búsqueda de lugares por nombre con Mapbox Search Box (conoce los lugares, no solo las calles).
 * Dos pasos, como pide Mapbox: sugerir (nombre + dirección) y recuperar (coordenadas) con un
 * mismo session_token. Se usa solo al dar de alta; la ficha nunca vuelve a consultar.
 * De cualquier país: el contexto ordena, no limita (founder, 2026-09-16). Lo cercano va primero.
 */
import { ciudadDelContexto, type Contexto } from "./geocodificar";
import type { Tipo } from "./lugares";

export type LugarSugerido = {
  mapboxId: string;
  nombre: string;
  direccion: string;
  categorias: string[];
  /** Es una dirección (calle y número), no un lugar con nombre: sirve para ubicar, nunca para nombrar. */
  esDireccion: boolean;
};

export type LugarRecuperado = { nombre: string; direccion: string; lat: number; lng: number; categorias: string[]; ciudad: string | null };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type Punto = { lat: number; lng: number };

const BASE = "https://api.mapbox.com/search/searchbox/v1";

export function urlSugerir(q: string, token: string, cerca: Punto, sesion: string): string {
  const p = new URLSearchParams({
    q,
    access_token: token,
    session_token: sesion,
    language: "es",
    // Sin país. Se piden 10 (el máximo de Mapbox) y se muestran las MAX_SUGERENCIAS más cercanas (sugerirLugares).
    limit: "10",
    proximity: `${cerca.lng},${cerca.lat}`,
    types: "poi,address",
  });
  return `${BASE}/suggest?${p.toString()}`;
}

export function urlRecuperar(mapboxId: string, token: string, sesion: string): string {
  const p = new URLSearchParams({ access_token: token, session_token: sesion, language: "es" });
  return `${BASE}/retrieve/${encodeURIComponent(mapboxId)}?${p.toString()}`;
}

/** Cuántas sugerencias se muestran, ya ordenadas por cercanía. */
const MAX_SUGERENCIAS = 5;

type RespuestaSugerir = {
  suggestions?: Array<{ mapbox_id?: string; name?: string; full_address?: string; place_formatted?: string; address?: string; poi_category?: string[]; feature_type?: string; distance?: number }>;
};
type RespuestaRecuperar = {
  features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; full_address?: string; place_formatted?: string; poi_category?: string[]; context?: Contexto } }>;
};

/**
 * Sin país, Mapbox antepone a veces lugares famosos de lejos: se ordenan por la distancia que da Mapbox al punto de
 * cercanía (lo que no la trae va al final, en el orden en que llegó), como las direcciones (buscarDirecciones).
 */
export function interpretarSugerencias(json: RespuestaSugerir): LugarSugerido[] {
  return [...(json.suggestions ?? [])]
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .map((s) => ({
      mapboxId: s.mapbox_id ?? "",
      nombre: s.name ?? "",
      direccion: s.full_address ?? [s.address, s.place_formatted].filter(Boolean).join(", "),
      categorias: s.poi_category ?? [],
      esDireccion: s.feature_type === "address" || (!s.poi_category?.length && s.feature_type !== "poi" && !!s.address),
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
    ciudad: ciudadDelContexto(p.context),
  };
}

export async function sugerirLugares(q: string, token: string, cerca: Punto, sesion: string, fetchFn: FetchFn = fetch): Promise<LugarSugerido[]> {
  const texto = q.trim();
  if (texto.length < 3) return [];
  const res = await fetchFn(urlSugerir(texto, token, cerca, sesion));
  if (!res.ok) return [];
  return interpretarSugerencias((await res.json()) as RespuestaSugerir).slice(0, MAX_SUGERENCIAS);
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
  if (/\b(museo|museum)\b/.test(n) || /museum/.test(c)) return "museo";
  if (/\b(galeria|gallery)\b/.test(n) || /gallery/.test(c)) return "galeria";
  // Antes que centro cultural y teatro: "Escuela Estatal de Teatro" es escuela, no foro.
  if (/\b(escuela|academia|conservatorio|bellas artes)\b/.test(n)) return "escuela";
  if (/\b(casa de (la )?cultura|centro cultural|centro de las artes|centro de artes)\b/.test(n) || /cultural|community center|arts cent/.test(c)) return "casa_de_cultura";
  if (/\b(teatro|foro|auditorio|theater|theatre)\b/.test(n) || /theat|concert|music venue|performing/.test(c)) return "foro";
  if (/\b(colectivo|taller|cooperativa)\b/.test(n)) return "colectivo";
  return null;
}
