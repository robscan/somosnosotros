import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { dibujarDestacado, dibujarPortadaSemana, type NodoTexto, type ResultadoDestacado } from "./dibujar";
import { FORMATOS, MARGEN, type IdFormato } from "./tokens";

/**
 * La tarjeta de la semana de Instagram (OL-479; firmada en OL-477, bitácora 509): artista y lugar, en publicación (4:5) e historia (9:16), con
 * y sin fecha, con nombres cortos y largos, y la portada de «Esta semana». Como las plantillas de «Crear cartel»: cada texto, tal como lo colocó
 * satori, queda dentro del margen, fuera de lo que tapa la interfaz en una historia, sin encimarse con otro y sin cortarse con «…». Con
 * `CARTELES_SALIDA=<carpeta>` deja los JPEG ahí para mirarlos.
 */
const SALIDA = process.env.CARTELES_SALIDA;
let portada: Buffer;
let foto: Buffer;

beforeAll(async () => {
  const p = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#e0a15a"/><circle cx="1080" cy="300" r="140" fill="#f6d9a8"/><path d="M0 1000 L420 480 L700 780 L930 560 L1500 1000 Z" fill="#5a2214"/></svg>`;
  portada = await sharp(Buffer.from(p)).jpeg({ quality: 85 }).toBuffer();
  const f = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#2f6db5"/><circle cx="400" cy="320" r="160" fill="#f2d03a"/></svg>`;
  foto = await sharp(Buffer.from(f)).jpeg({ quality: 85 }).toBuffer();
  if (SALIDA) mkdirSync(SALIDA, { recursive: true });
});

const TOL = 1;
function problemas(r: ResultadoDestacado, formato: IdFormato): string[] {
  const f = FORMATOS[formato];
  const mal: string[] = [];
  const abajo = Math.max(MARGEN - 8, f.tapaAbajo);
  for (const n of r.nodos) {
    if (n.x < MARGEN - TOL || n.x + n.ancho > f.ancho - MARGEN + TOL) mal.push(`«${n.texto}» se sale de lado`);
    if (n.y < f.tapaArriba - TOL || n.y + n.alto > f.alto - abajo + TOL) mal.push(`«${n.texto}» fuera de la zona de texto`);
    if (n.texto.includes("…")) mal.push(`«${n.texto}» cortado`);
  }
  const encima = (a: NodoTexto, b: NodoTexto) => Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y) > 2;
  for (let i = 0; i < r.nodos.length; i++) for (let j = i + 1; j < r.nodos.length; j++) if (encima(r.nodos[i], r.nodos[j])) mal.push(`«${r.nodos[i].texto}» encima de «${r.nodos[j].texto}»`);
  if (r.recortado) mal.push("algo no cupo");
  return mal;
}

const CASOS = [
  { clave: "artista-con-fecha", tipo: "artista" as const, nombre: "Valeria Quiroz", ceja: "Música · Canción", ciudad: "San Luis Potosí", cuenta: "valeriaquiroz", proxima: "Vie 16 de oct, 7:00 pm · Teatro de la Paz" },
  { clave: "artista-largo", tipo: "artista" as const, nombre: "Colectivo de Ilustración y Fanzine Nube de Papel del Altiplano", ceja: "Artes visuales · Ilustración", ciudad: "San Miguel de Allende", cuenta: "colectivo.nube.de.papel.altiplano", proxima: "Sáb 17 de oct, 11:00 am · Museo Nacional de la Máscara de San Luis Potosí" },
  { clave: "artista-sin-fecha", tipo: "artista" as const, nombre: "Renata Saldaña", ceja: "Artes visuales · Pintura", ciudad: "San Luis Potosí", cuenta: "renatasaldana", proxima: null },
  { clave: "lugar", tipo: "lugar" as const, nombre: "Museo Leonora Carrington", ceja: "Museo", ciudad: "San Luis Potosí", cuenta: "museoleonoracarrington", semana: "Esta semana: 2 eventos" },
  { clave: "lugar-sin-instagram", tipo: "lugar" as const, nombre: "Antigua Estación del Ferrocarril Central Mexicano", ceja: "Casa de cultura", ciudad: "San Luis Potosí", cuenta: null, semana: null },
];

describe("la tarjeta de la semana", () => {
  for (const c of CASOS)
    for (const formato of ["4x5", "9x16"] as const)
      it(`${c.clave} ${formato}: todo dentro, nada encimado ni cortado`, async () => {
        const r = await dibujarDestacado({ ...c, formato, portada, foto, conNodos: true });
        expect(r.ancho).toBe(1080);
        expect(r.alto).toBe(FORMATOS[formato].alto);
        expect(problemas(r, formato)).toEqual([]);
        // El nombre y, si tiene, la cuenta y la próxima fecha, están (en renglones).
        const todo = r.nodos.map((n) => n.texto).join(" ");
        expect(todo.replace(/\s+/g, " ")).toContain(c.nombre.split(" ")[0]);
        if (c.cuenta) expect(todo).toContain(`@${c.cuenta}`);
        expect(todo).toContain("somosnosotrxs.org");
        if (SALIDA) writeFileSync(path.join(SALIDA, `destacado-${c.clave}-${formato}.jpg`), r.imagen);
      });

  it("sin portada ni foto legibles, la imagen de relleno con el símbolo SN (nunca una tarjeta rota)", async () => {
    const r = await dibujarDestacado({ ...CASOS[0], formato: "4x5", portada: Buffer.from("no es una imagen"), foto: null, conNodos: true });
    expect(r.imagen.length).toBeGreaterThan(10_000);
    expect(problemas(r, "4x5")).toEqual([]);
  });

  it("la paleta sale del tono de la portada (una portada cálida no da el cielo)", async () => {
    const r = await dibujarDestacado({ ...CASOS[0], formato: "4x5", portada, foto });
    expect(["durazno", "crema", "hueso", "papel", "vino"]).toContain(r.paleta.id);
  });

  it("a 720 de ancho para la vista previa", async () => {
    const r = await dibujarDestacado({ ...CASOS[3], formato: "4x5", portada, ancho: 720 });
    const m = await sharp(r.imagen).metadata();
    expect([m.width, m.height]).toEqual([720, 900]);
  });
});

describe("la portada de «Esta semana»", () => {
  it("la ciudad, los días y tres eventos: todo dentro", async () => {
    const r = await dibujarPortadaSemana({
      ciudad: "San Luis Potosí",
      titulo: "Del viernes 16 al domingo 18 de octubre",
      eventos: [
        { cuando: "Vie 16 · 7:00 pm", titulo: "Valeria Quiroz: canciones nuevas" },
        { cuando: "Sáb 17 · 11:00 am", titulo: "Taller de máscaras para familias en el Museo Nacional de la Máscara" },
        { cuando: "Dom 18 · 8:00 pm", titulo: "DESIERTO: Observación y Espacio" },
      ],
      conNodos: true,
    });
    expect(problemas(r, "4x5")).toEqual([]);
    expect(r.paleta.id).toBe("papel");
    if (SALIDA) writeFileSync(path.join(SALIDA, "destacado-semana.jpg"), r.imagen);
  });
});
