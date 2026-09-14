/**
 * Fotos del teléfono antes de subirlas: se reducen en el navegador a un lado máximo y a JPEG.
 * Una foto de 4 000 px y 4 MB baja a ~1 600 px y ~200 KB; la portada nunca se muestra más grande.
 * Si el navegador no puede (formato raro, memoria), se sube la original.
 */
export const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

export async function reducirImagen(archivo: File, ladoMaximo = LADO_MAXIMO): Promise<File> {
  if (typeof window === "undefined" || !archivo.type.startsWith("image/")) return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && archivo.type === "image/jpeg" && archivo.size < 600 * 1024) {
      bitmap.close();
      return archivo; // ya es chica: no vale la pena recodificarla
    }
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", CALIDAD));
    if (!blob || blob.size === 0) return archivo;
    const nombre = archivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return archivo;
  }
}
