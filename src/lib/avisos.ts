import "server-only";
import { correoCambioEvento, correoNuevoEvento, correoRecordatorio, textoCambio } from "./comunidad";
import { nombreSitio, type CambioEvento } from "./eventos";
import { diaCorto, formatearCuando } from "./fechas";
import type { AvisoPush } from "./push";

export type TipoAviso = "nuevo_evento" | "recordatorio" | "cambio";
export type Cambio = Exclude<CambioEvento, null>;
export type EventoParaAviso = { id: string; titulo: string; inicio: string; fin: string | null; zona: string;
  sitio_texto: string | null; sitio_direccion?: string | null; sitio_reservado: boolean; lugar: { nombre: string; portada: string | null } | null };

export function diaDelRecordatorio(evento: Pick<EventoParaAviso, "inicio" | "zona">, ahora = new Date()): "Hoy" | "Mañana" {
  return diaCorto(evento.inicio, ahora, evento.zona) === "Mañana" ? "Mañana" : "Hoy";
}

export function contenidoPush(tipo: TipoAviso, evento: EventoParaAviso, cambio: Cambio = "ambos", ahora = new Date()): AvisoPush {
  const cuando = formatearCuando(evento.inicio, evento.fin, ahora, evento.zona);
  const lugar = nombreSitio(evento);
  const url = `https://somosnosotros.org/eventos/${evento.id}`;
  if (tipo === "nuevo_evento") return { titulo: `Nuevo en ${lugar}`, cuerpo: `${evento.titulo} · ${cuando}`, url };
  if (tipo === "cambio") return { titulo: `Cambió ${textoCambio(cambio)}: ${evento.titulo}`, cuerpo: `Ahora es ${cuando} · ${lugar}`, url };
  return { titulo: `${diaDelRecordatorio(evento, ahora)}: ${evento.titulo}`, cuerpo: `${cuando} · ${lugar}`, url };
}

export function contenidoCorreo(tipo: TipoAviso, evento: EventoParaAviso, cambio: Cambio, ahora: Date, bajaUrl: string) {
  const p = { titulo: evento.titulo, cuando: formatearCuando(evento.inicio, evento.fin, ahora, evento.zona),
    dia: diaDelRecordatorio(evento, ahora), lugar: nombreSitio(evento), eventoId: evento.id, bajaUrl };
  return tipo === "nuevo_evento" ? correoNuevoEvento(p) : tipo === "cambio" ? correoCambioEvento({ ...p, cambio }) : correoRecordatorio(p);
}

// Utilidades puras conservadas para consumidores y pruebas de presentacion.
export type Canales = { id: string; avisos_correo: boolean; avisos_push: boolean };
export function pendientesDeAviso<T extends Canales>(perfiles: T[], yaEnviados: Set<string>): T[] {
  return perfiles.filter((p) => (p.avisos_correo || p.avisos_push) && !yaEnviados.has(p.id));
}
export function lotes<T>(lista: T[], tamano: number): T[][] {
  if (!Number.isInteger(tamano) || tamano < 1) throw new Error("tamano invalido");
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) out.push(lista.slice(i, i + tamano));
  return out;
}
export const TOPE_AVISOS_POR_AUTOR_DIA = 3;
export function superoTopeAvisos(cuenta: number, tope = TOPE_AVISOS_POR_AUTOR_DIA): boolean { return cuenta > tope; }
export function ventanaRecordatorio(horas: number, ahora = new Date()) {
  return { desde: ahora.toISOString(), hasta: new Date(ahora.getTime() + horas * 3600000).toISOString() };
}
