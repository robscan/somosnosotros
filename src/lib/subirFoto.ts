import { LADOS, prepararImagen, TAMANO_MAX_FOTO, type Uso } from "./imagen";
import { clienteNavegador } from "./supabase/navegador";

export { TAMANO_MAX_FOTO };

export type Carpeta = "perfiles" | "lugares" | "artistas";

/**
 * Por qué no se pudo: quien llama puede escribir su propio aviso sin repetir el nuestro (bitácora 095). `pesa`: no se pudo preparar y la
 * original pasa del tope; `lectura`: el teléfono no pudo leerla (no es una imagen o es un formato que no sabe abrir); `subida`: la red o Storage.
 */
export type FalloAlSubir = "pesa" | "lectura" | "subida";

/**
 * Sube una foto al bucket público `fotos`, en la carpeta del usuario (`<carpeta>/<usuarioId>/<prefijo>-<uuid>.<ext>`). Una sola vez para
 * perfil, lugar, artista, cartel de evento y foto propia del creador (antes, cuatro copias). Antes de comprobar el peso la prepara en el
 * teléfono (`prepararImagen`, OL-352): reducida al lado de su `uso` y en JPEG que cabe en el tope. «Pesa más de 5 MB» solo sale si no se
 * pudo preparar y la original no cabe. Devuelve la URL pública o un mensaje de error para mostrar tal cual.
 */
export async function subirFoto(carpeta: Carpeta, usuarioId: string, prefijo: string, archivo: File, que = "foto", uso: Uso = "portada"): Promise<{ url: string } | { error: string; motivo: FalloAlSubir }> {
  const supabase = clienteNavegador();
  if (!supabase) return { error: `No se pudo subir la ${que}. Intenta de nuevo.`, motivo: "subida" };
  const preparada = await prepararImagen(archivo, { ladoMaximo: LADOS[uso], tope: TAMANO_MAX_FOTO });
  if ("fallo" in preparada) {
    if (archivo.size > TAMANO_MAX_FOTO) return { error: `La ${que} pesa más de 5 MB. Elige otra.`, motivo: "pesa" };
    return { error: "No se pudo leer la imagen. Prueba con otra.", motivo: "lectura" };
  }
  const listo = preparada.archivo;
  // Lo preparado siempre cabe; si un navegador devolviera la original grande, el bucket la rechazaría con un aviso menos claro.
  if (listo.size > TAMANO_MAX_FOTO) return { error: `La ${que} pesa más de 5 MB. Elige otra.`, motivo: "pesa" };
  const extension = (listo.name.split(".").pop() || "jpg").toLowerCase();
  const ruta = `${carpeta}/${usuarioId}/${prefijo}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("fotos").upload(ruta, listo, { upsert: false, contentType: listo.type || undefined });
  if (error) return { error: `No se pudo subir la ${que}. Intenta con otra.`, motivo: "subida" };
  return { url: supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl };
}
