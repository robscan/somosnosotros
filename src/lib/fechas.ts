/**
 * Fechas de eventos. Cada lugar y cada evento guarda su zona horaria (migración 0029): las horas se leen y se muestran
 * en la zona del evento, no en la de quien mira («7:00 pm» en Madrid es a las 7:00 pm de Madrid), y en 12 horas (`horaDeReloj`, OL-418). Lo que no dice zona cae
 * en la de la ciudad inicial, San Luis Potosí: America/Mexico_City (sin horario de verano desde 2022, UTC−6).
 * En la base se guarda timestamptz.
 */
export const ZONA_INICIAL = "America/Mexico_City";

/** La forma de zona que acepta la base (`zona_valida`, migración 0029): área y ciudad, sin abreviaturas ("CST"). */
const FORMA_ZONA = /^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)\/[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)?$/;
const zonasProbadas = new Map<string, boolean>();

/** La zona, si la base la acepta y el teléfono la entiende; si no, la de la ciudad inicial: una zona rota no tumba la agenda. */
export function zonaSegura(zona: string | null | undefined): string {
  if (!zona) return ZONA_INICIAL;
  let ok = zonasProbadas.get(zona);
  if (ok === undefined) {
    ok = FORMA_ZONA.test(zona);
    if (ok) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: zona });
      } catch {
        ok = false;
      }
    }
    zonasProbadas.set(zona, ok);
  }
  return ok ? zona : ZONA_INICIAL;
}

/** "2026-09-20T19:00" (selector del teléfono) → ISO, leída en la zona del evento. Null si no es una fecha. */
export function localAIso(local: string | null | undefined, zona: string = ZONA_INICIAL): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec((local ?? "").trim());
  if (!m) return null;
  const [anio, mes, dia, hora, minuto] = m.slice(1).map(Number);
  const pared = Date.UTC(anio, mes - 1, dia, hora, minuto);
  // Date.UTC acomoda lo que no existe (31 de febrero pasa a marzo): si no vuelve igual, no es una fecha.
  const d = new Date(pared);
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia || hora > 23 || minuto > 59) return null;
  // La hora de pared menos lo que la zona va adelantada de UTC; si ese instante cae del otro lado de un cambio de
  // horario, se corrige con el desfase de ese lado.
  const antes = desfase(pared, zona);
  let instante = pared - antes;
  const despues = desfase(instante, zona);
  if (despues !== antes) instante = pared - despues;
  return new Date(instante).toISOString();
}

/** ISO → "2026-09-20T19:00" en la zona del evento (para rellenar el selector). */
export function isoALocal(iso: string | null | undefined, zona: string = ZONA_INICIAL): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = partes(d, zona);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const relojes = new Map<string, Intl.DateTimeFormat>();
function partes(d: Date, zona: string = ZONA_INICIAL): Record<string, string> {
  const z = zonaSegura(zona);
  let f = relojes.get(z);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: z, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
    relojes.set(z, f);
  }
  const out: Record<string, string> = {};
  for (const { type, value } of f.formatToParts(d)) out[type] = value;
  if (out.hour === "24") out.hour = "00";
  return out;
}

/** Cuánto va la zona adelantada de UTC en ese instante, en ms (San Luis: −6 h; Madrid en verano: +2 h). */
function desfase(instante: number, zona: string): number {
  const p = partes(new Date(instante), zona);
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute)) - Math.floor(instante / 60000) * 60000;
}

/** Día (YYYY-MM-DD) en la zona. */
export function diaLocal(d: Date, zona: string = ZONA_INICIAL): string {
  const p = partes(d, zona);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "2026-09-19" + 1 → "2026-09-20": días de calendario, sin horas de por medio (un día con cambio de horario dura 23 o 25). */
function sumarDias(dia: string, n: number): string {
  const [anio, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, d + n)).toISOString().slice(0, 10);
}

/** El año solo se escribe cuando no es el actual: "sáb 20 de sep" este año, "sáb 20 de sep de 2027" el que viene. */
function conAnio(d: Date, ahora: Date, zona: string): { year?: "numeric" } {
  return partes(d, zona).year === partes(ahora, zona).year ? {} : { year: "numeric" };
}

