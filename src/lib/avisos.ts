import "server-only";
import { correoCambioEvento, correoNuevoEvento, correoRecordatorio } from "./comunidad";
import { hrefEvento, nombreSitio, type CambioEvento } from "./eventos";
import { conMayuscula, cuandoCorto, diaCorto, formatearCuando } from "./fechas";
import type { TipoAvisoAbierto } from "./avisoAbierto";
import type { AvisoPush } from "./push";

/** `cancelado` todavía no lo crea la cola (fase 4 del plan de `docs/investigaciones/avisos-con-la-app-nativa.md`): su texto ya queda listo. */
export type TipoAviso = "nuevo_evento" | "recordatorio" | "cambio" | "cancelado";
export type Cambio = Exclude<CambioEvento, null>;
export type EventoParaAviso = { id: string; slug?: string | null; titulo: string; inicio: string; fin: string | null; zona: string;
  sitio_texto: string | null; sitio_direccion?: string | null; sitio_reservado: boolean; lugar: { nombre: string; portada: string | null } | null };

export function diaDelRecordatorio(evento: Pick<EventoParaAviso, "inicio" | "zona">, ahora = new Date()): "Hoy" | "Mañana" {
  return diaCorto(evento.inicio, ahora, evento.zona) === "Mañana" ? "Mañana" : "Hoy";
}

// ---------- OL-480 (bitácora 512): la forma de los avisos al teléfono, la firmada en OL-478 (bitácora 510) ----------

/** Lo que dice la dirección de un aviso (`?desde=aviso&tipo=…`) y lo que mide la app al abrirlo (`aviso_abierto`, `lib/avisoAbierto`). */
const TIPO_EN_URL: Record<TipoAviso, TipoAvisoAbierto> = { nuevo_evento: "nuevo", cambio: "cambio", recordatorio: "recordatorio", cancelado: "cancelado" };

/** Los largos máximos: el título cabe en una línea de la pantalla de bloqueo y el cuerpo en dos o tres; el servidor corta por palabra. */
export const LARGO_TITULO = 40;
export const LARGO_CUERPO = 110;

/** Corta por la última palabra entera que quepa con «…» (sin dejar «·», coma o dos puntos colgando). Lo que ya cabe, tal cual. */
export function recortar(texto: string, largo: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= largo) return limpio;
  const corte = limpio.slice(0, largo); // el «…» ocupa el lugar del espacio en que se corta
  const espacio = corte.lastIndexOf(" ");
  const base = espacio > largo * 0.4 ? corte.slice(0, espacio) : limpio.slice(0, largo - 1);
  return `${base.replace(/[\s·,;:—–-]+$/u, "")}…`;
}

/** «Nuevo en {lugar}», «De {artista}, a quien sigues»: si no cabe, se corta el nombre y la frase queda entera. */
function conNombre(antes: string, nombre: string, despues: string, largo = LARGO_TITULO): string {
  const entero = `${antes}${nombre}${despues}`;
  if (entero.length <= largo) return entero;
  return `${antes}${recortar(nombre, Math.max(4, largo - antes.length - despues.length))}${despues}`;
}

/**
 * Por qué le llega a esta persona (`avisos_entregas.motivo`, lo guarda `avisos_expandir` por persona): `artista:<nombre>` si sigue a alguien
 * del cartel (va antes que el lugar), `lugar` si sigue el lugar. Null en las entregas de antes de la migración y en los demás tipos.
 */
export type Motivo = string | null;
/** Lo que la base deja al autorizar además del evento (públicos los dos): la descripción y la dirección del lugar, para el cuerpo. */
export type ExtraAviso = { motivo?: Motivo; descripcion?: string | null; direccion?: string | null };

/** La forma de un aviso antes de saber a qué aparato va: el título es el evento, la razón va en el subtítulo y el hilo junta los del evento. */
export type FormaAviso = { titulo: string; subtitulo: string; cuerpo: string; url: string; hilo: string };

/** ¿Empieza en menos de 24 horas? Entonces la fecha dice «hoy a las…» o «mañana a las…» (lo de última hora; bitácora 510, regla 3). */
function esPronto(evento: Pick<EventoParaAviso, "inicio">, ahora: Date): boolean {
  const falta = new Date(evento.inicio).getTime() - ahora.getTime();
  return falta >= 0 && falta < 24 * 3600000;
}

