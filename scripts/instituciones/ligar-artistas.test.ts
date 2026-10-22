import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { localAIso } from "../../src/lib/fechas";
import { baseFalsa, type Fila } from "../../src/lib/rutinas/baseFalsa";
import {
  armarPlan,
  detalleDeAgenda,
  disciplinaDeArtista,
  DETALLE_ENSAMBLE_ESTADO,
  emparejar,
  escribirPlan,
  FUENTE,
  informeDe,
  leerAgendas,
  leerBase,
  lineaDeCifras,
  motivoNoArtista,
  nombreATope,
  primeros,
  tipoDeNombre,
  type Base,
  type EventoBase,
  type FilaAgenda,
} from "./ligar-artistas";

const CIUDAD = "San Luis Potosí";
const PDF_MARZO = "https://agenda.example/Marzo_2026.pdf";
const PDF_OCTUBRE = "https://agenda.example/Octubre_2026.pdf";
const LEIDA = "2026-10-20T17:34:00.000Z";

const fila = (f: Partial<FilaAgenda> & Pick<FilaAgenda, "titulo" | "fecha">): FilaAgenda => ({ hora: "19:00", descripcion: "", enlace: PDF_MARZO, artistas: [], archivo: "eventos-2026-03.json", leida: LEIDA, ...f });
const evento = (id: string, titulo: string, fecha: string, hora = "19:00", extra: Partial<EventoBase> = {}): EventoBase => ({
  id,
  titulo,
  inicio: localAIso(`${fecha}T${hora}`)!,
  zona: "America/Mexico_City",
  lugar_id: null,
  sitio_texto: "Teatro de la Paz",
  clase: "puntual",
  borrador: false,
  visible: true,
  origen: `agenda-secult-${fecha.slice(0, 7)}`,
  ...extra,
});

// ---------- la lectura de la carpeta ----------
describe("leerAgendas", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "ligar-artistas-"));
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }));
  it("lee los archivos de la lectura en orden, sin los .lectura.json ni otros, y anota de dónde y cuándo", () => {
    writeFileSync(join(carpeta, "eventos-enero.json"), JSON.stringify([{ titulo: "Serenata", fecha: "2026-01-08", hora: "19:00", artistas: ["Banda"] }]));
    writeFileSync(join(carpeta, "eventos-2026-02.json"), JSON.stringify([{ titulo: "Recital", fecha: "2026-02-03", hora: "18:00" }, { fecha: "sin título" }]));
    writeFileSync(join(carpeta, "eventos-2026-02.lectura.json"), JSON.stringify({ mes: "2026-02" }));
    writeFileSync(join(carpeta, "otro.json"), JSON.stringify([{ titulo: "No", fecha: "2026-02-03" }]));
    const filas = leerAgendas(carpeta);
    expect(filas.map((f) => [f.archivo, f.titulo])).toEqual([
      ["eventos-2026-02.json", "Recital"],
      ["eventos-enero.json", "Serenata"],
    ]);
    expect(filas.every((f) => !Number.isNaN(Date.parse(f.leida)))).toBe(true);
    expect(leerAgendas(join(carpeta, "eventos-enero.json"))).toHaveLength(1);
  });
});

// ---------- cada fila con su evento ----------
describe("emparejar", () => {
  const lugares = [{ id: "teatro", nombre: "Teatro de la Paz" }];
  const eventos = [
    evento("a1", "Serenata en Plaza de Armas", "2026-03-05", "12:00"),
    evento("a2", "Serenata en Plaza de Armas", "2026-03-05", "19:00"),
    evento("otro-dia", "Serenata en Plaza de Armas", "2026-03-12"),
    // Lo que ya estaba antes de la carga (otra procedencia): la fila no entró por parecida.
    evento("viejo", "Coro Allegro en concierto", "2026-04-02", "18:00", { origen: null, lugar_id: "teatro", sitio_texto: null }),
  ];
  it("el de la agenda con el mismo título ese día, el más cercano en hora; si no, el parecido que ya estaba; si no, sin evento", () => {
    const { pares, sinEvento } = emparejar(
      [
        fila({ titulo: "SERENATA en plaza de armas", fecha: "2026-03-05", hora: "18:30" }),
        fila({ titulo: "Concierto: Coro Allegro", fecha: "2026-04-02", hora: "18:00", lugar: "Teatro de la Paz" }),
        fila({ titulo: "Recital que no entró", fecha: "2026-04-02" }),
      ],
      eventos,
      lugares,
    );
    expect(pares.map((p) => [p.evento.id, p.como])).toEqual([
      ["a2", "agenda"],
      ["viejo", "parecido"],
    ]);
    expect(sinEvento.map((f) => f.titulo)).toEqual(["Recital que no entró"]);
  });
});

