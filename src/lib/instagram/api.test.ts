import { describe, expect, it, vi } from "vitest";
import { claveDeError, cupo, etiquetasConPosicion, leerPagina, paginaDeEnlace, publicar, type Pedido } from "./api";

/**
 * OL-458 (bitácora 490): el cliente de la API de Instagram con un `fetch` falso. Nunca se llama a la API real. Comprueba el camino de una
 * publicación (contenedor → FINISHED → publicar → enlace), una historia, cada error con su clave, el reintento sin etiquetas, el cupo y que el
 * token no sale en lo que se devuelve.
 */
const TOKEN = "TOKEN-SECRETO-DE-PRUEBA";
const op = (traer: typeof fetch) => ({ traer, token: TOKEN, usuario: "17841400000000000", esperar: async () => {} });
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
const pedido: Pedido = { imagen: "https://x.supabase.co/storage/v1/object/public/fotos/lugares/u/instagram-1.jpg", texto: "Hola #SanLuisPotosi", etiquetas: ["teatro", "feleal"], ubicacion: "108000000000001", historia: false };

/** Un `fetch` que contesta por ruta y guarda lo que se le pidió. */
function falso(rutas: Record<string, (params: URLSearchParams) => Response>) {
  const pedidos: { metodo: string; ruta: string; params: URLSearchParams }[] = [];
  const traer = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const params = init?.method === "POST" ? new URLSearchParams(String(init.body)) : u.searchParams;
    const ruta = u.pathname.replace(/^\/v[0-9.]+/, "");
    pedidos.push({ metodo: init?.method ?? "GET", ruta, params });
    const r = rutas[`${init?.method ?? "GET"} ${ruta}`];
    return r ? r(params) : json({ error: { code: 100 } }, 400);
  }) as unknown as typeof fetch;
  return { traer, pedidos };
}
const exito = (extra: Record<string, (p: URLSearchParams) => Response> = {}) =>
  falso({
    "POST /17841400000000000/media": () => json({ id: "900" }),
    "GET /900": () => json({ status_code: "FINISHED", id: "900" }),
    "POST /17841400000000000/media_publish": () => json({ id: "17900000000000001" }),
    "GET /17900000000000001": () => json({ permalink: "https://www.instagram.com/p/ABC123/" }),
    ...extra,
  });

