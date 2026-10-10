import { sumarDiasIso } from "./calendario";
import { diaDeSemana, enVisita, rangosDelDia, visitaDeEvento, type Visita } from "./claseEvento";
import { DIAS_ESTA_SEMANA } from "./cuando";
import type { Clase } from "./eventos";
import { diaConMesDe, diaLocal, eventoPaso } from "./fechas";
import { textoRangos, type Franja, type Rango } from "./horarioLugar";
import { compararNombres } from "./lugares";

/**
 * Dónde va cada forma de ocurrir en Inicio, la agenda, Cuándo y la hoja Filtros (OL-322; doc 55 §3 y su prototipo, casos 6 y 7). Lógica pura, sin
 * DOM ni base: la usan `lib/agenda` (la lista y sus números), `lib/inicio` (los carriles) y las pantallas.
 *
 * - **Exposición:** no es algo que pase un día a una hora (`lib/ocurrencias` no la reparte): vive en «Para visitar». En Inicio, en el carril
 *   «Festivales y expos» (OL-342; antes «Para visitar», solo con ellas) con las vigentes; en la agenda del día, «Para visitar hoy» con
 *   las que abren ese día **según su horario**. Sin horario no se promete «visitable hoy»: no entra ahí (sí en «Para visitar», con «Horario por
 *   confirmar»).
 * - **Festival:** en Inicio sale solo en «Festivales y expos», su sitio (OL-346: todos, también los que no tienen actos todavía, con
 *   «Programa por confirmar»; OL-347: en ningún otro carril, y sus actos salen en ellos sueltos, `sinFestivales` de lib/inicio); en la agenda del
 *   día es un bloque con sus actos de ese día (`componerDia`).
 * - **Taller:** cada sesión es un renglón, con «Sesión 2 de 4» (`textoParte`).
 */

type ConClase = { clase?: Clase | null; evento_padre_id?: string | null };
type Exposicion = ConClase & { id: string; titulo: string; inicio: string; fin: string | null; zona: string; horario?: Franja[] };

export const esExposicion = (e: ConClase): boolean => e.clase === "exposicion";
export const esMarco = (e: ConClase): boolean => e.clase === "festival";

/** El grupo «Qué» de la hoja Filtros (doc 55 §3, decisión 5): una sola elección; «Todo» es no haber elegido. */
export type Que = "todo" | "eventos" | "exposiciones" | "talleres" | "festivales";
export const QUES: readonly { clave: Que; etiqueta: string }[] = [
  { clave: "todo", etiqueta: "Todo" },
  { clave: "eventos", etiqueta: "Eventos" },
  { clave: "exposiciones", etiqueta: "Exposiciones" },
  { clave: "talleres", etiqueta: "Talleres" },
  { clave: "festivales", etiqueta: "Festivales" },
];
/** Lo que llegue (la URL, la memoria de pantalla) como un «Qué» que existe; lo que no se reconoce es «Todo». */
export const queDe = (valor: unknown): Que => QUES.find((q) => q.clave === valor)?.clave ?? "todo";

/**
 * ¿Entra con ese «Qué»? «Eventos» es lo puntual que no es parte de un festival; «Talleres», los talleres (por sesión, en la agenda); «Festivales»,
 * los marcos y sus actos (en la agenda, los bloques); «Exposiciones», las exposiciones (en la agenda, solo «Para visitar»).
 */
export function entraEnQue(e: ConClase, que: Que): boolean {
  if (que === "eventos") return (!e.clase || e.clase === "puntual") && !e.evento_padre_id;
  if (que === "exposiciones") return e.clase === "exposicion";
  if (que === "talleres") return e.clase === "taller";
  if (que === "festivales") return e.clase === "festival" || !!e.evento_padre_id;
  return true;
}

/**
 * En una lista que habla del evento y no de un día (la pestaña Nuevos de la agenda), el acto cuyo festival también está en la lista no sale: lo
 * dice su marco («un festival nuevo, como marco»). Los carriles de Inicio ya no pliegan: ahí el festival solo sale en su carril (OL-347). Uno cuyo marco no está (un acto nuevo de un festival viejo) sale como cualquier evento.
 */
export function plegarActos<T extends ConClase & { id: string }>(eventos: readonly T[]): T[] {
  const marcos = new Set(eventos.filter(esMarco).map((e) => e.id));
  return eventos.filter((e) => !e.evento_padre_id || !marcos.has(e.evento_padre_id));
}