// ---------- lo que la agenda dice de un artista ----------
describe("detalleDeAgenda", () => {
  it.each([
    ["Son del Aire", "Concierto del trío de son jarocho Son del Aire en el jardín.", "Trío de son jarocho", "musica"],
    ["Carlos de Santos", "Concierto de Carlos de Santos en clarinete y Óscar Loredo en guitarra.", "Clarinete", "musica"],
    ["Óscar Loredo", "Concierto de Carlos de Santos en clarinete y Óscar Loredo en guitarra.", "Guitarra", "musica"],
    ["Iván Petrenko", "Con Raquel Montaño en clarinete y Iván Petrenko en sax soprano, dirigido por Enrique Salas.", "Sax soprano", "musica"],
    ["Paola del Carmen", "Concierto de la Orquesta Sinfónica de San Luis con la solista Paola del Carmen, bajo la dirección de Enrique Salas.", "Solista", "musica"],
    ["Óliver Paredes", "Concierto didáctico con Óliver Paredes como narrador y Enrique Salas como director.", "Narrador", "letras"],
    ["Ana López", "Recital de Ana López, soprano, con piano.", "Soprano", "musica"],
    ["Rosalba Núñez Cruz", "Presentación del libro de la poeta Rosalba Núñez Cruz.", "Poeta", "letras"],
    ["Klang Nord", "Concierto del ensamble alemán Klang Nord.", "Ensamble alemán", "musica"],
    ["Teo Barrera", "Danza del Grupo Tlali-Xoco y el intérprete Teo Barrera.", "Intérprete", null],
  ])("«%s» → «%s»", (nombre, texto, detalle, disciplina) => {
    expect(detalleDeAgenda(nombre, [texto])).toEqual({ detalle, disciplina });
  });

  it("los ensambles del Estado dicen «Ensamble del Gobierno del Estado»", () => {
    expect(detalleDeAgenda("Banda de Música de Gobierno del Estado", ["Serenata de la Banda."]).detalle).toBe(DETALLE_ENSAMBLE_ESTADO);
    expect(detalleDeAgenda("Banda Sinfónica del Estado", []).detalle).toBe(DETALLE_ENSAMBLE_ESTADO);
  });

  it("entre el papel y el nombre no cabe otro nombre", () => {
    expect(detalleDeAgenda("Lunatronic", ["Sesión con DJ Pulso MTY y Lunatronic."]).detalle).toBeNull();
    expect(detalleDeAgenda("Diego Sauceda", ["Lectura del Colectivo Pan y Sal con Diego Sauceda."]).detalle).toBeNull();
    expect(detalleDeAgenda("Paola del Carmen", ["Concierto con la solista Paola del Carmen, bajo la dirección de Enrique Salas."]).detalle).toBe("Solista");
  });

  it("sin papel, con un papel que no dice nada («el grupo») o en otra frase: nada", () => {
    expect(detalleDeAgenda("Coro Allegro", ["Concierto de la Orquesta con coros."]).detalle).toBeNull();
    expect(detalleDeAgenda("Ventanal", ["Concierto del grupo Ventanal."]).detalle).toBeNull();
    expect(detalleDeAgenda("Ana Ruiz", ["Habla la pianista. Después, Ana Ruiz."]).detalle).toBeNull();
    expect(detalleDeAgenda("Ana Ruiz", [""]).detalle).toBeNull();
  });

  it("busca en cada texto hasta que alguno lo diga", () => {
    expect(detalleDeAgenda("Ana Ruiz", ["Concierto de piano.", "Con la cantante Ana Ruiz."]).detalle).toBe("Cantante");
  });
});

