import "server-only";
import type { ParaCartel } from "./cargar";
import { armarTextos } from "./datos";
import { dibujarCartel, type Resultado } from "./dibujar";
import type { Plantilla } from "./plantillas";
import type { Formato } from "./tokens";

/**
 * Generar un cartel de un evento ya cargado (OL-324): trae la primera imagen que responda (por orden) y dibuja. Lo usan la ruta que da las
 * miniaturas, la vista previa y la descarga (`/api/cartel-nuevo/[id]`) y «Usar como cartel».
 *
 * Cuota de Supabase (la de salida se agotó el 2026-10-03): la imagen se pide una vez y se guarda en la caché de datos de Next un día (los
 * objetos del bucket no cambian: cada subida tiene su nombre) y, además, en la memoria del proceso mientras viva; las cuatro miniaturas, la
 * vista previa y la descarga piden la misma imagen.
 */

/** Tope de una imagen que se trae (el bucket admite 5 MB). */
const TOPE_IMAGEN = 6 * 1024 * 1024;
const RECIENTES = 24;
const recientes = new Map<string, Buffer>();

async function traerImagen(url: string): Promise<Buffer | null> {
  const guardada = recientes.get(url);
  if (guardada) return guardada;
  try {
    const r = await fetch(url, { redirect: "error", next: { revalidate: 86_400 } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length === 0 || bytes.length > TOPE_IMAGEN) return null;
    recientes.set(url, bytes);
    if (recientes.size > RECIENTES) recientes.delete(recientes.keys().next().value!);
    return bytes;
  } catch {
    return null;
  }
}

/** Un número estable a partir del id del evento: varía la paleta sin foto entre eventos, igual cada vez para el mismo. */
export function semillaDe(id: string): number {
  let n = 0;
  for (const letra of id) n = (n * 31 + letra.charCodeAt(0)) | 0;
  return Math.abs(n);
}

export async function generarCartel(datos: ParaCartel, plantilla: Plantilla, formato: Formato, opciones: { titulo?: string | null; ancho?: number; ahora?: Date } = {}): Promise<Resultado & { msImagen: number }> {
  const t0 = performance.now();
  let imagen: Buffer | null = null;
  for (const url of datos.imagenes) {
    imagen = await traerImagen(url);
    if (imagen) break;
  }
  const msImagen = Math.round(performance.now() - t0);
  const textos = armarTextos(datos.evento, opciones.titulo ?? null, opciones.ahora);
  const resultado = await dibujarCartel({ plantilla, formato, textos, imagen, ancho: opciones.ancho, semilla: semillaDe(datos.evento.id) });
  return { ...resultado, msImagen };
}