/** "sáb 20 de sep" (con año si no es el actual). */
function diaCortoDe(x: Date, ahora: Date, zona: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), weekday: "short", day: "numeric", month: "short", ...conAnio(x, ahora, zona) }).format(x).replace(/[.,]/g, "");
}

/** "vie 9 de oct" (con año si no es el actual): el día de un instante, sin «Hoy» ni «Mañana» (el día de una sesión, en la lista de la ficha). */
export function diaConMes(iso: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  return diaCortoDe(new Date(iso), ahora, zona);
}

/** Lo mismo desde un día de calendario (YYYY-MM-DD) en la zona: el alta todavía no tiene instantes. */
export function diaConMesDe(dia: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const iso = localAIso(`${dia}T12:00`, zona);
  return iso ? diaConMes(iso, ahora, zona) : dia;
}

/** "Hoy", "Mañana" o "sáb 20 de sep": el título del día en la agenda, con hoy y mañana de la zona del evento. */
export function diaCorto(iso: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const d = new Date(iso);
  const dia = diaLocal(d, zona);
  const hoy = diaLocal(ahora, zona);
  if (dia === hoy) return "Hoy";
  if (dia === sumarDias(hoy, 1)) return "Mañana";
  return diaCortoDe(d, ahora, zona);
}

/**
 * «mié 30 sep»: el chip de fecha de Agenda y Lugares, un solo formato (docs/rediseno/45, OL-174) — día de la
 * semana en tres letras con su acento y en minúscula, número sin cero a la izquierda, mes en tres letras, sin
 * «de» (para ahorrar espacio) y sin año. Sin «Hoy»/«Mañana»: decisión por defecto del gestor, 2026-09-24 (la
 * recomendación del doc 45) — el ícono del chip ya avisa que hay una fecha elegida, y mezclar una palabra con una
 * fecha corta en el mismo chip pide dos lecturas distintas para la misma cosa. No toca `diaCorto`/`diaCortoDe`
 * (que sí dicen «Hoy»/«Mañana» y siguen igual en el resto de la app: los títulos de día de las listas).
 */
export function fechaCortaChip(iso: string, zona: string = ZONA_INICIAL): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), weekday: "short", day: "numeric", month: "short" })
    .format(new Date(iso))
    .replace(/[.,]/g, "")
    .replace(/\bde\s+/, "");
}

/** "sábado 19 de septiembre" (con año si no es el actual) a partir de un día YYYY-MM-DD de la zona. */
export function diaLargo(fecha: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const iso = localAIso(`${fecha}T12:00`, zona);
  if (!iso) return fecha;
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), weekday: "long", day: "numeric", month: "long", ...conAnio(d, ahora, zona) }).format(d).replace(",", "");
}

/**
 * La hora como se lee en toda la app (OL-418; founder, 2026-10-19: «ya me señaló un usuario que 19:00 hrs era confuso, es mejor usar 7:00 pm»):
 * en 12 horas, siempre con minutos y con «am» o «pm» en minúsculas tras un espacio: «7:00 pm», «9:30 am», «12:00 pm» (mediodía), «12:00 am»
 * (medianoche). Recibe la hora de pared en 24 h, «HH:MM» (o «HH:MM:SS», como la guarda la base): lo guardado no cambia, solo cómo se escribe.
 * La cadena va limpia, con un espacio normal (viaja a compartir, avisos y correos); que no se parta en un renglón angosto lo resuelve quien la pinta.
 */
