import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { baseFichas, detalleCorrida, informeFichas, textoFaltan, textoPorCampo } from "../ciudadesAdmin";
import { aceptarLeida, type DepAceptar, type PropuestaLeida } from "./aceptarPropuesta";
import { lineaSemanal, leerAjusteSemanal } from "./ajusteSemanal";
import { baseFalsa, type Fila } from "./baseFalsa";
import type { ClienteApi } from "./claude";
import { esLaCuenta, usuarioDeEnlace, usuariosPlausibles } from "./descubrir";
import { DESCRIPCION_MINIMA, leerSitio, limpiarDescripcion, MODELO_FICHAS, queLeFalta, sirve } from "./fichas";
import { rutaEnBucket, type AlmacenFichas } from "./fichasImagen";
import { correrUnPaso, type Dependencias } from "./motor";
import { programarSemanales } from "./semanales";

/**
 * «Completar fichas» de punta a punta (OL-489), sin red: la base en memoria, Business Discovery de Meta falso (una `fetch` que contesta como la
 * Graph API), un sitio falso, imágenes JPEG de verdad (sharp), Anthropic falso y un bucket en memoria. Tres artistas y dos lugares incompletos:
 *   · «Colectivo Marea» (artista con Instagram) → foto, portada y descripción de su cuenta;
 *   · «Ana Lucía Rivas» (artista con sitio) → portada y descripción de su sitio, e Instagram del enlace de su sitio;
 *   · «Trío Huasteco Sol» (artista sin nada) → su cuenta encontrada (dice su nombre y San Luis Potosí): Instagram, foto, portada y descripción;
 *   · «Foro Lunaria» (lugar con Instagram) → la portada salta el cartel con texto y toma la siguiente; descripción;
 *   · «Casa del Viento» (lugar sin nada) → la cuenta que aparece es de Oaxaca: no se propone; queda «sin fuente».
 */

const AHORA = new Date("2026-10-29T18:00:00Z");
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.15, lng: -100.98, zoom: 13, zona: "America/Mexico_City", alias: ["Soledad de Graciano Sánchez"], estado: "abierta", parametros: {} };
const ADMIN = "9690e3b6-f389-4e89-a876-cdc9d29221b3";
const IG_MARCA = "17841400000000000";
const BASE_FOTOS = "https://prueba.supabase.co/storage/v1/object/public/fotos/";
const ids = { marea: "a1a1a1a1-0000-4000-8000-000000000001", rivas: "a1a1a1a1-0000-4000-8000-000000000002", trio: "a1a1a1a1-0000-4000-8000-000000000003", lunaria: "b2b2b2b2-0000-4000-8000-000000000001", viento: "b2b2b2b2-0000-4000-8000-000000000002" };
const dias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000).toISOString();

let GRANDE: Buffer;
let PERFIL: Buffer;
beforeAll(async () => {
  GRANDE = await sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 180, g: 90, b: 40 } } }).jpeg().toBuffer();
  PERFIL = await sharp({ create: { width: 320, height: 320, channels: 3, background: { r: 40, g: 90, b: 180 } } }).jpeg().toBuffer();
});

