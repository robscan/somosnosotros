import type Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { HOJAS, TOPE_POR_DEFECTO } from "../ciudadesAdmin";
import { nombreDe, textoDecidida, vistaPropuesta } from "../propuestas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { agruparPorLugar, avisoSoloRedes, EVENTOS_POR_LLAMADA, FUENTE_SITIO, FUENTE_WEB, TOPE_CARTELES } from "./carteles";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, type Dependencias } from "./motor";
import { costoDeUso, redondear } from "./precios";

/**
 * «Buscar carteles» (OL-444) con una base en memoria, una API falsa y una red falsa (sin red de verdad): qué eventos toma, qué no se puede buscar
 * desde el servidor (solo Instagram), qué propone y qué descarta, el tope y la falta de llave.
 */

const AHORA = new Date("2026-10-22T16:00:00Z");
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: "America/Mexico_City", alias: ["Soledad de Graciano Sánchez"], estado: "abierta", parametros: {} };
const dias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000).toISOString();

const corrida = (id: string, c: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "carteles",
  ciudad: "san-luis-potosi",
  parametros: { fuentes: ["sitio", "web"] },
  tope_usd: 2,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-10-22T15:59:00Z",
  inicio: null,
  fin: null,
  ...c,
});
const evento = (id: string, lugar: string | null, titulo: string, inicio: string, extra: Partial<Fila> = {}): Fila => ({
  id,
  lugar_id: lugar,
  titulo,
  inicio,
  termina: inicio,
  enlace: null,
  sitio_texto: null,
  imagen: null,
  ciudad: "San Luis Potosí",
  visible: true,
  borrador: false,
  cancelado: false,
  ...extra,
});

const SITIO = "https://forositio.mx";
const JAZZ = "https://forositio.mx/carteles/jazz.jpg";
const LECTURA = "https://agendacultural.mx/img/lectura.png";
const PRENSA = "https://prensaslp.mx/nota-lectura";

function mundo(corridas: Fila[] = [corrida("c")]) {
  return baseFalsa({
    ciudades: [structuredClone(SLP)],
    lugares: [
      { id: "L1", nombre: "Foro Sitio", redes: [{ url: SITIO }, { url: "https://instagram.com/forositio" }] },
      { id: "L2", nombre: "Galería Solo IG", redes: [{ url: "https://www.instagram.com/galeriasoloig/" }] },
      { id: "L3", nombre: "Casa Sin Redes", redes: [] },
    ],
    eventos: [
      evento("E1", "L1", "Jazz en el Foro", dias(1)),
      evento("E2", "L1", "Teatro Breve", dias(2)),
      evento("E12", "L1", "Danza", dias(2.5)),
      evento("E3", "L2", "Expo de grabado", dias(3)),
      evento("E4", "L2", "Charla de grabado", dias(4)),
      evento("E5", "L3", "Lectura de poesía", dias(5), { enlace: "https://agendacultural.mx/lectura" }),
      evento("E11", "L3", "Taller de grabado", dias(6)),
      evento("E13", "L3", "Cine club", dias(7)),
      evento("E9", "L1", "Ya propuesto", dias(3)),
      // Lo que no se toma: con cartel, ya pasó, de otra ciudad, cancelado, oculto, borrador.
      evento("E6", "L1", "Con cartel", dias(1), { imagen: "https://x.supabase.co/storage/v1/object/public/fotos/lugares/a/evento-1.jpg" }),
      evento("E7", "L1", "Ya pasó", dias(-2)),
      evento("E8", "L1", "En Oaxaca", dias(1), { ciudad: "Oaxaca" }),
      evento("E10", "L3", "Cancelado", dias(2), { cancelado: true }),
      evento("E14", "L3", "Oculto", dias(2), { visible: false }),
      evento("E15", "L3", "Borrador", dias(2), { borrador: true }),
    ],
    rutinas_corridas: [corrida("c-vieja", { estado: "terminada", creado_en: "2026-10-01T00:00:00Z" }), ...corridas],
    propuestas: [
      { id: "p-ya", corrida_id: "c-vieja", tipo: "cartel", fuente: FUENTE_WEB, datos: { evento_id: "E9", imagen: "https://x.example/a.jpg" }, estado: "propuesta" },
      { id: "p-rech", corrida_id: "c-vieja", tipo: "cartel", fuente: FUENTE_SITIO, datos: { evento_id: "E2", imagen: "https://forositio.mx/viejo.jpg" }, estado: "rechazada", motivo_rechazo: "otro" },
    ],
  });
}

