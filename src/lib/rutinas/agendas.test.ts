import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { localAIso } from "../fechas";
import { claveConfiguracion, HERRAMIENTA_AGENDA, planDeAgendas, tareasDeLectura, type FuenteAgenda } from "./agendas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, type Dependencias } from "./motor";

// ---------- el mundo de la prueba (todo inventado, sin red) ----------
const AHORA = new Date("2026-10-21T16:00:00Z"); // 10:00 en San Luis
const ZONA = "America/Mexico_City";
const local = (fechaHora: string) => localAIso(fechaHora, ZONA)!;
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: ZONA, alias: ["Soledad de Graciano Sánchez"], estado: "abierta" };
const CDMX = {
  slug: "ciudad-de-mexico",
  nombre: "Ciudad de México",
  lat: 19.415,
  lng: -99.16,
  zoom: 13,
  zona: ZONA,
  alias: [],
  estado: "abierta",
  parametros: {
    alcaldias: ["Cuauhtémoc", "Coyoacán"],
    radio_km: 12,
    guias: [
      { nombre: "Cultura UNAM", url: "https://www.cultura.unam.mx/" },
      { nombre: "Cartelera de la Secretaría de Cultura de la Ciudad de México", url: "https://cartelera.cdmx.gob.mx/" },
    ],
  },
};
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const PAZ = "00000000-0000-4000-8000-00000000a002";
const FUENTES = ["agenda-cultura", "universidades-museos", "web"];
const corrida = (id: string, cambios: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "agendas",
  ciudad: "san-luis-potosi",
  parametros: { fuentes: FUENTES },
  tope_usd: 5,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-10-21T15:59:00Z",
  inicio: null,
  fin: null,
  ...cambios,
});

const PDF_OCT = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/oct_2026.pdf";
const PDF_XANTOLO = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/Programa_Xantolo_2026.pdf";
const PDF_SEPT = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/sept_2026.pdf";
const UASLP = "https://www.uaslp.mx/agenda-cultural";
const NOTICIAS = "https://noticias.example/agenda-san-luis";

/** La página de Cultura de San Luis, con la forma que tiene (título, fecha de publicación, «Descargar»). */
const INDICE_SLP = `<html><body><nav>Inicio Agenda</nav><h3>Agenda Cultural Año 2026</h3>
  <div>Agenda programación XANTOLO en tu ciudad</div><small>13 de octubre de 2026</small><a href="${PDF_XANTOLO}">Descargar</a>
  <div>OCTUBRE</div><small>30 de septiembre de 2026</small><a href="${PDF_OCT}">Descargar</a>
  <div>SEPTIEMBRE</div><small>2 de septiembre de 2026</small><a href="${PDF_SEPT}">Descargar</a>
  <a href="https://d3dac9gdq8t83x.cloudfront.net/media/Ley_de_Cultura_27_Jun__2024.pdf">Ley de Cultura</a></body></html>`;

