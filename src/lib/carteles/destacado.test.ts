import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { contraste, respaldoDe } from "../portadasSistema";
import { dibujarDestacado, dibujarPortadaSemana, type NodoTexto, type PedidoDestacado, type ResultadoDestacado } from "./dibujar";
import { cajaDeFoto, cajasDeCarteles, nombreAjustado, type CajaImagen } from "./plantillas/repisa";
import { FORMATOS, MARGEN, type IdFormato } from "./tokens";

/**
 * «Repisa» (OL-505; firmada el 2026-11-02 sobre la tercera vuelta de OL-490, bitácora 522): la tarjeta del artista (su foto de perfil en el
 * círculo, sin portada) y la del lugar (L2 con su portada en el arco; L1 sin ella), en publicación (4:5) e historia (9:16), y la portada de «Esta
 * semana» con los carteles en sus barras. Como las plantillas de «Crear cartel»: cada texto, tal como lo colocó satori, queda dentro del margen,
 * fuera de lo que tapa la interfaz en una historia, sin encimarse con otro, sin cortarse con «…» y nunca encima de una foto; la tinta se lee a
 * 4,5:1 o más sobre el color de la tarjeta. Con `CARTELES_SALIDA=<carpeta>` deja los JPEG ahí para mirarlos.
 */
const SALIDA = process.env.CARTELES_SALIDA;
let fotoAzul: Buffer;
let fotoGris: Buffer;
let portadaCalida: Buffer;
let cartel: Buffer;

const jpeg = (svg: string) => sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
beforeAll(async () => {
  fotoAzul = await jpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#2f6db5"/><circle cx="400" cy="320" r="160" fill="#f2d03a"/></svg>`);
  fotoGris = await jpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#8a8a8a"/><circle cx="400" cy="320" r="160" fill="#eeeeee"/></svg>`);
  portadaCalida = await jpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#e0a15a"/><circle cx="1080" cy="300" r="140" fill="#f6d9a8"/><path d="M0 1000 L420 480 L700 780 L930 560 L1500 1000 Z" fill="#5a2214"/></svg>`);
  cartel = await jpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#1d1d1d"/><rect x="80" y="80" width="640" height="640" fill="#d6452b"/></svg>`);
  if (SALIDA) mkdirSync(SALIDA, { recursive: true });
});

const TOL = 1;
const encima = (a: { x: number; y: number; ancho: number; alto: number }, b: { x: number; y: number; ancho: number; alto: number }) =>
  Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y) > 2;

/** Lo que estaría mal: un texto fuera del margen o de la zona de texto, encima de otro o de una foto, cortado, o tinta sin contraste. */
function problemas(r: ResultadoDestacado, formato: IdFormato, fotos: CajaImagen[] = []): string[] {
  const f = FORMATOS[formato];
  const mal: string[] = [];
  const abajo = Math.max(MARGEN - 8, f.tapaAbajo);
  for (const n of r.nodos) {
    if (n.x < MARGEN - TOL || n.x + n.ancho > f.ancho - MARGEN + TOL) mal.push(`«${n.texto}» se sale de lado`);
    if (n.y < f.tapaArriba - TOL || n.y + n.alto > f.alto - abajo + TOL) mal.push(`«${n.texto}» fuera de la zona de texto`);
    if (n.texto.includes("…")) mal.push(`«${n.texto}» cortado`);
    for (const c of fotos) if (encima(n, c)) mal.push(`«${n.texto}» encima de una foto`);
  }
  for (let i = 0; i < r.nodos.length; i++) for (let j = i + 1; j < r.nodos.length; j++) if (encima(r.nodos[i], r.nodos[j])) mal.push(`«${r.nodos[i].texto}» encima de «${r.nodos[j].texto}»`);
  if (r.recortado) mal.push("algo no cupo");
  const ratio = contraste(r.color.tinta, r.color.base);
  if (ratio < 4.5) mal.push(`la tinta sobre el color con ${ratio.toFixed(2)}:1`);
  return mal;
}
const textos = (nodos: NodoTexto[]) => nodos.map((n) => n.texto).join(" ").replace(/\s+/g, " ");

