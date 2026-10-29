/**
 * Las reglas de la cola de redes (OL-465, bitácora 497), sin base ni red para poder probarlas: qué error se reintenta y cuánto se espera, qué
 * dice el botón cuando el mismo evento ya está en camino o se acaba de publicar, y qué dice el aviso al terminar. Lo usan el trabajador
 * (`trabajar.ts`), las acciones de la hoja y la hoja misma.
 */
import type { AvisoPush } from "../push";

export type Red = "instagram" | "facebook";
export type ClaveFallo = "cupo" | "imagen" | "permiso" | "empezo" | "texto" | "otro";

/** Cuántas veces se reintenta un error pasajero (después del primer intento). */
export const MAX_REINTENTOS = 3;
/** La espera antes de cada reintento: crece (1, 3 y 7 minutos). El latido pasa cada minuto. */
export const ESPERAS_MS = [60_000, 180_000, 420_000] as const;
/** Cuánto queda tomado un trabajo al reclamarlo: más que lo que puede vivir la función (300 s), así uno que se cae queda libre. */
export const OCUPADO_MS = 320_000;
/**
 * La lista y la hoja vuelven a leer cómo va cada 5 s mientras algo dice «Publicando…» (OL-488, añadido del founder del 2026-10-29: la pantalla
 * se quedaba en «Publicando» aunque la cola ya había terminado; antes, cada 20 s).
 */
export const REFRESCO_MS = 5_000;

/**
 * ¿Vale la pena reintentar? Sí ante lo pasajero: Instagram todavía procesando la imagen o sin responder, un 5xx, la red («imagen» y «otro»).
 * No ante el cupo del día, un permiso vencido, un evento que ya empezó o un texto que no cabe: reintentar no lo arregla.
 */
export function esPasajero(clave: ClaveFallo): boolean {
  return clave === "imagen" || clave === "otro";
}

/** Tras el fallo número `fallos` (1, 2, 3…): si se reintenta y cuándo. */
export function trasFallo(clave: ClaveFallo, fallos: number): { reintentar: true; esperaMs: number } | { reintentar: false } {
  if (!esPasajero(clave) || fallos > MAX_REINTENTOS) return { reintentar: false };
  return { reintentar: true, esperaMs: ESPERAS_MS[Math.min(Math.max(fallos, 1), ESPERAS_MS.length) - 1] };
}

/** Lo que dice la base (`redes_reciente`) cuando ese evento con ese formato ya está en camino o salió hace poco. */
export type Reciente = { estado: "publicando" } | { estado: "publicado"; minutos: number };

export function leerReciente(v: unknown): Reciente | null {
  if (!v || typeof v !== "object") return null;
  const r = v as { estado?: unknown; minutos?: unknown };
  if (r.estado === "publicando") return { estado: "publicando" };
  if (r.estado === "publicado") return { estado: "publicado", minutos: Math.max(0, Math.floor(Number(r.minutos) || 0)) };
  return null;
}

const hace = (minutos: number) => (minutos < 1 ? "hace un momento" : minutos === 1 ? "hace 1 min" : `hace ${minutos} min`);

/** El botón cuando ya está en camino o se acaba de publicar: «Se está publicando», «Ya se publicó hace 3 min». */
export function botonReciente(r: Reciente): string {
  return r.estado === "publicando" ? "Se está publicando" : `Ya se publicó ${hace(r.minutos)}`;
}

/** La pregunta antes de repetir. */
export function preguntaRepetir(r: Reciente, red: Red = "instagram"): string {
  const donde = red === "facebook" ? " en Facebook" : "";
  return r.estado === "publicando"
    ? `Este evento ya se está publicando${donde}. ¿Publicarlo otra vez?`
    : `Este evento se publicó${donde} ${hace(r.minutos)}. ¿Publicarlo otra vez?`;
}

/** Lo que dice el aviso, por qué no se pudo: frases cortas y llanas (la hoja dice la larga). */
const MOTIVO_INSTAGRAM: Record<ClaveFallo, string> = {
  cupo: "hoy ya van 100 publicaciones en Instagram",
  imagen: "Instagram no aceptó la imagen",
  permiso: "hay que volver a conectar la cuenta de Instagram",
  empezo: "el evento ya empezó",
  texto: "el texto no cabe en Instagram",
  otro: "Instagram no respondió",
};
const MOTIVO_FACEBOOK: Record<ClaveFallo, string> = {
  cupo: "Facebook no deja más por hoy",
  imagen: "Facebook no aceptó la imagen",
  permiso: "falta el permiso de la página de Facebook",
  empezo: "el evento ya empezó",
  texto: "el texto no cabe en Facebook",
  otro: "Facebook no respondió",
};

export function motivoLlano(red: Red, clave: ClaveFallo): string {
  return (red === "facebook" ? MOTIVO_FACEBOOK : MOTIVO_INSTAGRAM)[clave];
}

/** Lo que pasó con un trabajo, como lo guarda el trabajador en `resultado`. */
export type EspejoFacebook = { ok: true; permalink: string | null } | { ok: false; error: "permiso" | "imagen" | "otro" | "empezo"; mensaje: string };
export type ResultadoTrabajo = {
  /** `sinCoautor` (OL-479): se invitó al artista como coautor e Instagram no lo aceptó; salió sin él. */
  instagram?: { permalink: string | null; imagenes: number; sinEtiquetas: boolean; formato: "4x5" | "9x16" | "carrusel"; sinCoautor?: boolean };
  facebook?: EspejoFacebook | null;
  /** OL-479: la historia que acompaña la publicación de un artista o un lugar de la semana. */
  historia?: { ok: boolean; permalink: string | null };
  mensaje?: string;
};

