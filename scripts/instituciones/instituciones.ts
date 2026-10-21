/**
 * Instituciones culturales de San Luis Potosí investigadas a mano (museos, casas de cultura, teatros, escuelas,
 * galerías, bibliotecas…) para darlas de alta como lugares. Funciones puras; las llamadas viven en importar.ts.
 */
import type { Punto } from "../../src/lib/cargaEventos";
import { normalizarNombre, TIPOS, type Tipo } from "../../src/lib/lugares";

// La lógica de carga de eventos y de puntos vive en src/lib/cargaEventos.ts (OL-429: la usa también el servidor); aquí se reexporta para los
// importadores y sus pruebas.
export {
  elegirPunto,
  finLocal,
  formularioDeEvento,
  metrosEntre,
  mismaCalleYNumero,
  nombresCoinciden,
  parecidoGuardado,
  resolverLugar,
  titulosDelMismoEvento,
  type Eleccion,
  type EventoGuardado,
  type EventoPropuesto,
  type Punto,
  type PuntoEncontrado as Candidato,
} from "../../src/lib/cargaEventos";

/** Una institución revisada, lista para importar. */
export type Institucion = {
  nombre: string;
  alias?: string[];
  /** Lo que es según la investigación: museo, casa_de_cultura, centro_cultural, teatro, cine, escuela, galeria, biblioteca, libreria, espacio_independiente, colectivo, otro. */
  categoria: string;
  /** Tipo de la app cuando la categoría no basta (un espacio independiente que en realidad es colectivo). */
  tipo?: Tipo;
  operador?: string | null;
  direccion: string;
  descripcion: string;
  enlaces: string[];
  /** Coordenadas que dio una fuente: se contrastan con Mapbox, no se creen solas. */
  lat?: number | null;
  lng?: number | null;
  fuentes: string[];
};

/** De la categoría de la investigación al tipo de la app; lo que no está aquí (librería, archivo…) va con Otro. */
const TIPO_POR_CATEGORIA: Record<string, Tipo> = {
  museo: "museo",
  escuela: "escuela",
  galeria: "galeria",
  casa_de_cultura: "casa_de_cultura",
  centro_cultural: "casa_de_cultura",
  teatro: "foro",
  cine: "foro",
  espacio_independiente: "foro",
  colectivo: "colectivo",
  biblioteca: "biblioteca",
};

export function tipoDeInstitucion(i: Pick<Institucion, "categoria" | "tipo">): Tipo {
  if (i.tipo && TIPOS.some((t) => t.valor === i.tipo)) return i.tipo;
  return TIPO_POR_CATEGORIA[i.categoria] ?? "otro";
}

/** Caja de la ciudad y Soledad (la misma del importador del CAPO): sin ella Mapbox se va a otros municipios. */
export const CAJA_CIUDAD = { oeste: -101.1, sur: 22.0, este: -100.85, norte: 22.3 } as const;

export function enCiudad(p: Punto): boolean {
  return p.lat >= CAJA_CIUDAD.sur && p.lat <= CAJA_CIUDAD.norte && p.lng >= CAJA_CIUDAD.oeste && p.lng <= CAJA_CIUDAD.este;
}

/** "Av. Carranza 1815, Tequisquiapan, 78250 San Luis Potosí, S.L.P." → "Av. Carranza 1815, Tequisquiapan, 78250": la ciudad va en la caja. */
export function direccionParaBuscar(direccion: string): string {
  const partes = direccion
    .split(",")
    .map((p) => p.replace(/san luis potos[ií](?![a-z])/gi, "").trim())
    .filter(Boolean);
  while (partes.length > 1 && /^(s\.?\s?l\.?\s?p\.?|m[eé]xico)$/i.test(partes.at(-1) ?? "")) partes.pop();
  return partes.join(", ");
}

/** La respuesta tiene que hablar de la misma calle: la primera palabra larga de la dirección debe aparecer en ella (criterio del CAPO). */
export function mismaCalle(pedida: string, devuelta: string): boolean {
  const palabra = normalizarNombre(pedida)
    .split(" ")
    .find((w) => w.length >= 4 && !/^(calle|avenida|av|prol|prolongacion|blvd|boulevard|plan)$/.test(w));
  return !palabra || normalizarNombre(devuelta).includes(palabra);
}

// ---------------------------------------------------------------- Cargas históricas (OL-424)

/** Lo que dice de dónde sale una carga: `--origen`, `--fuente` y `--historico`. */
export type OpcionesCarga = { historico: boolean; origen: string | null; fuente: string | null };

/** El origen como lo guarda la base (`eventos_origen_valido`): minúsculas, números y guiones, hasta 60. */
export const ORIGEN_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Lee `--origen <texto>`, `--fuente <url>` y `--historico` de la línea de órdenes. Con `--historico` los dos primeros son obligatorios: una
 * carga de eventos pasados tiene que decir de qué agenda salió («agenda-secult-2026-01») y dónde se leyó (la URL del PDF). Sin él son opcionales.
 */
export function opcionesDeCarga(args: string[]): OpcionesCarga | { error: string } {
  const valor = (nombre: string): string | null => {
    const k = args.indexOf(`--${nombre}`);
    if (k < 0) return null;
    const v = args[k + 1];
    return v && !v.startsWith("--") ? v.trim() : "";
  };
  const historico = args.includes("--historico");
  const origen = valor("origen");
  const fuente = valor("fuente");
  if (origen === "") return { error: "--origen va seguido del origen (ej. agenda-secult-2026-01)." };
  if (fuente === "") return { error: "--fuente va seguido de la dirección del documento (ej. https://…/enero.pdf)." };
  if (historico && (!origen || !fuente)) return { error: "Con --historico van --origen <texto> y --fuente <url>: una carga del pasado dice de dónde salió." };
  if (origen && (origen.length > 60 || !ORIGEN_VALIDO.test(origen))) return { error: `El origen «${origen}» no vale: minúsculas, números y guiones, hasta 60 (ej. agenda-secult-2026-01).` };
  if (fuente && (fuente.length > 500 || !/^https?:\/\/\S+$/i.test(fuente))) return { error: `La fuente «${fuente}» no vale: una dirección que empiece con http:// o https://.` };
  return { historico, origen, fuente };
}