type Caso = Omit<PedidoDestacado, "formato" | "foto"> & { clave: string; foto: () => Buffer | null };
const ARTISTA = { tipo: "artista" as const, razon: "Artista de la semana" };
const LUGAR = { tipo: "lugar" as const, razon: "Lugar de la semana" };
const CASOS: Caso[] = [
  { clave: "artista-con-fecha", ...ARTISTA, id: "a1", nombre: "Un León Marinero", ceja: "Música · Folk y canción de autor", ciudad: "San Luis Potosí", cuenta: "unleonmarinero", proxima: { mes: "nov", dia: "7", texto: "Sáb 7 de nov, 7:00 pm · Monterrey" }, foto: () => fotoAzul },
  { clave: "artista-largo", ...ARTISTA, id: "a2", nombre: "Colectivo de Ilustración y Fanzine Nube de Papel del Altiplano Potosino", ceja: "Artes visuales · Ilustración", ciudad: "San Miguel de Allende", cuenta: "colectivo.nube.de.papel.altiplano", proxima: { mes: "oct", dia: "17", texto: "Sáb 17 de oct, 11:00 am · Museo Nacional de la Máscara de San Luis Potosí" }, foto: () => fotoAzul },
  { clave: "artista-mayusculas", ...ARTISTA, id: "a3", nombre: "ORQUESTA MEXICANA DE MÚSICA MAYA", ceja: "Música", ciudad: "San Luis Potosí", cuenta: null, proxima: null, foto: () => fotoGris },
  { clave: "lugar-L2", ...LUGAR, id: "l1", nombre: "Museo Federico Silva Escultura Contemporánea", ceja: "Museo", ciudad: "San Luis Potosí", cuenta: "museo_federico_silva", semana: "Esta semana: 2 eventos", foto: () => portadaCalida },
  { clave: "lugar-L1", ...LUGAR, id: "l2", nombre: "La Guarida del Coyote", ceja: "Foro", ciudad: "San Luis Potosí", cuenta: null, semana: null, foto: () => null },
];

describe("la tarjeta «Repisa» de un artista o de un lugar", () => {
  for (const c of CASOS)
    for (const formato of ["4x5", "9x16"] as const)
      it(`${c.clave} ${formato}: todo dentro, nada encimado, cortado ni sobre la foto, y a 4,5:1`, async () => {
        const pedido = { ...c, formato, foto: c.foto(), conNodos: true };
        const r = await dibujarDestacado(pedido);
        expect(r.ancho).toBe(1080);
        expect(r.alto).toBe(FORMATOS[formato].alto);
        expect(problemas(r, formato, [cajaDeFoto(pedido)])).toEqual([]);
        const todo = textos(r.nodos);
        expect(todo).toContain(c.razon.toLocaleUpperCase("es-MX"));
        expect(todo).toContain(c.nombre.split(" ")[0]);
        if (c.cuenta) expect(todo).toContain(`@${c.cuenta}`);
        if (c.proxima) expect(todo).toContain(c.proxima.dia);
        if (c.semana) expect(todo).toContain(c.semana);
        expect(todo).toContain("somosnosotrxs.org");
        if (SALIDA) writeFileSync(path.join(SALIDA, `repisa-${c.clave}-${formato}.jpg`), r.imagen);
      });

  it("el color: de la foto si tiene tono; de una foto casi gris, del respaldo por el id; el mismo id, el mismo color", async () => {
    const azul = await dibujarDestacado({ ...CASOS[0], formato: "4x5", foto: fotoAzul });
    expect(azul.color.deDonde).toBe("foto");
    const gris = await dibujarDestacado({ ...CASOS[2], formato: "4x5", foto: fotoGris });
    expect(gris.color).toMatchObject({ deDonde: "respaldo", origen: respaldoDe("a3") });
    const otraVez = await dibujarDestacado({ ...CASOS[2], formato: "9x16", foto: fotoGris });
    expect(otraVez.color.base).toBe(gris.color.base);
  });

  it("el lugar: L2 toma el color de su portada; L1 (sin portada), el respaldo por su id", async () => {
    const l2 = await dibujarDestacado({ ...CASOS[3], formato: "4x5", foto: portadaCalida });
    expect(l2.color.deDonde).toBe("foto");
    const l1 = await dibujarDestacado({ ...CASOS[4], formato: "4x5", foto: null });
    expect(l1.color).toMatchObject({ deDonde: "respaldo", origen: respaldoDe("l2") });
  });

  it("sin foto legible no se rompe: el símbolo SN en su figura y el color del respaldo", async () => {
    const r = await dibujarDestacado({ ...CASOS[0], formato: "4x5", foto: Buffer.from("no es una imagen"), conNodos: true });
    expect(r.imagen.length).toBeGreaterThan(10_000);
    expect(r.color.deDonde).toBe("respaldo");
    expect(problemas(r, "4x5")).toEqual([]);
  });

  it("sin la línea de la descripción: debajo del nombre solo qué es, la cuenta y la fecha", async () => {
    const r = await dibujarDestacado({ ...CASOS[0], formato: "4x5", foto: fotoAzul, conNodos: true });
    expect(r.nodos.map((n) => n.texto)).toEqual(["nov", "7", "ARTISTA DE LA SEMANA", "Un León Marinero", "Música · Folk y canción de autor · San Luis Potosí", "@unleonmarinero", "Próxima fecha: Sáb 7 de nov, 7:00 pm · Monterrey", "somosnosotrxs.org"]);
  });

  it("a 720 de ancho para la vista previa", async () => {
    const r = await dibujarDestacado({ ...CASOS[3], formato: "4x5", foto: portadaCalida, ancho: 720 });
    const m = await sharp(r.imagen).metadata();
    expect([m.width, m.height]).toEqual([720, 900]);
  });

  it("los nombres hasta 64 letras no se cortan (en un renglón hasta unas 34)", () => {
    const util = 1080 - 2 * MARGEN;
    for (const n of [8, 20, 32, 40, 52, 64]) {
      const nombre = "Nombre largo de una ficha cultural potosina ".repeat(3).slice(0, n).trim();
      expect(nombreAjustado(nombre, util).recortado).toBe(false);
    }
    expect(nombreAjustado("Carlos Alejandro Guevara Requena", util).renglones).toHaveLength(1);
  });
});

