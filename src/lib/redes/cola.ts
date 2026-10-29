import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OCUPADO_MS, type ClaveFallo, type Red, type ResultadoTrabajo } from "./reglas";

/**
 * La cola de redes en la base (OL-465, bitácora 497; tabla `redes_trabajos`, migración 20261028140000). El trabajador la usa con la llave de
 * servicio. Cómo se asegura de que dos llamadas a la vez no trabajen el mismo (el truco del motor de rutinas, OL-428, sin bloqueos):
 *   · se reclama con `update … set estado = 'publicando', turno = turno + 1 where id = … and turno = <el que se leyó> and estado = <el que se
 *     leyó> returning`: de dos llamadas, solo una recibe la fila (la otra ya no encuentra ese turno);
 *   · `ocupada_hasta` (320 s, más que lo que vive la función): si la función se cae a medias, el trabajo queda libre y el latido lo retoma;
 *   · guardar el avance y terminar, igual: solo si sigue «publicando» y con su turno.
 */

export type PedidoTrabajo = {
  recorte?: boolean;
  diseno?: number;
  texto?: string | null;
  quitadas?: string[];
  facebook?: boolean;
  imagenes?: string[];
  /** OL-479: el día de la semana de Instagram que lo programó (`instagram_semana.id`), qué es y, en «Esta semana», sus eventos. */
  casilla?: string;
  tipo?: "artista" | "evento" | "lugar" | "semana";
  eventos?: string[];
};

export type AvanceTrabajo = {
  /** Las imágenes ya subidas (direcciones públicas, en orden) y, en un carrusel, sus claves. */
  imagenes?: string[];
  claves?: string[];
  /** Lo ya publicado en Instagram (la fila anotada en `instagram_publicaciones`). */
  instagram?: { fila: string | null; mediaId: string; permalink: string | null; sinEtiquetas: boolean; formato: "4x5" | "9x16" | "carrusel"; texto: string | null; etiquetas: string[]; sinCoautor?: boolean };
  /** OL-479: la historia de una ficha de la semana (después de su publicación; si no se pudo, `ok: false`). */
  historia?: { ok: boolean; permalink: string | null };
};

export type Trabajo = {
  id: string;
  /** De un evento, de un artista o de un lugar (exactamente uno; OL-479). */
  evento_id: string | null;
  artista_id: string | null;
  lugar_id: string | null;
  red: Red;
  formato: "4x5" | "9x16";
  pedido: PedidoTrabajo;
  estado: "en_cola" | "publicando" | "publicado" | "fallido";
  avance: AvanceTrabajo;
  resultado: ResultadoTrabajo | null;
  intentos: number;
  fallos: number;
  error: ClaveFallo | null;
  turno: number;
  pedido_por: string | null;
  /** Cuándo se guardó (OL-479: un día de la semana que ya salió por otro lado desde entonces no se repite). */
  creado_en?: string;
};

export const COLUMNAS = "id, evento_id, artista_id, lugar_id, red, formato, pedido, estado, avance, resultado, intentos, fallos, error, turno, ocupada_hasta, siguiente_en, pedido_por, creado_en";

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const numero = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

export function leerTrabajo(f: Record<string, unknown>): Trabajo {
  return {
    id: String(f.id),
    evento_id: typeof f.evento_id === "string" ? f.evento_id : null,
    artista_id: typeof f.artista_id === "string" ? f.artista_id : null,
    lugar_id: typeof f.lugar_id === "string" ? f.lugar_id : null,
    red: f.red === "facebook" ? "facebook" : "instagram",
    formato: f.formato === "9x16" ? "9x16" : "4x5",
    pedido: objeto(f.pedido) as PedidoTrabajo,
    estado: (["en_cola", "publicando", "publicado", "fallido"].includes(String(f.estado)) ? f.estado : "en_cola") as Trabajo["estado"],
    avance: objeto(f.avance) as AvanceTrabajo,
    resultado: f.resultado && typeof f.resultado === "object" ? (f.resultado as ResultadoTrabajo) : null,
    intentos: numero(f.intentos),
    fallos: numero(f.fallos),
    error: typeof f.error === "string" ? (f.error as ClaveFallo) : null,
    turno: numero(f.turno),
    pedido_por: typeof f.pedido_por === "string" ? f.pedido_por : null,
    ...(typeof f.creado_en === "string" ? { creado_en: f.creado_en } : {}),
  };
}

/**
 * El trabajo que toca, ya marcado como suyo, o null si no hay nada. Primero el más viejo en cola al que ya le toca (`siguiente_en`, la espera
 * entre reintentos); si no, uno «publicando» que nadie trabaja (`ocupada_hasta` vencido: la función que lo tenía se cayó), que cuenta como un
 * fallo (por si lo que lo tumba es él mismo).
 */
