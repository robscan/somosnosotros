import "server-only";
import { cartelDescargable } from "../cartelDescarga";
import { configPublica } from "../config";
import type { ParaCartel } from "./cargar";
import { armarTextos } from "./datos";
import { dibujarCartel, type Resultado } from "./dibujar";
import { imagenAdmitida, TOPE_BYTES } from "./imagenSegura";
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

const RECIENTES = 24;
const recientes = new Map<string, Buffer>();

/** Lee el cuerpo hasta el tope y no más: si lo pasa, corta la descarga y devuelve null (no se baja en memoria una imagen enorme). */
async function leerConTope(r: Response): Promise<Buffer | null> {
  const declarado = Number(r.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > TOPE_BYTES) return null;
  if (!r.body) return null;
  const lector = r.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > TOPE_BYTES) {
      await lector.cancel().catch(() => {});
      return null;
    }
    trozos.push(value);
  }
  return Buffer.concat(trozos);
}

/**
 * Trae una imagen para el cartel (OL-329). Solo del Storage propio (`cartelDescargable`, otra vez aquí aunque `imagenesPorOrden` ya filtró:
 * esta función es la que sale a la red), sin redirecciones, con tope de peso mientras se baja y, sobre todo, solo si los **bytes** son un
 * JPEG, PNG o WebP razonable (`imagenAdmitida`); el `Content-Type` no cuenta. Todo lo demás (SVG, otro formato, mentiras, bombas de píxeles)
 * devuelve null y el cartel sale sin foto. Lo que se guarda en la memoria del proceso ya está validado.
 */
export async function traerImagen(url: string, opciones: { traer?: typeof fetch; supabaseUrl?: string | null } = {}): Promise<Buffer | null> {
  const guardada = recientes.get(url);
  if (guardada) return guardada;
  try {
    if (!cartelDescargable(url, opciones.supabaseUrl === undefined ? configPublica().supabaseUrl : opciones.supabaseUrl)) return null;
    const r = await (opciones.traer ?? fetch)(url, { redirect: "error", next: { revalidate: 86_400 } });
    if (!r.ok) return null;
    const bytes = await leerConTope(r);
    if (!bytes || !(await imagenAdmitida(bytes))) return null;
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
