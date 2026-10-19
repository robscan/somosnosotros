import { articuloDeHora, horaCorta, reloj24 } from "@/lib/fechas";

/** La zona en la que se dice la hora de los datos: la de la ciudad donde trabaja Administración. */
const ZONA = "America/Mexico_City";

const diaCorto = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, day: "numeric", month: "short" });
const diaCompleto = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Cuándo se calcularon los datos del grafo (OL-402, bitácora 433): «Datos de las 2:05 pm» (o «de la 1:05 pm») si fue hoy y «Datos del 12 oct,
 * 2:05 pm» si fue otro día, con la hora de toda la app (`horaCorta`, OL-418), siempre en la hora de Ciudad de México. `calculadoEn` es el instante
 * ISO del cálculo y `ahora`, el momento de mirar. Lógica pura.
 */
export function textoDatosDe(calculadoEn: string, ahora: Date): string {
  const t = new Date(calculadoEn);
  if (Number.isNaN(t.getTime())) return "Datos de hace un rato";
  const h = horaCorta(calculadoEn, ZONA);
  return diaCompleto.format(t) === diaCompleto.format(ahora) ? `Datos de ${articuloDeHora(reloj24(calculadoEn, ZONA))} ${h}` : `Datos del ${diaCorto.format(t)}, ${h}`;
}
