import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { pildoraCorrida } from "../ciudadesAdmin";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, OCUPADA_MS, SIN_RUTINA, type Dependencias } from "./motor";
import { costoDeUso, redondear } from "./precios";

// ---------- el mundo de la prueba (todo inventado, sin red) ----------
const AHORA = new Date("2026-10-20T16:00:00Z");
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: "America/Mexico_City", alias: ["Soledad de Graciano Sánchez"], estado: "abierta" };
const CERRADA = { ...SLP, slug: "ciudad-cerrada", nombre: "Ciudad Cerrada", alias: [], estado: "cerrada" };

const corrida = (id: string, cambios: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "lugares",
  ciudad: "san-luis-potosi",
  parametros: { fuentes: ["sic", "cultura", "web"] },
  tope_usd: 3,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-10-20T15:59:00Z",
  inicio: null,
  fin: null,
  ...cambios,
});

function mundo(corridas: Fila[] = [corrida("c-lug")]) {
  return baseFalsa({
    ciudades: [structuredClone(SLP), structuredClone(CERRADA)],
    lugares: [{ id: "l1", nombre: "Teatro de la Paz", lat: 22.1519, lng: -100.9738, ciudad: "San Luis Potosí" }],
    rutinas_corridas: [corrida("c-vieja", { estado: "terminada", creado_en: "2026-09-01T00:00:00Z" }), ...corridas],
    propuestas: [
      { id: "p-r1", corrida_id: "c-vieja", tipo: "lugar", fuente: "Búsqueda web", datos: { nombre: "Salón de Fiestas Los Arcos" }, estado: "rechazada", motivo_rechazo: "no_cultural" },
      { id: "p-r2", corrida_id: "c-vieja", tipo: "lugar", fuente: "Sistema de Información Cultural", datos: { nombre: "Galería Rechazada" }, estado: "rechazada", motivo_rechazo: "duplicado" },
    ],
  });
}

// El SIC: una tabla de museos y otra de teatros del estado 24; las demás, vacías.
const CABECERA = (t: string) => `${t}_id,${t}_nombre,nom_mun,nom_loc,${t}_calle_numero,${t}_colonia,${t}_cp,pagina_web,gmaps_longitud,gmaps_latitud`;
const TABLAS: Record<string, string[]> = {
  museo: [
    '1,"Museo Nacional de la Máscara","San Luis Potosí","San Luis Potosí","Villerías 2","Centro","78000","",-100.9752,22.1505',
    '2,"Galería Rechazada","San Luis Potosí","San Luis Potosí","Calle 3","Centro","78000","",-100.97,22.15',
    '3,"Museo del Otro Lado","Soledad de Graciano Sánchez","Soledad de Graciano Sánchez","Calle Lejana 9","Centro","78430","",-99.0,21.9',
    '4,"Museo de Rioverde","Rioverde","Rioverde","Calle 1","Centro","79610","",-99.99,21.93',
  ],
  teatro: ['9,"Teatro de la Paz","San Luis Potosí","San Luis Potosí","Villerías 205","Centro","78000","",-100.9738,22.1519'],
};

