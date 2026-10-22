import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import type { ResumenTuAnio } from "../tuAnio";
import { dibujarImagenTuAnio, type ResultadoTuAnio } from "./dibujar";
import type { NodoTexto } from "./dibujar";
import { tamanoHero } from "./plantillas/tuAnio";

/**
 * La imagen de «Tu año» (OL-394): sale a 1080×1350 (o al ancho pedido), con y sin foto, con números de una a cuatro cifras, y su texto (tal
 * como lo colocó satori) no se sale del lienzo ni se encima. Con `TU_ANIO_SALIDA=<carpeta>` deja los JPEG ahí para mirarlos.
 */

const SALIDA = process.env.TU_ANIO_SALIDA;
let foto: Buffer;

beforeAll(async () => {
  // Una «foto» inventada (sin terceros): un degradado con un círculo, como la de las pruebas del cartel.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a8fd0"/><stop offset="1" stop-color="#22335a"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="400" cy="260" r="140" fill="#f2d2b0"/></svg>`;
  foto = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
  if (SALIDA) mkdirSync(SALIDA, { recursive: true });
});

const PERSONA: ResumenTuAnio = {
  // Los datos de la captura firmada (capturas-423/01) y su figura (la del id «persona», como en el prototipo), para compararla.
  quien: { nombre: "Robscan", foto: "x", tipo: "persona" },
  periodo: { titulo: "Tu 2026", desde: "del 17 sep al 12 oct" },
  protagonista: { n: 36, frase: "eventos a los que fuiste" },
  secundarios: [
    { n: 19, palabra: "lugares" },
    { n: 42, palabra: "artistas" },
  ],
  mas: { que: "Donde más fuiste", quien: "Museo de Arte Contemporáneo (MAC)", cuantas: "5 veces" },
  color: "#6d34c8",
};

const ARTISTA: ResumenTuAnio = {
  quien: { nombre: "Leo Traeger", foto: null, tipo: "artista" },
  periodo: { titulo: "Tu 2026", desde: "del 6 oct al 12 oct" },
  protagonista: { n: 3, frase: "fechas en 2 lugares" },
  secundarios: [{ n: 2, palabra: "lugares" }],
  mas: { que: "Donde más tocó", quien: "Centro de Difusión Cultural Raúl Gamboa", cuantas: "2 veces" },
  color: "#b0306a",
};

// OL-445: el peor caso con la línea de los hitos: nombre a dos renglones, tres cifras, dos secundarios y «lo más».
const ARTISTA_CON_LOGROS: ResumenTuAnio = {
  quien: { nombre: "Ensamble de Música Antigua del Altiplano Potosino y sus Invitados", foto: "x", tipo: "artista" },
  periodo: { titulo: "Tu 2026", desde: "del 5 ene al 12 oct" },
  protagonista: { n: 128, frase: "fechas en 14 lugares" },
  secundarios: [
    { n: 14, palabra: "lugares" },
    { n: 2300, palabra: "fueron" },
  ],
  mas: { que: "Donde más tocó", quien: "Centro de Difusión Cultural Raúl Gamboa", cuantas: "9 veces" },
  logros: "2 premios · 1 disco · 5 presentaciones · 2 más",
  color: "#b0306a",
};

const LUGAR: ResumenTuAnio = {
  quien: { nombre: "Centro Cultural Universitario Bicentenario (CC200)", foto: "x", tipo: "lugar" },
  periodo: { titulo: "Tu 2026", desde: "del 5 ene al 12 oct" },
  protagonista: { n: 1000, frase: "eventos con 311 artistas" },
  secundarios: [
    { n: 311, palabra: "artistas" },
    { n: 12500, palabra: "fueron" },
  ],
  mas: { que: "Quien más pasó", quien: "Orquesta Sinfónica de San Luis Potosí con un nombre larguísimo que no cabe en un renglón", cuantas: "48 veces" },
  color: "#0077b6",
};

const TOL = 1;
const fuera = (n: NodoTexto) => n.x < -TOL || n.y < -TOL || n.x + n.ancho > 1080 + TOL || n.y + n.alto > 1350 + TOL;
function encimados(nodos: NodoTexto[]): [NodoTexto, NodoTexto] | null {
  for (let i = 0; i < nodos.length; i++)
    for (let j = i + 1; j < nodos.length; j++) {
      const a = nodos[i],
        b = nodos[j];
      const x = Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x);
      const y = Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y);
      if (x > 2 && y > 2) return [a, b];
    }
  return null;
}

