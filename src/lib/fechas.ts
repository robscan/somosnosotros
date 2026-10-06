/**
 * Fechas de eventos. Cada lugar y cada evento guarda su zona horaria (migración 0029): las horas se leen y se muestran
 * en la zona del evento, no en la de quien mira ("19:00" en Madrid es a las 19:00 de Madrid). Lo que no dice zona cae
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

/** "19:00" en la zona del evento. */
export function horaCorta(iso: string, zona: string = ZONA_INICIAL): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** La hora de fin de un evento de varios días al que nadie le puso hora (OL-298, `FIN_DEL_DIA` en `calendario.ts`): acaba con su último
 *  día y se guarda como las 23:59 de ese día. Esa hora no se escribe: el texto dice solo el día. Solo si el fin cae en otro día que el
 *  inicio (un evento de un solo día que termina a las 23:59 la conserva) y con la hora de la zona del evento. El dato guardado no cambia. */
function acabaConSuUltimoDia(inicio: Date, fin: Date, zona: string): boolean {
  return diaLocal(fin, zona) !== diaLocal(inicio, zona) && horaCorta(fin.toISOString(), zona) === "23:59";
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
 * Un evento de varios días se lee como lo pregunta el alta (OL-309): el horario del primer día vale para todos, así que el texto dice los días
 * y, aparte, las horas de cada día («Del 10 al 12 de oct» y «20:00–21:00», en 24 h como todo el texto de la app); sin hora de fin puesta (acaba con su último día, ver
 * `acabaConSuUltimoDia`), solo la de inicio. Null si no dura varios días, también cuando solo cruza la medianoche (empieza 10:00 p.m., termina
 * 1:00 a.m. del día siguiente: su fin cae antes de la hora de inicio y es una noche, no dos días).
 */
export function cuandoVariosDias(inicio: string, fin: string | null | undefined, ahora: Date = new Date(), zona: string = ZONA_INICIAL): { dias: string; horas: string } | null {
  if (!fin) return null;
  const d = new Date(inicio);
  const f = new Date(fin);
  const diaInicio = diaLocal(d, zona);
  const diaFin = diaLocal(f, zona);
  const horaInicio = horaCorta(inicio, zona);
  const horaFin = horaCorta(fin, zona);
  if (diaFin <= diaInicio || (diaFin === sumarDias(diaInicio, 1) && horaFin <= horaInicio)) return null;
  // Cadena limpia (viaja a compartir, avisos y correos); que la hora no se parta en un renglón angosto lo resuelve quien la pinta, con CSS.
  const horas = acabaConSuUltimoDia(d, f, zona) ? horaInicio : `${horaInicio}–${horaFin}`;
  return { dias: rangoCorto(diaInicio, diaFin, diaLocal(ahora, zona)), horas };
}

/** Lo que dice un evento con horario por día donde antes iba el horario («Del 9 al 11 de oct · horarios por día»). */
export const HORARIOS_POR_DIA = "horarios por día";

/** «Del 9 al 11 de oct · horarios por día», de un evento guardado (su inicio y su fin dicen los días). */
export function cuandoPorDia(inicio: string, fin: string, zona: string, ahora: Date = new Date()): string {
  return `${rangoCorto(diaLocal(new Date(inicio), zona), diaLocal(new Date(fin), zona), diaLocal(ahora, zona))} · ${HORARIOS_POR_DIA}`;
}

/** "sáb 20 sep · 19:00" (y "–21:00" si hay fin el mismo día). Con año si no es el de hoy. Un evento de varios días dice sus días y su horario de cada día (`cuandoVariosDias`); uno que solo cruza la medianoche, "→ dom 21 sep · 01:00". */
export function formatearCuando(inicio: string, fin?: string | null, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const varios = cuandoVariosDias(inicio, fin, ahora, zona);
  if (varios) return `${varios.dias} · ${varios.horas}`;
  const d = new Date(inicio);
  const dia = diaLocal(d, zona);
  const fecha = diaCorto(inicio, ahora, zona);
  const hora = horaCorta(inicio, zona);
  let texto = `${fecha} · ${hora}`;
  if (fin) {
    const f = new Date(fin);
    const horaFin = horaCorta(fin, zona);
    texto += diaLocal(f, zona) === dia ? `–${horaFin}` : ` → ${diaCortoDe(f, ahora, zona)} · ${horaFin}`;
  }
  return texto;
}

/** El día largo de la ficha: "sábado 20 de septiembre" (con año si no es el actual). */
function diaLargoDe(d: Date, ahora: Date, zona: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), weekday: "long", day: "numeric", month: "long", ...conAnio(d, ahora, zona) }).format(d).replace(",", "");
}

/** Fecha larga para la ficha: "sábado 20 de septiembre · 19:00" (con año si no es el de hoy; con " a 21:00" si hay fin el mismo día). Un fin otro día a las 23:59 va solo con su día. */
export function formatearLargo(iso: string, ahora: Date = new Date(), fin?: string | null, zona: string = ZONA_INICIAL): string {
  const d = new Date(iso);
  let texto = `${diaLargoDe(d, ahora, zona)} · ${horaCorta(iso, zona)}`;
  if (fin) {
    const f = new Date(fin);
    if (diaLocal(f, zona) === diaLocal(d, zona)) texto += ` a ${horaCorta(fin, zona)}`;
    else texto += acabaConSuUltimoDia(d, f, zona) ? ` hasta ${diaLargoDe(f, ahora, zona)}` : ` hasta ${formatearLargo(fin, ahora, null, zona)}`;
  }
  return texto;
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

/** Hoy · Esta semana (7 días) · Próximos. Un evento de hoy sigue siendo de hoy hasta que acabe el día (la misma regla que `eventoPaso`). */
export function tramo(inicio: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): Tramo {
  if (eventoPaso(inicio, null, ahora, zona)) return "pasado";
  const dia = diaLocal(new Date(inicio), zona);
  const hoy = diaLocal(ahora, zona);
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

/** Frase para confirmar: "sábado 19 de septiembre · 19:00" o "… · 19:00 a 21:00". */
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

/**
 * Cuándo deja de verse un evento: la hora de fin o, sin ella, las 00:00 del día siguiente en su zona. Es la columna
 * `eventos.termina` de la base (migración 0029), con la que filtran las listas y el panel: la misma regla en los dos lados.
 */
export function terminaDe(inicio: string, fin: string | null, zona: string = ZONA_INICIAL): string {
  if (fin) return new Date(fin).toISOString();
  return localAIso(`${sumarDias(diaLocal(new Date(inicio), zona), 1)}T00:00`, zona) ?? new Date(inicio).toISOString();
}

/** ¿Ya pasó el evento? Con hora de fin, cuando terminó; sin ella, cuando acabó su día en su zona (pedido del founder,
 *  2026-09-16: los eventos de hoy se quedan a la vista hasta que termine el día o termine el evento).
 *  Un evento que ya pasó se oculta: solo lo ven su autor y el administrador. */
export function eventoPaso(inicio: string, fin: string | null, ahora: Date = new Date(), zona: string = ZONA_INICIAL): boolean {
  return new Date(terminaDe(inicio, fin, zona)).getTime() < ahora.getTime();
}

/**
 * La misma regla como filtro de la base (PostgREST, para `.or()`): `termina >= ahora` (ver `terminaDe`). La calcula la
 * base con la zona de cada evento; el panel la usa igual (migración 0029).
 */
export function filtroSinPasar(ahora: Date = new Date()): string {
  return `termina.gte."${ahora.toISOString()}"`;
}