describe("disciplinaDeArtista", () => {
  const nada = { detalle: null, disciplina: null };
  it("primero el nombre, luego su papel, luego lo que más se repite en sus eventos; sin nada, por completar", () => {
    expect(disciplinaDeArtista("Coro Allegro", { detalle: "Poeta", disciplina: "letras" }, [{ titulo: "Obra: X" }])).toBe("musica");
    expect(disciplinaDeArtista("Ana Ruiz", { detalle: "Poeta", disciplina: "letras" }, [{ titulo: "Concierto" }])).toBe("letras");
    expect(disciplinaDeArtista("Ana Ruiz", nada, [{ titulo: "Obra: X" }, { titulo: "Concierto de gala" }, { titulo: "Concierto de jazz" }])).toBe("musica");
    expect(disciplinaDeArtista("Ana Ruiz", nada, [{ titulo: "Exposición: Raíces" }, { titulo: "Obra: Y" }])).toBe("artes_visuales");
    expect(disciplinaDeArtista("Ana Ruiz", nada, [{ titulo: "Conferencia", descripcion: "Charla." }])).toBe("por_completar");
    expect(disciplinaDeArtista("Viento Sur", nada, [{ titulo: "Concierto" }], ["Grupo de Danza Folclórica Viento Sur"])).toBe("danza");
  });
});

describe("tipoDeNombre y motivoNoArtista", () => {
  it.each([
    ["Coro Allegro", "grupo"],
    ["Los Trasnochados", "grupo"],
    ["Foro360 Teatro Musical", "grupo"],
    ["Carlos de Santos y Óscar Loredo", "grupo"],
    ["Colectivo Pan y Sal", "colectivo"],
    ["Taller de Escena 60 y más", "colectivo"],
    ["Comunidad de cantores de S.L.P.", "colectivo"],
    ["Selene", "solista"],
    ["Xiadani Robles Ugalde", "solista"],
  ])("«%s» es %s", (nombre, tipo) => {
    expect(tipoDeNombre(nombre)).toBe(tipo);
  });

  it("si el nombre no lo dice, sus variantes o su detalle", () => {
    expect(tipoDeNombre("Pan y Sal", ["Colectivo Pan y Sal"])).toBe("colectivo");
    expect(tipoDeNombre("El Brujo y la Carpa del Arte", ["Grupo teatral"])).toBe("grupo");
    expect(tipoDeNombre("Ana Ruiz", ["Pianista"])).toBe("solista");
  });

  it("nombreATope: hasta 80, cortado en un espacio", () => {
    const largo = "Orquesta de guitarras de la Escuela Estatal de Iniciación Musical Julián Carrillo";
    expect(largo.length).toBeGreaterThan(80);
    expect(nombreATope(largo)).toBe("Orquesta de guitarras de la Escuela Estatal de Iniciación Musical Julián");
    expect(nombreATope("  Coro   Allegro ")).toBe("Coro Allegro");
  });

  it.each([
    ["Club Rotario San Luis Potosí", "institución o asociación"],
    ["Fundación Raíces A.C.", "institución o asociación"],
    ["Delegación San Luis Potosí del Colegio de Danza", "institución o asociación"],
    ["Escuela Estatal de Iniciación Musical Julián Carrillo", "institución o asociación"],
    ["Alumnado de la Universidad de Aguascalientes", "alumnado de una escuela"],
    ["Alumnos de la Academia Allegro", "alumnado de una escuela"],
    ["Talleres de danza del IPBA", "varios grupos a la vez"],
    ["Compañías dancísticas del IPBA", "varios grupos a la vez"],
    ["Coro Allegro", null],
    ["Comunidad de cantores de S.L.P.", null],
    ["Taller de Danza Árabe del IPBA", null],
    ["Club Escena Teatro", "institución o asociación"],
  ])("«%s» → %s", (nombre, motivo) => {
    expect(motivoNoArtista(nombre)).toBe(motivo);
  });
});