let jpeg: Buffer;
let png: Buffer;
beforeAll(async () => {
  jpeg = await sharp({ create: { width: 80, height: 100, channels: 3, background: "#cc3355" } }).jpeg().toBuffer();
  png = await sharp({ create: { width: 64, height: 80, channels: 3, background: "#3355cc" } }).png().toBuffer();
});

/** La red: las dos imágenes que existen; lo demás, 404. */
function redFalsa() {
  const pedidas: string[] = [];
  const pedir = vi.fn(async (url: string) => {
    pedidas.push(url);
    if (url === JAZZ) return new Response(new Uint8Array(jpeg), { headers: { "content-type": "image/jpeg" } });
    if (url === LECTURA) return new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } });
    return new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
  return { pedir, pedidas };
}

const USO = { input_tokens: 20_000, output_tokens: 1_500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 2, web_fetch_requests: 1 } };
const COSTO = costoDeUso(USO, MODELO_RUTINAS);
type C = { evento_id: string; imagen: string; pagina: string };
function apiFalsa() {
  const create = vi.fn(async (cuerpo: Anthropic.MessageCreateParams) => {
    const texto = String(cuerpo.messages[0].content);
    let carteles: C[] = [];
    let paginas: string[] = [];
    if (texto.includes("Lugar: Foro Sitio"))
      carteles = [
        { evento_id: "E1", imagen: JAZZ, pagina: `${SITIO}/agenda` },
        { evento_id: "E1", imagen: "https://forositio.mx/otra.jpg", pagina: `${SITIO}/agenda` },
        { evento_id: "E2", imagen: "https://forositio.mx/viejo.jpg", pagina: `${SITIO}/agenda` },
        { evento_id: "E12", imagen: "https://forositio.mx/roto.jpg", pagina: `${SITIO}/agenda` },
      ];
    if (texto.includes("Lugar: Casa Sin Redes")) {
      paginas = [PRENSA];
      carteles = [
        { evento_id: "E5", imagen: LECTURA, pagina: PRENSA },
        { evento_id: "E11", imagen: "https://inventada.mx/taller.jpg", pagina: "https://inventada.mx/taller" },
      ];
    }
    return {
      id: "m",
      type: "message",
      role: "assistant",
      model: MODELO_RUTINAS,
      stop_reason: "tool_use",
      usage: USO,
      content: [
        { type: "web_search_tool_result", tool_use_id: "s", content: paginas.map((url) => ({ type: "web_search_result", url, title: "x", encrypted_content: "", page_age: null })) },
        { type: "tool_use", id: "t", name: "proponer_carteles", input: { carteles } },
      ],
    };
  });
  return { api: { messages: { create } } as unknown as ClienteApi, create };
}

function dependencias(base: ReturnType<typeof mundo>, api: ClienteApi | null | undefined = undefined) {
  const red = redFalsa();
  const falsa = apiFalsa();
  const dep: Dependencias = { db: base.db, api: api === undefined ? falsa.api : api, mapbox: null, pedir: red.pedir, ahora: () => AHORA, plazoMs: 45_000 };
  return { dep, create: falsa.create, pedidas: red.pedidas };
}
const laCorrida = (base: ReturnType<typeof mundo>, id = "c") => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
const nuevas = (base: ReturnType<typeof mundo>) => base.tablas.propuestas.filter((p) => p.corrida_id === "c");

