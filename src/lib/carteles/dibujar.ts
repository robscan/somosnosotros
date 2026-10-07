import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import type { TextosCartel } from "./datos";
import { ENTRADA_SEGURA, imagenAdmitida, TIEMPO_MAX_FOTO_MS } from "./imagenSegura";
import { FUENTES } from "./medir";
import { elegirPaleta, hexARgb, type Paleta, type Rgb } from "./paleta";
import type { Plantilla } from "./plantillas/tipos";
import type { Formato } from "./tokens";

/**
 * Dibujar el cartel en el servidor (OL-324, bitácora 353). Decidido con medidas (spike de la bitácora): satori arma el SVG (2 a 6 ms) y sharp
 * lo rasteriza con librsvg (15 a 130 ms según formato y foto). Se probó también @resvg/resvg-js: el mismo resultado a la vista, más lento con
 * foto (70 a 170 ms) y un paquete nativo más; sharp ya hacía falta para preparar la foto, sacar su color y dar el JPEG.
 *
 * Salida en JPEG de calidad 90 sin submuestreo de color (las letras de color quedan nítidas): con foto pesa ~0,25 MB contra 1,7 a 2,8 MB del
 * PNG, que no se ve mejor en Instagram ni en WhatsApp (los dos lo vuelven a comprimir). Las miniaturas salen a lo ancho que se pidan.
 */

const CARPETA_FUENTES = path.join(process.cwd(), "src/lib/carteles/fuentes");

type FuenteSatori = { name: string; data: Buffer; weight: 400; style: "normal" };
let fuentes: FuenteSatori[] | null = null;
/** Las cinco instancias de Bricolage, leídas una vez por proceso (~50 KB cada una). */
function cargarFuentes(): FuenteSatori[] {
  fuentes ??= FUENTES.map((nombre) => ({ name: nombre, data: readFileSync(path.join(CARPETA_FUENTES, `bricolage-${nombre}.ttf`)), weight: 400, style: "normal" }));
  return fuentes;
}

/** El lado mayor de la foto ya preparada: el lienzo mide 1080 de ancho, con eso alcanza para cualquier recorte. */
const LADO_FOTO = 1400;

/** El lado de la miniatura con la que se analiza el color: el consumo no depende del tamaño de la foto (F07 de Codex, OL-329). */
const LADO_ANALISIS = 64;

/**
 * El tono que manda en la foto (sharp `stats().dominant`), para la paleta. Se saca de una miniatura de 64 px: `stats()` no obedece a `resize()`
 * (analiza la entrada entera), así que primero se reduce y luego se analiza. Con un JPEG la reducción se hace al decodificar.
 */
export async function tonoDominante(imagen: Buffer): Promise<Rgb> {
  const miniatura = await sharp(imagen, ENTRADA_SEGURA).rotate().resize(LADO_ANALISIS, LADO_ANALISIS, { fit: "inside" }).png().toBuffer();
  const { dominant } = await sharp(miniatura).stats();
  return dominant;
}

/**
 * La foto lista para el cartel, como data URL de un JPEG: reducida, girada según su EXIF y con el tratamiento de la plantilla. El duotono
 * (zine) va del negro al acento de la paleta; el sepia (deco), entonado hacia el dorado del acento.
 */
