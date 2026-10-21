import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { pildoraCorrida } from "../ciudadesAdmin";
import { claveCatalogos, HERRAMIENTA_ARTISTAS, TOPE_POR_TAREA } from "./artistas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, type Dependencias } from "./motor";
import { costoDeUso, redondear } from "./precios";
import { listaSic } from "./sicFalso";

// ---------- el mundo de la prueba (todo inventado, sin red) ----------
const AHORA = new Date("2026-10-21T16:00:00Z");
const ZONA = "America/Mexico_City";
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: ZONA, alias: ["Soledad de Graciano Sánchez"], estado: "abierta", parametros: {} };
const CDMX = { slug: "ciudad-de-mexico", nombre: "Ciudad de México", lat: 19.415, lng: -99.16, zoom: 13, zona: ZONA, alias: [], estado: "abierta", parametros: { alcaldias: ["Cuauhtémoc", "Coyoacán"] } };
const FUENTES = ["padrones", "festivales", "web"];
const corrida = (id: string, cambios: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "artistas",
  ciudad: "san-luis-potosi",
  parametros: { fuentes: FUENTES },
  tope_usd: 3,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-10-21T15:59:00Z",
  inicio: null,
  fin: null,
  ...cambios,
});

const CAT = "https://catalogo-artistas.example/directorio";
const CAT2 = "https://catalogo-artistas.example/musica";
const PECDA = "https://cultura.slp.gob.mx/pecda-2026";
const FEST = "https://festivaldesierto.example/programa";
const ESC = "https://artes.uni.example/grupos";
const WEB = "https://noticias.example/artistas-slp";

const SIC_SLP = listaSic("gpo_artistico", {
  Matehuala: [["1", "Grupo de Matehuala", "Música"]],
  "San Luis Potosí": [
    ["2", "Los Tecolotes del Desierto", "Música"],
    ["3", "Rosa y Luna", "Música"],
    ["4", "Banda Rechazada", "Música"],
  ],
  "Soledad de Graciano Sánchez": [["5", "Ensamble del Altiplano", "Música"]],
});
const CSV_FESTIVAL = ["festival_id,festival_nombre,festival_disciplina,festival_sede,pagina_web,email", '1,"Festival del Desierto","","","festivaldesierto.example",""'].join("\n");
const CSV_ESCUELAS = ["educacion_artistica_id,educacion_artistica_nombre,nom_mun,nom_loc,email,pagina_web", '1,"Licenciatura en Artes","San Luis Potosí","San Luis Potosí","","https://artes.uni.example"'].join("\n");

