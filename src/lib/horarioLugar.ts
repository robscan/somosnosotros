import { etiquetaHora } from "./calendario";

/**
 * El horario de un lugar (OL-315; prototipo firmado `lugar-artista-por-pasos.html`, decisiones 2 a 4 de la bitácora 342). La persona lo
 * captura como quiera, en franjas: unos días y la hora en que abre y cierra (Lu–Vi de 10 a 2, Lu–Vi de 4 a 8, Sá de 4 a 8). Ley de Postel: se
 * acepta cualquier combinación —un día en dos franjas, franjas encimadas, el mismo día repetido, un bar que cierra pasada la medianoche— y lo
 * que se enseña nunca son las franjas tal como se capturaron: lo arma `estructurar`, que ordena por día, une las horas que se enciman, agrupa
 * los días con las mismas horas y dice qué días cierra. En la base es la tabla `lugares_horarios`, una fila por franja.
 */

/** 1 = lunes … 7 = domingo (ISO), como en la base. */
export type Dia = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Una franja como se captura: sus días y a qué hora abre y cierra ("HH:MM"). Si cierra a la misma hora o antes de abrir, cierra al día siguiente. */
export type Franja = { dias: number[]; abre: string; cierra: string };
export type Rango = { abre: string; cierra: string };
/** Días que comparten exactamente las mismas horas. */
export type GrupoHorario = { dias: Dia[]; rangos: Rango[] };
/** Lo que se enseña: un renglón por grupo de días (los días arriba, las horas debajo) y, si los hay, los días que cierra. `rangos` son las
 *  mismas horas, una por rango, para quien las pinta sin partir ninguna; `horas`, ya unidas con la «y». */
export type LineaHorario = { dias: string; horas: string; rangos: string[] };

export const DIAS: readonly { dia: Dia; corto: string; nombre: string }[] = [
  { dia: 1, corto: "Lu", nombre: "lunes" },
  { dia: 2, corto: "Ma", nombre: "martes" },
  { dia: 3, corto: "Mi", nombre: "miércoles" },
  { dia: 4, corto: "Ju", nombre: "jueves" },
  { dia: 5, corto: "Vi", nombre: "viernes" },
  { dia: 6, corto: "Sá", nombre: "sábado" },
  { dia: 7, corto: "Do", nombre: "domingo" },
];