describe("publicar", () => {
  it("contenedor con imagen, texto, etiquetas y ubicación; espera FINISHED; publica y lee el enlace", async () => {
    const { traer, pedidos } = exito();
    const r = await publicar(pedido, op(traer));
    expect(r).toEqual({ ok: true, mediaId: "17900000000000001", permalink: "https://www.instagram.com/p/ABC123/", sinEtiquetas: false });
    const media = pedidos[0].params;
    expect(media.get("image_url")).toBe(pedido.imagen);
    expect(media.get("caption")).toBe("Hola #SanLuisPotosi");
    expect(media.get("location_id")).toBe("108000000000001");
    expect(JSON.parse(media.get("user_tags")!)).toEqual([{ username: "teatro", x: 0.33, y: 0.9 }, { username: "feleal", x: 0.67, y: 0.9 }]);
    expect(media.get("media_type")).toBeNull();
    expect(pedidos.map((p) => `${p.metodo} ${p.ruta}`)).toEqual(["POST /17841400000000000/media", "GET /900", "POST /17841400000000000/media_publish", "GET /17900000000000001"]);
    expect(pedidos[2].params.get("creation_id")).toBe("900");
  });
  it("espera mientras el contenedor está en proceso", async () => {
    let n = 0;
    const { traer } = exito({ "GET /900": () => json({ status_code: n++ < 2 ? "IN_PROGRESS" : "FINISHED" }) });
    const esperar = vi.fn(async () => {});
    expect((await publicar(pedido, { ...op(traer), esperar })).ok).toBe(true);
    expect(esperar).toHaveBeenCalledTimes(2);
  });
  it("una historia: STORIES, sin texto ni ubicación, etiquetas sin posición", async () => {
    const { traer, pedidos } = exito();
    await publicar({ ...pedido, historia: true }, op(traer));
    const media = pedidos[0].params;
    expect(media.get("media_type")).toBe("STORIES");
    expect(media.get("caption")).toBeNull();
    expect(media.get("location_id")).toBeNull();
    expect(JSON.parse(media.get("user_tags")!)).toEqual([{ username: "teatro" }, { username: "feleal" }]);
  });
  it("si Instagram rechaza el contenedor por otra cosa, lo intenta sin etiquetas ni ubicación y lo dice", async () => {
    let intentos = 0;
    const { traer, pedidos } = exito({ "POST /17841400000000000/media": (p) => (intentos++ === 0 && p.get("user_tags") ? json({ error: { code: 100, error_subcode: 2207025 } }, 400) : json({ id: "900" })) });
    const r = await publicar(pedido, op(traer));
    expect(r).toMatchObject({ ok: true, sinEtiquetas: true });
    expect(pedidos[1].params.get("user_tags")).toBeNull();
    expect(pedidos[1].params.get("location_id")).toBeNull();
  });
  it.each([
    ["permiso vencido", { code: 190 }, "permiso"],
    ["sin permiso", { code: 200 }, "permiso"],
    ["cupo del día", { code: 4, error_subcode: 2207042 }, "cupo"],
    ["imagen que no sirve", { code: 9004, error_subcode: 2207052 }, "imagen"],
  ])("%s: no publica y dice su clave", async (_, error, clave) => {
    const { traer, pedidos } = falso({ "POST /17841400000000000/media": () => json({ error }, 400) });
    const r = await publicar({ ...pedido, etiquetas: [], ubicacion: null }, op(traer));
    expect(r).toEqual({ ok: false, error: clave });
    expect(pedidos.some((p) => p.ruta.endsWith("media_publish"))).toBe(false);
  });
  it("un contenedor con ERROR es la imagen", async () => {
    const { traer } = exito({ "GET /900": () => json({ status_code: "ERROR" }) });
    expect(await publicar(pedido, op(traer))).toEqual({ ok: false, error: "imagen" });
  });
  it("sin token o sin cuenta: permiso, sin llamar a nadie", async () => {
    const { traer, pedidos } = exito();
    expect(await publicar(pedido, { traer, token: "", usuario: "" })).toEqual({ ok: false, error: "permiso" });
    expect(pedidos).toHaveLength(0);
  });
  it("una red caída: otro", async () => {
    const traer = vi.fn(async () => {
      throw new Error(`falló con ${TOKEN}`);
    }) as unknown as typeof fetch;
    const r = await publicar(pedido, op(traer));
    expect(r).toEqual({ ok: false, error: "otro" });
    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });
  it("el token va en la llamada y nunca en lo que se devuelve", async () => {
    const { traer, pedidos } = exito();
    const r = await publicar(pedido, op(traer));
    expect(pedidos[0].params.get("access_token")).toBe(TOKEN);
    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });
});

