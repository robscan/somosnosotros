/**
 * Toda imagen que sube la persona se prepara en su teléfono antes de subirla (OL-352): se lee, se reduce a un lado máximo y se pasa a JPEG,
 * bajando la calidad y luego el lado hasta que quepa en el tope del bucket. La persona no tiene compresores: una captura de pantalla del
 * iPhone (PNG de 1290×2796, 5-9 MB) baja así a unos cientos de KB y nunca se le dice «pesa más de 5 MB» si se podía comprimir.
 *
 * El lado depende del uso (`LADOS`): la portada no se muestra más grande, el cartel se lee y se dibuja en historia, el perfil es un avatar.
 */
export const LADO_MAXIMO = 1600;

/** Tope de lo que se sube (el bucket `fotos` no admite más: `file_size_limit` de la migración base). */
export const TAMANO_MAX_FOTO = 5 * 1024 * 1024;

/**
 * El lado máximo según el uso.
 * - `cartel` (el cartel del evento y la foto propia del creador): 2000. El creador dibuja la historia a 1080×1920 y la foto va a sangre, así
 *   que una foto vertical necesita ~1920 px de alto para no estirarse; además el cartel se lee (lectura automática) y se abre a pantalla
 *   completa en el visor, donde la letra chica se tiene que leer.
 * - `portada` (lugar y artista, también la foto del artista, que sale en carteles y al compartir): 1600. Se sirven por el optimizador de
 *   Vercel, cuyo ancho mayor útil en el teléfono es 1280 (3× de 390 ≈ 1170).
 * - `perfil`: 800. Solo se ve de avatar.
 */
export const LADOS = { cartel: 2000, portada: LADO_MAXIMO, perfil: 800 } as const;
export type Uso = keyof typeof LADOS;

/** Calidades JPEG que se prueban en orden: la primera casi siempre basta; las otras solo si aún pasa del tope. */
export const CALIDADES = [0.85, 0.75, 0.65] as const;
/** Si con la calidad más baja aún no cabe, se baja el lado: estas fracciones del lado pedido. Con la mitad cabe siempre (2000 px a 0,65 ≈ 1 MB en el peor caso). */
export const FRACCIONES_DE_LADO = [1, 0.75, 0.5] as const;

/** Una JPEG ya chica no se vuelve a codificar (perdería calidad sin ganar nada). */
const YA_CHICA = 600 * 1024;

/** Codifica la imagen a un lado y una calidad dadas; null si el navegador no pudo. */
export type Codificar = (lado: number, calidad: number) => Promise<Blob | null>;

/**
 * Los pasos para caber en el tope, separados del lienzo para poder probarlos: cada lado (de mayor a menor) con cada calidad (de mayor a
 * menor), y se queda con la primera que cabe. Devuelve null si ninguna cabe o si el navegador no codificó nada.
 */
export async function ajustarAlTope(codificar: Codificar, ladoMaximo: number, tope = TAMANO_MAX_FOTO): Promise<Blob | null> {
  for (const fraccion of FRACCIONES_DE_LADO) {
    const lado = Math.max(1, Math.round(ladoMaximo * fraccion));
    for (const calidad of CALIDADES) {
      const blob = await codificar(lado, calidad);
      if (blob && blob.size > 0 && blob.size <= tope) return blob;
    }
  }
  return null;
}

/** Lo que se pudo leer: un mapa de bits (de `createImageBitmap`) o la etiqueta `<img>` ya decodificada; los dos se dibujan en el lienzo. */
type Leida = { fuente: CanvasImageSource; ancho: number; alto: number; soltar: () => void };

/**
 * Lee la imagen con el giro de la cámara aplicado (EXIF). Primero `createImageBitmap` (rápido y fuera del hilo principal); si falla —HEIC en
 * un Safari viejo, un PNG raro, un navegador sin la opción—, con una `<img>` y `decode()`, que lee todo lo que el navegador sabe mostrar.
 */
async function leer(archivo: Blob): Promise<Leida | null> {
  for (const opciones of [{ imageOrientation: "from-image" } as ImageBitmapOptions, undefined]) {
    try {
      const bitmap = await createImageBitmap(archivo, opciones);
      return { fuente: bitmap, ancho: bitmap.width, alto: bitmap.height, soltar: () => bitmap.close() };
    } catch {
      // la siguiente forma
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("vacía");
    return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, soltar: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** ¿Algún píxel no es opaco? Solo se mira en formatos que pueden tener transparencia; una captura de pantalla PNG no la tiene. */
function tieneTransparencia(ctx: CanvasRenderingContext2D, ancho: number, alto: number): boolean {
  const datos = ctx.getImageData(0, 0, ancho, alto).data;
  for (let i = 3; i < datos.length; i += 4) if (datos[i] < 255) return true;
  return false;
}

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad?: number): Promise<Blob | null> {
  return new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad));
}

