import "server-only";
import { cartelDescargable } from "../cartelDescarga";
import { configPublica } from "../config";
import type { ParaCartel } from "./cargar";
import { armarTextos } from "./datos";
import { dibujarCartel, type Resultado } from "./dibujar";
import { imagenAdmitida, PLAZO_DESCARGA_MS, TIEMPO_MAX_FOTO_MS, TOPE_BYTES } from "./imagenSegura";
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

/** Se acabó el plazo de la descarga (OL-334). Solo se usa dentro de este archivo, y siempre se atrapa. */
class PlazoVencido extends Error {}

/** La promesa, pero que se rechaza en cuanto la señal se aborta: no depende de que quien responde (un `fetch` o un lector) atienda la señal. */
function hastaElPlazo<T>(promesa: Promise<T>, senal: AbortSignal): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    if (senal.aborted) {
      rechazar(new PlazoVencido());
      promesa.catch(() => {});
      return;
    }
    const alVencer = () => rechazar(new PlazoVencido());
    senal.addEventListener("abort", alVencer, { once: true });
    promesa.then(resolver, rechazar).finally(() => senal.removeEventListener("abort", alVencer));
  });
}

/**
 * Lee el cuerpo hasta el tope y no más: si lo pasa, corta la descarga y devuelve null (no se baja en memoria una imagen enorme). Cada lectura
 * está bajo el plazo de la señal (OL-334): un cuerpo que se queda a medias también vence; entonces se corta el lector y se lanza `PlazoVencido`.
 */
async function leerConTope(r: Response, senal: AbortSignal): Promise<Buffer | null> {
  const declarado = Number(r.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > TOPE_BYTES) {
    void r.body?.cancel().catch(() => {});
    return null;
  }
  if (!r.body) return null;
  const lector = r.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await hastaElPlazo(lector.read(), senal);
      if (done) break;
      total += value.length;
      if (total > TOPE_BYTES) {
        void lector.cancel().catch(() => {});
        return null;
      }
      trozos.push(value);
    }
  } catch (error) {
    void lector.cancel().catch(() => {}); // sin esperarlo: si el cuerpo está colgado, su cancelación también podría colgarse
    throw error;
  }
  return Buffer.concat(trozos);
}

/**
 * Trae una imagen para el cartel (OL-329). Solo del Storage propio (`cartelDescargable`, otra vez aquí aunque `imagenesPorOrden` ya filtró:
 * esta función es la que sale a la red), sin redirecciones, con tope de peso mientras se baja y, sobre todo, solo si los **bytes** son un
 * JPEG, PNG o WebP razonable (`imagenAdmitida`); el `Content-Type` no cuenta. Todo lo demás (SVG, otro formato, mentiras, bombas de píxeles)
 * devuelve null y el cartel sale sin foto. Lo que se guarda en la memoria del proceso ya está validado.
 *
 * Con plazo (OL-334, F07 residual de OL-327): la descarga entera —respuesta y cuerpo— lleva un `AbortSignal` y, pasado `plazoMs` (por omisión
 * `PLAZO_DESCARGA_MS`), se corta y devuelve null. Nunca lanza.
 */
export async function traerImagen(url: string, opciones: { traer?: typeof fetch; supabaseUrl?: string | null; plazoMs?: number } = {}): Promise<Buffer | null> {
  const guardada = recientes.get(url);
  if (guardada) return guardada;
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), Math.max(0, opciones.plazoMs ?? PLAZO_DESCARGA_MS));
  try {
    if (!cartelDescargable(url, opciones.supabaseUrl === undefined ? configPublica().supabaseUrl : opciones.supabaseUrl)) return null;
    const r = await hastaElPlazo((opciones.traer ?? fetch)(url, { redirect: "error", signal: control.signal, next: { revalidate: 86_400 } }), control.signal);
    if (!r.ok) {
      void r.body?.cancel().catch(() => {});
      return null;
    }
    const bytes = await leerConTope(r, control.signal);
    if (!bytes || !(await hastaElPlazo(imagenAdmitida(bytes), control.signal))) return null;
    recientes.set(url, bytes);
    if (recientes.size > RECIENTES) recientes.delete(recientes.keys().next().value!);
    return bytes;
  } catch {
    return null;
  } finally {
    clearTimeout(reloj);
  }
}

/** Un número estable a partir del id del evento: varía la paleta sin foto entre eventos, igual cada vez para el mismo. */
export function semillaDe(id: string): number {
  let n = 0;
  for (const letra of id) n = (n * 31 + letra.charCodeAt(0)) | 0;
  return Math.abs(n);
}

/** Lo que solo cambian las pruebas: cómo y con qué plazos se bajan las imágenes. */
export type OpcionesDescarga = { traer?: typeof fetch; supabaseUrl?: string | null; plazoMs?: number; tiempoMaxFotoMs?: number };

export async function generarCartel(datos: ParaCartel, plantilla: Plantilla, formato: Formato, opciones: { titulo?: string | null; ancho?: number; ahora?: Date; descarga?: OpcionesDescarga } = {}): Promise<Resultado & { msImagen: number }> {
  const t0 = performance.now();
  // Un solo presupuesto de tiempo (OL-334): bajar la foto y prepararla caben juntas en `TIEMPO_MAX_FOTO_MS`. Cada imagen tiene su plazo, que nunca
  // pasa de lo que queda; lo que quede después de bajarla es lo que tiene `dibujarCartel` para prepararla.
  const presupuesto = opciones.descarga?.tiempoMaxFotoMs ?? TIEMPO_MAX_FOTO_MS;
  const quedan = () => Math.max(0, presupuesto - (performance.now() - t0));
  let imagen: Buffer | null = null;
  for (const url of datos.imagenes) {
    if (quedan() <= 0) break;
    imagen = await traerImagen(url, { ...opciones.descarga, plazoMs: Math.min(opciones.descarga?.plazoMs ?? PLAZO_DESCARGA_MS, quedan()) });
    if (imagen) break;
  }
  const msImagen = Math.round(performance.now() - t0);
  const textos = armarTextos(datos.evento, opciones.titulo ?? null, opciones.ahora);
  const resultado = await dibujarCartel({ plantilla, formato, textos, imagen, ancho: opciones.ancho, semilla: semillaDe(datos.evento.id), tiempoMaxFotoMs: quedan() });
  return { ...resultado, msImagen };
}
