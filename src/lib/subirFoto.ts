import { reducirImagen } from "./imagen";
import { clienteNavegador } from "./supabase/navegador";

/** Tope de una foto antes de reducirla en el teléfono (el bucket también lo exige). */
export const TAMANO_MAX_FOTO = 5 * 1024 * 1024;

export type Carpeta = "perfiles" | "lugares" | "artistas";

/**
 * Sube una foto al bucket público `fotos`, en la carpeta del usuario (`<carpeta>/<usuarioId>/<prefijo>-<fecha>.<ext>`),
 * reducida antes en el teléfono. Una sola vez para perfil, lugar, artista y cartel de evento (antes, cuatro copias).
 * Devuelve la URL pública o un mensaje de error para mostrar tal cual.
 */
export async function subirFoto(carpeta: Carpeta, usuarioId: string, prefijo: string, archivo: File, que = "foto"): Promise<{ url: string } | { error: string }> {
  const supabase = clienteNavegador();
  if (!supabase) return { error: `No se pudo subir la ${que}. Intenta de nuevo.` };
  if (archivo.size > TAMANO_MAX_FOTO) return { error: `La ${que} pesa más de 5 MB. Elige otra.` };
  const listo = await reducirImagen(archivo); // menos peso y menos espera
  const extension = (listo.name.split(".").pop() || "jpg").toLowerCase();
  const ruta = `${carpeta}/${usuarioId}/${prefijo}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("fotos").upload(ruta, listo, { upsert: true, contentType: listo.type || undefined });
  if (error) return { error: `No se pudo subir la ${que}. Intenta con otra.` };
  return { url: supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl };
}
