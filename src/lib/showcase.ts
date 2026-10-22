import { DISCIPLINAS, etiquetaDisciplina } from "./artistas";
import { normalizarRedes } from "./enlaces";
import { normalizarNombre } from "./lugares";
import { corridasVaradas, type CorridaVista } from "./rutinas/rescate";
import { ORIGEN } from "./sitemap";
import { BLOQUES, leerFiltros, pasa, SIN_FILTROS, type EstadoInvestigacion, type Filtros, type Hechos } from "./showcaseFiltros";

/**
 * Administración › Showcase (OL-426, bitácora 459; lo firmado en OL-425, bitácora 458). Lógica pura: la rúbrica, la píldora de actividad, el
 * orden y los filtros de la lista de candidatos, sus cifras de la base, el CSV para el consejo y la lectura del CSV de redes. Nada de aquí lee la
 * base ni sale de Administración: las notas y los puntajes son juicios sobre personas (§4.3 de la investigación del 20 de octubre).
 * OL-437 (bitácora 469): la base propone sola el puntaje de circulación, actividad y vínculo, y el de obra con las evidencias aceptadas; lo fijado
 * a mano manda y, sin fijado ni propuesta, la señal queda «sin datos» (no es un 0).
 */

// ---------- estados ----------
export const ESTADOS = [
  { valor: "candidato", etiqueta: "Candidato", detalle: "Todavía sin revisar" },
  { valor: "revisado", etiqueta: "Revisado", detalle: "Alguien leyó sus evidencias" },
  { valor: "invitado", etiqueta: "Invitado", detalle: "Se le escribió para el showcase" },
  { valor: "confirmado", etiqueta: "Confirmado", detalle: "Aceptó la invitación" },
  { valor: "descartado", etiqueta: "Descartado", detalle: "No sigue; se puede volver" },
] as const;
export type Estado = (typeof ESTADOS)[number]["valor"];

export function esEstado(v: unknown): v is Estado {
  return ESTADOS.some((e) => e.valor === v);
}
export function etiquetaEstado(e: Estado): string {
  return ESTADOS.find((x) => x.valor === e)?.etiqueta ?? "Candidato";
}

// ---------- la rúbrica ----------
/** Las cuatro señales con su línea de ayuda por puntaje (investigación del 20 de octubre, §3.2 de la página privada del showcase). */
export const SENALES = [
  { clave: "circulacion", etiqueta: "Circulación", titulo: "Circulación", corta: "Circ.", niveles: ["Un foro o ninguno", "De 2 a 3 foros, o un festival", "4 foros o más, o un festival y fechas fuera de San Luis"] },
  { clave: "obra", etiqueta: "Obra", titulo: "Obra y reconocimiento", corta: "Obra", niveles: ["Nada verificable", "Obra publicada o expuesta en los últimos 24 meses", "Además, beca, premio, residencia o selección oficial"] },
  { clave: "actividad", etiqueta: "Actividad", titulo: "Actividad", corta: "Act.", niveles: ["Más de 90 días sin publicar", "Publica cada mes", "Publica cada semana y anuncia sus fechas"] },
  { clave: "vinculo", etiqueta: "Vínculo", titulo: "Vínculo con la app", corta: "Víncu.", niveles: ["Sin ficha propia", "Ficha reclamada", "Con novedades o portada"] },
] as const;
export type Senal = (typeof SENALES)[number]["clave"];
/** 0, 1 o 2; null = todavía sin puntuar (no es un 0). */
export type Puntaje = 0 | 1 | 2 | null;
export type Puntajes = Record<Senal, Puntaje>;
export const SIN_PUNTAJES: Puntajes = { circulacion: null, obra: null, actividad: null, vinculo: null };

/** Pasan al consejo con 5 de 8 (lo firmado en OL-425). */
export const UMBRAL_CONSEJO = 5;
export const MAXIMO_RUBRICA = 8;

export function esSenal(v: unknown): v is Senal {
  return SENALES.some((s) => s.clave === v);
}
export function esPuntaje(v: unknown): v is Puntaje {
  return v === null || v === 0 || v === 1 || v === 2;
}
/** La suma de la rúbrica: lo que no tiene puntaje cuenta 0. */
export function sumaRubrica(p: Puntajes): number {
  return SENALES.reduce((n, s) => n + (p[s.clave] ?? 0), 0);
}
/** Cuántos pasan al consejo: los que llegan a 5 de 8 con el puntaje que vale de cada señal; los descartados no pasan. */
export function pasanAlConsejo(lista: readonly { estado: Estado; suma: number }[]): number {
  return lista.filter((c) => c.estado !== "descartado" && c.suma >= UMBRAL_CONSEJO).length;
}
/** Cuántas señales ya tienen puntaje. */
export function puntuadas(p: Puntajes): number {
  return SENALES.filter((s) => p[s.clave] !== null).length;
}
/** Lo que dice la rúbrica de una señal con su puntaje (la línea de ayuda), o «Sin puntuar». */
export function nivelDe(senal: Senal, p: Puntaje): string {
  if (p === null) return "Sin puntuar";
  return SENALES.find((s) => s.clave === senal)!.niveles[p];
}

// ---------- la actividad en redes ----------
export type Actividad = { clave: "semana" | "mes" | "inactivo"; texto: string };
/** Hasta 10 días desde la última publicación, activo; hasta 45, publica cada mes; si no, inactivo. Sin lectura, nada. `hoy`, YYYY-MM-DD. */
export function actividadDe(ultima: string | null, hoy: string): Actividad | null {
  if (!ultima) return null;
  const dias = Math.max(0, diasEntre(ultima.slice(0, 10), hoy));
  if (dias <= 10) return { clave: "semana", texto: "Publica cada semana" };
  if (dias <= 45) return { clave: "mes", texto: "Publica cada mes" };
  return { clave: "inactivo", texto: "Sin publicar en 45 días" };
}

// ---------- números y fechas en palabras ----------
/** Días enteros de `desde` a `hasta` (YYYY-MM-DD). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);
}
/** «hoy», «ayer» o «hace 4 días». */
export function haceDias(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}
/** 3200 → «3,2 mil»; 980 → «980»; 1 250 000 → «1,3 millones». */
export function miles(n: number): string {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(".", ",").replace(/,0$/, "");
    return `${v} ${v === "1" ? "millón" : "millones"}`;
  }
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",").replace(/,0$/, "")} mil`;
  return String(n);
}
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** «12 sep» (y el año si no es el de `hoy`: «12 sep 2025»), de un día YYYY-MM-DD. */
export function diaMes(dia: string, hoy: string): string {
  const [a, m, d] = dia.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]}${String(a) === hoy.slice(0, 4) ? "" : ` ${a}`}`;
}
/** La primera línea de las notas, para la tarjeta y el CSV. */
export function primeraLinea(notas: string | null | undefined): string | null {
  const l = (notas ?? "").split(/\r?\n/).map((x) => x.trim()).find(Boolean);
  return l ?? null;
}

// ---------- las redes ----------
export const REDES = [
  { valor: "instagram", etiqueta: "Instagram" },
  { valor: "facebook", etiqueta: "Facebook" },
  { valor: "youtube", etiqueta: "YouTube" },
  { valor: "spotify", etiqueta: "Spotify" },
  { valor: "otra", etiqueta: "Otra red" },
] as const;
export type Red = (typeof REDES)[number]["valor"];
export function esRed(v: unknown): v is Red {
  return REDES.some((r) => r.valor === v);
}
export function etiquetaRed(r: Red): string {
  return REDES.find((x) => x.valor === r)?.etiqueta ?? "Otra red";
}
export type Lectura = { red: Red; seguidores: number | null; publicaciones: number | null; ultima_publicacion: string | null; leido_en: string };
/** La última lectura de cada red (la más reciente primero). */
export function ultimasPorRed(lecturas: readonly Lectura[]): Lectura[] {
  const porRed = new Map<Red, Lectura>();
  for (const l of [...lecturas].sort((a, b) => b.leido_en.localeCompare(a.leido_en))) if (!porRed.has(l.red)) porRed.set(l.red, l);
  return [...porRed.values()];
}
/** La red que se enseña en la tarjeta: de las últimas lecturas, la de más seguidores (empate: la más reciente). */
export function redPrincipal(lecturas: readonly Lectura[]): Lectura | null {
  const ultimas = ultimasPorRed(lecturas);
  return ultimas.reduce<Lectura | null>((mejor, l) => (!mejor || (l.seguidores ?? -1) > (mejor.seguidores ?? -1) ? l : mejor), null);
}
/** «3,2 mil seguidores · 412 publicaciones · última hace 2 días» (lo que haya). */
export function textoLectura(l: Lectura, hoy: string, articulo = false): string {
  const partes = [
    l.seguidores !== null && `${miles(l.seguidores)} ${l.seguidores === 1 ? "seguidor" : "seguidores"}`,
    l.publicaciones !== null && `${l.publicaciones} ${l.publicaciones === 1 ? "publicación" : "publicaciones"}`,
    l.ultima_publicacion && `${articulo ? "la última" : "última"} ${haceDias(diasEntre(l.ultima_publicacion, hoy))}`,
  ];
  return partes.filter(Boolean).join(" · ");
}

