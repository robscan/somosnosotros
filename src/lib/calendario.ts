import { aFechaIcs, diaLocal } from "./fechas";
import { hrefEvento } from "./eventos";

/** Lo que va en el archivo de calendario de un evento. */
export type EventoCalendario = { id: string; slug?: string | null; titulo: string; inicio: string; fin: string | null; descripcion: string | null; lugar: string | null };

const ORIGEN = "https://somosnosotros.org";

/** Texto de un campo del archivo: barra, punto y coma, coma y saltos de línea van escapados (RFC 5545). */
export function escaparIcs(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * El archivo .ics de un evento. Lleva una alerta 1 hora antes: sin ella el iPhone lo agregaba con "Alerta: Ninguna" y
 * el calendario no recordaba nada (fricción K2, decisión 13 de docs/rediseno/17). Sin hora de fin, dura 2 horas.
 */
export function archivoIcs(e: EventoCalendario, ahora: Date = new Date()): string {
  const fin = e.fin ?? new Date(new Date(e.inicio).getTime() + 2 * 3600000).toISOString();
  const url = `${ORIGEN}${hrefEvento(e)}`;
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//somosnosotros//ES",
    "BEGIN:VEVENT",
    `UID:${e.id}@somosnosotros.org`,
    `DTSTAMP:${aFechaIcs(ahora.toISOString())}`,
    `DTSTART:${aFechaIcs(e.inicio)}`,
    `DTEND:${aFechaIcs(fin)}`,
    `SUMMARY:${escaparIcs(e.titulo)}`,
    e.lugar ? `LOCATION:${escaparIcs(e.lugar)}` : null,
    `DESCRIPTION:${escaparIcs(`${e.descripcion ?? ""}\n${url}`.trim())}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escaparIcs(e.titulo)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);
  return lineas.join("\r\n") + "\r\n";
}

/** Nombre del archivo con el evento ("noche-de-son-en-el-patio.ics"), en ASCII para cualquier navegador. */
export function nombreArchivoIcs(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base || "evento"}.ics`;
}

/**
 * Calendario del mes y horas del día para `ui/SelectorFecha` (OL-162, bitácora 197): la hoja propia de fecha y
 * hora para escritorio. El selector nativo de Chrome no aparece en la app instalada en un monitor externo
 * (bitácora 195, OL-160) — «es un riesgo que no quiero correr» (founder). Lógica pura, sin DOM: se prueba sola
 * en `calendario.test.ts`; la usa `SelectorFecha`, que además sabe pintar la rejilla y responder al teclado.
 */

const MS_DIA = 86400000;

export type DiaCalendario = {
  /** YYYY-MM-DD. */
  fecha: string;
  /** Pertenece al mes que se muestra (no es relleno del mes anterior o siguiente, para completar la semana). */
  delMes: boolean;
  /** Es hoy (en la zona que decide quien llama). */
  hoy: boolean;
  /** Antes del límite mínimo (o de hoy, si no hay límite): se ve atenuado y no se puede elegir. */
  pasado: boolean;
};

function aFechaUtc(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia));
}
function aTexto(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Lunes = 0 … domingo = 6 (getUTCDay da domingo = 0). */
function diaSemanaLunes(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

/** Cuántos días tiene el mes (día 0 del mes siguiente = último día de este; acomoda los años bisiestos). */
export function diasEnMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** El mes de calendario siguiente, cruzando de diciembre a enero del año que sigue. */
export function mesSiguiente(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}
/** El mes de calendario anterior, cruzando de enero a diciembre del año pasado. */
export function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

/** Un día YYYY-MM-DD más `n` días (n puede ser negativo): días de calendario, sin horas de por medio. */
export function sumarDiasIso(fecha: string, n: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return aTexto(new Date(Date.UTC(anio, mes - 1, dia + n)));
}

/**
 * Las semanas del mes, lunes a domingo, con relleno del mes anterior y siguiente para completar la primera y la
 * última semana (un mes tiene 5 o 6 semanas de calendario, según en qué día caiga el 1 y cuántos días tenga).
 * `hoy` y `min` son YYYY-MM-DD; sin `min` (o con uno anterior a hoy), el límite de "pasado" es hoy mismo — nunca
 * se puede elegir un día que ya pasó.
 */
export function semanasDelMes(anio: number, mes: number, hoy: string, min?: string): DiaCalendario[][] {
  const primerDia = aFechaUtc(anio, mes, 1);
  const ultimoDia = aFechaUtc(anio, mes, diasEnMes(anio, mes));
  const inicio = new Date(primerDia.getTime() - diaSemanaLunes(primerDia) * MS_DIA);
  const fin = new Date(ultimoDia.getTime() + (6 - diaSemanaLunes(ultimoDia)) * MS_DIA);
  const limite = min && min > hoy ? min : hoy;

  const semanas: DiaCalendario[][] = [];
  for (let t = inicio.getTime(); t <= fin.getTime(); t += 7 * MS_DIA) {
    const semana: DiaCalendario[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(t + i * MS_DIA);
      const fecha = aTexto(d);
      semana.push({
        fecha,
        delMes: d.getUTCMonth() === mes - 1 && d.getUTCFullYear() === anio,
        hoy: fecha === hoy,
        pasado: fecha < limite,
      });
    }
    semanas.push(semana);
  }
  return semanas;
}

/** Horas del día en pasos de `paso` minutos: "00:00", "00:15", … ("23:45" con el paso por defecto, 96 horas). */
export function pasosHora(paso = 15): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += paso) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

/** El paso más cercano a `hora` (para marcar la sugerida aunque no caiga justo en un paso de la lista). */
export function pasoMasCercano(hora: string, paso = 15): string {
  const m = /^(\d{2}):(\d{2})/.exec(hora);
  if (!m) return pasosHora(paso)[0];
  const total = Number(m[1]) * 60 + Number(m[2]);
  const acotado = Math.min(Math.max(Math.round(total / paso) * paso, 0), 24 * 60 - paso);
  return `${String(Math.floor(acotado / 60)).padStart(2, "0")}:${String(acotado % 60).padStart(2, "0")}`;
}

/** Los días (YYYY-MM-DD) en que hay al menos un evento, con cuántos, para el calendario propio de `ui/ChipFecha` y
 *  `ui/SelectorFecha` (OL-218): qué días dejar disponibles y cuáles desactivar por "sin eventos". */
export type DiasActivos = Map<string, number>;

/**
 * Igual que carga la Agenda (`cargarAgenda`) y Lugares (`cargar()` de `/lugares`): la misma consulta de eventos que
 * ya no ha pasado, sin otra — esta función solo agrupa lo que ya llegó, sin pedir nada nuevo (la cheapest query
 * posible es no pedir ninguna). Sin `fin`, el evento ocupa solo su día de inicio (mismo criterio que `terminaDe`
 * en `fechas.ts`: sin fin explícito, "termina" al acabar ese mismo día, nunca se cuenta como si durara más). Con
 * `fin`, ocupa cada día de calendario entre el de inicio y el de fin (inclusive), en la zona del propio evento —
 * un evento de varios días cuenta en cada día que ocupa, igual que hace la Agenda al decidir cuándo se oculta.
 */
type EventoConRango = { inicio: string; fin: string | null; zona: string };

/** El día de inicio y el de fin (YYYY-MM-DD, en la zona del propio evento) que ocupa un evento en el calendario:
 *  sin `fin`, los dos son el día de inicio (mismo criterio que `terminaDe` en `fechas.ts` — sin fin explícito,
 *  nunca dura más de ese día). Un `fin` corrupto (antes del inicio, dato roto) se acota a `inicio`, para no
 *  perder ni el día de inicio. */
function rangoDelEvento(e: EventoConRango): { inicio: string; fin: string } {
  const inicio = diaLocal(new Date(e.inicio), e.zona);
  const finCalculado = e.fin ? diaLocal(new Date(e.fin), e.zona) : inicio;
  return { inicio, fin: finCalculado < inicio ? inicio : finCalculado };
}

/** ¿Ocupa este evento el día `fecha` (YYYY-MM-DD)? Un evento de varios días cuenta en cada día que ocupa, desde
 *  su día de inicio hasta el de fin (inclusive) — la misma regla que `diasActivosCalendario`, para un evento
 *  solo: la usan Agenda (`filtrarAgenda`) y Lugares (`diasConEvento`) al filtrar por el día del chip, para que
 *  nunca desentonen con lo que el calendario ya marcó como disponible. */
export function ocupaDia(e: EventoConRango, fecha: string): boolean {
  const { inicio, fin } = rangoDelEvento(e);
  return fecha >= inicio && fecha <= fin;
}

export function diasActivosCalendario(eventos: EventoConRango[]): DiasActivos {
  const dias: DiasActivos = new Map();
  for (const e of eventos) {
    const { inicio, fin } = rangoDelEvento(e);
    let d = inicio;
    // Tope de sobra (367 días) para nunca colgarse con un dato corrupto (un `fin` absurdo o anterior al inicio).
    for (let i = 0; d <= fin && i < 367; i++) {
      dias.set(d, (dias.get(d) ?? 0) + 1);
      d = sumarDiasIso(d, 1);
    }
  }
  return dias;
}

/** ¿Se puede ir al mes anterior? Sin `bloquearPasado` (alta de evento, admite corregir una fecha ya pasada), sí
 *  siempre; con él (Agenda y Lugares, por defecto), no antes del mes de `limite` (hoy, o `min` si es posterior). */
export function hayMesAnterior(anio: number, mes: number, limite: string, bloquearPasado: boolean): boolean {
  if (!bloquearPasado) return true;
  return `${anio}-${String(mes).padStart(2, "0")}` > limite.slice(0, 7);
}

/** ¿Hay algún día con eventos después del mes que se muestra? Sin `diasActivos` (alta de evento, que no restringe
 *  por día), siempre true: solo el calendario de Agenda/Lugares limita "hasta donde haya datos" (prototipo OL-216). */
export function haySiguienteMes(anio: number, mes: number, diasActivos?: DiasActivos): boolean {
  if (!diasActivos) return true;
  const mesMostrado = `${anio}-${String(mes).padStart(2, "0")}`;
  for (const d of diasActivos.keys()) if (d.slice(0, 7) > mesMostrado) return true;
  return false;
}

/**
 * El nombre accesible de un día del calendario (OL-218, bitácora 245): a partir del texto largo ya calculado
 * ("viernes 25 de septiembre", `fechas.ts#diaLargo`), agrega "hoy", "ya pasó"/"sin eventos"/"N evento(s)" (solo si
 * se sabe: `conEventos` llega undefined en la hoja de alta de evento, que no restringe por día) y, solo en el modo
 * "filtro" del calendario (Agenda y Lugares, donde tocar el día ya elegido lo quita), "toca para quitar" en el día
 * ya elegido — mismas palabras y orden que firmó el founder en el prototipo, sin agregar la palabra
 * "seleccionado" (el prototipo no la lleva). En modo "campo" (alta de evento, la fecha es obligatoria y tocar la
 * ya elegida no la quita) no se agrega nada por estar elegido: el estado ya se anuncia con `aria-selected`.
 */
export function etiquetaDia(textoLargo: string, d: { hoy: boolean; pasado: boolean }, opts: { conEventos?: number; elegido?: boolean; permiteQuitar?: boolean } = {}): string {
  const partes = [textoLargo];
  if (d.hoy) partes.push("hoy");
  if (opts.conEventos !== undefined) {
    if (d.pasado) partes.push("ya pasó");
    else if (!opts.conEventos) partes.push("sin eventos");
    else partes.push(opts.conEventos === 1 ? "1 evento" : `${opts.conEventos} eventos`);
  }
  if (opts.permiteQuitar && opts.elegido) partes.push("toca para quitar");
  return partes.join(", ");
}

/** El mes inicial de la hoja: el de `fecha` si ya hay una elegida; si no, el de `limite` (hoy, o `min` si es posterior). */
export function mesInicial(fecha: string, limite: string): { anio: number; mes: number } {
  const base = fecha || limite;
  return { anio: Number(base.slice(0, 4)), mes: Number(base.slice(5, 7)) };
}
