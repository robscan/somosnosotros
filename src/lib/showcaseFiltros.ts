import { DISCIPLINAS, etiquetaDisciplina } from "./artistas";
import { normalizarNombre } from "./lugares";

/**
 * Los filtros de la lista del Showcase (OL-446; lo firmado en OL-443, bitácora 475, con las respuestas del gestor). Lógica pura: los bloques de la
 * hoja Filtros con sus opciones, si un artista pasa, cuántos quedarían con cada chip, lo que dice cada filtro puesto con su ✕ y el nombre que el
 * sistema propone para un grupo. Cada bloque elige uno y los bloques se combinan con «y». Todo vive en la URL (filtrar no apila historial).
 *
 * Bloques: a la vista Puntaje, Actividad en redes, Cuenta en la app, Circulación este año y Disciplina; en «Más filtros», Estado, Investigación y
 * Solista o grupo. «Origen» (CAPO / no CAPO) se quitó por decisión del founder del 22 de octubre: «Solo quita CAPO, ya no es nuestra referencia.
 * Nuestro catálogo ya es mucho más grande.»
 */

/** Lo que se filtra, además de la búsqueda. `puntaje` 0 y las cadenas vacías (o «todas»/«todos») son «sin filtro». */
export type Filtros = {
  puntaje: number;
  actividad: "" | "15" | "30" | "90" | "sin";
  cuenta: "" | "con" | "sin";
  circ: "" | "eventos" | "foros2" | "foros4" | "festival";
  disciplina: string;
  estado: string;
  inv: "" | "nunca" | "viejo" | "reciente" | "revisar";
  tipo: "" | "solista" | "grupo";
};
export type ClaveFiltro = keyof Filtros;
export const SIN_FILTROS: Filtros = { puntaje: 0, actividad: "", cuenta: "", circ: "", disciplina: "todas", estado: "todos", inv: "", tipo: "" };

/** Cómo va la investigación de un artista: nunca investigado, la última terminó hace más de 30 días, o en 30 días (o en curso). */
export type EstadoInvestigacion = "nunca" | "viejo" | "reciente";

/**
 * Lo que hace falta saber de un artista para filtrarlo (lo arma el servidor; la hoja lo cuenta en el teléfono). `ultima`: la última publicación en
 * cualquiera de sus redes (YYYY-MM-DD) o null; `inv`: null si las investigaciones no se pudieron leer.
 */
export type Hechos = {
  id: string;
  nombre: string;
  disciplina: string;
  estado: string;
  suma: number;
  reclamada: boolean;
  eventos: number;
  foros: number;
  festivales: number;
  tipo: string;
  ultima: string | null;
  inv: EstadoInvestigacion | null;
  revisar: number;
};

type Opcion = { valor: string | number; etiqueta: string; /** Lo que dice el chip puesto, con su ✕ («4 puntos o más»). */ puesto?: string };
export type Bloque = { clave: ClaveFiltro; rotulo: string; mas: boolean; opciones: readonly Opcion[] };

const ESTADOS_FILTRO = [
  { valor: "candidato", etiqueta: "Candidato" },
  { valor: "revisado", etiqueta: "Revisado" },
  { valor: "invitado", etiqueta: "Invitado" },
  { valor: "confirmado", etiqueta: "Confirmado" },
  { valor: "descartado", etiqueta: "Descartado" },
] as const;