// ---------- lo que la lista lee de la base ----------
export type FilaArtista = { id: string; slug: string | null; nombre: string; disciplina: string; ciudad: string; foto: string | null; redes: unknown; portada?: string | null; tipo?: string | null };
export type FilaCandidato = { artista_id: string; estado: Estado; puntaje_circulacion: Puntaje; puntaje_obra: Puntaje; puntaje_actividad: Puntaje; puntaje_vinculo: Puntaje; notas: string | null; actualizado_en?: string | null };
export type FilaLectura = Lectura & { artista_id: string };
export type FilaEvento = { id: string; titulo: string; slug: string | null; lugar_id: string | null; evento_padre_id: string | null; clase: string | null; inicio: string; ciudad: string | null };
export type FilaEventoArtista = { evento_id: string; artista_id: string };
export type FilaLugar = { id: string; nombre: string; slug: string | null };
export type FilasShowcase = {
  artistas: FilaArtista[];
  candidatos: FilaCandidato[];
  lecturas: FilaLectura[];
  /** Los eventos visibles, publicados y sin cancelar del año. */
  eventos: FilaEvento[];
  eventos_artistas: FilaEventoArtista[];
  lugares: FilaLugar[];
  /** Los festivales de esos actos que no salen en `eventos` (el marco puede ser de otro año). */
  festivales?: Pick<FilaEvento, "id" | "titulo">[];
  /** OL-437: las fichas reclamadas (`artistas_cuentas`) y las que tienen novedades visibles, para proponer el vínculo. */
  cuentas?: { artista_id: string }[];
  novedades?: { artista_id: string }[];
  /** OL-437: las evidencias aceptadas de obra, para proponer la obra. */
  evidencias?: FilaEvidencia[];
};
export type FilaEvidencia = EvidenciaBreve & { artista_id: string };

/** Un renglón de la lista: lo del catálogo, lo del showcase y lo que se cuenta en la base. */
export type Candidato = {
  id: string;
  slug: string;
  nombre: string;
  disciplina: string;
  ciudad: string;
  foto: string | null;
  instagram: string | null;
  estado: Estado;
  /** OL-439: tiene fila en `showcase_candidatos` (alguien lo marcó o lo trabajó en el showcase); sin fila es candidato implícito. */
  marcado: boolean;
  /** Cada señal con lo fijado a mano, lo propuesto por la base y el puntaje que vale (OL-437). */
  valores: Valores;
  /** La suma de lo que vale. */
  suma: number;
  nota: string | null;
  eventos: number;
  foros: number;
  festivales: number;
  /** Los foros y festivales que lo programan, del que más al que menos. */
  programadoPor: string[];
  redes: Lectura | null;
  /** OL-446: para filtrar. La ficha la lleva alguien (cuenta vinculada), solista, grupo o colectivo, y la última publicación en cualquier red. */
  reclamada: boolean;
  tipo: string;
  ultimaPublicacion: string | null;
};

const puntajesDe = (c: FilaCandidato | undefined): Puntajes =>
  c ? { circulacion: c.puntaje_circulacion, obra: c.puntaje_obra, actividad: c.puntaje_actividad, vinculo: c.puntaje_vinculo } : { ...SIN_PUNTAJES };

/** Lo que la base dice de la circulación de un artista en el año: sus eventos, en cuántos foros y festivales, y quién lo programa. */
export type Circulacion = { eventos: number; foros: number; festivales: number; programadoPor: string[]; fuera: number };
export function circulacionDe(eventos: readonly FilaEvento[], lugares: ReadonlyMap<string, FilaLugar>, festivales: ReadonlyMap<string, string>, ciudad: string): Circulacion {
  const porLugar = new Map<string, number>();
  const porFestival = new Map<string, number>();
  let actos = 0;
  let fuera = 0;
  for (const e of eventos) {
    const marco = e.evento_padre_id ?? (e.clase === "festival" ? e.id : null);
    if (marco) porFestival.set(marco, (porFestival.get(marco) ?? 0) + 1);
    if (e.clase === "festival" && !e.evento_padre_id) continue; // el marco de un festival no es una fecha: cuenta como festival
    actos++;
    if (e.lugar_id) porLugar.set(e.lugar_id, (porLugar.get(e.lugar_id) ?? 0) + 1);
    if (e.ciudad && ciudad && normalizarNombre(e.ciudad) !== normalizarNombre(ciudad)) fuera++;
  }
  const nombres = [
    ...[...porLugar].map(([id, n]) => ({ nombre: lugares.get(id)?.nombre ?? null, n })),
    ...[...porFestival].map(([id, n]) => ({ nombre: festivales.get(id) ?? null, n })),
  ]
    .filter((x): x is { nombre: string; n: number } => !!x.nombre)
    .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"));
  return { eventos: actos, foros: porLugar.size, festivales: porFestival.size, programadoPor: nombres.map((x) => x.nombre), fuera };
}

/**
 * Arma la lista de candidatos con lo leído: un renglón por artista visible (sin fila en el showcase, candidato implícito). Cada señal lleva lo que
 * propone la base con lo leído (OL-437) y lo que vale: lo fijado a mano o, si no, lo propuesto. `hoy`, YYYY-MM-DD en la ciudad.
 */
export function armarCandidatos(f: FilasShowcase, hoy: string): Candidato[] {
  const candidatos = new Map(f.candidatos.map((c) => [c.artista_id, c]));
  const lugares = new Map(f.lugares.map((l) => [l.id, l]));
  const eventos = new Map(f.eventos.map((e) => [e.id, e]));
  const festivales = new Map<string, string>([...(f.festivales ?? []), ...f.eventos.filter((e) => e.clase === "festival")].map((e) => [e.id, e.titulo]));
  const eventosDe = new Map<string, FilaEvento[]>();
  for (const ea of f.eventos_artistas) {
    const e = eventos.get(ea.evento_id);
    if (!e) continue;
    const lista = eventosDe.get(ea.artista_id) ?? [];
    lista.push(e);
    eventosDe.set(ea.artista_id, lista);
  }
  const lecturasDe = agrupar(f.lecturas);
  const evidenciasDe = agrupar(f.evidencias ?? []);
  const reclamadas = new Set((f.cuentas ?? []).map((c) => c.artista_id));
  const conNovedades = new Set((f.novedades ?? []).map((n) => n.artista_id));
  return f.artistas.map((a) => {
    const c = candidatos.get(a.id);
    const circ = circulacionDe(eventosDe.get(a.id) ?? [], lugares, festivales, a.ciudad);
    const lecturas = lecturasDe.get(a.id) ?? [];
    const propuestas = propuestasDe(
      { circulacion: circ, ciudad: a.ciudad, evidencias: evidenciasDe.get(a.id) ?? [], lecturas, reclamada: reclamadas.has(a.id), novedades: conNovedades.has(a.id), portada: !!a.portada },
      hoy,
    );
    const valores = valoresDe(puntajesDe(c), propuestas);
    return {
      id: a.id,
      slug: a.slug || a.id,
      nombre: a.nombre,
      disciplina: a.disciplina,
      ciudad: a.ciudad,
      foto: a.foto,
      instagram: normalizarRedes(a.redes).find((e) => e.red === "instagram")?.url ?? null,
      estado: c?.estado ?? "candidato",
      marcado: !!c,
      valores,
      suma: sumaValores(valores),
      nota: primeraLinea(c?.notas),
      eventos: circ.eventos,
      foros: circ.foros,
      festivales: circ.festivales,
      programadoPor: circ.programadoPor,
      redes: redPrincipal(lecturas),
      reclamada: reclamadas.has(a.id),
      tipo: a.tipo || "solista",
      ultimaPublicacion: ultimaPublicacionDe(lecturas),
    };
  });
}
/** La última publicación (YYYY-MM-DD) en cualquiera de sus redes, de la última lectura de cada una; null si ninguna lo dice. */
export function ultimaPublicacionDe(lecturas: readonly Lectura[]): string | null {
  return ultimasPorRed(lecturas).reduce<string | null>((m, l) => (l.ultima_publicacion && (!m || l.ultima_publicacion > m) ? l.ultima_publicacion.slice(0, 10) : m), null);
}
/** Las filas de cada artista. */
function agrupar<T extends { artista_id: string }>(filas: readonly T[]): Map<string, T[]> {
  const por = new Map<string, T[]>();
  for (const f of filas) {
    const lista = por.get(f.artista_id);
    if (lista) lista.push(f);
    else por.set(f.artista_id, [f]);
  }
  return por;
}

// ---------- la vista de la lista: filtros, orden y página en la URL ----------
export const ORDENES = [
  { valor: "puntaje", etiqueta: "Puntaje", detalle: "Suma de las cuatro señales; empate, convocatoria" },
  { valor: "convocatoria", etiqueta: "Convocatoria", detalle: "Cuántos foros y festivales lo programan" },
  { valor: "seguidores", etiqueta: "Seguidores", detalle: "La última lectura de sus redes" },
  { valor: "ultima", etiqueta: "Última publicación", detalle: "Lo más reciente primero" },
  { valor: "nombre", etiqueta: "Nombre", detalle: "De la A a la Z" },
] as const;
export type Orden = (typeof ORDENES)[number]["valor"];
/** La vista de la lista: la búsqueda, los filtros de la hoja (OL-446, `showcaseFiltros`), el orden, tarjetas o tabla y cuántas se ven. */
export type Vista = Filtros & { q: string | null; orden: Orden; tabla: boolean; n: number };
/** Cuántas tarjetas se ven de entrada (diez, como el prototipo) y cuántas filas de la tabla; «Ver más» suma otra página. */
export const PAGINA_TARJETAS = 10;
export const PAGINA_TABLA = 50;
const TOPE_PAGINA = 1000;
export const paginaDe = (tabla: boolean) => (tabla ? PAGINA_TABLA : PAGINA_TARJETAS);

/** Lo que se lee de la URL de la lista: la búsqueda, los filtros, el orden, la vista y la página. */
export type ConsultaVista = { q?: string; orden?: string; vista?: string; n?: string } & Partial<Record<keyof Filtros, string>>;

