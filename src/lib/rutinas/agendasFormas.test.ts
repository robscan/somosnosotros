import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { SIN_PARAMETROS } from "../ciudadParametros";
import { localAIso } from "../fechas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, type Dependencias } from "./motor";
import { insertarEvento, ligarFicha, prepararEvento, publicarAceptadasSinFicha, type CiudadDeEvento, type LugarDeCiudad } from "./publicarEvento";

/**
 * OL-433 de punta a punta, con datos inventados que reproducen lo que dejó ver la primera corrida real de San Luis (21 de octubre): actos de
 * Xantolo propuestos sueltos, el mismo concierto con dos títulos, «Noche de recorridos» que ya estaba como «Noches de Recorridos CEART», y
 * lecturas en el Museo Tamuantzán (Ciudad Valles). Además: un taller con sesiones en dos trozos de la agenda, una serie semanal, la inauguración
 * de una exposición con su periodo, un festival nuevo («Otoño Sonoro») y un festival sin programa. Sin red: la API, Mapbox y la base son falsas.
 */

const AHORA = new Date("2026-10-21T16:00:00Z"); // 10:00 en San Luis
const ZONA = "America/Mexico_City";
const local = (fechaHora: string) => localAIso(fechaHora, ZONA)!;
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: ZONA, alias: ["Soledad de Graciano Sánchez"], estado: "abierta" };
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const PAZ = "00000000-0000-4000-8000-00000000a002";
const CEART = "00000000-0000-4000-8000-00000000a003";
const MRP = "00000000-0000-4000-8000-00000000a004";
const MFS = "00000000-0000-4000-8000-00000000a005";
const XANTOLO = "00000000-0000-4000-8000-00000000f001";
const LUGARES = [
  { id: PAZ, nombre: "Teatro de la Paz", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Villerías 205, Centro" },
  { id: CEART, nombre: "Centro de las Artes de San Luis Potosí Centenario (CEART)", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Calzada de Guadalupe 705" },
  { id: MRP, nombre: "Museo Regional Potosino", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Galeana 450" },
  { id: MFS, nombre: "Museo Federico Silva Escultura Contemporánea", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Álvaro Obregón 80" },
];
const PDF_XANTOLO = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/Programa_Xantolo_2026.pdf";
const PDF_OCT = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/oct_2026.pdf";

type Ev = { titulo: string; fecha: string; hora: string; hora_fin: string | null; lugar: string; direccion: string | null; municipio: string | null; precio: string | null; descripcion: string; programa: string | null; termina: string | null };
const ev = (titulo: string, fecha: string, hora: string, extra: Partial<Ev> = {}): Ev => ({
  titulo,
  fecha,
  hora,
  hora_fin: null,
  lugar: "Teatro de la Paz",
  direccion: null,
  municipio: "San Luis Potosí",
  precio: "Gratis",
  descripcion: "Una actividad de la agenda.",
  programa: null,
  termina: null,
  ...extra,
});

/** El programa de Xantolo (sin mes): todo bajo «Xantolo 2026». */
const FILAS_XANTOLO: Ev[] = [
  ev("Desfile de la comparsa monumental de Xantolo", "2026-10-24", "18:00", { lugar: "Casa de Cultura del Barrio de San Sebastián", programa: "Xantolo 2026" }), // ya es acto del festival
  ev("Tzompantli", "2026-10-25", "19:00", { lugar: "Plaza de Armas", programa: "Xantolo 2026" }),
  ev("Macario, Xantolo camino al Mictlán", "2026-10-28", "18:00", { programa: null }), // lo nombra el título
  ev("Entre elementos y almas", "2026-10-29", "19:00", { lugar: "Museo Regional Potosino", programa: null }), // lo nombra la agenda
  ev("Fiesta de Luz", "2026-10-30", "19:00", { hora_fin: "22:00", lugar: "Plaza de Armas", programa: "Xantolo 2026" }),
  ev("Fiesta de Luz", "2026-10-31", "19:00", { hora_fin: "22:00", lugar: "Plaza de Armas", programa: "Xantolo 2026" }),
  ev("Fiesta de Luz", "2026-11-01", "19:00", { hora_fin: "22:00", lugar: "Plaza de Armas", programa: "Xantolo 2026" }),
];
/** La agenda de octubre de la Secretaría. */
const FILAS_OCTUBRE: Ev[] = [
  ev("Inauguración: Raíces", "2026-10-22", "19:00", { lugar: "Museo Regional Potosino", termina: "2026-11-30" }),
  ev("Inauguración: Ecos del agua", "2026-10-22", "19:00", { lugar: "Museo Regional Potosino" }),
  ...["22", "23", "24", "29"].map((d) => ev("Taller de grabado en linóleo", `2026-10-${d}`, "17:00", { hora_fin: "19:00", lugar: "Museo Federico Silva Escultura Contemporánea", precio: "$300" })),
  ev("Jueves de danzón", "2026-10-22", "18:00"),
  ev("Jueves de danzón", "2026-10-29", "18:00"),
  ev("Noche de recorridos", "2026-10-23", "19:30", { lugar: "CEART" }), // ya estaba como «Noches de Recorridos CEART»
  ev("Otoño Sonoro: noche de cuerdas", "2026-10-23", "20:00", { programa: "Otoño Sonoro" }),
  ev("Otoño Sonoro: noche de vientos", "2026-10-30", "20:00", { programa: "Otoño Sonoro" }),
  ev("Hermanos Pérez Meza Big Band", "2026-10-25", "20:00", { precio: "$150", descripcion: "" }),
  ev("Los Hermanos Pérez Meza Big Band: Esto somos", "2026-10-25", "20:00", { precio: null, descripcion: "La big band presenta su disco." }),
  ev("Sala de lectura El Chal", "2026-10-24", "11:00", { lugar: "Museo Tamuantzán" }),
  ev("Biblioteca andante", "2026-10-25", "11:00", { lugar: "Museo Tamuantzán" }),
  ev("Ruta literaria por la paz", "2026-10-26", "11:00", { lugar: "Museo Tamuantzán" }),
  ev("Lectura de leyendas huastecas", "2026-10-27", "11:00", { lugar: "Museo Tamuantzán" }),
  ev("Danza huasteca", "2026-10-26", "18:00", { lugar: "Casa de la Cultura, Cd. Valles" }),
  ev("Festival callejero de títeres", "2026-10-31", "16:00"),
];

function lectura(cuerpo: Anthropic.MessageCreateParams): Ev[] {
  const contenido = cuerpo.messages[0].content as Anthropic.ContentBlockParam[];
  const doc = contenido.find((b) => b.type === "document");
  const url = doc && doc.type === "document" && doc.source.type === "url" ? doc.source.url : null;
  const texto = contenido.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  const rango = texto.match(/del (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})/);
  const filas = url === PDF_XANTOLO ? FILAS_XANTOLO : url === PDF_OCT ? FILAS_OCTUBRE : [];
  return rango ? filas.filter((e) => e.fecha >= rango[1] && e.fecha <= rango[2]) : filas;
}

function apiFalsa() {
  const create = vi.fn(async (cuerpo: Anthropic.MessageCreateParams) => ({
    id: "m",
    type: "message",
    role: "assistant",
    model: MODELO_RUTINAS,
    stop_reason: "tool_use",
    usage: { input_tokens: 30_000, output_tokens: 2_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 } },
    content: [{ type: "tool_use", id: "t", name: "entregar_agenda", input: { eventos: lectura(cuerpo), agendas: [] } }],
  }));
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

/** Mapbox falso: «Plaza de Armas» está en el centro de San Luis; el Museo Tamuantzán (Ciudad Valles) no aparece dentro del área. */
const mapbox = {
  token: "t",
  pedir: vi.fn((async (url: string) => {
    const u = new URL(url);
    const q = u.searchParams.get("q") ?? "";
    if (u.pathname.includes("/searchbox/v1/suggest")) return Response.json({ suggestions: q === "Plaza de Armas" ? [{ mapbox_id: "plaza", name: "Plaza de Armas" }] : [] });
    if (u.pathname.includes("/retrieve/plaza")) return Response.json({ features: [{ geometry: { coordinates: [-100.9755, 22.1518] }, properties: { full_address: "Jardín Hidalgo s/n, Centro, San Luis Potosí" } }] });
    return Response.json({ features: [] });
  }) as typeof fetch),
};

function mundo() {
  return baseFalsa(
    {
      ciudades: [structuredClone(SLP)],
      lugares: structuredClone(LUGARES),
      eventos: [
        // Xantolo ya registrado como festival, con un acto.
        { id: XANTOLO, titulo: "Xantolo 2026", clase: "festival", inicio: local("2026-10-23T10:00"), fin: local("2026-11-02T22:00"), termina: local("2026-11-02T22:00"), zona: ZONA, lugar_id: null, sitio_texto: "Plaza de Armas", visible: true, borrador: false, ciudad: "San Luis Potosí" },
        { id: "e-desfile", titulo: "Desfile comparsa monumental de Xantolo", clase: "puntual", inicio: local("2026-10-24T18:00"), fin: null, termina: local("2026-10-24T21:00"), zona: ZONA, lugar_id: null, sitio_texto: "Casa de Cultura del Barrio de San Sebastián", evento_padre_id: XANTOLO, visible: true, borrador: false, ciudad: "San Luis Potosí" },
        { id: "e-noches", titulo: "Noches de Recorridos CEART", clase: "puntual", inicio: local("2026-10-23T19:30"), fin: null, termina: local("2026-10-23T22:30"), zona: ZONA, lugar_id: CEART, sitio_texto: null, visible: true, borrador: false, ciudad: "San Luis Potosí" },
      ],
      rutinas_corridas: [
        { id: "c-433", tipo: "agendas", ciudad: "san-luis-potosi", parametros: { fuentes: ["agenda-cultura"] }, tope_usd: 5, gasto_usd: 0, estado: "pendiente", resumen: {}, creado_en: "2026-10-21T15:59:00Z", inicio: null, fin: null },
      ],
      propuestas: [],
      configuracion: [
        {
          clave: "agendas_san_luis_potosi",
          valor: {
            fuentes: [
              { url: PDF_XANTOLO, nombre: "Agenda programación XANTOLO en tu ciudad", tipo: "pdf", clave: "agenda-cultura", mes: null },
              { url: PDF_OCT, nombre: "OCTUBRE", tipo: "pdf", clave: "agenda-cultura", mes: "2026-10" },
            ],
          },
        },
      ],
    },
    { eventos_parecidos: () => [] },
  );
}

async function correr(base: ReturnType<typeof mundo>) {
  const falsa = apiFalsa();
  const dep: Dependencias = { db: base.db, api: falsa.api, mapbox, pedir: (async () => new Response("", { status: 404 })) as typeof fetch, ahora: () => AHORA, plazoMs: 45_000 };
  for (let i = 0; i < 30; i++) if ((await correrUnPaso(dep)).estado !== "corriendo") break;
  return falsa;
}
const corrida = (base: ReturnType<typeof mundo>) => base.tablas.rutinas_corridas.find((c) => c.id === "c-433")! as Fila & { resumen: Record<string, unknown> };
const propuesta = (base: ReturnType<typeof mundo>, titulo: string) => base.tablas.propuestas.find((p) => (p.datos as Fila).titulo === titulo) as (Fila & { datos: Record<string, unknown> }) | undefined;

describe("la rutina de agendas entiende festivales, talleres y exposiciones (OL-433)", () => {
  it("lo que propondría sobre los casos del 21 de octubre: actos de Xantolo, una sola función, lo que ya estaba y lo de Ciudad Valles fuera", async () => {
    const base = mundo();
    await correr(base);
    const c = corrida(base);
    expect(c.estado).toBe("terminada");
    const titulos = base.tablas.propuestas.map((p) => (p.datos as Fila).titulo as string).sort();
    expect(titulos).toEqual(
      [
        "Entre elementos y almas",
        "Festival callejero de títeres",
        "Fiesta de Luz",
        "Inauguración: Ecos del agua",
        "Inauguración: Raíces",
        "Jueves de danzón",
        "Jueves de danzón",
        "Los Hermanos Pérez Meza Big Band: Esto somos",
        "Macario, Xantolo camino al Mictlán",
        "Otoño Sonoro",
        "Otoño Sonoro: noche de cuerdas",
        "Otoño Sonoro: noche de vientos",
        "Taller de grabado en linóleo",
        "Tzompantli",
      ].sort(),
    );
    // Lo de fuera de la ciudad: las cuatro lecturas en el Tamuantzán (el mapa no lo encuentra en San Luis) y «Cd. Valles» en el texto.
    expect(c.resumen.descartados).toMatchObject({ ya_existe: 2, fuera_de_la_ciudad: 5, unido: 1, ya_propuesto: 0, de_mas: 0 });
    expect(c.resumen).toMatchObject({ propuestos: 14, festivales: 1, actos: 6, sesiones: 5, series: 1 });
    expect(JSON.stringify(c.resumen)).not.toMatch(/Xantolo|Tamuant|Meza|Otoño|Raíces/);

    // Los actos de Xantolo cuelgan del festival registrado; «Fiesta de Luz», tres noches seguidas, es UNA propuesta con sus tres sesiones.
    for (const t of ["Tzompantli", "Macario, Xantolo camino al Mictlán", "Entre elementos y almas", "Fiesta de Luz"]) expect(propuesta(base, t)?.datos.marco, t).toEqual({ id: XANTOLO, titulo: "Xantolo 2026" });
    const luz = propuesta(base, "Fiesta de Luz")!.datos;
    expect(luz).toMatchObject({ clase: "puntual", inicio: local("2026-10-30T19:00"), fin: local("2026-10-30T22:00"), lat: 22.1518, lng: -100.9755 });
    expect(luz.sesiones).toEqual(["30", "31"].map((d) => ({ inicio: local(`2026-10-${d}T19:00`), fin: local(`2026-10-${d}T22:00`) })).concat({ inicio: local("2026-11-01T19:00"), fin: local("2026-11-01T22:00") }));

    // El mismo concierto con dos títulos: una propuesta, la más completa (el título largo, el precio de una y la descripción de la otra).
    const meza = propuesta(base, "Los Hermanos Pérez Meza Big Band: Esto somos")!.datos;
    expect(meza).toMatchObject({ precio: "$150", descripcion: "La big band presenta su disco.", variantes: ["Hermanos Pérez Meza Big Band"], lugar: "Teatro de la Paz" });

    // Dos inauguraciones distintas el mismo día y hora en el mismo museo no se unen; la que dice su periodo es una exposición.
    expect(propuesta(base, "Inauguración: Raíces")!.datos).toMatchObject({ clase: "exposicion", termina: local("2026-11-30T23:59"), exposicion: "Raíces" });
    expect(propuesta(base, "Inauguración: Ecos del agua")!.datos).toMatchObject({ clase: "puntual" });
    expect(propuesta(base, "Inauguración: Ecos del agua")!.datos).not.toHaveProperty("termina");

    // El taller: cuatro sesiones en una propuesta, aunque la cuarta llegó en el trozo siguiente de la agenda.
    const taller = propuesta(base, "Taller de grabado en linóleo")!.datos;
    expect(taller.clase).toBe("taller");
    expect((taller.sesiones as unknown[]).length).toBe(4);
    expect(taller).toMatchObject({ inicio: local("2026-10-22T17:00"), fin: local("2026-10-22T19:00"), precio: "$300" });

    // La serie: una propuesta por fecha, marcadas con sus fechas y su cadencia.
    const danzon = base.tablas.propuestas.filter((p) => (p.datos as Fila).titulo === "Jueves de danzón");
    for (const p of danzon) expect((p.datos as Fila).serie).toEqual({ fechas: [local("2026-10-22T18:00"), local("2026-10-29T18:00")], cada: 7 });

    // El festival nuevo: «Otoño Sonoro» se propone como festival en cuanto aparece su segundo acto; el primero (de otro trozo) pasa a ser acto suyo.
    const otono = propuesta(base, "Otoño Sonoro")!;
    expect(otono.datos).toMatchObject({ clase: "festival", actos: 2, inicio: local("2026-10-23T20:00"), termina: local("2026-10-30T23:00"), lugar: "Teatro de la Paz", programa: "Otoño Sonoro" });
    for (const t of ["Otoño Sonoro: noche de cuerdas", "Otoño Sonoro: noche de vientos"])
      expect(propuesta(base, t)!.datos).toMatchObject({ marco_propuesto: otono.id, programa: "Otoño Sonoro", espera: "Se publica cuando aceptes el festival «Otoño Sonoro».", clase: "puntual" });

    // Un festival sin programa (OL-413): clase festival por su título.
    expect(propuesta(base, "Festival callejero de títeres")!.datos).toMatchObject({ clase: "festival" });
    expect(propuesta(base, "Festival callejero de títeres")!.datos).not.toHaveProperty("actos");

    // El mapa: «Plaza de Armas» se buscó una vez en toda la corrida (queda en el cursor); el Tamuantzán, otra.
    const buscadas = mapbox.pedir.mock.calls.map(([u]) => new URL(String(u))).filter((u) => u.pathname.includes("suggest")).map((u) => u.searchParams.get("q"));
    expect(buscadas.sort()).toEqual(["Museo Tamuantzán", "Plaza de Armas"]);
  });

  it("al aceptar: el acto antes que su festival espera; al aceptar el festival se publican los dos colgados de él; el taller con sus sesiones; la exposición con su inauguración", async () => {
    const base = mundo();
    await correr(base);
    const ciudad: CiudadDeEvento = { slug: SLP.slug, nombre: SLP.nombre, alias: SLP.alias, lat: SLP.lat, lng: SLP.lng, zona: ZONA, radioKm: 15, parametros: SIN_PARAMETROS };
    const lugares = LUGARES as LugarDeCiudad[];
    const dep = { db: base.db, mapbox, ahora: AHORA };
    const aceptar = (p: Fila) => Object.assign(p, { estado: "aceptada", resuelto_por: ADMIN, resuelto_en: AHORA.toISOString(), ficha_id: null });
    const publicar = async (titulo: string) => {
      const p = propuesta(base, titulo)!;
      aceptar(p);
      const r = await prepararEvento(dep, p.datos, ciudad, lugares, ADMIN);
      if (!r.ok) throw new Error(r.error);
      const creado = await insertarEvento(base.db, r.fila);
      if (creado) await ligarFicha(base.db, p.id as string, creado.id, { mapbox, ahora: AHORA });
      return { r, creado, p };
    };
    const evento = (titulo: string) => base.tablas.eventos.find((e) => e.titulo === titulo);

    // 1. Un acto de «Otoño Sonoro» antes que su festival: se acepta, pero no se publica suelto.
    const cuerdas = await publicar("Otoño Sonoro: noche de cuerdas");
    expect(cuerdas.r).toMatchObject({ ok: true, espera: "Se publica cuando aceptes el festival «Otoño Sonoro»." });
    expect(cuerdas.creado).toBeNull();
    expect(evento("Otoño Sonoro: noche de cuerdas")).toBeUndefined();
    // Al empezar otra corrida sigue esperando (no cuenta como «sin publicar»).
    expect(await publicarAceptadasSinFicha(dep, ciudad, lugares, ["c-433"])).toEqual({ publicados: 0, sin_publicar: 0, en_espera: 1 });

    // 2. El festival: el marco (sin pedirle punto a su sitio) y, ahí mismo, el acto que esperaba, colgado de él.
    const festival = await publicar("Otoño Sonoro");
    const marco = evento("Otoño Sonoro")!;
    expect(marco).toMatchObject({ clase: "festival", lugar_id: PAZ, origen: "rutina-agendas", precio: null });
    expect(marco.evento_padre_id).toBeUndefined();
    expect(festival.p.ficha_id).toBe(marco.id);
    expect(evento("Otoño Sonoro: noche de cuerdas")).toMatchObject({ evento_padre_id: marco.id, clase: "puntual", precio: "Gratis" });
    expect(cuerdas.p.ficha_id).toBe(evento("Otoño Sonoro: noche de cuerdas")!.id);
    // El otro acto, aceptado después, cuelga del festival ya publicado; el periodo del festival sale de sus actos.
    await publicar("Otoño Sonoro: noche de vientos");
    expect(evento("Otoño Sonoro: noche de vientos")).toMatchObject({ evento_padre_id: marco.id });
    expect(evento("Otoño Sonoro")).toMatchObject({ inicio: local("2026-10-23T20:00"), fin: local("2026-10-30T23:00") });

    // 3. «Fiesta de Luz» bajo Xantolo: un evento de tres días con el mismo horario (sin filas de sesiones, OL-310), en Plaza de Armas con su punto.
    await publicar("Fiesta de Luz");
    expect(evento("Fiesta de Luz")).toMatchObject({ evento_padre_id: XANTOLO, clase: "puntual", inicio: local("2026-10-30T19:00"), fin: local("2026-11-01T22:00"), sitio_texto: "Plaza de Armas", sitio_lat: 22.1518 });
    expect(base.tablas.eventos_sesiones ?? []).toHaveLength(0);
    // Xantolo recalcula su periodo con sus actos (del desfile del 24 a la última noche de luz).
    expect(evento("Xantolo 2026")).toMatchObject({ inicio: local("2026-10-24T18:00"), fin: local("2026-11-01T22:00") });

    // 4. El taller: un evento de clase taller con sus cuatro sesiones en `eventos_sesiones`.
    const taller = await publicar("Taller de grabado en linóleo");
    expect(evento("Taller de grabado en linóleo")).toMatchObject({ clase: "taller", inicio: local("2026-10-22T17:00"), fin: local("2026-10-29T19:00"), precio: "$300", lugar_id: MFS });
    expect(base.tablas.eventos_sesiones.filter((s) => s.evento_id === taller.creado!.id).map((s) => s.fecha)).toEqual(["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-29"]);

    // 5. La inauguración con su periodo: la inauguración (evento) y la exposición «Raíces» ligada, del 22 de octubre al 30 de noviembre.
    const raices = await publicar("Inauguración: Raíces");
    expect(evento("Inauguración: Raíces")).toMatchObject({ clase: "puntual", lugar_id: MRP, sugerencias: { exposicion: { estado: "aceptada" } } });
    expect(evento("Raíces")).toMatchObject({ clase: "exposicion", inaugura_id: raices.creado!.id, inicio: local("2026-10-22T00:00"), fin: local("2026-11-30T23:59"), precio: null, lugar_id: MRP });
    // Y la otra inauguración del mismo día y hora en el mismo museo se publica: no es la misma aunque la base las vea parecidas.
    await publicar("Inauguración: Ecos del agua");
    expect(evento("Inauguración: Ecos del agua")).toMatchObject({ clase: "puntual" });

    // 6. El festival sin programa: un día, una hora y un sitio, clase festival.
    await publicar("Festival callejero de títeres");
    expect(evento("Festival callejero de títeres")).toMatchObject({ clase: "festival", lugar_id: PAZ });
    expect(evento("Festival callejero de títeres")?.evento_padre_id).toBeUndefined();
  });
});
