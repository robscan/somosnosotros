import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { detalleCorrida, fuentesDeHoja, leerParametrosVista, NOTA_APAGADA, type CorridaPanel } from "../ciudadesAdmin";
import { localAIso } from "../fechas";
import { avisoFuenteApagada, avisoTrozoVacio, claveConfiguracion, completarConSemillas, SEMILLAS, type FuenteAgenda } from "./agendas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { filasDeCatalogo, leerFichaCatalogo, leerListaCatalogo, URL_CATALOGO_SLP } from "./catalogoCultura";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { filaDeTribe, leerPaginaTribe, URL_TRIBE_SLP } from "./eventosTribe";
import { correrUnPaso, type Dependencias } from "./motor";

/**
 * OL-509: las fuentes de San Luis que se leen gratis (el catálogo de Cultura y los eventos de Turismo por la API de «The Events Calendar»),
 * la conversión de lo guardado en producción, las fuentes apagadas por ciudad y el reintento del trozo vacío de un PDF del mes. Muestras
 * recortadas de los sitios del 4 de noviembre (sin datos personales; los teléfonos, inventados). Sin red.
 */

const AHORA = new Date("2026-11-04T18:00:00Z"); // 12:00 en San Luis
const ZONA = "America/Mexico_City";
const local = (fechaHora: string) => localAIso(fechaHora, ZONA)!;
const BASE = URL_CATALOGO_SLP;
const ficha = (ruta: string) => `https://cultura.slp.gob.mx/eventos/${ruta}/`;
const AIRES = ficha("2026/10/30/aires-revolucionarios-07Nov");
const NAZA = ficha("2026/11/4/proyecci%C3%B3n-del-documental-naza");
const CARTELERA = ficha("2026/10/30/cartelera-de-la-cineteca-alameda");
const ANATOMIA = ficha("2026/10/23/inauguraci%C3%B3n-de-la-exposici%C3%B3n-anatom%C3%ADa-del-montruo");
const SODA = ficha("2026/9/22/concierto-homenaje-soda-stereo");

// ---------- muestras del catálogo (HTML recortado, con la forma del sitio) ----------
const tarjeta = (url: string, titulo: string) =>
  `<div class="evento-item features-image carousel-item mb-2 "><a href="${url}" class="text-black d-block h-100 px-1"><div class="card"><img class="m-0" src="https://d3dac9gdq8t83x.cloudfront.net/media/x.jpeg"><div class="fs-14px fs-sm-6 fw-bold d-block w-100">${titulo}</div></div></a></div>`;
const LISTA_1 = `<html><body><h1>CATÁLOGO DE EVENTOS</h1><a href="/eventos/?cat=talleres">Talleres</a>
  <!-- FIN DE SEMANA -->${tarjeta(AIRES, "Aires revolucionarios")}
  <!-- LISTADO DE EVENTOS -->${tarjeta(ANATOMIA, "Inauguración")}${tarjeta(CARTELERA, "Cartelera")}${tarjeta(NAZA, "Naza")}${tarjeta(AIRES, "Aires revolucionarios")}
  <!-- PAGINATOR --><li class="page-item active"><span class="page-link">1</span></li><li class="page-item"><a class="page-link" href="?page=2">2</a></li><a class="page-link" href="?page=2">Siguiente</a></body></html>`;
const LISTA_2 = `<html><body>${tarjeta(SODA, "Concierto Homenaje Soda Stereo")}<a class="page-link" href="?page=1">1</a></body></html>`;