// ---------- el plan, con un JSON y una base falsos ----------
const pargazz = { id: "f-pargazz", nombre: "Pargazz", tipo: "grupo", disciplina: "musica", descripcion: "Dúo de jazz manouche de Carlos de Santos y Óscar Loredo.", visible: true };
function baseDePrueba(): Base {
  return {
    eventos: [
      evento("e-mujer", "Concierto por el Día Internacional de la Mujer", "2026-03-06"),
      evento("e-ser1", "Serenata en Plaza de Armas", "2026-03-05"),
      evento("e-ser2", "Serenata en Plaza de Armas", "2026-03-12"),
      evento("e-pargazz", "Gitanos mexicanos 2ª edición: PARGAZZ", "2026-10-16", "19:00", { sitio_texto: "Museo Francisco Cossío" }),
      evento("e-coro", "Coro Allegro en concierto", "2026-04-02", "18:00", { origen: null, lugar_id: "l-teatro", sitio_texto: null }),
      evento("e-rotario", "Concierto con causa", "2026-04-03"),
      evento("e-varios", "Recital de primavera", "2026-04-04"),
    ],
    lugares: [{ id: "l-teatro", nombre: "Teatro de la Paz" }],
    artistas: [
      { id: "f-osslp", nombre: "Orquesta Sinfónica de San Luis Potosí", tipo: "grupo", disciplina: "musica", visible: true },
      pargazz,
      { id: "f-oculta", nombre: "Ficha Oculta", tipo: "solista", disciplina: "musica", visible: false },
      { id: "f-go1", nombre: "Renata Ibarra Solís", tipo: "solista", disciplina: "letras", visible: true },
      { id: "f-go2", nombre: "Renata Ibarra Cano", tipo: "solista", disciplina: "letras", visible: true },
    ],
    // La orquesta ya estaba ligada a su concierto, en el lugar 0.
    ligas: [{ evento_id: "e-mujer", artista_id: "f-osslp", orden: 0 }],
    propuestas: [
      { id: "p-coro", estado: "propuesta", datos: { nombre: "Coro Allegro", disciplina: "musica", eventos: [] } },
      { id: "p-selene", estado: "rechazada", datos: { nombre: "Selene" } },
      { id: "p-vieja", estado: "aceptada", datos: { nombre: "Paola del Carmen" } },
    ],
  };
}
const filasDePrueba: FilaAgenda[] = [
  fila({ titulo: "Concierto por el Día Internacional de la Mujer", fecha: "2026-03-06", artistas: ["Orquesta Sinfónica de San Luis", "Paola del Carmen"], descripcion: "Concierto de la Orquesta Sinfónica de San Luis con la solista Paola del Carmen." }),
  fila({ titulo: "Serenata en Plaza de Armas", fecha: "2026-03-12", artistas: ["Banda de Música del Gobierno del Estado"], descripcion: "Serenata de la Banda.", enlace: "https://agenda.example/otro.pdf" }),
  fila({ titulo: "Serenata en Plaza de Armas", fecha: "2026-03-05", artistas: ["Banda de Música de Gobierno del Estado"], descripcion: "Serenata de la Banda de Música de Gobierno del Estado." }),
  fila({ titulo: "Gitanos mexicanos 2ª edición: PARGAZZ", fecha: "2026-10-16", artistas: ["Carlos de Santos", "Óscar Loredo"], descripcion: "Concierto de Carlos de Santos en clarinete y Óscar Loredo en guitarra.", enlace: PDF_OCTUBRE, archivo: "eventos-2026-10.json" }),
  fila({ titulo: "Concierto: Coro Allegro", fecha: "2026-04-02", hora: "18:00", lugar: "Teatro de la Paz", artistas: ["Coro Allegro"] }),
  fila({ titulo: "Concierto con causa", fecha: "2026-04-03", artistas: ["Club Rotario San Luis Potosí", "Selene"], descripcion: "Concierto." }),
  fila({ titulo: "Recital de primavera", fecha: "2026-04-04", artistas: ["Renata Ibarra", "Ficha Oculta"], descripcion: "Recital." }),
  fila({ titulo: "Recital que no entró", fecha: "2026-05-01", artistas: ["Alguien Sin Evento"] }),
  fila({ titulo: "Exposición sin artistas", fecha: "2026-05-02" }),
];

