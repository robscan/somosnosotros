import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { informeLugar, presentacionArtista, type Documento } from "../documentos";
import type { EventoPasado } from "../historialFichas";
import { dibujarDocumento } from "./dibujar";
import { contarPaginas, maquetar, partirEnlace, repartir, type Pieza } from "./plantillas/documento";

/**
 * Las páginas de la presentación y del informe (OL-396): miden lo de su formato, nada se sale de la página ni se encima, el reparto en páginas
 * respeta lo que cabe y no deja un rótulo solo al pie. Datos inventados. Con `DOCUMENTO_SALIDA=<carpeta>`, deja los PNG para mirarlos.
 */

const AHORA = new Date("2026-10-12T20:00:00Z");
const Z = "America/Mexico_City";
const lugar = (id: string, nombre: string) => ({ id, slug: id, nombre, portada: null });
const artista = (id: string, nombre: string) => ({ id, slug: id, nombre, foto: null });
function evento(id: string, inicio: string, extra: Partial<EventoPasado> = {}): EventoPasado {
  return { id, slug: id, titulo: `Evento ${id}`, inicio, fin: null, zona: Z, imagen: null, lugar_id: "l-1", sitio_texto: null, sitio_direccion: null, sitio_reservado: false, lugar: lugar("l-1", "Foro La Pirámide"), festival: null, artistas: [], van: 0, cancelado: false, ...extra };
}

const LA_ARTISTA = { id: "a-1", slug: "la-sonora-de-prueba", nombre: "La Sonora de Prueba", detalle: "cumbia y son", tipo: "grupo", ciudad: "San Luis Potosí", descripcion: "Grupo inventado para las pruebas: tocan cumbia, son y lo que les pidan en cualquier foro de la ciudad. Empezaron en 2019 en un patio de la colonia Tequisquiapan y desde entonces no han parado de tocar en bares, plazas y festivales de barrio.", redes: [{ url: "https://instagram.com/sonoradeprueba" }, { url: "https://sonoradeprueba.example" }], foto: null, portada: null };

function presentacion(n: number, proximos = 2): Documento {
  const pasados = Array.from({ length: n }, (_, i) =>
    evento(`p${i}`, new Date(Date.UTC(2026, 9, 10) - i * 9 * 86_400_000).toISOString(), {
      titulo: i % 4 === 0 ? `Noche de cumbia larguísima con invitados especiales y sorpresas número ${i}` : `Tocada ${i}`,
      lugar: i % 3 ? lugar("l-1", "Foro La Pirámide") : lugar("l-2", "Café El Callejón"),
      artistas: [artista("a-1", "La Sonora de Prueba"), ...(i % 2 ? [artista("a-2", "Dúo Invento")] : [])],
      festival: i === 2 ? "Festival de Barrio 2026" : null,
      van: i % 5,
      cancelado: i === 1,
    }),
  );
  const prox = Array.from({ length: proximos }, (_, i) => evento(`f${i}`, new Date(Date.UTC(2026, 9, 20 + i * 3)).toISOString(), { titulo: `Próxima ${i}`, artistas: [artista("a-1", "La Sonora de Prueba")] }));
  return presentacionArtista({ artista: LA_ARTISTA, pasados, proximos: prox, ahora: AHORA });
}

function informe(): Documento {
  const marco = evento("fest", "2026-10-03T00:00:00Z", { titulo: "Festival de Cine de Prueba", clase: "festival", fin: "2026-10-10T05:00:00Z" });
  const actos = Array.from({ length: 14 }, (_, i) =>
    evento(`acto${i}`, `2026-10-0${3 + (i % 6)}T${String(17 + (i % 4)).padStart(2, "0")}:00:00Z`, {
      titulo: `Función ${i}: una película con un título que puede ocupar dos renglones si es largo`,
      festival: "Festival de Cine de Prueba",
      festivalId: "fest",
      artistas: [artista(`d${i % 9}`, `Directora ${i % 9}`), artista(`c${i % 5}`, `Cineasta ${i % 5}`)],
      van: i % 3,
      cancelado: i === 4,
    }),
  );
  const taller = evento("taller", "2026-10-05T16:00:00Z", { titulo: "Taller de guion", clase: "taller", fin: "2026-10-07T20:00:00Z" });
  return informeLugar({ lugar: { id: "l-1", slug: "centro-cultural-de-prueba-ccp", nombre: "Centro Cultural Universitario de Prueba (CCP)", direccion: "Avenida Inventada 550 esq. Calle Falsa, Colonia de Prueba, 78210, San Luis Potosí, S.L.P.", portada: null, zona: Z }, pasados: [marco, ...actos, taller], periodo: "mes", ahora: AHORA });
}

