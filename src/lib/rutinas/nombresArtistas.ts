import { deducirTipoArtista, DISCIPLINAS, TIPOS_ARTISTA, type Disciplina, type TipoArtista } from "../artistas";
import { LIMITES_ARTISTA } from "../limites";
import { normalizarNombre } from "../lugares";
import { enlaceSeguro, textoLimpio } from "./candidatos";

/**
 * Lo puro de «Buscar artistas» (OL-430): cómo se reconoce que un artista ya se conoce aunque se escriba distinto, cómo se limpia lo que trae
 * una fuente y cómo queda en `propuestas.datos` con el contrato de OL-427 (`src/lib/propuestas.ts`):
 *   { nombre, disciplina, detalle?, tipo, ciudad, redes, url?, leida, municipio?, obra? }
 * `municipio` y `obra` son de esta pieza: lo que dijo la fuente de dónde trabaja y de su obra, para nutrir la ficha después («luego iremos
 * nutriendo sus fichas», el founder). La ficha que nace al aceptar es mínima: nombre, disciplina, detalle, tipo, ciudad y redes.
 */

/** Las fuentes de la hoja «Buscar artistas» (`HOJAS.artistas` de `ciudadesAdmin.ts`), en el orden del founder: los catálogos primero. */
export type ClaveArtistas = "padrones" | "festivales" | "web";
export const ORDEN_ARTISTAS: readonly ClaveArtistas[] = ["padrones", "festivales", "web"];
export const esClaveArtistas = (v: unknown): v is ClaveArtistas => ORDEN_ARTISTAS.includes(v as ClaveArtistas);

export type MotivoArtista = "ya_existe" | "ya_propuesto" | "rechazado_antes" | "fuera_de_la_ciudad" | "sin_fuente" | "de_mas";
export const MOTIVOS_ARTISTA: readonly MotivoArtista[] = ["ya_existe", "ya_propuesto", "rechazado_antes", "fuera_de_la_ciudad", "sin_fuente", "de_mas"];

/** El detalle de un artista es su especialidad («Son huasteco»): la ficha lo admite hasta 40 caracteres (`LIMITES_ARTISTA.detalle`). */
export const TOPE_DETALLE = LIMITES_ARTISTA.detalle;
export const TOPE_OBRA = 200;

// ---------- nombres ----------
/** Comillas de cualquier forma alrededor de un nombre artístico: Juan Pérez «El Chato», Ana "La Güera" Ruiz. */
const ENTRE_COMILLAS = /[«“"„'‘]\s*([^«»“”"„'‘’]{2,60}?)\s*[»”"'’]/;
/** Palabras que van delante del nombre de un grupo y no lo distinguen: «Los Camperos» es «Camperos», «Grupo Funk Tonics» es «Funk Tonics». */
const DELANTE = /^(los|las|el|la|grupo|colectivo|banda|compania|ensamble)\s+/;

/**
 * Las formas con las que se reconoce un nombre (OL-430): sin acentos ni mayúsculas; «&» como «y» y también sin la «y» («Rosa & Luna» ≈
 * «Rosa y Luna» ≈ «Rosa Luna»); el nombre artístico entre comillas solo y el nombre sin él («Juan Pérez "El Chato"» ≈ «El Chato» ≈ «Juan
 * Pérez»); y sin el artículo o la palabra de grupo del principio. Dos nombres son el mismo artista si comparten una forma.
 */
export function clavesDeNombre(nombre: string): string[] {
  const base = textoLimpio(nombre, 200).replace(/&/g, " y ");
  const formas = new Set<string>();
  const anadir = (t: string) => {
    const k = normalizarNombre(t);
    if (k.length >= 3) formas.add(k);
  };
  anadir(base);
  const apodo = base.match(ENTRE_COMILLAS);
  if (apodo) {
    anadir(apodo[1]);
    anadir(base.replace(apodo[0], " "));
  }
  for (const f of [...formas]) {
    const sinY = f.replace(/ y /g, " ");
    if (sinY !== f) formas.add(sinY);
  }
  for (const f of [...formas]) {
    const sinDelante = f.replace(DELANTE, "");
    if (sinDelante !== f && sinDelante.length >= 3) formas.add(sinDelante);
  }
  return [...formas];
}