/** Una pieza de la agenda de un día: un renglón, o el bloque de un festival con sus actos de ese día debajo. */
export type PiezaDelDia<T> = { tipo: "renglon"; evento: T } | { tipo: "festival"; marco: T; actos: T[] };

/**
 * La agenda de un día por piezas (doc 55 §3, decisión 4): los actos de un festival cuyo marco está cargado se juntan en su bloque, que va donde
 * va su primer acto del día (la lista ya viene en orden); lo demás, un renglón. Un acto cuyo marco no está cargado es un renglón más.
 */
export function componerDia<T extends ConClase>(renglones: readonly T[], marcos: ReadonlyMap<string, T>): PiezaDelDia<T>[] {
  const piezas: PiezaDelDia<T>[] = [];
  const bloques = new Map<string, { tipo: "festival"; marco: T; actos: T[] }>();
  for (const e of renglones) {
    const marco = e.evento_padre_id ? marcos.get(e.evento_padre_id) : undefined;
    if (!marco || !e.evento_padre_id) {
      piezas.push({ tipo: "renglon", evento: e });
      continue;
    }
    let bloque = bloques.get(e.evento_padre_id);
    if (!bloque) {
      bloque = { tipo: "festival", marco, actos: [] };
      bloques.set(e.evento_padre_id, bloque);
      piezas.push(bloque);
    }
    bloque.actos.push(e);
  }
  return piezas;
}

/** Los marcos de festival cargados, por su id: para armar los bloques. */
export const marcosDe = <T extends ConClase & { id: string }>(eventos: readonly T[]): Map<string, T> => new Map(eventos.filter(esMarco).map((e) => [e.id, e]));

/** «Programa registrado: 3 actividades · hoy 2» (o «· 2 este día»): lo del bloque de un festival en la agenda de un día. */
export function textoBloque(registrados: number, delDia: number, esHoy: boolean): string {
  const total = `Programa registrado: ${registrados} ${registrados === 1 ? "actividad" : "actividades"}`;
  return `${total} · ${esHoy ? `hoy ${delDia}` : `${delDia} este día`}`;
}

// ---------- exposiciones ----------

const visitaDe = (e: Exposicion): Visita => visitaDeEvento(e.inicio, e.fin, e.zona);

/** La que cierra antes primero; a igual cierre, por nombre y por id (dos cargas, el mismo orden). */
export function porCierre(a: Exposicion, b: Exposicion): number {
  return visitaDe(a).hasta.localeCompare(visitaDe(b).hasta) || compararNombres(a.titulo, b.titulo) || a.id.localeCompare(b.id);
}

/** Las horas en que abre ese día (YYYY-MM-DD), según su horario; vacío si ese día no se visita, si cierra o si no se sabe su horario. */
export function rangosDeVisita(e: Exposicion, dia: string): Rango[] {
  if (!e.horario?.length || !enVisita(visitaDe(e), dia)) return [];
  return rangosDelDia(e.horario, diaDeSemana(dia));
}

/** «Para visitar hoy» (o ese día): las exposiciones abiertas ese día según su horario, la que cierra antes primero. Sin horario no entran. */
export function abiertasEseDia<T extends Exposicion>(eventos: readonly T[], dia: string): T[] {
  return eventos.filter((e) => esExposicion(e) && rangosDeVisita(e, dia).length > 0).toSorted(porCierre);
}

/** ¿Se puede visitar algún día entre `desde` y `hasta` (YYYY-MM-DD, inclusivos)? Por su periodo, sin mirar el horario (para elegir con Cuándo). */
export const visitaEnRango = (e: Exposicion, desde: string, hasta: string): boolean => visitaDe(e).desde <= hasta && visitaDe(e).hasta >= desde;

/**
 * Las exposiciones del carril «Festivales y expos» de Inicio (antes «Para visitar», OL-322): las exposiciones que no han cerrado y que ya abrieron o abren en los próximos 7 días (la misma ventana de
 * «Esta semana»), la que cierra antes primero. `hoy` es YYYY-MM-DD en la zona de cada exposición.
 */
export function exposicionesVigentes<T extends Exposicion>(eventos: readonly T[], ahora: Date = new Date()): T[] {
  return eventos
    .filter((e) => {
      if (!esExposicion(e)) return false;
      const hoy = diaLocal(ahora, e.zona);
      return visitaEnRango(e, hoy, sumarDiasIso(hoy, DIAS_ESTA_SEMANA - 1));
    })
    .toSorted(porCierre);
}

