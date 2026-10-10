import { FIN_DEL_DIA, etiquetaHora, sumarDiasIso } from "./calendario";
import { desdeLas, partirLocal } from "./cuandoEvento";
import { combinarFechaHora, diaConMes, diaLocal, horaCorta, localAIso, rangoCorto } from "./fechas";

/**
 * El horario por día de un evento de varios días (OL-311; prototipo firmado `horario-por-dia.html`, bitácoras 338 y 339). Con la casilla
 * «Mismo horario todos los días» marcada el evento no tiene sesiones: su `inicio` y su `fin` valen para cada día. Desmarcada, cada día
 * lleva su propia hora de inicio y de fin; esas horas se guardan en `eventos_sesiones` (una fila por día) y el evento sigue con su
 * `inicio` (la hora del primer día) y su `fin` (la del último, o el fin de ese día): la agenda, las búsquedas y los avisos no cambian.
 * Lógica pura, sin DOM: la usan el alta por pasos, el servidor al validar y la ficha.
 */

/** Los días de un evento (YYYY-MM-DD); `hasta` posterior a `desde`. */
export type RangoDias = { desde: string; hasta: string };

/** El horario de un día, como lo ve la persona en el alta: horas de pared «HH:MM»; `fin` vacío es «Sin hora de fin». */
export type HorarioDia = { dia: string; hora: string; fin: string };

/** Una sesión como viaja al servidor y como la guarda la base: instantes (ISO); sin hora de fin es null (se ve 3 h desde que empieza: `terminaDe`, OL-358). */
export type SesionEvento = { inicio: string; fin: string | null };

/** Hasta cuántos días se ajusta el horario día por día: un mes. Con más, el mismo horario para todos. */
export const MAX_DIAS_SESIONES = 31;

/** Cuántos días de calendario hay de `desde` a `hasta`, ambos incluidos. */
export function cuantosDias({ desde, hasta }: RangoDias): number {
  const [a, m, d] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86400000) + 1;
}

/** ¿Se puede ajustar el horario día por día? Hasta `MAX_DIAS_SESIONES` días. */
export const admitePorDia = (dias: RangoDias): boolean => cuantosDias(dias) <= MAX_DIAS_SESIONES;

/** Cada día del rango, en orden. */
export function diasDelRango(dias: RangoDias): string[] {
  return Array.from({ length: Math.min(cuantosDias(dias), MAX_DIAS_SESIONES) }, (_, i) => sumarDiasIso(dias.desde, i));
}

/**
 * La hora de fin que vale como horario común de cada día: la del fin del último día, o vacía si no hay (el evento acaba con su último día)
 * o si no cae después de la hora de inicio (un fin de madrugada del día siguiente no es de ese día: queda sin hora de fin).
 */
export function finComun(hora: string, fin: string): string {
  const horaFin = partirLocal(fin).hora;
  return !horaFin || horaFin === FIN_DEL_DIA || horaFin <= hora ? "" : horaFin;
}

/** Todos los días con el mismo horario, el común: de donde arranca la lista cuando se desmarca la casilla y a donde vuelve al marcarla. */
export function horarioComun(dias: RangoDias, hora: string, fin: string): HorarioDia[] {
  const comun = finComun(hora, fin);
  return diasDelRango(dias).map((dia) => ({ dia, hora, fin: comun }));
}

/** ¿Este día se apartó del horario común? */
export const difiereDelComun = (h: HorarioDia, comun: Pick<HorarioDia, "hora" | "fin">): boolean => h.hora !== comun.hora || h.fin !== comun.fin;

/** Los fines que se sugieren para un día que empieza a `hora`: una, dos y tres horas después, solo los que caen el mismo día. */
export function finesDelDia(hora: string): string[] {
  const [h, m] = hora.split(":").map(Number);
  return [1, 2, 3].map((n) => h * 60 + m + n * 60).filter((minutos) => minutos < 24 * 60).map((minutos) => `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`);
}

/** Cambia la hora de inicio de un día: su fin se queda si todavía cae después; si no, el día queda sin hora de fin. */
export const conHoraDeInicio = (h: HorarioDia, hora: string): Pick<HorarioDia, "hora" | "fin"> => ({ hora, fin: h.fin > hora ? h.fin : "" });

