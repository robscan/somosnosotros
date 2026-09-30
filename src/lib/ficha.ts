import { diaLocal, fechaCortaChip, horaCorta, ZONA_INICIAL } from "./fechas";

/**
 * Los textos de los tres números de una ficha (docs/rediseno/50, P6; `ui/Kpi`): el día y la hora de un evento, la distancia a un
 * lugar y cuántos próximos hay. Puros, para probarlos sin pintar nada.
 */

/**
 * Cuándo es un evento: el día («vie 2 oct») y, aparte, la hora en que empieza («19:00»), porque el número no lleva la palabra
 * «Fecha»: el día ya dice que lo es. Si termina otro día, el día dice hasta cuándo («vie 2 oct – dom 4 oct»).
 */
export function kpiCuando(inicio: string, fin: string | null, zona: string = ZONA_INICIAL): { dia: string; hora: string } {
  const dia = fechaCortaChip(inicio, zona);
  const otroDia = fin !== null && diaLocal(new Date(fin), zona) !== diaLocal(new Date(inicio), zona);
  return { dia: otroDia ? `${dia} – ${fechaCortaChip(fin, zona)}` : dia, hora: horaCorta(inicio, zona) };
}

/** La distancia en línea recta a un lugar: «550 m» hasta el kilómetro, después «1,4 km» y, de 10 en adelante, sin decimales. */
export function kpiDistancia(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km < 10 ? km.toFixed(1).replace(".", ",").replace(",0", "") : Math.round(km)} km`;
}

/** Cuántos eventos (o fechas, con `femenino`) vienen: «Ninguno», «1 próximo», «3 próximos». */
export function kpiProximos(cuantos: number, femenino = false): string {
  if (cuantos === 0) return femenino ? "Ninguna" : "Ninguno";
  const proximo = femenino ? "próxima" : "próximo";
  return cuantos === 1 ? `1 ${proximo}` : `${cuantos} ${proximo}s`;
}