export function horaDeReloj(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/**
 * Un rango de horas, con guion corto y sin espacios: si las dos comparten «am» o «pm», se dice una vez al final («7:00–9:30 pm»); si no, cada una
 * lleva el suyo («8:00 pm–2:00 am», «11:00 am–2:00 pm»). Las dos en «HH:MM» de 24 h.
 */
export function rangoDeReloj(desde: string, hasta: string): string {
  const a = horaDeReloj(desde);
  const b = horaDeReloj(hasta);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
}

/** «las» o «la» antes de una hora («desde las 8:00 pm», «desde la 1:00 pm», «Datos de las 2:05 pm»), de «HH:MM» en 24 h. */
export const articuloDeHora = (hhmm: string): string => (Number(hhmm.split(":")[0]) % 12 === 1 ? "la" : "las");

/** «19:00»: la hora de pared en 24 h en la zona del evento, para comparar horas y rellenar campos; nunca para que la lea una persona (`horaCorta`). */
export function reloj24(iso: string, zona: string = ZONA_INICIAL): string {
  const p = partes(new Date(iso), zona);
  return `${p.hour}:${p.minute}`;
}

/** «7:00 pm» en la zona del evento (`horaDeReloj`). */
export function horaCorta(iso: string, zona: string = ZONA_INICIAL): string {
  return horaDeReloj(reloj24(iso, zona));
}

/** La hora de fin de un evento de varios días al que nadie le puso hora (OL-298, `FIN_DEL_DIA` en `calendario.ts`): acaba con su último
 *  día y se guarda como las 23:59 de ese día. Esa hora no se escribe: el texto dice solo el día. Solo si el fin cae en otro día que el
 *  inicio (un evento de un solo día que termina a las 23:59 la conserva) y con la hora de la zona del evento. El dato guardado no cambia. */
function acabaConSuUltimoDia(inicio: Date, fin: Date, zona: string): boolean {
  return diaLocal(fin, zona) !== diaLocal(inicio, zona) && reloj24(fin.toISOString(), zona) === "23:59";
}

/** El mes en tres letras ("oct") de un día de calendario (YYYY-MM-DD): no depende de la zona. */
function mesCorto(dia: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "short" }).format(new Date(`${dia}T12:00:00Z`)).replace(/[.,]/g, "");
}

/** Un extremo del rango: "10" (cuando comparte el mes con el otro) o "10 de oct", con año si no es el de `hoy`. */
function extremoDeRango(dia: string, hoy: string, conMes: boolean): string {
  const numero = String(Number(dia.slice(8, 10)));
  if (!conMes) return numero;
  const anio = dia.slice(0, 4);
  return `${numero} de ${mesCorto(dia)}${anio === hoy.slice(0, 4) ? "" : ` de ${anio}`}`;
}

/** "Del 10 al 12 de oct" (o "Del 30 de oct al 2 de nov"): un rango de días de calendario (YYYY-MM-DD), con el año solo si no es el de `hoy`. */
export function rangoCorto(desde: string, hasta: string, hoy: string): string {
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return `Del ${extremoDeRango(desde, hoy, !mismoMes)} al ${extremoDeRango(hasta, hoy, true)}`;
}

/**
 * El cuándo de lo que dura un periodo (un festival, una exposición), con una sola regla en todas las superficies (OL-409, firma del founder del
 * 14 de octubre, «U»: «En curso "Hasta el …", por venir "Del … al …"»): por venir, sus días («Del 12 al 17 de oct»); ya en curso (hoy es uno de
 * sus días), hasta cuándo («Hasta el sáb 17 de oct»); de un solo día, ese día («jue 12 de nov»). `desde` y `hasta` son días de calendario
 * (YYYY-MM-DD) en la zona; `hoy`, el de quien mira en esa zona. La usan `textoVisita` (la exposición), `cuandoDePeriodo` (el festival y la
 * exposición, `lib/claseEvento`) y, de ahí, las tarjetas, los renglones, las fichas, Buscar, «Tus planes» y la hoja de Lugares.
 */
export function textoDePeriodo(desde: string, hasta: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL, hoy: string = diaLocal(ahora, zona)): string {
  if (hasta <= desde) return diaConMesDe(desde, ahora, zona);
  if (hoy < desde) return rangoCorto(desde, hasta, hoy);
  return `Hasta el ${diaConMesDe(hasta, ahora, zona)}`;
}

/**
 * ¿Dura varios días? Su fin cae un día después o más, pero una noche que solo cruza la medianoche (empieza 10:00 pm, termina 1:00 am del
 * día siguiente: su fin cae antes de la hora de inicio) es una noche, no dos días. Es la regla con la que se lee el evento (`cuandoVariosDias`)
 * y con la que la agenda lo reparte en sus días (`lib/ocurrencias`, OL-320).
 */
