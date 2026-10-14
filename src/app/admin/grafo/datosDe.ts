/** La zona en la que se dice la hora de los datos: la de la ciudad donde trabaja Administración. */
const ZONA = "America/Mexico_City";

const hora = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const diaCorto = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, day: "numeric", month: "short" });
const diaCompleto = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Cuándo se calcularon los datos del grafo (OL-402, bitácora 433): «Datos de las 14:05» si fue hoy y «Datos del 12 oct, 14:05» si fue otro día,
 * siempre en la hora de Ciudad de México. `calculadoEn` es el instante ISO del cálculo y `ahora`, el momento de mirar. Lógica pura.
 */
export function textoDatosDe(calculadoEn: string, ahora: Date): string {
  const t = new Date(calculadoEn);
  if (Number.isNaN(t.getTime())) return "Datos de hace un rato";
  const h = hora.format(t);
  return diaCompleto.format(t) === diaCompleto.format(ahora) ? `Datos de las ${h}` : `Datos del ${diaCorto.format(t)}, ${h}`;
}
