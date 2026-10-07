import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { AHORA_CASOS, CASOS } from "./casos";
import { armarTextos } from "./datos";
import { dibujarCartel, type NodoTexto, type Resultado } from "./dibujar";
import { CATALOGO } from "./plantillas";
import { FORMATOS, type Formato } from "./tokens";

/**
 * Las doce plantillas × dos formatos × con y sin foto, con el banco de casos (OL-324; doc 52 §3.3, capa 4: «cada opción se dibuja y se mide»).
 * Cada cartel sale del tamaño pedido y su texto, tal como lo colocó satori, no se sale del lienzo, no entra en lo que tapa la interfaz de una
 * historia y no se encima con otro texto. Con `CARTELES_SALIDA=<carpeta>` deja los JPEG ahí para mirarlos.
 */

const SALIDA = process.env.CARTELES_SALIDA;
let foto: Buffer;

beforeAll(async () => {
  // Una «foto» inventada con color y forma (sin terceros): un degradado cálido con un círculo claro.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0a15a"/><stop offset="1" stop-color="#8c3b22"/></linearGradient></defs><rect width="1500" height="1000" fill="url(#g)"/><circle cx="1080" cy="300" r="90" fill="#f6d9a8"/><path d="M0 1000 L420 480 L700 780 L930 560 L1500 1000 Z" fill="#5a2214"/></svg>`;
  foto = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
  if (SALIDA) mkdirSync(SALIDA, { recursive: true });
});

/** Tolerancia de medio px por el redondeo de satori. */
const TOL = 1;

function fueraDelLienzo(n: NodoTexto, f: Formato): boolean {
  return n.x < -TOL || n.y < -TOL || n.x + n.ancho > f.ancho + TOL || n.y + n.alto > f.alto + TOL;
}

/** En una historia, ningún texto en lo que tapa la interfaz de arriba y de abajo. */
function enLoTapado(n: NodoTexto, f: Formato): boolean {
  return (f.tapaArriba > 0 && n.y < f.tapaArriba - TOL) || (f.tapaAbajo > 0 && n.y + n.alto > f.alto - f.tapaAbajo + TOL);
}

/** Dos textos encimados: sus cajas se cruzan más de 2 px en los dos ejes. */
function encimados(nodos: NodoTexto[]): [NodoTexto, NodoTexto] | null {
  for (let i = 0; i < nodos.length; i++) {
    for (let j = i + 1; j < nodos.length; j++) {
      const a = nodos[i];
      const b = nodos[j];
      const x = Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x);
      const y = Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y);
      if (x > 2 && y > 2) return [a, b];
    }
  }
  return null;
}

const medidas: { formato: string; foto: boolean; ms: number; kb: number }[] = [];

describe.each(CATALOGO.map((p) => [p.id, p] as const))("plantilla %s", (_id, plantilla) => {
  for (const formato of Object.values(FORMATOS)) {
    for (const conFoto of [true, false]) {
      for (const [caso, evento] of Object.entries(CASOS)) {
        it(`${formato.proporcion} ${conFoto ? "con foto" : "sin foto"} · ${caso}`, async () => {
          const textos = armarTextos(evento, null, AHORA_CASOS);
          // Rasterizar cuesta ~100 ms: se hace con el primer caso (y con todos si se piden los JPEG); los demás se comprueban con el árbol de satori.
          const rasterizar = !!SALIDA || caso === "corto";
          const r: Resultado = await dibujarCartel({ plantilla, formato, textos, imagen: conFoto ? foto : null, conNodos: true, semilla: 1, soloSvg: !rasterizar });
          if (rasterizar) {
            const meta = await sharp(r.imagen).metadata();
            expect(r.imagen.length).toBeGreaterThan(0);
            expect([meta.width, meta.height]).toEqual([formato.ancho, formato.alto]);
            medidas.push({ formato: formato.proporcion, foto: conFoto, ms: r.ms.foto + r.ms.svg + r.ms.raster, kb: r.imagen.length / 1024 });
          }
          const derechos = r.nodos.filter((n) => !n.girado);
          expect(derechos.filter((n) => fueraDelLienzo(n, formato)), "texto fuera del lienzo").toEqual([]);
          expect(derechos.filter((n) => enLoTapado(n, formato)), "texto en lo que tapa la interfaz").toEqual([]);
          expect(encimados(derechos), "textos encimados").toBeNull();
          // Un texto girado un cuarto de vuelta ocupa, ya girado, su alto a lo ancho y su ancho a lo alto, alrededor del mismo centro.
          for (const n of r.nodos.filter((x) => x.girado)) {
            const girado = { ...n, x: n.x + n.ancho / 2 - n.alto / 2, y: n.y + n.alto / 2 - n.ancho / 2, ancho: n.alto, alto: n.ancho };
            expect(fueraDelLienzo(girado, formato) || enLoTapado(girado, formato), `texto girado fuera: ${n.texto}`).toBe(false);
          }
          // Con datos de largo normal nada se corta con «…» (un rótulo cortado delató un tamaño mal puesto).
          if (caso === "corto") expect(r.nodos.filter((n) => n.texto.includes("…")).map((n) => n.texto)).toEqual([]);
          // El título siempre se ve: al menos su primera palabra está en el lienzo.
          const primera = textos.titulo.split(" ")[0].toLocaleUpperCase("es-MX");
          expect(r.nodos.some((n) => n.texto.toLocaleUpperCase("es-MX").includes(primera.slice(0, 3)))).toBe(true);
          if (SALIDA) writeFileSync(path.join(SALIDA, `${plantilla.id}-${formato.id}-${conFoto ? "foto" : "sinfoto"}-${caso}.jpg`), r.imagen);
        });
      }
    }
  }
});