/** Los días con que llega la primera franja: de martes a domingo (prototipo firmado; los museos cierran en lunes). */
export const DIAS_DE_ENTRADA: readonly Dia[] = [2, 3, 4, 5, 6, 7];
/** Las horas de abrir y de cerrar que se ofrecen como chips (prototipo firmado); cualquier otra, con «Otra hora». */
export const HORAS_ABRE = ["09:00", "10:00", "11:00", "12:00", "16:00"] as const;
export const HORAS_CIERRA = ["14:00", "17:00", "18:00", "19:00", "20:00", "21:00"] as const;
/** La primera franja: Ma–Do de 10:00 a 18:00. */
export const FRANJA_DE_ENTRADA: Franja = { dias: [...DIAS_DE_ENTRADA], abre: "10:00", cierra: "18:00" };
/** Un tope solo de cordura (la base lo repite): nadie captura tantas franjas, y así una petición no llena la tabla. */
export const TOPE_FRANJAS = 50;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINUTOS_DIA = 24 * 60;
const aMinutos = (hora: string): number => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const aHora = (minutos: number): string => {
  const m = ((minutos % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const esDia = (d: number): d is Dia => Number.isInteger(d) && d >= 1 && d <= 7;
/** Los días de una franja, sin repetir ni salirse de la semana, en orden. */
export const diasDe = (dias: readonly number[]): Dia[] => [...new Set(dias.filter(esDia))].sort((a, b) => a - b);

/**
 * El horario estructurado: por cada día, sus rangos en orden y unidos los que se enciman o se tocan (de 10 a 2 y de 1 a 3 es de 10 a 3); después,
 * los días con las mismas horas juntos, en el orden del primero de cada grupo; y los días sin ninguna franja, que son los que cierra. Un rango que
 * cierra a la hora de abrir o antes cruza la medianoche (un bar de 8 p.m. a 2 a.m.) y cuenta para el día en que abre.
 */
export function estructurar(franjas: readonly Franja[]): { grupos: GrupoHorario[]; cierra: Dia[] } {
  const porDia = DIAS.map(({ dia }) => {
    const tramos = franjas
      .filter((f) => diasDe(f.dias).includes(dia) && HORA.test(f.abre) && HORA.test(f.cierra))
      .map((f) => {
        const desde = aMinutos(f.abre);
        const hasta = aMinutos(f.cierra);
        return { desde, hasta: hasta <= desde ? hasta + MINUTOS_DIA : hasta };
      })
      .sort((a, b) => a.desde - b.desde || a.hasta - b.hasta);
    const unidos: { desde: number; hasta: number }[] = [];
    for (const t of tramos) {
      const ultimo = unidos.at(-1);
      if (ultimo && t.desde <= ultimo.hasta) ultimo.hasta = Math.max(ultimo.hasta, t.hasta);
      else unidos.push({ ...t });
    }
    return { dia, rangos: unidos.map((u) => ({ abre: aHora(u.desde), cierra: aHora(u.hasta) })) };
  });
  const grupos: GrupoHorario[] = [];
  for (const { dia, rangos } of porDia) {
    if (!rangos.length) continue;
    const clave = JSON.stringify(rangos);
    const grupo = grupos.find((g) => JSON.stringify(g.rangos) === clave);
    if (grupo) grupo.dias.push(dia);
    else grupos.push({ dias: [dia], rangos });
  }
  return { grupos, cierra: porDia.filter((d) => !d.rangos.length).map((d) => d.dia) };
}

/**
 * Los días como se leen: los seguidos, de tres en adelante, como tramo («Lu–Vi»); los sueltos, con coma («Sá, Do», «Lu, Mi, Vi»). Así un
 * horario con un hueco a media semana se lee «Lu–Mi, Vi».
 */
export function textoDias(dias: readonly number[]): string {
  const orden = diasDe(dias);
  const tramos: Dia[][] = [];
  for (const d of orden) {
    const tramo = tramos.at(-1);
    if (tramo && tramo.at(-1) === d - 1) tramo.push(d);
    else tramos.push([d]);
  }
  const corto = (d: Dia) => DIAS[d - 1].corto;
  return tramos.flatMap((t) => (t.length >= 3 ? [`${corto(t[0])}–${corto(t.at(-1)!)}`] : t.map(corto))).join(", ");
}

const lista = new Intl.ListFormat("es", { type: "conjunction" });
/** «10:00 a.m.–2:00 p.m.» (la hora de los chips: `etiquetaHora`). */
export const textoRango = (r: Rango): string => `${etiquetaHora(r.abre)}–${etiquetaHora(r.cierra)}`;
/** «10:00 a.m.–2:00 p.m. y 4:00 p.m.–8:00 p.m.»: los rangos de un día, con la «y» del español. */
export const textoRangos = (rangos: readonly Rango[]): string => lista.format(rangos.map(textoRango));

/**
 * Lo que se enseña de un horario, ya estructurado: un renglón por grupo («Lu–Vi» y «10:00 a.m.–2:00 p.m. y 4:00 p.m.–8:00 p.m.») y, aparte, los
 * días que cierra («Cierra Do»; nada si abre toda la semana). Sin ninguna franja con días, vacío: el lugar no dijo su horario.
 */
export function lineasHorario(franjas: readonly Franja[]): { lineas: LineaHorario[]; cierra: string | null } {
  const { grupos, cierra } = estructurar(franjas);
  if (!grupos.length) return { lineas: [], cierra: null };
  return { lineas: grupos.map((g) => ({ dias: textoDias(g.dias), horas: textoRangos(g.rangos), rangos: g.rangos.map(textoRango) })), cierra: cierra.length ? `Cierra ${textoDias(cierra)}` : null };
}

/** Los días de la semana que ninguna franja tiene todavía. */
export const diasLibres = (franjas: readonly Franja[]): Dia[] => DIAS.map((d) => d.dia).filter((d) => !franjas.some((f) => diasDe(f.dias).includes(d)));

/**
 * «Agregar otro horario»: la franja nueva llega con los días que aún no tienen horario ya marcados (con Lu–Vi puesto, Sá y Do) y las horas de
 * la franja de la que se parte; si no queda ningún día libre, vacía (otra hora para días que ya tienen una, como el cierre a comer).
 */
export const franjaNueva = (franjas: readonly Franja[], base: Rango): Franja => ({ dias: diasLibres(franjas), abre: base.abre, cierra: base.cierra });

/** Cambiar la hora de abrir: si el cierre quedaba el mismo día y ya no es posterior, pasa a la primera hora de cerrar que sí lo es (o a una hora después). */
export function conAbre(f: Franja, abre: string): Franja {
  const mismoDia = aMinutos(f.cierra) > aMinutos(f.abre);
  if (!mismoDia || aMinutos(f.cierra) > aMinutos(abre)) return { ...f, abre };
  return { ...f, abre, cierra: HORAS_CIERRA.find((h) => aMinutos(h) > aMinutos(abre)) ?? aHora(aMinutos(abre) + 60) };
}

/** Las horas de cerrar que se ofrecen como chip para una hora de abrir: solo las posteriores (cerrar al día siguiente se elige con «Otra hora»). */
export const horasDeCerrar = (abre: string): string[] => HORAS_CIERRA.filter((h) => aMinutos(h) > aMinutos(abre));

/** Las franjas con días, las que cuentan; las vacías se descartan al guardar. */
export const conDias = (franjas: readonly Franja[]): Franja[] => franjas.map((f) => ({ ...f, dias: diasDe(f.dias) })).filter((f) => f.dias.length > 0);

/** Lo que viaja en el formulario (`horario`): las franjas con días, en JSON. */
export const horarioParaEnviar = (franjas: readonly Franja[]): string => JSON.stringify(conDias(franjas).map(({ dias, abre, cierra }) => ({ dias, abre, cierra })));

/**
 * Lo que llega del formulario: null si el campo no vino (el horario no se toca), o las franjas leídas; ilegible, un error. Se acepta cualquier
 * combinación (Postel) salvo lo que no es un horario: una hora mal escrita o una franja que abre y cierra a la misma hora. Una franja sin días
 * se descarta.
 */
export function horarioDesdeJson(valor: FormDataEntryValue | null | undefined): { franjas: Franja[] | null; error?: string } {
  if (valor === null || valor === undefined || typeof valor !== "string") return { franjas: null };
  let crudo: unknown;
  try {
    crudo = JSON.parse(valor || "[]");
  } catch {
    return { franjas: null, error: "El horario no se entendió. Ábrelo y vuelve a intentarlo." };
  }
  if (!Array.isArray(crudo) || crudo.length > TOPE_FRANJAS) return { franjas: null, error: "El horario no se entendió. Ábrelo y vuelve a intentarlo." };
  const franjas: Franja[] = [];
  for (const f of crudo) {
    const dias = Array.isArray(f?.dias) ? diasDe(f.dias.map(Number)) : [];
    const { abre, cierra } = (f ?? {}) as Partial<Rango>;
    if (typeof abre !== "string" || typeof cierra !== "string" || !HORA.test(abre) || !HORA.test(cierra)) return { franjas: null, error: "Hay una hora del horario que no se entendió." };
    if (abre === cierra) return { franjas: null, error: "Un horario abre y cierra a la misma hora." };
    if (dias.length) franjas.push({ dias, abre, cierra });
  }
  return { franjas };
}

/** Una fila de `lugares_horarios` (la hora viene con segundos, "10:00:00") como franja. */
export const franjaDeFila = (fila: { dias: number[]; abre: string; cierra: string }): Franja => ({ dias: diasDe(fila.dias), abre: fila.abre.slice(0, 5), cierra: fila.cierra.slice(0, 5) });