const SALIDA = process.env.DOCUMENTO_SALIDA;

/** Dibuja y comprueba que ningún texto se salga de la página ni se encime con otro. */
async function dibujarYRevisar(d: Documento, formato: "carta" | "a4", nombre: string) {
  const r = await dibujarDocumento({ documento: d, formato, foto: null, conNodos: true, png: !!SALIDA, soloSvg: !SALIDA });
  for (const nodos of r.nodos) {
    for (const n of nodos) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.x + n.ancho).toBeLessThanOrEqual(r.ancho + 0.5);
      expect(n.y + n.alto).toBeLessThanOrEqual(r.alto + 0.5);
    }
    for (let i = 0; i < nodos.length; i++)
      for (let j = i + 1; j < nodos.length; j++) {
        const a = nodos[i];
        const b = nodos[j];
        const encima = a.x < b.x + b.ancho - 1 && b.x < a.x + a.ancho - 1 && a.y < b.y + b.alto - 1 && b.y < a.y + a.alto - 1;
        // Un nodo dentro de otro es el mismo texto (su contenedor), no un encime.
        const dentro = (a.x >= b.x && a.x + a.ancho <= b.x + b.ancho + 1 && a.y >= b.y && a.y + a.alto <= b.y + b.alto + 1) || (b.x >= a.x && b.x + b.ancho <= a.x + a.ancho + 1 && b.y >= a.y && b.y + b.alto <= a.y + a.alto + 1);
        if (encima && !dentro) throw new Error(`«${a.texto}» se encima con «${b.texto}» en ${nombre}`);
      }
  }
  if (SALIDA) {
    mkdirSync(SALIDA, { recursive: true });
    r.paginas.forEach((png, i) => writeFileSync(path.join(SALIDA, `${nombre}-${i + 1}.png`), png));
  }
  return r;
}