async function dibujar(nombre: string, resumen: ResumenTuAnio, conFoto: boolean, ancho?: number): Promise<ResultadoTuAnio> {
  const r = await dibujarImagenTuAnio({ resumen, id: resumen.quien.tipo === "persona" ? "persona" : `id-${nombre}`, foto: conFoto ? foto : null, conNodos: true, ancho });
  if (SALIDA) writeFileSync(path.join(SALIDA, `${nombre}.jpg`), r.imagen);
  return r;
}

describe("la imagen de «Tu año» (OL-394)", () => {
  it.each([
    ["persona-con-foto", PERSONA, true],
    ["persona-sin-foto", PERSONA, false],
    ["artista-sin-foto", ARTISTA, false],
    ["lugar-cifras-grandes", LUGAR, true],
    ["artista-con-logros", ARTISTA_CON_LOGROS, true],
  ] as const)("%s: 1080×1350, nada fuera del lienzo ni encimado", async (nombre, resumen, conFoto) => {
    const r = await dibujar(nombre, resumen, conFoto);
    expect(r.tipo).toBe("image/jpeg");
    const meta = await sharp(r.imagen).metadata();
    expect([meta.width, meta.height]).toEqual([1080, 1350]);
    expect(r.nodos.filter(fuera)).toEqual([]);
    expect(encimados(r.nodos)).toBeNull();
    // Lo que dice: el número, la frase, el periodo y el dominio.
    const textos = r.nodos.map((n) => n.texto);
    expect(textos).toContain(String(resumen.protagonista.n < 10_000 ? resumen.protagonista.n : ""));
    expect(textos).toContain(resumen.protagonista.frase);
    expect(textos.some((t) => t.startsWith(`${resumen.periodo.titulo} · `))).toBe(true);
    expect(textos).toContain("somosnosotros.org");
  });

  it("los hitos del artista (OL-445): su línea dice «Reconocimientos y obra» y el número empieza en 360", async () => {
    const r = await dibujarImagenTuAnio({ resumen: ARTISTA_CON_LOGROS, id: "x", foto: null, soloSvg: true, conNodos: true });
    const textos = r.nodos.map((n) => n.texto);
    expect(textos.some((t) => t.startsWith("Reconocimientos y obra"))).toBe(true);
    expect(textos.some((t) => t.includes("2 premios · 1 disco"))).toBe(true);
    expect(tamanoHero("36", undefined, 360)).toBe(360);
  });

  it("a 720 de ancho (la vista previa) sale proporcionada", async () => {
    const r = await dibujar("persona-720", PERSONA, true, 720);
    const meta = await sharp(r.imagen).metadata();
    expect([meta.width, meta.height]).toEqual([720, 900]);
  });

  it("con foto lleva la imagen redonda; sin foto, no", async () => {
    const con = await dibujarImagenTuAnio({ resumen: PERSONA, id: "x", foto, soloSvg: true, conNodos: true });
    const sin = await dibujarImagenTuAnio({ resumen: PERSONA, id: "x", foto: null, soloSvg: true, conNodos: true });
    // Sin foto, el nombre empieza en el margen; con foto, después de ella (96 + 24).
    const x = (r: ResultadoTuAnio) => r.nodos.find((n) => n.texto === "Robscan")!.x;
    expect(x(sin)).toBeCloseTo(80, 0);
    expect(x(con)).toBeCloseTo(200, 0);
  });

  it("una foto que no es imagen (un SVG, basura) se ignora: sale sin foto, nunca rota", async () => {
    const r = await dibujarImagenTuAnio({ resumen: PERSONA, id: "x", foto: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"), soloSvg: true, conNodos: true });
    expect(r.nodos.find((n) => n.texto === "Robscan")!.x).toBeCloseTo(80, 0);
  });

  it("el número protagonista baja de 440 para caber: tres y cuatro cifras", () => {
    expect(tamanoHero("36")).toBe(440);
    expect(tamanoHero("120")).toBeLessThanOrEqual(440);
    expect(tamanoHero("1000")).toBeLessThan(440);
    expect(tamanoHero("1000")).toBeGreaterThanOrEqual(200);
  });

  it("sin «lo más» ni secundarios, solo el número, la frase y el periodo", async () => {
    const r = await dibujarImagenTuAnio({ resumen: { ...ARTISTA, secundarios: [], mas: null }, id: "x", foto: null, soloSvg: true, conNodos: true });
    const textos = r.nodos.map((n) => n.texto);
    expect(textos.some((t) => t.includes("Donde más"))).toBe(false);
    expect(textos).not.toContain("LUGARES");
  });
});
