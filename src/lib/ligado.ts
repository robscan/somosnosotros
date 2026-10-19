import { diaLargo, diaLocal, eventoPaso, formatearLargo } from "./fechas";

/** Lo mínimo de un evento ligado (la inauguración de una exposición, la exposición que inaugura un acto, el festival de un acto) para su renglón. */
export type EventoLigado = { inicio: string; fin: string | null; zona: string; /** «Se canceló» (OL-391). */ cancelado?: boolean | null };

/**
 * Un renglón de lo ligado en la ficha. Siempre se enlaza: lo que ya pasó abre su ficha en pasado (OL-383), y el renglón lo dice en pasado para que
 * no se perciba activo (OL-388; founder, 2026-10-12, 13:10: «Pon enlace a objetos del pasado para que se vea quién fue, pero claramente que sean
 * pasados y no se perciban activos». Sustituye a la decisión de esa mañana, OL-380, de no enlazarlo porque su ficha decía «Esto ya no está»).
 *
 * Pasado es la regla de siempre (`eventoPaso`: su fin, o 3 h después de empezar si no tiene). Lo de hoy o lo que viene lleva su fecha con el
 * mismo `formatearLargo` de la ficha («viernes 9 de octubre · 8:00 pm»); lo que pasó, «Fue el viernes 9 de octubre · 8:00 pm». Con `cierre` («Cerró»
 * para una exposición, «Terminó» para un festival) y un fin, se dice el día en que acabó: «Cerró el domingo 29 de noviembre».
 *
 * Lo que ya pasó y se marcó «se canceló» (OL-391) dice «Se canceló» en vez de «Fue el …»: no ocurrió. Lo que no ha pasado no se puede marcar
 * (la acción lo rechaza), así que la marca solo cuenta en pasado.
 */
export function renglonLigado(l: EventoLigado, ahora: Date = new Date(), cierre?: "Cerró" | "Terminó"): { pasado: boolean; cuando: string } {
  if (!eventoPaso(l.inicio, l.fin, ahora, l.zona)) return { pasado: false, cuando: formatearLargo(l.inicio, ahora, null, l.zona) };
  if (l.cancelado) return { pasado: true, cuando: "Se canceló" };
  if (cierre && l.fin) return { pasado: true, cuando: `${cierre} el ${diaLargo(diaLocal(new Date(l.fin), l.zona), ahora, l.zona)}` };
  return { pasado: true, cuando: `Fue el ${formatearLargo(l.inicio, ahora, null, l.zona)}` };
}
