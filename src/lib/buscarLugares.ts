/**
 * Búsqueda de lugares por nombre con Mapbox Search Box (conoce los lugares, no solo las calles).
 * Dos pasos, como pide Mapbox: sugerir (nombre + dirección) y recuperar (coordenadas) con un
 * mismo session_token. Se usa solo al dar de alta; la ficha nunca vuelve a consultar.
 * De cualquier país: el contexto ordena, no limita (founder, 2026-09-16). Lo cercano va primero.
 */
import { ciudadDelContexto, type Bbox, type Contexto } from "./geocodificar";
import { normalizarNombre, type LugarResumen, type Tipo } from "./lugares";

export type LugarSugerido = {
  mapboxId: string;
  nombre: string;
  direccion: string;
  categorias: string[];
  /** Es una dirección (calle y número), no un lugar con nombre: sirve para ubicar, nunca para nombrar. */
  esDireccion: boolean;
  /** Colonia o municipio del resultado, para distinguir dos aciertos con el mismo nombre (OL-100, L37). */
  ciudad: string | null;
  /**
   * Distancia en metros al punto de cercanía, tal como la da Mapbox en el paso "sugerir" (antes de "recuperar" sus
   * coordenadas exactas): sirve para decidir si hace falta una segunda búsqueda (OL-100), sin gastar una llamada de
   * más solo para medir distancia.
   */
  distanciaM: number | null;
};

export type LugarRecuperado = { nombre: string; direccion: string; lat: number; lng: number; categorias: string[]; ciudad: string | null };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type Punto = { lat: number; lng: number };

const BASE = "https://api.mapbox.com/search/searchbox/v1";

export function urlSugerir(q: string, token: string, cerca: Punto, sesion: string, bbox?: Bbox): string {
  const p = new URLSearchParams({
    q,
    access_token: token,
    session_token: sesion,
    language: "es",
    // Sin país. Se piden 10 (el máximo de Mapbox); quien llama filtra por relevancia y recorta después (OL-100).
    limit: "10",
    proximity: `${cerca.lng},${cerca.lat}`,
    types: "poi,address",
  });
  // Acota a la ciudad de contexto cuando se conoce (OL-100, caso "Galeana #423, S.L.P."); nunca un país entero.
  if (bbox) p.set("bbox", bbox.join(","));
  return `${BASE}/suggest?${p.toString()}`;
}

export function urlRecuperar(mapboxId: string, token: string, sesion: string): string {
  const p = new URLSearchParams({ access_token: token, session_token: sesion, language: "es" });
  return `${BASE}/retrieve/${encodeURIComponent(mapboxId)}?${p.toString()}`;
}

