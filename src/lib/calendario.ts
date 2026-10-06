import { aFechaIcs, diaLocal } from "./fechas";
import { hrefEvento } from "./eventos";

/** Lo que va en el archivo de calendario de un evento. */
export type EventoCalendario = { id: string; slug?: string | null; titulo: string; inicio: string; fin: string | null; descripcion: string | null; lugar: string | null };

const ORIGEN = "https://somosnosotros.org";

/** Texto de un campo del archivo: barra, punto y coma, coma y saltos de línea van escapados (RFC 5545). */
export function escaparIcs(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Sin hora de fin, dura 2 horas (mismo criterio que `archivoIcs` y `datosEventoNativo`). */
function finPorDefecto(inicio: string): string {
  return new Date(new Date(inicio).getTime() + 2 * 3600000).toISOString();
}

/** Un día de un evento con horario por día (`eventos_sesiones`, OL-311): sin hora de fin dura 2 horas, como un evento sin fin. */
export type SesionCalendario = { inicio: string; fin: string | null };

/** Un evento del archivo, con su alerta 1 hora antes. */
function eventoIcs(e: EventoCalendario, uid: string, inicio: string, fin: string, ahora: Date): string[] {
  const url = `${ORIGEN}${hrefEvento(e)}`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@somosnosotros.org`,
    `DTSTAMP:${aFechaIcs(ahora.toISOString())}`,
    `DTSTART:${aFechaIcs(inicio)}`,
    `DTEND:${aFechaIcs(fin)}`,
    `SUMMARY:${escaparIcs(e.titulo)}`,
    ...(e.lugar ? [`LOCATION:${escaparIcs(e.lugar)}`] : []),
    `DESCRIPTION:${escaparIcs(`${e.descripcion ?? ""}\n${url}`.trim())}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escaparIcs(e.titulo)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
  ];
}

/**
 * El archivo .ics de un evento. Lleva una alerta 1 hora antes: sin ella el iPhone lo agregaba con "Alerta: Ninguna" y
 * el calendario no recordaba nada (fricción K2, decisión 13 de docs/rediseno/17). Sin hora de fin, dura 2 horas. Con horario por día
 * (`sesiones`, OL-311) lleva un evento por día, cada uno con su hora y su alerta, y el evento de una sola pieza (inicio y fin del evento
 * entero) no va: sería uno encima de los otros.
 */
export function archivoIcs(e: EventoCalendario, ahora: Date = new Date(), sesiones: readonly SesionCalendario[] = []): string {
  const eventos = sesiones.length
    ? sesiones.flatMap((s, i) => eventoIcs(e, `${e.id}-${i + 1}`, s.inicio, s.fin ?? finPorDefecto(s.inicio), ahora))
    : eventoIcs(e, e.id, e.inicio, e.fin ?? finPorDefecto(e.inicio), ahora);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//somosnosotros//ES", ...eventos, "END:VCALENDAR"].join("\r\n") + "\r\n";
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

/** Lo que le pide `EKEventEditViewController` (OL-214, bitácora 243): mismos datos que `archivoIcs`, sin escapar
 *  (EventKit los recibe tal cual, no como líneas de un archivo RFC 5545). */
export type EventoCalendarioNativo = { titulo: string; inicio: string; fin: string; lugar: string | null; url: string; notas: string | null };

/** El fin (con el mismo valor por defecto que `archivoIcs`) y la URL de la ficha, listos para el plugin nativo de la app. */
export function datosEventoNativo(e: EventoCalendario): EventoCalendarioNativo {
  return { titulo: e.titulo, inicio: e.inicio, fin: e.fin ?? finPorDefecto(e.inicio), lugar: e.lugar, url: `${ORIGEN}${hrefEvento(e)}`, notas: e.descripcion };
}

/**
 * Calendario del mes y horas del día para las hojas propias de día y de hora (OL-162, bitácora 197; partidas en dos en
 * OL-298, bitácora 326: `ui/SelectorDia` y `ui/SelectorHora`). El selector nativo de Chrome no aparece en la app instalada
 * en un monitor externo (bitácora 195, OL-160) — «es un riesgo que no quiero correr» (founder). Lógica pura, sin DOM: se
 * prueba sola en `calendario.test.ts`; la usan `ui/Calendario` y las dos hojas, que además saben pintar y responder al teclado.
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

/** Las horas que se ofrecen para terminar: las del día, o solo las posteriores a `despuesDe` ("HH:MM") cuando el evento
 *  termina el mismo día que empieza (nunca se puede terminar antes de empezar ni a la misma hora). */
export function horasDeFin(despuesDe?: string, paso = 15): string[] {
  const horas = pasosHora(paso);
  return despuesDe ? horas.filter((h) => h > despuesDe) : horas;
}

/** La hora de fin de un evento de varios días al que nadie le puso hora: acaba con su último día. Es la misma regla
 *  de `terminaDe` (sin fin, el evento dura hasta el final de su día), escrita como hora porque `eventos.fin` guarda
 *  siempre un instante: no se puede tener un día de fin sin hora (OL-298). En el selector se lee «Sin hora de fin». */
export const FIN_DEL_DIA = "23:59";

/** "9:00 p.m." a partir de "HH:MM". */
export function etiquetaHora(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, h, m));
}