// ---------- lo que ya se conoce en la ciudad ----------
export type ConocidosArtistas = {
  existentes: Set<string>;
  propuestos: Set<string>;
  rechazados: Set<string>;
  /** Los nombres tal como se escriben (sin repetir): lo que se le dice al modelo que ya se conoce. */
  lista: string[];
};

/** Junta los artistas de la ciudad y lo que se propuso en ella (con su estado: lo rechazado se recuerda aparte). */
export function armarConocidosArtistas(artistas: readonly { nombre: string }[], propuestas: readonly { nombre: string; estado: string }[]): ConocidosArtistas {
  const c: ConocidosArtistas = { existentes: new Set(), propuestos: new Set(), rechazados: new Set(), lista: [] };
  const vistos = new Set<string>();
  const nombrar = (n: string) => {
    const k = normalizarNombre(n);
    if (k && !vistos.has(k)) {
      vistos.add(k);
      c.lista.push(n.trim());
    }
  };
  for (const a of artistas) {
    for (const k of clavesDeNombre(a.nombre)) c.existentes.add(k);
    nombrar(a.nombre);
  }
  for (const p of propuestas) {
    for (const k of clavesDeNombre(p.nombre)) (p.estado === "rechazada" ? c.rechazados : c.propuestos).add(k);
    nombrar(p.nombre);
  }
  return c;
}

/** Por qué no se propone, sabiendo solo el nombre (o null). Lo rechazado manda: no vuelve aunque otra fuente lo traiga. */
export function motivoArtista(nombre: string, c: ConocidosArtistas): Extract<MotivoArtista, "ya_existe" | "ya_propuesto" | "rechazado_antes"> | null {
  const formas = clavesDeNombre(nombre);
  if (formas.some((k) => c.rechazados.has(k))) return "rechazado_antes";
  if (formas.some((k) => c.existentes.has(k))) return "ya_existe";
  if (formas.some((k) => c.propuestos.has(k))) return "ya_propuesto";
  return null;
}

/** Lo propuesto en esta corrida cuenta como propuesto para lo que siga (lo repetido entre fuentes no sale dos veces). */
export function marcarPropuesto(nombre: string, c: ConocidosArtistas): void {
  for (const k of clavesDeNombre(nombre)) c.propuestos.add(k);
}

// ---------- disciplina ----------
const DISCIPLINAS_VALIDAS = new Set<string>(DISCIPLINAS.map((d) => d.valor));
const TIPOS_VALIDOS = new Set<string>(TIPOS_ARTISTA.map((t) => t.valor));

/** La disciplina de la app que corresponde a cómo la escribe una fuente («Música», «Artes plásticas», «Literatura»…); si ninguna, «otro». */
export function disciplinaDeTexto(texto: string | null | undefined): Exclude<Disciplina, "por_completar"> {
  const t = normalizarNombre(texto ?? "");
  if (DISCIPLINAS_VALIDAS.has(t.replace(/ /g, "_"))) return t.replace(/ /g, "_") as Exclude<Disciplina, "por_completar">;
  if (/\b(music|musica|musical|coro|orquesta|banda|son)\b/.test(t)) return "musica";
  if (/\b(teatro|escenic|titeres|clown)/.test(t)) return "teatro";
  if (/\b(danza|baile|ballet|folclor)/.test(t)) return "danza";
  if (/\b(plastic|visual|pintura|escultura|grabado|fotograf|grafic|ilustra|arte urbano|mural)/.test(t)) return "artes_visuales";
  if (/\b(literatura|letras|poesia|narrativa|escritor|cuento|novela|ensayo)/.test(t)) return "letras";
  if (/\b(cine|audiovisual|video|documental)/.test(t)) return "cine";
  if (/\b(circo|circens|malabar|acrobac)/.test(t)) return "circo";
  return "otro";
}

