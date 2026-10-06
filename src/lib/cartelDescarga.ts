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

/** El nombre del archivo que se descarga: `cartel-<slug>.jpg`; el slug ya es de letras y guiones, y aun así se limpia. */
export function nombreDeCartel(slug: string | null | undefined, extension: string): string {
  const base = (slug ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `cartel${base ? `-${base}` : ""}.${extension}`;
}
