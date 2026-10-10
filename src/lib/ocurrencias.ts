import type { Clase } from "./eventos";
import { MAX_DIAS_SESIONES, type SesionGuardada } from "./sesionesEvento";
import { FIN_DEL_DIA, sumarDiasIso } from "./calendario";
import { diaLocal, esDeVariosDias, isoALocal, localAIso, terminaDe } from "./fechas";

/**
 * Las ocurrencias de un evento (OL-320): cada día en que pasa algo. La agenda coloca el evento en cada una, con su hora de ese día, en vez de
 * solo en el día en que empieza: un taller de tres sábados sale tres veces. Lógica pura, sin DOM ni base; se calcula en la app a partir de
 * lo que la agenda ya carga (el evento y, si lo tiene, su horario por día), así los filtros, el calendario de Cuándo y los carriles de Inicio
 * parten de una sola definición y no hay una vista de SQL que repetir.
 *
 * Qué cuenta como un día en que pasa algo:
 * - Con horario por día (`sesiones`, OL-311): un día por sesión, con su hora.
 * - De un solo día (o una noche que cruza la medianoche, que es una noche): el propio evento, sin cambios.
 * - De varios días sin horario por día: el mismo horario cada día (OL-309, «¿A qué hora, cada día?»): un día entre el de inicio y el de fin,
 *   con la hora de inicio y, si lo tiene, la de fin del último día; sin hora de fin, termina con su día. De más de `MAX_DIAS_SESIONES` días
 *   (una exposición de temporada) no se reparte: sigue siendo una sola, como hasta ahora, en su día de inicio (la pieza de exposiciones
 *   y festivales decide cómo se agenda lo largo).
 *
 * Por clase (OL-322, doc 55 §3): una **exposición** y el **marco de un festival** no son algo que pase un día a una hora y no tienen ocurrencias. La
 * exposición vive en «Para visitar» (`lib/agendaPorClase`); el marco sale una vez en los carriles y, en la agenda del día, como el bloque que
 * agrupa sus actos de ese día. Sus actos (eventos con `evento_padre_id`) y las sesiones de un taller sí se reparten como cualquier otro.
 */

/** Qué día es de su evento: «Día 2 de 3». Los de un evento de un solo día no lo llevan. */
export type Parte = { n: number; de: number };

/** Lo que hace de un evento visto un día concreto: se suma al evento, que conserva su `id` y todo lo demás. */
export type DatosOcurrencia = {
  /** Distingue el renglón de cada día de un mismo evento (`id` + día): la llave de las listas y de los carriles. */
  clave: string;
  /** El día (YYYY-MM-DD) en la zona del evento. */
  dia: string;
  /** Cuál es de los días del evento; null si el evento es de un solo día. */
  parte: Parte | null;
};

type Evento = { id: string; inicio: string; fin: string | null; zona: string; sesiones?: readonly SesionGuardada[]; clase?: Clase | null };
/** El evento tal cual, visto un día: su `inicio` y su `fin` son los de ese día y ya no lleva `sesiones`. */
export type ConOcurrencia<T> = Omit<T, "sesiones"> & { ocurrencia?: DatosOcurrencia };

/** La llave de un renglón o una tarjeta: la de su día si es una ocurrencia, y el `id` si es el evento entero. */
export const claveDe = (e: { id: string; ocurrencia?: Pick<DatosOcurrencia, "clave"> }): string => e.ocurrencia?.clave ?? e.id;

/** «Día 2 de 3» o, en un taller, «Sesión 2 de 4» (OL-322); null si es un evento de un solo día. */
export const textoParte = (e: { ocurrencia?: Pick<DatosOcurrencia, "parte">; clase?: Clase | null }): string | null =>
  e.ocurrencia?.parte ? `${e.clase === "taller" ? "Sesión" : "Día"} ${e.ocurrencia.parte.n} de ${e.ocurrencia.parte.de}` : null;

/** ¿Tiene ocurrencias? Una exposición y el marco de un festival no (OL-322): no pasan un día a una hora. */
export const sinOcurrencias = (e: { clase?: Clase | null }): boolean => e.clase === "exposicion" || e.clase === "festival";

/** El evento sin su horario por día: cada día de los que se reparte ya lleva el suyo. */
function sinSesiones<T extends Evento>(e: T): Omit<T, "sesiones"> {
  const copia: Partial<T> = { ...e };
  delete copia.sesiones;
  return copia as Omit<T, "sesiones">;
}

/** Un evento sin cambios, como único día. */
function entero<T extends Evento>(e: T): ConOcurrencia<T> {
  const dia = diaLocal(new Date(e.inicio), e.zona);
  return { ...sinSesiones(e), ocurrencia: { clave: `${e.id}:${dia}`, dia, parte: null } };
}