describe("«Buscar carteles» (OL-444)", () => {
  it("el primer paso (gratis) toma los eventos próximos sin cartel de la ciudad y aparta los de lugares solo con Instagram", async () => {
    const base = mundo();
    const { dep, create } = dependencias(base);
    const r = await correrUnPaso(dep);
    expect(r).toMatchObject({ corrida: "c", estado: "corriendo", usd: 0 });
    expect(create).not.toHaveBeenCalled();
    const R = laCorrida(base).resumen;
    // E1 E2 E12 E3 E4 E5 E11 E13 E9: los nueve próximos sin cartel de San Luis (fuera: con cartel, pasado, otra ciudad, cancelado, oculto, borrador).
    expect(R.eventos_sin_cartel).toBe(9);
    expect(R.descartados).toMatchObject({ ya_propuesto: 1 });
    expect(R.solo_redes).toEqual([{ lugar: "Galería Solo IG", redes: ["https://www.instagram.com/galeriasoloig/"], eventos: 2 }]);
    expect(R.avisos).toEqual(["2 eventos de lugares solo con Instagram o Facebook: se revisan a mano"]);
    expect(R.paso).toBe("1 de 2 búsquedas");
    expect((R.cursor as { tareas: { lugar: string; eventos: { id: string }[] }[] }).tareas.map((t) => [t.lugar, t.eventos.map((e) => e.id)])).toEqual([
      ["Foro Sitio", ["E1", "E2", "E12"]],
      ["Casa Sin Redes", ["E5", "E11", "E13"]],
    ]);
  });

  it("busca lugar por lugar y propone solo lo comprobado: evento pedido, página vista, imagen que se baja y no rechazada antes", async () => {
    const base = mundo();
    const { dep, create, pedidas } = dependencias(base);
    for (let i = 0; i < 5 && laCorrida(base).estado !== "terminada"; i++) await correrUnPaso(dep);
    const C = laCorrida(base);
    expect(C.estado).toBe("terminada");
    expect(create).toHaveBeenCalledTimes(2);
    expect(C.gasto_usd).toBe(redondear(2 * COSTO));

    // Lo que se le pide: el lugar con su sitio, sus redes (que no se abren), los eventos con su id; Instagram y Facebook bloqueados.
    const [primera] = create.mock.calls[0] as [Anthropic.MessageCreateParams];
    const texto = String(primera.messages[0].content);
    expect(texto).toContain("Lugar: Foro Sitio. Su sitio: https://forositio.mx/");
    expect(texto).toContain("id E1 · «Jazz en el Foro»");
    expect(texto).toContain("no se pueden abrir");
    const herramientas = primera.tools as { name: string; blocked_domains?: string[]; input_schema?: { properties: { carteles: { items: { properties: { evento_id: { enum: string[] } } } } } } }[];
    expect(herramientas.filter((h) => h.name !== "proponer_carteles").every((h) => h.blocked_domains?.includes("instagram.com") && h.blocked_domains.includes("facebook.com"))).toBe(true);
    expect(herramientas.find((h) => h.name === "proponer_carteles")!.input_schema!.properties.carteles.items.properties.evento_id.enum).toEqual(["E1", "E2", "E12"]);
    // Ninguna llamada a la API para la galería que solo tiene Instagram.
    expect(create.mock.calls.some(([c]) => String((c as Anthropic.MessageCreateParams).messages[0].content).includes("Galería Solo IG"))).toBe(false);

    // Dos propuestas: el de su sitio y el de una nota de prensa que salió en la búsqueda.
    const p = nuevas(base);
    expect(p.map((x) => [x.tipo, x.fuente, (x.datos as { evento_id: string }).evento_id])).toEqual([
      ["cartel", FUENTE_SITIO, "E1"],
      ["cartel", FUENTE_WEB, "E5"],
    ]);
    expect(p[0].datos).toEqual({ evento_id: "E1", titulo: "Jazz en el Foro", inicio: dias(1), lugar: "Foro Sitio", imagen: JAZZ, pagina: `${SITIO}/agenda`, url: `${SITIO}/agenda`, ciudad: "San Luis Potosí", leida: AHORA.toISOString() });
    // Se bajaron las imágenes antes de proponerlas (también la rota); la rechazada antes y la de una página que no salió, no.
    expect(pedidas).toEqual(expect.arrayContaining([JAZZ, "https://forositio.mx/roto.jpg", LECTURA]));
    expect(pedidas).not.toContain("https://forositio.mx/viejo.jpg");
    expect(pedidas).not.toContain("https://inventada.mx/taller.jpg");
    expect(C.resumen).toMatchObject({
      paso: "2 de 2 búsquedas",
      avance: 1,
      propuestos: 2,
      descartados: { ya_propuesto: 1, rechazado_antes: 1, imagen_no_sirve: 1, pagina_no_vista: 1, sin_cartel: 1, de_mas: 0 },
      busquedas_web: 4,
    });
    expect(C.resumen.cursor).toBeUndefined();
    // Sin nombres de personas en el resumen: solo contadores, avisos y los lugares solo con redes (fichas públicas).
    expect(Object.keys(C.resumen).sort()).toEqual(["actualizada", "avance", "avisos", "busquedas_web", "descartados", "errores", "eventos_sin_cartel", "intentos", "ocupada_hasta", "paso", "propuestos", "solo_redes", "turno"]);
  });

  it("una segunda corrida no repite los eventos con un cartel por revisar", async () => {
    const base = mundo();
    const { dep } = dependencias(base);
    for (let i = 0; i < 5 && laCorrida(base).estado !== "terminada"; i++) await correrUnPaso(dep);
    base.tablas.rutinas_corridas.push(corrida("c2", { creado_en: "2026-10-22T17:00:00Z" }));
    await correrUnPaso(dep);
    const R = laCorrida(base, "c2").resumen;
    // E9 (de antes), E1 y E5 (de la primera) ya tienen cartel propuesto.
    expect(R.descartados).toMatchObject({ ya_propuesto: 3 });
  });

  it("el tope: si la siguiente llamada no cabe, para con «Llegó al tope» sin llamar a la API", async () => {
    const base = mundo([corrida("c", { tope_usd: 0.3 })]);
    const { dep, create } = dependencias(base);
    await correrUnPaso(dep);
    await correrUnPaso(dep);
    expect(create).not.toHaveBeenCalled();
    expect(laCorrida(base)).toMatchObject({ estado: "terminada", resumen: { tope: true, propuestos: 0 } });
  });

  it("sin llave de la API, termina diciendo que no buscó", async () => {
    const base = mundo();
    const { dep } = dependencias(base, null);
    await correrUnPaso(dep);
    await correrUnPaso(dep);
    expect(laCorrida(base).estado).toBe("terminada");
    expect(laCorrida(base).resumen.avisos).toContain("Sin llave de la API: no se buscaron los carteles");
  });

  it("una ciudad sin eventos sin cartel termina en el primer paso, gratis", async () => {
    const base = mundo();
    base.tablas.eventos = [];
    const { dep, create } = dependencias(base);
    await correrUnPaso(dep);
    expect(create).not.toHaveBeenCalled();
    expect(laCorrida(base)).toMatchObject({ estado: "terminada", resumen: { paso: "sin eventos que buscar", eventos_sin_cartel: 0, propuestos: 0 } });
  });
});

