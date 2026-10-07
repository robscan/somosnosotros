import { RUTA_FOTOS } from "./imagenOptima";

/**
 * ¿Es esta imagen un cartel que se puede entregar como descarga? Solo las del Storage propio (`fotos`): la ruta `/api/cartel/[id]` la
 * pide desde el servidor, y pedir la dirección que sea sería abrirle a cualquiera una puerta hacia otros servidores. Una imagen de otro
 * dominio (las que importó el CAPO) se queda sin el botón de descargar. Sin querys, sin escapes de ruta y sin caracteres raros, como
 * `optimizable`.
 */
export function cartelDescargable(imagen: string | null | undefined, supabaseUrl: string | null | undefined): imagen is string {
  if (!imagen || !supabaseUrl) return false;
  const prefijo = `${supabaseUrl.replace(/\/$/, "")}${RUTA_FOTOS}`;
  if (!imagen.startsWith(prefijo) || /[^\x21-\x7e]|[\\?#]/.test(imagen)) return false;
  const objeto = imagen.slice(prefijo.length);
  return !!objeto && !/(^|\/)(?:\.|%2e){1,2}(\/|$)|%(?:2f|5c|25)/i.test(objeto);
}

const EXTENSIONES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

/** La extensión del archivo según el tipo con el que Storage guardó la imagen; null si no es una imagen que se entregue. */
export function extensionDeImagen(tipo: string | null | undefined): string | null {
  return EXTENSIONES[(tipo ?? "").split(";")[0].trim().toLowerCase()] ?? null;
}

/** Un resumen corto y estable de un texto (FNV-1a de 32 bits, en hexadecimal): para versionar una dirección sin alargarla. */
function resumen(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

/**
 * La dirección de la descarga del cartel subido (OL-338): `/api/cartel/<id>` con la versión de su imagen (`?v=`). La ruta deja guardar su
 * respuesta (cinco minutos en el teléfono, una hora en el CDN) y la dirección era la misma después de cambiar el cartel, así que se bajaba el
 * anterior. Cada cartel nuevo tiene su propio nombre en Storage (`subirFoto`, «Usar como cartel»): con el resumen de su dirección, cambiar el
 * cartel cambia la de la descarga. La ruta no lee `v`; sin imagen, la dirección de siempre.
 */
export function hrefCartelSubido(id: string, imagen?: string | null): string {
  const ruta = `/api/cartel/${encodeURIComponent(id)}`;
  return imagen ? `${ruta}?v=${resumen(imagen)}` : ruta;
}

/** El nombre del archivo que se descarga: `cartel-<slug>.jpg`; el slug ya es de letras y guiones, y aun así se limpia. */
export function nombreDeCartel(slug: string | null | undefined, extension: string): string {
  const base = (slug ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `cartel${base ? `-${base}` : ""}.${extension}`;
}