describe("miniatura", () => {
  it("sale al ancho pedido con la proporción del formato", async () => {
    const textos = armarTextos(CASOS.corto, null, AHORA_CASOS);
    const r = await dibujarCartel({ plantilla: CATALOGO[0], formato: FORMATOS["4x5"], textos, imagen: foto, ancho: 360 });
    const meta = await sharp(r.imagen).metadata();
    expect([meta.width, meta.height]).toEqual([360, 450]);
  });
  it("una imagen que no se puede leer cae a la versión sin foto", async () => {
    const textos = armarTextos(CASOS.corto, null, AHORA_CASOS);
    const r = await dibujarCartel({ plantilla: CATALOGO[0], formato: FORMATOS["4x5"], textos, imagen: Buffer.from("no es una imagen") });
    expect(r.imagen.length).toBeGreaterThan(0);
  });
});

/** OL-329: lo que no es un JPEG, PNG o WebP razonable no se decodifica y el cartel sale igual que sin foto. */
describe("imágenes que no se admiten", () => {
  const SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#f80808"/></svg>`);
  const textos = armarTextos(CASOS.corto, null, AHORA_CASOS);
  const dibujar = (imagen: Buffer | null) => dibujarCartel({ plantilla: CATALOGO[0], formato: FORMATOS["4x5"], textos, imagen, semilla: 1 });

  it("un SVG sale como el cartel sin foto", async () => {
    const [con, sin] = await Promise.all([dibujar(SVG), dibujar(null)]);
    expect(con.imagen.equals(sin.imagen)).toBe(true);
  });
  it("un cuerpo que no es un PNG (aunque lo hayan llamado image/png) sale como el cartel sin foto", async () => {
    const [con, sin] = await Promise.all([dibujar(Buffer.from("<html>no soy un PNG, ni de lejos</html>")), dibujar(null)]);
    expect(con.imagen.equals(sin.imagen)).toBe(true);
  });
  it("una imagen válida pero con demasiados píxeles sale como el cartel sin foto", async () => {
    const lado = 6500; // 42 megapíxeles, por encima del tope de 40
    const grande = await sharp({ create: { width: lado, height: lado, channels: 3, background: "#000" } }).png({ compressionLevel: 9 }).toBuffer();
    const [con, sin] = await Promise.all([dibujar(grande), dibujar(null)]);
    expect(con.imagen.equals(sin.imagen)).toBe(true);
  });
  it("un JPEG válido sí lleva foto (el cartel cambia)", async () => {
    const [con, sin] = await Promise.all([dibujar(foto), dibujar(null)]);
    expect(con.imagen.equals(sin.imagen)).toBe(false);
  });
});

describe("medidas", () => {
  it("anota tiempo y peso por formato (se leen en la salida de la prueba)", () => {
    const resumen = new Map<string, { ms: number[]; kb: number[] }>();
    for (const m of medidas) {
      const clave = `${m.formato} ${m.foto ? "con foto" : "sin foto"}`;
      const r = resumen.get(clave) ?? { ms: [], kb: [] };
      r.ms.push(m.ms);
      r.kb.push(m.kb);
      resumen.set(clave, r);
    }
    const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
    for (const [clave, r] of resumen) console.info(`cartel ${clave}: mediana ${Math.round(mediana(r.ms))} ms, ${Math.round(mediana(r.kb))} KB, máximo ${Math.round(Math.max(...r.ms))} ms (${r.ms.length})`);
    expect(medidas.length).toBeGreaterThan(0);
  });
});