/**
 * El aviso al terminar: «Se publicó en Instagram y Facebook · <título>» (o solo en una), «Se publicó en Instagram · <título>. Facebook: falta
 * el permiso…» o «No se pudo publicar <título>: <motivo llano>». Abre la lista de Instagram con la hoja de ese evento, que dice lo que pasó y
 * lleva a la publicación con «Ver» (abrir instagram.com dentro de la app instalada la sacaría de la app).
 */
export function avisoDeTrabajo(t: { id: string; evento_id: string | null; titulo: string; red: Red; estado: "publicado" | "fallido"; error: ClaveFallo | null; resultado: ResultadoTrabajo | null; casilla?: string | null }): AvisoPush {
  const titulo = t.titulo.length > 80 ? `${t.titulo.slice(0, 79)}…` : t.titulo;
  // OL-479: lo que programó la semana abre su día en la pestaña «Semana».
  const url = t.casilla ? `/admin/instagram?pestana=semana&dia=${t.casilla}` : `/admin/instagram?evento=${t.evento_id}`;
  const tag = `redes-${t.id}`;
  if (t.estado === "fallido") {
    return { titulo: "No se publicó", cuerpo: `No se pudo publicar ${titulo}: ${motivoLlano(t.red, t.error ?? "otro")}.`, url, tag };
  }
  if (t.red === "facebook") return { titulo: "Publicado", cuerpo: `Se publicó en Facebook · ${titulo}`, url, tag };
  const fb = t.resultado?.facebook ?? null;
  if (fb?.ok) return { titulo: "Publicado", cuerpo: `Se publicó en Instagram y Facebook · ${titulo}`, url, tag };
  if (fb && !fb.ok) return { titulo: "Publicado", cuerpo: `Se publicó en Instagram · ${titulo}. Facebook: ${motivoLlano("facebook", fb.error)}.`, url, tag };
  return { titulo: "Publicado", cuerpo: `Se publicó en Instagram · ${titulo}`, url, tag };
}

/** Un trabajo como lo ven la hoja y la lista: dónde va y lo que pasó. */
export type EstadoTrabajo = {
  id: string;
  red: Red;
  formato: "4x5" | "9x16";
  estado: "en_cola" | "publicando" | "publicado" | "fallido";
  /** Si se pidió también Facebook (un trabajo de Instagram con la casilla). */
  conFacebook: boolean;
  resultado: ResultadoTrabajo | null;
  error: ClaveFallo | null;
  /** OL-488: en camino y ya no es el primer intento (la cola lo repite tras un error pasajero): «Reintentando…». */
  reintentando: boolean;
};

export const enCamino = (e: Pick<EstadoTrabajo, "estado"> | null | undefined): boolean => e?.estado === "en_cola" || e?.estado === "publicando";

export function leerEstadoTrabajo(f: Record<string, unknown> | null | undefined): EstadoTrabajo | null {
  if (!f || typeof f.id !== "string") return null;
  const estado = ["en_cola", "publicando", "publicado", "fallido"].includes(String(f.estado)) ? (f.estado as EstadoTrabajo["estado"]) : "en_cola";
  const pedido = f.pedido && typeof f.pedido === "object" ? (f.pedido as { facebook?: unknown }) : {};
  return {
    id: f.id,
    red: f.red === "facebook" ? "facebook" : "instagram",
    formato: f.formato === "9x16" ? "9x16" : "4x5",
    estado,
    conFacebook: f.red !== "facebook" && pedido.facebook === true,
    resultado: f.resultado && typeof f.resultado === "object" ? (f.resultado as ResultadoTrabajo) : null,
    error: typeof f.error === "string" ? (f.error as ClaveFallo) : null,
    reintentando: reintenta(estado, f),
  };
}

/** OL-488: ¿la cola va en otro intento? (en camino, con un fallo pasajero anotado o más de un intento). Sin esas columnas, no. */
export function reintenta(estado: string, f: { intentos?: unknown; fallos?: unknown }): boolean {
  return (estado === "en_cola" || estado === "publicando") && (Number(f.fallos) >= 1 || Number(f.intentos) >= 2);
}

/** OL-488: lo que dice el cargador mientras va: «Publicando…» o «Reintentando…» (con la red delante si se pide). */
export function textoEnCamino(e: Pick<EstadoTrabajo, "red" | "reintentando">, conRed = false): string {
  const que = e.reintentando ? "reintentando…" : "publicando…";
  return conRed ? `${e.red === "facebook" ? "Facebook" : "Instagram"}: ${que}` : `${que[0].toUpperCase()}${que.slice(1)}`;
}

/** La frase larga de un trabajo que no se pudo publicar (la hoja). */
export function mensajeDeFallo(e: EstadoTrabajo): string {
  const fb = e.resultado?.facebook;
  return e.resultado?.mensaje ?? (fb && !fb.ok ? fb.mensaje : `No se pudo publicar: ${motivoLlano(e.red, e.error ?? "otro")}.`);
}

/** La línea del renglón de la lista mientras va o si no se pudo: «Publicando…», «No se publicó: Instagram no aceptó la imagen». */
export function lineaDeTrabajo(e: EstadoTrabajo): string | null {
  if (enCamino(e)) return e.red === "facebook" ? textoEnCamino(e, true) : textoEnCamino(e);
  if (e.estado === "fallido") return e.red === "facebook" ? `Facebook: no se publicó (${motivoLlano("facebook", e.error ?? "otro")})` : `No se publicó: ${motivoLlano("instagram", e.error ?? "otro")}`;
  return null;
}
