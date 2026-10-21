import { GENERICAS_EVENTO, palabrasDeTitulo } from "../cargaEventos";
import { resumenTaller, ultimoDiaDelPeriodo, rangoDelPeriodo } from "../claseEvento";
import { claseSugerida, esClase, type Clase } from "../eventos";
import { diaConMesDe, diaLocal, isoALocal, ZONA_INICIAL } from "../fechas";
import { normalizarNombre } from "../lugares";

/**
 * Cómo ocurre lo que propone la rutina de agendas (OL-433). Pedido del founder (21 de octubre): «¿Tiene criterios para identificar festivales,
 * galerías, talleres? Incluso si se trata de eventos faltantes de un festival ya registrado». Funciones puras, sin `server-only` ni base: la
 * rutina (`agendas.ts`) decide con ellas qué propone y la publicación (`publicarEvento.ts`) las lee de `propuestas.datos`; la bandeja de
 * OL-432 puede usar `etiquetaDeForma` para decirlo en la tarjeta.
 *
 * Lo que se añade a `propuestas.datos` de un evento (todo opcional; lo de antes se lee igual):
 *   · `clase`            «puntual» · «exposicion» · «taller» · «festival» (`claseDeLaAgenda`: `claseSugerida` por el título).
 *   · `marco`            { id, titulo }: es un acto de un festival registrado (clase festival en `eventos`); se publica colgado de él.
 *   · `marco_propuesto`  id de la propuesta del festival (de la misma corrida o de una anterior sin decidir) del que es un acto.
 *   · `programa`         el festival, ciclo o programa con nombre propio bajo el que lo lista la agenda («Xantolo 2026»).
 *   · `espera`           la frase para un acto que se acepta antes que su festival: no se publica suelto.
 *   · `actos`            en la propuesta de un festival: cuántos actos se le propusieron; `termina` (ISO), el fin de su último acto.
 *   · `sesiones`         [{ inicio, fin? }] (ISO): las funciones de un taller o de un evento de días seguidos, en una sola propuesta.
 *   · `serie`            { fechas: [ISO…], cada: días | null }: una de varias fechas del mismo evento en el mismo sitio (una propuesta por
 *                        fecha: la app no tiene una clase para series).
 *   · `termina`          en una exposición (la inauguración de una exposición con su periodo): el final del día de cierre (ISO).
 *   · `exposicion`       el nombre de la exposición que abre esa inauguración.
 *   · `variantes`        otros títulos con que la agenda trajo la misma función (se quedó la más completa).
 *   · `lat`, `lng`, `direccion_mapa`   el punto que el mapa dio al sitio (fuera del directorio) dentro de la ciudad.
 */

export type SesionPropuesta = { inicio: string; fin: string | null };
export type SeriePropuesta = { fechas: string[]; cada: number | null };
export type FormaEvento = {
  clase: Clase;
  marco: { id: string; titulo: string } | null;
  marcoPropuesto: string | null;
  programa: string | null;
  espera: string | null;
  actos: number;
  sesiones: SesionPropuesta[];
  serie: SeriePropuesta | null;
  termina: string | null;
  exposicion: string | null;
};