export function esDeVariosDias(inicio: string, fin: string | null | undefined, zona: string = ZONA_INICIAL): boolean {
  if (!fin) return false;
  const diaInicio = diaLocal(new Date(inicio), zona);
  const diaFin = diaLocal(new Date(fin), zona);
  if (diaFin <= diaInicio) return false;
  return !(diaFin === sumarDias(diaInicio, 1) && reloj24(fin, zona) <= reloj24(inicio, zona));
}

/**
 * Las horas de un evento en su día (OL-418): la de inicio («7:00 pm»); con fin el mismo día, las dos («7:00–9:00 pm»); y una noche que acaba de
 * madrugada, también las dos, porque una noche es un día («8:00 pm–2:00 am»: su fin cae al día siguiente antes de la hora de inicio,
 * `esDeVariosDias`). Lo que dura varios días, solo la de inicio: sus días y su horario los dice `cuandoVariosDias`. La usan los renglones de las
 * listas, la ficha, «Revisa», los avisos y todo lo que dice «día · hora».
 */
export function horasDelEvento(inicio: string, fin: string | null | undefined, zona: string = ZONA_INICIAL): string {
  if (!fin) return horaCorta(inicio, zona);
  const diaInicio = diaLocal(new Date(inicio), zona);
  const diaFin = diaLocal(new Date(fin), zona);
  const unDia = diaFin === diaInicio || (diaFin === sumarDias(diaInicio, 1) && !esDeVariosDias(inicio, fin, zona));
  return unDia ? rangoDeReloj(reloj24(inicio, zona), reloj24(fin, zona)) : horaCorta(inicio, zona);
}

/** ¿Es una noche que acaba de madrugada? Su fin cae al día siguiente, antes de su hora de inicio (`esDeVariosDias` dice que no son dos días). */
export function esUnaNoche(inicio: string, fin: string | null | undefined, zona: string = ZONA_INICIAL): boolean {
  return !!fin && diaLocal(new Date(fin), zona) === sumarDias(diaLocal(new Date(inicio), zona), 1) && !esDeVariosDias(inicio, fin, zona);
}

/**
 * Un evento de varios días se lee como lo pregunta el alta (OL-309): el horario del primer día vale para todos, así que el texto dice los días
 * y, aparte, las horas de cada día («Del 10 al 12 de oct» y «8:00–9:00 pm», `rangoDeReloj`); sin hora de fin puesta (acaba con su último día, ver
 * `acabaConSuUltimoDia`), solo la de inicio. Null si no dura varios días, también cuando solo cruza la medianoche (empieza 10:00 pm, termina
 * 1:00 am del día siguiente: su fin cae antes de la hora de inicio y es una noche, no dos días).
 */
export function cuandoVariosDias(inicio: string, fin: string | null | undefined, ahora: Date = new Date(), zona: string = ZONA_INICIAL): { dias: string; horas: string } | null {
  if (!fin || !esDeVariosDias(inicio, fin, zona)) return null;
  const d = new Date(inicio);
  const f = new Date(fin);
  const diaInicio = diaLocal(d, zona);
  const diaFin = diaLocal(f, zona);
  // Cadena limpia (viaja a compartir, avisos y correos); que la hora no se parta en un renglón angosto lo resuelve quien la pinta, con CSS.
  const horas = acabaConSuUltimoDia(d, f, zona) ? horaCorta(inicio, zona) : rangoDeReloj(reloj24(inicio, zona), reloj24(fin, zona));
  return { dias: rangoCorto(diaInicio, diaFin, diaLocal(ahora, zona)), horas };
}

/** Lo que dice un evento con horario por día donde antes iba el horario («Del 9 al 11 de oct · horarios por día»). */
export const HORARIOS_POR_DIA = "horarios por día";

/** «Del 9 al 11 de oct · horarios por día», de un evento guardado (su inicio y su fin dicen los días). */
export function cuandoPorDia(inicio: string, fin: string, zona: string, ahora: Date = new Date()): string {
  return `${rangoCorto(diaLocal(new Date(inicio), zona), diaLocal(new Date(fin), zona), diaLocal(ahora, zona))} · ${HORARIOS_POR_DIA}`;
}

