/**
 * Fechas de eventos. La ciudad vive en America/Mexico_City (sin horario de verano desde 2022, UTC−6).
 * En la base se guarda timestamptz; en pantalla siempre se muestra en la hora de la ciudad.
 */
export const ZONA = "America/Mexico_City";
const DESFASE = "-06:00";

/** "2026-09-20T19:00" (selector del teléfono) → ISO con la zona de la ciudad. Null si no es una fecha. */
export function localAIso(local: string | null | undefined): string | null {
  const v = (local ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return null;
  const d = new Date(`${v.slice(0, 16)}:00${DESFASE}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → "2026-09-20T19:00" en hora de la ciudad (para rellenar el selector). */
export function isoALocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = partes(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function partes(d: Date): Record<string, string> {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" });
  const out: Record<string, string> = {};
  for (const { type, value } of f.formatToParts(d)) out[type] = value;
  if (out.hour === "24") out.hour = "00";
  return out;
}

/** Día (YYYY-MM-DD) en la ciudad. */
export function diaLocal(d: Date): string {
  const p = partes(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** El año solo se escribe cuando no es el actual: "sáb 20 de sep" este año, "sáb 20 de sep de 2027" el que viene. */
function conAnio(d: Date, ahora: Date): { year?: "numeric" } {
  return partes(d).year === partes(ahora).year ? {} : { year: "numeric" };
}

/** "sáb 20 de sep" (con año si no es el actual). */
function diaCortoDe(x: Date, ahora: Date): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, weekday: "short", day: "numeric", month: "short", ...conAnio(x, ahora) }).format(x).replace(/[.,]/g, "");
}

/** "Hoy", "Mañana" o "sáb 20 de sep": el título del día en la agenda. */
export function diaCorto(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  const dia = diaLocal(d);
  if (dia === diaLocal(ahora)) return "Hoy";
  if (dia === diaLocal(new Date(ahora.getTime() + 86400000))) return "Mañana";
  return diaCortoDe(d, ahora);
}

/** "sábado 19 de septiembre" (con año si no es el actual) a partir de un día YYYY-MM-DD de la ciudad. */
export function diaLargo(fecha: string, ahora: Date = new Date()): string {
  const iso = localAIso(`${fecha}T12:00`);
  if (!iso) return fecha;
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", ...conAnio(d, ahora) }).format(d).replace(",", "");
}

/** "19:00" en la hora de la ciudad. */
export function horaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** "sáb 20 sep · 19:00" (y "–21:00" si hay fin el mismo día). Con año si no es el de hoy. */
export function formatearCuando(inicio: string, fin?: string | null, ahora: Date = new Date()): string {
  const d = new Date(inicio);
  const dia = diaLocal(d);
  const fecha = diaCorto(inicio, ahora);
  const hora = horaCorta(inicio);
  let texto = `${fecha} · ${hora}`;
  if (fin) {
    const f = new Date(fin);
    const horaFin = horaCorta(fin);
    texto += diaLocal(f) === dia ? `–${horaFin}` : ` → ${diaCortoDe(f, ahora)} · ${horaFin}`;
  }
  return texto;
}

/** Fecha larga para la ficha: "sábado 20 de septiembre · 19:00" (con año si no es el de hoy; con " a 21:00" si hay fin el mismo día). */
export function formatearLargo(iso: string, ahora: Date = new Date(), fin?: string | null): string {
  const d = new Date(iso);
  const fecha = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", ...conAnio(d, ahora) }).format(d).replace(",", "");
  let texto = `${fecha} · ${horaCorta(iso)}`;
  if (fin) {
    const f = new Date(fin);
    texto += diaLocal(f) === diaLocal(d) ? ` a ${horaCorta(fin)}` : ` hasta ${formatearLargo(fin, ahora)}`;
  }
  return texto;
}

export type Tramo = "hoy" | "semana" | "proximos" | "pasado";

/** Hoy · Esta semana (7 días) · Próximos. Un evento de hoy sigue siendo de hoy hasta que acabe el día (la misma regla que `eventoPaso`). */
export function tramo(inicio: string, ahora: Date = new Date()): Tramo {
  const d = new Date(inicio);
  if (eventoPaso(inicio, null, ahora)) return "pasado";
  const dia = diaLocal(d);
  if (dia === diaLocal(ahora)) return "hoy";
  const limite = new Date(ahora.getTime() + 7 * 86400000);
  return dia <= diaLocal(limite) ? "semana" : "proximos";
}

/** Valor sugerido para el selector: hoy a las 19:00 si aún no pasa; si no, mañana a las 19:00. */
export function sugerirInicio(ahora: Date = new Date()): string {
  const p = partes(ahora);
  const hoy19 = `${p.year}-${p.month}-${p.day}T19:00`;
  if (Number(p.hour) < 18) return hoy19;
  const m = new Date(ahora.getTime() + 86400000);
  const q = partes(m);
  return `${q.year}-${q.month}-${q.day}T19:00`;
}

/** Texto de calendario (.ics) en UTC. */
export function aFechaIcs(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Próximos días para elegir con un toque: Hoy, Mañana y luego "sáb 19", "dom 20"… */
export function proximosDias(ahora: Date = new Date(), cuantos = 7): { valor: string; etiqueta: string }[] {
  const dias: { valor: string; etiqueta: string }[] = [];
  for (let i = 0; i < cuantos; i++) {
    const d = new Date(ahora.getTime() + i * 86400000);
    const valor = diaLocal(d);
    const etiqueta =
      i === 0 ? "Hoy" : i === 1 ? "Mañana" : new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, weekday: "short", day: "numeric" }).format(d).replace(/\./g, "");
    dias.push({ valor, etiqueta });
  }
  return dias;
}

/** "2026-09-19" + "19:00" → "2026-09-19T19:00" (lo que entiende localAIso). */
export function combinarFechaHora(fecha: string, hora: string): string {
  return fecha && hora ? `${fecha}T${hora}` : "";
}

/** Suma horas a un "YYYY-MM-DDTHH:MM" en hora de la ciudad. */
export function sumarHoras(local: string, horas: number): string {
  const iso = localAIso(local);
  if (!iso) return "";
  return isoALocal(new Date(new Date(iso).getTime() + horas * 3600000).toISOString());
}

/** Frase para confirmar: "sábado 19 de septiembre · 19:00" o "… · 19:00 a 21:00". */
export function fraseCuando(inicioLocal: string, finLocal?: string, ahora: Date = new Date()): string {
  const iso = localAIso(inicioLocal);
  if (!iso) return "";
  return formatearLargo(iso, ahora, finLocal ? localAIso(finLocal) : null);
}

/** ¿La hora elegida (en hora de la ciudad) ya pasó? */
export function yaPaso(local: string, ahora: Date = new Date()): boolean {
  const iso = localAIso(local);
  return !!iso && new Date(iso).getTime() < ahora.getTime();
}

/** Las 00:00 de hoy en la hora de la ciudad (ISO): desde cuándo un evento sin hora de fin sigue siendo de hoy. */
export function inicioDelDia(ahora: Date = new Date()): string {
  return localAIso(`${diaLocal(ahora)}T00:00`) ?? ahora.toISOString();
}

/** ¿Ya pasó el evento? Con hora de fin, cuando terminó; sin ella, cuando acabó su día en la ciudad (pedido del founder,
 *  2026-09-16: los eventos de hoy se quedan a la vista hasta que termine el día o termine el evento).
 *  Un evento que ya pasó se oculta: solo lo ven su autor y el administrador. */
export function eventoPaso(inicio: string, fin: string | null, ahora: Date = new Date()): boolean {
  if (fin) return new Date(fin).getTime() < ahora.getTime();
  return diaLocal(new Date(inicio)) < diaLocal(ahora);
}

/** La misma regla como filtro de la base (PostgREST, para `.or()`): termina después de ahora o, sin hora de fin, empieza hoy o después. */
export function filtroSinPasar(ahora: Date = new Date()): string {
  return `fin.gte."${ahora.toISOString()}",and(fin.is.null,inicio.gte."${inicioDelDia(ahora)}")`;
}