const texto = (v: unknown, tope = 200): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const iso = (v: unknown): string | null => (typeof v === "string" && v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lo que dice `datos` sobre cómo ocurre (lo que no se entiende se ignora: un evento puntual, como todo lo de antes). */
export function leerFormaEvento(datos: Record<string, unknown>): FormaEvento {
  const marco = objeto(datos.marco);
  const marcoId = texto(marco.id, 40);
  const sesiones = (Array.isArray(datos.sesiones) ? datos.sesiones : [])
    .map((s) => ({ inicio: iso(objeto(s).inicio), fin: iso(objeto(s).fin) }))
    .filter((s): s is SesionPropuesta => !!s.inicio)
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
    .slice(0, 31);
  const serie = objeto(datos.serie);
  const fechas = (Array.isArray(serie.fechas) ? serie.fechas : []).map(iso).filter((f): f is string => !!f);
  const cada = typeof serie.cada === "number" && Number.isFinite(serie.cada) && serie.cada > 0 ? serie.cada : null;
  const actos = typeof datos.actos === "number" && Number.isFinite(datos.actos) ? Math.max(0, Math.floor(datos.actos)) : 0;
  return {
    clase: esClase(datos.clase) ? datos.clase : "puntual",
    marco: UUID.test(marcoId) ? { id: marcoId, titulo: texto(marco.titulo, 120) || "su festival" } : null,
    marcoPropuesto: typeof datos.marco_propuesto === "string" && UUID.test(datos.marco_propuesto) ? datos.marco_propuesto : null,
    programa: texto(datos.programa, 120) || null,
    espera: texto(datos.espera, 200) || null,
    actos,
    sesiones: sesiones.length >= 2 ? sesiones : [],
    serie: fechas.length >= 2 ? { fechas: [...new Set(fechas)].sort(), cada } : null,
    termina: iso(datos.termina),
    exposicion: texto(datos.exposicion, 120) || null,
  };
}

// ---------------------------------------------------------------- La clase

/**
 * La clase que se propone para una fila de la agenda: con un periodo de visita (`termina`), una exposición; si no, la del título
 * (`claseSugerida`: festival, encuentro, jornadas, muestra de cine, taller, curso…) o un evento. Una «exposición» sin periodo se propone como
 * evento: la app guarda una exposición con su primer y su último día, y la agenda no los dio.
 */
export function claseDeLaAgenda(titulo: string, termina: string | null): Clase {
  if (termina) return "exposicion";
  const c = claseSugerida(titulo);
  return c === "exposicion" ? "puntual" : (c ?? "puntual");
}

/** La clase de un acto de festival: la suya, nunca festival dentro de festival. */
export const claseDeActo = (clase: Clase): Clase => (clase === "festival" ? "puntual" : clase);

/** «Inauguración: Raíces», «Inauguración de la exposición Raíces» → «Raíces». Sin ese principio, el título tal cual. */
export function nombreDeExposicion(titulo: string): string {
  const sin = titulo.replace(/^\s*(inauguraci[oó]n|apertura)(\s+de\s+la\s+(exposici[oó]n|muestra))?\s*[:.\-–—]?\s*/i, "").trim();
  return (sin || titulo).slice(0, 120);
}

// ---------------------------------------------------------------- Festivales

/** Palabras que acompañan al nombre de un festival sin ser su nombre. */
const RELLENO_FESTIVAL = new Set(["festival", "fest", "internacional", "nacional", "estatal", "municipal", "regional", "edicion", "anual", "gran", "feria", "semana", "mes", "dia"]);
/** Géneros: solos no nombran un festival («Festival de Jazz» no se reconoce por «jazz»: hace falta el nombre entero). */
const GENEROS = new Set([
  "jazz", "rock", "blues", "cine", "teatro", "danza", "poesia", "musica", "arte", "literatura", "libro", "cultura", "folclor", "folklor",
  "folclorico", "folklorico", "trova", "son", "huapango", "fotografia", "titere", "cuento", "narracion", "ciencia", "lectura", "pintura",
  "escultura", "grabado", "opera", "coro", "orquesta", "banda", "piano", "guitarra", "comida", "gastronomia", "vino", "cerveza", "infantil",
  // Las categorías con que una agenda ordena su programa («Artes escénicas», «Artes visuales», «Para niños»).
  "escenica", "escenico", "visual", "plastica", "plastico", "literaria", "literario", "juvenil", "adulto", "familia", "nino", "nina",
  "joven", "publico", "patrimonio", "historia", "divulgacion", "academica", "academico",
]);
const MESES = new Set(["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "setiembre", "octubre", "noviembre", "diciembre"]);
const ROMANO = /^[ivxlc]{1,7}$/;

/** Cómo se reconoce un festival en el texto: sus palabras propias (todas) o, si no tiene, su nombre entero sin el año. */
export function claveDeFestival(titulo: string): { propias: string[]; frase: string } {
  const frase = normalizarNombre(titulo)
    .split(" ")
    .filter((w) => w && !/^(19|20)\d{2}$/.test(w))
    .join(" ");
  const propias = [...palabrasDeTitulo(titulo)].filter((w) => !GENERICAS_EVENTO.has(w) && !GENEROS.has(w) && !RELLENO_FESTIVAL.has(w) && !MESES.has(w) && !/^\d+$/.test(w) && !ROMANO.test(w));
  return { propias, frase };
}

/**
 * ¿Este texto (título, descripción, programa de la agenda, nombre de la agenda) nombra al festival? «Xantolo 2026» se reconoce por «xantolo»;
 * «Fotovisión 31» por «fotovision»; «Otoño Sonoro» por las dos; «Festival de Jazz» solo por «festival de jazz».
 */
export function nombraAlFestival(textos: readonly (string | null | undefined)[], festival: string): boolean {
  const { propias, frase } = claveDeFestival(festival);
  if (!frase) return false;
  const todo = textos.filter(Boolean).join(" · ");
  if (propias.length) {
    const palabras = palabrasDeTitulo(todo);
    return propias.every((w) => palabras.has(w));
  }
  return ` ${normalizarNombre(todo)} `.includes(` ${frase} `);
}

/** ¿Dos nombres de programa son el mismo festival? (sus claves iguales). */
export function mismoPrograma(a: string, b: string): boolean {
  const ka = claveDeFestival(a);
  const kb = claveDeFestival(b);
  if (ka.propias.length && kb.propias.length) return ka.propias.length === kb.propias.length && ka.propias.every((w) => kb.propias.includes(w));
  return !!ka.frase && ka.frase === kb.frase;
}

/**
 * El programa que la agenda dice para una fila, si nombra de verdad un festival, ciclo o programa especial: no una categoría («Exposiciones»,
 * «Música», «Talleres»), ni un mes, ni la agenda misma («Agenda cultural de octubre»), ni el nombre del sitio. Null si no.
 */
export function programaDeAgenda(programa: string | null | undefined, sitio: string | null | undefined): string | null {
  const p = texto(programa, 120);
  const n = normalizarNombre(p);
  if (!n || /\b(agenda|cartelera|programacion|calendario)\b/.test(n)) return null;
  const palabras = [...palabrasDeTitulo(p)];
  if (!palabras.length || palabras.every((w) => GENERICAS_EVENTO.has(w) || GENEROS.has(w) || RELLENO_FESTIVAL.has(w) || MESES.has(w) || /^\d+$/.test(w))) return null;
  const delSitio = palabrasDeTitulo(sitio ?? "");
  if (delSitio.size && palabras.every((w) => delSitio.has(w))) return null;
  return p;
}

/** Los días que ocupa un festival en la agenda (con un margen: su periodo sale de los actos que ya tiene, que pueden ser menos). */
export const MARGEN_FESTIVAL_DIAS = 3;
export function dentroDelFestival(dia: string, festival: { inicio: string; fin: string | null }, zona: string): boolean {
  const desde = sumarDias(diaLocal(new Date(festival.inicio), zona), -MARGEN_FESTIVAL_DIAS);
  const hasta = sumarDias(ultimoDiaDelPeriodo(festival.inicio, festival.fin ?? null, zona), MARGEN_FESTIVAL_DIAS);
  return dia >= desde && dia <= hasta;
}

// ---------------------------------------------------------------- Sesiones y series

export const sumarDias = (dia: string, n: number): string => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const entre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** ¿Estos días (sin repetir) van seguidos, uno tras otro? */
export function diasSeguidos(dias: readonly string[]): boolean {
  const d = [...new Set(dias)].sort();
  return d.length >= 2 && d.every((x, i) => i === 0 || entre(d[i - 1], x) === 1);
}

/** Cada cuántos días se repite (todas las distancias iguales), o null. */
export function cadaCuantos(dias: readonly string[]): number | null {
  const d = [...new Set(dias)].sort();
  if (d.length < 2) return null;
  const pasos = d.slice(1).map((x, i) => entre(d[i], x));
  return pasos.every((p) => p === pasos[0]) ? pasos[0] : null;
}

/**
 * Qué hacer con una fila del mismo título en el mismo sitio que una propuesta abierta de la corrida, otro día:
 *   · «sesion»: se suma como sesión a esa propuesta (un taller, o días seguidos: un evento de varios días, OL-310/311);
 *   · «serie»: otra fecha del mismo evento (un cineclub, «Todos los lunes son de Palique»): propuesta propia, marcada como serie.
 */
export function comoSeAgrupa(diasDeLaPropuesta: readonly string[], dia: string, clase: Clase): "sesion" | "serie" {
  const todos = [...new Set([...diasDeLaPropuesta, dia])];
  if (todos.length > 31) return "serie";
  if (clase === "taller") return "sesion";
  return diasSeguidos(todos) ? "sesion" : "serie";
}

// ---------------------------------------------------------------- Lo que dice la bandeja (para OL-432)

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * La línea que la tarjeta de la bandeja puede decir sobre cómo ocurre (OL-432 la pondrá en pantalla; aquí solo la frase): «Acto de «Xantolo
 * 2026»», «Festival · 6 actos», «Taller · 4 sesiones», «Evento de 3 días», «Serie · 4 fechas, cada semana», «Exposición · hasta el lun 30 de
 * nov». `detalle`, el cuándo largo si hace falta; `espera`, la frase de un acto que espera a su festival. Null si es un evento como siempre.
 */
export function etiquetaDeForma(datos: Record<string, unknown>, ahora: Date = new Date(), zona: string = ZONA_INICIAL): { que: string; detalle: string | null; espera: string | null } | null {
  const f = leerFormaEvento(datos);
  const inicio = iso(datos.inicio);
  const hoy = diaLocal(ahora, zona);
  if (f.marco) return { que: `Acto de «${f.marco.titulo}»`, detalle: null, espera: null };
  if (f.marcoPropuesto) return { que: `Acto de «${f.programa ?? "su festival"}»`, detalle: null, espera: f.espera };
  if (f.clase === "festival") {
    const detalle = inicio ? rangoDelPeriodo(inicio, f.termina, zona, ahora) : null;
    return { que: f.actos ? `Festival · ${plural(f.actos, "acto", "actos")}` : "Festival", detalle, espera: null };
  }
  if (f.clase === "exposicion" && f.termina) {
    const nombre = f.exposicion ? ` «${f.exposicion}»` : "";
    return { que: `Exposición${nombre} · hasta el ${diaConMesDe(ultimoDiaDelPeriodo(f.termina, null, zona), ahora, zona)}`, detalle: null, espera: null };
  }
  if (f.sesiones.length) {
    const horarios = f.sesiones.map((s) => {
      const l = isoALocal(s.inicio, zona);
      return { dia: l.slice(0, 10), hora: l.slice(11, 16), fin: s.fin ? isoALocal(s.fin, zona).slice(11, 16) : "" };
    });
    const que = f.clase === "taller" ? `Taller · ${plural(f.sesiones.length, "sesión", "sesiones")}` : `Evento de ${f.sesiones.length} días`;
    return { que, detalle: resumenTaller(horarios, hoy), espera: null };
  }
  if (f.serie) {
    const cada = f.serie.cada === 7 ? ", cada semana" : f.serie.cada === 14 ? ", cada dos semanas" : f.serie.cada === 1 ? ", cada día" : "";
    return { que: `Serie · ${plural(f.serie.fechas.length, "fecha", "fechas")}${cada}`, detalle: null, espera: null };
  }
  if (f.clase === "taller") return { que: "Taller", detalle: null, espera: null };
  return null;
}
