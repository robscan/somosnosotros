import { limpiarTexto, MAXIMOS } from "./datos";
import { formatoDe, type Formato, type IdFormato } from "./tokens";

/**
 * Los parámetros del cartel en la URL (OL-324): la ruta que dibuja los lee y la pantalla los escribe con `hrefCartel`. Puro: lo que no se
 * entiende cae al valor de siempre en vez de fallar.
 */

/** Los anchos que se dibujan: miniatura, vista previa y el tamaño real. Otro número cae al más cercano (no se dibuja cualquier tamaño). */
export const ANCHOS = [360, 720, 1080] as const;

export type ParametrosCartel = { plantilla: string | null; formato: Formato; ancho: number; titulo: string | null; descarga: boolean };

export function parametrosCartel(q: URLSearchParams): ParametrosCartel {
  const pedido = Number(q.get("ancho"));
  const ancho = Number.isFinite(pedido) && pedido > 0 ? ANCHOS.reduce((a, b) => (Math.abs(b - pedido) < Math.abs(a - pedido) ? b : a)) : 1080;
  const titulo = limpiarTexto(q.get("titulo") ?? "").slice(0, MAXIMOS.titulo) || null;
  return { plantilla: q.get("plantilla"), formato: formatoDe(q.get("formato")), ancho, titulo, descarga: q.get("descarga") === "1" };
}

/** La dirección de una imagen del cartel. `v` es la versión del evento: si el evento cambia, la caché del teléfono no da una vieja. */
export function hrefCartel(evento: string, p: { plantilla: string; formato: IdFormato; ancho?: number; titulo?: string | null; descarga?: boolean; v?: string }): string {
  const q = new URLSearchParams({ plantilla: p.plantilla, formato: p.formato });
  if (p.ancho) q.set("ancho", String(p.ancho));
  if (p.titulo) q.set("titulo", p.titulo);
  if (p.descarga) q.set("descarga", "1");
  if (p.v) q.set("v", p.v);
  return `/api/cartel-nuevo/${encodeURIComponent(evento)}?${q.toString()}`;
}