describe("agruparPorLugar", () => {
  it("un sitio sin ficha es su propio grupo; más de cuatro eventos se parten; un lugar con Facebook y un evento con página sí se busca", () => {
    const ev = (id: string, lugar_id: string | null, extra: Partial<{ enlace: string; sitio_texto: string }> = {}) => ({ id, titulo: id, inicio: dias(1), enlace: extra.enlace ?? null, lugar_id, sitio_texto: extra.sitio_texto ?? null, imagen: null });
    const { tareas, soloRedes } = agruparPorLugar(
      [...["a", "b", "c", "d", "e"].map((x) => ev(x, "L1")), ev("s1", null, { sitio_texto: "Parque Tangamanga" }), ev("f1", "LF", { enlace: "https://boletos.mx/f1" }), ev("f2", "LF2")],
      [
        { id: "L1", nombre: "Foro", redes: [] },
        { id: "LF", nombre: "Bar con Facebook", redes: [{ url: "https://facebook.com/bar" }] },
        { id: "LF2", nombre: "Otro con Facebook", redes: { facebook: "otro" } },
      ],
    );
    expect(tareas.map((t) => [t.lugar, t.eventos.length])).toEqual([
      ["Foro", EVENTOS_POR_LLAMADA],
      ["Foro", 1],
      ["Parque Tangamanga", 1],
      ["Bar con Facebook", 1],
    ]);
    expect(soloRedes).toEqual([{ lugar: "Otro con Facebook", redes: ["https://facebook.com/otro"], eventos: 1 }]);
    expect(avisoSoloRedes(soloRedes)).toBe("1 evento de un lugar solo con Instagram o Facebook: se revisan a mano");
    expect(avisoSoloRedes([])).toBeNull();
  });
});

describe("la hoja y la bandeja de «Buscar carteles»", () => {
  it("la hoja lleva su tope de 2,00 por omisión (las demás, 3,00)", () => {
    expect(TOPE_CARTELES).toBe(2);
    expect(HOJAS.carteles.tope).toBe(2);
    expect(HOJAS.lugares.tope ?? TOPE_POR_DEFECTO).toBe(3);
  });

  it("la tarjeta de un cartel dice de qué evento es, cuándo y dónde, la fuente y deja abrir la imagen", () => {
    const p = { tipo: "cartel" as const, datos: { evento_id: "E1", titulo: "Jazz en el Foro", inicio: "2026-10-24T02:00:00Z", lugar: "Foro Sitio", imagen: JAZZ, pagina: `${SITIO}/agenda`, url: `${SITIO}/agenda`, leida: AHORA.toISOString() }, creado_en: AHORA.toISOString() };
    const v = vistaPropuesta(p, "San Luis Potosí", AHORA);
    expect(v).toMatchObject({ que: "Cartel · propuesto por la rutina", titulo: "Jazz en el Foro", linea: "23 oct, 8:00 pm · Foro Sitio", fuente: { texto: "forositio.mx", url: `${SITIO}/agenda` }, imagen: JAZZ });
    expect(nombreDe(p)).toBe("el cartel de «Jazz en el Foro»");
    expect(textoDecidida(nombreDe(p), { aceptada: true, tipo: "cartel" })).toBe("Aceptaste el cartel de «Jazz en el Foro»");
    // Una imagen que no es http(s) no se ofrece para abrir.
    expect(vistaPropuesta({ ...p, datos: { ...p.datos, imagen: "javascript:alert(1)" } }, null, AHORA).imagen).toBeNull();
  });
});