function paginaFicha(o: { titulo: string; imagen: string; categoria: string; lugar?: string; mapa?: string; fecha: string; texto: string }) {
  return `<html><head><meta property="og:title" content="${o.titulo}"><meta property="og:image" content="${o.imagen}"></head><body>
  <article id="post-x" class="post-item post-detail"><h3 class="card_title fs-1 text-center text-md-start">${o.titulo}</h3>
  <div class="d-flex">${o.lugar ? `<a href="/lugares/un-lugar/" class="text-primary">${o.lugar}</a>` : ""}
  ${o.mapa ? `<a href="https://www.google.com/maps/search/?api=1&query=\n ${o.mapa} "  class="text-primary" target="_blank">` : ""}
  <span class="d-none d-md-block mx-1"> | </span><p class="mb-0 mx-1">\n ${o.fecha} \n</p></div>
  <span class="w-fit-content text-white mx-auto fs-5 align-content-center"> ${o.categoria}</span>
  <hr> <!-- Texto del Evento --> ${o.texto} </div><!-- Esta es la columna de recomendados --></article></body></html>`;
}
const RAUL_GAMBOA = "CENTRO DE DIFUSIÓN CULTURAL RAÚL GAMBOA, Av. Universidad Esq. Negrete s/n, San Luis Potosí Centro, 78000, San Luis Potosí, San Luis Potosí, México";
const CINETECA = "CINETECA ALAMEDA SAN LUIS POTOSÍ, Av. Universidad # 575, San Luis Potosí Centro, 78000, San Luis Potosí, San Luis Potosí, México";
const FICHAS: Record<string, string> = {
  [AIRES]: paginaFicha({
    titulo: "Aires revolucionarios",
    imagen: "https://d3dac9gdq8t83x.cloudfront.net/media/aires.jpeg",
    categoria: "PRESENTACIONES ARTISTICAS",
    lugar: "CENTRO DE DIFUSIÓN CULTURAL RAÚL GAMBOA",
    mapa: RAUL_GAMBOA,
    fecha: "7 de noviembre de 2026 \n , 19:30",
    texto: "<p>Con dos grupos de danza folklórica de San Luis Potosí.</p><p>Cuota de recuperación de $100 pesos a beneficio de la agrupación</p>",
  }),
  [NAZA]: paginaFicha({
    titulo: "Proyección del documental Naza",
    imagen: "https://d3dac9gdq8t83x.cloudfront.net/media/naza.jpeg",
    categoria: "CINE",
    mapa: CINETECA,
    fecha: "5 de noviembre de 2026 , 18:00 - 11 de noviembre de 2026 , 21:30",
    texto: "<p>La Cineteca Alameda presenta del 5 al 11 de noviembre un documental de 77 minutos.</p>",
  }),
  [CARTELERA]: paginaFicha({
    titulo: "Cartelera de la Cineteca Alameda",
    imagen: "https://d3dac9gdq8t83x.cloudfront.net/media/cartelera.jpeg",
    categoria: "CINE",
    lugar: "CINETECA ALAMEDA SAN LUIS POTOSÍ",
    mapa: CINETECA,
    fecha: "5 de noviembre de 2026 , 12:17 - 11 de noviembre de 2026 , 14:00",
    texto: "<p>Cartelera de la Cineteca Alameda de la semana.</p>",
  }),
  [ANATOMIA]: paginaFicha({
    titulo: "Inauguración de la exposición &quot;Anatomía del montruo&quot;",
    imagen: "https://d3dac9gdq8t83x.cloudfront.net/media/anatomia.jpeg",
    categoria: "EXPOSICIONES",
    lugar: "CINETECA ALAMEDA SAN LUIS POTOSÍ",
    mapa: CINETECA,
    fecha: "27 de octubre de 2026 - 30 de noviembre de 2026",
    texto: "<p>Te esperamos todo el mes en la galería.</p>",
  }),
  [SODA]: paginaFicha({
    titulo: "Concierto Homenaje Soda Stereo",
    imagen: "https://d3dac9gdq8t83x.cloudfront.net/media/soda.jpeg",
    categoria: "CONCIERTOS",
    fecha: "28 de noviembre de 2026 , 20:00",
    texto: "<p>Concierto Homenaje Soda Stereo 8:00 PM. Desde $220 MXN.&nbsp;Boletos: https://boletos.example.com/evento/ch-1 &nbsp;Informes al 444 000 1234.</p>",
  }),
};