export async function reclamarTrabajo(db: SupabaseClient, ahora: Date): Promise<Trabajo | null> {
  const iso = ahora.toISOString();
  const ocupada_hasta = new Date(ahora.getTime() + OCUPADO_MS).toISOString();
  const listos = await db.from("redes_trabajos").select(COLUMNAS).eq("estado", "en_cola").lte("siguiente_en", iso).order("creado_en", { ascending: true }).limit(5);
  if (listos.error) throw new Error("No se pudo leer la cola");
  for (const f of (listos.data ?? []) as Record<string, unknown>[]) {
    const t = leerTrabajo(f);
    const r = await db
      .from("redes_trabajos")
      .update({ estado: "publicando", turno: t.turno + 1, ocupada_hasta, intentos: t.intentos + 1, actualizado_en: iso })
      .eq("id", t.id)
      .eq("estado", "en_cola")
      .eq("turno", t.turno)
      .select(COLUMNAS);
    if (r.error) throw new Error("No se pudo tomar el trabajo");
    if (r.data?.length) return leerTrabajo(r.data[0] as Record<string, unknown>);
  }
  const caidos = await db.from("redes_trabajos").select(COLUMNAS).eq("estado", "publicando").lte("ocupada_hasta", iso).order("creado_en", { ascending: true }).limit(5);
  if (caidos.error) throw new Error("No se pudo leer la cola");
  for (const f of (caidos.data ?? []) as Record<string, unknown>[]) {
    const t = leerTrabajo(f);
    const r = await db
      .from("redes_trabajos")
      .update({ turno: t.turno + 1, ocupada_hasta, intentos: t.intentos + 1, fallos: t.fallos + 1, actualizado_en: iso })
      .eq("id", t.id)
      .eq("estado", "publicando")
      .eq("turno", t.turno)
      .select(COLUMNAS);
    if (r.error) throw new Error("No se pudo tomar el trabajo");
    if (r.data?.length) return leerTrabajo(r.data[0] as Record<string, unknown>);
  }
  return null;
}

/** Escribe en el trabajo solo si sigue siendo suyo (publicando y con su turno). Devuelve si se escribió. */
async function escribir(db: SupabaseClient, t: Trabajo, campos: Record<string, unknown>): Promise<boolean> {
  const r = await db.from("redes_trabajos").update(campos).eq("id", t.id).eq("estado", "publicando").eq("turno", t.turno).select("id");
  return !r.error && !!r.data?.length;
}

/** Guarda lo ya hecho (imágenes subidas, la publicación de Instagram) y alarga el plazo: si se cae, se retoma desde ahí. */
export async function guardarAvance(db: SupabaseClient, t: Trabajo, avance: AvanceTrabajo, ahora: Date): Promise<boolean> {
  t.avance = avance;
  return escribir(db, t, { avance, ocupada_hasta: new Date(ahora.getTime() + OCUPADO_MS).toISOString(), actualizado_en: ahora.toISOString() });
}

/** Lo deja para después: otro paso (no cupo en esta llamada) o un reintento tras un error pasajero. */
export async function devolverACola(db: SupabaseClient, t: Trabajo, o: { ahora: Date; esperaMs: number; error?: ClaveFallo; fallo?: boolean }): Promise<boolean> {
  return escribir(db, t, {
    estado: "en_cola",
    ocupada_hasta: null,
    siguiente_en: new Date(o.ahora.getTime() + o.esperaMs).toISOString(),
    ...(o.fallo ? { fallos: t.fallos + 1 } : {}),
    ...(o.error ? { error: o.error } : {}),
    actualizado_en: o.ahora.toISOString(),
  });
}

/** Lo termina: publicado o fallido, con lo que pasó. */
export async function terminar(db: SupabaseClient, t: Trabajo, o: { ahora: Date; estado: "publicado" | "fallido"; resultado: ResultadoTrabajo; error?: ClaveFallo | null }): Promise<boolean> {
  return escribir(db, t, {
    estado: o.estado,
    resultado: o.resultado,
    error: o.estado === "fallido" ? (o.error ?? "otro") : null,
    ocupada_hasta: null,
    terminado_en: o.ahora.toISOString(),
    actualizado_en: o.ahora.toISOString(),
  });
}

/**
 * OL-479: el día de la semana de Instagram que programó este trabajo queda publicado o «no se pudo» (solo si sigue siendo su trabajo y no se
 * quitó mientras tanto).
 */
export async function cerrarCasilla(db: SupabaseClient, t: Trabajo, estado: "publicado" | "fallido", ahora: Date): Promise<void> {
  if (!t.pedido.casilla) return;
  await db.from("instagram_semana").update({ estado, actualizado_en: ahora.toISOString() }).eq("id", t.pedido.casilla).eq("trabajo_id", t.id).eq("estado", "programado");
}

/** Marca que ya se avisó (una vez: si el aviso se repite en otra llamada, no sale dos veces). */
export async function marcarAvisado(db: SupabaseClient, id: string, ahora: Date): Promise<boolean> {
  const r = await db.from("redes_trabajos").update({ avisado_en: ahora.toISOString() }).eq("id", id).is("avisado_en", null).select("id");
  return !r.error && !!r.data?.length;
}
