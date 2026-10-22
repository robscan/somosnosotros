import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { avisoSinEventos } from "./agendas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, type Dependencias } from "./motor";
import { analizarPagina, fichasDeEvento, horasEn, MAX_FICHAS, parteDeTexto, textoDePagina, TROZO_TEXTO } from "./paginaAgenda";

/**
 * OL-444, hallazgo del gestor (22 de octubre): en Ciudad de México dos corridas de agendas leyeron 8 agendas en HTML, gastaron 2,56 USD y no
 * propusieron ni descartaron nada. Con HTML de ejemplo de las tres formas que tienen esas carteleras (un listado largo, una página que solo
 * enlaza a las fichas de sus eventos y una que se arma con JavaScript) y una API falsa: la agenda se baja desde el servidor, el listado se da al
 * modelo por partes, de la de enlaces se abren hasta 5 fichas, la de JavaScript no se paga, y lo que se lee sin eventos queda dicho.
 */

const AHORA = new Date("2026-10-22T16:00:00Z");
const ZONA = "America/Mexico_City";
const LARGO = "https://cartelera.example/listado";
const ENLACES = "https://mexicoescultura.example/estado/9/ciudad-de-mexico";
const JS = "https://guia-js.example/agenda";
const VACIA = "https://sin-fechas.example/agenda";
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
    alcaldias: ["Cuauhtémoc"],
    guias: [
      { nombre: "Cartelera larga", url: LARGO },
      { nombre: "México es Cultura", url: ENLACES },
      { nombre: "Guía con JavaScript", url: JS },
      { nombre: "Guía sin fechas", url: VACIA },
    ],
  },
};

/** 300 funciones, una por renglón: más de un trozo de texto. */
const filaLarga = (n: number) => `<li><h3>Concierto número ${n} de la temporada de otoño</h3><p>Miércoles 28 de octubre, 19:00 h · Palacio de Bellas Artes, Centro, Cuauhtémoc · Entrada libre</p></li>`;
const HTML_LARGO = `<html><head><title>Cartelera</title><style>.x{}</style></head><body><nav>Inicio</nav><ul>${Array.from({ length: 300 }, (_, i) => filaLarga(i + 1)).join("")}</ul></body></html>`;
/** Solo enlaces a las fichas (con su paginación y sus categorías, que no son fichas). */
const HTML_ENLACES = `<html><body><h1>Cartelera de la Ciudad de México</h1><p>Encuentra lo mejor de la cultura en la ciudad.</p>
  ${Array.from({ length: 8 }, (_, i) => `<a href="/actividad/30${i}/obra-${i}"><img src="/f/${i}.jpg">Obra ${i}</a>`).join("")}
  <a href="/categoria/teatro">Teatro</a><a href="/estado/9/ciudad-de-mexico?page=2">Siguiente</a><a href="https://otro.example/actividad/1/x">Otro sitio</a></body></html>`;
const HTML_JS = `<html><head><script src="/app.js"></script></head><body><div id="root"></div><noscript>Activa JavaScript</noscript></body></html>`;
const HTML_VACIA = `<html><body><h1>Agenda</h1><p>${"Texto de la guía sobre la ciudad y sus museos, sin una sola función con fecha. ".repeat(12)}</p></body></html>`;

function pedirFalso() {
  const pedidas: string[] = [];
  const pedir = vi.fn(async (url: string) => {
    pedidas.push(url);
    const html = { [LARGO]: HTML_LARGO, [ENLACES]: HTML_ENLACES, [JS]: HTML_JS, [VACIA]: HTML_VACIA }[url];
    return html ? new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }) : new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
  return { pedir, pedidas };
}