function unir(...partes: (string | null | undefined)[]): string {
  return partes.map((p) => (p ?? "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" · ");
}

/**
 * El aviso al teléfono de un evento (OL-478, firmado por el founder el 2026-10-29: «Tomo todas tus recomendaciones»). Título = el nombre del
 * evento; debajo, la razón («Nuevo en Teatro de la Paz», «De Luna Hermoso, a quien sigues», «Hoy a las 8 pm», «Nueva fecha: vie 9 · 8 pm», «Se
 * canceló»); en el cuerpo, la fecha corta primero (nunca se corta). Nada dice quién publicó. La dirección lleva `?desde=aviso&tipo=…` para contar
 * cuántos se abren sin saber quién; el hilo (`evento-<id>`) junta en una pila el recordatorio, el cambio y la cancelación de un mismo evento.
 */
export function contenidoPush(tipo: TipoAviso, evento: EventoParaAviso, cambio: Cambio = "ambos", ahora = new Date(), extra: ExtraAviso = {}): FormaAviso {
  const pronto = esPronto(evento, ahora);
  const cuando = cuandoCorto(evento.inicio, evento.fin, ahora, evento.zona, pronto);
  const lugar = nombreSitio(evento);
  const url = `https://somosnosotros.org${hrefEvento(evento)}?desde=aviso&tipo=${TIPO_EN_URL[tipo]}`;
  const base = { titulo: recortar(evento.titulo, LARGO_TITULO), url, hilo: `evento-${evento.id}` };
  // El cuerpo que abre con «hoy a las…» o «mañana a las…» va con mayúscula; «vie 9 · 8 pm» se queda como en toda la app.
  const abre = (texto: string) => (/^(hoy|mañana) /.test(texto) ? conMayuscula(texto) : texto);
  const forma = (subtitulo: string, cuerpo: string): FormaAviso => ({ ...base, subtitulo: recortar(subtitulo, LARGO_TITULO), cuerpo: recortar(abre(cuerpo), LARGO_CUERPO) });
  if (tipo === "nuevo_evento") {
    const artista = extra.motivo?.startsWith("artista:") ? extra.motivo.slice("artista:".length).trim() : "";
    if (artista) return forma(conNombre("De ", artista, ", a quien sigues"), unir(cuando, lugar));
    return forma(conNombre("Nuevo en ", lugar, ""), unir(cuando, extra.descripcion));
  }
  if (tipo === "recordatorio") {
    // Siempre es de hoy o de mañana (sale en las 24 horas de antes): «Hoy a las 8 pm». Con sitio reservado, solo el nombre (`nombreSitio`).
    const direccion = evento.sitio_reservado || !evento.lugar ? null : extra.direccion;
    return forma(conMayuscula(cuandoCorto(evento.inicio, evento.fin, ahora, evento.zona, true)), unir(lugar, direccion));
  }
  if (tipo === "cambio") {
    if (cambio === "cuando") return forma(`Nueva fecha: ${cuando}`, lugar);
    if (cambio === "donde") return forma(conNombre("Nuevo lugar: ", lugar, ""), cuando);
    return forma("Nueva fecha y lugar", unir(cuando, lugar));
  }
  return forma("Se canceló", `Era ${pronto ? "" : "el "}${cuando} en ${lugar}.`);
}

/**
 * El cuerpo que se manda a cada aparato. En la app del iPhone (APNs) va el subtítulo aparte, el hilo (`thread-id`) y, como `tag`, una marca del
 * trabajo (`apns-collapse-id`: un reintento del mismo aviso no sale dos veces). En la web no hay subtítulo: la razón abre el cuerpo, el `tag`
 * es el hilo del evento (el aviso nuevo de un evento sustituye al anterior del mismo evento) y `aviso` dice de qué trabajo es, para que el
 * service worker vuelva a sonar con un aviso nuevo y no con un reintento (`public/sw.js`).
 */
export function cuerpoPush(forma: FormaAviso, aparato: "app" | "web", jobId: string): AvisoPush {
  if (aparato === "app") return { titulo: forma.titulo, subtitulo: forma.subtitulo, cuerpo: forma.cuerpo, url: forma.url, tag: `aviso-${jobId}`, hilo: forma.hilo };
  return { titulo: forma.titulo, cuerpo: recortar(unir(forma.subtitulo, forma.cuerpo), LARGO_CUERPO), url: forma.url, tag: forma.hilo, aviso: jobId };
}

/** Los tipos que crea hoy la cola (`avisos_jobs.tipo`). */
export type TipoCola = Exclude<TipoAviso, "cancelado">;

export function contenidoCorreo(tipo: TipoCola, evento: EventoParaAviso, cambio: Cambio, ahora: Date, bajaUrl: string) {
  const p = { titulo: evento.titulo, cuando: formatearCuando(evento.inicio, evento.fin, ahora, evento.zona),
    dia: diaDelRecordatorio(evento, ahora), lugar: nombreSitio(evento), eventoId: evento.id, eventoSlug: evento.slug, bajaUrl };
  return tipo === "nuevo_evento" ? correoNuevoEvento(p) : tipo === "cambio" ? correoCambioEvento({ ...p, cambio }) : correoRecordatorio(p);
}

// ---------- OL-115: aviso al administrador (avisos_admin_jobs/entregas, migración 20260922150000) ----------
/** Los motivos que encolan un aviso al administrador (L39): pedir/reclamar una ficha, publicar evento/lugar/artista, registrarse y
 *  (OL-467) ponerle cartel a un evento que ya estaba (`poner_cartel_a_evento`). Sin datos personales: el cuerpo nunca lleva nombres ni ids. */
export type MotivoAdmin = "reclamo_ficha" | "reporte" | "nuevo_evento" | "nuevo_lugar" | "nuevo_artista" | "registro" | "cartel_puesto";
const TEXTO_MOTIVO_ADMIN: Record<MotivoAdmin, string> = {
  reclamo_ficha: "Alguien reclamó una ficha",
  reporte: "Alguien envió un reporte",
  nuevo_evento: "Se publicó un evento nuevo",
  nuevo_lugar: "Se publicó un lugar nuevo",
  nuevo_artista: "Se publicó una ficha de artista nueva",
  registro: "Alguien se registró",
  cartel_puesto: "Alguien le puso cartel a un evento",
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