function pedirFalso(listas: Record<string, string> = { "gpo_artistico-24": SIC_SLP }) {
  const pedidas: string[] = [];
  const pedir = (async (url: string) => {
    pedidas.push(url);
    const u = new URL(url);
    if (u.pathname === "/lista.php") return new Response(listas[`${u.searchParams.get("table")}-${u.searchParams.get("estado_id")}`] ?? "<html><body>Sin resultados</body></html>");
    if (u.pathname.endsWith("_festival_directorio.csv")) return new Response(new Uint8Array(Buffer.from(CSV_FESTIVAL, "latin1")));
    if (u.pathname.endsWith("_educacion_artistica_directorio.csv")) return new Response(new Uint8Array(Buffer.from(CSV_ESCUELAS, "latin1")));
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { pedir, pedidas };
}

type A = { nombre: string; disciplina: string; detalle: string | null; tipo: string; municipio: string | null; redes: string[]; url: string; obra: string | null };
const art = (nombre: string, url: string, extra: Partial<A> = {}): A => ({ nombre, disciplina: "musica", detalle: null, tipo: "grupo", municipio: "San Luis Potosí", redes: [], url, obra: null, ...extra });

/** Lo que «encuentra» la API falsa según el encargo. */
function lectura(cuerpo: Anthropic.MessageCreateParams): { artistas: A[]; catalogos: { nombre: string; url: string }[]; paginas: string[] } {
  const texto = String(cuerpo.messages[0].content);
  if (texto.includes("Busca catálogos o directorios"))
    return {
      catalogos: [{ nombre: "Directorio de Artistas de San Luis", url: CAT }],
      artistas: [art("Coro Voces del Altiplano", CAT, { detalle: "Coro de cámara" }), art("Rosa & Luna", CAT), art("Ensamble del Altiplano", CAT)],
      paginas: [CAT],
    };
  if (texto.includes("Abre el catálogo de artistas")) return { catalogos: [], artistas: [art("Nuevo del Catálogo", CAT2), art("Coro Voces del Altiplano", CAT2)], paginas: [CAT2] };
  if (texto.includes("padrón o registro estatal"))
    return {
      catalogos: [],
      artistas: [
        art("Marta Solís", PECDA, { disciplina: "letras", detalle: "Poesía", tipo: "solista", obra: "Seleccionada en poesía con un poemario sobre el altiplano." }),
        art("Pedro Lejano", PECDA, { municipio: "Rioverde", tipo: "solista" }),
        art("Inventado Sin Fuente", "https://otro.example/x"),
        art("Banda Rechazada", PECDA),
      ],
      paginas: [PECDA],
    };
  if (texto.includes("festivales culturales")) return { catalogos: [], artistas: [art("Trío Huasteco del Centro", FEST, { detalle: "Son huasteco", redes: ["https://instagram.com/triohuasteco"] })], paginas: [FEST] };
  if (texto.includes("escuelas y facultades de arte")) return { catalogos: [], artistas: [art("Compañía Universitaria de Danza", ESC, { disciplina: "danza" })], paginas: [ESC] };
  if (texto.includes("Haz estas búsquedas y no más")) return { catalogos: [], artistas: [art("Ya Propuesto", WEB)], paginas: [WEB] };
  return { catalogos: [], artistas: [], paginas: [] };
}

const USO = { input_tokens: 30_000, output_tokens: 2_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 1, web_fetch_requests: 1 } };
const COSTO = costoDeUso(USO, MODELO_RUTINAS);
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
        { type: "web_search_tool_result", tool_use_id: "s", content: r.paginas.map((url) => ({ type: "web_search_result", url, title: "x", encrypted_content: "", page_age: null })) },
        { type: "tool_use", id: "t", name: "proponer_artistas", input: { artistas: r.artistas, catalogos: r.catalogos } },
      ],
    };
  });
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

function mundo(corridas: Fila[] = [corrida("c-art")]) {
  return baseFalsa({
    ciudades: [structuredClone(SLP), structuredClone(CDMX)],
    artistas: [
      { id: "a1", nombre: "Rosa y Luna", disciplina: "musica", ciudad: "San Luis Potosí" },
      { id: "a2", nombre: "La Güera", disciplina: "artes_visuales", ciudad: "San Luis Potosí" },
      { id: "a3", nombre: "Banda de Otra Ciudad", disciplina: "musica", ciudad: "Oaxaca" },
    ],
    rutinas_corridas: [corrida("c-vieja", { estado: "terminada", creado_en: "2026-09-25T00:00:00Z" }), ...corridas],
    propuestas: [
      { id: "p-rech", corrida_id: "c-vieja", tipo: "artista", fuente: "Búsqueda web", datos: { nombre: "Banda Rechazada" }, estado: "rechazada", motivo_rechazo: "no_cultural" },
      { id: "p-ya", corrida_id: "c-vieja", tipo: "artista", fuente: "Búsqueda web", datos: { nombre: "Ya Propuesto" }, estado: "propuesta" },
      { id: "p-lugar", corrida_id: "c-vieja", tipo: "lugar", fuente: "Búsqueda web", datos: { nombre: "Los Tecolotes del Desierto" }, estado: "rechazada", motivo_rechazo: "no_cultural" },
    ],
    configuracion: [],
  });
}

