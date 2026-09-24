import { configPublica } from "./config";

/**
 * Foto/portada/imagen de una ficha (S-01, docs/rediseno/46): antes el servidor solo exigía "https, sin
 * espacios" en `validarArtista`/`validarLugar`/`validarEvento`, así que cualquier cuenta que gestiona una
 * ficha (no solo administración) podía mandar la URL de una imagen de cualquier dominio ajeno con una sola
 * petición directa — la pantalla escondía el campo de "pegar una URL" a quien no es admin, pero eso era solo
 * la pantalla.
 *
 * Único bucket público al que suben las personas (`lib/subirFoto.ts`, migraciones de Storage): `fotos`. El
 * otro bucket (`obras`, Pincel) es privado y solo lo toca administración, así que una URL suya nunca llega
 * aquí por esta vía.
 */
const BUCKETS_PROPIOS_PUBLICOS = ["fotos"];

/** El prefijo público del Storage propio para cada bucket, o `[]` si falta la variable de entorno. */
function prefijosPropios(): string[] {
  const { supabaseUrl } = configPublica();
  if (!supabaseUrl) return [];
  return BUCKETS_PROPIOS_PUBLICOS.map((bucket) => `${supabaseUrl}/storage/v1/object/public/${bucket}/`);
}

export type OpcionesImagen = {
  /** El rol real de la sesión, comprobado en el servidor — nunca un campo del formulario (S-01). */
  esAdmin: boolean;
  /**
   * Lo que ya estaba guardado en la fila antes de este guardado (foto/portada/imagen actual), si se conoce.
   * Una edición que reenvía la misma URL sin tocarla se deja pasar aunque no sea del Storage propio ni la
   * mande un admin: así no se rompen las fichas que el CAPO importó con foto de otro dominio (`origen =
   * "capo"`) cuando alguien más las edita sin cambiar la foto.
   */
  actual?: string | null;
};

/**
 * ¿Se puede guardar esta URL como foto/portada/imagen de una ficha?
 * - Vacía: sí (la ficha se queda sin imagen).
 * - Igual a la que ya estaba guardada: sí, sin más comprobación (ver `actual` arriba).
 * - Una URL del Storage propio (el prefijo público exacto de un bucket propio): sí, para cualquiera.
 * - Cualquier otra `https://` sin espacios: solo si `esAdmin` es true.
 * - Cualquier otra cosa (`http://`, con espacios, texto suelto…): no.
 */
export function imagenPermitida(url: string | null | undefined, opciones: OpcionesImagen): boolean {
  if (!url) return true;
  if (opciones.actual && url === opciones.actual) return true;
  if (!/^https:\/\/[^\s]+$/.test(url)) return false;
  if (prefijosPropios().some((prefijo) => url.startsWith(prefijo))) return true;
  return opciones.esAdmin;
}
