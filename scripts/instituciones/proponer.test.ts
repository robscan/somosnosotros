import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { SIN_PARAMETROS } from "../../src/lib/ciudadParametros";
import { localAIso } from "../../src/lib/fechas";
import { etiquetaDeForma } from "../../src/lib/rutinas/formaEvento";
import { baseFalsa, type Fila } from "../../src/lib/rutinas/baseFalsa";
import type { CiudadDeEvento } from "../../src/lib/rutinas/publicarEvento";
import { aceptarCorrida } from "./aceptar-corrida";
import { armarPropuestas, comprobar, esImagenLocal, lineasDeInforme, resumenDeCarga, type ArchivoPropuestas, type Contexto } from "./proponer";

/**
 * OL-462 · El cargador de propuestas desde un JSON, con una base en memoria (sin red ni Storage reales): arma las propuestas con la forma de la
 * rutina, las comprueba como la bandeja y, aceptadas con `aceptar-corrida` tal cual, el festival queda como marco con sus actos colgados, cada
 * acto con su cartel y sus artistas ligados.
 */

const ZONA = "America/Mexico_City";
const local = (x: string) => localAIso(x, ZONA)!;
const AHORA = new Date("2026-10-27T18:00:00Z");
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const CORRIDA = "c0000000-0000-4000-8000-000000000462";
const AURORA = "f657a798-8b08-49b5-8a1e-7946a35de6e7";
const BALLROOM = "a0000000-0000-4000-8000-0000000000b1";
const OCULTA = "a0000000-0000-4000-8000-0000000000c2";
const SUBIDA = "https://proyecto.supabase.co/storage/v1/object/public/fotos/lugares/x/propuesta-1.jpg";
const SLP: CiudadDeEvento = { slug: "san-luis-potosi", nombre: "San Luis Potosí", alias: ["Soledad de Graciano Sánchez"], lat: 22.1497, lng: -100.9764, zona: ZONA, radioKm: 15, parametros: SIN_PARAMETROS };

const archivo = (): ArchivoPropuestas => ({
  ciudad: "san-luis-potosi",
  fuente: "Carteles del festival, enviados por el founder",
  artistas: [
    { nombre: "Martha Franco", disciplina: "otro", detalle: "Meditación guiada" },
    { nombre: "DJ Afalefe", disciplina: "musica", detalle: "DJ" },
    // Ya tiene ficha: no se propone, se liga a ella.
    { nombre: "ballroom slp", disciplina: "danza", tipo: "colectivo" },
  ],
  eventos: [
    { titulo: "Meditación «Percepciones interiores»", festival: "Cultura Mística", fecha: "2026-10-30", hora: "17:30", hora_fin: "18:15", lugar: "Aurora Co-Lab", precio: "Cooperación voluntaria", artistas: ["Martha Franco"], imagen: "./programa-viernes.jpg" },
    { titulo: "Cultura Mística", clase: "festival", fecha: "2026-10-30", hora: "16:00", lugar: "Aurora Co-Lab", precio: "Entrada libre", descripcion: "Primera emisión.", imagen: "./cartel.jpg", artistas: ["Ballroom SLP"] },
    { titulo: "DJ Afalefe", festival: "Cultura Mística", fecha: "2026-10-31", hora: "21:30", hora_fin: "01:00", lugar: "Aurora Co-Lab", precio: "Sin costo", artistas: ["DJ Afalefe", "Quien Sea"], imagen: "./programa-sabado.jpg" },
    { titulo: "Taller de sahumerios", clase: "taller", festival: "cultura mistica", fecha: "2026-11-01", hora: "14:30", hora_fin: "15:30", lugar: "Aurora Co-Lab", precio: "$130 (cooperación, incluye materiales)", artistas: ["Oculta"] },
  ],
});
const contexto = (cambios: Partial<Contexto> = {}): Contexto => ({
  corrida: CORRIDA,
  ciudad: { nombre: "San Luis Potosí", zona: ZONA },
  leida: AHORA.toISOString(),
  artistas: [{ id: BALLROOM, nombre: "Ballroom SLP" }],
  lugares: [{ id: AURORA, nombre: "Aurora Co-Lab" }],
  festivales: [],
  imagenes: new Map([
    ["./cartel.jpg", SUBIDA],
    ["./programa-viernes.jpg", SUBIDA.replace("-1", "-2")],
    ["./programa-sabado.jpg", SUBIDA.replace("-1", "-3")],
  ]),
  ...cambios,
});

