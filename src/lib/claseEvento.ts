import { FIN_DEL_DIA, etiquetaHora } from "./calendario";
import type { Clase } from "./eventos";
import { diaConMesDe, diaLocal, eventoPaso, fechaCortaChip, localAIso, rangoCorto, terminaDe, ZONA_INICIAL } from "./fechas";
import { estructurar, textoRangos, type Dia, type Franja, type Rango } from "./horarioLugar";
import type { HorarioDia } from "./sesionesEvento";

/**
 * Las fechas y el horario de cada forma de ocurrir (OL-321; doc 55 §1 y §3), sin DOM: cómo se guarda y cómo se lee una exposición, un taller y
 * un festival con las columnas de siempre (`inicio`, `fin`), para que la agenda, las búsquedas y los avisos no cambien.
 *
 * - **Exposición**: `inicio` es su primer día de visita (00:00 en su zona) y `fin` el final del día de cierre (23:59, la regla de «acaba con su
 *   último día» de la app): pasa al terminar ese día. Su horario es el propio (`eventos_horarios`) o, sin él, el de su lugar
 *   (`lugares_horarios`); sin ninguno, «Horario por confirmar»: no se inventa.
 * - **Taller**: sus sesiones en días sueltos (`eventos_sesiones`); `inicio`/`fin` de la primera y la última.
 * - **Festival**: del primer al último acto registrado (la base lo recalcula al cambiar su programa).
 */

/** Los días que se puede visitar una exposición: el primero y el de cierre (YYYY-MM-DD, inclusivo). */
export type Visita = { desde: string; hasta: string };

/** El inicio y el fin de una exposición, «YYYY-MM-DDTHH:MM» en la hora del sitio: del primer minuto del primer día al último del de cierre. */
export const periodoDeVisita = ({ desde, hasta }: Visita): { inicio: string; fin: string } => ({ inicio: `${desde}T00:00`, fin: `${hasta}T${FIN_DEL_DIA}` });

/** Los días de visita de una exposición guardada: el de su inicio y el de su fin, en su zona (sin fin, uno solo). */
export function visitaDeEvento(inicio: string, fin: string | null, zona: string = ZONA_INICIAL): Visita {
  const desde = diaLocal(new Date(inicio), zona);
  return { desde, hasta: fin ? diaLocal(new Date(fin), zona) : desde };
}

/** De dónde sale el horario de una exposición: el suyo, el de su lugar o ninguno («Horario por confirmar»). */
export type OrigenHorario = "propio" | "lugar" | null;

/** Las franjas que valen: las propias si tiene alguna con días; si no, las del lugar; sin ninguna, vacío y sin origen. */
export function horarioEfectivo(propio: readonly Franja[] | null | undefined, delLugar: readonly Franja[] | null | undefined): { franjas: Franja[]; origen: OrigenHorario } {
  const conDias = (f: readonly Franja[] | null | undefined) => (f ?? []).filter((x) => x.dias.length > 0);
  if (conDias(propio).length) return { franjas: conDias(propio), origen: "propio" };
  if (conDias(delLugar).length) return { franjas: conDias(delLugar), origen: "lugar" };
  return { franjas: [], origen: null };
}

/** El día de la semana de un día de calendario: 1 = lunes … 7 = domingo, como en la base. */
export function diaDeSemana(dia: string): Dia {
  const semana = new Date(`${dia}T12:00:00Z`).getUTCDay();
  return (semana === 0 ? 7 : semana) as Dia;
}

/** Las horas de un día de la semana según el horario ya estructurado (las franjas encimadas, unidas); vacío si ese día cierra o no hay horario. */
export function rangosDelDia(franjas: readonly Franja[], dia: Dia): Rango[] {
  return estructurar(franjas).grupos.find((g) => g.dias.includes(dia))?.rangos ?? [];
}

/** ¿La exposición se puede visitar ese día? Entre su primer día y el de cierre, ambos incluidos. */
export const enVisita = (visita: Visita, dia: string): boolean => dia >= visita.desde && dia <= visita.hasta;

/**
 * Lo que dice de hoy (la ficha, «Publicado»): «Abre hoy 10:00 a.m.–6:00 p.m.», «Hoy cierra» o «Horario por confirmar»; null fuera del periodo
 * de visita (antes de abrir o ya cerrada), donde «hoy» no dice nada.
 */
export function textoHoy(visita: Visita, franjas: readonly Franja[], hoy: string): string | null {
  if (!enVisita(visita, hoy)) return null;
  if (!franjas.some((f) => f.dias.length)) return "Horario por confirmar";
  const rangos = rangosDelDia(franjas, diaDeSemana(hoy));
  return rangos.length ? `Abre hoy ${textoRangos(rangos)}` : "Hoy cierra";
}

/** «Hasta el dom 30 de nov» o, antes de abrir, «Del 6 al 30 de nov». `hoy` es YYYY-MM-DD en la zona. */
export function textoVisita(visita: Visita, hoy: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  if (hoy < visita.desde) return rangoCorto(visita.desde, visita.hasta, hoy);
  return `Hasta el ${diaConMesDe(visita.hasta, ahora, zona)}`;
}

/**
 * La línea de una exposición (ficha, compartir, «Publicado»; doc 55 §3): «Hasta el dom 30 de nov · Abre hoy 10:00 a.m.–6:00 p.m.», o con
 * «Horario por confirmar»; antes de abrir, sus días.
 */
export function lineaDeExposicion(evento: { inicio: string; fin: string | null; zona: string }, franjas: readonly Franja[], ahora: Date = new Date()): string {
  const visita = visitaDeEvento(evento.inicio, evento.fin, evento.zona);
  const hoy = diaLocal(ahora, evento.zona);
  return [textoVisita(visita, hoy, ahora, evento.zona), textoHoy(visita, franjas, hoy)].filter(Boolean).join(" · ");
}