function dependencias(base: ReturnType<typeof mundo>, opciones: { api?: ClienteApi | null; listas?: Record<string, string> } = {}) {
  const { pedir, pedidas } = pedirFalso(opciones.listas);
  const falsa = apiFalsa();
  const dep: Dependencias = { db: base.db, api: opciones.api === undefined ? falsa.api : opciones.api, mapbox: null, pedir, ahora: () => AHORA, plazoMs: 45_000 };
  return { dep, pedidas, create: falsa.create };
}
const laCorrida = (base: ReturnType<typeof mundo>, id = "c-art") => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
const nuevas = (base: ReturnType<typeof mundo>, id = "c-art") => base.tablas.propuestas.filter((p) => p.corrida_id === id);
async function hastaTerminar(dep: Dependencias, maximo = 30) {
  for (let i = 0; i < maximo; i++) if ((await correrUnPaso(dep)).estado !== "corriendo") return;
}
const pedido = (create: ReturnType<typeof apiFalsa>["create"], i: number) => (create.mock.calls[i] as unknown as [Anthropic.MessageCreateParams])[0];
const queHizo = (c: Anthropic.MessageCreateParams) => {
  const t = String(c.messages[0].content);
  return t.includes("Busca catálogos") ? "buscar catálogos" : t.includes("Abre el catálogo") ? "leer catálogo" : t.includes("padrón") ? "padrón" : t.includes("festivales culturales") ? "festivales" : t.includes("escuelas y facultades") ? "escuelas" : "web";
};
const herramienta = (c: Anthropic.MessageCreateParams, nombre: string) => (c.tools ?? []).find((t) => (t as { name?: string }).name === nombre) as Record<string, unknown> | undefined;

