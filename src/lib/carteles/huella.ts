/**
 * La huella de un cartel (OL-464, bitácora 496): para saber si dos imágenes son el mismo cartel aunque sean copias distintas en Storage (al
 * aceptar cada acto de un festival, `ponerCartel` guarda su propia copia del cartel del día: misma imagen, otra dirección). Puro: la comparación
 * la usan `armarCarrusel` (en el teléfono y en el servidor) y sus pruebas; el cálculo con sharp vive en `huellaServidor.ts`.
 *
 * La huella es `<forma>.<color>.<bytes>` en hexadecimal (64 + 1 + 96 + 1 + 64 caracteres; la columna `eventos.cartel_huella`):
 *   · forma: el dHash de 256 bits (la imagen en gris a 17 × 16, cada píxel contra el de su derecha);
 *   · color: el color medio de cada cuadro de una rejilla de 4 × 4 (48 bytes, RGB);
 *   · bytes: el SHA-256 del archivo.
 * Dos carteles son el mismo si sus bytes son idénticos, o si su forma difiere en `UMBRAL_BITS` bits o menos Y su color en `UMBRAL_COLOR` niveles
 * o menos de media (una copia re-codificada, otra calidad u otro tamaño).
 *
 * Medido con los seis carteles reales de «Cultura Mística» (los tres programas del día salen de la misma plantilla) y cinco copias de cada uno
 * (re-codificada a calidad 72 y 60, reducida a 1080 px, a 720 px en WebP y a 600 px con calidad 50): con un dHash de 8 × 8 (64 bits) una copia
 * dista hasta 7 bits y el programa del viernes del del sábado desde 3, así que no se separan; con 16 × 16 las copias distan 28 bits o menos y dos
 * carteles distintos 57 o más (umbral, 40). La forma sola confunde carteles de una misma plantilla con otros colores (el gris es casi el mismo;
 * los once del respaldo, `carteles-carrusel.mjs`, distan desde 21 bits): por eso el color también tiene que coincidir. Con esas mismas copias,
 * el color de una copia difiere 2,3 niveles o menos y el de dos carteles de forma parecida, 16 o más (umbral, 6). Con los dos juntos: ninguna
 * copia sin unir y ningún par distinto unido.
 * Límite: dos carteles que solo cambian un texto chico sobre la misma plantilla, el mismo fondo y los mismos colores (p. ej. solo la fecha)
 * pueden verse como el mismo; los mismos bytes nunca fallan.
 */

export const UMBRAL_BITS = 40;
export const UMBRAL_COLOR = 6;
const HUELLA = /^([0-9a-f]{64})\.([0-9a-f]{96})\.([0-9a-f]{64})$/;

/** ¿Es una huella bien formada? */
export const esHuella = (h: unknown): h is string => typeof h === "string" && HUELLA.test(h);

/** Cuántos bits difieren dos dHash (en hexadecimal, del mismo largo). */
export function distanciaBits(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 4) {
    let x = parseInt(a.slice(i, i + 4), 16) ^ parseInt(b.slice(i, i + 4), 16);
    while (x) {
      n += x & 1;
      x >>>= 1;
    }
  }
  return n;
}

/** Cuánto difieren dos rejillas de color (en hexadecimal, un byte por canal): la diferencia media por canal, de 0 a 255. */
export function distanciaColor(a: string, b: string): number {
  const n = Math.min(a.length, b.length) / 2;
  let suma = 0;
  for (let i = 0; i < n; i++) suma += Math.abs(parseInt(a.slice(i * 2, i * 2 + 2), 16) - parseInt(b.slice(i * 2, i * 2 + 2), 16));
  return n ? suma / n : Infinity;
}

/** Las partes de una huella, o null si no es una. */
export function partesDeHuella(h: string | null | undefined): { forma: string; color: string; bytes: string } | null {
  const m = typeof h === "string" ? HUELLA.exec(h) : null;
  return m ? { forma: m[1], color: m[2], bytes: m[3] } : null;
}

/** ¿Son el mismo cartel? Los mismos bytes, o la misma forma y el mismo color (con su tolerancia). Sin huella, no se sabe: no. */
export function mismoCartel(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = partesDeHuella(a);
  const y = partesDeHuella(b);
  if (!x || !y) return false;
  return x.bytes === y.bytes || (distanciaBits(x.forma, y.forma) <= UMBRAL_BITS && distanciaColor(x.color, y.color) <= UMBRAL_COLOR);
}