const cuenta = (usuario: string, nombre: string, biografia: string, media: { id: string; tipo?: string; dias: number }[]) => ({
  business_discovery: {
    username: usuario,
    name: nombre,
    biography: biografia,
    profile_picture_url: `https://scontent.cdninstagram.com/perfil/${usuario}.jpg`,
    media: {
      data: media.map((m) => ({
        id: m.id,
        media_type: m.tipo ?? "IMAGE",
        media_url: `https://scontent.cdninstagram.com/post/${m.id}.jpg`,
        permalink: `https://www.instagram.com/p/${m.id}/`,
        caption: "texto",
        timestamp: dias(-m.dias),
      })),
    },
  },
});
const CUENTAS: Record<string, unknown> = {
  colectivomarea: cuenta("colectivomarea", "Colectivo Marea", "Colectivo de teatro físico y danza contemporánea de San Luis Potosí. Creamos piezas sobre el agua y la memoria desde 2015. Funciones y talleres 🌊 #teatro", [
    { id: "m1", dias: 2 },
    { id: "m2", dias: 9 },
  ]),
  // «Trío Huasteco Sol» no tiene redes: se prueba «triohuastecosol» (no existe) y «trio.huasteco.sol» (es él).
  "trio.huasteco.sol": cuenta("trio.huasteco.sol", "Trío Huasteco Sol", "Trío de son huasteco de San Luis Potosí. Violín, jarana y huapanguera en fandangos, festivales y fiestas de la Huasteca potosina desde 2010.", [{ id: "t1", dias: 4 }]),
  "foro.lunaria": cuenta("foro.lunaria", "Foro Lunaria", "Foro independiente en el centro de San Luis Potosí: teatro, música en vivo, cine y exposiciones. Abrimos de jueves a domingo y recibimos propuestas de artistas locales.", [
    { id: "l1", dias: 1 },
    { id: "l2", dias: 6 },
  ]),
  // «Casa del Viento»: una cuenta con su nombre, pero de Oaxaca.
  casadelviento: cuenta("casadelviento", "Casa del Viento", "Hostal y café en Oaxaca de Juárez.", [{ id: "v1", dias: 3 }]),
};
const SITIO_RIVAS = `<html><head><meta property="og:image" content="https://anarivas.mx/img/obra-grande.jpg"><meta name="description" content="Ana Lucía Rivas es pintora y grabadora de San Luis Potosí. Su obra explora el paisaje del altiplano potosino con xilografía y óleo; ha expuesto en museos del Bajío."></head>
<body><img src="/img/logo.svg"><a href="https://www.instagram.com/anarivas.arte/">Instagram</a><p>Pintura, grabado y talleres.</p></body></html>`;