describe("armarPlan", () => {
  const plan = armarPlan(filasDePrueba, baseDePrueba(), { ciudad: CIUDAD });

  it("liga lo que tiene ficha (una vez por evento, con su orden) y no repite lo que ya estaba", () => {
    expect(plan.ligas.map((l) => [l.evento_id, l.artista_id, l.orden, l.como])).toEqual([["e-pargazz", "f-pargazz", 0, "integrante"]]);
    expect(plan.cifras.yaLigadas).toBe(1);
  });

  it("una propuesta por artista: las variantes juntas, sus eventos por fecha, el detalle de la agenda y el PDF del primer evento", () => {
    const banda = plan.nuevas.find((p) => p.nombre.startsWith("Banda"));
    expect(banda?.datos).toEqual({
      nombre: "Banda de Música de Gobierno del Estado",
      disciplina: "musica",
      tipo: "grupo",
      ciudad: CIUDAD,
      redes: [],
      leida: LEIDA,
      eventos: ["e-ser1", "e-ser2"],
      detalle: DETALLE_ENSAMBLE_ESTADO,
      url: PDF_MARZO,
      variantes: ["Banda de Música del Gobierno del Estado"],
    });
    const jacqueline = plan.nuevas.find((p) => p.nombre === "Paola del Carmen");
    expect(jacqueline?.datos).toMatchObject({ disciplina: "musica", tipo: "solista", detalle: "Solista", eventos: ["e-mujer"] });
    expect(plan.nuevas.map((p) => p.nombre).sort()).toEqual(["Banda de Música de Gobierno del Estado", "Paola del Carmen"]);
  });

  it("lo ya propuesto suma sus eventos; lo rechazado no vuelve; ni instituciones, ni fichas ocultas, ni lo ambiguo", () => {
    expect(plan.actualizar).toEqual([{ id: "p-coro", nombre: "Coro Allegro", datos: { nombre: "Coro Allegro", disciplina: "musica", eventos: ["e-coro"] }, nuevos: 1 }]);
    expect(plan.cifras).toMatchObject({ rechazados: 1, noArtistas: 1, ocultos: 1, ambiguos: 1, sinEvento: 1, porParecido: 1, emparejadas: 7 });
    const resultado = (n: string) => plan.resultados.find((r) => r.nombre === n)?.resultado;
    expect(resultado("Selene")).toMatch(/^rechazado antes/);
    expect(resultado("Club Rotario San Luis Potosí")).toBe("no se propone: institución o asociación");
    expect(resultado("Ficha Oculta")).toMatch(/^ficha oculta/);
    expect(resultado("Renata Ibarra")).toMatch(/^se parece a «Renata Ibarra Solís» y «Renata Ibarra Cano»/);
    expect(resultado("Orquesta Sinfónica de San Luis")).toBe("ligado a «Orquesta Sinfónica de San Luis Potosí»");
    expect(resultado("Carlos de Santos")).toBe("ligado a «Pargazz» (integrante del grupo)");
    expect(resultado("Óscar Loredo")).toBe("ligado a «Pargazz» (integrante del grupo)");
    expect(plan.sinEvento.map((f) => f.titulo)).toEqual(["Recital que no entró"]);
  });

  it("las cifras y los 20 primeros, de más a menos eventos", () => {
    expect(plan.cifras).toMatchObject({ filas: 9, conArtistas: 8, nombres: 12, propuestas: 2, eventosEnPropuestas: 3, actualizadas: 1, fichasLigadas: 1 });
    expect(primeros(plan)[0]).toBe(" 1. Banda de Música de Gobierno del Estado · 1 evento · propuesto");
    expect(plan.resultados[0]?.nombre).toBe("Banda de Música de Gobierno del Estado");
    expect(lineaDeCifras(plan, true)).toContain("se propondrían 2 artistas con 3 eventos");
    const informe = informeDe(plan, true).join("\n");
    expect(informe).toContain("## Los 20 nombres con más eventos");
    expect(informe).toContain("- Pargazz · 1 evento · integrante del grupo: «Carlos de Santos», «Óscar Loredo»");
    expect(informe).toContain("- Banda de Música de Gobierno del Estado · 2 eventos · musica · grupo · «Ensamble del Gobierno del Estado» · también como «Banda de Música del Gobierno del Estado»");
  });

  it("nada que proponer ni ligar: plan vacío", () => {
    const vacio = armarPlan([], baseDePrueba(), { ciudad: CIUDAD });
    expect(vacio.ligas).toEqual([]);
    expect(vacio.nuevas).toEqual([]);
    expect(vacio.actualizar).toEqual([]);
  });
});

// ---------- la base y la escritura, con la base falsa ----------
function tablasDePrueba(): Record<string, Fila[]> {
  const b = baseDePrueba();
  return {
    eventos: b.eventos.map((e) => ({ ...e, ciudad: CIUDAD })),
    lugares: b.lugares.map((l) => ({ ...l, ciudad: CIUDAD })),
    artistas: b.artistas.map((a) => ({ ...a, ciudad: CIUDAD })),
    eventos_artistas: [...b.ligas, { evento_id: "de-otra-ciudad", artista_id: "x", orden: 0 }],
    rutinas_corridas: [{ id: "c-vieja", tipo: "artistas", ciudad: "san-luis-potosi", estado: "terminada" }, { id: "c-otra", tipo: "artistas", ciudad: "oaxaca", estado: "terminada" }],
    propuestas: [
      ...b.propuestas.map((p) => ({ ...p, corrida_id: "c-vieja", tipo: "artista" })),
      { id: "p-oaxaca", corrida_id: "c-otra", tipo: "artista", estado: "propuesta", datos: { nombre: "Paola del Carmen" } },
      { id: "p-lugar", corrida_id: "c-vieja", tipo: "lugar", estado: "propuesta", datos: { nombre: "Banda de Música de Gobierno del Estado" } },
    ],
    perfiles: [{ id: "admin", rol: "admin" }],
  };
}