export async function prepararFoto(imagen: Buffer, plantilla: Pick<Plantilla, "tratamiento">, paleta: Paleta): Promise<string> {
  const reducida = sharp(imagen, ENTRADA_SEGURA).timeout({ seconds: TIEMPO_MAX_FOTO_MS / 1000 }).rotate().resize(LADO_FOTO, LADO_FOTO, { fit: "inside", withoutEnlargement: true });
  let jpeg: Buffer;
  if (plantilla.tratamiento === "natural") {
    jpeg = await reducida.jpeg({ quality: 85 }).toBuffer();
  } else {
    // En dos pasadas: sharp aplica sus operaciones en un orden fijo y, en una sola, el gris se come el entonado.
    const base = plantilla.tratamiento === "duotono" ? reducida.grayscale().linear(1.35, -30) : reducida.modulate({ saturation: 0.55 });
    const intermedia = await base.toColourspace("srgb").png().toBuffer();
    jpeg = await sharp(intermedia).tint(hexARgb(paleta.acento)).jpeg({ quality: 85 }).toBuffer();
  }
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

/**
 * Un nodo de texto tal como lo colocó satori (para comprobar que nada se sale ni se encima). Su caja es la de antes de girarlo: un texto girado
 * (la franja vertical del tipográfico) lleva `data-girado` y se marca aquí para medirlo aparte.
 */
export type NodoTexto = { texto: string; x: number; y: number; ancho: number; alto: number; girado: boolean };

export type Pedido = {
  plantilla: Plantilla;
  formato: Formato;
  textos: TextosCartel;
  /** La imagen original (bytes), o null para la versión sin foto. Si no es un JPEG, PNG o WebP admitido (`imagenSegura.ts`), también sale sin foto. */
  imagen: Buffer | null;
  sello?: boolean;
  /** Semilla para variar la paleta sin foto (el id del evento). */
  semilla?: number;
  /** Para las pruebas: el tiempo máximo (ms) de preparar la foto; por defecto 8 s. Pasado, el cartel sale sin foto. */
  tiempoMaxFotoMs?: number;
  /** El ancho de salida (miniatura); sin él, el del lienzo. */
  ancho?: number;
  /** Para las pruebas: devuelve los nodos de texto con su caja. */
  conNodos?: boolean;
  /** Para las pruebas: también el PNG (más pesado, sin pérdida). */
  png?: boolean;
  /** Para las pruebas: solo el árbol de satori (sus nodos), sin rasterizar; `imagen` sale vacía. */
  soloSvg?: boolean;
};

export type Resultado = {
  imagen: Buffer;
  tipo: "image/jpeg" | "image/png";
  ancho: number;
  alto: number;
  paleta: Paleta;
  tituloRecortado: boolean;
  /** Milisegundos: preparar la foto, armar el SVG y rasterizar. */
  ms: { foto: number; svg: number; raster: number };
  nodos: NodoTexto[];
};

/** Dibuja un cartel. Si la foto no se puede leer, cae a la versión sin foto de la misma plantilla (nunca un cartel roto). */
export async function dibujarCartel(p: Pedido): Promise<Resultado> {
  const t0 = performance.now();
  let foto: string | null = null;
  let dominante: Rgb | null = null;
  // Defensa en profundidad (OL-329): aunque quien llama ya la validó, aquí se comprueba otra vez que los bytes sean un JPEG, PNG o WebP
  // razonable; cualquier otra cosa (SVG incluido) se descarta y el cartel sale sin foto.
  if (p.imagen && (await imagenAdmitida(p.imagen))) {
    // Con tope de tiempo (F07): sharp no se puede cancelar desde aquí, pero el cartel no espera más y sale sin foto.
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const preparar = (async () => {
      const tono = await tonoDominante(p.imagen!);
      return { tono, foto: await prepararFoto(p.imagen!, p.plantilla, elegirPaleta(p.plantilla.paletas, tono)) };
    })();
    preparar.catch(() => {}); // si pierde la carrera, que su fallo no quede sin atender
    try {
      const listo = await Promise.race([preparar, new Promise<null>((resolver) => { reloj = setTimeout(() => resolver(null), p.tiempoMaxFotoMs ?? TIEMPO_MAX_FOTO_MS); })]);
      if (listo) ({ tono: dominante, foto } = listo);
    } catch {
      foto = null;
      dominante = null;
    } finally {
      clearTimeout(reloj);
    }
  }
  const paleta = elegirPaleta(p.plantilla.paletas, dominante, p.semilla ?? 0);
  const t1 = performance.now();
  const { elemento, tituloRecortado } = p.plantilla.dibujar({ textos: p.textos, formato: p.formato, paleta, foto, sello: p.sello ?? true });
  const nodos: NodoTexto[] = [];
  const svg = await satori(elemento, {
    width: p.formato.ancho,
    height: p.formato.alto,
    fonts: cargarFuentes(),
    onNodeDetected: p.conNodos
      ? (n) => {
          // Satori avisa cada caja; las de texto traen `textContent` (un `div` cuyo hijo es una cadena) y su caja mide lo que mide el texto.
          if (typeof n.textContent === "string" && n.textContent.trim()) nodos.push({ texto: n.textContent, x: n.left, y: n.top, ancho: n.width, alto: n.height, girado: !!n.props?.["data-girado"] });
        }
      : undefined,
  });
  const t2 = performance.now();
  const ancho = Math.round(p.ancho ?? p.formato.ancho);
  const raster = sharp(Buffer.from(svg), { density: (72 * ancho) / p.formato.ancho });
  const imagen = p.soloSvg ? Buffer.alloc(0) : p.png ? await raster.png().toBuffer() : await raster.flatten({ background: paleta.fondo }).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer();
  const t3 = performance.now();
  return {
    imagen,
    tipo: p.png ? "image/png" : "image/jpeg",
    ancho,
    alto: Math.round((ancho * p.formato.alto) / p.formato.ancho),
    paleta,
    tituloRecortado,
    ms: { foto: Math.round(t1 - t0), svg: Math.round(t2 - t1), raster: Math.round(t3 - t2) },
    nodos,
  };
}
