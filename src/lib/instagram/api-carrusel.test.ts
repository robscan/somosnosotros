import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicarCarrusel, type PedidoCarrusel } from "./api";

// OL-484 (bitácora 516): con un secreto de app inventado, como en producción (sin él, el resultado diría `sinPrueba`).
beforeEach(() => vi.stubEnv("META_APP_SECRET", "secreto-de-app-inventado-484"));
afterEach(() => vi.unstubAllEnvs());

/**
 * OL-464 (bitácora 496): el carrusel con un `fetch` falso. Nunca se llama a la API real. Cada imagen es un contenedor hijo (`is_carousel_item`,
 * con sus etiquetas), luego el carrusel (`media_type=CAROUSEL`, `children` en orden, el texto y la ubicación), FINISHED, publicar y el enlace.
 */
const TOKEN = "TOKEN-SECRETO-DE-PRUEBA";
const U = "17841400000000000";
const op = (traer: typeof fetch) => ({ traer, token: TOKEN, usuario: U, esperar: async () => {} });
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
const img = (n: number) => `https://x.supabase.co/storage/v1/object/public/fotos/lugares/u/instagram-${n}.jpg`;
const pedido: PedidoCarrusel = {
  imagenes: [
    { imagen: img(1), etiquetas: ["aether", "organiza"] },
    { imagen: img(2), etiquetas: ["aether", "martha"] },
    { imagen: img(3), etiquetas: [] },
  ],
  texto: "Cultura Mística #SanLuisPotosi",
  ubicacion: "108000000000001",
};

type Pedido = { metodo: string; ruta: string; params: URLSearchParams };
/** Un `fetch` que contesta los contenedores con ids 901, 902… y el carrusel con 950. `hijo` y `carrusel` cambian la respuesta. */
function falso(o: { hijo?: (p: URLSearchParams, n: number) => Response | null; carrusel?: (p: URLSearchParams) => Response | null; estado?: (id: string) => Response | null; publicar?: () => Response } = {}) {
  const pedidos: Pedido[] = [];
  let n = 0;
  const traer = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const metodo = init?.method ?? "GET";
    const params = metodo === "POST" ? new URLSearchParams(String(init!.body)) : u.searchParams;
    const ruta = u.pathname.replace(/^\/v[0-9.]+/, "");
    pedidos.push({ metodo, ruta, params });
    if (metodo === "POST" && ruta === `/${U}/media`) {
      if (params.get("media_type") === "CAROUSEL") return o.carrusel?.(params) ?? json({ id: "950" });
      n++;
      return o.hijo?.(params, n) ?? json({ id: String(900 + n) });
    }
    if (metodo === "GET" && /^\/9[0-9]{2}$/.test(ruta)) return o.estado?.(ruta.slice(1)) ?? json({ status_code: "FINISHED" });
    if (metodo === "POST" && ruta === `/${U}/media_publish`) return o.publicar?.() ?? json({ id: "17900000000000464" });
    if (metodo === "GET" && ruta === "/17900000000000464") return json({ permalink: "https://www.instagram.com/p/CARRUSEL/" });
    return json({ error: { code: 100 } }, 400);
  }) as unknown as typeof fetch;
  return { traer, pedidos };
}
const ruta = (p: Pedido) => `${p.metodo} ${p.ruta}`;

