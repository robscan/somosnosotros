import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { ENTRADA_SEGURA } from "../carteles/imagenSegura";
import { LADOS, TAMANO_MAX_FOTO } from "../imagen";

/**
 * Las imágenes de «Completar fichas» (OL-489). La foto de un artista va cuadrada y la portada de un artista o de un lugar en 3:2 (regla del
 * founder, 2026-10-04: «portadas 3:2 de su obra»), recortadas al centro con sharp, derechas, en JPEG que cabe en el tope del bucket, al lado de
 * siempre (`LADOS.portada`, 1600). La miniatura (360 de ancho) es la que se le enseña al modelo para juzgar y la que ve la bandeja.
 *
 * Por qué se guardan al proponer y no al aceptar: las direcciones del CDN de Instagram caducan en horas (memoria del gestor, §3 de la
 * investigación) y la administración acepta días después. Se suben a una carpeta de espera del bucket `fotos`
 * (`<artistas|lugares>/rutina-fichas/<corrida>/…`); aceptar las pasa a la carpeta de quien acepta, como las fichas que ya existen
 * (`<artistas|lugares>/<admin>/<foto|portada>-<uuid>.jpg`), y borra las de espera.
 */

export type Forma = "cuadrada" | "3:2";
export const LADO_FICHA = LADOS.portada;
export const ANCHO_MINIATURA = 360;

const medidas = (forma: Forma, ancho: number) => (forma === "cuadrada" ? { width: ancho, height: ancho } : { width: ancho, height: Math.round((ancho * 2) / 3) });

/** Recortada al centro a su forma, de 1600 de ancho como mucho (sin agrandar una chica de más), en JPEG que cabe en el tope. Null si no se pudo. */
export async function prepararImagenFicha(bytes: Buffer, forma: Forma): Promise<Buffer | null> {
  try {
    const meta = await sharp(bytes, ENTRADA_SEGURA).metadata();
    if (!meta.width || !meta.height) return null;
    // El ancho de la forma que cabe en la imagen: no se agranda (una foto de perfil de 320 se queda en 320).
    const cabe = forma === "cuadrada" ? Math.min(meta.width, meta.height) : Math.min(meta.width, Math.round((meta.height * 3) / 2));
    const ancho = Math.max(1, Math.min(LADO_FICHA, cabe));
    for (const calidad of [85, 72, 60]) {
      const listo = await sharp(bytes, ENTRADA_SEGURA)
        .rotate()
        .resize({ ...medidas(forma, ancho), fit: "cover", position: "attention" })
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

/** La miniatura de una imagen ya preparada (o de la original): 360 de ancho, en su forma. */
export async function miniatura(bytes: Buffer, forma: Forma): Promise<Buffer | null> {
  try {
    return await sharp(bytes, ENTRADA_SEGURA).rotate().resize({ ...medidas(forma, ANCHO_MINIATURA), fit: "cover", position: "attention" }).flatten({ background: "#ffffff" }).jpeg({ quality: 70 }).toBuffer();
  } catch {
    return null;
  }
}

/** ¿Es grande para ser portada? (Una imagen de menos de 600 de ancho se ve borrosa en la cabecera de la ficha.) */
export async function anchoDe(bytes: Buffer): Promise<number> {
  try {
    return (await sharp(bytes, ENTRADA_SEGURA).metadata()).width ?? 0;
  } catch {
    return 0;
  }
}

/** Dónde se guardan: el bucket `fotos` con la llave de servicio; en las pruebas, uno en memoria. `ruta` es la ruta dentro del bucket. */
export type AlmacenFichas = {
  subir: (ruta: string, bytes: Buffer, tipo: string) => Promise<string | null>;
  leer: (ruta: string) => Promise<Buffer | null>;
  borrar: (rutas: string[]) => Promise<void>;
  /** La ruta dentro del bucket de una dirección pública suya, o null si no es del bucket. */
  rutaDe: (url: string) => string | null;
};

export function almacenFichasDeSupabase(db: SupabaseClient): AlmacenFichas {
  const fotos = () => db.storage.from("fotos");
  return {
    subir: async (ruta, bytes, tipo) => {
      const r = await fotos().upload(ruta, bytes, { contentType: tipo, upsert: false });
      return r.error ? null : fotos().getPublicUrl(ruta).data.publicUrl;
    },
    leer: async (ruta) => {
      const r = await fotos().download(ruta);
      return r.error || !r.data ? null : Buffer.from(await r.data.arrayBuffer());
    },
    borrar: async (rutas) => {
      if (rutas.length) await fotos().remove(rutas);
    },
    rutaDe: (url) => rutaEnBucket(url, fotos().getPublicUrl("x").data.publicUrl.replace(/x$/, "")),
  };
}

/** `https://…/storage/v1/object/public/fotos/artistas/…` → `artistas/…`, si empieza por la base pública del bucket y no sale de él. */
export function rutaEnBucket(url: string, base: string): string | null {
  if (!base || !url.startsWith(base)) return null;
  const ruta = decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]);
  return /^(artistas|lugares)\/[A-Za-z0-9._/-]{1,300}$/.test(ruta) && !ruta.includes("..") ? ruta : null;
}

/** La carpeta de espera de una corrida: `artistas/rutina-fichas/<corrida>/`. */
export const carpetaDeEspera = (carpeta: "artistas" | "lugares", corrida: string) => `${carpeta}/rutina-fichas/${corrida}/`;
