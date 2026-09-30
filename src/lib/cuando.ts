import { sumarDiasIso } from "./calendario";
import { fechaCortaChip, localAIso, zonaSegura, ZONA_INICIAL } from "./fechas";

/**
 * «Cuándo» de la agenda (docs/rediseno/50, P5): un rango de días de la ciudad, YYYY-MM-DD con los dos extremos dentro;
 * un solo día es `desde === hasta`. Sin rango (`null`) son todos los próximos. Lógica pura: la hoja Cuándo (`ui/HojaCuando`)
 * y Agenda solo la dibujan y la aplican.
 */
export type Cuando = { desde: string; hasta: string };

/** «Esta semana» son los próximos 7 días desde hoy, como el carril de Inicio: no la semana de calendario. */
export const DIAS_ESTA_SEMANA = 7;

export type Atajo = { etiqueta: string; cuando: Cuando };

/** Domingo = 0 … sábado = 6, de un día YYYY-MM-DD. */
const diaDeLaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();

/**
 * Los atajos de la hoja Cuándo, contados desde hoy (YYYY-MM-DD en la zona de la ciudad). El fin de semana es el sábado y
 * el domingo de esta semana (de lunes a domingo); si ya empezó, va desde hoy.
 */
export function atajosCuando(hoy: string): Atajo[] {
  const semana = diaDeLaSemana(hoy);
  const sabado = sumarDiasIso(hoy, semana === 0 ? -1 : 6 - semana);
  const manana = sumarDiasIso(hoy, 1);
  return [
    { etiqueta: "Hoy", cuando: { desde: hoy, hasta: hoy } },
    { etiqueta: "Mañana", cuando: { desde: manana, hasta: manana } },
    { etiqueta: "Fin de semana", cuando: { desde: sabado > hoy ? sabado : hoy, hasta: sumarDiasIso(sabado, 1) } },
    { etiqueta: "Esta semana", cuando: { desde: hoy, hasta: sumarDiasIso(hoy, DIAS_ESTA_SEMANA - 1) } },
  ];
}

export const mismoCuando = (a: Cuando | null, b: Cuando | null) => a?.desde === b?.desde && a?.hasta === b?.hasta;

/** «30 sep», el día y el mes de un día YYYY-MM-DD de la zona. */
function diaYMes(dia: string, zona: string): string {
  const iso = localAIso(`${dia}T12:00`, zona) ?? dia;
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), day: "numeric", month: "short" }).format(new Date(iso)).replace(/[.,]/g, "");
}

/**
 * Lo que dice el chip Cuándo: el nombre del atajo si el rango es uno («Hoy», «Fin de semana»), «mié 30 sep» si es un solo
 * día y «30 sep – 3 oct» si son varios. Un día elegido en el calendario que resulta ser hoy también dice «Hoy».
 */
export function etiquetaCuando(cuando: Cuando, hoy: string, zona: string = ZONA_INICIAL): string {
  const atajo = atajosCuando(hoy).find((a) => mismoCuando(a.cuando, cuando));
  if (atajo) return atajo.etiqueta;
  if (cuando.desde === cuando.hasta) return fechaCortaChip(localAIso(`${cuando.desde}T12:00`, zona) ?? cuando.desde, zona);
  return `${diaYMes(cuando.desde, zona)} – ${diaYMes(cuando.hasta, zona)}`;
}

/**
 * Un toque en un día del calendario: el primero elige un día, un segundo toque en un día posterior cierra el rango hasta él
 * y tocar el mismo día lo quita; con un rango ya hecho, el toque empieza uno nuevo. Devuelve lo que queda elegido.
 */
export function elegirEnRango(actual: Cuando | null, dia: string): Cuando | null {
  if (!actual || actual.desde !== actual.hasta || dia < actual.desde) return { desde: dia, hasta: dia };
  return dia > actual.desde ? { desde: actual.desde, hasta: dia } : null;
}

const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** El Cuándo que llega en la URL (`?desde=…&hasta=…`); lo que no sea un día válido es «todos los próximos». */
export function cuandoDeUrl(desde?: string, hasta?: string): Cuando | null {
  if (!desde || !DIA_ISO.test(desde)) return null;
  return { desde, hasta: hasta && DIA_ISO.test(hasta) && hasta >= desde ? hasta : desde };
}