describe("publicarCarrusel", () => {
  it("un hijo por imagen con is_carousel_item y sus etiquetas; el carrusel con children en orden, texto y ubicación; publica y lee el enlace", async () => {
    const { traer, pedidos } = falso();
    const r = await publicarCarrusel(pedido, op(traer));
    expect(r).toEqual({ ok: true, mediaId: "17900000000000464", permalink: "https://www.instagram.com/p/CARRUSEL/", sinEtiquetas: false });
    expect(pedidos.map(ruta)).toEqual([
      `POST /${U}/media`,
      "GET /901",
      `POST /${U}/media`,
      "GET /902",
      `POST /${U}/media`,
      "GET /903",
      `POST /${U}/media`,
      "GET /950",
      `POST /${U}/media_publish`,
      "GET /17900000000000464",
    ]);
    const hijos = pedidos.filter((p) => p.params.get("is_carousel_item") === "true");
    expect(hijos.map((h) => h.params.get("image_url"))).toEqual([img(1), img(2), img(3)]);
    expect(hijos.map((h) => h.params.get("caption"))).toEqual([null, null, null]);
    expect(hijos.map((h) => h.params.get("location_id"))).toEqual([null, null, null]);
    expect(JSON.parse(hijos[0].params.get("user_tags")!)).toEqual([
      { username: "aether", x: 0.33, y: 0.9 },
      { username: "organiza", x: 0.67, y: 0.9 },
    ]);
    expect(JSON.parse(hijos[1].params.get("user_tags")!).map((t: { username: string }) => t.username)).toEqual(["aether", "martha"]);
    expect(hijos[2].params.get("user_tags")).toBeNull();
    const carrusel = pedidos[6].params;
    expect(carrusel.get("media_type")).toBe("CAROUSEL");
    expect(carrusel.get("children")).toBe("901,902,903");
    expect(carrusel.get("caption")).toBe(pedido.texto);
    expect(carrusel.get("location_id")).toBe(pedido.ubicacion);
    expect(carrusel.get("user_tags")).toBeNull();
    expect(carrusel.get("image_url")).toBeNull();
    expect(pedidos[8].params.get("creation_id")).toBe("950");
  });

  it("espera a cada hijo y al carrusel mientras están en proceso", async () => {
    const vistos = new Map<string, number>();
    const { traer } = falso({ estado: (id) => json({ status_code: (vistos.set(id, (vistos.get(id) ?? 0) + 1).get(id) ?? 0) < 2 ? "IN_PROGRESS" : "FINISHED" }) });
    const esperar = vi.fn(async () => {});
    expect((await publicarCarrusel(pedido, { ...op(traer), esperar })).ok).toBe(true);
    expect(esperar).toHaveBeenCalledTimes(4);
  });

  it("si Instagram rechaza las etiquetas de un hijo (cuenta privada), ese hijo va sin ellas y se dice; los demás llevan las suyas", async () => {
    const { traer, pedidos } = falso({ hijo: (p, n) => (n === 2 && p.get("user_tags") ? json({ error: { code: 100, error_subcode: 2207050 } }, 400) : null) });
    const r = await publicarCarrusel(pedido, op(traer));
    expect(r).toMatchObject({ ok: true, sinEtiquetas: true });
    const hijos = pedidos.filter((p) => p.params.get("is_carousel_item") === "true");
    expect(hijos.map((h) => !!h.params.get("user_tags"))).toEqual([true, true, false, false]);
    expect(pedidos.find((p) => p.params.get("media_type") === "CAROUSEL")!.params.get("children")).toBe("901,903,904");
  });

  it("si el carrusel no acepta la ubicación, va sin ella y se dice", async () => {
    let veces = 0;
    const { traer } = falso({ carrusel: (p) => (veces++ === 0 && p.get("location_id") ? json({ error: { code: 100 } }, 400) : null) });
    expect(await publicarCarrusel(pedido, op(traer))).toMatchObject({ ok: true, sinEtiquetas: true });
    expect(veces).toBe(2);
  });

  it("errores con su clave y sin publicar nada: permiso en un hijo, imagen que no sirve, cupo al publicar", async () => {
    const permiso = falso({ hijo: (_, n) => (n === 2 ? json({ error: { code: 190 } }, 400) : null) });
    expect(await publicarCarrusel(pedido, op(permiso.traer))).toEqual({ ok: false, error: "permiso" });
    expect(permiso.pedidos.some((p) => p.ruta.endsWith("media_publish"))).toBe(false);
    const imagen = falso({ estado: (id) => (id === "903" ? json({ status_code: "ERROR" }) : null) });
    expect(await publicarCarrusel(pedido, op(imagen.traer))).toEqual({ ok: false, error: "imagen" });
    expect(imagen.pedidos.some((p) => p.params.get("media_type") === "CAROUSEL")).toBe(false);
    const cupo = falso({ publicar: () => json({ error: { code: 4, error_subcode: 2207042 } }, 400) });
    expect(await publicarCarrusel(pedido, op(cupo.traer))).toEqual({ ok: false, error: "cupo" });
    const carrusel = falso({ carrusel: () => json({ error: { code: 10 } }, 400) });
    expect(await publicarCarrusel(pedido, op(carrusel.traer))).toEqual({ ok: false, error: "permiso" });
  });

  it("de 2 a 10 imágenes; sin token, permiso sin llamar; el token no sale en lo que devuelve", async () => {
    const { traer, pedidos } = falso();
    expect(await publicarCarrusel({ ...pedido, imagenes: pedido.imagenes.slice(0, 1) }, op(traer))).toEqual({ ok: false, error: "otro" });
    expect(await publicarCarrusel({ ...pedido, imagenes: Array.from({ length: 11 }, (_, i) => ({ imagen: img(i), etiquetas: [] })) }, op(traer))).toEqual({ ok: false, error: "otro" });
    expect(pedidos).toHaveLength(0);
    const sin = await publicarCarrusel(pedido, { traer, usuario: U, token: "" });
    expect(sin).toEqual({ ok: false, error: "permiso" });
    const r = await publicarCarrusel(pedido, op(traer));
    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });

  it("la red caída es «otro»", async () => {
    const traer = vi.fn(async () => {
      throw new Error("sin red");
    }) as unknown as typeof fetch;
    expect(await publicarCarrusel(pedido, op(traer))).toEqual({ ok: false, error: "otro" });
  });
});