const ev = (titulo: string) => ({ titulo, fecha: "2026-10-28", hora: "19:00", hora_fin: null, lugar: "Palacio de Bellas Artes", direccion: "Av. Juárez, Centro, Cuauhtémoc", municipio: "Cuauhtémoc", precio: "Gratis", descripcion: "Un concierto." });
function apiFalsa() {
  const create = vi.fn(async (cuerpo: Anthropic.MessageCreateParams) => {
    const texto = String(cuerpo.messages[0].content);
    const eventos = texto.includes("solo enlaza")
      ? [ev("Obra 0 en Bellas Artes")]
      : texto.includes("(parte 1 de")
        ? [ev("Concierto número 1 de la temporada de otoño")]
        : texto.includes("(parte 2 de")
          ? [ev("Concierto número 300 de la temporada de otoño")]
          : [];
    return {
      id: "m",
      type: "message",
      role: "assistant",
      model: MODELO_RUTINAS,
      stop_reason: "tool_use",
      usage: { input_tokens: 12_000, output_tokens: 800 },
      content: [{ type: "tool_use", id: "t", name: "entregar_agenda", input: { eventos, agendas: [] } }],
    };
  });
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

const corrida: Fila = { id: "c", tipo: "agendas", ciudad: "ciudad-de-mexico", parametros: { fuentes: ["guias"] }, tope_usd: 5, gasto_usd: 0, estado: "pendiente", resumen: {}, creado_en: "2026-10-22T15:59:00Z", inicio: null, fin: null };

async function correrTodo() {
  const base = baseFalsa({ ciudades: [structuredClone(CDMX)], lugares: [], eventos: [], rutinas_corridas: [structuredClone(corrida)], propuestas: [], configuracion: [] }, { eventos_parecidos: () => [] });
  const { pedir, pedidas } = pedirFalso();
  const { api, create } = apiFalsa();
  const dep: Dependencias = { db: base.db, api, mapbox: null, pedir, ahora: () => AHORA, plazoMs: 45_000 };
  for (let i = 0; i < 20 && base.tablas.rutinas_corridas[0].estado !== "terminada"; i++) await correrUnPaso(dep);
  return { base, create, pedidas, C: base.tablas.rutinas_corridas[0] as Fila & { resumen: Record<string, unknown> } };
}
const encargo = (c: unknown) => String((c as [Anthropic.MessageCreateParams])[0].messages[0].content);
const herramientas = (c: unknown) => ((c as [Anthropic.MessageCreateParams])[0].tools ?? []) as { name: string; max_uses?: number; allowed_domains?: string[] }[];

describe("agendas en HTML que salían vacías (OL-444)", () => {
  it("baja cada agenda desde el servidor y lee cada forma como le toca; lo que no trae eventos queda dicho por agenda", async () => {
    const { create, pedidas, C } = await correrTodo();
    expect(C.estado).toBe("terminada");
    // Cada parte del listado es su propio paso y vuelve a bajar la página (gratis: no es la API).
    expect(pedidas).toEqual([LARGO, LARGO, ENLACES, JS, VACIA]);
    const llamadas = create.mock.calls.map(encargo);
    // El listado largo, en dos partes con su texto dentro (sin lectura web); la de enlaces, con hasta 5 fichas; la de JavaScript, sin llamada.
    expect(llamadas).toHaveLength(4);
    expect(llamadas[0]).toContain("(parte 1 de 2)");
    expect(llamadas[0]).toContain("Concierto número 1 de la temporada de otoño");
    expect(llamadas[0]).not.toContain("Concierto número 300 ");
    expect(llamadas[1]).toContain("(parte 2 de 2)");
    expect(llamadas[1]).toContain("Concierto número 300 de la temporada de otoño");
    expect(herramientas(create.mock.calls[0]).map((h) => h.name)).toEqual(["entregar_agenda"]);
    expect(llamadas[2]).toContain("solo enlaza a la ficha de cada evento");
    const fichas = llamadas[2].split("\n").filter((l) => l.startsWith("https://mexicoescultura.example/actividad/"));
    expect(fichas).toHaveLength(MAX_FICHAS);
    expect(herramientas(create.mock.calls[2]).find((h) => h.name === "web_fetch")).toMatchObject({ max_uses: MAX_FICHAS, allowed_domains: ["mexicoescultura.example"] });
    expect(llamadas.some((l) => l.includes(JS))).toBe(false);
    expect(llamadas[3]).toContain(VACIA);

    expect(C.resumen.avisos).toEqual([
      // (La prueba corre sin Mapbox: el aviso de siempre.)
      "Sin mapa: no se comprobó si los sitios fuera del directorio están en la ciudad",
      avisoSinEventos(JS, "la página se arma con JavaScript o no trae texto"),
      avisoSinEventos(VACIA, null),
    ]);
    expect(C.resumen.avisos).toContain(`Leída sin eventos: ${VACIA}`);
    // Tres agendas leídas (la de JavaScript no cuenta) y lo que sí trajeron, propuesto.
    expect(C.resumen.agendas_leidas).toBe(3);
    expect(C.resumen.propuestos).toBe(3);
  });
});

describe("paginaAgenda", () => {
  it("el texto de la página: sin scripts ni estilos, con saltos por bloque, entidades y los datos de eventos ld+json", () => {
    const t = textoDePagina(`<html><head><style>p{}</style><script>var x = "no";</script><script type="application/ld+json">{"@type":"Event","name":"Ópera","startDate":"2026-10-28T19:00"}</script></head>
      <body><h2>Ópera &amp; danza</h2><p>28 de octubre&nbsp;· 19:00 h</p><script>no()</script></body></html>`);
    expect(t).toBe('Ópera & danza\n28 de octubre · 19:00 h\n\nDatos de eventos de la página:\n{"@type":"Event","name":"Ópera","startDate":"2026-10-28T19:00"}');
  });

  it("las fichas: del mismo sitio, con forma de ficha de evento, sin repetir, hasta 5; ni categorías, ni paginación, ni otros sitios", () => {
    expect(fichasDeEvento(HTML_ENLACES, ENLACES)).toEqual([0, 1, 2, 3, 4].map((i) => `https://mexicoescultura.example/actividad/30${i}/obra-${i}`));
    expect(fichasDeEvento('<a href="/eventos/jazz-28-oct">x</a><a href="/eventos/jazz-28-oct#mapa">y</a><a href="/eventos/">z</a>', "https://foro.example/")).toEqual(["https://foro.example/eventos/jazz-28-oct"]);
  });

  it("cuál es cuál: un listado con horas se lee tal cual; una de enlaces sin horas va por sus fichas; una casi vacía se arma con JavaScript", () => {
    expect(analizarPagina(HTML_LARGO, LARGO)).toMatchObject({ soloEnlaces: false, vacia: false, partes: 2 });
    expect(analizarPagina(HTML_ENLACES, ENLACES)).toMatchObject({ soloEnlaces: true, vacia: false });
    expect(analizarPagina(HTML_JS, JS)).toMatchObject({ soloEnlaces: false, vacia: true });
    expect(horasEn("19:00 h, 8:30 pm, a las 20 h y 7 p.m.")).toBe(4);
  });

  it("las partes de un texto largo se cortan en un renglón y no pierden nada", () => {
    const texto = textoDePagina(HTML_LARGO);
    expect(texto.length).toBeGreaterThan(TROZO_TEXTO);
    const [a, b] = [parteDeTexto(texto, 0), parteDeTexto(texto, 1)];
    expect(a.length).toBeLessThanOrEqual(TROZO_TEXTO);
    expect(`${a}\n${b}`.replace(/\s+/g, " ")).toBe(texto.replace(/\s+/g, " "));
    // El corte cae en un salto de renglón: ningún renglón queda partido.
    expect(texto.startsWith(`${a}\n`)).toBe(true);
  });
});