/**
 * Cada día de un evento de varios días que se vive con el mismo horario: el de inicio y, si lo tiene, el de fin del último día (OL-309). Solo si
 * así se lee: el fin cae después de la hora de inicio o es el del día entero (`FIN_DEL_DIA`: sin hora de fin puesta). Un fin antes de la hora
 * de inicio («viernes 18:00 a domingo 11:00») es un evento corrido, no un horario de cada día: null, y se queda entero. Null también si son
 * más días que los que admite el horario por día.
 */
function porDia<T extends Evento>(e: T, fin: string): ConOcurrencia<T>[] | null {
  const desde = diaLocal(new Date(e.inicio), e.zona);
  const hasta = diaLocal(new Date(fin), e.zona);
  const de = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000) + 1;
  if (de > MAX_DIAS_SESIONES) return null;
  const horaInicio = isoALocal(e.inicio, e.zona).slice(11, 16);
  const horaFin = isoALocal(fin, e.zona).slice(11, 16);
  if (horaFin !== FIN_DEL_DIA && horaFin <= horaInicio) return null;
  const resto = sinSesiones(e);
  const ocurrencias: ConOcurrencia<T>[] = [];
  for (let n = 1; n <= de; n++) {
    const dia = sumarDiasIso(desde, n - 1);
    const inicio = localAIso(`${dia}T${horaInicio}`, e.zona);
    if (!inicio) return null;
    ocurrencias.push({ ...resto, inicio, fin: horaFin === FIN_DEL_DIA ? null : localAIso(`${dia}T${horaFin}`, e.zona), ocurrencia: { clave: `${e.id}:${dia}`, dia, parte: { n, de } } });
  }
  return ocurrencias;
}

/**
 * Todos los días de un evento, en orden, también los que ya pasaron (el «Día 2 de 3» cuenta desde el primero). Un evento sin nada que repartir
 * da uno solo: él mismo. `sesiones` son las vigentes (`sesionesVigentes`): las que ya no coinciden con el evento no se pasan aquí.
 */
export function ocurrenciasDe<T extends Evento>(e: T): ConOcurrencia<T>[] {
  if (sinOcurrencias(e)) return [];
  const sesiones = e.sesiones && e.sesiones.length >= 2 ? [...e.sesiones].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio)) : [];
  if (sesiones.length > 0) {
    const resto = sinSesiones(e);
    return sesiones.map((s, i) => {
      const dia = diaLocal(new Date(s.inicio), e.zona);
      return { ...resto, inicio: s.inicio, fin: s.fin, ocurrencia: { clave: `${e.id}:${dia}`, dia, parte: { n: i + 1, de: sesiones.length } } };
    });
  }
  if (!e.fin || !esDeVariosDias(e.inicio, e.fin, e.zona)) return [entero(e)];
  const dias = porDia(e, e.fin);
  return dias ?? [entero(e)];
}

/** ¿Ya terminó ese día? Con hora de fin, cuando terminó; sin ella, 3 horas después de empezar: la misma regla que el evento (`terminaDe`, OL-358). */
export const ocurrenciaPaso = (o: { inicio: string; fin: string | null; zona: string }, ahora: Date): boolean => new Date(terminaDe(o.inicio, o.fin, o.zona)).getTime() < ahora.getTime();

/**
 * Los días de un evento que todavía no pasan: lo que la agenda enseña, de hoy en adelante. Un día con hora de fin se queda hasta que termina, y
 * uno sin ella hasta que acaba el día (una sesión de hoy no desaparece a media tarde). Un evento de un solo día no se toca: que haya pasado lo
 * decide la base con su `termina` (`filtroSinPasar`), como siempre; aquí solo se quitan los días ya pasados de un evento que se reparte en varios.
 */
export function ocurrenciasVigentes<T extends Evento>(e: T, ahora: Date = new Date()): ConOcurrencia<T>[] {
  return ocurrenciasDe(e).filter((o) => !o.ocurrencia?.parte || !ocurrenciaPaso(o, ahora));
}

/** Los días de todos esos eventos que todavía no pasan, sin ordenar. */
export function ocurrenciasDeLista<T extends Evento>(eventos: readonly T[], ahora: Date = new Date()): ConOcurrencia<T>[] {
  return eventos.flatMap((e) => ocurrenciasVigentes(e, ahora));
}

/**
 * El evento visto en su próximo día: el de hoy si sigue, y si no el que sigue. Las tarjetas que hablan del evento y no de un día (los
 * destacados, lo nuevo, lo que sigues) dicen esa fecha y no la de su primer día, que puede ya haber pasado. Sin ninguno vigente (un dato
 * que la base todavía no filtró), el evento tal cual.
 */
export function proximaOcurrencia<T extends Evento>(e: T, ahora: Date = new Date()): ConOcurrencia<T> {
  return ocurrenciasVigentes(e, ahora)[0] ?? entero(e);
}