describe("«Buscar artistas» de punta a punta (OL-430)", () => {
  it("los catálogos primero: el SIC gratis, luego buscar catálogos y el padrón con los estímulos; después festivales y escuelas; la web al final", async () => {
    const base = mundo();
    const { dep, create, pedidas } = dependencias(base);
    await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    // El primer paso lee las listas del SIC del estado (sin la API); el estado sale del nombre de la ciudad (sin Mapbox).
    expect(pedidas.slice(0, 2)).toEqual(["https://sic.cultura.gob.mx/lista.php?table=gpo_artistico&disciplina=&estado_id=24", "https://sic.cultura.gob.mx/lista.php?table=artista&disciplina=&estado_id=24"]);
    expect(create.mock.calls.map((_, i) => queHizo(pedido(create, i)))).toEqual(["buscar catálogos", "padrón", "festivales", "escuelas", "web"]);
    // El padrón y los estímulos, solo en sitios de gobierno; las escuelas, en sus propios sitios (las del SIC); la web, las dos disciplinas que faltan.
    expect(herramienta(pedido(create, 1), "web_search")).toMatchObject({ type: "web_search_20260209", max_uses: 2, allowed_domains: ["gob.mx"] });
    expect(herramienta(pedido(create, 1), "web_fetch")).toMatchObject({ type: "web_fetch_20260209", allowed_domains: ["gob.mx"] });
    expect(String(pedido(create, 2).messages[0].content)).toContain("Festival del Desierto");
    expect(herramienta(pedido(create, 3), "web_fetch")).toMatchObject({ allowed_domains: ["artes.uni.example"] });
    expect(herramienta(pedido(create, 3), "web_search")).toBeUndefined();
    expect(String(pedido(create, 4).messages[0].content)).toContain("«artistas de teatro en San Luis Potosí» y «artistas de danza en San Luis Potosí»");
    expect(herramienta(pedido(create, 4), "proponer_artistas")).toBe(HERRAMIENTA_ARTISTAS);
    expect(HERRAMIENTA_ARTISTAS.strict).toBe(true);
    // Lo que se le dice: dónde cuenta y lo que ya se conoce (con lo rechazado).
    expect(String(pedido(create, 0).messages[0].content)).toMatch(/Ciudad: San Luis Potosí \(San Luis Potosí, México\)\. Municipios que cuentan: San Luis Potosí, Soledad de Graciano Sánchez\.[\s\S]*Ya se conocen \(no los propongas\): Rosa y Luna; La Güera; Banda Rechazada; Ya Propuesto/);
    expect(c.resumen).toMatchObject({ paso: "3 de 3 fuentes", avance: 1, propuestos: 6, busquedas_web: 5, catalogos_leidos: 0 });
    expect(Number(c.gasto_usd)).toBe(redondear(5 * COSTO));
    expect(c.resumen.por_fuente).toEqual({ padrones: { propuestos: 4, usd: redondear(2 * COSTO) }, festivales: { propuestos: 2, usd: redondear(2 * COSTO) }, web: { propuestos: 0, usd: redondear(COSTO) } });
    expect(pildoraCorrida({ estado: "terminada", gasto_usd: Number(c.gasto_usd), tope_usd: 3, resumen: c.resumen })).toEqual({ texto: "Terminada", tono: "verde" });
  });

  it("sin repetidos: fuera lo que ya está en artistas (con sus variantes), lo propuesto y lo rechazado antes, lo de otro municipio y lo que no trae una página vista", async () => {
    const base = mundo();
    const { dep } = dependencias(base);
    await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(nuevas(base).map((p) => [p.fuente, (p.datos as Fila).nombre])).toEqual([
      ["Sistema de Información Cultural", "Los Tecolotes del Desierto"],
      ["Sistema de Información Cultural", "Ensamble del Altiplano"],
      ["Catálogos de artistas", "Coro Voces del Altiplano"],
      ["Padrones y estímulos", "Marta Solís"],
      ["Festivales", "Trío Huasteco del Centro"],
      ["Escuelas de arte", "Compañía Universitaria de Danza"],
    ]);
    // «Rosa y Luna» (SIC) y «Rosa & Luna» (catálogo) ya existen; «Ensamble del Altiplano» ya salió del SIC en esta corrida y «Ya Propuesto»
    // de una anterior; «Banda Rechazada» se rechazó antes (dos fuentes la traen); «Pedro Lejano» es de Rioverde; «Inventado Sin Fuente» cita
    // una página que la rutina nunca vio. Lo del municipio de Matehuala ni se lee. Contadores, nunca nombres.
    expect(c.resumen.descartados).toEqual({ ya_existe: 2, ya_propuesto: 2, rechazado_antes: 2, fuera_de_la_ciudad: 1, sin_fuente: 1, de_mas: 0 });
    expect(c.resumen.duplicados).toBe(4);
    expect(JSON.stringify(c.resumen)).not.toMatch(/Rosa|Banda|Lejano|Inventado/);
  });

  it("cada propuesta con el contrato de la bandeja: ficha mínima y, aparte, lo que sirve para nutrirla después", async () => {
    const base = mundo();
    const { dep } = dependencias(base);
    await hastaTerminar(dep);
    const datos = (nombre: string) => nuevas(base).find((p) => (p.datos as Fila).nombre === nombre)!.datos;
    expect(datos("Marta Solís")).toEqual({
      nombre: "Marta Solís",
      disciplina: "letras",
      tipo: "solista",
      ciudad: "San Luis Potosí",
      redes: [],
      leida: AHORA.toISOString(),
      detalle: "Poesía",
      url: PECDA,
      municipio: "San Luis Potosí",
      obra: "Seleccionada en poesía con un poemario sobre el altiplano.",
    });
    expect(datos("Trío Huasteco del Centro")).toMatchObject({ redes: ["https://instagram.com/triohuasteco"], detalle: "Son huasteco", url: FEST });
    expect(datos("Los Tecolotes del Desierto")).toMatchObject({ disciplina: "musica", tipo: "grupo", municipio: "San Luis Potosí", url: "https://sic.cultura.gob.mx/ficha.php?table=gpo_artistico&table_id=2" });
    expect(nuevas(base).every((p) => p.tipo === "artista" && p.estado === undefined)).toBe(true);
  });

  it("guarda los catálogos encontrados y la siguiente corrida los sigue leyendo (sin volver a buscar ni a repetir nada)", async () => {
    const base = mundo();
    const primera = dependencias(base);
    await hastaTerminar(primera.dep);
    const guardado = base.tablas.configuracion.find((f) => f.clave === claveCatalogos("san-luis-potosi"))!.valor as Record<string, unknown>;
    expect(claveCatalogos("san-luis-potosi")).toBe("catalogos_artistas_san_luis_potosi");
    expect(guardado).toMatchObject({
      buscado: AHORA.toISOString(),
      catalogos: [
        { nombre: "Catálogo de Artistas Potosinos (CAPO)", url: "https://www.catalogoartistaspotosino.com/", importado: true, leidas: [] },
        { nombre: "Directorio de Artistas de San Luis", url: CAT, leidas: [CAT] },
      ],
    });
    base.tablas.rutinas_corridas.push(corrida("c-art2", { creado_en: "2026-10-21T15:59:30Z" }));
    const segunda = dependencias(base);
    await hastaTerminar(segunda.dep);
    expect(segunda.create.mock.calls.map((_, i) => queHizo(pedido(segunda.create, i)))).toEqual(["leer catálogo", "padrón", "festivales", "escuelas", "web"]);
    const leer = pedido(segunda.create, 0);
    expect(herramienta(leer, "web_fetch")).toMatchObject({ max_uses: 3, allowed_domains: ["catalogo-artistas.example"] });
    expect(String(leer.messages[0].content)).toContain(`Ya se leyeron estas páginas; abre otras: ${CAT}.`);
    // Lo de la primera corrida ya está propuesto: solo entra lo nuevo del catálogo, con el nombre del catálogo como fuente.
    expect(nuevas(base, "c-art2").map((p) => [p.fuente, (p.datos as Fila).nombre])).toEqual([["Directorio de Artistas de San Luis", "Nuevo del Catálogo"]]);
    expect(laCorrida(base, "c-art2").resumen).toMatchObject({ catalogos_leidos: 1, propuestos: 1 });
    const despues = base.tablas.configuracion.find((f) => f.clave === claveCatalogos("san-luis-potosi"))!.valor as { catalogos: { leidas: string[] }[] };
    expect(despues.catalogos[1].leidas).toEqual([CAT, CAT2]);
  });

  it("el tope corta las llamadas a la API (lo gratis ya quedó propuesto) y Corridas dice «Llegó al tope»", async () => {
    const base = mundo([corrida("c-art", { tope_usd: 0.35 })]);
    const { dep, create } = dependencias(base);
    await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(create).toHaveBeenCalledTimes(1);
    expect(c.resumen.tope).toBe(true);
    expect(nuevas(base)).toHaveLength(3);
    expect(pildoraCorrida({ estado: "terminada", gasto_usd: Number(c.gasto_usd), tope_usd: 0.35, resumen: c.resumen })).toEqual({ texto: "Llegó al tope", tono: "naranja" });
  });

  it(`como mucho ${TOPE_POR_TAREA} por tarea (lo demás llega en la siguiente corrida); sin la llave de la API, solo lo gratis y lo dice`, async () => {
    const muchos = listaSic("gpo_artistico", { "San Luis Potosí": Array.from({ length: 45 }, (_, i): [string, string, string] => [String(100 + i), `Grupo Número ${i + 1}`, "Danza"]) });
    const base = mundo([corrida("c-art", { parametros: { fuentes: ["padrones"] } })]);
    const { dep } = dependencias(base, { api: null, listas: { "gpo_artistico-24": muchos } });
    await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(nuevas(base)).toHaveLength(TOPE_POR_TAREA);
    expect(c.resumen.descartados).toMatchObject({ de_mas: 5 });
    expect(c.resumen.avisos).toEqual(["Sin llave de la API: no se hicieron las búsquedas"]);
    expect(c.resumen.paso).toBe("1 de 1 fuente");
  });

  it("con alcaldías (Ciudad de México), solo las de su lista; el estado sale de su nombre", async () => {
    const lista = listaSic("gpo_artistico", {
      Coyoacán: [["1", "Cuarteto de Coyoacán", "Música"]],
      Tlalpan: [["2", "Teatro de Tlalpan", "Teatro"]],
    });
    const base = mundo([corrida("c-cdmx", { ciudad: "ciudad-de-mexico", parametros: { fuentes: ["padrones"] } })]);
    const { dep, pedidas } = dependencias(base, { api: null, listas: { "gpo_artistico-9": lista } });
    await hastaTerminar(dep);
    expect(pedidas[0]).toBe("https://sic.cultura.gob.mx/lista.php?table=gpo_artistico&disciplina=&estado_id=9");
    expect(nuevas(base, "c-cdmx").map((p) => [(p.datos as Fila).nombre, (p.datos as Fila).ciudad])).toEqual([["Cuarteto de Coyoacán", "Ciudad de México"]]);
  });
});
