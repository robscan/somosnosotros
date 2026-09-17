import { aFechaIcs } from "./fechas";

/** Lo que va en el archivo de calendario de un evento. */
export type EventoCalendario = { id: string; titulo: string; inicio: string; fin: string | null; descripcion: string | null; lugar: string | null };

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
  const url = `${ORIGEN}/eventos/${e.id}`;
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