/**
 * «sáb 20 de sep · 7:00 pm» (y «7:00–9:00 pm» si hay fin el mismo día). Con año si no es el de hoy. Un evento de varios días dice sus días y su
 * horario de cada día (`cuandoVariosDias`); una noche que acaba de madrugada es un solo día con su rango (OL-418): «sáb 17 de oct · 8:00 pm–2:00 am»,
 * nunca «→ dom 18 de oct · 02:00».
 */
export function formatearCuando(inicio: string, fin?: string | null, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const varios = cuandoVariosDias(inicio, fin, ahora, zona);
  if (varios) return `${varios.dias} · ${varios.horas}`;
  return `${diaCorto(inicio, ahora, zona)} · ${horasDelEvento(inicio, fin, zona)}`;
}

/** El día largo de la ficha: "sábado 20 de septiembre" (con año si no es el actual). */
function diaLargoDe(d: Date, ahora: Date, zona: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), weekday: "long", day: "numeric", month: "long", ...conAnio(d, ahora, zona) }).format(d).replace(",", "");
}

/**
 * Fecha larga para la ficha: «sábado 20 de septiembre · 7:00 pm» (con año si no es el de hoy; «7:00–9:00 pm» si hay fin el mismo día, y una noche
 * que acaba de madrugada, «8:00 pm–2:00 am», `horasDelEvento`). Lo que dura varios días dice «hasta» el otro día; un fin otro día a las 23:59 va solo
 * con su día.
 */
export function formatearLargo(iso: string, ahora: Date = new Date(), fin?: string | null, zona: string = ZONA_INICIAL): string {
  const d = new Date(iso);
  if (!fin || !esDeVariosDias(iso, fin, zona)) return `${diaLargoDe(d, ahora, zona)} · ${horasDelEvento(iso, fin, zona)}`;
  const f = new Date(fin);
  const hasta = acabaConSuUltimoDia(d, f, zona) ? diaLargoDe(f, ahora, zona) : formatearLargo(fin, ahora, null, zona);
  return `${diaLargoDe(d, ahora, zona)} · ${horaCorta(iso, zona)} hasta ${hasta}`;
}

export type Tramo = "hoy" | "semana" | "proximos" | "pasado";

/** "Hoy" → "Lun"/"Mar"/"Mié"/"Jue"/"Vie"/"Sáb"/"Dom", con acento (docs/rediseno/35, decisión del founder 2026-09-22). */
const DIAS_PIN: Record<string, string> = { Sun: "Dom", Mon: "Lun", Tue: "Mar", Wed: "Mié", Thu: "Jue", Fri: "Vie", Sat: "Sáb" };

/**
 * El texto del pin del mapa de lugares: "Hoy" si el evento es hoy, el día en tres letras con acento si cae en los
 * seis días que siguen (misma ventana que `tramo`, "esta semana"), o null fuera de esa ventana (el pin no lleva
 * día: el lugar se pinta como un punto). Mañana no lleva palabra propia: muestra su día, una sola regla.
 */
