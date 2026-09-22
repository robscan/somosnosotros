import "server-only";
import { correoCambioEvento, correoNuevoEvento, correoRecordatorio, textoCambio } from "./comunidad";
import { hrefEvento, nombreSitio, type CambioEvento } from "./eventos";
import { diaCorto, formatearCuando } from "./fechas";
import type { AvisoPush } from "./push";

export type TipoAviso = "nuevo_evento" | "recordatorio" | "cambio";
export type Cambio = Exclude<CambioEvento, null>;
export type EventoParaAviso = { id: string; slug?: string | null; titulo: string; inicio: string; fin: string | null; zona: string;
  sitio_texto: string | null; sitio_direccion?: string | null; sitio_reservado: boolean; lugar: { nombre: string; portada: string | null } | null };

export function diaDelRecordatorio(evento: Pick<EventoParaAviso, "inicio" | "zona">, ahora = new Date()): "Hoy" | "Mañana" {
  return diaCorto(evento.inicio, ahora, evento.zona) === "Mañana" ? "Mañana" : "Hoy";
}

export function contenidoPush(tipo: TipoAviso, evento: EventoParaAviso, cambio: Cambio = "ambos", ahora = new Date()): AvisoPush {
  const cuando = formatearCuando(evento.inicio, evento.fin, ahora, evento.zona);
  const lugar = nombreSitio(evento);
  const url = `https://somosnosotros.org${hrefEvento(evento)}`;
  if (tipo === "nuevo_evento") return { titulo: `Nuevo en ${lugar}`, cuerpo: `${evento.titulo} · ${cuando}`, url };
  if (tipo === "cambio") return { titulo: `Cambió ${textoCambio(cambio)}: ${evento.titulo}`, cuerpo: `Ahora es ${cuando} · ${lugar}`, url };
  return { titulo: `${diaDelRecordatorio(evento, ahora)}: ${evento.titulo}`, cuerpo: `${cuando} · ${lugar}`, url };
}

export function contenidoCorreo(tipo: TipoAviso, evento: EventoParaAviso, cambio: Cambio, ahora: Date, bajaUrl: string) {
  const p = { titulo: evento.titulo, cuando: formatearCuando(evento.inicio, evento.fin, ahora, evento.zona),
    dia: diaDelRecordatorio(evento, ahora), lugar: nombreSitio(evento), eventoId: evento.id, eventoSlug: evento.slug, bajaUrl };
  return tipo === "nuevo_evento" ? correoNuevoEvento(p) : tipo === "cambio" ? correoCambioEvento({ ...p, cambio }) : correoRecordatorio(p);
}

// ---------- OL-115: aviso al administrador (avisos_admin_jobs/entregas, migración 20260922150000) ----------
/** Los seis motivos que hoy encolan un aviso al administrador (L39): pedir/reclamar una ficha, publicar
 *  evento/lugar/artista y registrarse. Sin datos personales: el cuerpo nunca lleva nombres ni ids. */
export type MotivoAdmin = "reclamo_ficha" | "reporte" | "nuevo_evento" | "nuevo_lugar" | "nuevo_artista" | "registro";
const TEXTO_MOTIVO_ADMIN: Record<MotivoAdmin, string> = {
  reclamo_ficha: "Alguien reclamó una ficha",
  reporte: "Alguien envió un reporte",
  nuevo_evento: "Se publicó un evento nuevo",
  nuevo_lugar: "Se publicó un lugar nuevo",
  nuevo_artista: "Se publicó un artista nuevo",
  registro: "Alguien se registró",
};

/** El texto corto del push al administrador. Con un solo motivo, dice cuál; agrupado (bucket de 10 min, tope de
 *  60 min en `avisos_admin_encolar`), dice cuántas cosas hay, nunca una lista con nombres. Abre `/admin`. */
export function contenidoPushAdmin(motivos: Record<string, number>): AvisoPush {
  const total = Object.values(motivos).reduce((suma, n) => suma + n, 0);
  const claves = Object.keys(motivos);
  const cuerpo = total === 1 && claves.length === 1 && claves[0] in TEXTO_MOTIVO_ADMIN
    ? TEXTO_MOTIVO_ADMIN[claves[0] as MotivoAdmin]
    : `${total} ${total === 1 ? "cosa" : "cosas"} por revisar`;
  return { titulo: "Administración", cuerpo, url: "/admin" };
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
