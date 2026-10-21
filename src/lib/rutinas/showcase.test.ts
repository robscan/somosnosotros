import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { diaLocal } from "../fechas";
import { textoInvestigar, type CorridaInvestigar } from "../showcase";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, type Dependencias } from "./motor";
import { costoDeUso, redondear } from "./precios";
import { DOMINIOS_REDES, HERRAMIENTA_EVIDENCIAS, urlComparable } from "./showcase";

// ---------- el mundo de la prueba (todo inventado, sin red) ----------
const AHORA = new Date("2026-10-21T16:00:00Z");
const ARTISTA = "00000000-0000-4000-8000-0000000000a1";
const corrida = (id: string, cambios: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "showcase",
  ciudad: null,
  parametros: { artista_id: ARTISTA },
  tope_usd: 1,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-10-21T15:59:00Z",
  inicio: null,
  fin: null,
  ...cambios,
});

const PREMIO = "https://cultura.slp.gob.mx/resultados-pecda-2025";
const PREMIO2 = "https://www.cultura.slp.gob.mx/resultados-pecda-2025/#lista";
const NOTA = "https://noticias.example/sangre-de-coyote-entrevista";
const FEST = "https://festivaldesierto.example/programa-2026";
const ACEPTADA = "https://revista.example/disco-sangre-de-coyote";
const RECHAZADA = "https://blog.example/otro-sangre-de-coyote";

type E = { senal: string; tipo: string; titulo: string; url: string; fecha: string | null; fuente: string; coincide: string };
const ev = (url: string, extra: Partial<E> = {}): E => ({ senal: "obra", tipo: "premio", titulo: "Seleccionado en el PECDA 2025 en música", url, fecha: "2025-11-03", fuente: "Secretaría de Cultura de San Luis Potosí", coincide: "nombre_ciudad_y_disciplina", ...extra });

/** Lo que «encuentra» la API falsa en cada búsqueda. */
function lectura(cuerpo: Anthropic.MessageCreateParams): { evidencias: E[]; paginas: string[] } {
  const t = String(cuerpo.messages[0].content);
  if (t.includes("premio beca"))
    return {
      paginas: [PREMIO, RECHAZADA, ACEPTADA],
      evidencias: [
        ev(PREMIO2), // la misma página que vio, escrita con «www.», barra y «#»
        ev("https://otro.example/premio-inventado", { titulo: "Premio que la rutina no vio" }),
        ev(PREMIO, { coincide: "solo_nombre", titulo: "Un homónimo premiado", senal: "circulacion", tipo: "presentacion" }),
        ev("https://www.instagram.com/p/abc", { tipo: "obra", titulo: "Publicación en redes" }),
        ev(RECHAZADA, { titulo: "Lo que ya se rechazó" }),
        ev(ACEPTADA, { tipo: "obra", titulo: "Disco ya aceptado" }),
      ],
    };
  if (t.includes("entrevista nota")) return { paginas: [NOTA], evidencias: [ev(NOTA, { tipo: "prensa", titulo: "Entrevista sobre su segundo disco", fecha: "2026-09-12", fuente: "Noticias", coincide: "nombre_y_ciudad" })] };
  if (t.includes("festival presentación")) return { paginas: [FEST], evidencias: [ev(FEST, { senal: "circulacion", tipo: "presentacion", titulo: "En el programa del Festival del Desierto 2026", fecha: "2026-13-40", fuente: "Festival del Desierto" })] };
  return { paginas: [], evidencias: [] };
}

const USO = { input_tokens: 25_000, output_tokens: 1_500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 1, web_fetch_requests: 1 } };
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
        { type: "tool_use", id: "t", name: "proponer_evidencias", input: { evidencias: r.evidencias } },
      ],
    };
  });
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

