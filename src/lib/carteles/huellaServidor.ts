import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

const LADO = 16;
const REJILLA = 4;

/**
 * La huella de un cartel, con sharp (OL-464, bitácora 496; qué es y cómo se compara, en `huella.ts`): `<forma>.<color>.<bytes>`. La forma, el dHash
 * de 256 bits (gris a 17 × 16); el color, la media RGB de cada cuadro de 4 × 4; los bytes, su SHA-256. Null si la imagen no se puede leer.
 */
export async function huellaDeCartel(bytes: Buffer): Promise<string | null> {
  try {
    // Sin «shrink-on-load» de JPEG: decodificar a otra escala según el tamaño de cada copia mueve la imagen medio píxel y cambia bits.
    const base = sharp(bytes, { limitInputPixels: 50_000_000 }).rotate().flatten({ background: "#ffffff" });
    const [gris, color] = await Promise.all([
      base.clone().grayscale().resize(LADO + 1, LADO, { fit: "fill", fastShrinkOnLoad: false }).raw().toBuffer(),
      base.clone().removeAlpha().resize(REJILLA, REJILLA, { fit: "fill", fastShrinkOnLoad: false }).raw().toBuffer(),
    ]);
    let bits = "";
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) bits += gris[y * (LADO + 1) + x] > gris[y * (LADO + 1) + x + 1] ? "1" : "0";
    const forma = Array.from({ length: (LADO * LADO) / 4 }, (_, i) => parseInt(bits.slice(i * 4, i * 4 + 4), 2).toString(16)).join("");
    const rgb = Buffer.from(color.subarray(0, REJILLA * REJILLA * 3)).toString("hex");
    return `${forma}.${rgb}.${createHash("sha256").update(bytes).digest("hex")}`;
  } catch {
    return null;
  }
}