// ---------- muestra de la API de «The Events Calendar» (recortada) ----------
const tribeEvento = (o: Record<string, unknown>) => ({
  id: 1,
  status: "publish",
  url: "https://eventos.visitasanluispotosi.com/event/x/",
  title: "x",
  description: "",
  image: false,
  all_day: false,
  start_date: "2026-11-13 21:00:00",
  end_date: "2026-11-13 23:00:00",
  timezone: "UTC+0",
  cost: "",
  categories: [],
  venue: { venue: "Teatro de la Paz", address: "Teatro de la Paz Villerias, Centro Historico", city: "SAN LUIS POTOSÍ", country: "Mexico" },
  ...o,
});
const TRIBE = {
  events: [
    tribeEvento({
      id: 762,
      url: "https://eventos.visitasanluispotosi.com/event/enjambre-2/",
      title: "Enjambre",
      description: "<p>Una noche de rock alternativo en español.</p>\n<p>Informes al 444 000 9876.</p>",
      image: { url: "https://eventos.visitasanluispotosi.com/wp-content/uploads/2026/06/131126-Enjambre.webp", extension: "webp", width: 780, height: 570 },
      categories: [{ name: "Concierto", slug: "concierto" }],
      venue: { venue: "Teatro Parque Tangamanga I", address: "Parque Tangamanga I", city: "SAN LUIS POTOSÍ", country: "Mexico" },
    }),
    tribeEvento({ id: 1015, url: "https://eventos.visitasanluispotosi.com/event/corre-x-tu-marca/", title: "Corre x tu marca", start_date: "2026-11-22 06:00:00", end_date: "2026-11-22 23:00:00", categories: [{ name: "Deportivos", slug: "deportivos" }] }),
    tribeEvento({ id: 2000, url: "https://eventos.visitasanluispotosi.com/event/feria/", title: "Feria del día", all_day: true, start_date: "2026-11-20 00:00:00", end_date: "2026-11-20 23:59:59", categories: [{ name: "Ferias y festivales", slug: "ferias-y-festivales" }] }),
    tribeEvento({
      id: 1020,
      url: "https://eventos.visitasanluispotosi.com/event/la-fiesta-del-huapango/",
      title: "La Fiesta del Huapango",
      start_date: "2026-11-13 17:00:00",
      end_date: "2026-11-15 21:00:00",
      categories: [{ name: "Culturales", slug: "culturales" }],
      venue: { venue: "San Ciro de Acosta", address: "Plaza principal", city: "San Ciro de Acosta", country: "Mexico" },
    }),
  ],
  total: 4,
  total_pages: 1,
};

// ---------- el mundo ----------
const PDF_NOV = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/nov_2026.pdf";
const INDICE = `<html><body><div>NOVIEMBRE</div><small>30 de octubre de 2026</small><a href="${PDF_NOV}">Descargar</a></body></html>`;
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: ZONA, alias: ["Soledad de Graciano Sánchez"], estado: "abierta" };
const FUENTES = ["agenda-cultura", "universidades-museos", "web"];
const corrida = (id: string, c: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "agendas",
  ciudad: "san-luis-potosi",
  parametros: { fuentes: FUENTES },
  tope_usd: 5,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-11-04T17:59:00Z",
  inicio: null,
  fin: null,
  ...c,
});
/** Lo guardado en producción el 4 de noviembre (`configuracion.agendas_san_luis_potosi`), en lo que importa. */
const GUARDADAS_PRODUCCION: FuenteAgenda[] = [
  { url: "https://cultura.slp.gob.mx/agenda-cultural/", nombre: "Agenda Cultural", tipo: "indice", clave: "agenda-cultura", mes: null },
  { url: "https://cultura.slp.gob.mx/eventos/", nombre: "Eventos de Cultura", tipo: "html", clave: "universidades-museos", mes: null },
  { url: "https://eventos.visitasanluispotosi.com/", nombre: "Visita San Luis Potosí", tipo: "html", clave: "web", mes: null },
  { url: "https://www.eticket.mx/", nombre: "eticket", tipo: "html", clave: "web", mes: null },
];