/** Las horas de un día como se dicen en el paso (12 h, como los chips): «de 8:00 p.m. a 9:00 p.m.» o «desde las 8:00 p.m.». */
export const horasDeHorario = ({ hora, fin }: Pick<HorarioDia, "hora" | "fin">): string => (fin ? `de ${etiquetaHora(hora)} a ${etiquetaHora(fin)}` : `desde ${desdeLas(hora)} ${etiquetaHora(hora)}`);

/**
 * La línea de abajo con la casilla desmarcada: «Del 9 al 11 de oct · 1 día con otro horario» o «… · cada día igual». `hoy` es YYYY-MM-DD en la
 * zona del evento (el año solo se escribe si no es el actual).
 */
export function resumenPorDia(horarios: HorarioDia[], comun: Pick<HorarioDia, "hora" | "fin">, hoy: string): string {
  const rango = rangoCorto(horarios[0].dia, horarios[horarios.length - 1].dia, hoy);
  const distintos = horarios.filter((h) => difiereDelComun(h, comun)).length;
  return `${rango} · ${distintos === 0 ? "cada día igual" : `${distintos} ${distintos === 1 ? "día con otro horario" : "días con otro horario"}`}`;
}

/** El inicio y el fin del evento, «YYYY-MM-DDTHH:MM» en la hora del sitio, que salen de la primera y la última sesión (el último día sin hora de fin acaba con su día). */
export function inicioFinDeHorarios(horarios: HorarioDia[]): { inicio: string; fin: string } {
  const primero = horarios[0];
  const ultimo = horarios[horarios.length - 1];
  return { inicio: combinarFechaHora(primero.dia, primero.hora), fin: combinarFechaHora(ultimo.dia, ultimo.fin || FIN_DEL_DIA) };
}

/** Lo que viaja en el campo escondido `sesiones`: un día por sesión, «YYYY-MM-DDTHH:MM» en la hora del sitio; `fin` vacío es sin hora de fin. */
export const sesionesParaEnviar = (horarios: HorarioDia[]): string => JSON.stringify(horarios.map((h) => ({ inicio: combinarFechaHora(h.dia, h.hora), fin: h.fin ? combinarFechaHora(h.dia, h.fin) : "" })));

/** Lo que lee la ficha del evento guardado: una sesión por día. */
export type SesionGuardada = { inicio: string; fin: string | null };

/**
 * Las sesiones de un evento, si todavía le corresponden: la primera empieza cuando empieza el evento y la última cae en el día en que
 * termina. Si sus horas ya no coinciden con las del evento (se editó por el formulario de antes, que no tocaba las sesiones; editar por
 * pasos las reescribe o las borra en la misma transacción, OL-319), se ignoran y el evento se lee con su inicio y su fin, como cualquier otro. Ordenadas por inicio; vacías si no hay dos o más.
 */
export function sesionesVigentes(evento: { inicio: string; fin: string | null; zona: string }, sesiones: readonly SesionGuardada[] | null | undefined): SesionGuardada[] {
  if (!evento.fin || !sesiones || sesiones.length < 2) return [];
  const ordenadas = [...sesiones].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const primera = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];
  const coincide = Date.parse(primera.inicio) === Date.parse(evento.inicio) && diaLocal(new Date(ultima.inicio), evento.zona) === diaLocal(new Date(evento.fin), evento.zona);
  return coincide ? ordenadas : [];
}

/** La hora de una sesión en 24 h, como todo lo que se lee fuera del paso: «20:00–21:00»; sin hora de fin, «20:00». */
export const horasDeSesion = (s: SesionGuardada, zona: string): string => (s.fin ? `${horaCorta(s.inicio, zona)}–${horaCorta(s.fin, zona)}` : horaCorta(s.inicio, zona));

/** La lista de días de la ficha: «vie 9 de oct» y sus horas, en 24 h. */
export function listaDeSesiones(sesiones: readonly SesionGuardada[], zona: string, ahora: Date = new Date()): { dia: string; horas: string }[] {
  return sesiones.map((s) => ({ dia: diaConMes(s.inicio, ahora, zona), horas: horasDeSesion(s, zona) }));
}