// ---------- festivales y exposiciones (Inicio, OL-342) ----------

type Vigente = ConClase & { id: string; titulo: string; inicio: string; fin: string | null; zona: string; programa?: { registrados: number } };

/**
 * Los festivales del carril «Festivales y expos» de Inicio: TODOS los marcos en curso o por venir, sin ventana de días (a diferencia de las
 * exposiciones: un festival se anuncia con semanas y hay pocos). Uno que ya pasó no está (la agenda ya no lo trae; aquí también se comprueba, con la
 * regla de todas las clases: `eventoPaso`). Uno sin actos publicados también entra (OL-346, founder 2026-10-08: «La línea de festivales no los tiene
 * todos»; antes quedaba fuera, doc 55 §3): su tarjeta dice «Programa por confirmar» (`notaDeClase`).
 */
export const festivalesVigentes = <T extends Vigente>(eventos: readonly T[], ahora: Date = new Date()): T[] =>
  eventos.filter((e) => esMarco(e) && !eventoPaso(e.inicio, e.fin, ahora, e.zona));

/** Ya empezó: la exposición abrió (su `inicio` es el primer minuto de su primer día) o el festival tuvo su primer acto. */
const enCurso = (e: Vigente, ahora: Date): boolean => Date.parse(e.inicio) <= ahora.getTime();
/** Cuándo termina: el fin guardado (la exposición, al acabar su día de cierre; el festival, su último acto) o, sin él, su inicio. */
const terminaEn = (e: Vigente): number => Date.parse(e.fin ?? e.inicio);

/**
 * El orden del carril (OL-342; el contexto ordena, no el tipo): primero lo que ya está en curso, lo que termina antes primero; luego lo que viene,
 * por su inicio. Festivales y expos van mezclados. A igual instante, por nombre y por id (dos cargas, el mismo orden).
 */
export function porCercania(a: Vigente, b: Vigente, ahora: Date = new Date()): number {
  const curso = Number(enCurso(b, ahora)) - Number(enCurso(a, ahora));
  if (curso) return curso;
  const instante = enCurso(a, ahora) ? terminaEn(a) - terminaEn(b) : Date.parse(a.inicio) - Date.parse(b.inicio);
  return instante || compararNombres(a.titulo, b.titulo) || a.id.localeCompare(b.id);
}

/** «Abre 10:00 a.m.–6:00 p.m.»: lo que dice el renglón de «Para visitar hoy». */
export const textoAbre = (rangos: readonly Rango[]): string => `Abre ${textoRangos(rangos)}`;

/** «hasta el dom 30 de nov», en minúscula: lo que sigue a la hora en «Para visitar hoy». */
export const textoHastaEl = (e: Exposicion, ahora: Date = new Date()): string => `hasta el ${diaConMesDe(visitaDe(e).hasta, ahora, e.zona)}`;

/**
 * Lo que dice de un día la lista de exposiciones («Qué» en Exposiciones): «Abre hoy 10:00 a.m.–6:00 p.m.» (o «Abre …» si no es hoy) o «Cierra ese
 * día»; null si no se pudo leer su horario, si no tiene (su cuándo ya dice «Horario por confirmar», `cuandoDeTarjeta`) o si ese día no está en su
 * periodo (antes de abrir, su cuándo dice sus días).
 */
export function notaDeVisita(e: Exposicion, dia: string, hoy: string): string | null {
  if (!e.horario?.some((f) => f.dias.length) || !enVisita(visitaDe(e), dia)) return null;
  const rangos = rangosDeVisita(e, dia);
  if (!rangos.length) return dia === hoy ? "Hoy cierra" : "Cierra ese día";
  return dia === hoy ? `Abre hoy ${textoRangos(rangos)}` : textoAbre(rangos);
}

/** El título de la sección de un día: «Para visitar hoy», «Para visitar mañana» o «Para visitar el sáb 10 de oct». */
export function tituloParaVisitar(dia: string, hoy: string, ahora: Date = new Date(), zona?: string): string {
  if (dia === hoy) return "Para visitar hoy";
  if (dia === sumarDiasIso(hoy, 1)) return "Para visitar mañana";
  return `Para visitar el ${diaConMesDe(dia, ahora, zona)}`;
}

/** ¿Sin punto en el calendario de Cuándo? Una exposición (no es una fecha: está en «Para visitar») y el marco de un festival (sus actos ponen los suyos). */
export const sinPuntoEnCalendario = (e: ConClase): boolean => esExposicion(e) || esMarco(e);