describe("armar las propuestas de un JSON (OL-462)", () => {
  it("con la forma de la rutina: el festival como marco con sus actos, cada acto apuntando a él; artistas por propuesta o por ficha", () => {
    const { filas, errores, notas } = armarPropuestas(archivo(), contexto());
    expect(errores).toEqual([]);
    expect(filas.map((f) => [f.tipo, f.datos.titulo ?? f.datos.nombre])).toEqual([
      ["artista", "Martha Franco"],
      ["artista", "DJ Afalefe"],
      // El festival antes que sus actos, aunque en el archivo vaya después de uno.
      ["evento", "Cultura Mística"],
      ["evento", "Meditación «Percepciones interiores»"],
      ["evento", "DJ Afalefe"],
      ["evento", "Taller de sahumerios"],
    ]);
    expect(filas.every((f) => f.corrida_id === CORRIDA && f.estado === "propuesta" && f.fuente === "Carteles del festival, enviados por el founder")).toBe(true);
    const [martha, , festival, meditacion, dj, taller] = filas;
    expect(martha.datos).toMatchObject({ nombre: "Martha Franco", disciplina: "otro", detalle: "Meditación guiada", tipo: "solista", ciudad: "San Luis Potosí", redes: [] });
    // El marco: sus actos, del primero al fin del último (la fiesta hasta la 1:00 del domingo no; el taller del domingo, sí).
    expect(festival.datos).toMatchObject({ clase: "festival", titulo: "Cultura Mística", programa: "Cultura Mística", actos: 3, inicio: local("2026-10-30T16:00"), termina: local("2026-11-01T15:30"), lugar: "Aurora Co-Lab", precio: "Gratis", imagen: SUBIDA });
    expect(festival.datos.artistas).toEqual([{ nombre: "Ballroom SLP", id: BALLROOM }]);
    expect(festival.datos).not.toHaveProperty("fin");
    // Cada acto como `hacerActo` de la rutina.
    expect(meditacion.datos).toMatchObject({ marco_propuesto: festival.id, programa: "Cultura Mística", espera: "Se publica cuando aceptes el festival «Cultura Mística».", clase: "puntual", inicio: local("2026-10-30T17:30"), fin: local("2026-10-30T18:15"), precio: "Cooperación solidaria" });
    expect(meditacion.datos.artistas).toEqual([{ nombre: "Martha Franco", propuesta: martha.id }]);
    // Hasta la 1:00: del día siguiente.
    expect(dj.datos).toMatchObject({ inicio: local("2026-10-31T21:30"), fin: local("2026-11-01T01:00"), precio: "Gratis" });
    expect(dj.datos.artistas).toEqual([{ nombre: "DJ Afalefe", propuesta: filas[1].id }, { nombre: "Quien Sea" }]);
    // El taller sigue siendo taller; su costo con texto queda tal cual (al publicar: $130 y la nota en la descripción).
    expect(taller.datos).toMatchObject({ clase: "taller", marco_propuesto: festival.id, precio: "$130 (cooperación, incluye materiales)" });
    expect(taller.datos).not.toHaveProperty("imagen");
    // La tarjeta de la bandeja lo dice como a lo de la rutina.
    expect(etiquetaDeForma(festival.datos, AHORA, ZONA)?.que).toBe("Festival · 3 actos");
    expect(etiquetaDeForma(dj.datos, AHORA, ZONA)?.que).toBe("Acto de «Cultura Mística»");
    expect(notas).toEqual(["«ballroom slp» ya tiene ficha: no se propone; sus eventos se ligan a ella.", "«Quien Sea» (en «DJ Afalefe») no tiene ficha ni está en `artistas`: no se ligará.", "«Oculta» (en «Taller de sahumerios») no tiene ficha ni está en `artistas`: no se ligará."]);
    expect(resumenDeCarga(filas, "cultura-mistica", 3)).toEqual({ fuente: "carga manual", archivo: "cultura-mistica", lugares: 0, artistas: 2, eventos: 4, festivales: 1, actos: 3, imagenes: 3, propuestos: 6 });
  });

  it("un acto de un festival ya registrado en la ciudad cuelga de él (`marco`); un lugar que ya está no se propone", () => {
    const a: ArchivoPropuestas = {
      ciudad: "san-luis-potosi",
      fuente: "Carga",
      lugares: [{ nombre: "Aurora Co-Lab", tipo: "foro" }, { nombre: "Foro Nuevo", tipo: "foro", lat: 22.15, lng: -100.97, direccion: "Calle 1" }],
      eventos: [{ titulo: "Concierto", festival: "Xantolo 2026", fecha: "2026-11-01", hora: "18:00", lugar: "Foro Nuevo" }],
    };
    const { filas, errores, notas } = armarPropuestas(a, contexto({ festivales: [{ id: "f0000000-0000-4000-8000-000000000001", titulo: "Xantolo 2026" }] }));
    expect(errores).toEqual([]);
    expect(filas.map((f) => f.tipo)).toEqual(["lugar", "evento"]);
    expect(filas[0].datos).toMatchObject({ nombre: "Foro Nuevo", tipo: "foro", lat: 22.15, lng: -100.97, direccion: "Calle 1", ciudad: "San Luis Potosí" });
    expect(filas[1].datos).toMatchObject({ marco: { id: "f0000000-0000-4000-8000-000000000001", titulo: "Xantolo 2026" }, clase: "puntual" });
    expect(filas[1].datos).not.toHaveProperty("marco_propuesto");
    expect(notas).toEqual(["El lugar «Aurora Co-Lab» ya está en el directorio: no se propone."]);
  });

  it("lo que está mal se dice y no se escribe nada", () => {
    const a: ArchivoPropuestas = {
      ciudad: "san-luis-potosi",
      fuente: "",
      artistas: [{ nombre: "Uno", disciplina: "magia" }, { nombre: "uno" }, { nombre: "Dos", detalle: "un detalle que pasa con mucho de las cuarenta letras" }],
      eventos: [
        { titulo: "Sin hora", fecha: "2026-10-30", hora: "tarde", lugar: "Aurora Co-Lab" },
        { titulo: "Al revés", fecha: "2026-10-30", hora: "18:00", hora_fin: "17:00", fecha_fin: "2026-10-30", lugar: "Aurora Co-Lab" },
        { titulo: "Huérfano", festival: "Festival Fantasma", fecha: "2026-10-30", hora: "18:00", lugar: "Aurora Co-Lab" },
        { titulo: "Sin cartel", fecha: "2026-10-30", hora: "18:00", lugar: "Aurora Co-Lab", imagen: "./no-esta.jpg" },
        { titulo: "Cartel ajeno", fecha: "2026-10-31", hora: "18:00", lugar: "Aurora Co-Lab", imagen: "http://inseguro.mx/a.jpg" },
        { titulo: "Antes", festival: "Fest", fecha: "2026-10-29", hora: "18:00", lugar: "Aurora Co-Lab" },
        { titulo: "Fest", clase: "festival", fecha: "2026-10-30", hora: "16:00", lugar: "Aurora Co-Lab" },
      ],
    };
    const { errores } = armarPropuestas(a, contexto());
    expect(errores).toEqual([
      "Falta `fuente` (lo que dice la bandeja como fuente).",
      "artistas[0]: la disciplina «magia» no existe.",
      "artistas[1]: «uno» está dos veces.",
      "artistas[2]: el detalle de «Dos» pasa de 40 letras.",
      "«Sin hora»: la fecha (AAAA-MM-DD) o la hora (HH:MM) no se entienden.",
      "«Al revés»: la hora de fin no se entiende o es antes del inicio.",
      "«Huérfano»: no encontré el festival «Festival Fantasma» en el archivo ni en la ciudad.",
      "«Sin cartel»: no encontré la imagen ./no-esta.jpg.",
      "«Cartel ajeno»: la imagen tiene que ser un archivo de la carpeta o una dirección https pública.",
      "«Antes» empieza antes que su festival «Fest».",
    ]);
    expect(esImagenLocal("./a.jpg")).toBe(true);
    expect(esImagenLocal("cartel.jpg")).toBe(true);
    expect(esImagenLocal("https://x.mx/a.jpg")).toBe(false);
  });
});

