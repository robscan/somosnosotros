import { FIN_DEL_DIA, etiquetaHora, sumarDiasIso } from "./calendario";
import { combinarFechaHora, localAIso, rangoCorto, sumarHoras } from "./fechas";

/**
 * Qué quedan siendo el inicio y el fin de un evento cuando la persona toca algo en las hojas de día y de hora del alta y la
 * edición (OL-298, bitácora 326). Lógica pura, sin DOM: `SelectorCuando` solo la llama y se prueba sola. Los dos valores son
 * «YYYY-MM-DDTHH:MM» en la hora del sitio del evento; el fin es "" si no hay hora de fin.
 */
export type InicioFin = { inicio: string; fin: string };

/** La hora con la que arranca un evento al que se le elige día sin que tenga hora. */
export const HORA_INICIAL = "19:00";

/** «2026-11-14T19:00» en su día y su hora; vacíos si no hay valor. */
export function partirLocal(local: string): { fecha: string; hora: string } {
  const [fecha = "", hora = ""] = local.split("T");
  return { fecha, hora: hora.slice(0, 5) };
}

/** Horas (con cuartos) de un valor a otro en la zona del evento; 0 si falta alguno. */
export function horasEntre(inicio: string, fin: string, zona: string): number {
  const a = localAIso(inicio, zona);
  const b = localAIso(fin, zona);
  if (!a || !b) return 0;
  return Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 3600000) * 4) / 4;
}

/** ¿El fin cae en un día posterior al del inicio (un evento de varios días, o uno que cruza la medianoche)? */
export function terminaOtroDia({ inicio, fin }: InicioFin): boolean {
  return !!fin && partirLocal(fin).fecha > partirLocal(inicio).fecha;
}

/** ¿El evento acaba con su último día, sin hora de fin puesta por nadie? Solo pasa en uno de varios días: es el único modo
 *  de tener un día de fin sin hora (`eventos.fin` guarda siempre un instante). */
export function finDelDia({ fin }: InicioFin): boolean {
  return !!fin && partirLocal(fin).hora === FIN_DEL_DIA;
}

/**
 * Se eligieron día(s) en el calendario. Con un rango (`hasta` posterior a `desde`) el evento termina el último día, a la hora
 * de fin que ya tenía o, si no tenía, al acabar ese día. Con un solo día el evento termina ese mismo día a la hora de fin que
 * ya tenía (como siempre: mover el día mueve el fin con él); si cruzaba la medianoche, sigue cruzándola (termina al día
 * siguiente a la misma hora); si acababa con su último día (sin hora propia), queda sin hora de fin.
 */
export function conDias(actual: InicioFin, desde: string, hasta: string | null): InicioFin {
  const hora = partirLocal(actual.inicio).hora || HORA_INICIAL;
  const inicio = combinarFechaHora(desde, hora);
  if (hasta && hasta > desde) return { inicio, fin: combinarFechaHora(hasta, actual.fin ? partirLocal(actual.fin).hora : FIN_DEL_DIA) };
  const horaFin = partirLocal(actual.fin).hora;
  if (!inicio || !horaFin || horaFin === FIN_DEL_DIA || horaFin === hora) return { inicio, fin: "" };
  return { inicio, fin: combinarFechaHora(horaFin > hora ? desde : sumarDiasIso(desde, 1), horaFin) };
}

/**
 * Se eligió la hora de inicio. El fin se mueve con él (misma duración), salvo el de un evento que acaba con su último día,
 * que se queda donde está. Sin día de inicio no hay nada que mover.
 */
export function conHoraInicio(actual: InicioFin, hora: string, zona: string): InicioFin {
  const inicio = combinarFechaHora(partirLocal(actual.inicio).fecha, hora);
  if (!inicio || !actual.fin) return { inicio, fin: "" };
  if (finDelDia(actual)) return { inicio, fin: actual.fin };
  const duracion = horasEntre(actual.inicio, actual.fin, zona);
  return { inicio, fin: duracion > 0 ? sumarHoras(inicio, duracion, zona) : "" };
}

/**
 * Se eligió la hora de fin; `""` es «Sin hora de fin». El fin cae en el último día del evento (el del inicio, si no dura varios).
 * En un evento de un solo día, una hora anterior a la del inicio es la madrugada del día siguiente («empieza 10:00 p.m.,
 * termina 1:00 a.m.»): el fin cae un día después, no se rechaza (founder, 2026-10-05: en producción, 2 de 36 eventos con fin
 * terminan al día siguiente). La misma hora del inicio no se acepta (serían 24 horas): el evento queda como estaba. «Sin hora
 * de fin» en un evento de varios días lo deja acabando con su último día; en uno de un solo día, sin fin.
 */
export function conHoraFin(actual: InicioFin, hora: string): InicioFin {
  const ini = partirLocal(actual.inicio);
  const ultimo = terminaOtroDia(actual) ? partirLocal(actual.fin).fecha : ini.fecha;
  if (!hora) return { inicio: actual.inicio, fin: ultimo > ini.fecha ? combinarFechaHora(ultimo, FIN_DEL_DIA) : "" };
  if (ultimo === ini.fecha && ini.hora && hora === ini.hora) return actual;
  if (ultimo === ini.fecha && ini.hora && hora < ini.hora) return { inicio: actual.inicio, fin: combinarFechaHora(sumarDiasIso(ini.fecha, 1), hora) };
  return { inicio: actual.inicio, fin: combinarFechaHora(ultimo, hora) };
}

/**
 * Dos horas de un mismo día en la letra de los chips del alta («8:00» y «9:00 p.m.»): el «p.m.» no se repite cuando las dos lo comparten, y
 * sí cuando no («11:00 a.m.» y «2:00 p.m.»). Con una sola, la hora completa.
 */
export function horasDelDia(desde: string, hasta?: string): { desde: string; hasta?: string } {
  const a = etiquetaHora(desde);
  if (!hasta) return { desde: a };
  const b = etiquetaHora(hasta);
  const sufijo = (texto: string) => /^\d{1,2}:\d{2}(\s[\s\S]*)$/.exec(texto)?.[1] ?? "";
  return { desde: sufijo(a) === sufijo(b) ? a.slice(0, a.length - sufijo(a).length) : a, hasta: b };
}

/**
 * La línea del paso «¿A qué hora, cada día?» del alta (OL-309): el horario del primer día se aplica a todos, así que se dice así
 * («Del 10 al 12 de oct · cada día de 8:00 a 9:00 p.m.»). Va en 12 h, como los chips que tiene encima; lo que se lee fuera del paso
 * (`cuandoVariosDias`) va en 24 h, como el resto de la app. Sin hora de fin puesta (`fin` vacío o `FIN_DEL_DIA`: el evento acaba con su
 * último día) solo dice desde cuándo («… · cada día desde las 8:00 p.m.»). `hoy` es YYYY-MM-DD en la zona del evento: el año solo se
 * escribe si no es el actual.
 */
export function resumenCadaDia(dias: { desde: string; hasta: string }, hora: string, fin: string, hoy: string): string {
  const horaFin = partirLocal(fin).hora;
  const rango = rangoCorto(dias.desde, dias.hasta, hoy);
  const h = horasDelDia(hora, !horaFin || horaFin === FIN_DEL_DIA ? undefined : horaFin);
  if (h.hasta) return `${rango} · cada día de ${h.desde} a ${h.hasta}`;
  return `${rango} · cada día desde ${Number(hora.slice(0, 2)) % 12 === 1 ? "la" : "las"} ${h.desde}`;
}