function mundo(corridas: Fila[] = [corrida("c-sho")]) {
  return baseFalsa({
    ciudades: [],
    artistas: [{ id: ARTISTA, nombre: "Sangre de Coyote", disciplina: "musica", detalle: "Rock del desierto", tipo: "grupo", ciudad: "San Luis Potosí" }],
    rutinas_corridas: corridas,
    showcase_evidencias: [
      { id: "e1", artista_id: ARTISTA, senal: "obra", tipo: "obra", titulo: "Su primer disco", url: ACEPTADA, estado: "aceptada", leida_por: "persona" },
      { id: "e2", artista_id: ARTISTA, senal: "circulacion", tipo: "presentacion", titulo: "Otro grupo", url: RECHAZADA, estado: "rechazada", leida_por: "rutina" },
    ],
  });
}
function dependencias(base: ReturnType<typeof mundo>, api: ClienteApi | null | undefined = undefined) {
  const falsa = apiFalsa();
  const dep: Dependencias = { db: base.db, api: api === undefined ? falsa.api : api, mapbox: null, pedir: (async () => new Response("{}", { status: 404 })) as typeof fetch, ahora: () => AHORA, plazoMs: 45_000 };
  return { dep, create: falsa.create };
}
const laCorrida = (base: ReturnType<typeof mundo>, id = "c-sho") => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
const propuestas = (base: ReturnType<typeof mundo>) => base.tablas.showcase_evidencias.filter((e) => e.estado === "propuesta");
const pedido = (create: ReturnType<typeof apiFalsa>["create"], i: number) => (create.mock.calls[i] as unknown as [Anthropic.MessageCreateParams])[0];
const comoLaVeLaFicha = (c: Fila & { resumen: Record<string, unknown> }): CorridaInvestigar => ({
  id: String(c.id),
  estado: c.estado as CorridaInvestigar["estado"],
  tope_usd: Number(c.tope_usd),
  gasto_usd: Number(c.gasto_usd),
  resumen: c.resumen,
  creado_en: String(c.creado_en),
  inicio: (c.inicio as string | null) ?? null,
  fin: (c.fin as string | null) ?? null,
});
const hoy = diaLocal(AHORA);
const diaDe = (iso: string) => diaLocal(new Date(iso));