// ---------- de punta a punta: proponer → aceptar-corrida (sin tocarlo) ----------
let jpeg: Buffer;
beforeAll(async () => {
  jpeg = await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#7a22dd" } }).jpeg().toBuffer();
});

function mundo(filas: Fila[]) {
  return baseFalsa(
    {
      perfiles: [{ id: ADMIN, rol: "admin" }],
      ciudades: [{ slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: ZONA, alias: ["Soledad de Graciano Sánchez"], estado: "abierta", parametros: {} }],
      rutinas_corridas: [{ id: CORRIDA, tipo: "agendas", ciudad: "san-luis-potosi", estado: "terminada" }],
      lugares: [{ id: AURORA, nombre: "Aurora Co-Lab", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Xicoténcatl 410", lat: 22.149, lng: -100.98 }],
      artistas: [
        { id: BALLROOM, nombre: "Ballroom SLP", ciudad: "San Luis Potosí", visible: true },
        { id: OCULTA, nombre: "Oculta", ciudad: "San Luis Potosí", visible: false },
      ],
      eventos: [],
      eventos_artistas: [],
      propuestas: filas.map((f, i) => ({ ...f, creado_en: `2026-10-27T17:00:${String(i).padStart(2, "0")}Z` })),
    },
    {
      eventos_parecidos: () => [],
      // `aceptar_propuesta_como` (migración 20261022170000): crea la ficha de un artista y marca la propuesta.
      aceptar_propuesta_como: (args, tablas) => {
        const p = tablas.propuestas.find((x) => x.id === args.p_id)!;
        let fichaId: string | null = null;
        if (p.tipo === "artista") {
          fichaId = randomUUID();
          tablas.artistas.push({ id: fichaId, ...(args.p_ficha as Fila), visible: true, creado_por: args.p_autor });
        }
        Object.assign(p, { estado: "aceptada", ficha_id: fichaId, resuelto_por: args.p_autor, resuelto_en: AHORA.toISOString() });
        return { estado: "aceptada", ficha_id: fichaId, slug: null };
      },
    },
  );
}

describe("de punta a punta: la corrida cargada se acepta con aceptar-corrida (OL-462)", () => {
  it("comprobar dice que todo pasa (un acto, como evento suelto) sin escribir nada", async () => {
    const { filas } = armarPropuestas(archivo(), contexto());
    const base = mundo([]);
    const hechas = await comprobar(base.db, filas, SLP, [{ id: AURORA, nombre: "Aurora Co-Lab", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Xicoténcatl 410" }], ADMIN, AHORA);
    expect(hechas.map((c) => [c.nombre, c.ok, c.motivo])).toEqual([
      ["Martha Franco", true, null],
      ["DJ Afalefe", true, null],
      ["Cultura Mística", true, null],
      ["Meditación «Percepciones interiores»", true, null],
      ["DJ Afalefe", true, null],
      ["Taller de sahumerios", true, null],
    ]);
    // Ballroom SLP ya tiene ficha: el festival la ligaría; la oculta, no.
    expect(hechas[2].artistas).toBe(1);
    expect(hechas[5].artistas).toBe(0);
    expect(base.operaciones.filter((o) => o.op !== "select" && o.op !== "rpc")).toEqual([]);
    const informe = lineasDeInforme({ simular: true, carpeta: "x", ciudad: "San Luis Potosí", zona: ZONA, corrida: null, filas, comprobadas: hechas, errores: [], notas: [] }).join("\n");
    expect(informe).toContain("- Propuestas: 6 (lugar 0 · artista 2 · evento 4)");
    expect(informe).toContain("- FESTIVAL (3 actos, hasta 2026-11-01 15:30) · 2026-10-30 16:00 · Cultura Mística · Aurora Co-Lab · Gratis · con cartel · con Ballroom SLP (ficha) · ok · 1 ficha de artista ya existentes");
    expect(informe).toContain("-   acto de «Cultura Mística» · puntual · 2026-10-31 21:30–01:00 · DJ Afalefe · Aurora Co-Lab · Gratis · con cartel · con DJ Afalefe (propuesta), Quien Sea (sin ficha) · ok");
  });

  it("artistas, luego el festival, luego sus actos: colgados de él, con su cartel y sus artistas", async () => {
    const { filas } = armarPropuestas(archivo(), contexto());
    const base = mundo(filas as unknown as Fila[]);
    const subidas: string[] = [];
    const pedir = (async (url: string) => (url.startsWith("https://proyecto.supabase.co/") ? new Response(new Uint8Array(jpeg)) : new Response("no", { status: 404 }))) as unknown as typeof fetch;
    const { lineas } = await aceptarCorrida(
      { db: base.db, mapboxToken: null, ahora: () => AHORA, dormir: async () => undefined, pedir, almacen: () => ({ subir: async (ruta: string) => (subidas.push(ruta), `https://fotos.example.com/${ruta}`) }) },
      { corrida: CORRIDA, autor: ADMIN, simular: false, solo: null, limite: null },
    );
    expect(lineas.map((l) => [l.tipo, l.nombre, l.resultado.ok])).toEqual([
      ["artista", "Martha Franco", true],
      ["artista", "DJ Afalefe", true],
      ["evento", "Cultura Mística", true],
      ["evento", "Meditación «Percepciones interiores»", true],
      ["evento", "DJ Afalefe", true],
      ["evento", "Taller de sahumerios", true],
    ]);
    const ev = (t: string) => base.tablas.eventos.find((e) => e.titulo === t)!;
    const festival = ev("Cultura Mística");
    expect(festival).toMatchObject({ clase: "festival", lugar_id: AURORA, creado_por: ADMIN, origen: "rutina-agendas" });
    for (const t of ["Meditación «Percepciones interiores»", "DJ Afalefe", "Taller de sahumerios"]) expect(ev(t)).toMatchObject({ evento_padre_id: festival.id, lugar_id: AURORA });
    expect(ev("Taller de sahumerios")).toMatchObject({ clase: "taller", precio: "$130" });
    expect(String(ev("Taller de sahumerios").descripcion)).toContain("Costo: $130 (cooperación, incluye materiales).");
    // El periodo del festival, de su primer acto al último.
    expect(festival).toMatchObject({ inicio: local("2026-10-30T17:30"), fin: local("2026-11-01T15:30") });
    // Carteles: el del festival y los de los dos actos con imagen.
    expect(subidas).toHaveLength(3);
    expect(ev("DJ Afalefe").imagen).toMatch(/^https:\/\/fotos\.example\.com\/lugares\/.+\/evento-.+\.jpg$/);
    expect(ev("Taller de sahumerios").imagen ?? null).toBeNull();
    // Artistas: los propuestos ya aceptados y la ficha que existía; ni el nombre sin ficha ni la ficha oculta.
    const fichaDe = (n: string) => base.tablas.artistas.find((a) => a.nombre === n)!.id;
    const ligas = (t: string) => base.tablas.eventos_artistas.filter((x) => x.evento_id === ev(t).id).map((x) => [x.artista_id, x.orden]);
    expect(ligas("Cultura Mística")).toEqual([[BALLROOM, 0]]);
    expect(ligas("Meditación «Percepciones interiores»")).toEqual([[fichaDe("Martha Franco"), 0]]);
    expect(ligas("DJ Afalefe")).toEqual([[fichaDe("DJ Afalefe"), 0]]);
    expect(ligas("Taller de sahumerios")).toEqual([]);
    // Cada propuesta, ligada a lo que creó.
    expect(base.tablas.propuestas.every((p) => p.estado === "aceptada" && p.ficha_id)).toBe(true);
  });
});