describe("la portada de «Esta semana»", () => {
  const SEMANA = {
    id: "semana-san-luis-potosi-2026-10-30",
    ciudad: "San Luis Potosí",
    titulo: "Del viernes 30 de octubre al domingo 1 de noviembre",
    eventos: [
      { cuando: "Vie 30 · 5:30 pm · Aurora Co-Lab", titulo: "Cultura Mística" },
      { cuando: "Sáb 31 · 5:00 pm · Museo Francisco Cossío", titulo: "Merk Local edición Catrinas: concurso al mejor disfraz de catrina y catrín" },
      { cuando: "Dom 1 · 8:00 pm · Parque Tangamanga II", titulo: "Los Auténticos Decadentes y Los Caligaris" },
    ],
    dias: ["Vie 30", "Sáb 31", "Dom 1"],
  };
  for (const formato of ["4x5", "9x16"] as const)
    it(`${formato}: las barras con los carteles, la ciudad, los días y tres eventos; nada sobre un cartel`, async () => {
      const r = await dibujarPortadaSemana({ ...SEMANA, formato, carteles: [cartel, null, cartel], conNodos: true });
      expect(problemas(r, formato, cajasDeCarteles({ ...SEMANA, formato }))).toEqual([]);
      const todo = textos(r.nodos);
      for (const d of SEMANA.dias) expect(todo).toContain(d.toLocaleUpperCase("es-MX"));
      expect(todo).toContain("ESTA SEMANA EN SAN LUIS POTOSÍ");
      expect(todo).toContain("Los Auténticos Decadentes");
      expect(r.color).toMatchObject({ deDonde: "respaldo", origen: respaldoDe(SEMANA.id) });
      if (SALIDA) writeFileSync(path.join(SALIDA, `repisa-semana-${formato}.jpg`), r.imagen);
    });

  it("con un solo evento, una barra", async () => {
    const uno = { ...SEMANA, eventos: SEMANA.eventos.slice(0, 1), dias: SEMANA.dias.slice(0, 1) };
    expect(cajasDeCarteles({ ...uno, formato: "4x5" })).toHaveLength(1);
    const r = await dibujarPortadaSemana({ ...uno, carteles: [cartel], conNodos: true });
    expect(problemas(r, "4x5")).toEqual([]);
  });
});
