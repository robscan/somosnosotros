import { eventoPaso, formatearLargo } from "./fechas";

/** Lo mínimo de un evento ligado (la inauguración de una exposición, la exposición que inaugura un acto) para decidir si se enlaza. */
export type EventoLigado = { inicio: string; fin: string | null; zona: string };

/**
 * Un renglón de lo ligado en la ficha (OL-380): si el evento ya pasó, su ficha le dice «Esto ya no está» al visitante, así que no se
 * enlaza («Debemos procurar no poner opciones que generen errores», founder, 2026-10-12). Lo que pasó se dice en pasado («Fue el viernes
 * 9 de octubre · 20:00») con el mismo `formatearLargo` de la ficha; lo de hoy o lo que viene, con su fecha y enlace. Pasado es la regla de
 * siempre (`eventoPaso`: su fin, o 3 h después de empezar si no tiene).
 */
export function renglonLigado(l: EventoLigado, ahora: Date = new Date()): { enlaza: boolean; cuando: string } {
  const cuando = formatearLargo(l.inicio, ahora, null, l.zona);
  return eventoPaso(l.inicio, l.fin, ahora, l.zona) ? { enlaza: false, cuando: `Fue el ${cuando}` } : { enlaza: true, cuando };
}
