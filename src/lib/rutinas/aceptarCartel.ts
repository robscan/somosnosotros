import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { huellaDeCartel } from "../carteles/huellaServidor";
import { coloresDeImagenEnMemoria } from "../coloresCartelServidor";
import { LADOS, TAMANO_MAX_FOTO } from "../imagen";
import { bajarImagen, direccionPublica } from "./imagenWeb";

/**
 * Aceptar un cartel que propuso «Buscar carteles» (OL-444): se baja otra vez la imagen (la página pudo cambiar desde que se propuso), se
 * prepara como se prepara en el teléfono un cartel que sube una persona (`subirFoto` con uso «cartel», OL-352: lado de 2000 y JPEG que cabe
 * en el tope del bucket), se sube a la misma carpeta que esos carteles (`lugares/<quien acepta>/evento-<uuid>.jpg` en el bucket `fotos`) y
 * se pone en `eventos.imagen` con sus colores (OL-360), solo si el evento sigue sin cartel. Cambiar la imagen no avisa a nadie (los avisos
 * de cambio son de cuándo y dónde). Si no se puede, no se acepta y la tarjeta dice por qué en una frase.
 * OL-464 (bitácora 496): también su huella (`eventos.cartel_huella`): cada acto de un festival guarda su propia copia del cartel del día y el
 * carrusel de Instagram las reconoce como el mismo cartel sin bajarlas.
 */

/** Dónde se guarda la imagen: en producción, el bucket `fotos` con la llave de servicio (`almacenDeSupabase`); en las pruebas, uno falso. */
export type Almacen = {
  subir: (ruta: string, bytes: Buffer, tipo: string) => Promise<string | null>;
  borrar?: (ruta: string) => Promise<void>;
};

export function almacenDeSupabase(db: SupabaseClient): Almacen {
  return {
    subir: async (ruta, bytes, tipo) => {
      const r = await db.storage.from("fotos").upload(ruta, bytes, { contentType: tipo, upsert: false });
      return r.error ? null : db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    },
    borrar: async (ruta) => {
      await db.storage.from("fotos").remove([ruta]);
    },
  };
}

export type DepCartel = { db: SupabaseClient; almacen: Almacen; pedir?: typeof fetch; ahora: () => Date };
export type CartelPuesto = { ok: true; evento: { id: string; slug: string | null; lugar_id: string | null }; url: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La imagen como la deja el teléfono para un cartel: derecha, de 2000 de lado como mucho, en JPEG que cabe en el tope. */
export async function prepararCartel(bytes: Buffer): Promise<Buffer | null> {
  try {
    for (const calidad of [85, 72, 60]) {
      const listo = await sharp(bytes, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: LADOS.cartel, height: LADOS.cartel, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: calidad, mozjpeg: true })
        .toBuffer();
      if (listo.length <= TAMANO_MAX_FOTO) return listo;
    }
    return null;
  } catch {
    return null;
  }
}

export async function ponerCartel(dep: DepCartel, datos: Record<string, unknown>, yo: string): Promise<CartelPuesto> {
  const eventoId = typeof datos.evento_id === "string" && UUID.test(datos.evento_id) ? datos.evento_id : null;
  const imagen = typeof datos.imagen === "string" ? direccionPublica(datos.imagen)?.href : undefined;
  if (!eventoId || !imagen) return { ok: false, error: "A esta propuesta le falta el evento o la imagen. Recházala." };
  if (!UUID.test(yo)) return { ok: false, error: "No se pudo aceptar. Recarga la página." };
  const leido = await dep.db.from("eventos").select("id, slug, imagen, lugar_id, termina").eq("id", eventoId).maybeSingle();
  if (leido.error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const e = leido.data as { id: string; slug?: string | null; imagen?: string | null; lugar_id?: string | null; termina?: string | null } | null;
  if (!e) return { ok: false, error: "Ese evento ya no está. Recházala." };
  if (e.imagen) return { ok: false, error: "Ese evento ya tiene cartel: recházala como duplicado." };
  if (e.termina && Date.parse(e.termina) < dep.ahora().getTime()) return { ok: false, error: "Ese evento ya pasó. Recházala." };
  const bytes = await bajarImagen(imagen, dep.pedir ?? fetch);
  if (!bytes) return { ok: false, error: "La imagen ya no se pudo bajar de esa página. Recházala." };
  const listo = await prepararCartel(bytes);
  if (!listo) return { ok: false, error: "Esa imagen no se pudo preparar como cartel. Recházala." };
  const ruta = `lugares/${yo}/evento-${crypto.randomUUID()}.jpg`;
  const url = await dep.almacen.subir(ruta, listo, "image/jpeg");
  if (!url) return { ok: false, error: "No se pudo guardar el cartel. Intenta de nuevo." };
  const [colores, huella] = await Promise.all([coloresDeImagenEnMemoria(listo), huellaDeCartel(listo)]);
  const r = await dep.db
    .from("eventos")
    .update({ imagen: url, ...(colores ? { colores_cartel: colores } : {}), ...(huella ? { cartel_huella: huella } : {}) })
    .eq("id", e.id)
    .is("imagen", null)
    .select("id, slug, lugar_id");
  if (r.error || !r.data?.length) {
    // Otra pestaña (o la persona del evento) le puso cartel a la vez: este archivo sobra.
    await dep.almacen.borrar?.(ruta).catch(() => undefined);
    return { ok: false, error: r.error ? "No se pudo poner el cartel. Intenta de nuevo." : "Ese evento ya tiene cartel: recházala como duplicado." };
  }
  const f = r.data[0] as { id: string; slug?: string | null; lugar_id?: string | null };
  return { ok: true, evento: { id: f.id, slug: f.slug ?? null, lugar_id: f.lugar_id ?? null }, url };
}
