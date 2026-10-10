import sharp from "sharp";
import { paletaDePixeles, type Paleta } from "./coloresCartel";

/**
 * Los colores de un cartel ya en memoria, en el servidor (OL-360): el que dibuja el creador de cartel (`usarComoCartel`) y el relleno de los
 * eventos que ya tenían cartel (`scripts/ops/colores-cartel.mjs`, que hace lo mismo). Igual que en el teléfono (`coloresDeArchivo`): la imagen
 * reducida a 16×20 y `paletaDePixeles`. Nunca lanza: si no se puede leer, null.
 */
export async function coloresDeImagenEnMemoria(imagen: Buffer): Promise<Paleta | null> {
  try {
    const { data } = await sharp(imagen).resize(16, 20, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return paletaDePixeles(data);
  } catch {
    return null;
  }
}