/** Lo que van marcando los toques de la hoja de días: el primero es el inicio; uno posterior, el fin (`hasta`).
 *  `hasta` null es «esperando el fin» (se tocó un inicio y falta saber si dura más); `hasta` igual a `desde` es un solo día
 *  ya confirmado (el que trae un evento al abrir la hoja); posterior a `desde`, un rango cerrado. */
export type DiasElegidos = { desde: string; hasta: string | null };

/** Qué pasa al tocar un día (OL-298): el primer toque elige el inicio; un segundo toque en un día posterior elige el
 *  fin; tocar uno anterior, o tocar con el rango (o el día) ya cerrado, empieza de nuevo desde ese día. Tocar otra vez el
 *  inicio recién marcado no cambia nada (la fecha es obligatoria: no se puede dejar vacía). */
export function tocarDia(actual: DiasElegidos, dia: string): DiasElegidos {
  if (!actual.desde || actual.hasta !== null || dia < actual.desde) return { desde: dia, hasta: null };
  if (dia > actual.desde) return { desde: actual.desde, hasta: dia };
  return actual;
}

/** El estado de partida de la hoja de días: lo que ya hay, como elección cerrada (un fin posterior al inicio es un rango;
 *  si no, un solo día). El primer toque siempre empieza de nuevo: si abrir la hoja dejara el día «esperando el fin», tocar
 *  otro día para cambiar la fecha la alargaría sin que nadie lo pidiera. */
export function diasIniciales(desde: string, hasta?: string): DiasElegidos {
  return { desde, hasta: desde ? (hasta && hasta > desde ? hasta : desde) : null };
}

/** Lo que se aplica al confirmar: `hasta` solo si el evento dura más de un día; null si es uno solo. */
export function ultimoDia({ desde, hasta }: DiasElegidos): string | null {
  return hasta !== null && hasta > desde ? hasta : null;
}

/** "14 de noviembre" (con " de 2027" si no es el año de `hoy`): un día de calendario, igual en cualquier zona. */
function diaTexto(fecha: string, hoy: string, conMes = true): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = String(d.getUTCDate());
  if (!conMes) return dia;
  const mes = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long" }).format(d);
  return `${dia} de ${mes}${fecha.slice(0, 4) === hoy.slice(0, 4) ? "" : ` de ${fecha.slice(0, 4)}`}`;
}

/** El texto de estado de la hoja de días: dice qué se eligió y qué falta. */
export function textoDias({ desde, hasta }: DiasElegidos, hoy: string): string {
  if (!desde) return "Toca el día en que empieza.";
  if (hasta === null) return `Empieza el ${diaTexto(desde, hoy)}. Si dura varios días, toca el último.`;
  if (hasta === desde) return `El ${diaTexto(desde, hoy)}.`;
  // Mismo mes: "Del 14 al 16 de noviembre"; si no, cada día con su mes ("Del 30 de noviembre al 2 de diciembre").
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return `Del ${diaTexto(desde, hoy, !mismoMes)} al ${diaTexto(hasta, hoy)}.`;
}

/** Lo que dice el botón de la hoja de días: «Falta el día», «Listo, un solo día» o «Listo». */
export function botonDias({ desde, hasta }: DiasElegidos): string {
  return !desde ? "Falta el día" : hasta === null || hasta === desde ? "Listo, un solo día" : "Listo";
}

/** El paso más cercano a `hora` (para marcar la sugerida aunque no caiga justo en un paso de la lista). */
export function pasoMasCercano(hora: string, paso = 15): string {
  const m = /^(\d{2}):(\d{2})/.exec(hora);
  if (!m) return pasosHora(paso)[0];
  const total = Number(m[1]) * 60 + Number(m[2]);
  const acotado = Math.min(Math.max(Math.round(total / paso) * paso, 0), 24 * 60 - paso);
  return `${String(Math.floor(acotado / 60)).padStart(2, "0")}:${String(acotado % 60).padStart(2, "0")}`;
}

/** Los días (YYYY-MM-DD) en que hay al menos un evento, con cuántos, para el calendario de la hoja Cuándo (OL-218,
 *  doc 50 P5): qué días llevan su punto. */
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

/** ¿Ocupa este evento algún día entre `desde` y `hasta` (YYYY-MM-DD, ambos incluidos; un día es `desde` = `hasta`)? Un
 *  evento de varios días cuenta en cada día que ocupa, desde su día de inicio hasta el de fin (inclusive), aunque empiece
 *  antes del rango o termine después — la misma regla que `diasActivosCalendario`, para un evento solo: Agenda la usa
 *  (`filtrarAgenda`) al filtrar por Cuándo, para que nunca desentone con lo que el calendario ya marcó como disponible. */
export function ocupaRango(e: EventoConRango, desde: string, hasta: string): boolean {
  const { inicio, fin } = rangoDelEvento(e);
  return inicio <= hasta && fin >= desde;
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