/** El resultado de preparar: el archivo listo para subir, o por qué no se pudo leer. */
export type Preparada = { archivo: File } | { fallo: "lectura" };

/**
 * Prepara una imagen para subirla: la lee (con el giro EXIF), la reduce a `ladoMaximo` y la pasa a JPEG (fondo blanco) con la primera
 * calidad que quepa en `tope`; si ninguna cabe, baja el lado (`ajustarAlTope`). Conserva PNG solo si la imagen tiene transparencia real y
 * cabe (un logotipo). Una JPEG que ya cabe en el lado y pesa poco se sube tal cual. Devuelve `{ fallo: "lectura" }` si el navegador no
 * pudo leerla ni con `<img>` (no es una imagen, o un formato que no sabe mostrar).
 */
export async function prepararImagen(archivo: File, { ladoMaximo = LADO_MAXIMO, tope = TAMANO_MAX_FOTO }: { ladoMaximo?: number; tope?: number } = {}): Promise<Preparada> {
  if (typeof window === "undefined") return { archivo };
  const leida = await leer(archivo);
  if (!leida) return { fallo: "lectura" };
  try {
    const mayor = Math.max(leida.ancho, leida.alto);
    if (mayor <= ladoMaximo && archivo.type === "image/jpeg" && archivo.size <= YA_CHICA) return { archivo };
    const base = archivo.name.replace(/\.[^.]+$/, "") || "imagen";
    const lienzo = document.createElement("canvas");
    const ctx = lienzo.getContext("2d");
    if (!ctx) return { fallo: "lectura" };
    // Dibuja a un lado dado (nunca más grande que la original) y recuerda cuál está dibujado para no repetirlo en cada calidad.
    let dibujado = 0;
    const dibujar = (lado: number, fondo: boolean) => {
      const escala = Math.min(1, lado / mayor);
      lienzo.width = Math.max(1, Math.round(leida.ancho * escala));
      lienzo.height = Math.max(1, Math.round(leida.alto * escala));
      ctx.imageSmoothingQuality = "high";
      if (fondo) {
        // JPEG no tiene transparencia: lo transparente sale blanco, no negro.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      }
      ctx.drawImage(leida.fuente, 0, 0, lienzo.width, lienzo.height);
      dibujado = lado;
    };

    if (/^image\/(png|webp|gif)$/.test(archivo.type)) {
      dibujar(ladoMaximo, false);
      if (tieneTransparencia(ctx, lienzo.width, lienzo.height)) {
        const png = await aBlob(lienzo, "image/png");
        if (png && png.size > 0 && png.size <= tope) return { archivo: new File([png], `${base}.png`, { type: "image/png", lastModified: Date.now() }) };
      }
      dibujado = 0; // se vuelve a dibujar con fondo blanco
    }

    const jpeg = await ajustarAlTope(async (lado, calidad) => {
      if (dibujado !== lado) dibujar(lado, true);
      return aBlob(lienzo, "image/jpeg", calidad);
    }, ladoMaximo, tope);
    // Sin JPEG que quepa (no debería pasar): si la original ya cabía, se sube tal cual, como antes; si no, se dice que pesa.
    if (!jpeg) return archivo.size <= tope ? { archivo } : { fallo: "lectura" };
    return { archivo: new File([jpeg], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() }) };
  } catch {
    return archivo.size <= tope ? { archivo } : { fallo: "lectura" };
  } finally {
    leida.soltar();
  }
}

/** Lo que no tiene portada (evento, lugar o artista) muestra estas imágenes con el símbolo SN al centro (founder, 2026-09-16).
 *  Se generan una vez con docs/diseno/logotipo/sin-foto-sn.mjs: la cuadrada para miniaturas y avatares, la ancha para la portada de las fichas. */
export const SIN_FOTO = "/sin-foto.png";
export const SIN_FOTO_ANCHA = "/sin-foto-ancha.png";
/** La portada sin foto de la cabecera oscura (exposición, taller y festival, OL-351): el símbolo en claro sobre la banda, arriba del título. */
export const SIN_FOTO_OSCURA = "/sin-foto-oscura.png";