/** Lee la vista de la URL con valores seguros (lo que no existe vale lo de siempre). */
export function leerVista(p: ConsultaVista): Vista {
  const tabla = p.vista === "tabla";
  const pagina = paginaDe(tabla);
  const n = Number(p.n);
  const f = leerFiltros(p);
  return {
    q: p.q?.trim().slice(0, 80) || null,
    ...f,
    estado: esEstado(f.estado) ? f.estado : "todos",
    orden: ORDENES.some((o) => o.valor === p.orden) ? (p.orden as Orden) : "puntaje",
    tabla,
    n: Number.isInteger(n) && n > pagina ? Math.min(Math.ceil(n / pagina) * pagina, TOPE_PAGINA) : pagina,
  };
}
/** La consulta de una vista, sin lo que vale por defecto. */
export function consultaDe(v: Partial<Vista>): string {
  const p = new URLSearchParams();
  if (v.q?.trim()) p.set("q", v.q.trim());
  // Los filtros de la hoja, en el orden de sus bloques; lo que vale «sin filtro» no se escribe.
  for (const b of BLOQUES) {
    const valor = v[b.clave];
    if (valor !== undefined && valor !== SIN_FILTROS[b.clave]) p.set(b.clave, String(valor));
  }
  if (v.orden && v.orden !== "puntaje") p.set("orden", v.orden);
  if (v.tabla) p.set("vista", "tabla");
  if (v.n && v.n > paginaDe(!!v.tabla)) p.set("n", String(v.n));
  return p.toString();
}
export const RUTA_SHOWCASE = "/admin/showcase";
/** «Por aprobar» (OL-446): todo lo que trajo la rutina, de todos los artistas. Con un artista, baja a su grupo. */
export const RUTA_POR_APROBAR = `${RUTA_SHOWCASE}/por-aprobar`;
export const anclaArtista = (id: string) => `a-${id}`;
export function hrefPorAprobar(artistaId?: string): string {
  return artistaId ? `${RUTA_POR_APROBAR}#${anclaArtista(artistaId)}` : RUTA_POR_APROBAR;
}
export function hrefShowcase(v: Partial<Vista>): string {
  const c = consultaDe(v);
  return c ? `${RUTA_SHOWCASE}?${c}` : RUTA_SHOWCASE;
}
/** La ficha de showcase por la dirección del artista; si su dirección es la del manual o la de «Por aprobar», por su id. */
export function hrefFicha(c: Pick<Candidato, "slug" | "id">): string {
  return `${RUTA_SHOWCASE}/${c.slug === "manual" || c.slug === "por-aprobar" ? c.id : encodeURIComponent(c.slug)}`;
}

/**
 * Lo que la lista sabe de las investigaciones para filtrar (OL-446): cómo va la de cada artista y cuántas evidencias deja por revisar. Sin él (o
 * con `investigacion` null: no se pudieron leer), el filtro «Investigación» no deja fuera a nadie.
 */
export type ContextoFiltro = { hoy: string; investigacion?: ReadonlyMap<string, EstadoInvestigacion> | null; porRevisar?: Readonly<Record<string, number>> };
/** Lo que hace falta de un candidato para filtrarlo (y para contar los chips de la hoja en el teléfono). */
export function hechosDe(c: Candidato, ctx?: Omit<ContextoFiltro, "hoy">): Hechos {
  return {
    id: c.id,
    nombre: c.nombre,
    disciplina: c.disciplina,
    estado: c.estado,
    suma: c.suma,
    reclamada: c.reclamada,
    eventos: c.eventos,
    foros: c.foros,
    festivales: c.festivales,
    tipo: c.tipo,
    ultima: c.ultimaPublicacion,
    inv: ctx?.investigacion ? (ctx.investigacion.get(c.id) ?? "nunca") : null,
    revisar: ctx?.porRevisar?.[c.id] ?? 0,
  };
}
/** Busca por nombre sin acentos ni mayúsculas y aplica los filtros puestos (se combinan con «y»). Lo que no viene vale «sin filtro». */
export function filtrarCandidatos(lista: readonly Candidato[], v: Pick<Vista, "q" | "disciplina" | "estado"> & Partial<Filtros>, ctx?: ContextoFiltro): Candidato[] {
  const f = { ...SIN_FILTROS, ...v } as Filtros;
  const hoy = ctx?.hoy ?? new Date().toISOString().slice(0, 10);
  return lista.filter((c) => pasa(hechosDe(c, ctx), f, hoy, v.q));
}
/** Convocatoria: cuántos foros y festivales lo programan. */
export const convocatoria = (c: Pick<Candidato, "foros" | "festivales">) => c.foros + c.festivales;
const porNombre = (a: Candidato, b: Candidato) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
/** Lo vacío al final, en cualquier orden. */
const conVacios = (a: number | null, b: number | null, mayorPrimero: boolean) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : mayorPrimero ? b - a : a - b);
const ORDEN: Record<Orden, (a: Candidato, b: Candidato) => number> = {
  puntaje: (a, b) => b.suma - a.suma || convocatoria(b) - convocatoria(a) || b.eventos - a.eventos || porNombre(a, b),
  convocatoria: (a, b) => convocatoria(b) - convocatoria(a) || b.eventos - a.eventos || b.suma - a.suma || porNombre(a, b),
  seguidores: (a, b) => conVacios(a.redes?.seguidores ?? null, b.redes?.seguidores ?? null, true) || porNombre(a, b),
  ultima: (a, b) => conVacios(fechaNum(a.redes?.ultima_publicacion), fechaNum(b.redes?.ultima_publicacion), true) || porNombre(a, b),
  nombre: porNombre,
};
function fechaNum(d: string | null | undefined): number | null {
  return d ? Date.parse(`${d.slice(0, 10)}T00:00:00Z`) : null;
}
export function ordenarCandidatos(lista: readonly Candidato[], orden: Orden): Candidato[] {
  return [...lista].sort(ORDEN[orden]);
}

/** Los chips de disciplina: «Todas» y las que tienen artistas, en el orden del catálogo, con su cuenta (de toda la lista). */
export function chipsDisciplina(lista: readonly Candidato[]): { valor: string; etiqueta: string; n: number }[] {
  const n = new Map<string, number>();
  for (const c of lista) n.set(c.disciplina, (n.get(c.disciplina) ?? 0) + 1);
  const orden = [...DISCIPLINAS.map((d) => d.valor as string), "por_completar"];
  return [{ valor: "todas", etiqueta: "Todas", n: lista.length }, ...orden.filter((d) => n.get(d)).map((d) => ({ valor: d, etiqueta: etiquetaDisciplina(d), n: n.get(d)! }))];
}
/** Cuántos hay en cada estado (para la hoja «Estado» y la línea de cifras). */
export function conteosEstado(lista: readonly Candidato[]): Record<Estado | "todos", number> {
  const c = { todos: lista.length, candidato: 0, revisado: 0, invitado: 0, confirmado: 0, descartado: 0 };
  for (const x of lista) c[x.estado]++;
  return c;
}
/**
 * «692 artistas · 7 invitados · 2 confirmados · 41 pasan al consejo con 5 de 8», o, si se filtra, «7 de 692 artistas · 5 pasan al consejo con 5
 * de 8» (lo firmado en OL-443). `pasan`, cuántos llegan a 5 de 8 con el puntaje que vale (`pasanAlConsejo`), de los que se cuentan.
 */
export function lineaCifras(total: number, conteos: Record<Estado | "todos", number>, visibles: number | null, pasan: number): string {
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  const consejo = `${plural(pasan, "pasa", "pasan")} al consejo con ${UMBRAL_CONSEJO} de ${MAXIMO_RUBRICA}`;
  if (visibles !== null) return `${visibles} de ${plural(total, "artista", "artistas")} · ${consejo}`;
  return [
    plural(total, "artista", "artistas"),
    plural(conteos.invitado, "invitado", "invitados"),
    plural(conteos.confirmado, "confirmado", "confirmados"),
    consejo,
  ].join(" · ");
}
/** «7 eventos · 4 foros · 1 festival». */
export function textoCirculacion(c: Pick<Candidato, "eventos" | "foros" | "festivales">): string {
  return `${c.eventos} ${c.eventos === 1 ? "evento" : "eventos"} · ${c.foros} ${c.foros === 1 ? "foro" : "foros"} · ${c.festivales} ${c.festivales === 1 ? "festival" : "festivales"}`;
}
/** «Teatro de la Paz, Casa de Cultura… y 2 más»: los tres que más lo programan. */
export function textoProgramadoPor(nombres: readonly string[], tope = 3): string | null {
  if (!nombres.length) return null;
  const vistos = nombres.slice(0, tope).join(", ");
  return nombres.length > tope ? `${vistos} y ${nombres.length - tope} más` : vistos;
}

// ---------- evidencias ----------
export const TIPOS_EVIDENCIA = [
  { valor: "presentacion", etiqueta: "Presentación" },
  { valor: "obra", etiqueta: "Obra" },
  { valor: "premio", etiqueta: "Premio" },
  { valor: "beca", etiqueta: "Beca" },
  { valor: "prensa", etiqueta: "Prensa" },
  { valor: "redes", etiqueta: "Redes" },
] as const;
export type TipoEvidencia = (typeof TIPOS_EVIDENCIA)[number]["valor"];
export function esTipoEvidencia(v: unknown): v is TipoEvidencia {
  return TIPOS_EVIDENCIA.some((t) => t.valor === v);
}
export function etiquetaTipo(t: TipoEvidencia): string {
  return TIPOS_EVIDENCIA.find((x) => x.valor === t)?.etiqueta ?? "Evidencia";
}
/** El tipo que se propone al abrir «Añadir evidencia» desde una señal. */
export const TIPO_DE_SENAL: Record<Senal, TipoEvidencia> = { circulacion: "presentacion", obra: "obra", actividad: "redes", vinculo: "redes" };
export const LIMITES_EVIDENCIA = { titulo: 200, url: 2000, fuente: 120 } as const;

/**
 * La dirección de una evidencia (§4.4: sin enlace no hay evidencia): http o https, un dominio de verdad (con punto y terminación de letras), sin
 * usuario ni contraseña delante del dominio y sin espacios. Devuelve la dirección normalizada o null. La base vuelve a exigirlo.
 */
