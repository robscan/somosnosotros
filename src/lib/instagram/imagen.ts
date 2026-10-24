import "server-only";
import sharp from "sharp";
import type { ParaCartel } from "../carteles/cargar";
import { generarCartel, traerImagen } from "../carteles/generar";
import { tipoFecha, tipoFranja } from "../carteles/plantillas/tipografico";
import { FORMATOS, type IdFormato } from "../carteles/tokens";
import { imagenAdmitida } from "../carteles/imagenSegura";

/**
 * La imagen que se publica en Instagram (OL-458, firmado; bitácora 490): un JPEG de 1080 de ancho, a 4:5 (publicación) o 9:16 (historia).
 *   · Con cartel: el cartel completo sobre su color dominante (nunca se corta su texto) o, si se pide, recortado al centro de lo que importa.
 *   · Sin cartel: un diseño tipográfico de Crear cartel (`tipo-franja` o `tipo-fecha`), dibujado con su código (`generarCartel`).
 * Instagram solo acepta JPEG, por eso se vuelve a codificar aunque el cartel ya lo sea.
 */

export const DISENOS_SIN_CARTEL = [tipoFranja, tipoFecha] as const;
const MEDIDAS: Record<IdFormato, { ancho: number; alto: number }> = { "4x5": { ancho: 1080, alto: 1350 }, "9x16": { ancho: 1080, alto: 1920 } };

/** ¿Tiene caso ofrecer «Recortar»? Solo si el cartel no mide ya 4:5 (con un margen de tolerancia de 3 %). */
export function convieneRecortar(ancho: number, alto: number): boolean {
  return ancho > 0 && alto > 0 && Math.abs(ancho / alto - 0.8) > 0.03;
}

/** El cartel encajado en el formato: completo con margen de su color, o recortado. `ancho` cambia el tamaño (la vista previa va a 720). */
export async function encajarCartel(bytes: Buffer, formato: IdFormato, recorte: boolean, ancho = 1080): Promise<Buffer> {
  const m = MEDIDAS[formato];
  const alto = Math.round((m.alto * ancho) / m.ancho);
  const base = sharp(bytes, { limitInputPixels: 50_000_000 }).rotate();
  if (recorte) return base.resize(ancho, alto, { fit: "cover", position: "attention" }).flatten({ background: "#ffffff" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const { dominant } = await sharp(bytes).stats();
  const fondo = { r: dominant.r, g: dominant.g, b: dominant.b };
  return base.resize(ancho, alto, { fit: "contain", background: fondo }).flatten({ background: fondo }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

/** El cartel del evento (su `imagen`), ya bajado y comprobado; null si no tiene o no se pudo leer. */
export async function bajarCartel(url: string | null): Promise<{ bytes: Buffer; ancho: number; alto: number } | null> {
  if (!url) return null;
  const bytes = await traerImagen(url);
  if (!bytes || !(await imagenAdmitida(bytes))) return null;
  const meta = await sharp(bytes).metadata();
  return meta.width && meta.height ? { bytes, ancho: meta.width, alto: meta.height } : null;
}

/** La imagen de la publicación. `diseno` elige el diseño sin cartel (0 o 1). */
export async function armarImagen(o: { cartel: Buffer | null; datos: ParaCartel; formato: IdFormato; recorte: boolean; diseno: number; ancho?: number }): Promise<Buffer> {
  if (o.cartel) return encajarCartel(o.cartel, o.formato, o.recorte && o.formato === "4x5", o.ancho);
  const plantilla = DISENOS_SIN_CARTEL[Math.abs(o.diseno) % DISENOS_SIN_CARTEL.length];
  const r = await generarCartel({ ...o.datos, imagenes: [] }, plantilla, FORMATOS[o.formato], { ancho: o.ancho ?? 1080 });
  return r.tipo === "image/jpeg" ? r.imagen : sharp(r.imagen).jpeg({ quality: 88 }).toBuffer();
}
