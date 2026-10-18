import { esExposicion, esMarco, marcosDe } from "./agendaPorClase";
import { festivalComoEvento } from "./claseEvento";
import type { Clase } from "./eventos";
import { diaConMes, diaCorto, horaCorta } from "./fechas";
import { normalizarNombre } from "./lugares";

/**
 * Una tarjeta por serie en «Nuevos eventos» de Inicio y en la pestaña Nuevos de la agenda (OL-385; founder, 2026-10-12, al ver tres tarjetas con el
 * mismo cartel y el mismo título: «No es claro para el usuario»). Lógica pura, sin DOM ni base: la usan `lib/inicio` (el carril), `lib/agenda` (la
 * pestaña) y, ya en el teléfono, `components/inicio/CarrilNuevos` (con las tarjetas, tras quitar lo que esa persona ya vio).
 *
 * Una lista que habla del evento y no de un día se junta en piezas, en el orden de la lista (cada pieza va donde va el primero de los suyos):
 * - **Festival:** los actos de un mismo festival cuentan dentro de la tarjeta del festival (el marco, buscado entre todo lo cargado aunque no sea
 *   nuevo) y no se repiten afuera, con cuántos trae la lista (`nuevos`). Si el marco mismo está en la lista (la pestaña Nuevos: un festival nuevo),
 *   también es esta pieza: es lo que antes hacía `plegarActos` y ya no hay otra regla para eso.
 * - **Serie:** las funciones de lo mismo, el mismo título (normalizado: sin acentos ni mayúsculas, `normalizarNombre`) en el mismo sitio (el lugar
 *   del directorio o, sin él, el sitio escrito, normalizado), que no son de un festival: una sola pieza con la función más próxima como cabeza,
 *   cuántas son, desde cuándo y hasta cuándo. Dos funciones el mismo día no caben en `eventos_sesiones` (una por evento y fecha): son eventos
 *   aparte y solo esta agrupación las junta en pantalla. «Voy» sigue siendo por función (la ficha elige la función: «Otras funciones»).
 * - Lo demás, **suelto**.
 */

/** Lo que hace falta de un evento para saber con quién va. */
export type Agrupable = { id: string; titulo: string; inicio: string; lugar_id?: string | null; sitio_texto?: string | null; evento_padre_id?: string | null; clase?: Clase | null; fin?: string | null; zona?: string; programa?: { registrados: number } | null };

/** Una pieza de una lista de lo nuevo. `primero` es el de los suyos que la puso en su sitio (en una lista por publicación, el más reciente). */
export type Pieza<T> =
  | { tipo: "suelto"; evento: T; primero: T }
  | { tipo: "festival"; marco: T; actos: T[]; nuevos: number; primero: T }
  | { tipo: "serie"; cabeza: T; eventos: T[]; funciones: number; desde: string; hasta: string; primero: T };

/** El sitio de una serie: su lugar del directorio o, sin él, el sitio escrito normalizado. Sin ninguno no hay con qué comparar: null. */
export function sitioDeSerie(e: Pick<Agrupable, "lugar_id" | "sitio_texto">): string | null {
  if (e.lugar_id) return `lugar:${e.lugar_id}`;
  const texto = e.sitio_texto ? normalizarNombre(e.sitio_texto) : "";
  return texto ? `sitio:${texto}` : null;
}

/** ¿Son funciones de lo mismo? Mismo título normalizado y mismo sitio (`sitioDeSerie`). */
export function mismaSerie(a: Agrupable, b: Agrupable): boolean {
  const sitio = sitioDeSerie(a);
  return sitio !== null && sitio === sitioDeSerie(b) && normalizarNombre(a.titulo) === normalizarNombre(b.titulo);
}

/**
 * Con quién va un evento: `festival:<id del marco>` si es el marco o un acto de un festival cargado; `serie:<sitio>|<título>` si puede tener funciones
 * hermanas (ni marco, ni exposición, ni acto de un festival); null si va suelto sin remedio. La comparten el servidor (para mandar la llave con cada
 * tarjeta) y el teléfono (que junta lo que sigue siendo nuevo para la persona).
 */
export function grupoDe(e: Agrupable, marcos: ReadonlyMap<string, unknown>): string | null {
  // Un festival sin programa (OL-413) va suelto, como un evento: no tiene actos que juntar.
  if (esMarco(e) && e.zona && festivalComoEvento({ ...e, fin: e.fin ?? null, zona: e.zona })) return null;
  if (esMarco(e)) return `festival:${e.id}`;
  if (e.evento_padre_id) return marcos.has(e.evento_padre_id) ? `festival:${e.evento_padre_id}` : null;
  if (esExposicion(e)) return null;
  const sitio = sitioDeSerie(e);
  return sitio ? `serie:${sitio}|${normalizarNombre(e.titulo)}` : null;
}

const porInicio = (a: { inicio: string; id: string }, b: { inicio: string; id: string }) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.id.localeCompare(b.id);

/**
 * Junta en piezas una lista ya ordenada con la llave de cada uno (`grupoDe`, o la que trae su tarjeta). `marcoDe` da el marco de un festival por su
 * id (si no aparece, sus actos van sueltos). Genérica: el servidor la usa con eventos y el teléfono con tarjetas, con la misma regla.
 */
