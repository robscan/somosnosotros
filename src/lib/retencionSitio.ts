import { terminaDe } from "./fechas";

type EventoRetencion = { sitio_reservado?: boolean; inicio?: string; fin?: string | null; zona?: string };
const RETENCION_MS = 168 * 60 * 60 * 1000;

/** Mismo límite exclusivo que SQL: siete días de 24 h desde el fin efectivo. */
export function sitioReservadoVencido(evento: EventoRetencion | null | undefined, ahora = new Date()): boolean {
  if (!evento?.sitio_reservado || !evento.inicio || !Number.isFinite(Date.parse(evento.inicio))) return false;
  if (evento.fin && !Number.isFinite(Date.parse(evento.fin))) return false;
  return Date.parse(terminaDe(evento.inicio, evento.fin ?? null, evento.zona)) + RETENCION_MS <= ahora.getTime();
}

/** La referencia original viene de la base, nunca de un campo oculto del cliente. */
export function puedeConservarReservadoSinDireccion(original: EventoRetencion | null | undefined, nuevo: EventoRetencion, ahora = new Date()): boolean {
  return sitioReservadoVencido(original, ahora) && sitioReservadoVencido(nuevo, ahora);
}
