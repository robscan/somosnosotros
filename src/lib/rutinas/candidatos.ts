import { LIMITES_LUGAR } from "../limites";
import { TIPOS, type Tipo } from "../lugares";
import { urlSegura } from "../propuestas";

/**
 * Un candidato a lugar, tal como lo deja una fuente de «Buscar lugares» (OL-428), y cómo se vuelve `propuestas.datos` con el contrato de
 * OL-427 (`src/lib/propuestas.ts`): { nombre, tipo, detalle?, direccion?, lat, lng, ciudad, redes, url, leida }.
 *
 * `ciudad` lleva el NOMBRE de la ciudad («San Luis Potosí»), no su slug: así lo lee `entradaDeLugar` al aceptar y así se guarda en
 * `lugares.ciudad`; el slug ya está en la corrida. `detalle` es una frase corta y propia (nunca copiada de la fuente) de hasta 60 caracteres:
 * en un lugar de tipo «Otro» es lo que la ficha dice después de «Otro · » (por eso el tope), en los demás tipos la ficha no la usa.
 */

export type ClaveFuente = "sic" | "cultura" | "web";
export const CLAVES_FUENTE: readonly ClaveFuente[] = ["sic", "cultura", "web"];
export const esClaveFuente = (v: unknown): v is ClaveFuente => CLAVES_FUENTE.includes(v as ClaveFuente);

/** El nombre de cada fuente en la bandeja (`propuestas.fuente`): el mismo con el que se agrupan y se reconocen sus tandas aceptadas. */
export const NOMBRE_FUENTE: Record<ClaveFuente, string> = {
  sic: "Sistema de Información Cultural",
  cultura: "Cultura del estado y del municipio",
  web: "Búsqueda web",
};

export type Candidato = {
  fuente: ClaveFuente;
  nombre: string;
  tipo: Tipo;
  detalle: string | null;
  direccion: string | null;
  /** El municipio que dice la fuente, para saber si es de la ciudad. */
  municipio: string | null;
  /** El punto que trae la fuente, si lo trae (el SIC sí; la búsqueda web no). */
  lat: number | null;
  lng: number | null;
  redes: string[];
  /** La página de donde salió. */
  url: string | null;
};

const TIPOS_VALIDOS = new Set<string>(TIPOS.map((t) => t.valor));
const texto = (v: unknown, tope: number): string => (typeof v === "string" ? v.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim().slice(0, tope) : "");
const coordenada = (v: unknown, limite: number): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(x) && x !== 0 && Math.abs(x) <= limite ? x : null;
};

/** Un enlace de redes o sitio: con o sin «https://», solo http(s) y con un dominio de verdad. */
export function enlaceSeguro(v: unknown): string | null {
  const t = texto(v, 300);
  if (!t || /\s/.test(t)) return null;
  const conProtocolo = /^https?:\/\//i.test(t) ? t : /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(t) ? `https://${t}` : "";
  const url = urlSegura(conProtocolo);
  if (!url) return null;
  const host = new URL(url).hostname;
  return host.includes(".") ? url : null;
}

/** Limpia lo que llega de una fuente: textos cortados a sus topes, tipo de los de la app (si no, «Otro»), enlaces seguros. Sin nombre, null. */
export function limpiarCandidato(c: {
  fuente: ClaveFuente;
  nombre?: unknown;
  tipo?: unknown;
  detalle?: unknown;
  direccion?: unknown;
  municipio?: unknown;
  lat?: unknown;
  lng?: unknown;
  redes?: unknown;
  url?: unknown;
}): Candidato | null {
  const nombre = texto(c.nombre, LIMITES_LUGAR.nombre);
  if (nombre.length < 3) return null;
  const tipo = typeof c.tipo === "string" && TIPOS_VALIDOS.has(c.tipo) ? (c.tipo as Tipo) : "otro";
  const lat = coordenada(c.lat, 90);
  const lng = coordenada(c.lng, 180);
  const redes = [...new Set((Array.isArray(c.redes) ? c.redes : []).map(enlaceSeguro).filter((u): u is string => !!u))].slice(0, 8);
  return {
    fuente: c.fuente,
    nombre,
    tipo,
    detalle: texto(c.detalle, LIMITES_LUGAR.detalle) || null,
    direccion: texto(c.direccion, LIMITES_LUGAR.direccion) || null,
    municipio: texto(c.municipio, 80) || null,
    lat: lat !== null && lng !== null ? lat : null,
    lng: lat !== null && lng !== null ? lng : null,
    redes,
    url: enlaceSeguro(c.url),
  };
}

/** `propuestas.datos` de un lugar ya ubicado. */
export function datosDePropuesta(c: Candidato, punto: { lat: number; lng: number }, ciudadNombre: string, leida: string): Record<string, unknown> {
  const datos: Record<string, unknown> = {
    nombre: c.nombre,
    tipo: c.tipo,
    lat: Math.round(punto.lat * 1e6) / 1e6,
    lng: Math.round(punto.lng * 1e6) / 1e6,
    ciudad: ciudadNombre,
    redes: c.redes,
    leida,
  };
  if (c.detalle) datos.detalle = c.detalle;
  if (c.direccion) datos.direccion = c.direccion;
  if (c.url) datos.url = c.url;
  return datos;
}