function mundo(o: { parametros?: Record<string, unknown>; guardadas?: FuenteAgenda[] | null } = {}) {
  return baseFalsa(
    {
      ciudades: [{ ...structuredClone(SLP), parametros: o.parametros ?? {} }],
      lugares: [{ id: "L-paz", nombre: "Teatro de la Paz", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Villerías 205, Centro", lat: 22.1519, lng: -100.9738 }],
      eventos: [],
      rutinas_corridas: [corrida("c1")],
      propuestas: [],
      configuracion: o.guardadas === null ? [] : [{ clave: claveConfiguracion("san-luis-potosi"), valor: { fuentes: o.guardadas ?? GUARDADAS_PRODUCCION } }],
    },
    { eventos_parecidos: () => [] },
  );
}

function red() {
  const pedidas: string[] = [];
  const pedir = vi.fn(async (url: string) => {
    pedidas.push(url);
    const html = (t: string) => new Response(t, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url === "https://cultura.slp.gob.mx/agenda-cultural/") return html(INDICE);
    if (url === BASE) return html(LISTA_1);
    if (url === `${BASE}?page=2`) return html(LISTA_2);
    if (FICHAS[url]) return html(FICHAS[url]);
    if (url.startsWith(`${URL_TRIBE_SLP}?`)) return new Response(JSON.stringify(TRIBE), { headers: { "content-type": "application/json" } });
    return new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
  return { pedir, pedidas };
}

type Ev = { titulo: string; fecha: string; hora: string; hora_fin: null; lugar: string; direccion: null; municipio: string; precio: null; descripcion: string };
const ev = (titulo: string, fecha: string, hora: string): Ev => ({ titulo, fecha, hora, hora_fin: null, lugar: "Teatro de la Paz", direccion: null, municipio: "San Luis Potosí", precio: null, descripcion: "Una función." });
/** La API falsa: el PDF de noviembre entrega lo que diga `porTrozo` (por su primer día y si es el reintento); todo lo demás, vacío. */
function apiFalsa(porTrozo: (desde: string, reintento: boolean) => Ev[] = () => []) {
  const create = vi.fn(async (cuerpo: Anthropic.MessageCreateParams) => {
    const contenido = cuerpo.messages[0].content;
    const texto = typeof contenido === "string" ? contenido : contenido.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    const rango = texto.match(/del (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})/);
    const esPdf = typeof contenido !== "string" && contenido.some((b) => b.type === "document");
    const eventos = esPdf && rango ? porTrozo(rango[1], texto.includes("La lectura anterior")) : [];
    return {
      id: "m",
      type: "message",
      role: "assistant",
      model: MODELO_RUTINAS,
      stop_reason: "tool_use",
      usage: { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 } },
      content: [{ type: "tool_use", id: "t", name: "entregar_agenda", input: { eventos, agendas: [] } }],
    };
  });
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

function dependencias(base: ReturnType<typeof mundo>, api = apiFalsa()) {
  const r = red();
  const dep: Dependencias = { db: base.db, api: api.api, mapbox: null, pedir: r.pedir, dormir: async () => undefined, ahora: () => AHORA, plazoMs: 45_000 };
  return { dep, pedidas: r.pedidas, create: api.create };
}
const laCorrida = (base: ReturnType<typeof mundo>, id = "c1") => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
const deLaCorrida = (base: ReturnType<typeof mundo>, id = "c1") => base.tablas.propuestas.filter((p) => p.corrida_id === id);
async function hastaTerminar(dep: Dependencias, base: ReturnType<typeof mundo>, id = "c1") {
  for (let i = 0; i < 40 && laCorrida(base, id).estado !== "terminada"; i++) await correrUnPaso(dep);
  expect(laCorrida(base, id).estado).toBe("terminada");
}
const guardadas = (base: ReturnType<typeof mundo>) => (base.tablas.configuracion.find((f) => f.clave === claveConfiguracion("san-luis-potosi"))!.valor as { fuentes: FuenteAgenda[] }).fuentes;

// ---------- los lectores, solos ----------
describe("el catálogo de Cultura de San Luis (lista y ficha)", () => {
  it("la lista: las fichas sin repetir (los carruseles repiten), en su forma normalizada, y si hay página siguiente", () => {
    expect(leerListaCatalogo(LISTA_1, BASE, 1)).toEqual({ fichas: [AIRES, ANATOMIA, CARTELERA, NAZA], siguiente: 2 });
    expect(leerListaCatalogo(LISTA_2, BASE, 2)).toEqual({ fichas: [SODA], siguiente: null });
    // `?format=json` (lo de Squarespace) no sirve: el sitio es Django y devuelve el mismo HTML; se leen las fichas.
  });

  it("la ficha: título, cartel, categoría, lugar, dirección y municipio del enlace al mapa, fecha y hora, precio y texto", () => {
    const f = leerFichaCatalogo(FICHAS[AIRES], AIRES)!;
    expect(f).toMatchObject({
      titulo: "Aires revolucionarios",
      imagen: "https://d3dac9gdq8t83x.cloudfront.net/media/aires.jpeg",
      categoria: "PRESENTACIONES ARTISTICAS",
      lugar: "Centro de Difusión Cultural Raúl Gamboa",
      direccion: "Av. Universidad Esq. Negrete s/n, San Luis Potosí Centro, 78000, San Luis Potosí",
      municipio: "San Luis Potosí",
      desde: "2026-11-07",
      hasta: null,
      hora: "19:30",
      precio: "$100",
    });
    expect(filasDeCatalogo(f, "2026-11-04")).toEqual({
      filas: [expect.objectContaining({ fecha: "2026-11-07", hora: "19:30", url: AIRES, ficha_fuente: AIRES, imagen: f.imagen, clase: "puntual" })],
      motivo: null,
    });
  });

  it("un periodo con hora da un día por función; un listado de otro, sin hora o lo que pasó no da filas", () => {
    const naza = filasDeCatalogo(leerFichaCatalogo(FICHAS[NAZA], NAZA)!, "2026-11-04");
    expect(naza.filas.map((x) => `${x.fecha} ${x.hora}-${x.hora_fin}`)).toEqual(["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11"].map((d) => `${d} 18:00-21:30`));
    expect(filasDeCatalogo(leerFichaCatalogo(FICHAS[CARTELERA], CARTELERA)!, "2026-11-04")).toEqual({ filas: [], motivo: "listado" });
    expect(filasDeCatalogo(leerFichaCatalogo(FICHAS[ANATOMIA], ANATOMIA)!, "2026-11-04")).toEqual({ filas: [], motivo: "sin_hora" });
    expect(filasDeCatalogo(leerFichaCatalogo(FICHAS[AIRES], AIRES)!, "2026-11-08").motivo).toBe("pasado");
    expect(leerFichaCatalogo("<html><body>No encontrado</body></html>", AIRES)).toBeNull();
  });
});

describe("la API de «The Events Calendar» (Turismo de San Luis)", () => {
  it("lee la página; un evento cultural con hora da su fila; deportes, sin hora y sin ficha no", () => {
    const p = leerPaginaTribe(JSON.stringify(TRIBE))!;
    expect(p).toMatchObject({ paginas: 1, total: 4 });
    const [enjambre, corre, feria] = p.eventos;
    expect(filaDeTribe(enjambre)).toEqual({
      fila: expect.objectContaining({
        titulo: "Enjambre",
        fecha: "2026-11-13",
        hora: "21:00", // la hora local del sitio, aunque diga UTC+0
        hora_fin: "23:00",
        lugar: "Teatro Parque Tangamanga I",
        municipio: "San Luis Potosí",
        imagen: "https://eventos.visitasanluispotosi.com/wp-content/uploads/2026/06/131126-Enjambre.webp",
        url: "https://eventos.visitasanluispotosi.com/event/enjambre-2/",
        ficha_fuente: "https://eventos.visitasanluispotosi.com/event/enjambre-2/",
      }),
      motivo: null,
    });
    expect(filaDeTribe(corre)).toEqual({ fila: null, motivo: "no_cultural" });
    expect(filaDeTribe(feria)).toEqual({ fila: null, motivo: "sin_hora" });
    expect(filaDeTribe({ ...enjambre, url: null })).toEqual({ fila: null, motivo: "sin_ficha" });
    expect(leerPaginaTribe("<html>")).toBeNull();
  });
});

// ---------- la conversión de lo guardado y las fuentes apagadas ----------
describe("las semillas de San Luis sobre lo guardado (OL-509)", () => {
  it("lo de producción se convierte: el catálogo pasa a `catalogo` de gobierno y Turismo a `tribe` de guías, con la URL de su API; lo demás se queda", () => {
    const { fuentes, cambio } = completarConSemillas(GUARDADAS_PRODUCCION, SEMILLAS["san-luis-potosi"]);
    expect(cambio).toBe(true);
    expect(fuentes.map((f) => [f.url, f.tipo, f.clave])).toEqual([
      ["https://cultura.slp.gob.mx/agenda-cultural/", "indice", "agenda-cultura"],
      [URL_CATALOGO_SLP, "catalogo", "agenda-cultura"],
      [URL_TRIBE_SLP, "tribe", "guias"],
      ["https://www.eticket.mx/", "html", "web"],
    ]);
    // Ya al día: nada que guardar.
    expect(completarConSemillas(fuentes, SEMILLAS["san-luis-potosi"]).cambio).toBe(false);
    // Sin nada guardado: la semilla entera; la portada de Cultura (otra página del mismo sitio) no es el catálogo.
    expect(completarConSemillas([], SEMILLAS["san-luis-potosi"]).fuentes).toHaveLength(3);
    const portada: FuenteAgenda = { url: "https://cultura.slp.gob.mx/", nombre: "Cultura", tipo: "html", clave: "web", mes: null };
    expect(completarConSemillas([portada], SEMILLAS["san-luis-potosi"]).fuentes.map((f) => f.url)).toEqual(["https://cultura.slp.gob.mx/", ...SEMILLAS["san-luis-potosi"].map((s) => s.url)]);
  });
});

describe("una corrida de San Luis con las fuentes gratis y `fuentes_fuera` (OL-509)", () => {
  it("convierte lo guardado, salta lo apagado con aviso y propone lo del catálogo y de Turismo sin la API, con cartel, ficha y descripción limpia", async () => {
    const base = mundo({ parametros: { fuentes_fuera: ["universidades-museos", "web"] } });
    const { dep, pedidas, create } = dependencias(base);
    await hastaTerminar(dep, base);
    const c = laCorrida(base);
    expect(c.resumen.avisos).toEqual(expect.arrayContaining([avisoFuenteApagada("universidades-museos"), avisoFuenteApagada("web")]));
    expect(avisoFuenteApagada("web")).toBe("Fuente apagada para esta ciudad: Búsqueda web");
    expect(guardadas(base).map((f) => [f.tipo, f.clave])).toEqual([
      ["indice", "agenda-cultura"],
      ["catalogo", "agenda-cultura"],
      ["pdf", "agenda-cultura"],
      ["tribe", "guias"],
      ["html", "web"],
    ]);
    // Ninguna lectura con la API para el catálogo ni para Turismo (solo el PDF de noviembre, por trozos), y nada de lo apagado.
    const pedidosApi = create.mock.calls.map((x) => JSON.stringify((x as unknown as [Anthropic.MessageCreateParams])[0]));
    expect(pedidosApi.every((p) => p.includes(PDF_NOV))).toBe(true);
    expect(pedidas).not.toContain("https://www.eticket.mx/");
    // La ficha que solo junta lo de otro y la de sin hora se leyeron, pero no se propusieron.
    expect(pedidas).toEqual(expect.arrayContaining([AIRES, NAZA, CARTELERA, ANATOMIA, SODA]));

    const ps = deLaCorrida(base);
    const titulos = ps.map((p) => [p.fuente, (p.datos as Fila).titulo]).sort();
    expect(titulos).toEqual(
      [
        ["Catálogo de eventos de la Secretaría de Cultura de San Luis Potosí", "Aires revolucionarios"],
        ["Catálogo de eventos de la Secretaría de Cultura de San Luis Potosí", "Concierto Homenaje Soda Stereo"],
        ["Catálogo de eventos de la Secretaría de Cultura de San Luis Potosí", "Proyección del documental Naza"],
        ["Eventos de Turismo de San Luis Potosí", "Enjambre"],
      ].sort(),
    );
    const datos = (t: string) => ps.find((p) => (p.datos as Fila).titulo === t)!.datos as Fila;
    expect(datos("Aires revolucionarios")).toMatchObject({ inicio: local("2026-11-07T19:30"), url: AIRES, ficha_fuente: AIRES, imagen: "https://d3dac9gdq8t83x.cloudfront.net/media/aires.jpeg", precio: "$100", clase: "puntual" });
    // Los días de la proyección son UNA propuesta con sus sesiones.
    expect((datos("Proyección del documental Naza").sesiones as unknown[]).length).toBe(7);
    // Sin teléfonos ni direcciones web en la descripción.
    expect(String(datos("Concierto Homenaje Soda Stereo").descripcion)).toBe("Concierto Homenaje Soda Stereo 8:00 PM. Desde $220 MXN.");
    expect(datos("Enjambre")).toMatchObject({ inicio: local("2026-11-13T21:00"), fin: local("2026-11-13T23:00"), imagen: expect.stringMatching(/\.webp$/), descripcion: "Una noche de rock alternativo en español." });
    expect(JSON.stringify(ps.map((p) => p.datos))).not.toMatch(/444 000|boletos\.example/);

    const libres = c.resumen.libres as Record<string, Record<string, number>>;
    expect(libres["cultura.slp.gob.mx"]).toMatchObject({ listados: 5, leidos: 5, sin_hora: 1, no_evento: 1, propuestos: 3 });
    expect(libres["eventos.visitasanluispotosi.com"]).toMatchObject({ listados: 4, leidos: 2, sin_hora: 1, no_evento: 1, propuestos: 1 });
    expect((c.resumen.descartados as Record<string, number>).fuera_de_la_ciudad).toBe(1); // la Fiesta del Huapango, en San Ciro de Acosta
    expect((c.resumen.por_fuente as Record<string, { propuestos: number; usd: number }>).guias).toEqual({ propuestos: 1, usd: 0 });
  });

  it("la corrida siguiente no vuelve a pedir las fichas ya propuestas", async () => {
    const base = mundo({ parametros: { fuentes_fuera: ["universidades-museos", "web"] } });
    await hastaTerminar(dependencias(base).dep, base);
    base.tablas.rutinas_corridas.push(corrida("c2", { creado_en: "2026-11-04T18:30:00Z" }));
    const segunda = dependencias(base);
    await hastaTerminar(segunda.dep, base, "c2");
    expect(segunda.pedidas).not.toContain(AIRES);
    expect(segunda.pedidas).not.toContain(SODA);
    expect(deLaCorrida(base, "c2")).toHaveLength(0);
    expect((laCorrida(base, "c2").resumen.libres as Record<string, Record<string, number>>)["cultura.slp.gob.mx"].ya_propuestos).toBe(3);
  });

  it("la hoja de la administración: lo apagado va sin marca y con su nota; Corridas dice los trozos sin eventos", () => {
    const p = leerParametrosVista({ fuentes_fuera: ["universidades-museos", "web"] });
    expect(p.fuentesFuera).toEqual(["universidades-museos", "web"]);
    expect(fuentesDeHoja("agendas", "San Luis Potosí", p.fuentesFuera).map((f) => [f.clave, f.apagada])).toEqual([
      ["agenda-cultura", false],
      ["universidades-museos", true],
      ["web", true],
    ]);
    expect(NOTA_APAGADA).toBe("apagada para esta ciudad");
    expect(fuentesDeHoja("lugares", "San Luis Potosí", ["web"]).every((f) => !f.apagada)).toBe(true);
    const corridaPanel = { id: "x", tipo: "agendas", ciudad: "san-luis-potosi", parametros: { fuentes: FUENTES }, tope_usd: 3, gasto_usd: 0.5, estado: "terminada", resumen: { trozos_vacios: 1 }, creado_en: AHORA.toISOString(), inicio: null, fin: AHORA.toISOString(), propuestas: 4, aceptadas: 0, rechazadas: 0, por_revisar: 4 } as CorridaPanel;
    expect(detalleCorrida(corridaPanel, AHORA)).toContain("1 trozo sin eventos");
  });
});

// ---------- el trozo vacío ----------
describe("un trozo vacío de un PDF del mes se reintenta una vez (OL-509)", () => {
  it("vacío dos veces: aviso y cuenta; vacío y luego con eventos: nada; los demás, una sola lectura; `resumen.trozos` lo cuenta", async () => {
    const base = mundo({ guardadas: null });
    const api = apiFalsa((desde, reintento) => {
      if (desde === "2026-11-04") return []; // vacío las dos veces
      if (desde === "2026-11-11") return reintento ? [ev("Recital en el segundo intento", "2026-11-12", "19:00")] : [];
      return [ev(`Función del ${desde}`, desde, "20:00")];
    });
    const { dep, create } = dependencias(base, api);
    await hastaTerminar(dep, base);
    const leidos = create.mock.calls
      .map((x) => (x as unknown as [Anthropic.MessageCreateParams])[0])
      .filter((c) => typeof c.messages[0].content !== "string")
      .map((c) => {
        const t = (c.messages[0].content as Anthropic.ContentBlockParam[]).map((b) => (b.type === "text" ? b.text : "")).join("");
        return `${t.match(/del (\S+) al/)?.[1]}${t.includes("La lectura anterior") ? " (otra vez)" : ""}`;
      });
    expect(leidos).toEqual(["2026-11-04", "2026-11-04 (otra vez)", "2026-11-11", "2026-11-11 (otra vez)", "2026-11-18", "2026-11-25"]);
    // El encargo del PDF dice que las páginas finales por tipo también valen.
    const primero = (create.mock.calls[0] as unknown as [Anthropic.MessageCreateParams])[0];
    expect(JSON.stringify(primero.messages[0].content)).toContain("Las páginas finales del PDF que agrupan por tipo («Talleres», «Exposiciones», «Varios») también valen");
    const c = laCorrida(base);
    expect(c.resumen.trozos_vacios).toBe(1);
    expect(c.resumen.avisos).toContain(avisoTrozoVacio("nov_2026.pdf", "2026-11-04", "2026-11-10"));
    expect(avisoTrozoVacio("nov_2026.pdf", "2026-11-04", "2026-11-10")).toBe("Trozo sin eventos: nov_2026.pdf del 2026-11-04 al 2026-11-10");
    expect(c.resumen.trozos).toEqual([
      { fuente: "nov_2026.pdf", desde: "2026-11-04", hasta: "2026-11-10", leidos: 0, propuestos: 0 },
      { fuente: "nov_2026.pdf", desde: "2026-11-04", hasta: "2026-11-10", leidos: 0, propuestos: 0, reintentado: true },
      { fuente: "nov_2026.pdf", desde: "2026-11-11", hasta: "2026-11-17", leidos: 0, propuestos: 0 },
      { fuente: "nov_2026.pdf", desde: "2026-11-11", hasta: "2026-11-17", leidos: 1, propuestos: 1, reintentado: true },
      { fuente: "nov_2026.pdf", desde: "2026-11-18", hasta: "2026-11-24", leidos: 1, propuestos: 1 },
      { fuente: "nov_2026.pdf", desde: "2026-11-25", hasta: "2026-11-30", leidos: 1, propuestos: 1 },
    ]);
    expect(deLaCorrida(base).some((p) => (p.datos as Fila).titulo === "Recital en el segundo intento")).toBe(true);
  });
});