export function diaPin(inicio: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string | null {
  const t = tramo(inicio, ahora, zona);
  if (t === "pasado" || t === "proximos") return null;
  if (t === "hoy") return "Hoy";
  const abrev = new Intl.DateTimeFormat("en-US", { timeZone: zonaSegura(zona), weekday: "short" }).format(new Date(inicio));
  return DIAS_PIN[abrev] ?? null;
}

/** Hoy · Esta semana (7 días) · Próximos, por el día en que empieza: un evento de hoy es de hoy todo el día. Si se ve o
 *  no lo decide `eventoPaso` (fin o 3 h); esto solo agrupa, así que «pasado» es un día anterior a hoy. */
export function tramo(inicio: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): Tramo {
  const dia = diaLocal(new Date(inicio), zona);
  const hoy = diaLocal(ahora, zona);
  if (dia < hoy) return "pasado";
  if (dia === hoy) return "hoy";
  return dia <= sumarDias(hoy, 7) ? "semana" : "proximos";
}

/** Texto de calendario (.ics) en UTC. */
export function aFechaIcs(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Próximos días para elegir con un toque: Hoy, Mañana y luego "sáb 19", "dom 20"… (hoy de la zona). */
export function proximosDias(ahora: Date = new Date(), cuantos = 7, zona: string = ZONA_INICIAL): { valor: string; etiqueta: string }[] {
  const hoy = diaLocal(ahora, zona);
  const dias: { valor: string; etiqueta: string }[] = [];
  for (let i = 0; i < cuantos; i++) {
    const valor = sumarDias(hoy, i);
    // El nombre de un día de calendario no depende de la zona: se escribe el mediodía de ese día en UTC.
    const etiqueta = i === 0 ? "Hoy" : i === 1 ? "Mañana" : new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric" }).format(new Date(`${valor}T12:00:00Z`)).replace(/\./g, "");
    dias.push({ valor, etiqueta });
  }
  return dias;
}

/** "2026-09-19" + "19:00" → "2026-09-19T19:00" (lo que entiende localAIso). */
export function combinarFechaHora(fecha: string, hora: string): string {
  return fecha && hora ? `${fecha}T${hora}` : "";
}

/** Suma horas a un "YYYY-MM-DDTHH:MM" en la zona del evento. */
export function sumarHoras(local: string, horas: number, zona: string = ZONA_INICIAL): string {
  const iso = localAIso(local, zona);
  if (!iso) return "";
  return isoALocal(new Date(new Date(iso).getTime() + horas * 3600000).toISOString(), zona);
}

/** Frase para confirmar: «sábado 19 de septiembre · 7:00 pm» o «… · 7:00–9:00 pm». */
export function fraseCuando(inicioLocal: string, finLocal?: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const iso = localAIso(inicioLocal, zona);
  if (!iso) return "";
  return formatearLargo(iso, ahora, finLocal ? localAIso(finLocal, zona) : null, zona);
}

/** ¿La hora elegida (en la zona del evento) ya pasó? */
export function yaPaso(local: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): boolean {
  const iso = localAIso(local, zona);
  return !!iso && new Date(iso).getTime() < ahora.getTime();
}

/** Las 00:00 de hoy en la zona (ISO). */
export function inicioDelDia(ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  return localAIso(`${diaLocal(ahora, zona)}T00:00`, zona) ?? ahora.toISOString();
}

/** Cuánto se ve un evento sin hora de fin: 3 horas desde que empieza (founder, 2026-10-09, OL-358). */
export const DURACION_SIN_FIN_MS = 3 * 3600000;

/**
 * Cuándo deja de verse un evento: la hora de fin o, sin ella, 3 horas después de empezar (decisión del founder del 2026-10-09,
 * OL-358: de 36 eventos con hora de fin, 20 duran 3 h o menos). Sustituye la regla del 2026-09-16 (hasta la medianoche de su
 * día). Es la columna `eventos.termina` de la base (migración 20261009100000), con la que filtran las listas y el panel: la
 * misma regla en los dos lados. Ya no depende de la zona; `zona` se queda en la firma para no tocar a quien llama.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- la zona se queda en la firma: ya no cambia el resultado
export function terminaDe(inicio: string, fin: string | null, _zona: string = ZONA_INICIAL): string {
  if (fin) return new Date(fin).toISOString();
  return new Date(Date.parse(inicio) + DURACION_SIN_FIN_MS).toISOString();
}

/** ¿Ya pasó el evento? Con hora de fin, cuando terminó; sin ella, 3 horas después de empezar (`terminaDe`, OL-358).
 *  Un evento que ya pasó se oculta: solo lo ven su autor y el administrador. */
export function eventoPaso(inicio: string, fin: string | null, ahora: Date = new Date(), zona: string = ZONA_INICIAL): boolean {
  return new Date(terminaDe(inicio, fin, zona)).getTime() < ahora.getTime();
}

/**
 * La misma regla como filtro de la base (PostgREST, para `.or()`): `termina >= ahora` (ver `terminaDe`). La calcula la
 * base (fin o inicio + 3 h, migración 20261009100000); el panel la usa igual.
 */
export function filtroSinPasar(ahora: Date = new Date()): string {
  return `termina.gte."${ahora.toISOString()}"`;
}
