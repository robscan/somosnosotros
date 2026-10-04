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
const RUTA_FOTOS = "/storage/v1/object/public/fotos/";

// La misma gramática que imagen_origen_permitido en PostgreSQL (OL-262).
// URLs HTTPS con host DNS, puerto válido y caracteres ASCII visibles; nombres Unicode se codifican.
function partesHttps(valor: string) {
  if (/[^\x21-\x7e]|\\/.test(valor)) return null;
  const partes = /^https:\/\/([^/?#]+)([^?#]*)(?:[?#].*)?$/.exec(valor);
  if (!partes) return null;
  const autoridad = /^([^:]+)(?::([0-9]{1,5}))?$/.exec(partes[1]);
  if (!autoridad || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(autoridad[1])) return null;
  const puerto = autoridad[2] ? Number(autoridad[2]) : 443;
  if (puerto < 1 || puerto > 65535) return null;
  return { host: autoridad[1].toLowerCase(), puerto, ruta: partes[2] };
}

export type OpcionesImagen = {
  /** El rol real de la sesión, comprobado en el servidor — nunca un campo del formulario (S-01). */
  esAdmin: boolean;
  /** Solo para una foto de perfil: admite el host exacto de avatares de Google. */
  perfil?: boolean;
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
 * - Una URL del Storage propio con objeto y sin escapes de ruta: sí, para cualquiera.
 * - Perfil: también el host exacto lh3.googleusercontent.com, HTTPS por el puerto normal.
 * - Otro host DNS por HTTPS, sin credenciales ni caracteres ambiguos: solo administración.
 * - Cualquier otra cosa (`http://`, con espacios, texto suelto…): no.
 */
export function imagenPermitida(url: string | null | undefined, opciones: OpcionesImagen): boolean {
  if (!url) return true;
  if (opciones.actual && url === opciones.actual) return true;
  const partes = partesHttps(url);
  if (!partes) return false;
  if (opciones.esAdmin) return true;
  if (partes.puerto !== 443) return false;
  if (/(^|\/)(?:\.|%2e){1,2}(\/|$)|%(?:2f|5c|25)/i.test(partes.ruta)) return false;
  const propia = partesHttps(configPublica().supabaseUrl ?? "");
  if (propia && propia.puerto === 443 && partes.host === propia.host &&
      partes.ruta.startsWith(RUTA_FOTOS) && partes.ruta.length > RUTA_FOTOS.length) return true;
  return !!opciones.perfil && partes.host === "lh3.googleusercontent.com" && partes.ruta.length > 1;
}
