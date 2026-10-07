/**
 * La foto propia del creador de cartel (OL-337, founder 2026-10-07: «Permite que el usuario pueda subir una imagen (foto para que se ponga en
 * cartel)»). Se sube como el cartel del alta (`subirFoto`: bucket `fotos`, carpeta `lugares/<quien la sube>/`, reducida en el teléfono) y viaja
 * en la URL de cada imagen del cartel (`?foto=`). Aquí solo se decide si una dirección es una foto propia válida: del Storage propio, en la
 * carpeta de quien mira, un nombre de archivo simple (sin subcarpetas, escapes ni consultas) y que no sea un cartel hecho aquí. Lo usan la
 * pantalla (para no reponer de la memoria la foto de otra cuenta) y el servidor (que además la baja con `traerImagen`, que mira los bytes).
 * Puro y sin dependencias de servidor: lo importa también el teléfono.
 */

/** Las imágenes que sube «Usar como cartel» llevan esta marca en el nombre: una imagen así ya es un cartel hecho aquí y no vuelve a usarse como foto. */
export const MARCA_GENERADO = "cartel-generado-";

/** Cómo empieza el nombre de una foto propia subida desde el creador (`cartel-foto-<uuid>.jpg`), para reconocerla en el bucket. */
export const PREFIJO_FOTO_PROPIA = "cartel-foto";

/** Tope de la dirección en la URL: la del Storage con un uuid mide ~150; más larga, no es nuestra. */
export const TOPE_URL_FOTO = 400;

const RUTA_FOTOS = "/storage/v1/object/public/fotos/";

/** La carpeta del bucket donde sube quien mira (con la barra final), o null sin Storage configurado. */
export function carpetaFotoPropia(perfilId: string, supabaseUrl: string | null | undefined): string | null {
  if (!supabaseUrl || !perfilId) return null;
  return `${supabaseUrl.replace(/\/$/, "")}${RUTA_FOTOS}lugares/${perfilId}/`;
}

/** ¿Es `url` una foto propia de esa carpeta? Solo un archivo directo de la carpeta, con letras, números, punto, guion o guion bajo. */
export function esFotoPropia(url: unknown, carpeta: string | null): url is string {
  if (typeof url !== "string" || !carpeta || url.length > TOPE_URL_FOTO || !url.startsWith(carpeta)) return false;
  const archivo = url.slice(carpeta.length);
  return /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(archivo) && !archivo.startsWith(MARCA_GENERADO);
}