/** La red: la Graph API (Business Discovery), el CDN de Instagram, el sitio de Ana Lucía. Anota lo que se pidió. */
function red(pedidas: string[]) {
  return (async (entrada: string) => {
    const u = new URL(entrada);
    pedidas.push(`${u.hostname}${u.pathname}${u.hostname === "graph.facebook.com" ? `?${decodeURIComponent(u.searchParams.get("fields") ?? "").slice(0, 60)}` : ""}`);
    if (u.hostname === "graph.facebook.com") {
      expect(u.pathname).toBe(`/v23.0/${IG_MARCA}`);
      const usuario = decodeURIComponent(u.searchParams.get("fields") ?? "").match(/username\(([^)]+)\)/)?.[1] ?? "";
      const c = CUENTAS[usuario];
      return c ? Response.json(c) : Response.json({ error: { code: 110, message: "Invalid user id" } }, { status: 400 });
    }
    if (u.hostname === "scontent.cdninstagram.com" || (u.hostname === "anarivas.mx" && u.pathname.endsWith(".jpg")))
      return new Response(new Uint8Array(u.pathname.startsWith("/perfil/") ? PERFIL : GRANDE), { headers: { "content-type": "image/jpeg" } });
    if (u.hostname === "anarivas.mx") return new Response(SITIO_RIVAS, { headers: { "content-type": "text/html; charset=utf-8" } });
    return new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
}

/** El modelo falso: la portada de Lunaria más reciente es un cartel; lo demás, obra/lugar/retrato. Escribe la descripción del texto que recibe. */
function apiFalsa(llamadas: { ficha: string; imagenes: number; modelo: string }[]): ClienteApi {
  return {
    messages: {
      create: async (p: { model: string; messages: { content: { type: string; text?: string }[] }[] }) => {
        const bloques = p.messages[0].content;
        const encabezado = bloques[0].text ?? "";
        const ficha = encabezado.match(/«([^»]+)»/)?.[1] ?? "";
        const numeros = bloques.filter((b) => b.type === "text" && /^Imagen \d+/.test(b.text ?? "")).map((b) => ({ n: Number(b.text!.match(/^Imagen (\d+)/)![1]), perfil: /foto de perfil/.test(b.text!) }));
        llamadas.push({ ficha, imagenes: bloques.filter((b) => b.type === "image").length, modelo: p.model });
        const clase = (x: { n: number; perfil: boolean }) => (x.perfil ? "retrato" : ficha === "Foro Lunaria" ? (x.n === 1 ? "cartel_con_texto" : "lugar") : "obra");
        const texto = /\(ninguno\)/.test(encabezado) ? null : `${ficha} es un proyecto cultural de San Luis Potosí. ${"Según su propio texto, presenta su trabajo en la ciudad y en la región con funciones, talleres y exposiciones abiertas al público. ".repeat(2)}`;
        return {
          id: "m",
          type: "message",
          role: "assistant",
          model: MODELO_FICHAS,
          stop_reason: "tool_use",
          usage: { input_tokens: 3000, output_tokens: 300 },
          content: [{ type: "tool_use", id: "t", name: "entregar_ficha", input: { imagenes: numeros.map((x) => ({ numero: x.n, clase: clase(x) })), descripcion: texto } }],
        };
      },
    },
  } as unknown as ClienteApi;
}

function almacenFalso(): AlmacenFichas & { archivos: Map<string, Buffer> } {
  const archivos = new Map<string, Buffer>();
  return {
    archivos,
    subir: async (ruta, bytes) => (archivos.set(ruta, bytes), `${BASE_FOTOS}${ruta}`),
    leer: async (ruta) => archivos.get(ruta) ?? null,
    borrar: async (rutas) => void rutas.forEach((r) => archivos.delete(r)),
    rutaDe: (url) => rutaEnBucket(url, BASE_FOTOS),
  };
}

function mundo(o: { api?: boolean; tope?: number; cuenta?: boolean; corridasPrevias?: Fila[] } = {}) {
  const evento = (id: string, lugar: string | null, d: number) => ({ id, titulo: id, ciudad: "San Luis Potosí", visible: true, borrador: false, cancelado: false, inicio: dias(d), termina: dias(d + 0.1), lugar_id: lugar });
  const base = baseFalsa({
    ciudades: [structuredClone(SLP)],
    rutinas_corridas: [
      ...(o.corridasPrevias ?? []),
      { id: "F", tipo: "fichas", ciudad: "san-luis-potosi", parametros: { horizonte_dias: 21, max_fichas: 20 }, tope_usd: o.tope ?? 0.5, gasto_usd: 0, estado: "pendiente", resumen: {}, creado_en: AHORA.toISOString(), inicio: null, fin: null },
    ],
    eventos: [evento("e1", ids.lunaria, 2), evento("e2", ids.viento, 5), evento("e3", null, 3), evento("e4", null, 8), evento("e5", null, 30), evento("e6", null, 1)],
    eventos_artistas: [
      { evento_id: "e3", artista_id: ids.marea },
      { evento_id: "e4", artista_id: ids.rivas },
      { evento_id: "e6", artista_id: ids.trio },
      // Fuera del horizonte de 21 días: no entra.
      { evento_id: "e5", artista_id: "a1a1a1a1-0000-4000-8000-0000000000ff" },
    ],
    artistas: [
      { id: ids.marea, nombre: "Colectivo Marea", foto: null, portada: null, descripcion: null, redes: [{ red: "instagram", url: "https://www.instagram.com/colectivomarea/" }], visible: true, slug: "colectivo-marea" },
      { id: ids.rivas, nombre: "Ana Lucía Rivas", foto: "https://ya.tiene/foto.jpg", portada: null, descripcion: "", redes: [{ red: "sitio", url: "https://anarivas.mx" }], visible: true, slug: "ana-lucia-rivas" },
      { id: ids.trio, nombre: "Trío Huasteco Sol", foto: null, portada: null, descripcion: null, redes: {}, visible: true, slug: "trio-huasteco-sol" },
      { id: "a1a1a1a1-0000-4000-8000-0000000000ff", nombre: "Lejana", foto: null, portada: null, descripcion: null, redes: [], visible: true },
    ],
    lugares: [
      { id: ids.lunaria, nombre: "Foro Lunaria", portada: null, descripcion: null, redes: [{ red: "instagram", url: "https://www.instagram.com/foro.lunaria/" }], visible: true, privado: false, slug: "foro-lunaria" },
      { id: ids.viento, nombre: "Casa del Viento", portada: null, descripcion: null, redes: [], visible: true, privado: false, slug: "casa-del-viento" },
    ],
    propuestas: [],
  });
  const pedidas: string[] = [];
  const llamadas: { ficha: string; imagenes: number; modelo: string }[] = [];
  const almacen = almacenFalso();
  const dep: Dependencias = {
    db: base.db,
    api: o.api === false ? null : apiFalsa(llamadas),
    mapbox: null,
    pedir: red(pedidas),
    ahora: () => AHORA,
    plazoMs: 45_000,
    almacenFichas: almacen,
    cuentaInstagram: async () => (o.cuenta === false ? null : { token: "token-de-prueba-0123456789", usuario: IG_MARCA }),
  };
  const correrTodo = async () => {
    for (let i = 0; i < 40; i++) {
      const r = await correrUnPaso(dep);
      if (r.estado !== "corriendo") return r;
    }
    throw new Error("no terminó");
  };
  const fila = () => base.tablas.rutinas_corridas.find((c) => c.id === "F")! as Fila & { resumen: Record<string, unknown>; gasto_usd: number };
  const propuestas = () => base.tablas.propuestas as (Fila & { campo: string; fuente: string; datos: Record<string, unknown>; estado: string; id: string })[];
  const de = (ficha: string) => propuestas().filter((p) => p.datos.ficha_id === ficha);
  return { base, dep, pedidas, llamadas, almacen, correrTodo, fila, propuestas, de };
}

describe("Completar fichas (OL-489): la corrida", () => {
  it("3 artistas y 2 lugares incompletos → propuestas por campo con su miniatura, su fuente y su confianza; lo que no tiene fuente queda en el informe", async () => {
    const m = mundo();
    const r = await m.correrTodo();
    expect(r.estado).toBe("terminada");
    const F = m.fila();
    const campos = (id: string) => m.de(id).map((p) => p.campo).sort();

    // (a) Su Instagram: foto, portada y descripción (ya tiene Instagram).
    expect(campos(ids.marea)).toEqual(["descripcion", "foto", "portada"]);
    const portadaMarea = m.de(ids.marea).find((p) => p.campo === "portada")!;
    expect(portadaMarea).toMatchObject({ tipo: "ficha", fuente: "Instagram de la ficha" });
    expect(portadaMarea.datos).toMatchObject({ ficha_tipo: "artista", nombre: "Colectivo Marea", confianza: "alta", url: "https://www.instagram.com/p/m1/", origen: "https://scontent.cdninstagram.com/post/m1.jpg" });
    // La imagen y su miniatura, ya recortadas y guardadas en la carpeta de espera (las del CDN caducan).
    const espera = m.almacen.rutaDe(String(portadaMarea.datos.imagen))!;
    expect(espera).toMatch(/^artistas\/rutina-fichas\/F\/[0-9a-f-]{36}-portada\.jpg$/);
    const meta = await sharp(m.almacen.archivos.get(espera)!).metadata();
    expect(meta.width! / meta.height!).toBeCloseTo(1.5, 2);
    expect(m.almacen.rutaDe(String(portadaMarea.datos.miniatura))).toMatch(/-portada-mini\.jpg$/);
    const foto = m.de(ids.marea).find((p) => p.campo === "foto")!;
    const metaFoto = await sharp(m.almacen.archivos.get(m.almacen.rutaDe(String(foto.datos.imagen))!)!).metadata();
    expect(metaFoto.width).toBe(metaFoto.height);
    const desc = String(m.de(ids.marea).find((p) => p.campo === "descripcion")!.datos.valor);
    expect(desc.length).toBeGreaterThanOrEqual(DESCRIPCION_MINIMA);
    expect(desc.length).toBeLessThanOrEqual(300);

    // (b) Su sitio: portada y descripción (la foto ya la tiene), e Instagram del enlace del sitio, con confianza media.
    expect(campos(ids.rivas)).toEqual(["descripcion", "instagram", "portada"]);
    expect(m.de(ids.rivas).every((p) => p.fuente === "Sitio de la ficha" && p.datos.confianza === "media")).toBe(true);
    expect(m.de(ids.rivas).find((p) => p.campo === "instagram")!.datos).toMatchObject({ valor: "https://www.instagram.com/anarivas.arte/", usuario: "anarivas.arte", url: "https://anarivas.mx/" });
    expect(m.de(ids.rivas).find((p) => p.campo === "portada")!.datos.origen).toBe("https://anarivas.mx/img/obra-grande.jpg");

    // (c) Sin nada: su cuenta por nombres plausibles; coincide nombre y ciudad → todo, con confianza media.
    expect(campos(ids.trio)).toEqual(["descripcion", "foto", "instagram", "portada"]);
    expect(m.de(ids.trio).every((p) => p.fuente === "Instagram encontrado" && p.datos.confianza === "media")).toBe(true);
    expect(m.pedidas.filter((x) => x.startsWith("graph.facebook.com") && /huasteco/.test(x))).toHaveLength(2);

    // Foro Lunaria: su publicación más reciente es un cartel con texto; la portada es la siguiente.
    expect(campos(ids.lunaria)).toEqual(["descripcion", "portada"]);
    expect(m.de(ids.lunaria).find((p) => p.campo === "portada")!.datos).toMatchObject({ origen: "https://scontent.cdninstagram.com/post/l2.jpg", ficha_tipo: "lugar" });
    expect(m.almacen.rutaDe(String(m.de(ids.lunaria)[0].datos.imagen ?? m.de(ids.lunaria)[1].datos.imagen))).toMatch(/^lugares\/rutina-fichas\/F\//);

    // Casa del Viento: la cuenta con su nombre es de Oaxaca → nada; sin fuente y en `nada` (no se busca en 30 días).
    expect(m.de(ids.viento)).toHaveLength(0);
    const inf = informeFichas(F.resumen);
    expect(inf.sinFuente.map((s) => s.nombre)).toEqual(["Casa del Viento"]);
    expect(inf.sinFuente[0].motivo).toMatch(/no apareció una cuenta con su nombre y su ciudad/);
    expect(F.resumen.nada).toEqual([`lugar:${ids.viento}`]);

    // El informe: revisadas, por campo, gasto (Haiku 5.5, una llamada por ficha con algo que juzgar).
    expect(inf).toMatchObject({ revisadas: 5, incompletas: 5, porCampo: { foto: 2, portada: 4, descripcion: 4, instagram: 2 } });
    expect(F.resumen).toMatchObject({ propuestos: 12, descartados: expect.objectContaining({ cartel_con_texto: 1, cuenta_no_coincide: 1 }) });
    expect(m.llamadas.map((l) => l.ficha).sort()).toEqual(["Ana Lucía Rivas", "Colectivo Marea", "Foro Lunaria", "Trío Huasteco Sol"]);
    expect(m.llamadas.every((l) => l.modelo === "claude-haiku-5-5" && l.imagenes >= 1)).toBe(true);
    // Cada paso redondea a la diezmilésima (`gasto_usd` es numeric(10,4)).
    expect(F.gasto_usd).toBeCloseTo((4 * (3000 * 0.1 + 300 * 0.5)) / 1e6, 3);
    // Nada fuera del horizonte; nada de Facebook ni de cuentas que no son de fichas del directorio.
    expect(m.pedidas.some((x) => /facebook\.com\/(?!v23)/.test(x) || /lejana/i.test(x))).toBe(false);
  });

  it("aceptar una de cada campo completa la ficha (sin pisar lo que ya tiene) y la deja como la pide la semana de Instagram", async () => {
    const m = mundo();
    await m.correrTodo();
    const marcadas: string[] = [];
    const dep: DepAceptar = {
      yo: ADMIN,
      admin: m.base.db,
      consultas: m.base.db,
      marcar: async (id) => {
        marcadas.push(id);
        const p = m.propuestas().find((x) => x.id === id)!;
        Object.assign(p, { estado: "aceptada", resuelto_por: ADMIN, resuelto_en: AHORA.toISOString() });
        return { data: { estado: "aceptada", ficha_id: null }, error: null };
      },
      mapbox: null,
      almacen: () => ({ subir: async () => null }),
      almacenFichas: () => m.almacen,
      ahora: () => AHORA,
    };
    const leida = (p: (typeof m.propuestas extends () => (infer T)[] ? T : never)): PropuestaLeida => ({ id: p.id, tipo: "ficha", datos: p.datos, estado: p.estado, corrida_id: "F" });
    const marea = m.de(ids.marea);
    for (const campo of ["foto", "portada", "descripcion"]) {
      const r = await aceptarLeida(dep, leida(marea.find((p) => p.campo === campo)!), "San Luis Potosí");
      expect(r).toMatchObject({ ok: true, href: "/artistas/colectivo-marea" });
    }
    const ig = m.de(ids.rivas).find((p) => p.campo === "instagram")!;
    expect(await aceptarLeida(dep, leida(ig), "San Luis Potosí")).toMatchObject({ ok: true, nota: "se añadió su Instagram" });

    const a = m.base.tablas.artistas.find((x) => x.id === ids.marea)! as Record<string, unknown>;
    expect(String(a.foto)).toMatch(new RegExp(`^${BASE_FOTOS}artistas/${ADMIN}/foto-[0-9a-f-]{36}\\.jpg$`));
    expect(String(a.portada)).toMatch(new RegExp(`^${BASE_FOTOS}artistas/${ADMIN}/portada-[0-9a-f-]{36}\\.jpg$`));
    // Lo que pide `instagram_candidatos` (migración 20261029200000): foto, portada, descripción de 120 o más e Instagram en redes.
    expect(String(a.descripcion).length).toBeGreaterThanOrEqual(120);
    expect(JSON.stringify(a.redes)).toMatch(/instagram\.com\/[A-Za-z0-9._]/);
    expect(a.visible).toBe(true);
    // Las de espera se borran al aceptar; la propuesta queda ligada a su ficha.
    expect([...m.almacen.archivos.keys()].filter((k) => k.startsWith("artistas/rutina-fichas/F/") && m.de(ids.marea).some((p) => String(p.datos.imagen).endsWith(k)))).toEqual([]);
    expect(marea.every((p) => p.estado === "aceptada" && p.ficha_id === ids.marea)).toBe(true);
    const rivas = m.base.tablas.artistas.find((x) => x.id === ids.rivas)! as Record<string, unknown>;
    expect(rivas.redes).toEqual([
      { red: "sitio", url: "https://anarivas.mx" },
      { red: "instagram", url: "https://www.instagram.com/anarivas.arte/" },
    ]);
    expect(rivas.foto).toBe("https://ya.tiene/foto.jpg");

    // Nunca pisa: si alguien puso la portada de Lunaria mientras tanto, la propuesta no se acepta.
    const lunaria = m.base.tablas.lugares.find((x) => x.id === ids.lunaria)! as Record<string, unknown>;
    lunaria.portada = "https://alguien/la-puso.jpg";
    const r = await aceptarLeida(dep, leida(m.de(ids.lunaria).find((p) => p.campo === "portada")!), "San Luis Potosí");
    expect(r).toEqual({ ok: false, error: "Esa ficha ya tiene ese dato: recházala como duplicado." });
    expect(lunaria.portada).toBe("https://alguien/la-puso.jpg");
    expect(marcadas).toHaveLength(4);
  });

  it("la semana siguiente: no repite lo que espera revisión ni busca otra vez lo que no tuvo fuente en 30 días", async () => {
    const m = mundo();
    await m.correrTodo();
    const primera = structuredClone(m.fila());
    const n = m.propuestas().length;
    // Otra corrida en la misma base, días después.
    Object.assign(primera, { id: "F0", estado: "terminada", creado_en: dias(-3) });
    m.base.tablas.rutinas_corridas.push(primera);
    Object.assign(m.fila(), { estado: "pendiente", resumen: {}, gasto_usd: 0 });
    await m.correrTodo();
    expect(m.propuestas()).toHaveLength(n);
    expect(informeFichas(m.fila().resumen)).toMatchObject({ revisadas: 0, recientes: 1 });
  });

  it("sin llave de la API: no juzga imágenes ni escribe descripciones; solo el Instagram, y lo avisa", async () => {
    const m = mundo({ api: false });
    await m.correrTodo();
    expect(m.propuestas().map((p) => p.campo).sort()).toEqual(["instagram", "instagram"]);
    expect(m.fila().resumen.avisos).toContain("Sin llave de la API: no se juzgaron las imágenes ni se escribieron descripciones");
  });

  it("sin conexión con Instagram: lee solo sitios, lo avisa y no busca cuentas", async () => {
    const m = mundo({ cuenta: false });
    await m.correrTodo();
    expect(m.pedidas.some((x) => x.startsWith("graph.facebook.com"))).toBe(false);
    expect(new Set(m.propuestas().map((p) => p.datos.ficha_id))).toEqual(new Set([ids.rivas]));
    expect(m.fila().resumen.avisos).toContain("Sin conexión con Instagram: solo se leyeron sitios");
    // Lo que no se pudo leer por eso se vuelve a buscar la semana siguiente: no entra a `nada` (los 30 días).
    expect(m.fila().resumen.nada).toBeUndefined();
    expect(informeFichas(m.fila().resumen).sinFuente.map((x) => x.motivo)).toContain("Sin conexión con Instagram");
  });

  it("el tope corta antes de la llamada que no cabe y lo dice", async () => {
    const m = mundo({ tope: 0.01 });
    expect((await m.correrTodo()).estado).toBe("terminada");
    expect(m.fila().resumen).toMatchObject({ tope: true, revisadas: 0 });
    expect(m.llamadas).toHaveLength(0);
  });
});

describe("Completar fichas: las piezas", () => {
  it("qué le falta a una ficha: solo lo vacío; una descripción corta no se pisa", () => {
    const r = queLeFalta("artista", { id: "x", nombre: "X", foto: "f", portada: "", descripcion: "Corta.", redes: [{ url: "https://www.instagram.com/x.y/" }], visible: true });
    expect(r).toMatchObject({ faltan: ["portada"], corta: true, instagram: "x.y" });
    expect(queLeFalta("lugar", { id: "x", nombre: "X", portada: null, descripcion: null, redes: { sitio: "foro.mx" }, visible: true, privado: false }).faltan).toEqual(["portada", "descripcion", "instagram"]);
  });

  it("nombres de usuario plausibles y la regla de la cuenta: su nombre y su ciudad", () => {
    expect(usuariosPlausibles("Trío Huasteco Sol")).toEqual(["triohuastecosol", "trio.huasteco.sol", "trio_huasteco_sol"]);
    expect(usuariosPlausibles("Casa de la Cultura")).toEqual(["casadelacultura", "casa.de.la.cultura", "casa_de_la_cultura", "casacultura"]);
    const ciudades = ["San Luis Potosí", "Soledad de Graciano Sánchez"];
    expect(esLaCuenta({ nombre: "Trío Huasteco Sol", biografia: "Son huasteco desde San Luis Potosí", sitio: null }, "Trío Huasteco Sol", ciudades)).toBe(true);
    expect(esLaCuenta({ nombre: "Casa del Viento", biografia: "Hostal en Oaxaca", sitio: null }, "Casa del Viento", ciudades)).toBe(false);
    expect(esLaCuenta({ nombre: "Otro", biografia: "San Luis Potosí", sitio: null }, "Trío Huasteco Sol", ciudades)).toBe(false);
    expect(esLaCuenta({ nombre: "Foro X", biografia: "", sitio: "https://foroxsanluispotosi.mx" }, "Foro X", ciudades)).toBe(true);
    expect(usuarioDeEnlace("https://www.instagram.com/p/abc/")).toBeNull();
    expect(usuarioDeEnlace("https://instagram.com/foro.x?igsh=1")).toBe("foro.x");
  });

  it("la descripción: sin arrobas, etiquetas, enlaces ni emojis; hasta 300 en una frase entera", () => {
    const larga = `Colectivo de teatro de San Luis Potosí @marea #teatro 🌊 https://x.mx. ${"Hace funciones y talleres en la ciudad. ".repeat(10)}`;
    const d = limpiarDescripcion(larga)!;
    expect(d).not.toMatch(/[@#🌊]|https?:/);
    expect(d.length).toBeLessThanOrEqual(300);
    expect(d.endsWith(".")).toBe(true);
    expect(limpiarDescripcion("Muy corta.")).toBeNull();
  });

  it("qué imagen sirve: la portada de un artista es su obra; la de un lugar, el lugar o lo que pasa ahí; nunca un cartel ni niñas o niños", () => {
    expect(sirve("portada", "artista", "obra")).toBe(true);
    expect(sirve("portada", "artista", "lugar")).toBe(false);
    expect(sirve("portada", "lugar", "lugar")).toBe(true);
    for (const c of ["cartel_con_texto", "ninos", "otro"] as const) expect(sirve("portada", "lugar", c) || sirve("foto", "artista", c)).toBe(false);
    expect(sirve("foto", "artista", "retrato")).toBe(true);
  });

  it("el sitio: og:image y las primeras imágenes (sin svg ni logos), el texto y su Instagram", () => {
    const s = leerSitio(SITIO_RIVAS, "https://anarivas.mx/");
    expect(s.imagenes).toEqual(["https://anarivas.mx/img/obra-grande.jpg"]);
    expect(s.instagram).toBe("anarivas.arte");
    expect(s.texto).toMatch(/pintora y grabadora/);
  });

  it("la ruta en el bucket: solo de artistas o lugares, sin salir de él", () => {
    expect(rutaEnBucket(`${BASE_FOTOS}artistas/rutina-fichas/F/x.jpg`, BASE_FOTOS)).toBe("artistas/rutina-fichas/F/x.jpg");
    expect(rutaEnBucket(`${BASE_FOTOS}perfiles/x.jpg`, BASE_FOTOS)).toBeNull();
    expect(rutaEnBucket(`${BASE_FOTOS}artistas/../perfiles/x.jpg`, BASE_FOTOS)).toBeNull();
    expect(rutaEnBucket("https://otro.mx/fotos/artistas/x.jpg", BASE_FOTOS)).toBeNull();
  });
});

describe("Completar fichas: cada semana", () => {
  const base = (activa: boolean, corridas: Fila[] = []) =>
    baseFalsa({
      configuracion: [{ clave: "rutina_fichas_semanal", valor: { activa, tope_usd: 0.5 } }],
      ciudades: [
        { slug: "san-luis-potosi", estado: "abierta" },
        { slug: "oaxaca", estado: "investigando" },
        { slug: "tijuana", estado: "detectada" },
      ],
      rutinas_corridas: corridas,
    });

  it("encendida: deja una corrida por ciudad abierta si no tuvo una en 7 días; apagada, ninguna", async () => {
    const b = base(true, [{ id: "vieja", tipo: "fichas", ciudad: "oaxaca", estado: "terminada", creado_en: dias(-2) }]);
    expect(await programarSemanales(b.db, AHORA)).toBe(1);
    const nueva = b.tablas.rutinas_corridas.find((c) => c.id !== "vieja")!;
    expect(nueva).toMatchObject({ tipo: "fichas", ciudad: "san-luis-potosi", tope_usd: 0.5, parametros: { horizonte_dias: 21, max_fichas: 20, semanal: true } });
    expect(await programarSemanales(b.db, AHORA)).toBe(0);
    expect(await programarSemanales(base(false).db, AHORA)).toBe(0);
    expect(await programarSemanales(baseFalsa({}).db, AHORA)).toBe(0);
  });

  it("lo que dice su renglón en Administración › Rutinas", () => {
    const a = leerAjusteSemanal({ activa: true });
    const l = lineaSemanal(a, [{ tipo: "fichas", creado_en: dias(-1), propuestas: 12, gasto_usd: 0.0018, estado: "terminada" }], AHORA);
    expect(l).toEqual({
      encendida: "Cada semana en cada ciudad abierta, con tope de 0,50\u00a0USD por ciudad.",
      apagada: "Apagada: solo corre al tocar «Completar fichas» en una ciudad.",
      semana: "Esta semana: 1 corrida · 12 propuestos · menos de 0,01\u00a0USD",
    });
    expect(leerAjusteSemanal(null)).toMatchObject({ activa: false, tope_usd: 0.5 });
  });
});

describe("Completar fichas: lo que dice la pantalla", () => {
  const corrida = {
    id: "F",
    tipo: "fichas" as const,
    ciudad: "san-luis-potosi",
    parametros: {},
    tope_usd: 0.5,
    gasto_usd: 0.0021,
    estado: "terminada" as const,
    creado_en: AHORA.toISOString(),
    inicio: AHORA.toISOString(),
    fin: AHORA.toISOString(),
    propuestas: 5,
    aceptadas: 0,
    rechazadas: 0,
    por_revisar: 5,
  };
  const resumen = {
    revisadas: 7,
    incompletas: 9,
    propuestas_por_campo: { foto: 1, portada: 2, descripcion: 1, instagram: 1 },
    sin_fuente: [{ tipo: "lugar", id: "x", nombre: "Casa del Viento", faltan: ["portada", "instagram"], motivo: "Sin fuente" }, { tipo: "otro", nombre: "sin id" }],
  };

  it("la línea de Corridas, la tarjeta del panel y el desglose por campo", () => {
    expect(detalleCorrida({ ...corrida, resumen }, AHORA)).toBe("Hoy, 12:00 pm · 7 fichas revisadas · 5 propuestos · 5 por revisar · 1 sin fuente · menos de 0,01 USD");
    expect(baseFichas({ estado: "terminada", resumen })).toEqual({ valor: 9, base: "fichas con fecha a las que les falta algo" });
    expect(baseFichas(null).valor).toBe(0);
    expect(textoPorCampo(informeFichas(resumen).porCampo)).toBe("1 foto · 2 portadas · 1 descripción · 1 Instagram");
    expect(textoFaltan(["portada", "instagram"])).toBe("Portada y Instagram");
  });
});