describe("cupo y páginas", () => {
  it("lee el cupo de las últimas 24 horas", async () => {
    const { traer } = falso({ "GET /17841400000000000/content_publishing_limit": () => json({ data: [{ quota_usage: 100, config: { quota_total: 100 } }] }) });
    expect(await cupo(op(traer))).toEqual({ usadas: 100, tope: 100 });
  });
  it("sin respuesta, null (no frena)", async () => {
    const { traer } = falso({});
    expect(await cupo(op(traer))).toBeNull();
  });
  it("las claves de los errores", () => {
    expect(claveDeError({ code: 102 })).toBe("permiso");
    expect(claveDeError({ code: 17 })).toBe("cupo");
    expect(claveDeError({ code: 100 })).toBe("otro");
    expect(claveDeError(undefined)).toBe("otro");
  });
  it("la página desde lo que se pega", () => {
    expect(paginaDeEnlace("108000000000001")).toBe("108000000000001");
    expect(paginaDeEnlace("https://www.facebook.com/OaxacaMx/")).toBe("OaxacaMx");
    expect(paginaDeEnlace("facebook.com/profile.php?id=100064000000000")).toBe("100064000000000");
    expect(paginaDeEnlace("https://www.facebook.com/Teatro-de-la-Paz-108000000000002")).toBe("108000000000002");
    expect(paginaDeEnlace("https://instagram.com/x")).toBeNull();
    expect(paginaDeEnlace("hola")).toBeNull();
  });
  it("una página sin ubicación no sirve", async () => {
    const { traer } = falso({ "GET /OaxacaMx": () => json({ id: "108000000000001", name: "Oaxaca" }) });
    expect(await leerPagina("OaxacaMx", op(traer))).toBeNull();
    const { traer: con } = falso({ "GET /OaxacaMx": () => json({ id: "108000000000001", name: "Oaxaca, Oaxaca", location: { city: "Oaxaca" } }) });
    expect(await leerPagina("OaxacaMx", op(con))).toEqual({ id: "108000000000001", nombre: "Oaxaca, Oaxaca" });
  });
  it("la API local de pruebas solo vale en 127.0.0.1; cualquier otra va a Facebook", async () => {
    const urls: string[] = [];
    const traer = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return json({});
    }) as unknown as typeof fetch;
    vi.stubEnv("INSTAGRAM_API_URL", "https://otro.example/graph");
    await cupo(op(traer));
    vi.stubEnv("INSTAGRAM_API_URL", "http://127.0.0.1:8899/graph");
    await cupo(op(traer));
    vi.unstubAllEnvs();
    expect(urls[0].startsWith("https://graph.facebook.com/v23.0/")).toBe(true);
    expect(urls[1].startsWith("http://127.0.0.1:8899/graph/v23.0/")).toBe(true);
  });
  it("las etiquetas de una imagen, repartidas abajo", () => {
    expect(etiquetasConPosicion(["a"], false)).toEqual([{ username: "a", x: 0.5, y: 0.9 }]);
  });
  it("con más de 10 (un festival, OL-463), en dos alturas para que no se encimen; todas dentro de la foto", () => {
    const veinte = etiquetasConPosicion(Array.from({ length: 20 }, (_, i) => `u${i}`), false);
    expect(veinte.map((e) => e.y)).toEqual(Array.from({ length: 20 }, (_, i) => (i % 2 ? 0.94 : 0.84)));
    expect(new Set(veinte.map((e) => e.x)).size).toBe(20);
    expect(veinte.every((e) => e.x! > 0 && e.x! < 1)).toBe(true);
  });
});

describe("coautores (OL-479)", () => {
  it("el artista va como coautor en `collaborators`; nunca en una historia", async () => {
    const { traer, pedidos } = exito();
    const r = await publicar({ ...pedido, coautores: ["valeriaquiroz"] }, op(traer));
    expect(r).toEqual({ ok: true, mediaId: "17900000000000001", permalink: "https://www.instagram.com/p/ABC123/", sinEtiquetas: false, sinCoautor: false });
    expect(JSON.parse(pedidos[0].params.get("collaborators")!)).toEqual(["valeriaquiroz"]);
    const h = exito();
    await publicar({ ...pedido, historia: true, coautores: ["valeriaquiroz"] }, op(h.traer));
    expect(h.pedidos[0].params.get("collaborators")).toBeNull();
  });
  it("si Instagram no acepta al coautor (no es cuenta profesional), sale sin él, con sus etiquetas, y se dice", async () => {
    const { traer, pedidos } = exito({ "POST /17841400000000000/media": (p) => (p.get("collaborators") ? json({ error: { code: 100, error_subcode: 2207051 } }, 400) : json({ id: "900" })) });
    const r = await publicar({ ...pedido, coautores: ["personal"] }, op(traer));
    expect(r).toMatchObject({ ok: true, sinEtiquetas: false, sinCoautor: true });
    expect(pedidos[1].params.get("user_tags")).not.toBeNull();
    expect(pedidos[1].params.get("collaborators")).toBeNull();
  });
  it("el permiso no se reintenta sin coautor", async () => {
    const { traer, pedidos } = exito({ "POST /17841400000000000/media": () => json({ error: { code: 190 } }, 400) });
    expect(await publicar({ ...pedido, coautores: ["x"] }, op(traer))).toEqual({ ok: false, error: "permiso" });
    expect(pedidos).toHaveLength(1);
  });
});