describe("«Investigar» un artista del Showcase (OL-430)", () => {
  it("una corrida sin ciudad: cuatro búsquedas cortas con su nombre, su disciplina y su ciudad, sin redes, y la ficha dice cómo va", async () => {
    const base = mundo();
    const { dep, create } = dependencias(base);
    expect(textoInvestigar(comoLaVeLaFicha(laCorrida(base)), 0, hoy, diaDe)).toBe("Investigando · por empezar · 0,00 de 1,00 USD");
    await correrUnPaso(dep);
    await correrUnPaso(dep);
    // A medio camino, lo que dice el renglón de la ficha.
    expect(textoInvestigar(comoLaVeLaFicha(laCorrida(base)), 2, hoy, diaDe)).toBe(`Investigando · 2 de 4 búsquedas · ${(Math.round(2 * COSTO * 100) / 100).toFixed(2).replace(".", ",")} de 1,00 USD`);
    expect(laCorrida(base).resumen.avance).toBe(0.5);
    for (let i = 0; i < 5; i++) if ((await correrUnPaso(dep)).estado !== "corriendo") break;
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(create).toHaveBeenCalledTimes(4);
    // Sin ciudad: el motor no la pide.
    expect(base.operaciones.some((o) => o.tabla === "ciudades")).toBe(false);
    const primero = pedido(create, 0);
    expect(String(primero.messages[0].content)).toContain('Artista: Sangre de Coyote (grupo, música, Rock del desierto), de San Luis Potosí, México.');
    expect(String(primero.messages[0].content)).toContain('«"Sangre de Coyote" música San Luis Potosí premio beca estímulo convocatoria»');
    const buscar = (primero.tools ?? []).find((t) => (t as { name?: string }).name === "web_search") as unknown as Record<string, unknown>;
    const leer = (primero.tools ?? []).find((t) => (t as { name?: string }).name === "web_fetch") as unknown as Record<string, unknown>;
    expect(buscar).toMatchObject({ type: "web_search_20260209", max_uses: 1, blocked_domains: DOMINIOS_REDES });
    expect(leer).toMatchObject({ type: "web_fetch_20260209", max_uses: 2, blocked_domains: DOMINIOS_REDES });
    expect(DOMINIOS_REDES).toEqual(expect.arrayContaining(["instagram.com", "facebook.com", "tiktok.com", "youtube.com", "spotify.com"]));
    expect(HERRAMIENTA_EVIDENCIAS.strict).toBe(true);
    expect(c.resumen).toMatchObject({ paso: "4 de 4 búsquedas", avance: 1, propuestas: 3, busquedas_web: 4 });
    expect(Number(c.gasto_usd)).toBe(redondear(4 * COSTO));
    // Al terminar, con las evidencias que siguen por revisar.
    expect(textoInvestigar(comoLaVeLaFicha(c), propuestas(base).length, hoy, diaDe)).toBe(`Investigado el 21 oct · 3 evidencias por revisar · ${(Math.round(4 * COSTO * 100) / 100).toFixed(2).replace(".", ",")} USD`);
  });

  it("propone evidencias con su señal, su tipo, su fuente y su enlace, de la rutina y por revisar; nunca lo que ninguna página dijo", async () => {
    const base = mundo();
    const { dep } = dependencias(base);
    for (let i = 0; i < 8; i++) if ((await correrUnPaso(dep)).estado !== "corriendo") break;
    const sinAlta = (e: Fila) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== "id" && k !== "creado_en"));
    expect(propuestas(base).map(sinAlta)).toEqual([
      { artista_id: ARTISTA, senal: "obra", tipo: "premio", titulo: "Seleccionado en el PECDA 2025 en música", url: PREMIO2, fecha: "2025-11-03", fuente: "Secretaría de Cultura de San Luis Potosí", leida_por: "rutina", estado: "propuesta" },
      { artista_id: ARTISTA, senal: "obra", tipo: "prensa", titulo: "Entrevista sobre su segundo disco", url: NOTA, fecha: "2026-09-12", fuente: "Noticias", leida_por: "rutina", estado: "propuesta" },
      // Una fecha que no existe no se adivina: queda sin fecha.
      { artista_id: ARTISTA, senal: "circulacion", tipo: "presentacion", titulo: "En el programa del Festival del Desierto 2026", url: FEST, fecha: null, fuente: "Festival del Desierto", leida_por: "rutina", estado: "propuesta" },
    ]);
    expect(urlComparable(PREMIO2)).toBe(urlComparable(PREMIO));
    // Lo que no entra se cuenta: una página que la rutina no vio, un homónimo, redes, lo rechazado antes y lo que ya tiene.
    expect(laCorrida(base).resumen.descartados).toEqual({ ya_existe: 1, rechazado_antes: 1, homonimo_dudoso: 1, sin_enlace_verificado: 1, redes: 1, de_mas: 0 });
    // Lo que ya estaba no se toca.
    expect(base.tablas.showcase_evidencias.find((e) => e.id === "e2")!.estado).toBe("rechazada");
  });

  it("el tope corta las búsquedas que siguen y la ficha lo dice", async () => {
    const base = mundo([corrida("c-sho", { tope_usd: 0.2 })]);
    const { dep, create } = dependencias(base);
    for (let i = 0; i < 6; i++) if ((await correrUnPaso(dep)).estado !== "corriendo") break;
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(create).toHaveBeenCalledTimes(1);
    expect(c.resumen.tope).toBe(true);
    expect(textoInvestigar(comoLaVeLaFicha(c), 1, hoy, diaDe)).toMatch(/^Investigado el 21 oct · llegó al tope · 1 evidencia por revisar · \d,\d\d USD$/);
  });

  it("un artista que ya no está, o una corrida que no dice cuál, «Falló»; sin la llave de la API termina sin buscar y lo dice", async () => {
    const base = mundo([corrida("c-x", { parametros: { artista_id: "00000000-0000-4000-8000-0000000000ff" } }), corrida("c-y", { parametros: {}, creado_en: "2026-10-21T15:59:30Z" })]);
    const { dep } = dependencias(base);
    await correrUnPaso(dep);
    await correrUnPaso(dep);
    expect(laCorrida(base, "c-x")).toMatchObject({ estado: "fallida", resumen: { error: "El artista ya no está" } });
    expect(laCorrida(base, "c-y")).toMatchObject({ estado: "fallida", resumen: { error: "La corrida no dice qué artista investigar" } });
    expect(textoInvestigar(comoLaVeLaFicha(laCorrida(base, "c-x")), 0, hoy, diaDe)).toBe("No se pudo investigar el 21 oct · 0,00 USD");
    const sinLlave = mundo();
    await correrUnPaso(dependencias(sinLlave, null).dep);
    expect(laCorrida(sinLlave)).toMatchObject({ estado: "terminada", resumen: { avisos: ["Sin llave de la API: no se hicieron las búsquedas"], propuestas: 0 } });
    expect(textoInvestigar(comoLaVeLaFicha(laCorrida(sinLlave)), 0, hoy, diaDe)).toBe("Investigado el 21 oct · sin evidencias nuevas · 0,00 USD");
  });
});