function pedirFalso() {
  const pedidas: string[] = [];
  const pedir = (async (url: string) => {
    pedidas.push(url);
    const u = new URL(url);
    if (u.hostname === "sic.cultura.gob.mx") {
      const t = u.pathname.match(/\/24_(\w+?)_directorio\.csv$/)?.[1] ?? "";
      return new Response(new Uint8Array(Buffer.from([CABECERA(t), ...(TABLAS[t] ?? [])].join("\n"), "latin1")));
    }
    if (u.pathname.includes("/geocode/v6/reverse")) return Response.json({ features: [{ properties: { context: { country: { country_code: "MX" }, region: { name: "San Luis Potosí", region_code: "SLP" } } } }] });
    if (u.pathname.includes("/geocode/v6/forward")) {
      const q = u.searchParams.get("q") ?? "";
      if (q.startsWith("Av. Venustiano Carranza 500")) return Response.json({ features: [{ properties: { feature_type: "address", full_address: "Avenida Venustiano Carranza 500, 78000 San Luis Potosí", coordinates: { latitude: 22.152, longitude: -100.99 } } }] });
      return Response.json({ features: [] });
    }
    if (u.pathname.includes("/searchbox/v1/suggest"))
      return Response.json({ suggestions: u.searchParams.get("q") === "Foro Independiente El Hueco" ? [{ mapbox_id: "hueco", name: "Foro Independiente El Hueco" }] : [] });
    if (u.pathname.includes("/searchbox/v1/retrieve/hueco")) return Response.json({ features: [{ geometry: { coordinates: [-100.98, 22.145] }, properties: { full_address: "Calle Hueco 4, Centro" } }] });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { pedir, pedidas };
}

// La API: según lo que se le pide, una lista distinta; cada respuesta cuesta lo mismo.
const USO = { input_tokens: 20_000, output_tokens: 1_500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 2, web_fetch_requests: 0 } };
const COSTO = costoDeUso(USO, MODELO_RUTINAS);
const PAGINA = "https://cultura.slp.gob.mx/espacios";
const L = (nombre: string, extra: Record<string, unknown> = {}) => ({ nombre, tipo: "foro", detalle: "Foro de música y teatro", direccion: null, municipio: "San Luis Potosí", redes: [], url: PAGINA, ...extra });
function apiFalsa(alLlamar?: () => void) {
  const create = vi.fn(async (cuerpo: Anthropic.MessageCreateParams) => {
    alLlamar?.();
    const pedido = String(cuerpo.messages[0].content);
    const lugares = pedido.includes("gobierno del estado")
      ? [
          L("Centro Cultural Carranza", { tipo: "casa_de_cultura", direccion: "Av. Venustiano Carranza 500, Centro" }),
          L("Salón de Fiestas Los Arcos", { tipo: "otro" }),
          L("Casa de Cultura de Valles", { municipio: "Ciudad Valles" }),
        ]
      : pedido.includes("Ayuntamiento")
        ? [L("Foro Independiente El Hueco", { url: "https://inventada.example/foro" })]
        : pedido.includes("«espacios culturales")
          ? [L("Museo Nacional de la Máscara", { tipo: "museo" }), L("Sin Ubicar Nunca")]
          : [];
    return {
      id: "m",
      type: "message",
      role: "assistant",
      model: MODELO_RUTINAS,
      stop_reason: "tool_use",
      usage: USO,
      content: [
        { type: "web_search_tool_result", tool_use_id: "s", content: [{ type: "web_search_result", url: PAGINA, title: "Espacios", encrypted_content: "", page_age: null }] },
        { type: "tool_use", id: "t", name: "proponer_lugares", input: { lugares } },
      ],
    };
  });
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

function dependencias(base: ReturnType<typeof mundo>, opciones: { api?: ClienteApi | null; alLlamar?: () => void } = {}) {
  const { pedir, pedidas } = pedirFalso();
  const falsa = apiFalsa(opciones.alLlamar);
  const dep: Dependencias = { db: base.db, api: opciones.api === undefined ? falsa.api : opciones.api, mapbox: { token: "token-de-prueba", pedir }, pedir, ahora: () => AHORA, plazoMs: 45_000 };
  return { dep, pedidas, create: falsa.create };
}

const laCorrida = (base: ReturnType<typeof mundo>, id = "c-lug") => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
const propuestasDe = (base: ReturnType<typeof mundo>, id = "c-lug") => base.tablas.propuestas.filter((p) => p.corrida_id === id);
/** Al terminar cada paso la corrida queda libre (como si pasara el tiempo hasta el siguiente). */
async function hastaTerminar(dep: Dependencias, base: ReturnType<typeof mundo>, maximo = 20) {
  const pasos = [];
  for (let i = 0; i < maximo; i++) {
    const r = await correrUnPaso(dep);
    pasos.push(r);
    if (r.estado !== "corriendo") break;
  }
  return pasos;
}

describe("el motor: una corrida de «Buscar lugares» de punta a punta", () => {
  it("el primer paso la reclama, lee el SIC (gratis), propone lo nuevo con su punto y deja el resto en el cursor", async () => {
    const base = mundo();
    const { dep, create } = dependencias(base);
    const r = await correrUnPaso(dep);
    expect(r).toEqual({ corrida: "c-lug", tipo: "lugares", estado: "corriendo", usd: 0 });
    const c = laCorrida(base);
    expect(c.estado).toBe("corriendo");
    expect(c.inicio).toBe(AHORA.toISOString());
    expect(create).not.toHaveBeenCalled();
    expect(c.resumen).toMatchObject({
      paso: "1 de 3 fuentes",
      propuestos: 1,
      duplicados: 1,
      errores: 0,
      descartados: { ya_existe: 1, ya_propuesto: 0, rechazado_antes: 1, fuera_de_la_ciudad: 0, sin_ubicacion: 0, de_mas: 0 },
      turno: 1,
      ocupada_hasta: null,
      intentos: 0,
    });
    expect(Number(c.resumen.avance)).toBeGreaterThan(0);
    const cursor = c.resumen.cursor as { pendientes: { nombre: string }[]; tareas: unknown[] };
    expect(cursor.pendientes.map((p) => p.nombre)).toEqual(["Museo del Otro Lado"]);
    expect(cursor.tareas).toHaveLength(4);
    const [p] = propuestasDe(base);
    expect(p).toMatchObject({ tipo: "lugar", fuente: "Sistema de Información Cultural", corrida_id: "c-lug" });
    expect(p.datos).toEqual({
      nombre: "Museo Nacional de la Máscara",
      tipo: "museo",
      direccion: "Villerías 2, Centro, 78000",
      lat: 22.1505,
      lng: -100.9752,
      ciudad: "San Luis Potosí",
      redes: [],
      url: "https://sic.cultura.gob.mx/ficha.php?table=museo&table_id=1",
      leida: AHORA.toISOString(),
    });
  });

  it("paso a paso hasta «Terminada»: cada fuente en su orden, lotes de Mapbox, gasto real, nada repetido ni rechazado, y el resumen sin nombres", async () => {
    const base = mundo();
    const { dep, create } = dependencias(base);
    const pasos = await hastaTerminar(dep, base);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(c.fin).toBe(AHORA.toISOString());
    expect(pasos.at(-1)?.estado).toBe("terminada");
    expect(create).toHaveBeenCalledTimes(4);
    expect(Number(c.gasto_usd)).toBe(redondear(4 * COSTO));
    expect(pasos.reduce((s, p) => s + p.usd, 0)).toBeCloseTo(4 * COSTO, 10);
    expect(c.resumen.cursor).toBeUndefined();
    expect(c.resumen).toMatchObject({
      paso: "3 de 3 fuentes",
      avance: 1,
      propuestos: 3,
      busquedas_web: 8,
      descartados: { ya_existe: 1, ya_propuesto: 1, rechazado_antes: 2, fuera_de_la_ciudad: 2, sin_ubicacion: 1, de_mas: 0 },
      por_fuente: { sic: { propuestos: 1, usd: 0 }, cultura: { propuestos: 2, usd: redondear(2 * COSTO) }, web: { propuestos: 0, usd: redondear(2 * COSTO) } },
    });
    expect(c.resumen.tope).toBeUndefined();
    // Ni un nombre en el resumen: solo contadores.
    expect(JSON.stringify(c.resumen)).not.toMatch(/Máscara|Carranza|Hueco|Arcos|Valles/);
    const ps = propuestasDe(base);
    expect(ps.map((p) => [p.fuente, (p.datos as Fila).nombre])).toEqual([
      ["Sistema de Información Cultural", "Museo Nacional de la Máscara"],
      ["Cultura del estado y del municipio", "Centro Cultural Carranza"],
      ["Cultura del estado y del municipio", "Foro Independiente El Hueco"],
    ]);
    const carranza = ps[1].datos as Fila;
    expect(carranza).toMatchObject({ tipo: "casa_de_cultura", lat: 22.152, lng: -100.99, ciudad: "San Luis Potosí", url: PAGINA, detalle: "Foro de música y teatro" });
    // La página que el modelo dijo y la búsqueda no trajo, no se guarda como fuente; la dirección sale de Mapbox.
    expect(ps[2].datos).toMatchObject({ direccion: "Calle Hueco 4, Centro" });
    expect((ps[2].datos as Fila).url).toBeUndefined();
  });

  it("le dice al modelo qué no proponer (lo conocido y lo rechazado por no ser cultural) y acota Cultura a los sitios de gobierno", async () => {
    const base = mundo();
    const { dep, create } = dependencias(base);
    await hastaTerminar(dep, base);
    const [primera] = create.mock.calls[0] as unknown as [Anthropic.MessageCreateParams];
    const pedido = String(primera.messages[0].content);
    expect(pedido).toContain("Ciudad: San Luis Potosí (San Luis Potosí, México). Municipios que cuentan: San Luis Potosí, Soledad de Graciano Sánchez.");
    expect(pedido).toMatch(/Ya se conocen \(no los propongas\): .*Teatro de la Paz/);
    expect(pedido).toContain("no propongas nada parecido: Salón de Fiestas Los Arcos.");
    const deBusqueda = (t: unknown) => (t as { name?: string }).name === "web_search";
    const busqueda = primera.tools?.find(deBusqueda) as Anthropic.WebSearchTool20260209;
    expect(busqueda.allowed_domains).toEqual(["gob.mx"]);
    expect(busqueda.max_uses).toBe(2);
    expect(busqueda.user_location).toMatchObject({ city: "San Luis Potosí", region: "San Luis Potosí", country: "MX" });
    const web = create.mock.calls.slice(2).map((c) => (c as unknown as [Anthropic.MessageCreateParams])[0].tools?.find(deBusqueda) as Anthropic.WebSearchTool20260209);
    expect(web.map((t) => t.max_uses)).toEqual([2, 2]);
    expect(web.every((t) => !t.allowed_domains)).toBe(true);
  });

  it("dos llamadas a la vez: solo una toma la corrida; la otra no corre nada", async () => {
    const base = mundo();
    const { dep, pedidas } = dependencias(base);
    const [a, b] = await Promise.all([correrUnPaso(dep), correrUnPaso(dep)]);
    expect([a.estado, b.estado].sort()).toEqual(["corriendo", "nada"]);
    expect(pedidas.filter((u) => u.includes("sic.cultura.gob.mx"))).toHaveLength(6);
    expect(propuestasDe(base)).toHaveLength(1);
  });

  it("una corrida que otro está trabajando (ocupada) no se toma; al vencer, sí, con el turno siguiente", async () => {
    const base = mundo([corrida("c-lug", { estado: "corriendo", inicio: AHORA.toISOString(), resumen: { turno: 3, ocupada_hasta: new Date(AHORA.getTime() + 30_000).toISOString(), intentos: 1 } })]);
    const { dep } = dependencias(base);
    expect((await correrUnPaso(dep)).estado).toBe("nada");
    laCorrida(base).resumen.ocupada_hasta = new Date(AHORA.getTime() - 1).toISOString();
    expect((await correrUnPaso(dep)).corrida).toBe("c-lug");
    expect(laCorrida(base).resumen.turno).toBe(4);
    expect(OCUPADA_MS).toBeGreaterThan(60_000);
  });
});

describe("el tope", () => {
  it("si la siguiente llamada ya no cabe, se dejan las fuentes con API, se termina lo ya leído y Corridas dice «Llegó al tope»", async () => {
    const base = mundo([corrida("c-lug", { gasto_usd: 2.8 })]);
    const { dep, create } = dependencias(base);
    await hastaTerminar(dep, base);
    const c = laCorrida(base);
    expect(create).not.toHaveBeenCalled();
    expect(c.estado).toBe("terminada");
    expect(c.resumen.tope).toBe(true);
    expect(Number(c.gasto_usd)).toBe(2.8);
    expect(pildoraCorrida({ estado: "terminada", gasto_usd: 2.8, tope_usd: 3, resumen: c.resumen })).toEqual({ texto: "Llegó al tope", tono: "naranja" });
    expect(pildoraCorrida({ estado: "terminada", gasto_usd: 2.8, tope_usd: 3, resumen: {} })).toEqual({ texto: "Terminada", tono: "verde" });
  });

  it("corta a media corrida: una llamada cabe, la siguiente ya no", async () => {
    const base = mundo([corrida("c-lug", { gasto_usd: 2.6 })]);
    const { dep, create } = dependencias(base);
    await hastaTerminar(dep, base);
    expect(create).toHaveBeenCalledTimes(1);
    const c = laCorrida(base);
    expect(c.resumen.tope).toBe(true);
    expect(Number(c.gasto_usd)).toBe(redondear(2.6 + COSTO));
    expect(Number(c.gasto_usd)).toBeLessThanOrEqual(3);
  });
});

describe("la cancelación", () => {
  it("cancelada entre pasos: el siguiente paso no hace nada", async () => {
    const base = mundo();
    const { dep, create } = dependencias(base);
    await correrUnPaso(dep);
    laCorrida(base).estado = "cancelada";
    const antes = structuredClone(base.tablas.rutinas_corridas);
    expect(await correrUnPaso(dep)).toEqual({ corrida: null, tipo: null, estado: "nada", usd: 0 });
    expect(base.tablas.rutinas_corridas).toEqual(antes);
    expect(create).not.toHaveBeenCalled();
  });

  it("cancelada a medio paso: no propone lo leído, anota lo gastado y se queda cancelada", async () => {
    const base = mundo([corrida("c-lug", { parametros: { fuentes: ["cultura"] } })]);
    const { dep } = dependencias(base, { alLlamar: () => void (laCorrida(base).estado = "cancelada") });
    const r = await correrUnPaso(dep);
    expect(r.estado).toBe("cancelada");
    const c = laCorrida(base);
    expect(c.estado).toBe("cancelada");
    expect(Number(c.gasto_usd)).toBe(redondear(COSTO));
    expect(c.resumen.cursor).toBeUndefined();
    expect(propuestasDe(base)).toHaveLength(0);
  });
});

describe("lo que no corre", () => {
  it("los botones sin rutina todavía (agendas, artistas, showcase) se marcan «Falló» solo cuando el motor los toma", async () => {
    const base = mundo([corrida("c-age", { tipo: "agendas" }), corrida("c-sho", { tipo: "showcase", ciudad: null, creado_en: "2026-10-20T15:59:30Z" })]);
    const { dep, pedidas } = dependencias(base);
    expect(laCorrida(base, "c-age").estado).toBe("pendiente");
    await correrUnPaso(dep);
    await correrUnPaso(dep);
    for (const id of ["c-age", "c-sho"]) {
      const c = laCorrida(base, id);
      expect(c.estado).toBe("fallida");
      expect(c.fin).toBe(AHORA.toISOString());
      expect(c.resumen.error).toBe(SIN_RUTINA);
    }
    expect(pedidas).toHaveLength(0);
  });

  it("una ciudad cerrada no corre", async () => {
    const base = mundo([corrida("c-lug", { ciudad: "ciudad-cerrada" })]);
    const { dep, pedidas } = dependencias(base);
    await correrUnPaso(dep);
    expect(laCorrida(base)).toMatchObject({ estado: "fallida", resumen: { error: "La ciudad está cerrada" } });
    expect(pedidas).toHaveLength(0);
  });

  it("un tropiezo de la base suelta la corrida para reintentar; a la tercera seguida, «Falló»", async () => {
    const base = mundo();
    const { dep } = dependencias(base);
    base.fallar("lugares", "select");
    for (let i = 1; i <= 3; i++) {
      expect((await correrUnPaso(dep)).estado).toBe("corriendo");
      expect(laCorrida(base).resumen).toMatchObject({ ocupada_hasta: null, intentos: i, errores: i });
    }
    expect((await correrUnPaso(dep)).estado).toBe("fallida");
    expect(laCorrida(base).resumen.error).toBe("Se cortó tres veces seguidas en el mismo paso");
  });

  it("sin llave de la API: lee el SIC, dice que no hizo las búsquedas y termina sin gastar", async () => {
    const base = mundo();
    const { dep } = dependencias(base, { api: null });
    await hastaTerminar(dep, base);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(Number(c.gasto_usd)).toBe(0);
    expect(c.resumen.avisos).toEqual(["Sin llave de la API: no se hicieron las búsquedas web"]);
    expect(Number(c.resumen.errores)).toBe(4);
  });

  it("si el SIC no responde al servidor, se lee con la API (lectura web solo en sic.cultura.gob.mx) y se dice", async () => {
    const base = mundo([corrida("c-lug", { parametros: { fuentes: ["sic"] } })]);
    const { dep, create } = dependencias(base);
    const pedirSinSic = (async (url: string, init?: RequestInit) => (new URL(url).hostname === "sic.cultura.gob.mx" ? new Response("caído", { status: 503 }) : dep.pedir(url, init))) as typeof fetch;
    await hastaTerminar({ ...dep, pedir: pedirSinSic, mapbox: { token: "token-de-prueba", pedir: dep.pedir } }, base);
    expect(create).toHaveBeenCalledTimes(1);
    const [cuerpo] = create.mock.calls[0] as unknown as [Anthropic.MessageCreateParams];
    expect(String(cuerpo.messages[0].content)).toContain("https://sic.cultura.gob.mx/opendata/d/24_museo_directorio.csv");
    expect(cuerpo.tools?.[0]).toMatchObject({ type: "web_fetch_20260209", allowed_domains: ["sic.cultura.gob.mx"] });
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(c.resumen.avisos).toEqual(["El SIC no respondió al servidor: se leyó con la API"]);
    expect(Number(c.gasto_usd)).toBe(redondear(COSTO));
  });

  it("si las propuestas no se pueden guardar, se reintentan; a la tercera, «Falló» con lo gastado anotado", async () => {
    const base = mundo([corrida("c-lug", { parametros: { fuentes: ["sic"] } })]);
    const { dep } = dependencias(base);
    base.fallar("propuestas", "insert");
    const pasos = await hastaTerminar(dep, base);
    expect(pasos.map((p) => p.estado)).toEqual(["corriendo", "corriendo", "fallida"]);
    expect(laCorrida(base).resumen.error).toBe("No se pudieron guardar las propuestas");
  });
});