// ---------- un candidato ----------
export type CandidatoArtista = {
  fuente: ClaveArtistas;
  /** El nombre con el que la bandeja agrupa lo de esta fuente («Sistema de Información Cultural», el nombre de un catálogo…). */
  nombreFuente: string;
  nombre: string;
  disciplina: Exclude<Disciplina, "por_completar">;
  detalle: string | null;
  tipo: TipoArtista;
  /** El municipio que dice la fuente, para saber si es de la ciudad (null si no lo dice). */
  municipio: string | null;
  redes: string[];
  /** La página de donde salió. */
  url: string | null;
  /** Lo que la fuente dice de su obra, en una frase propia (para nutrir la ficha después). */
  obra: string | null;
};

/** Limpia lo que llega de una fuente: textos a sus topes, disciplina y tipo de la app, enlaces seguros, sin etiquetas. Sin nombre, null. */
export function limpiarArtista(c: {
  fuente: ClaveArtistas;
  nombreFuente: string;
  nombre?: unknown;
  disciplina?: unknown;
  detalle?: unknown;
  tipo?: unknown;
  municipio?: unknown;
  redes?: unknown;
  url?: unknown;
  obra?: unknown;
}): CandidatoArtista | null {
  const nombre = textoLimpio(c.nombre, LIMITES_ARTISTA.nombre);
  if (normalizarNombre(nombre).length < 2) return null;
  const disciplina = typeof c.disciplina === "string" && DISCIPLINAS_VALIDAS.has(c.disciplina) ? (c.disciplina as CandidatoArtista["disciplina"]) : disciplinaDeTexto(typeof c.disciplina === "string" ? c.disciplina : "");
  const tipo = typeof c.tipo === "string" && TIPOS_VALIDOS.has(c.tipo) ? (c.tipo as TipoArtista) : (deducirTipoArtista(nombre) ?? "solista");
  const redes = [...new Set((Array.isArray(c.redes) ? c.redes : []).map(enlaceSeguro).filter((u): u is string => !!u))].slice(0, 8);
  return {
    fuente: c.fuente,
    nombreFuente: textoLimpio(c.nombreFuente, 120) || "Búsqueda web",
    nombre,
    disciplina,
    detalle: textoLimpio(c.detalle, TOPE_DETALLE) || null,
    tipo,
    municipio: textoLimpio(c.municipio, 80) || null,
    redes,
    url: enlaceSeguro(c.url),
    obra: textoLimpio(c.obra, TOPE_OBRA) || null,
  };
}

/** `propuestas.datos` de un artista (la ciudad, con su NOMBRE: así la lee `entradaDeArtista` al aceptar). */
export function datosDeArtista(c: CandidatoArtista, ciudadNombre: string, leida: string): Record<string, unknown> {
  const datos: Record<string, unknown> = { nombre: c.nombre, disciplina: c.disciplina, tipo: c.tipo, ciudad: ciudadNombre, redes: c.redes, leida };
  if (c.detalle) datos.detalle = c.detalle;
  if (c.url) datos.url = c.url;
  if (c.municipio) datos.municipio = c.municipio;
  if (c.obra) datos.obra = c.obra;
  return datos;
}

/**
 * Para la búsqueda web, las dos disciplinas con menos artistas en la ciudad (las que más faltan), en este orden cuando empatan. Así dos
 * búsquedas llenan los huecos en vez de repetir lo que ya abunda.
 */
const ORDEN_WEB: readonly Exclude<Disciplina, "por_completar" | "otro">[] = ["musica", "artes_visuales", "teatro", "danza", "letras", "cine", "circo"];
export function disciplinasQueFaltan(disciplinas: readonly string[], n = 2): Exclude<Disciplina, "por_completar" | "otro">[] {
  const cuenta = new Map<string, number>();
  for (const d of disciplinas) cuenta.set(d, (cuenta.get(d) ?? 0) + 1);
  return [...ORDEN_WEB].sort((a, b) => (cuenta.get(a) ?? 0) - (cuenta.get(b) ?? 0) || ORDEN_WEB.indexOf(a) - ORDEN_WEB.indexOf(b)).slice(0, n);
}