/** Los números de la ficha de una exposición (`ui/Kpi`): «Hasta» con su día y «Hoy» con sus horas en 24 h (como todo lo que se lee en un número),
 *  «Cerrado» o «Por confirmar»; fuera del periodo, sus días. */
export function kpisDeExposicion(evento: { inicio: string; fin: string | null; zona: string }, franjas: readonly Franja[], ahora: Date = new Date()): { hasta: string; hoy: { etiqueta: string; valor: string } } {
  const visita = visitaDeEvento(evento.inicio, evento.fin, evento.zona);
  const hoy = diaLocal(ahora, evento.zona);
  const hasta = fechaCortaChip(localAIso(`${visita.hasta}T12:00`, evento.zona) ?? evento.inicio, evento.zona);
  if (hoy < visita.desde) return { hasta, hoy: { etiqueta: "Abre", valor: fechaCortaChip(evento.inicio, evento.zona) } };
  if (!franjas.some((f) => f.dias.length)) return { hasta, hoy: { etiqueta: "Horario", valor: "Por confirmar" } };
  const rangos = rangosDelDia(franjas, diaDeSemana(hoy));
  return { hasta, hoy: { etiqueta: "Hoy", valor: rangos.length ? `${rangos[0].abre}–${rangos[rangos.length - 1].cierra}` : "Cerrado" } };
}

/** El horario de cada sesión de un taller: un día por sesión, en orden y sin repetir, con la misma hora de inicio y de fin (`fin` vacío es «Sin hora de fin»). */
export const horariosDeTaller = (dias: readonly string[], hora: string, fin: string): HorarioDia[] => [...new Set(dias)].sort().map((dia) => ({ dia, hora, fin }));

const semanaCorta = (dia: string): string => new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "short" }).format(new Date(`${dia}T12:00:00Z`)).replace(/[.,]/g, "");
const mesDe = (dia: string): string => new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "short" }).format(new Date(`${dia}T12:00:00Z`)).replace(/[.,]/g, "");
const lista = new Intl.ListFormat("es", { type: "conjunction" });

/**
 * Las sesiones de un taller en una línea («Revisa», el paso de las sesiones): «3 sesiones · sáb 10, sáb 17 y sáb 24 de oct · 10:00 a.m.»; con
 * horas distintas, «· horario por sesión». Los días de un mismo mes llevan el mes una vez, al final; el año solo si no es el de `hoy`.
 */
export function resumenTaller(horarios: readonly HorarioDia[], hoy: string): string {
  const dias = [...horarios].sort((a, b) => a.dia.localeCompare(b.dia));
  if (!dias.length) return "";
  const porMes: string[][] = [];
  let mes = "";
  for (const h of dias) {
    const clave = h.dia.slice(0, 7);
    if (clave !== mes) porMes.push([]);
    mes = clave;
    porMes[porMes.length - 1].push(h.dia);
  }
  const texto = lista.format(
    porMes.map((grupo) => {
      const ultimo = grupo[grupo.length - 1];
      const anio = ultimo.slice(0, 4) === hoy.slice(0, 4) ? "" : ` de ${ultimo.slice(0, 4)}`;
      return `${lista.format(grupo.map((d) => `${semanaCorta(d)} ${Number(d.slice(8, 10))}`))} de ${mesDe(ultimo)}${anio}`;
    }),
  );
  const iguales = dias.every((h) => h.hora === dias[0].hora && h.fin === dias[0].fin);
  const hora = iguales ? (dias[0].fin ? `${etiquetaHora(dias[0].hora)}–${etiquetaHora(dias[0].fin)}` : etiquetaHora(dias[0].hora)) : "horario por sesión";
  return `${dias.length} ${dias.length === 1 ? "sesión" : "sesiones"} · ${texto} · ${hora}`;
}

/** El periodo de un festival: del inicio de su primer acto al final del último (con hora de fin, ese; sin ella, el final de su día). */
export function periodoDePrograma(actos: readonly { inicio: string; fin: string | null }[], zona: string = ZONA_INICIAL): { inicio: string; fin: string } | null {
  if (!actos.length) return null;
  const inicios = actos.map((a) => Date.parse(a.inicio));
  const fines = actos.map((a) => Date.parse(terminaDe(a.inicio, a.fin, zona)));
  return { inicio: new Date(Math.min(...inicios)).toISOString(), fin: new Date(Math.max(...fines)).toISOString() };
}

/** «Programa registrado: 3 actividades» (el modelo pide decir lo parcial: un festival registra lo que se sabe, no todo su programa). */
export const textoProgramaRegistrado = (n: number): string => `Programa registrado: ${n} ${n === 1 ? "actividad" : "actividades"}`;

/**
 * ¿Ya pasó? La misma regla para todas las clases porque cada una guarda su fin como corresponde (doc 55 §3, «Pasado»): la exposición al terminar
 * su día de cierre, el taller al terminar su última sesión y el festival al terminar su último acto registrado.
 */
export const yaPasoSegunClase = (e: { inicio: string; fin: string | null; zona: string; clase?: Clase }, ahora: Date = new Date()): boolean => eventoPaso(e.inicio, e.fin, ahora, e.zona);

/** «Me interesa» en vez de «Voy» para lo que no se vive un día concreto: una exposición o un festival (doc 55 §5, punto 2: no se inventa un día). */
export const soloInteres = (clase: Clase | null | undefined): boolean => clase === "exposicion" || clase === "festival";