/** Cada día en una línea («vie 9 de oct · 20:00–21:00»): la descripción del calendario y de la hoja nativa, donde no cabe una lista. */
export const lineasDeSesiones = (sesiones: readonly SesionGuardada[], zona: string, ahora: Date = new Date()): string[] => listaDeSesiones(sesiones, zona, ahora).map(({ dia, horas }) => `${dia} · ${horas}`);

/**
 * Lo que lleva «A mi calendario» de la hoja nativa del iPhone, que agrega un solo evento por vez (`EKEventEditViewController`): el primer día, con
 * su hora, y en las notas todos los días con sus horas («vie 9 de oct · 20:00–21:00»). El archivo .ics de la web sí lleva un evento por día
 * (`archivoIcs`). Sin sesiones devuelve el evento tal cual.
 */
export function conPrimerDia<T extends { inicio: string; fin: string | null; descripcion: string | null }>(e: T, sesiones: readonly SesionGuardada[], zona: string, ahora: Date = new Date()): T {
  if (sesiones.length === 0) return e;
  const [primera] = sesiones;
  return { ...e, inicio: primera.inicio, fin: primera.fin, descripcion: [e.descripcion, ...lineasDeSesiones(sesiones, zona, ahora)].filter(Boolean).join("\n") };
}

const SESIONES_NO_SE_ENTIENDEN = "Los horarios por día no se entienden. Vuelve a elegirlos.";

/**
 * Lo que el servidor acepta del campo `sesiones` (JSON de `sesionesParaEnviar`): de 2 a `MAX_DIAS_SESIONES` días distintos, cada uno con su
 * inicio y, si lo tiene, un fin posterior que cae el mismo día; la primera sesión empieza cuando empieza el evento y la última cae en el día en que
 * termina. `inicio` y `fin` son los del evento, ya en ISO. Sin campo (o vacío) no hay sesiones: `sesiones` es null y no es un error.
 * La base vuelve a comprobar todo en `guardar_evento_con_sesiones`.
 */
export function validarSesiones(texto: FormDataEntryValue | null | undefined, zona: string, inicio: string, fin: string | null): { sesiones: SesionEvento[] | null; error?: string } {
  const crudo = typeof texto === "string" ? texto.trim() : "";
  if (!crudo) return { sesiones: null };
  let lista: unknown;
  try {
    lista = JSON.parse(crudo);
  } catch {
    return { sesiones: null, error: SESIONES_NO_SE_ENTIENDEN };
  }
  if (!Array.isArray(lista) || lista.length < 2 || lista.length > MAX_DIAS_SESIONES) return { sesiones: null, error: SESIONES_NO_SE_ENTIENDEN };
  const sesiones: SesionEvento[] = [];
  const dias = new Set<string>();
  for (const item of lista) {
    const crudoInicio = item && typeof item === "object" && "inicio" in item && typeof item.inicio === "string" ? item.inicio : "";
    const crudoFin = item && typeof item === "object" && "fin" in item && typeof item.fin === "string" ? item.fin : "";
    const desde = localAIso(crudoInicio, zona);
    const hasta = crudoFin ? localAIso(crudoFin, zona) : null;
    if (!desde || (crudoFin && !hasta)) return { sesiones: null, error: SESIONES_NO_SE_ENTIENDEN };
    const dia = diaLocal(new Date(desde), zona);
    if (dias.has(dia)) return { sesiones: null, error: "Un día no puede tener dos horarios." };
    dias.add(dia);
    if (hasta && (Date.parse(hasta) <= Date.parse(desde) || diaLocal(new Date(hasta), zona) !== dia)) return { sesiones: null, error: "Cada día tiene que terminar después de empezar y el mismo día." };
    sesiones.push({ inicio: desde, fin: hasta });
  }
  sesiones.sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const primera = sesiones[0];
  const ultima = sesiones[sesiones.length - 1];
  if (!fin || Date.parse(primera.inicio) !== Date.parse(inicio) || diaLocal(new Date(ultima.inicio), zona) !== diaLocal(new Date(fin), zona)) return { sesiones: null, error: "Los horarios por día no coinciden con los días del evento." };
  return { sesiones };
}
