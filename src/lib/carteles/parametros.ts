import { limpiarTexto, MAXIMOS } from "./datos";
import { TOPE_URL_FOTO } from "./fotoPropia";
import { formatoDe, type Formato, type IdFormato } from "./tokens";

/**
 * Los parámetros del cartel en la URL (OL-324): la ruta que dibuja los lee y la pantalla los escribe con `hrefCartel`. Puro: lo que no se
 * entiende cae al valor de siempre en vez de fallar.
 */

/** Los anchos que se dibujan: miniatura, vista previa y el tamaño real. Otro número cae al más cercano (no se dibuja cualquier tamaño). */
export const ANCHOS = [360, 720, 1080] as const;

/**
 * `foto`: la foto propia que puso la persona (OL-337; quien dibuja comprueba que sea suya con `imagenesDelCartel`). `sinFoto`: la opción
 * tipográfica de la tanda, que se dibuja sin foto aunque haya imagen.
 */
export type ParametrosCartel = { plantilla: string | null; formato: Formato; ancho: number; titulo: string | null; descarga: boolean; foto: string | null; sinFoto: boolean };

export function parametrosCartel(q: URLSearchParams): ParametrosCartel {
  const pedido = Number(q.get("ancho"));
  const ancho = Number.isFinite(pedido) && pedido > 0 ? ANCHOS.reduce((a, b) => (Math.abs(b - pedido) < Math.abs(a - pedido) ? b : a)) : 1080;
  const titulo = limpiarTexto(q.get("titulo") ?? "").slice(0, MAXIMOS.titulo) || null;
  const sinFoto = q.get("sinfoto") === "1";
  const foto = sinFoto ? null : q.get("foto")?.slice(0, TOPE_URL_FOTO + 1) || null;
  return { plantilla: q.get("plantilla"), formato: formatoDe(q.get("formato")), ancho, titulo, descarga: q.get("descarga") === "1", foto, sinFoto };
}

/** La dirección de una imagen del cartel. `v` es la versión del evento: si el evento cambia, la caché del teléfono no da una vieja. */
export function hrefCartel(evento: string, p: { plantilla: string; formato: IdFormato; ancho?: number; titulo?: string | null; foto?: string | null; sinFoto?: boolean; descarga?: boolean; v?: string }): string {
  const q = new URLSearchParams({ plantilla: p.plantilla, formato: p.formato });
  if (p.ancho) q.set("ancho", String(p.ancho));
  if (p.titulo) q.set("titulo", p.titulo);
  if (p.sinFoto) q.set("sinfoto", "1");
  else if (p.foto) q.set("foto", p.foto);
  if (p.descarga) q.set("descarga", "1");
  if (p.v) q.set("v", p.v);
  return `/api/cartel-nuevo/${encodeURIComponent(evento)}?${q.toString()}`;
}