export function urlEvidencia(texto: string): string | null {
  const t = texto.trim();
  if (!t || t.length > LIMITES_EVIDENCIA.url || /\s/.test(t) || !/^https?:\/\//i.test(t)) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.username || u.password) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(u.hostname)) return null;
  return u.href.length <= LIMITES_EVIDENCIA.url ? u.href : null;
}
export type DatosEvidencia = { senal: string; tipo: string; titulo: string; url: string; fecha: string; fuente: string };
export type EvidenciaValida = { senal: Senal; tipo: TipoEvidencia; titulo: string; url: string; fecha: string | null; fuente: string };
/** Lo que le falta a la evidencia para añadirse (el botón lo dice, canon de formularios), o null. */
export function faltaEvidencia(d: Pick<DatosEvidencia, "titulo" | "url">): string | null {
  if (!d.titulo.trim()) return "Falta el título";
  if (!d.url.trim()) return "Falta el enlace";
  return null;
}
/** Valida una evidencia entera; los errores van por campo, en palabras. La fuente, si falta, es el dominio del enlace. */
export function validarEvidencia(d: DatosEvidencia): { ok: true; evidencia: EvidenciaValida } | { ok: false; errores: Partial<Record<keyof DatosEvidencia, string>> } {
  const errores: Partial<Record<keyof DatosEvidencia, string>> = {};
  const titulo = d.titulo.trim().replace(/\s+/g, " ");
  if (!titulo) errores.titulo = "Escribe qué es: «Mención en un concurso estatal».";
  else if (titulo.length > LIMITES_EVIDENCIA.titulo) errores.titulo = `Hasta ${LIMITES_EVIDENCIA.titulo} letras.`;
  const url = urlEvidencia(d.url);
  if (!d.url.trim()) errores.url = "Sin enlace no hay evidencia: pega la dirección donde se lee.";
  else if (!url) errores.url = /^https?:\/\//i.test(d.url.trim()) ? "Esa dirección no se puede abrir: revisa que esté completa." : "El enlace tiene que empezar con http:// o https://.";
  const fecha = d.fecha.trim();
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errores.fecha = "Elige el día en el calendario.";
  if (!esSenal(d.senal)) errores.senal = "Elige la señal.";
  if (!esTipoEvidencia(d.tipo)) errores.tipo = "Elige el tipo.";
  const fuenteEscrita = d.fuente.trim().replace(/\s+/g, " ").slice(0, LIMITES_EVIDENCIA.fuente);
  if (Object.keys(errores).length) return { ok: false, errores };
  const fuente = fuenteEscrita || new URL(url!).hostname.replace(/^www\./, "");
  return { ok: true, evidencia: { senal: d.senal as Senal, tipo: d.tipo as TipoEvidencia, titulo, url: url!, fecha: fecha || null, fuente } };
}

// ---------- una lectura de redes a mano ----------
export type DatosLectura = { red: string; seguidores: string; publicaciones: string; ultima: string };
export type LecturaValida = { red: Red; seguidores: number | null; publicaciones: number | null; ultima_publicacion: string | null };
/** «3,200», «3.200», «3 200» y «3200» son 3 200; lo vacío es null; lo demás, NaN. */
export function entero(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  if (/^\d{1,3}([,. ]\d{3})+$/.test(t) || /^\d+$/.test(t)) return Number(t.replace(/[,. ]/g, ""));
  return Number.NaN;
}
export function validarLectura(d: DatosLectura, hoy: string): { ok: true; lectura: LecturaValida } | { ok: false; errores: Partial<Record<keyof DatosLectura, string>> } {
  const errores: Partial<Record<keyof DatosLectura, string>> = {};
  if (!esRed(d.red)) errores.red = "Elige la red.";
  const seguidores = entero(d.seguidores);
  const publicaciones = entero(d.publicaciones);
  if (Number.isNaN(seguidores) || (seguidores ?? 0) > 1_000_000_000) errores.seguidores = "Escribe solo el número: 3200.";
  if (Number.isNaN(publicaciones) || (publicaciones ?? 0) > 10_000_000) errores.publicaciones = "Escribe solo el número: 412.";
  const ultima = d.ultima.trim();
  if (ultima && !/^\d{4}-\d{2}-\d{2}$/.test(ultima)) errores.ultima = "Elige el día en el calendario.";
  else if (ultima && ultima > hoy) errores.ultima = "La última publicación no puede ser de mañana.";
  if (!Object.keys(errores).length && seguidores === null && publicaciones === null && !ultima) errores.seguidores = "Escribe al menos una cifra.";
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, lectura: { red: d.red as Red, seguidores, publicaciones, ultima_publicacion: ultima || null } };
}

// ---------- el CSV de redes (la rutina desde el Chrome de administración, o a mano) ----------
export const COLUMNAS_CSV_REDES = ["artista_slug", "red", "seguidores", "publicaciones", "ultima_publicacion", "leido_en"] as const;
export const TOPE_FILAS_CSV = 2000;
export type FilaCsvRedes = LecturaValida & { linea: number; artista_slug: string; leido_en: string | null };

/** Parte un CSV (comillas dobles, comas, saltos de línea dentro de comillas, CRLF y BOM) en filas de celdas. */
export function partirCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  const t = texto.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') comillas = false;
      else celda += c;
      continue;
    }
    if (c === '"' && !celda) comillas = true;
    else if (c === ",") {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => x.trim()));
}

/**
 * Lee el CSV de redes: la cabecera trae `artista_slug, red, seguidores, publicaciones, ultima_publicacion, leido_en` (en cualquier orden). Cada
 * fila válida sale con su número de línea; cada fila mala, con su motivo. `ahora` es el instante de la importación (lo que no trae `leido_en`
 * se leyó ahora; una lectura del futuro no entra). Nada se adivina: un slug se busca tal cual.
 */
export function leerCsvRedes(texto: string, ahora: Date): { filas: FilaCsvRedes[]; errores: { linea: number; motivo: string }[] } {
  const crudo = partirCsv(texto);
  const errores: { linea: number; motivo: string }[] = [];
  if (!crudo.length) return { filas: [], errores: [{ linea: 1, motivo: "El archivo está vacío." }] };
  const cabecera = crudo[0].map((x) => x.trim().toLowerCase());
  const falta = COLUMNAS_CSV_REDES.filter((c) => !cabecera.includes(c));
  if (falta.length) return { filas: [], errores: [{ linea: 1, motivo: `Faltan columnas en la cabecera: ${falta.join(", ")}.` }] };
  if (crudo.length - 1 > TOPE_FILAS_CSV) return { filas: [], errores: [{ linea: 1, motivo: `Hasta ${TOPE_FILAS_CSV} filas por archivo.` }] };
  const col = Object.fromEntries(COLUMNAS_CSV_REDES.map((c) => [c, cabecera.indexOf(c)])) as Record<(typeof COLUMNAS_CSV_REDES)[number], number>;
  const hoy = ahora.toISOString().slice(0, 10);
  const filas: FilaCsvRedes[] = [];
  crudo.slice(1).forEach((f, i) => {
    const linea = i + 2;
    const celda = (c: (typeof COLUMNAS_CSV_REDES)[number]) => (f[col[c]] ?? "").trim();
    const slug = celda("artista_slug");
    if (!slug) return errores.push({ linea, motivo: "Falta el artista (artista_slug)." });
    const v = validarLectura({ red: celda("red").toLowerCase(), seguidores: celda("seguidores"), publicaciones: celda("publicaciones"), ultima: celda("ultima_publicacion") }, hoy);
    if (!v.ok) return errores.push({ linea, motivo: Object.values(v.errores)[0]! });
    const leido = celda("leido_en");
    let leido_en: string | null = null;
    if (leido) {
      const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(leido) ? `${leido}T12:00:00Z` : leido);
      if (Number.isNaN(t)) return errores.push({ linea, motivo: "leido_en no es una fecha (AAAA-MM-DD)." });
      if (t > ahora.getTime() + 86400000) return errores.push({ linea, motivo: "leido_en es del futuro." });
      leido_en = new Date(t).toISOString();
    }
    if (v.lectura.ultima_publicacion && leido_en && v.lectura.ultima_publicacion > leido_en.slice(0, 10)) return errores.push({ linea, motivo: "La última publicación es posterior a la lectura." });
    filas.push({ ...v.lectura, linea, artista_slug: slug, leido_en });
  });
  return { filas, errores };
}

// ---------- el CSV para el consejo ----------
/** La rúbrica que vale, luego lo propuesto por la base y lo fijado a mano en columnas aparte (OL-437): el consejo ve de dónde sale cada número. */
export const COLUMNAS_CSV_CONSEJO = [
  "artista",
  "disciplina",
  "ciudad",
  "estado",
  ...SENALES.map((s) => s.clave),
  "total",
  ...SENALES.map((s) => `${s.clave}_propuesto` as const),
  ...SENALES.map((s) => `${s.clave}_fijado` as const),
  "eventos",
  "foros",
  "festivales",
  "seguidores",
  "publicaciones",
  "ultima_publicacion",
  "ficha",
  "instagram",
  "nota",
] as const;
/** Una celda de CSV: entre comillas si hace falta y, si es texto que empieza como una fórmula (=, +, -, @), con un apóstrofo delante para que la
 *  hoja de cálculo no la ejecute. */