/** Los bloques de la hoja, en su orden. La primera opción de cada uno es «sin filtro». */
export const BLOQUES: readonly Bloque[] = [
  {
    clave: "puntaje",
    rotulo: "Puntaje",
    mas: false,
    opciones: [
      { valor: 0, etiqueta: "Todos" },
      ...[3, 4, 5, 6].map((n) => ({ valor: n, etiqueta: `${n} o más`, puesto: `${n} puntos o más` })),
    ],
  },
  {
    clave: "actividad",
    rotulo: "Actividad en redes",
    mas: false,
    opciones: [
      { valor: "", etiqueta: "Cualquiera" },
      { valor: "15", etiqueta: "Publicó en 15 días" },
      { valor: "30", etiqueta: "En 30 días", puesto: "Publicó en 30 días" },
      { valor: "90", etiqueta: "En 90 días", puesto: "Publicó en 90 días" },
      { valor: "sin", etiqueta: "Sin publicar en 90 días" },
    ],
  },
  {
    clave: "cuenta",
    rotulo: "Cuenta en la app",
    mas: false,
    opciones: [
      { valor: "", etiqueta: "Cualquiera" },
      { valor: "con", etiqueta: "Con cuenta vinculada" },
      { valor: "sin", etiqueta: "Sin cuenta" },
    ],
  },
  {
    clave: "circ",
    rotulo: "Circulación este año",
    mas: false,
    opciones: [
      { valor: "", etiqueta: "Cualquiera" },
      { valor: "eventos", etiqueta: "Con eventos", puesto: "Con eventos este año" },
      { valor: "foros2", etiqueta: "En 2 foros o más" },
      { valor: "foros4", etiqueta: "En 4 foros o más" },
      { valor: "festival", etiqueta: "Con festival" },
    ],
  },
  {
    clave: "disciplina",
    rotulo: "Disciplina",
    mas: false,
    opciones: [{ valor: "todas", etiqueta: "Todas" }, ...DISCIPLINAS.map((d) => ({ valor: d.valor, etiqueta: d.etiqueta })), { valor: "por_completar", etiqueta: "Por completar" }],
  },
  { clave: "estado", rotulo: "Estado", mas: true, opciones: [{ valor: "todos", etiqueta: "Todos" }, ...ESTADOS_FILTRO] },
  {
    clave: "inv",
    rotulo: "Investigación",
    mas: true,
    opciones: [
      { valor: "", etiqueta: "Cualquiera" },
      { valor: "nunca", etiqueta: "Sin investigar" },
      { valor: "viejo", etiqueta: "Hace más de 30 días", puesto: "Investigado hace más de 30 días" },
      { valor: "reciente", etiqueta: "En 30 días", puesto: "Investigado en 30 días" },
      { valor: "revisar", etiqueta: "Con evidencias por revisar" },
    ],
  },
  {
    clave: "tipo",
    rotulo: "Solista o grupo",
    mas: true,
    opciones: [
      { valor: "", etiqueta: "Cualquiera" },
      { valor: "solista", etiqueta: "Solistas" },
      { valor: "grupo", etiqueta: "Grupos" },
    ],
  },
];
const bloqueDe = (clave: ClaveFiltro) => BLOQUES.find((b) => b.clave === clave)!;
/** Lo que vale «sin filtro» en un bloque. */
export const baseDe = (clave: ClaveFiltro) => SIN_FILTROS[clave];
/** Si el bloque tiene algo puesto. */
export const puesto = (f: Filtros, clave: ClaveFiltro) => f[clave] !== baseDe(clave);
/** Cuántos filtros hay puestos (el número del chip Filtros). */
export const nPuestos = (f: Filtros) => BLOQUES.filter((b) => puesto(f, b.clave)).length;
/** Los bloques con algo puesto, en su orden. */
export const puestos = (f: Filtros) => BLOQUES.filter((b) => puesto(f, b.clave));

/** Lee los filtros de la URL o de un grupo guardado (números o cadenas); lo que no es una opción vale «sin filtro». */
export function leerFiltros(p: Partial<Record<ClaveFiltro, unknown>> | null | undefined): Filtros {
  const f: Filtros = { ...SIN_FILTROS };
  if (!p || typeof p !== "object") return f;
  for (const b of BLOQUES) {
    const crudo = p[b.clave];
    if (crudo === undefined || crudo === null) continue;
    const op = b.opciones.find((o) => String(o.valor) === String(crudo));
    if (op) (f as Record<ClaveFiltro, string | number>)[b.clave] = op.valor;
  }
  return f;
}
/** Los filtros puestos como objeto (lo que se guarda en un grupo y va a la URL); sin lo que vale «sin filtro». */
export function filtrosPuestos(f: Filtros): Partial<Filtros> {
  return Object.fromEntries(puestos(f).map((b) => [b.clave, f[b.clave]])) as Partial<Filtros>;
}
/** Si dos filtros son el mismo (para saber si un grupo está puesto). */
export const mismosFiltros = (a: Filtros, b: Filtros) => BLOQUES.every((x) => a[x.clave] === b[x.clave]);