function pedirFalso() {
  const pedidas: string[] = [];
  const pedir = (async (url: string) => {
    pedidas.push(url);
    if (url === "https://cultura.slp.gob.mx/agenda-cultural/") return new Response(INDICE_SLP, { headers: { "content-type": "text/html" } });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { pedir, pedidas };
}

type Ev = { titulo: string; fecha: string; hora: string; hora_fin: string | null; lugar: string; direccion: string | null; municipio: string | null; precio: string | null; descripcion: string };
const ev = (titulo: string, fecha: string, hora: string, extra: Partial<Ev> = {}): Ev => ({
  titulo,
  fecha,
  hora,
  hora_fin: null,
  lugar: "Teatro de la Paz",
  direccion: null,
  municipio: "San Luis Potosí",
  precio: "$100",
  descripcion: "Una función de la temporada, con músicos de la ciudad.",
  ...extra,
});

/** Lo que «lee» la API falsa según lo que se le pide. */
function lectura(cuerpo: Anthropic.MessageCreateParams): { eventos: Ev[]; agendas: unknown[]; paginas?: string[] } {
  const contenido = cuerpo.messages[0].content;
  const texto = typeof contenido === "string" ? contenido : contenido.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  const rango = texto.match(/del (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})/);
  const enRango = (eventos: Ev[]) => (rango ? eventos.filter((e) => e.fecha >= rango[1] && e.fecha <= rango[2]) : eventos);
  const doc = typeof contenido === "string" ? null : contenido.find((b) => b.type === "document");
  const url = doc && doc.type === "document" && doc.source.type === "url" ? doc.source.url : null;
  if (url === PDF_OCT)
    return {
      agendas: [],
      eventos: enRango([
        ev("Concierto de Otoño", "2026-10-24", "19:00"), // ya está en eventos
        ev("Recital de guitarra", "2026-10-25", "18:00", { precio: "Entrada libre" }),
        ev("Función que ya pasó", "2026-10-20", "18:00"),
        ev("Hoy temprano", "2026-10-21", "09:00"),
        ev("Sin hora", "2026-10-26", "por confirmar"),
        ev("Taller rechazado", "2026-10-26", "17:00"), // la administración lo rechazó antes
        ev("Ya propuesto", "2026-10-27", "12:00"),
        ev("Danza en Matehuala", "2026-10-25", "20:00", { lugar: "Teatro Manuel José Othón", municipio: "Matehuala" }),
        ev("Cierre de octubre", "2026-10-30", "20:00", { lugar: "Plaza de Armas", hora_fin: "22:00", direccion: "Jardín Hidalgo s/n, Centro" }),
      ]),
    };
  if (url === PDF_XANTOLO) return { agendas: [], eventos: enRango([ev("Xantolo en el jardín", "2026-10-31", "19:00", { lugar: "Jardín de San Juan de Dios" })]) };
  if (url) return { agendas: [], eventos: [] };
  const herramientas = (cuerpo.tools ?? []).map((t) => (t as { name?: string }).name);
  if (herramientas.includes("web_search")) {
    if (texto.includes("universidades")) return { agendas: [{ nombre: "Agenda cultural UASLP", url: UASLP, tipo: "html", mes: null }], eventos: [], paginas: ["https://www.uaslp.mx/"] };
    if (texto.includes("«agenda cultural San Luis Potosí")) return { agendas: [], eventos: [ev("Festival callejero", "2026-11-02", "16:00", { lugar: "Calzada de Guadalupe" })], paginas: [NOTICIAS] };
    return { agendas: [], eventos: [] };
  }
  if (texto.includes(UASLP)) return { agendas: [], eventos: [ev("Coloquio de poesía", "2026-10-23", "17:00", { lugar: "Centro Cultural Universitario Caja Real", precio: null })] };
  if (texto.includes("cartelera.cdmx.gob.mx"))
    return {
      agendas: [],
      eventos: [
        ev("Ópera en Bellas Artes", "2026-10-28", "19:00", { lugar: "Palacio de Bellas Artes", municipio: "Cuauhtémoc" }),
        ev("Concierto en Tlalpan", "2026-10-28", "19:00", { lugar: "Casa de Cultura Tlalpan", municipio: "Tlalpan" }),
      ],
    };
  if (texto.includes("cultura.unam.mx")) return { agendas: [], eventos: [ev("Danza en la Sala Miguel Covarrubias", "2026-10-29", "20:00", { lugar: "Sala Miguel Covarrubias", municipio: "Coyoacán" })] };
  return { agendas: [], eventos: [] };
}

const USO = { input_tokens: 30_000, output_tokens: 2_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 } };
function apiFalsa() {
  const create = vi.fn(async (cuerpo: Anthropic.MessageCreateParams) => {
    const r = lectura(cuerpo);
    return {
      id: "m",
      type: "message",
      role: "assistant",
      model: MODELO_RUTINAS,
      stop_reason: "tool_use",
      usage: USO,
      content: [
        ...(r.paginas ?? []).map((url) => ({ type: "web_search_tool_result", tool_use_id: "s", content: [{ type: "web_search_result", url, title: "x", encrypted_content: "", page_age: null }] })),
        { type: "tool_use", id: "t", name: "entregar_agenda", input: { eventos: r.eventos, agendas: r.agendas } },
      ],
    };
  });
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

function mundo(corridas: Fila[] = [corrida("c-age")], extra: { ciudades?: Fila[]; configuracion?: Fila[] } = {}) {
  return baseFalsa(
    {
      ciudades: [structuredClone(SLP), structuredClone(CDMX), ...(extra.ciudades ?? [])],
      lugares: [{ id: PAZ, nombre: "Teatro de la Paz", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Villerías 205, Centro", lat: 22.1519, lng: -100.9738 }],
      eventos: [{ id: "e-otono", titulo: "Concierto de Otoño", inicio: local("2026-10-24T19:00"), zona: ZONA, lugar_id: PAZ, sitio_texto: null, clase: "puntual", borrador: false, visible: true, ciudad: "San Luis Potosí" }],
      rutinas_corridas: [corrida("c-vieja", { estado: "terminada", creado_en: "2026-09-25T00:00:00Z" }), ...corridas],
      propuestas: [
        { id: "p-rech", corrida_id: "c-vieja", tipo: "evento", fuente: "Agendas de gobierno", datos: { titulo: "Taller rechazado", inicio: local("2026-10-26T11:00") }, estado: "rechazada", motivo_rechazo: "otro" },
        { id: "p-ya", corrida_id: "c-vieja", tipo: "evento", fuente: "Agendas de gobierno", datos: { titulo: "Ya propuesto", inicio: local("2026-10-27T12:00") }, estado: "propuesta" },
        {
          id: "p-acep",
          corrida_id: "c-vieja",
          tipo: "evento",
          fuente: "Agendas de gobierno",
          datos: { titulo: "Noche aceptada", inicio: local("2026-11-05T20:00"), lugar: "Teatro de la Paz", precio: "Gratis", descripcion: "Un concierto.", url: PDF_SEPT },
          estado: "aceptada",
          resuelto_por: ADMIN,
          ficha_id: null,
        },
      ],
      configuracion: extra.configuracion ?? [],
    },
    { eventos_parecidos: () => [] },
  );
}

function dependencias(base: ReturnType<typeof mundo>, opciones: { api?: ClienteApi | null } = {}) {
  const { pedir, pedidas } = pedirFalso();
  const falsa = apiFalsa();
  const dep: Dependencias = { db: base.db, api: opciones.api === undefined ? falsa.api : opciones.api, mapbox: null, pedir, ahora: () => AHORA, plazoMs: 45_000 };
  return { dep, pedidas, create: falsa.create };
}
const laCorrida = (base: ReturnType<typeof mundo>, id = "c-age") => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
const nuevas = (base: ReturnType<typeof mundo>, id = "c-age") => base.tablas.propuestas.filter((p) => p.corrida_id === id);
async function hastaTerminar(dep: Dependencias, maximo = 40) {
  const pasos = [];
  for (let i = 0; i < maximo; i++) {
    const r = await correrUnPaso(dep);
    pasos.push(r);
    if (r.estado !== "corriendo") break;
  }
  return pasos;
}
const pedidoDe = (create: ReturnType<typeof apiFalsa>["create"], i: number) => (create.mock.calls[i] as unknown as [Anthropic.MessageCreateParams])[0];
const queLeyo = (c: Anthropic.MessageCreateParams) => {
  const contenido = c.messages[0].content;
  if (typeof contenido !== "string") {
    const doc = contenido.find((b) => b.type === "document");
    if (doc && doc.type === "document" && doc.source.type === "url") return `pdf ${doc.source.url.split("/").pop()} ${contenido.map((b) => (b.type === "text" ? b.text.match(/del (\S+) al (\S+),/)?.slice(1).join("…") : "")).join("")}`;
  }
  const texto = typeof contenido === "string" ? contenido : "";
  const herramientas = (c.tools ?? []).map((t) => (t as { name?: string }).name);
  return herramientas.includes("web_search") ? `buscar ${texto.includes("universidades") ? "universidades" : texto.includes("gob.mx") ? "gobierno" : "web"}` : `página ${texto.match(/La agenda está en (\S+?): ábrela/)?.[1] ?? "?"}`;
};

describe("«Buscar agendas y eventos» de punta a punta (OL-429)", () => {
  it("primero gobierno (el índice de Cultura, gratis, y sus PDF por trozos), luego universidades y museos, al final la búsqueda web", async () => {
    const base = mundo();
    const { dep, create, pedidas } = dependencias(base);
    const pasos = await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(pasos.at(-1)?.estado).toBe("terminada");
    // El índice de San Luis se leyó desde el servidor, sin la API, y solo valen el PDF de octubre y el programa de Xantolo (sin mes: 31 días).
    expect(pedidas).toEqual(["https://cultura.slp.gob.mx/agenda-cultural/"]);
    const orden = create.mock.calls.map((_, i) => queLeyo(pedidoDe(create, i)));
    expect(orden).toEqual([
      "pdf Programa_Xantolo_2026.pdf 2026-10-21…2026-10-27",
      "pdf Programa_Xantolo_2026.pdf 2026-10-28…2026-11-03",
      "pdf Programa_Xantolo_2026.pdf 2026-11-04…2026-11-10",
      "pdf Programa_Xantolo_2026.pdf 2026-11-11…2026-11-17",
      "pdf Programa_Xantolo_2026.pdf 2026-11-18…2026-11-21",
      "pdf oct_2026.pdf 2026-10-21…2026-10-27",
      "pdf oct_2026.pdf 2026-10-28…2026-10-31",
      "buscar universidades",
      `página ${UASLP}`,
      "buscar web",
    ]);
    // El PDF va como documento por su URL, con su marca de caché (los trozos siguientes lo leen de la caché), y sin herramientas web.
    const primero = pedidoDe(create, 0);
    expect((primero.messages[0].content as Anthropic.ContentBlockParam[])[0]).toMatchObject({ type: "document", source: { type: "url", url: PDF_XANTOLO }, cache_control: { type: "ephemeral" } });
    expect(primero.tools?.map((t) => (t as { name?: string }).name)).toEqual(["entregar_agenda"]);
    expect(HERRAMIENTA_AGENDA.strict).toBe(true);
    expect(String((primero.messages[0].content as Anthropic.ContentBlockParam[])[1] && ((primero.messages[0].content as Anthropic.TextBlockParam[])[1].text))).toMatch(
      /Municipios que cuentan: San Luis Potosí, Soledad de Graciano Sánchez\.[\s\S]*Hoy es 2026-10-21\.[\s\S]*Lugares registrados.*Teatro de la Paz/,
    );
    // La búsqueda de universidades y museos guarda la agenda que encontró y la lee en esta misma corrida.
    const busqueda = pedidoDe(create, 9);
    expect(busqueda.tools?.find((t) => (t as { name?: string }).name === "web_search")).toMatchObject({ max_uses: 2 });
    expect(c.resumen).toMatchObject({ paso: "3 de 3 fuentes", avance: 1, agendas_leidas: 3, publicados: 1, sin_publicar: 0 });
  });

  it("solo propone lo de hoy en adelante, con día y hora, de la ciudad, sin repetir lo que ya existe, lo propuesto ni lo rechazado; los contadores sin nombres", async () => {
    const base = mundo();
    const { dep } = dependencias(base);
    await hastaTerminar(dep);
    const c = laCorrida(base);
    const ps = nuevas(base);
    expect(ps.map((p) => [p.fuente, (p.datos as Fila).titulo]).sort()).toEqual(
      [
        ["Agendas de gobierno", "Cierre de octubre"],
        ["Agendas de gobierno", "Recital de guitarra"],
        ["Agendas de gobierno", "Xantolo en el jardín"],
        ["Búsqueda web", "Festival callejero"],
        ["Universidades y museos", "Coloquio de poesía"],
      ].sort(),
    );
    // Lo pasado: lo de hoy temprano (lo de ayer ni se pide: el trozo empieza hoy).
    expect(c.resumen.descartados).toEqual({ ya_existe: 1, ya_propuesto: 1, rechazado_antes: 1, fuera_de_la_ciudad: 1, pasado: 1, sin_hora: 1, unido: 0, de_mas: 0 });
    expect(c.resumen).toMatchObject({ propuestos: 5, duplicados: 2 });
    const pf = c.resumen.por_fuente as Record<string, { propuestos: number; usd: number }>;
    expect(Object.fromEntries(Object.entries(pf).map(([k, v]) => [k, v.propuestos]))).toEqual({ "agenda-cultura": 3, "universidades-museos": 1, web: 1 });
    expect(pf["agenda-cultura"].usd).toBeGreaterThan(0);
    expect(JSON.stringify(c.resumen)).not.toMatch(/Recital|Cierre|Xantolo|Festival|Coloquio|Otoño/);
    // El contrato de `propuestas.datos` de un evento: título, inicio (y fin), lugar como lo escribe la agenda, precio, descripción propia, agenda y cuándo se leyó.
    const recital = ps.find((p) => (p.datos as Fila).titulo === "Recital de guitarra")!.datos;
    expect(recital).toEqual({
      titulo: "Recital de guitarra",
      inicio: local("2026-10-25T18:00"),
      lugar: "Teatro de la Paz",
      ciudad: "San Luis Potosí",
      url: PDF_OCT,
      leida: AHORA.toISOString(),
      municipio: "San Luis Potosí",
      precio: "Gratis",
      descripcion: "Una función de la temporada, con músicos de la ciudad.",
      clase: "puntual", // OL-433: toda propuesta lleva su clase
    });
    const cierre = ps.find((p) => (p.datos as Fila).titulo === "Cierre de octubre")!.datos as Fila;
    expect(cierre).toMatchObject({ lugar: "Plaza de Armas", direccion: "Jardín Hidalgo s/n, Centro", inicio: local("2026-10-30T20:00"), fin: local("2026-10-30T22:00") });
    expect((ps.find((p) => (p.datos as Fila).titulo === "Festival callejero")!.datos as Fila).url).toBe(NOTICIAS);
  });

  it("las agendas quedan guardadas en `configuracion`; el mes siguiente no se vuelven a buscar ni se relee lo leído: solo lo nuevo", async () => {
    const base = mundo();
    const primera = dependencias(base);
    await hastaTerminar(primera.dep);
    const guardadas = base.tablas.configuracion.find((f) => f.clave === claveConfiguracion("san-luis-potosi"));
    expect(claveConfiguracion("san-luis-potosi")).toBe("agendas_san_luis_potosi");
    const fuentes = (guardadas?.valor as { fuentes: FuenteAgenda[] }).fuentes;
    expect(fuentes.map((f) => [f.clave, f.tipo, f.url.split("/").pop(), !!f.leida])).toEqual([
      ["agenda-cultura", "indice", "", false],
      ["agenda-cultura", "pdf", "Programa_Xantolo_2026.pdf", true],
      ["agenda-cultura", "pdf", "oct_2026.pdf", true],
      ["universidades-museos", "html", "agenda-cultural", false],
    ]);
    // Otra corrida: el índice se vuelve a mirar (gratis) y no hay PDF nuevos; la agenda de la UASLP se relee (una página cambia); no se busca
    // de nuevo dónde están las de universidades; la búsqueda web va al final. Lo que ya se propuso no se repite.
    laCorrida(base).estado = "terminada";
    base.tablas.rutinas_corridas.push(corrida("c-otra", { creado_en: "2026-10-21T16:30:00Z" }));
    const segunda = dependencias(base);
    await hastaTerminar(segunda.dep);
    expect(segunda.create.mock.calls.map((_, i) => queLeyo(pedidoDe(segunda.create, i)))).toEqual([`página ${UASLP}`, "buscar web"]);
    expect(laCorrida(base, "c-otra").estado).toBe("terminada");
    expect(nuevas(base, "c-otra")).toHaveLength(0);
    expect((laCorrida(base, "c-otra").resumen.descartados as Record<string, number>).ya_propuesto).toBe(2);
  });

  it("publica las aceptadas sin evento al empezar, por el camino del importador: lugar registrado, sin avisos, con su procedencia", async () => {
    const base = mundo();
    const { dep } = dependencias(base);
    await correrUnPaso(dep);
    const evento = base.tablas.eventos.find((e) => e.titulo === "Noche aceptada");
    expect(evento).toMatchObject({ lugar_id: PAZ, sitio_texto: null, ciudad: "San Luis Potosí", creado_por: ADMIN, origen: "rutina-agendas", fuente_url: PDF_SEPT, precio: null, inicio: local("2026-11-05T20:00") });
    expect(base.tablas.propuestas.find((p) => p.id === "p-acep")?.ficha_id).toBe(evento?.id);
    expect(laCorrida(base).resumen).toMatchObject({ publicados: 1, sin_publicar: 0 });
  });

  it("Ciudad de México: su cartelera de gobierno va primero, luego sus guías; solo cuentan sus alcaldías", async () => {
    const base = mundo([corrida("c-cdmx", { ciudad: "ciudad-de-mexico", parametros: { fuentes: ["agenda-cultura", "web"] } })]);
    const { dep, create } = dependencias(base);
    await hastaTerminar(dep);
    const orden = create.mock.calls.map((_, i) => queLeyo(pedidoDe(create, i)));
    expect(orden).toEqual(["página https://cartelera.cdmx.gob.mx/", "página https://www.cultura.unam.mx/", "buscar web"]);
    const ps = nuevas(base, "c-cdmx");
    expect(ps.map((p) => [p.fuente, (p.datos as Fila).titulo])).toEqual([
      ["Agendas de gobierno", "Ópera en Bellas Artes"],
      ["Cultura UNAM", "Danza en la Sala Miguel Covarrubias"],
    ]);
    const c = laCorrida(base, "c-cdmx");
    expect((c.resumen.descartados as Record<string, number>).fuera_de_la_ciudad).toBe(1);
    expect(c.resumen.paso).toBe("3 de 3 fuentes");
    expect(Object.keys(c.resumen.por_fuente as object)).toEqual(["agenda-cultura", "guias", "web"]);
    const cartelera = pedidoDe(create, 0);
    expect(cartelera.tools?.find((t) => (t as { name?: string }).name === "web_fetch")).toMatchObject({ allowed_domains: ["cartelera.cdmx.gob.mx"] });
    expect(String(cartelera.messages[0].content)).toContain("Solo cuentan estas alcaldías: Cuauhtémoc, Coyoacán.");
  });

  it("el tope corta las lecturas con la API; el índice (gratis) se lee igual y Corridas dirá «Llegó al tope»", async () => {
    const base = mundo([corrida("c-age", { tope_usd: 0.3 })]);
    const { dep, create } = dependencias(base);
    await hastaTerminar(dep);
    expect(create).not.toHaveBeenCalled();
    expect(laCorrida(base)).toMatchObject({ estado: "terminada", resumen: { tope: true } });
  });

  it("un trozo de PDF que se corta por tiempo se parte en dos y se vuelve a pedir; sin llave de la API, se dice y no se lee", async () => {
    const base = mundo();
    const { dep, create } = dependencias(base);
    let cortes = 1;
    const original = create.getMockImplementation()!;
    create.mockImplementation(async (cuerpo) => {
      if (cortes-- > 0) throw new Anthropic.APIConnectionTimeoutError();
      return original(cuerpo);
    });
    await hastaTerminar(dep);
    const orden = create.mock.calls.map((_, i) => queLeyo(pedidoDe(create, i)));
    expect(orden.slice(0, 3)).toEqual([
      "pdf Programa_Xantolo_2026.pdf 2026-10-21…2026-10-27",
      "pdf Programa_Xantolo_2026.pdf 2026-10-21…2026-10-24",
      "pdf Programa_Xantolo_2026.pdf 2026-10-25…2026-10-27",
    ]);
    expect(laCorrida(base).resumen.cortadas).toBe(1);
    const sinLlave = mundo();
    await hastaTerminar(dependencias(sinLlave, { api: null }).dep);
    expect(laCorrida(sinLlave).resumen.avisos).toContain("Sin llave de la API: no se leyeron las agendas");
  });
});

describe("el plan de la corrida", () => {
  it("sin agendas guardadas, se buscan primero en sitios de gobierno; un PDF de un mes pasado o ya leído no se lee", () => {
    const hoy = "2026-10-21";
    expect(planDeAgendas(["agenda-cultura", "universidades-museos", "web"], [], [], hoy)).toEqual([
      { paso: "buscar", clave: "agenda-cultura" },
      { paso: "buscar", clave: "universidades-museos" },
      { paso: "buscar", clave: "web" },
    ]);
    const viejo: FuenteAgenda = { url: PDF_SEPT, nombre: "septiembre", tipo: "pdf", clave: "agenda-cultura", mes: "2026-09" };
    const leido: FuenteAgenda = { url: PDF_OCT, nombre: "octubre", tipo: "pdf", clave: "agenda-cultura", mes: "2026-10", leida: "2026-10-20T00:00:00Z" };
    expect(planDeAgendas(["agenda-cultura"], [viejo, leido], [], hoy)).toEqual([]);
  });

  it("un PDF del mes siguiente se lee desde el día 1; una página, de hoy a 45 días en una sola lectura", () => {
    const nov: FuenteAgenda = { url: "https://x.example/nov.pdf", nombre: "noviembre", tipo: "pdf", clave: "agenda-cultura", mes: "2026-11" };
    expect(tareasDeLectura(nov, "2026-10-21").map((t) => (t.paso === "leer" ? `${t.desde}…${t.hasta}` : t.paso))).toEqual([
      "2026-11-01…2026-11-07",
      "2026-11-08…2026-11-14",
      "2026-11-15…2026-11-21",
      "2026-11-22…2026-11-28",
      "2026-11-29…2026-11-30",
    ]);
    const pagina: FuenteAgenda = { url: UASLP, nombre: "UASLP", tipo: "html", clave: "universidades-museos", mes: null };
    expect(tareasDeLectura(pagina, "2026-10-21")).toEqual([{ paso: "leer", fuente: pagina, desde: "2026-10-21", hasta: "2026-12-05" }]);
  });
});