export function celdaCsv(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
/**
 * El CSV de la lista filtrada para el consejo: la rúbrica que vale (vacía si no hay datos), el total, lo propuesto y lo fijado de cada señal,
 * estado, cifras, enlaces y la primera línea de las notas. Con BOM, para Excel.
 */
export function csvConsejo(lista: readonly Candidato[]): string {
  const filas = lista.map((c) => [
    c.nombre,
    etiquetaDisciplina(c.disciplina),
    c.ciudad,
    etiquetaEstado(c.estado),
    ...SENALES.map((s) => c.valores[s.clave].puntaje),
    c.suma,
    ...SENALES.map((s) => c.valores[s.clave].propuesta?.puntaje ?? null),
    ...SENALES.map((s) => c.valores[s.clave].fijado),
    c.eventos,
    c.foros,
    c.festivales,
    c.redes?.seguidores ?? null,
    c.redes?.publicaciones ?? null,
    c.redes?.ultima_publicacion ?? null,
    `${ORIGEN}/artistas/${c.slug}`,
    c.instagram,
    c.nota,
  ]);
  return `\uFEFF${[[...COLUMNAS_CSV_CONSEJO], ...filas].map((f) => f.map(celdaCsv).join(",")).join("\r\n")}\r\n`;
}
/** «showcase-2026-10-20.csv». */
export function nombreCsvConsejo(hoy: string): string {
  return `showcase-${hoy}.csv`;
}

// ---------- la ficha de showcase de un artista ----------
export type Evidencia = {
  id: string;
  senal: Senal;
  tipo: TipoEvidencia;
  titulo: string;
  url: string;
  fecha: string | null;
  fuente: string | null;
  leida_por: "rutina" | "persona";
  estado: "propuesta" | "aceptada" | "rechazada";
  creado_en: string;
};
function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
/** «Premio · cultura.example.org · 12 sep 2025 · aceptada, la leyó una persona». */
export function detalleEvidencia(e: Evidencia, hoy: string): string {
  const quien = e.leida_por === "rutina" ? "la leyó la rutina" : "la leyó una persona";
  return [etiquetaTipo(e.tipo), e.fuente || dominio(e.url), e.fecha ? diaMes(e.fecha, hoy) : null, `${e.estado}, ${quien}`].filter(Boolean).join(" · ");
}
/** «2025 · leída por la rutina hoy»: lo que va tras la fuente en una propuesta por revisar. */
export function detallePropuesta(e: Evidencia, hoy: string): string {
  const leida = `leída por ${e.leida_por === "rutina" ? "la rutina" : "una persona"} ${haceDias(diasEntre(e.creado_en.slice(0, 10), hoy))}`;
  return [e.fecha ? diaMes(e.fecha, hoy) : null, leida].filter(Boolean).join(" · ");
}

/** Lo que la ficha sabe de cada señal sin que nadie lo escriba: el resumen bajo su nombre. */
export type DatosSenales = {
  circulacion: Pick<Circulacion, "eventos" | "foros" | "festivales" | "fuera">;
  ciudad: string;
  evidencias: readonly Evidencia[];
  lecturas: readonly Lectura[];
  reclamada: boolean;
  novedades: boolean;
  portada: boolean;
};
export function resumenSenal(senal: Senal, d: DatosSenales, hoy: string): string {
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  if (senal === "circulacion") {
    const c = d.circulacion;
    if (!c.eventos && !c.festivales) return "Sin eventos en la base este año";
    const donde = [c.foros ? plural(c.foros, "foro", "foros") : null, c.festivales ? plural(c.festivales, "festival", "festivales") : null].filter(Boolean).join(" y ");
    return `${plural(c.eventos, "evento", "eventos")}${donde ? ` en ${donde}` : ""} este año${c.fuera ? `; ${plural(c.fuera, "fecha", "fechas")} fuera de ${d.ciudad}` : ""}`;
  }
  if (senal === "actividad") {
    const ultima = ultimasPorRed(d.lecturas)
      .filter((l) => l.ultima_publicacion)
      .sort((a, b) => b.ultima_publicacion!.localeCompare(a.ultima_publicacion!))[0];
    if (!ultima) return d.lecturas.length ? "Sus lecturas no dicen cuándo publicó" : "Sin lecturas de redes";
    return `Última publicación ${haceDias(diasEntre(ultima.ultima_publicacion!, hoy))} en ${etiquetaRed(ultima.red)}`;
  }
  if (senal === "vinculo") {
    const extras = [d.novedades && "novedades", d.portada && "portada"].filter(Boolean).join(" y ");
    return `${d.reclamada ? "Ficha reclamada" : "Nadie lleva su ficha"}; ${extras ? `con ${extras}` : "sin novedades ni portada propia"}`;
  }
  const aceptadas = d.evidencias.filter((e) => e.senal === senal && e.estado === "aceptada");
  if (!aceptadas.length) return "Sin evidencias aceptadas";
  const tipos = [...new Set(aceptadas.map((e) => etiquetaTipo(e.tipo).toLowerCase()))].join(", ");
  return `${plural(aceptadas.length, "evidencia aceptada", "evidencias aceptadas")}: ${tipos}`;
}

// ---------- lo que propone la base (OL-437) ----------
/**
 * El puntaje que la base propone para una señal, con su porqué en una línea («4 foros y un festival este año»). Nadie lo escribe: se calcula al
 * leer, cada vez, con la regla de la rúbrica y lo que hay (eventos del año, lecturas de redes, la ficha y las evidencias aceptadas). Lo fijado a
 * mano en la hoja de la señal manda; sin fijado vale el propuesto; sin los dos, la señal queda «sin datos»: no es un 0 y no suma.
 */
export type Propuesta = { puntaje: 0 | 1 | 2; motivo: string };
export type Propuestas = Record<Senal, Propuesta | null>;
export const SIN_PROPUESTAS: Propuestas = { circulacion: null, obra: null, actividad: null, vinculo: null };
/** Lo que se necesita de una evidencia para proponer la obra. */
export type EvidenciaBreve = Pick<Evidencia, "senal" | "tipo" | "titulo" | "fecha" | "estado">;
/** Lo que se necesita para proponer las cuatro señales (lo mismo que el resumen, con las evidencias en breve). */
export type DatosPropuestas = Omit<DatosSenales, "evidencias"> & { evidencias: readonly EvidenciaBreve[] };

const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const unoOVarios = (n: number, uno: string, varios: string) => (n === 1 ? uno : `${n} ${varios}`);

/**
 * Circulación: 0 = un foro o ninguno · 1 = de 2 a 3 foros, o un festival · 2 = 4 foros o más, o un festival y fechas fuera de su ciudad. Cuenta
 * los foros distintos, los festivales y las fechas fuera de su ciudad del año (`circulacionDe`). Sin eventos en la base no se sabe si circula (la
 * base solo tiene lo que llegó por las agendas): sin datos, no un 0.
 */
export function propuestaCirculacion(c: Pick<Circulacion, "eventos" | "foros" | "festivales" | "fuera">, ciudad: string): Propuesta | null {
  if (!c.eventos && !c.festivales) return null;
  const puntaje = c.foros >= 4 || (c.festivales > 0 && c.fuera > 0) ? 2 : c.foros >= 2 || c.festivales > 0 ? 1 : 0;
  const donde = [c.foros ? unoOVarios(c.foros, "un foro", "foros") : null, c.festivales ? unoOVarios(c.festivales, "un festival", "festivales") : null].filter(Boolean).join(" y ");
  const fuera = c.fuera ? `; ${cuenta(c.fuera, "fecha", "fechas")} fuera de ${ciudad}` : "";
  return { puntaje, motivo: donde ? `${donde} este año${fuera}` : `${cuenta(c.eventos, "evento", "eventos")} este año, en sitios sin ficha${fuera}` };
}

/** Publica cada semana si sale una publicación o más por semana entre dos lecturas de la misma red con 7 días o más entre ellas. */
type Ritmo = { red: Red; porSemana: number; leido_en: string };
function ritmoSemanal(lecturas: readonly Lectura[]): Ritmo | null {
  let mejor: Ritmo | null = null;
  for (const red of new Set(lecturas.map((l) => l.red))) {
    const [ultima, ...antes] = lecturas.filter((l) => l.red === red && l.publicaciones !== null).sort((a, b) => b.leido_en.localeCompare(a.leido_en));
    if (!ultima) continue;
    const dia = ultima.leido_en.slice(0, 10);
    const previa = antes.find((l) => diasEntre(l.leido_en.slice(0, 10), dia) >= 7);
    if (!previa) continue;
    const nuevas = ultima.publicaciones! - previa.publicaciones!;
    const porSemana = (nuevas / diasEntre(previa.leido_en.slice(0, 10), dia)) * 7;
    if (nuevas > 0 && porSemana >= 1 && (!mejor || porSemana > mejor.porSemana)) mejor = { red, porSemana, leido_en: ultima.leido_en };
  }
  return mejor;
}
const textoRitmo = (r: Ritmo) => `Publica ${Math.round(r.porSemana) <= 1 ? "una vez" : `unas ${Math.round(r.porSemana)} veces`} por semana en ${etiquetaRed(r.red)}`;

/**
 * Actividad, con la última publicación de sus lecturas de redes: 2 si fue hace 7 días o menos (o si sus lecturas dicen que publica cada semana y
 * publicó en el último mes); 1 hasta 45 días (cada mes, con la misma holgura que la píldora «Publica cada mes» de la tarjeta); 0 desde 46 días (no
 * llega a cada mes; la tarjeta dice «Sin publicar en 45 días»). Sin lecturas, o si no dicen cuándo publicó, sin datos.
 */
export function propuestaActividad(lecturas: readonly Lectura[], hoy: string): Propuesta | null {
  if (!lecturas.length) return null;
  const ultima = ultimasPorRed(lecturas)
    .filter((l) => l.ultima_publicacion)
    .sort((a, b) => b.ultima_publicacion!.localeCompare(a.ultima_publicacion!))[0];
  const ritmo = ritmoSemanal(lecturas);
  if (!ultima) return ritmo && diasEntre(ritmo.leido_en.slice(0, 10), hoy) <= 30 ? { puntaje: 2, motivo: textoRitmo(ritmo) } : null;
  const dias = Math.max(0, diasEntre(ultima.ultima_publicacion!.slice(0, 10), hoy));
  const red = etiquetaRed(ultima.red);
  if (dias <= 7) return { puntaje: 2, motivo: `Publicó ${haceDias(dias)} en ${red}` };
  if (ritmo && dias <= 30) return { puntaje: 2, motivo: textoRitmo(ritmo) };
  if (dias <= 45) return { puntaje: 1, motivo: `Publicó ${haceDias(dias)} en ${red}` };
  return { puntaje: 0, motivo: `Sin publicar desde ${haceDias(dias)} en ${red}` };
}

/** Vínculo, de la ficha: 0 si nadie la lleva (sin cuenta ligada), 1 reclamada, 2 reclamada con novedades o portada. Siempre hay datos. */
export function propuestaVinculo(d: Pick<DatosSenales, "reclamada" | "novedades" | "portada">): Propuesta {
  if (!d.reclamada) return { puntaje: 0, motivo: "Nadie lleva su ficha" };
  const extras = [d.novedades && "novedades", d.portada && "portada"].filter(Boolean).join(" y ");
  return extras ? { puntaje: 2, motivo: `Ficha reclamada, con ${extras}` } : { puntaje: 1, motivo: "Ficha reclamada, sin novedades ni portada" };
}

/** Lo que cuenta como reconocimiento aunque su tipo no sea premio ni beca: una residencia o una selección oficial. */
const RECONOCIMIENTO = /\bresidencia|\bseleccionad[oa]s?\b|\bselecci[oó]n oficial/i;
const DIAS_OBRA = 730; // los últimos 24 meses
const masReciente = (a: EvidenciaBreve, b: EvidenciaBreve) => (b.fecha ?? "").localeCompare(a.fecha ?? "") || a.titulo.localeCompare(b.titulo, "es");
function citar(lista: readonly EvidenciaBreve[], etiqueta: (e: EvidenciaBreve) => string): string {
  const [e] = [...lista].sort(masReciente);
  const titulo = e.titulo.length > 80 ? `${e.titulo.slice(0, 79).trimEnd()}…` : e.titulo;
  return `${etiqueta(e)}: «${titulo}»${lista.length > 1 ? ` y ${lista.length - 1} más` : ""}`;
}
/**
 * Obra y reconocimiento: la base no la sabe; solo se propone con las evidencias **aceptadas** de la señal obra (las propuestas por la rutina no
 * cuentan hasta que alguien las acepta). 2 si alguna es premio, beca, residencia o selección oficial; 1 si hay obra de los últimos 24 meses (o sin
 * fecha); 0 si todo lo aceptado es más viejo. Sin evidencias aceptadas, sin datos.
 */
export function propuestaObra(evidencias: readonly EvidenciaBreve[], hoy: string): Propuesta | null {
  const aceptadas = evidencias.filter((e) => e.senal === "obra" && e.estado === "aceptada");
  if (!aceptadas.length) return null;
  const reconocimiento = aceptadas.filter((e) => e.tipo === "premio" || e.tipo === "beca" || RECONOCIMIENTO.test(e.titulo));
  if (reconocimiento.length) return { puntaje: 2, motivo: citar(reconocimiento, (e) => (e.tipo === "premio" || e.tipo === "beca" ? etiquetaTipo(e.tipo) : "Reconocimiento")) };
  const recientes = aceptadas.filter((e) => !e.fecha || diasEntre(e.fecha.slice(0, 10), hoy) <= DIAS_OBRA);
  if (recientes.length) return { puntaje: 1, motivo: citar(recientes, (e) => etiquetaTipo(e.tipo)) };
  return { puntaje: 0, motivo: "Su obra aceptada es de hace más de 24 meses" };
}

/** Las cuatro propuestas de un artista. */
export function propuestasDe(d: DatosPropuestas, hoy: string): Propuestas {
  return { circulacion: propuestaCirculacion(d.circulacion, d.ciudad), obra: propuestaObra(d.evidencias, hoy), actividad: propuestaActividad(d.lecturas, hoy), vinculo: propuestaVinculo(d) };
}

// ---------- qué vale de cada señal (OL-437) ----------
/** De dónde sale el puntaje que vale: fijado a mano, propuesto por la base, o sin datos. */
export type Origen = "fijado" | "propuesto" | "sin_datos";
export type Valor = { puntaje: Puntaje; origen: Origen; fijado: Puntaje; propuesta: Propuesta | null };
export type Valores = Record<Senal, Valor>;
/** Lo fijado a mano manda; si no hay, vale lo propuesto; sin los dos, sin datos. */
export function valorDe(fijado: Puntaje, propuesta: Propuesta | null): Valor {
  if (fijado !== null) return { puntaje: fijado, origen: "fijado", fijado, propuesta };
  if (propuesta) return { puntaje: propuesta.puntaje, origen: "propuesto", fijado: null, propuesta };
  return { puntaje: null, origen: "sin_datos", fijado: null, propuesta: null };
}
export function valoresDe(fijados: Puntajes, propuestas: Propuestas): Valores {
  return Object.fromEntries(SENALES.map((s) => [s.clave, valorDe(fijados[s.clave], propuestas[s.clave])])) as Valores;
}
/** El puntaje que vale de cada señal (null: sin datos). */
export function puntajesQueValen(v: Valores): Puntajes {
  return Object.fromEntries(SENALES.map((s) => [s.clave, v[s.clave].puntaje])) as Puntajes;
}
/** La suma «de 8» con lo que vale. */
export function sumaValores(v: Valores): number {
  return sumaRubrica(puntajesQueValen(v));
}
/** Una opción de la hoja del puntaje: 0, 1 o 2 (fijar ese) o null (quitar lo fijado: vuelve lo propuesto, o queda sin datos). */
export type OpcionPuntaje = { valor: Puntaje; etiqueta: string; detalle: string; marca: "fijado" | "propuesto" | null };
/**
 * Las opciones de la hoja del puntaje de una señal (OL-437). Tocar 0, 1 o 2 lo fija a mano, también el que ya propone la base («fijarlo igual»).
 * Lo fijado lleva la paloma; lo propuesto, el destello, mientras nadie lo fije. Con algo fijado, la última opción lo quita: «Volver al
 * propuesto» si la base propone algo, «Sin puntuar» si no.
 */
export function opcionesPuntaje(niveles: readonly string[], v: Valor): OpcionPuntaje[] {
  const opciones: OpcionPuntaje[] = niveles.map((n, i) => ({
    valor: i as Puntaje,
    etiqueta: String(i),
    detalle: n,
    marca: v.origen === "fijado" && v.fijado === i ? "fijado" : v.origen === "propuesto" && v.propuesta?.puntaje === i ? "propuesto" : null,
  }));
  if (v.origen !== "fijado") return opciones;
  if (!v.propuesta) return [...opciones, { valor: null, etiqueta: "Sin puntuar", detalle: "No cuenta en la suma", marca: null }];
  const p = v.propuesta.puntaje;
  const detalle = p === v.fijado ? `El mismo ${p}, sin fijar: cambia si cambian sus datos` : `Vale el ${p} en vez del ${v.fijado} fijado a mano`;
  return [...opciones, { valor: null, etiqueta: "Volver al propuesto", detalle, marca: "propuesto" }];
}

/** Un cambio de estado del registro, con quién (id de su cuenta) y cuándo. */
export type CambioEstado = { estado: Estado; por: string | null; creado_en: string };
/** «ti», el nombre de la cuenta o null si no se sabe (la llave de servicio o una cuenta que ya no existe). */
function quienFue(por: string | null, yo: string, nombres: ReadonlyMap<string, string>): string | null {
  if (!por) return null;
  if (por === yo) return "ti";
  return nombres.get(por) || "otra cuenta";
}
function cuandoYQuien(c: CambioEstado, yo: string, nombres: ReadonlyMap<string, string>, hoy: string, diaDe: (iso: string) => string): string {
  const quien = quienFue(c.por, yo, nombres);
  const dia = diaMes(diaDe(c.creado_en), hoy);
  return quien ? `por ${quien} el ${dia}` : `el ${dia}`;
}
/** El renglón «Estado»: «Invitado» · «Por ti el 18 oct · antes, revisado el 15 oct». El registro va del más viejo al más nuevo. */
export function textoEstado(estado: Estado, registro: readonly CambioEstado[], yo: string, nombres: ReadonlyMap<string, string>, hoy: string, diaDe: (iso: string) => string): { titulo: string; detalle: string } {
  const titulo = etiquetaEstado(estado);
  const ultimo = registro.at(-1);
  if (!ultimo || ultimo.estado !== estado) return { titulo, detalle: estado === "candidato" ? "Sin revisar todavía" : "Sin registro de quién lo cambió" };
  const ahora = cuandoYQuien(ultimo, yo, nombres, hoy, diaDe);
  const previo = registro.at(-2);
  const antes = previo ? ` · antes, ${etiquetaEstado(previo.estado).toLowerCase()} el ${diaMes(diaDe(previo.creado_en), hoy)}` : "";
  return { titulo, detalle: `${ahora.charAt(0).toUpperCase()}${ahora.slice(1)}${antes}` };
}
/** El detalle de cada opción de la hoja «Estado»: qué quiere decir y, si ya lo tuvo, la última vez con quién y cuándo. */
export function detalleOpcionEstado(estado: Estado, registro: readonly CambioEstado[], yo: string, nombres: ReadonlyMap<string, string>, hoy: string, diaDe: (iso: string) => string): string {
  const significado = ESTADOS.find((e) => e.valor === estado)!.detalle;
  const vez = [...registro].reverse().find((c) => c.estado === estado);
  return vez ? `${significado} · ${cuandoYQuien(vez, yo, nombres, hoy, diaDe)}` : significado;
}

/** Un renglón de «En la base»: el total del año, cada foro y cada festival, con su enlace a la ficha pública. */
export type RenglonBase = { tipo: "total" | "lugar" | "festival"; titulo: string; detalle: string; href: string };
/**
 * Lo que la base sabe del año de un artista: «7 eventos este año · 4 por venir · el último fue el 12 sep», y un renglón por foro y por festival
 * (del que más al que menos). `eventos` son los suyos del año (visibles, publicados y sin cancelar); `ahora`, el instante de mirar; `diaDe`, el
 * día (YYYY-MM-DD) de un instante en la ciudad.
 */
export function renglonesBase(
  eventos: readonly FilaEvento[],
  lugares: ReadonlyMap<string, FilaLugar>,
  festivales: ReadonlyMap<string, Pick<FilaEvento, "titulo" | "slug">>,
  artistaSlug: string,
  ahora: Date,
  diaDe: (iso: string) => string,
): RenglonBase[] {
  const hoy = diaDe(ahora.toISOString());
  const yaPaso = (iso: string) => Date.parse(iso) < ahora.getTime();
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  const fechas = eventos.filter((e) => !(e.clase === "festival" && !e.evento_padre_id)).map((e) => e.inicio).sort();
  const pasados = fechas.filter(yaPaso);
  const futuros = fechas.length - pasados.length;
  const filas: RenglonBase[] = [];
  if (fechas.length) {
    const detalle = [futuros ? `${futuros} por venir` : null, pasados.length ? `el último fue el ${diaMes(diaDe(pasados.at(-1)!), hoy)}` : null].filter(Boolean).join(" · ");
    filas.push({ tipo: "total", titulo: `${plural(fechas.length, "evento", "eventos")} este año`, detalle, href: `/artistas/${artistaSlug}` });
  }
  const resumir = (lista: readonly string[], uno: string, varios: string) => {
    const orden = [...lista].sort();
    if (orden.length === 1) return `1 ${uno} · ${diaMes(diaDe(orden[0]), hoy)}`;
    const ultimo = orden.filter(yaPaso).at(-1);
    return `${plural(orden.length, uno, varios)} · ${ultimo ? `el último el ${diaMes(diaDe(ultimo), hoy)}` : `el próximo el ${diaMes(diaDe(orden[0]), hoy)}`}`;
  };
  const porLugar = new Map<string, string[]>();
  const porFestival = new Map<string, string[]>();
  for (const e of eventos) {
    const marco = e.evento_padre_id ?? (e.clase === "festival" ? e.id : null);
    if (marco) porFestival.set(marco, [...(porFestival.get(marco) ?? []), e.inicio]);
    if (e.clase === "festival" && !e.evento_padre_id) continue;
    if (e.lugar_id && lugares.has(e.lugar_id)) porLugar.set(e.lugar_id, [...(porLugar.get(e.lugar_id) ?? []), e.inicio]);
  }
  for (const [id, lista] of [...porLugar].sort((a, b) => b[1].length - a[1].length)) {
    const l = lugares.get(id)!;
    filas.push({ tipo: "lugar", titulo: l.nombre, detalle: resumir(lista, "evento", "eventos"), href: `/lugares/${l.slug || l.id}` });
  }
  for (const [id, lista] of [...porFestival].sort((a, b) => b[1].length - a[1].length)) {
    const f = festivales.get(id);
    if (!f) continue;
    filas.push({ tipo: "festival", titulo: f.titulo, detalle: resumir(lista, "actividad", "actividades"), href: `/eventos/${f.slug || id}` });
  }
  return filas;
}

// ---------- «Investigar» (OL-430) ----------
/** La última corrida de «Investigar» de un artista, como la lee la ficha (`rutinas_corridas` de tipo `showcase` con su `artista_id`). */
export type CorridaInvestigar = {
  id: string;
  estado: "pendiente" | "corriendo" | "terminada" | "fallida" | "cancelada";
  tope_usd: number;
  gasto_usd: number;
  resumen: Record<string, unknown>;
  creado_en: string;
  inicio: string | null;
  fin: string | null;
};
/** El tope por omisión de la hoja «Investigar» (cuatro búsquedas cuestan entre 0,20 y 0,60 USD). */
export const TOPE_INVESTIGAR = 1;
/** «0,38»: dos decimales con coma, como en Ciudades y Corridas. */
export function dolares(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
}
export const investigacionEnCurso = (c: Pick<CorridaInvestigar, "estado"> | null | undefined): boolean => c?.estado === "pendiente" || c?.estado === "corriendo";

/**
 * Lo que dice el renglón «Investigar» de la ficha:
 *   · sin corrida: lo que hace («Prensa, premios, festivales y obra publicada»);
 *   · pendiente: «Investigando · por empezar · 0,00 de 1,00 USD»;
 *   · corriendo: «Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD»;
 *   · terminada: «Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD» (o «todo revisado», o «sin evidencias nuevas»; «llegó al
 *     tope» si paró antes de terminar);
 *   · fallida: «No se pudo investigar el 21 oct · 0,12 USD»; cancelada: «Cancelada el 21 oct».
 * `porRevisar`: las evidencias de la rutina que siguen propuestas. `diaDe` da el día local de un instante (YYYY-MM-DD).
 */
export function textoInvestigar(c: CorridaInvestigar | null | undefined, porRevisar: number, hoy: string, diaDe: (iso: string) => string): string {
  if (!c) return "Prensa, premios, festivales y obra publicada";
  const gastoDeTope = `${dolares(c.gasto_usd)} de ${dolares(c.tope_usd)} USD`;
  if (c.estado === "pendiente") return `Investigando · por empezar · ${gastoDeTope}`;
  if (c.estado === "corriendo") {
    const paso = typeof c.resumen.paso === "string" && c.resumen.paso.trim() ? c.resumen.paso.trim().slice(0, 40) : null;
    return ["Investigando", paso, gastoDeTope].filter(Boolean).join(" · ");
  }
  const dia = diaMes(diaDe(c.fin ?? c.inicio ?? c.creado_en), hoy);
  if (c.estado === "cancelada") return `Cancelada el ${dia}`;
  if (c.estado === "fallida") return `No se pudo investigar el ${dia} · ${dolares(c.gasto_usd)} USD`;
  const alTope = c.resumen.tope === true || (c.tope_usd > 0 && c.gasto_usd >= c.tope_usd);
  const propuso = Number(c.resumen.propuestas) || 0;
  const revisar = porRevisar > 0 ? `${porRevisar} ${porRevisar === 1 ? "evidencia" : "evidencias"} por revisar` : propuso > 0 ? "todo revisado" : "sin evidencias nuevas";
  return [`Investigado el ${dia}`, alTope ? "llegó al tope" : null, revisar, `${dolares(c.gasto_usd)} USD`].filter(Boolean).join(" · ");
}

/** La barra del renglón mientras corre (0 a 1, de `resumen.avance`), o null. */
export function avanceInvestigar(c: Pick<CorridaInvestigar, "estado" | "resumen"> | null | undefined): number | null {
  if (c?.estado !== "corriendo") return null;
  const a = Number(c.resumen.avance);
  return Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : null;
}

/** «Crédito: 187,40 USD · vence el 11 de noviembre»: lo que dice la hoja bajo el tope (el crédito de Corridas). */
export function lineaCreditoInvestigar(c: { usd: number; gastado: number; vence: string | null } | null, hoy: string): string | null {
  if (!c) return null;
  const queda = Math.max(0, c.usd - c.gastado);
  const vence = c.vence && /^\d{4}-\d{2}-\d{2}$/.test(c.vence) ? c.vence : null;
  const fecha = vence ? new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${vence}T12:00:00Z`)) : null;
  return [`Crédito: ${dolares(queda)} USD`, fecha ? `${vence! < hoy ? "venció" : "vence"} el ${fecha}` : null].filter(Boolean).join(" · ");
}

// ---------- «Investigar» a varios desde la lista (OL-439) ----------
/** Como mucho, cuántas investigaciones salen en una sola orden (límite de seguridad del gasto). */
export const LIMITE_LOTE = 60;
/** Una investigación terminada hace menos de esto no se repite por omisión. */
export const DIAS_INVESTIGACION_RECIENTE = 30;

/** Una corrida `showcase` como la lee la lista: la de la ficha con su artista y su lote (la orden que la creó; null si salió de la ficha). */
export type CorridaLista = CorridaInvestigar & { artista_id: string; lote: string | null };

/** La última investigación de cada artista (la más reciente por creación). */
export function ultimasInvestigaciones(corridas: readonly CorridaLista[]): Map<string, CorridaLista> {
  const por = new Map<string, CorridaLista>();
  for (const c of corridas) {
    const antes = por.get(c.artista_id);
    if (!antes || c.creado_en > antes.creado_en) por.set(c.artista_id, c);
  }
  return por;
}

/**
 * Si ya hay una investigación que cuenta: en curso (no se puede correr otra a la vez) o terminada en los últimos 30 días. Una que falló o se
 * canceló se puede repetir.
 */
export function investigadoHacePoco(c: Pick<CorridaInvestigar, "estado" | "fin" | "inicio" | "creado_en"> | null | undefined, ahora: Date): boolean {
  if (!c) return false;
  if (investigacionEnCurso(c)) return true;
  if (c.estado !== "terminada") return false;
  const t = Date.parse(c.fin ?? c.inicio ?? c.creado_en);
  return Number.isFinite(t) && ahora.getTime() - t < DIAS_INVESTIGACION_RECIENTE * 86_400_000;
}

/** A quién se puede investigar en una orden: las dos opciones de la hoja, en el orden de la lista. */
export type SeleccionLote = {
  /** Los candidatos marcados (con fila en el showcase, candidato o revisado) sin una investigación en curso ni de los últimos 30 días. */
  candidatos: string[];
  /** Los que se ven en la lista con el filtro de ahora, sin descartados ni investigados hace poco. */
  visibles: string[];
  /** De los que se ven, cuántos quedan fuera por tener una investigación en curso o de los últimos 30 días. */
  fueraRecientes: number;
  /** De los que se ven, cuántos quedan fuera por descartados (nunca se investigan en lote). */
  fueraDescartados: number;
};
export function seleccionLote(todos: readonly Candidato[], filtrados: readonly Candidato[], ultimas: ReadonlyMap<string, Pick<CorridaInvestigar, "estado" | "fin" | "inicio" | "creado_en">>, ahora: Date): SeleccionLote {
  const reciente = (c: Candidato) => investigadoHacePoco(ultimas.get(c.id), ahora);
  const candidatos = todos.filter((c) => c.marcado && (c.estado === "candidato" || c.estado === "revisado") && !reciente(c)).map((c) => c.id);
  let fueraRecientes = 0;
  let fueraDescartados = 0;
  const visibles: string[] = [];
  for (const c of filtrados) {
    if (c.estado === "descartado") fueraDescartados++;
    else if (reciente(c)) fueraRecientes++;
    else visibles.push(c.id);
  }
  return { candidatos, visibles, fueraRecientes, fueraDescartados };
}

const artistasN = (n: number) => `${n} ${n === 1 ? "artista" : "artistas"}`;

/** «26 artistas · hasta 26,00 USD · crédito 192,40»: lo que dice la hoja antes de investigar (sin tope válido o sin crédito, lo que haya). */
export function lineaTotalLote(n: number, tope: number | null, disponible: number | null): string {
  return [artistasN(n), tope !== null ? `hasta ${dolares(n * tope)} USD` : null, disponible !== null ? `crédito ${dolares(disponible)}` : null].filter(Boolean).join(" · ");
}

/** El botón de la hoja: «Investigar a los 26», «Investigar a 1 artista». */
export function botonLote(n: number): string {
  return n === 1 ? "Investigar a 1 artista" : `Investigar a los ${n}`;
}

/** Lo que dice la hoja si una opción trae más de la cuenta o a nadie; null si se puede investigar. */
export function avisoLote(n: number): string | null {
  if (n === 0) return "Nadie por investigar con esta opción.";
  if (n > LIMITE_LOTE) return `Son ${n}: elige hasta ${LIMITE_LOTE} o filtra por disciplina.`;
  return null;
}

/** Lo que cuenta la lista de una orden (un lote): cuántos, cuántos acabaron, lo gastado, el avance y lo que dejó por revisar. */
export type ResumenLote = { lote: string; total: number; enCurso: number; terminados: number; fallidos: number; usd: number; avance: number; porRevisar: number; creado: string; fin: string | null };

/** El avance de una corrida para la barra del lote: por empezar 0, corriendo lo que diga su resumen, acabada 1. */
function avanceDe(c: Pick<CorridaInvestigar, "estado" | "resumen">): number {
  if (c.estado === "pendiente") return 0;
  if (c.estado === "corriendo") return avanceInvestigar(c) ?? 0;
  return 1;
}

/** La orden más reciente (por la creación de sus corridas), o null si nunca se investigó en lote. `porRevisar`: evidencias de la rutina sin decidir, por artista. */
export function resumenLote(corridas: readonly CorridaLista[], porRevisar: Readonly<Record<string, number>>): ResumenLote | null {
  let ultimo: string | null = null;
  let creado = "";
  for (const c of corridas) if (c.lote && c.creado_en > creado) [ultimo, creado] = [c.lote, c.creado_en];
  if (!ultimo) return null;
  const suyas = corridas.filter((c) => c.lote === ultimo);
  const enCurso = suyas.filter((c) => investigacionEnCurso(c)).length;
  const fines = suyas.map((c) => c.fin).filter((f): f is string => !!f);
  return {
    lote: ultimo,
    total: suyas.length,
    enCurso,
    terminados: suyas.filter((c) => c.estado === "terminada").length,
    fallidos: suyas.filter((c) => c.estado === "fallida").length,
    usd: Math.round(suyas.reduce((t, c) => t + c.gasto_usd, 0) * 100) / 100,
    avance: suyas.length ? suyas.reduce((t, c) => t + avanceDe(c), 0) / suyas.length : 0,
    porRevisar: [...new Set(suyas.map((c) => c.artista_id))].reduce((t, id) => t + (porRevisar[id] ?? 0), 0),
    creado,
    fin: enCurso ? null : (fines.sort().at(-1) ?? null),
  };
}

/** «hoy», «ayer» o «el 21 oct»: cuándo, desde `hoy` (los dos YYYY-MM-DD). */
export function cuandoFue(dia: string, hoy: string): string {
  const dias = diasEntre(dia, hoy);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `el ${diaMes(dia, hoy)}`;
}
const evidenciasPorRevisar = (n: number) => `${n} ${n === 1 ? "evidencia" : "evidencias"} por revisar`;

/**
 * La línea de la orden en el renglón «Investigar» de la lista:
 *   · en curso: «Investigando a 26 · 5 terminados · 1,95 USD» (y «· 1 no se pudo» si alguna falló);
 *   · acabada: «26 investigados hoy · 41 evidencias por revisar · 9,80 USD» (o «todo revisado»).
 * Una orden acabada solo se dice mientras deja algo por revisar o el día que acabó (`mostrarLote`); después el renglón vuelve a proponer.
 */
export function lineaLote(r: ResumenLote, hoy: string, diaDe: (iso: string) => string): string {
  const usd = `${dolares(r.usd)} USD`;
  const fallos = r.fallidos ? `${r.fallidos} no se ${r.fallidos === 1 ? "pudo" : "pudieron"}` : null;
  if (r.enCurso) return [`Investigando a ${r.total}`, `${r.terminados} ${r.terminados === 1 ? "terminado" : "terminados"}`, fallos, usd].filter(Boolean).join(" · ");
  const cuando = cuandoFue(diaDe(r.fin ?? r.creado), hoy);
  return [`${r.total} ${r.total === 1 ? "investigado" : "investigados"} ${cuando}`, fallos, r.porRevisar ? evidenciasPorRevisar(r.porRevisar) : "todo revisado", usd].filter(Boolean).join(" · ");
}
export function mostrarLote(r: ResumenLote | null, hoy: string, diaDe: (iso: string) => string): r is ResumenLote {
  return !!r && (r.enCurso > 0 || r.porRevisar > 0 || diaDe(r.fin ?? r.creado) === hoy);
}

/**
 * Lo que dice la tarjeta de un candidato de su última investigación, para saber a quién entrar: «Investigando · 2 de 4 búsquedas» (y «· 1
 * evidencia por revisar» si ya trajo algo: cada búsqueda deja lo suyo), «Investigando · por empezar», «Investigado hoy · 3 evidencias por
 * revisar», «Investigado el 3 oct · todo revisado», «No se pudo investigar ayer» o, sin investigación (o cancelada), solo «3 evidencias por
 * revisar» si las hay. null: nada que decir.
 */
export function textoInvestigarTarjeta(c: CorridaInvestigar | null | undefined, porRevisar: number, hoy: string, diaDe: (iso: string) => string): string | null {
  const revisar = porRevisar > 0 ? evidenciasPorRevisar(porRevisar) : null;
  if (!c || c.estado === "cancelada") return revisar;
  if (c.estado === "pendiente") return ["Investigando · por empezar", revisar].filter(Boolean).join(" · ");
  if (c.estado === "corriendo") {
    const paso = typeof c.resumen.paso === "string" && c.resumen.paso.trim() ? c.resumen.paso.trim().slice(0, 40) : null;
    return ["Investigando", paso, revisar].filter(Boolean).join(" · ");
  }
  const cuando = cuandoFue(diaDe(c.fin ?? c.inicio ?? c.creado_en), hoy);
  if (c.estado === "fallida") return [`No se pudo investigar ${cuando}`, revisar].filter(Boolean).join(" · ");
  return [`Investigado ${cuando}`, revisar ?? (Number(c.resumen.propuestas) > 0 ? "todo revisado" : "sin evidencias nuevas")].join(" · ");
}

/**
 * Cómo va la investigación de cada artista, para el filtro «Investigación» (OL-446): «reciente» si tiene una en curso o la última terminó hace
 * menos de 30 días, «viejo» si terminó antes; quien no sale aquí nunca se investigó. `terminadas`: el fin (ISO) de la última terminada de cada
 * artista, de siempre; `corridas`: las recientes de la lista (las en curso cuentan como recientes).
 */
export function estadosInvestigacion(corridas: readonly Pick<CorridaLista, "artista_id" | "estado">[], terminadas: Readonly<Record<string, string>>, ahora: Date): Map<string, EstadoInvestigacion> {
  const m = new Map<string, EstadoInvestigacion>();
  for (const [id, fin] of Object.entries(terminadas)) {
    const t = Date.parse(fin);
    m.set(id, Number.isFinite(t) && ahora.getTime() - t < DIAS_INVESTIGACION_RECIENTE * 86_400_000 ? "reciente" : "viejo");
  }
  for (const c of corridas) if (investigacionEnCurso(c)) m.set(c.artista_id, "reciente");
  return m;
}

/**
 * Si la cadena de pasos del motor se paró (OL-439): hay corridas en curso (de cualquier rutina: el motor toma cualquiera, pendientes primero) y
 * TODAS están varadas según `rescate.ts`. Mientras una sola avance, se trabaje o se haya pedido hace menos de 2 minutos, la cadena sigue viva y
 * llegará a las demás: pedir otro paso abriría una segunda cadena en paralelo. En una orden de 26, las que esperan su turno no están varadas.
 */
export function cadenaParada(corridas: readonly CorridaVista[], ahora: Date): boolean {
  const enCurso = corridas.filter((c) => c.estado === "pendiente" || c.estado === "corriendo");
  return enCurso.length > 0 && corridasVaradas(enCurso, ahora).length === enCurso.length;
}