type RespuestaSugerir = {
  suggestions?: Array<{ mapbox_id?: string; name?: string; full_address?: string; place_formatted?: string; address?: string; poi_category?: string[]; feature_type?: string; distance?: number; context?: Contexto }>;
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
      ciudad: ciudadDelContexto(s.context),
      distanciaM: s.distance ?? null,
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

/**
 * Todas las que trajo Mapbox (hasta 10), ya ordenadas por distancia — sin recortar todavía (OL-100, revisión del
 * gestor): quien llama filtra por relevancia (`descartarSinCalle`) y recorta después, para no perder la buena
 * antes de mirarla.
 */
export async function sugerirLugares(q: string, token: string, cerca: Punto, sesion: string, fetchFn: FetchFn = fetch, bbox?: Bbox): Promise<LugarSugerido[]> {
  const texto = q.trim();
  if (texto.length < 3) return [];
  const res = await fetchFn(urlSugerir(texto, token, cerca, sesion, bbox));
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
  if (/\b(museo|museum)\b/.test(n) || /museum/.test(c)) return "museo";
  if (/\b(galeria|gallery)\b/.test(n) || /gallery/.test(c)) return "galeria";
  // Antes que centro cultural y teatro: "Escuela Estatal de Teatro" es escuela, no foro.
  if (/\b(escuela|academia|conservatorio|bellas artes)\b/.test(n)) return "escuela";
  if (/\b(casa de (la )?cultura|centro cultural|centro de las artes|centro de artes)\b/.test(n) || /cultural|community center|arts cent/.test(c)) return "casa_de_cultura";
  if (/\b(teatro|foro|auditorio|theater|theatre)\b/.test(n) || /theat|concert|music venue|performing/.test(c)) return "foro";
  if (/\b(colectivo|taller|cooperativa)\b/.test(n)) return "colectivo";
  return null;
}

/**
 * Lugares registrados cuyo nombre o dirección contienen TODAS las palabras del texto escrito (sin acentos ni
 * mayúsculas): la misma búsqueda que usa la pantalla completa "¿Dónde es?" (OL-173) para mezclar el directorio con
 * lo que trae Mapbox, ahora compartida con "Agregar lugar" (OL-211) — no depende de nada del alta de evento.
 */
export function lugaresPorTexto(lugares: LugarResumen[], texto: string): LugarResumen[] {
  const partes = normalizarNombre(texto).split(/\s+/).filter(Boolean);
  return lugares.filter((l) => {
    const contenido = normalizarNombre(`${l.nombre} ${l.direccion ?? ""}`);
    return partes.every((p) => contenido.includes(p));
  });
}

/** ¿El punto tiene coordenadas de verdad (nunca `NaN` ni fuera de rango)? */
export function puntoValido(p: Punto): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

/** Los helpers compartidos devuelven [] ante HTTP no-ok; aquí el fallo debe distinguirse de cero opciones. */
export async function consultarMapa(url: string, init?: RequestInit): Promise<Response> {
  const respuesta = await fetch(url, init);
  if (!respuesta.ok) throw new Error("No se pudo consultar el mapa");
  return respuesta;
}

export type ResultadoLugarRegistrado = { tipo: "lugar"; lugar: LugarResumen };
export type ResultadoMapbox = { tipo: "mapbox"; item: LugarSugerido };
/** Un renglón de la lista flotante de "¿Dónde es?" (OL-173): un lugar registrado o algo que trae Mapbox. */
export type ResultadoBusqueda = ResultadoLugarRegistrado | ResultadoMapbox;

/**
 * Lugares registrados primero (el directorio manda), luego lo que trae Mapbox (docs/rediseno/43, paso 2): ninguna
 * lista se reordena entre sí, solo se concatenan — cada una ya viene en su propio orden (`lugaresPorTexto` filtra
 * el directorio; `sugerirLugares`/`buscarConContexto` ya ordenan lo de Mapbox por relevancia y cercanía). Compartida
 * entre la pantalla completa del alta de evento (OL-173) y la de "Agregar lugar" (OL-211).
 */
export function combinarResultados(lugares: readonly LugarResumen[], mapbox: readonly LugarSugerido[]): ResultadoBusqueda[] {
  return [...lugares.map((lugar): ResultadoLugarRegistrado => ({ tipo: "lugar", lugar })), ...mapbox.map((item): ResultadoMapbox => ({ tipo: "mapbox", item }))];
}

export type ModoPantalla = "inicial" | "resultados" | "no-encontrado" | "agregar";

/**
 * Qué se muestra bajo el campo: nada al abrir, la lista con resultados, el aviso "no está registrado", o un panel
 * extra (el "Agregar lugar" del alta de evento; ninguna pantalla más lo usa todavía) — `panelExtra` es un booleano
 * genérico, sin nada específico del alta de evento adentro.
 */
export function modoDePantalla(texto: string, panelExtra: boolean, hayResultados: boolean): ModoPantalla {
  if (panelExtra) return "agregar";
  if (!texto.trim()) return "inicial";
  return hayResultados ? "resultados" : "no-encontrado";
}

/**
 * Alto del teclado en píxeles, tal como lo mide `visualViewport` (iOS): la ventana completa menos el área visible
 * y su desplazamiento. Sin `visualViewport` (navegador que no lo da), 0: la barra o el botón se quedan al pie.
 */
export function altoTeclado(altoVentana: number, visualViewport: { height: number; offsetTop: number } | null): number {
  if (!visualViewport) return 0;
  const oculto = altoVentana - visualViewport.height - visualViewport.offsetTop;
  return oculto > 1 ? Math.round(oculto) : 0;
}