describe("las páginas del documento (OL-396)", () => {
  it("carta a 150 ppp (1275 × 1650) y A4 (1240 × 1754), con la cabecera completa en la primera y la corta en las demás", async () => {
    const d = presentacion(16);
    const carta = await dibujarDocumento({ documento: d, formato: "carta", foto: null, conNodos: true });
    expect([carta.ancho, carta.alto]).toEqual([1275, 1650]);
    const meta = await sharp(carta.paginas[0]).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1275, 1650, "jpeg"]);
    expect(carta.paginas.length).toBeGreaterThan(1);
    const textos = (i: number) => carta.nodos[i].map((n) => n.texto);
    expect(textos(0)).toContain("PRESENTACIÓN");
    expect(textos(0).join(" ")).toContain("somosnosotros.org/artistas/la-sonora-de-prueba");
    expect(textos(1)).toContain("Presentación de La Sonora de Prueba");
    expect(textos(1)).toContain(`página 2 de ${carta.paginas.length}`);
    expect(textos(1)).toContain(`2 / ${carta.paginas.length}`);
    const a4 = await dibujarDocumento({ documento: d, formato: "a4", foto: null, soloSvg: true });
    expect([a4.ancho, a4.alto]).toEqual([1240, 1754]);
  });

  it("la presentación: nada se sale ni se encima, en carta y en A4", async () => {
    await dibujarYRevisar(presentacion(3, 1), "carta", "presentacion-corta");
    await dibujarYRevisar(presentacion(16), "carta", "presentacion-larga");
    await dibujarYRevisar(presentacion(16), "a4", "presentacion-larga-a4");
  });

  it("el informe: las cuatro cifras con su definición, la lista y los artistas, sin salirse ni encimarse", async () => {
    const r = await dibujarYRevisar(informe(), "carta", "informe-mes");
    const todo = r.nodos.flat().map((n) => n.texto);
    expect(todo).toContain("PERIODO: OCTUBRE DE 2026");
    expect(todo.join(" ").replace(/\s+/g, " ")).toContain("Personas que marcaron «Voy» en la app. No es asistencia medida.");
    expect(todo).toContain("1 taller con sesiones; cada taller cuenta una vez.");
    expect(todo.some((t) => t.includes("un festival no se suma además de sus actos"))).toBe(true);
  });

  it("la foto que no es imagen se ignora: la cabecera lleva el círculo con el SN", async () => {
    const r = await dibujarDocumento({ documento: presentacion(2, 0), formato: "carta", foto: Buffer.from("<svg/>"), soloSvg: true });
    expect(r.paginas).toHaveLength(1);
  });

  it("la dirección larga de la ficha se parte tras «/» o «-»", () => {
    const r = partirEnlace("somosnosotros.org/lugares/centro-cultural-universitario-bicentenario-cc200", 312);
    expect(r.length).toBeGreaterThan(1);
    expect(r.join("")).toBe("somosnosotros.org/lugares/centro-cultural-universitario-bicentenario-cc200");
    expect(r[0]).toBe("somosnosotros.org/lugares/");
    expect(partirEnlace("somosnosotros.org/lugares/ache", 312)).toEqual(["somosnosotros.org/lugares/ache"]);
  });

  it("cuántas páginas: más fechas, más páginas; A4 es más alta y nunca da más que carta", () => {
    expect(contarPaginas(presentacion(2, 0), "carta")).toBe(1);
    expect(contarPaginas(presentacion(40), "carta")).toBeGreaterThan(contarPaginas(presentacion(8), "carta"));
    expect(contarPaginas(presentacion(40), "a4")).toBeLessThanOrEqual(contarPaginas(presentacion(40), "carta"));
  });

  it("el cuerpo de cada página cabe en lo que deja la cabecera y el pie", () => {
    const m = maquetar(presentacion(40), "carta");
    const usado = (piezas: Pieza[]) => piezas.reduce((s, p, i) => s + (i ? p.antes : 0) + p.alto, 0);
    const resto = m.alto - Math.round(56 * 1.5625) - Math.round(44 * 1.5625) - Math.round(20 * 1.5625) - m.altoPie;
    m.paginas.forEach((pag, i) => expect(usado(pag)).toBeLessThanOrEqual(resto - (i === 0 ? m.cabecera.alto : 0)));
  });
});

describe("repartir (OL-396)", () => {
  const pieza = (alto: number, conLaSiguiente = false, antes = 10): Pieza => ({ el: null as never, alto, antes, conLaSiguiente, tipo: conLaSiguiente ? "rotulo" : "fila" });

  it("llena cada página y pasa a la siguiente lo que no cabe; el aire no cuenta al abrir página", () => {
    const pags = repartir([pieza(40), pieza(40), pieza(40)], 100, 100);
    expect(pags.map((p) => p.length)).toEqual([2, 1]);
  });

  it("un rótulo (y un año) no se quedan solos al pie: bajan con lo que sigue", () => {
    const pags = repartir([pieza(50), pieza(20, true), pieza(20, true), pieza(40)], 110, 200);
    expect(pags.map((p) => p.map((x) => x.alto))).toEqual([[50], [20, 20, 40]]);
  });

  it("la primera página puede tener menos sitio que las demás (la cabecera completa)", () => {
    const pags = repartir([pieza(60), pieza(60), pieza(60), pieza(60)], 70, 200);
    expect(pags.map((p) => p.length)).toEqual([1, 3]);
  });

  it("una pieza más alta que la página va sola en la suya", () => {
    const pags = repartir([pieza(30), pieza(500), pieza(30)], 100, 100);
    expect(pags.map((p) => p.map((x) => x.alto))).toEqual([[30], [500], [30]]);
  });
});
