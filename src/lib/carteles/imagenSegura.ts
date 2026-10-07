import "server-only";
import sharp from "sharp";

/**
 * Lo que entra al decodificador (OL-329, hallazgo de Codex en OL-327: GHSA-wq5f-xc86-pv6w de sharp 0.35.4 y un SVG de 106 bytes que entraba
 * al lector SVG por el lector de fotos). Una imagen que viene de fuera, por muy nuestro que sea el Storage, solo se decodifica si sus **bytes**
 * dicen que es JPEG, PNG o WebP (lo que el bucket `fotos` admite y sharp lee sin más; el HEIC del bucket no se lee aquí y cae a «sin foto»),
 * dentro de un tope de peso y de píxeles. Nunca se fía del `Content-Type` ni de la extensión. SVG, GIF, AVIF, TIFF y cualquier otra cosa se
 * descartan: el cartel sale sin foto, nunca roto. El SVG que arma satori para rasterizar es nuestro y no pasa por aquí.
 */

/** Tope de una imagen que se trae (el bucket admite 5 MB). */
export const TOPE_BYTES = 6 * 1024 * 1024;
/**
 * Tope de píxeles al decodificar: 12 megapíxeles. El teléfono reduce toda foto que sube a 1600 px de lado (≈ 2,6 Mpx) y el cartel sale a 1080 de
 * ancho, así que sobra; lo de arriba es una bomba de descompresión (F07 de Codex: un PNG de 122 KB y 37,7 Mpx llegó a 212 MB de RSS en una petición).
 * Sharp aplica el mismo límite al abrirla.
 */
export const LIMITE_PIXELES = 12_000_000;
/**
 * Tiempo máximo para tener lista la foto del cartel: bajarla del Storage Y prepararla (análisis de color y reducción); si se pasa, el cartel sale
 * sin foto. Desde OL-334 abarca la descarga: antes solo contaba la preparación y una descarga colgada no tenía plazo (F07 residual de OL-327).
 */
export const TIEMPO_MAX_FOTO_MS = 8000;
/** Plazo de la descarga de UNA imagen (OL-334): al vencer, se corta, se descarta y se sigue con la siguiente o sin foto. Siempre dentro de los 8 s totales. */
export const PLAZO_DESCARGA_MS = 4000;

export type FormatoAdmitido = "jpeg" | "png" | "webp";

/** El formato según los bytes mágicos del principio del cuerpo; null si no es uno de los admitidos. */
export function formatoPorBytes(bytes: Uint8Array): FormatoAdmitido | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  const texto = (desde: number, hasta: number) => String.fromCharCode(...bytes.subarray(desde, hasta));
  if (texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * ¿Se puede decodificar esta imagen? Bytes mágicos admitidos, peso y píxeles dentro del tope, y que lo que lee sharp coincida con lo que dicen
 * los bytes (un archivo con encabezado de PNG que sharp tomara por otra cosa se rechaza). Solo lee la cabecera; no decodifica los píxeles.
 */
export async function imagenAdmitida(bytes: Buffer): Promise<boolean> {
  if (bytes.length === 0 || bytes.length > TOPE_BYTES) return false;
  const formato = formatoPorBytes(bytes);
  if (!formato) return false;
  try {
    const meta = await sharp(bytes, { limitInputPixels: LIMITE_PIXELES }).metadata();
    return meta.format === formato && !!meta.width && !!meta.height && meta.width * meta.height <= LIMITE_PIXELES;
  } catch {
    return false;
  }
}

/** La opción de sharp que pone el tope de píxeles; todo `sharp(imagenDeFuera)` la lleva. `sequentialRead` lee por franjas en vez de cargar la imagen entera. */
export const ENTRADA_SEGURA = { limitInputPixels: LIMITE_PIXELES, sequentialRead: true } as const;
