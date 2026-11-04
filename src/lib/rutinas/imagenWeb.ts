import "server-only";
import sharp from "sharp";
import { ENTRADA_SEGURA, imagenAdmitida, TOPE_BYTES } from "../carteles/imagenSegura";

/**
 * Bajar un cartel de la web desde el servidor (OL-444, «Buscar carteles»): la rutina lo baja antes de proponerlo (así no propone una dirección
 * inventada ni una página en vez de una imagen) y aceptar lo vuelve a bajar para subirlo a Storage. La dirección viene de lo que encontró la API
 * en páginas ajenas: es dato, no confianza. Por eso solo https al puerto 443 de un dominio con nombre (nada de IP, localhost ni nombres
 * internos), redirecciones a mano (tres como mucho, cada una con la misma regla), un tope de bytes y de tiempo, y los bytes tienen que ser un
 * JPEG, PNG o WebP que se deje leer (`imagenAdmitida`, OL-329: nunca SVG). Nunca lanza: null si no sirve.
 */

const DOMINIO = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const NOMBRES_INTERNOS = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|example|invalid)$/i;
export const PLAZO_IMAGEN_MS = 15_000;
const MAX_REDIRECCIONES = 3;

/** ¿Se puede pedir esta dirección desde el servidor? https, puerto 443, un dominio público con nombre, sin usuario ni contraseña. */
export function direccionPublica(url: string): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || (u.port && u.port !== "443") || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (!DOMINIO.test(host) || NOMBRES_INTERNOS.test(host)) return null;
  return u;
}

/** Los bytes, sin pasar del tope (si el servidor miente en Content-Length, se corta al leer). */
async function leerConTope(r: Response): Promise<Buffer | null> {
  const largo = Number(r.headers.get("content-length"));
  if (Number.isFinite(largo) && largo > TOPE_BYTES) {
    await r.body?.cancel().catch(() => undefined);
    return null;
  }
  if (!r.body) return Buffer.from(await r.arrayBuffer());
  const partes: Uint8Array[] = [];
  let total = 0;
  const lector = r.body.getReader();
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > TOPE_BYTES) {
      await lector.cancel().catch(() => undefined);
      return null;
    }
    partes.push(value);
  }
  return Buffer.concat(partes);
}

export async function bajarImagen(url: string, pedir: typeof fetch = fetch, plazoMs = PLAZO_IMAGEN_MS): Promise<Buffer | null> {
  let actual = direccionPublica(url);
  const senal = AbortSignal.timeout(Math.max(1, plazoMs));
  try {
    for (let i = 0; actual && i <= MAX_REDIRECCIONES; i++) {
      const r = await pedir(actual.href, {
        redirect: "manual",
        signal: senal,
        cache: "no-store",
        headers: { accept: "image/jpeg,image/png,image/webp;q=0.9,*/*;q=0.1", "user-agent": "Mozilla/5.0 (somosnosotros.org; carteles de la agenda cultural)" },
      });
      if (r.status >= 300 && r.status < 400) {
        await r.body?.cancel().catch(() => undefined);
        const destino = r.headers.get("location");
        actual = destino ? direccionPublica(new URL(destino, actual).href) : null;
        continue;
      }
      if (!r.ok) {
        await r.body?.cancel().catch(() => undefined);
        return null;
      }
      const bytes = await leerConTope(r);
      return bytes && (await imagenAdmitida(bytes)) ? bytes : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** El ancho mínimo de un cartel que se propone sin la API (OL-509): una miniatura no sirve de cartel. */
export const ANCHO_MINIMO_CARTEL = 600;
/** Tope de lo que se lee de una página para buscar su `og:image`. */
const TOPE_PAGINA = 2_000_000;

/** El ancho de una imagen ya admitida (`imagenAdmitida`), o null si no se deja leer. Solo lee la cabecera. */
export async function anchoDeImagen(bytes: Buffer): Promise<number | null> {
  try {
    const meta = await sharp(bytes, ENTRADA_SEGURA).metadata();
    return meta.width ?? null;
  } catch {
    return null;
  }
}

/**
 * Bajar la página de un evento desde el servidor (OL-509, el paso gratis de «Buscar carteles»): solo esa dirección (https a un dominio público;
 * las redirecciones, solo dentro del mismo sitio), HTML, con tope de bytes y de tiempo. Nunca lanza: null si no sirve.
 */
export async function bajarPagina(url: string, pedir: typeof fetch = fetch, plazoMs = PLAZO_IMAGEN_MS): Promise<string | null> {
  const inicio = direccionPublica(url);
  if (!inicio) return null;
  let actual: URL | null = inicio;
  const senal = AbortSignal.timeout(Math.max(1, plazoMs));
  try {
    for (let i = 0; actual && i <= MAX_REDIRECCIONES; i++) {
      const r: Response = await pedir(actual.href, {
        redirect: "manual",
        signal: senal,
        cache: "no-store",
        headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (somosnosotros.org; carteles de la agenda cultural)" },
      });
      if (r.status >= 300 && r.status < 400) {
        await r.body?.cancel().catch(() => undefined);
        const destino = r.headers.get("location");
        const siguiente: URL | null = destino ? direccionPublica(new URL(destino, actual).href) : null;
        actual = siguiente && siguiente.hostname === inicio.hostname ? siguiente : null;
        continue;
      }
      if (!r.ok || !/html/i.test(r.headers.get("content-type") ?? "text/html")) {
        await r.body?.cancel().catch(() => undefined);
        return null;
      }
      return (await r.text()).slice(0, TOPE_PAGINA);
    }
    return null;
  } catch {
    return null;
  }
}

/** La imagen que la página dice de sí misma (`og:image`; si no, `twitter:image`), como dirección https pública; null si no la dice. */
export function imagenDePagina(html: string, base: string): string | null {
  for (const nombre of ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]) {
    const etiqueta = new RegExp(`<meta\\b[^>]*?(?:property|name)\\s*=\\s*["']${nombre}["'][^>]*>`, "i").exec(html)?.[0];
    const valor = etiqueta ? (/\bcontent\s*=\s*"([^"]*)"/i.exec(etiqueta)?.[1] ?? /\bcontent\s*=\s*'([^']*)'/i.exec(etiqueta)?.[1]) : null;
    if (!valor) continue;
    try {
      const u = direccionPublica(new URL(valor.trim().replace(/&amp;/g, "&"), base).href);
      if (u) return u.href;
    } catch {
      // la siguiente
    }
  }
  return null;
}
