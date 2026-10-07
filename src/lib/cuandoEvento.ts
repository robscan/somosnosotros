import { FIN_DEL_DIA, etiquetaHora, sumarDiasIso } from "./calendario";
import { combinarFechaHora, rangoCorto } from "./fechas";

/**
 * Qué quedan siendo el inicio y el fin de un evento cuando la persona elige la hora de fin en los pasos del alta y de editar
 * (OL-298, bitácora 326; OL-319), y cómo se dicen sus horas en esos pasos. Lógica pura, sin DOM: se prueba sola. Los dos valores son
 * «YYYY-MM-DDTHH:MM» en la hora del sitio del evento; el fin es "" si no hay hora de fin.
 */
export type InicioFin = { inicio: string; fin: string };

/** «2026-11-14T19:00» en su día y su hora; vacíos si no hay valor. */
export function partirLocal(local: string): { fecha: string; hora: string } {
  const [fecha = "", hora = ""] = local.split("T");
  return { fecha, hora: hora.slice(0, 5) };
}

/** ¿El fin cae en un día posterior al del inicio (un evento de varios días, o uno que cruza la medianoche)? */
function terminaOtroDia({ inicio, fin }: InicioFin): boolean {
  return !!fin && partirLocal(fin).fecha > partirLocal(inicio).fecha;
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

/** «las» o «la» antes de una hora de inicio («desde las 8:00 p.m.», «desde la 1:00 p.m.»). */
export const desdeLas = (hora: string): string => (Number(hora.slice(0, 2)) % 12 === 1 ? "la" : "las");

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
  return `${rango} · cada día desde ${desdeLas(hora)} ${h.desde}`;
}