export function juntarPiezas<T extends { id: string; inicio: string }>(lista: readonly T[], grupo: (e: T) => string | null | undefined, marcoDe: (id: string) => T | undefined): Pieza<T>[] {
  const piezas: (Pieza<T> | { tipo: "abierta"; clave: string; miembros: T[]; primero: T })[] = [];
  const abiertas = new Map<string, { tipo: "abierta"; clave: string; miembros: T[]; primero: T }>();
  for (const e of lista) {
    const clave = grupo(e);
    if (!clave) {
      piezas.push({ tipo: "suelto", evento: e, primero: e });
      continue;
    }
    let abierta = abiertas.get(clave);
    if (!abierta) {
      abierta = { tipo: "abierta", clave, miembros: [], primero: e };
      abiertas.set(clave, abierta);
      piezas.push(abierta);
    }
    abierta.miembros.push(e);
  }
  return piezas.flatMap((p): Pieza<T>[] => {
    if (p.tipo !== "abierta") return [p];
    if (p.clave.startsWith("festival:")) {
      const id = p.clave.slice("festival:".length);
      const marco = p.miembros.find((e) => e.id === id) ?? marcoDe(id);
      if (!marco) return p.miembros.map((e) => ({ tipo: "suelto", evento: e, primero: e }));
      const actos = p.miembros.filter((e) => e.id !== id);
      return [{ tipo: "festival", marco, actos, nuevos: actos.length, primero: p.primero }];
    }
    if (p.miembros.length === 1) return [{ tipo: "suelto", evento: p.primero, primero: p.primero }];
    const eventos = p.miembros.toSorted(porInicio);
    return [{ tipo: "serie", cabeza: eventos[0], eventos, funciones: eventos.length, desde: eventos[0].inicio, hasta: eventos[eventos.length - 1].inicio, primero: p.primero }];
  });
}

/**
 * Las piezas de la lista de un carril o de la pestaña Nuevos (ya sin lo visto ni lo que pasó, y en su orden: por eso la cabeza de una serie, la
 * primera por hora, es la más próxima). `marcos`: los festivales cargados, para encontrar el de un acto aunque el festival no esté en la lista (no
 * es nuevo); sin ellos, los de la propia lista.
 */
export function agruparSeries<T extends Agrupable>(eventos: readonly T[], marcos: ReadonlyMap<string, T> = marcosDe(eventos)): Pieza<T>[] {
  return juntarPiezas(eventos, (e) => grupoDe(e, marcos), (id) => marcos.get(id));
}

/** Los eventos de unas piezas, en su orden (el marco de un festival que no estaba en la lista no cuenta: no es nuevo). */
export const eventosDePiezas = <T>(piezas: readonly Pieza<T>[], lista: readonly T[]): T[] => {
  const dentro = new Set<T>(piezas.flatMap((p) => (p.tipo === "suelto" ? [p.evento] : p.tipo === "serie" ? p.eventos : [p.marco, ...p.actos])));
  return lista.filter((e) => dentro.has(e));
};

/** Lo que representa una pieza en una lista de eventos (contar, enlazar): el evento suelto, el marco del festival o la cabeza de la serie. */
export const cabezaDe = <T>(p: Pieza<T>): T => (p.tipo === "suelto" ? p.evento : p.tipo === "festival" ? p.marco : p.cabeza);

/** «1 acto nuevo», «3 actos nuevos». */
export const textoActosNuevos = (n: number): string => `${n} ${n === 1 ? "acto nuevo" : "actos nuevos"}`;
/** «6 funciones». */
export const textoFunciones = (n: number): string => `${n} ${n === 1 ? "función" : "funciones"}`;
/**
 * El cuándo de una serie: «desde vie 16 · 20:00» (o «desde hoy · 20:00», «desde mañana · 20:00»), el día y la hora de su función más próxima. En la
 * tarjeta de Inicio va sin el mes, que ya dice su sello («oct 16–18») y así cabe en la mediana sin cortarse; en el renglón de la agenda, que no
 * lleva sello, con él («desde vie 16 de oct · 20:00», `conMes`).
 */
export function textoDesde(e: { inicio: string; zona: string }, ahora: Date = new Date(), conMes = false): string {
  const dia = diaCorto(e.inicio, ahora, e.zona);
  const corto = dia === "Hoy" || dia === "Mañana" ? dia.toLowerCase() : conMes ? diaConMes(e.inicio, ahora, e.zona) : new Intl.DateTimeFormat("es-MX", { timeZone: e.zona, weekday: "short", day: "numeric" }).format(new Date(e.inicio)).replace(/[.,]/g, "");
  return `desde ${corto} · ${horaCorta(e.inicio, e.zona)}`;
}

// ---------- la ficha de una función (OL-385) ----------

/**
 * Las otras funciones de un evento, para su ficha («Otras funciones»): de los candidatos (los del mismo lugar o el mismo sitio escrito, como los lee
 * la ficha), los que son la misma serie (`mismaSerie`), ni marco ni exposición, que no han pasado (`paso`, la regla de la app: `eventoPaso`), sin él
 * mismo; por hora. Sin funciones hermanas, vacío: la ficha no cambia.
 */
export function otrasFunciones<T extends Agrupable>(e: Agrupable, candidatos: readonly T[], paso: (x: T) => boolean): T[] {
  if (esMarco(e) || esExposicion(e)) return [];
  return candidatos.filter((x) => x.id !== e.id && !esMarco(x) && !esExposicion(x) && mismaSerie(e, x) && !paso(x)).toSorted(porInicio);
}

/** «Función 2 de 6»: cuál es entre las que no han pasado, contándose ella. Null sin otras funciones. */
export function textoFuncion(e: Pick<Agrupable, "id" | "inicio">, otras: readonly Pick<Agrupable, "id" | "inicio">[]): string | null {
  if (!otras.length) return null;
  const todas = [e, ...otras].toSorted(porInicio);
  return `Función ${todas.findIndex((x) => x.id === e.id) + 1} de ${todas.length}`;
}
