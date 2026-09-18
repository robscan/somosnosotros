import { reducirImagen } from "./imagen";
import { clienteNavegador } from "./supabase/navegador";

/** Tope de una foto antes de reducirla en el teléfono (el bucket también lo exige). */
export const TAMANO_MAX_FOTO = 5 * 1024 * 1024;

export type Carpeta = "perfiles" | "lugares" | "artistas";

/**
 * Sube una foto al bucket público `fotos`, en la carpeta del usuario (`<carpeta>/<usuarioId>/<prefijo>-<uuid>.<ext>`),
 * reducida antes en el teléfono. Una sola vez para perfil, lugar, artista y cartel de evento (antes, cuatro copias).
 * Devuelve la URL pública o un mensaje de error para mostrar tal cual.
 */
/** Por qué no se pudo: quien llama puede escribir su propio aviso sin repetir el nuestro (bitácora 095). */
export type FalloAlSubir = "pesa" | "subida";

export async function subirFoto(carpeta: Carpeta, usuarioId: string, prefijo: string, archivo: File, que = "foto"): Promise<{ url: string } | { error: string; motivo: FalloAlSubir }> {
  const supabase = clienteNavegador();
  if (!supabase) return { error: `No se pudo subir la ${que}. Intenta de nuevo.`, motivo: "subida" };
  if (archivo.size > TAMANO_MAX_FOTO) return { error: `La ${que} pesa más de 5 MB. Elige otra.`, motivo: "pesa" };
  const listo = await reducirImagen(archivo); // menos peso y menos espera
  const extension = (listo.name.split(".").pop() || "jpg").toLowerCase();
  const ruta = `${carpeta}/${usuarioId}/${prefijo}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("fotos").upload(ruta, listo, { upsert: false, contentType: listo.type || undefined });
  if (error) return { error: `No se pudo subir la ${que}. Intenta con otra.`, motivo: "subida" };
  return { url: supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl };
}