// ---------- quién pasa ----------
const DIA = 86_400_000;
const diasDesde = (dia: string, hoy: string) => Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${dia.slice(0, 10)}T00:00:00Z`)) / DIA);

/** Si un artista cumple un bloque con un valor. `hoy`, YYYY-MM-DD en la ciudad. */
export function cumple(h: Hechos, clave: ClaveFiltro, valor: string | number, hoy: string): boolean {
  switch (clave) {
    case "puntaje":
      return h.suma >= Number(valor);
    case "actividad": {
      const dias = h.ultima ? diasDesde(h.ultima, hoy) : null;
      return valor === "sin" ? dias === null || dias > 90 : dias !== null && dias <= Number(valor);
    }
    case "cuenta":
      return valor === "con" ? h.reclamada : !h.reclamada;
    case "circ":
      return valor === "eventos" ? h.eventos > 0 : valor === "foros2" ? h.foros >= 2 : valor === "foros4" ? h.foros >= 4 : h.festivales > 0;
    case "disciplina":
      return h.disciplina === valor;
    case "estado":
      return h.estado === valor;
    case "inv":
      // Sin investigaciones leídas no se sabe: el filtro no deja fuera a nadie (y la hoja no lo ofrece).
      if (h.inv === null) return true;
      return valor === "revisar" ? h.revisar > 0 : h.inv === valor;
    case "tipo":
      return valor === "solista" ? h.tipo === "solista" : h.tipo === "grupo" || h.tipo === "colectivo";
  }
}
/** Si un artista pasa todos los filtros puestos y la búsqueda (sin acentos ni mayúsculas). */
export function pasa(h: Hechos, f: Filtros, hoy: string, q: string | null = null): boolean {
  if (q && !normalizarNombre(h.nombre).includes(normalizarNombre(q))) return false;
  return BLOQUES.every((b) => !puesto(f, b.clave) || cumple(h, b.clave, f[b.clave], hoy));
}
/** Cuántos quedarían con ese chip puesto y lo demás igual (la cuenta de cada chip de la hoja). */
export function cuantosCon(lista: readonly Hechos[], f: Filtros, clave: ClaveFiltro, valor: string | number, hoy: string, q: string | null = null): number {
  const con = { ...f, [clave]: valor } as Filtros;
  let n = 0;
  for (const h of lista) if (pasa(h, con, hoy, q)) n++;
  return n;
}
/**
 * Las opciones de un bloque con su cuenta. Los chips que dejarían la lista en 0 se esconden (respuesta 7 del gestor), salvo «sin filtro» y el que
 * está puesto (si no, no se podría ver ni cambiar).
 */
export function opcionesConCuenta(lista: readonly Hechos[], f: Filtros, clave: ClaveFiltro, hoy: string, q: string | null = null): { valor: string | number; etiqueta: string; n: number; activo: boolean }[] {
  const b = bloqueDe(clave);
  return b.opciones
    .map((o) => ({ valor: o.valor, etiqueta: o.etiqueta, n: cuantosCon(lista, f, clave, o.valor, hoy, q), activo: f[clave] === o.valor }))
    .filter((o, i) => i === 0 || o.activo || o.n > 0);
}

// ---------- lo puesto, en palabras ----------
/** Lo que dice el chip de un filtro puesto, con su ✕: «4 puntos o más», «Publicó en 15 días», «Música». */
export function textoPuesto(f: Filtros, clave: ClaveFiltro): string {
  const op = bloqueDe(clave).opciones.find((o) => o.valor === f[clave]);
  return op?.puesto ?? op?.etiqueta ?? "";
}
/** «4 puntos o más · Publicó en 15 días · Música»: el resumen de la hoja «Guardar como grupo». */
export function resumenFiltros(f: Filtros): string {
  return puestos(f)
    .map((b) => textoPuesto(f, b.clave))
    .join(" · ");
}

const PLURAL_ESTADO: Record<string, string> = { candidato: "candidatos", revisado: "revisados", invitado: "invitados", confirmado: "confirmados", descartado: "descartados" };
/**
 * El nombre que el sistema propone para un grupo con lo que se puso: «Música con cuenta, 4+», «Música activos en 15 días, 4+», «Artistas sin
 * investigar». Se cambia en su campo.
 */
export function nombreGrupo(f: Filtros): string {
  const base = f.disciplina !== "todas" ? etiquetaDisciplina(f.disciplina) : f.tipo === "solista" ? "Solistas" : f.tipo === "grupo" ? "Grupos" : "Artistas";
  const extra = [
    f.cuenta === "con" ? "con cuenta" : f.cuenta === "sin" ? "sin cuenta" : null,
    f.actividad === "sin" ? "sin publicar en 90 días" : f.actividad ? `activos en ${f.actividad} días` : null,
    f.circ ? { eventos: "con eventos", foros2: "en 2 foros", foros4: "en 4 foros", festival: "con festival" }[f.circ] : null,
    f.estado !== "todos" ? (PLURAL_ESTADO[f.estado] ?? null) : null,
    f.inv ? { nunca: "sin investigar", viejo: "por reinvestigar", reciente: "investigados", revisar: "con evidencias por revisar" }[f.inv] : null,
    f.disciplina !== "todas" && f.tipo ? (f.tipo === "solista" ? "solistas" : "grupos") : null,
  ].filter(Boolean);
  return `${base}${extra.length ? ` ${extra.join(", ")}` : ""}${f.puntaje ? `, ${f.puntaje}+` : ""}`;
}

/** El tope del nombre de un grupo (la base lo vuelve a exigir). */
export const LIMITE_NOMBRE_GRUPO = 80;
/** Lo que le falta al nombre de un grupo para guardarse (el botón lo dice), o null. */
export function faltaNombreGrupo(nombre: string): string | null {
  const t = nombre.trim();
  if (!t) return "Falta el nombre";
  if (t.length > LIMITE_NOMBRE_GRUPO) return `Hasta ${LIMITE_NOMBRE_GRUPO} letras`;
  return null;
}

/** Un grupo guardado como lo lee la pantalla: su nombre y sus filtros ya leídos. */
export type Grupo = { id: string; nombre: string; filtros: Filtros };
/** El grupo que está puesto (sus mismos filtros, con algo puesto), o null. */
export function grupoPuesto(grupos: readonly Grupo[], f: Filtros): Grupo | null {
  if (!nPuestos(f)) return null;
  return grupos.find((g) => mismosFiltros(g.filtros, f)) ?? null;
}

/** Los valores válidos de disciplina (para no confiar en lo que llega). */
export const disciplinaValida = (d: unknown): d is string => typeof d === "string" && (d === "por_completar" || DISCIPLINAS.some((x) => x.valor === d));