describe("leerBase y escribirPlan", () => {
  it("lee solo lo de la ciudad (y las propuestas de artista de sus corridas)", async () => {
    const { db } = baseFalsa(tablasDePrueba());
    const base = await leerBase(db, CIUDAD, "san-luis-potosi");
    expect(base.eventos).toHaveLength(7);
    expect(base.ligas).toEqual([{ evento_id: "e-mujer", artista_id: "f-osslp", orden: 0 }]);
    expect(base.propuestas.map((p) => p.id).sort()).toEqual(["p-coro", "p-selene", "p-vieja"]);
  });

  it("escribe las ligas, una corrida terminada con sus propuestas y los eventos que se suman; correrlo otra vez no repite nada", async () => {
    const { db, tablas } = baseFalsa(tablasDePrueba());
    const plan = armarPlan(filasDePrueba, await leerBase(db, CIUDAD, "san-luis-potosi"), { ciudad: CIUDAD });
    const escrito = await escribirPlan(db, plan, { autor: "admin", slug: "san-luis-potosi", ahora: new Date("2026-10-21T18:00:00Z") });
    expect(escrito).toMatchObject({ ligas: 1, actualizadas: 1, fallas: [] });
    expect(tablas.eventos_artistas).toContainEqual(expect.objectContaining({ evento_id: "e-pargazz", artista_id: "f-pargazz", orden: 0 }));
    const corrida = tablas.rutinas_corridas.find((c) => c.id === escrito.corrida);
    expect(corrida).toMatchObject({ tipo: "artistas", ciudad: "san-luis-potosi", estado: "terminada", gasto_usd: 0, creado_por: "admin", inicio: "2026-10-21T18:00:00.000Z", fin: "2026-10-21T18:00:00.000Z" });
    expect(corrida?.resumen).toMatchObject({ propuestos: 2, ligados: 1, eventos_leidos: 9, descartados: { rechazado_antes: 1, no_es_artista: 1 } });
    const nuevas = tablas.propuestas.filter((p) => p.corrida_id === escrito.corrida);
    expect(nuevas.map((p) => [p.tipo, p.fuente, (p.datos as { nombre: string }).nombre]).sort()).toEqual([
      ["artista", FUENTE, "Banda de Música de Gobierno del Estado"],
      ["artista", FUENTE, "Paola del Carmen"],
    ]);
    expect(escrito.propuestas).toHaveLength(2);
    expect((tablas.propuestas.find((p) => p.id === "p-coro")?.datos as { eventos: string[] }).eventos).toEqual(["e-coro"]);

    const otraVez = armarPlan(filasDePrueba, await leerBase(db, CIUDAD, "san-luis-potosi"), { ciudad: CIUDAD });
    expect([otraVez.ligas.length, otraVez.nuevas.length, otraVez.actualizar.length]).toEqual([0, 0, 0]);
    const segunda = await escribirPlan(db, otraVez, { autor: "admin", slug: "san-luis-potosi" });
    expect(segunda.corrida).toBeNull();
    expect(tablas.rutinas_corridas).toHaveLength(3);
  });

  it("si no se guardan las propuestas, la corrida queda fallida con su razón y lo demás sigue", async () => {
    const { db, tablas, fallar } = baseFalsa(tablasDePrueba());
    const plan = armarPlan(filasDePrueba, await leerBase(db, CIUDAD, "san-luis-potosi"), { ciudad: CIUDAD });
    fallar("propuestas", "insert");
    const escrito = await escribirPlan(db, plan, { autor: "admin", slug: "san-luis-potosi" });
    expect(escrito.fallas).toEqual(["propuestas 1–2: falla de prueba"]);
    expect(escrito.ligas).toBe(1);
    const corrida = tablas.rutinas_corridas.find((c) => c.id === escrito.corrida);
    expect(corrida).toMatchObject({ estado: "fallida", resumen: { error: "Se guardaron 0 de 2 propuestas." } });
    expect(informeDe(plan, false, escrito).join("\n")).toContain("FALLAS: propuestas 1–2: falla de prueba");
  });
});
