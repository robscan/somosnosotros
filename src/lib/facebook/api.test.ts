import { describe, expect, it, vi } from "vitest";
import { claveDeErrorFacebook, publicarEnPagina, type PedidoFacebook } from "./api";

/**
 * OL-461 (bitácora 493): el cliente de la página de Facebook con un `fetch` falso. Nunca se llama a la API real. Comprueba la publicación con
 * foto (foto → enlace), la historia (foto sin publicar → historia → enlace), cada error con su clave, el permiso que falta y que el token no
 * sale en lo que se devuelve.
 */
const TOKEN = "TOKEN-SECRETO-DE-PRUEBA";
const PAGINA = "1374817622385572";
const op = (traer: typeof fetch) => ({ traer, token: TOKEN, pagina: PAGINA });
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
const pedido: PedidoFacebook = { imagen: "https://x.supabase.co/storage/v1/object/public/fotos/lugares/u/instagram-1.jpg", texto: "Hola\n\nFicha del evento: https://somosnosotrxs.org/eventos/x", historia: false };
const POST_ID = `${PAGINA}_122100000000000461`;

/** Un `fetch` que contesta por ruta y guarda lo que se le pidió. */
function falso(rutas: Record<string, (params: URLSearchParams) => Response>) {
  const pedidos: { metodo: string; ruta: string; params: URLSearchParams; url: string }[] = [];
  const traer = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const params = init?.method === "POST" ? new URLSearchParams(String(init.body)) : u.searchParams;
    const ruta = u.pathname.replace(/^\/v[0-9.]+/, "");
    pedidos.push({ metodo: init?.method ?? "GET", ruta, params, url: String(url) });
    const r = rutas[`${init?.method ?? "GET"} ${ruta}`];
    return r ? r(params) : json({ error: { code: 100 } }, 400);
  }) as unknown as typeof fetch;
  return { traer, pedidos };
}
const exito = (extra: Record<string, (p: URLSearchParams) => Response> = {}) =>
  falso({
    [`POST /${PAGINA}/photos`]: (p) => (p.get("published") === "false" ? json({ id: "122100000000000999" }) : json({ id: "122100000000000998", post_id: POST_ID })),
    [`POST /${PAGINA}/photo_stories`]: () => json({ success: true, post_id: POST_ID }),
    [`GET /${POST_ID}`]: () => json({ id: POST_ID, permalink_url: `https://www.facebook.com/${PAGINA}/posts/122100000000000461` }),
    ...extra,
  });

describe("publicarEnPagina", () => {
  it("publicación con foto: url y message en /photos; lee el enlace de la publicación", async () => {
    const { traer, pedidos } = exito();
    const r = await publicarEnPagina(pedido, op(traer));
    expect(r).toEqual({ ok: true, postId: POST_ID, permalink: `https://www.facebook.com/${PAGINA}/posts/122100000000000461` });
    expect(pedidos.map((p) => `${p.metodo} ${p.ruta}`)).toEqual([`POST /${PAGINA}/photos`, `GET /${POST_ID}`]);
    expect(pedidos[0].params.get("url")).toBe(pedido.imagen);
    expect(pedidos[0].params.get("message")).toBe(pedido.texto);
    expect(pedidos[0].params.get("published")).toBeNull();
    expect(pedidos[1].params.get("fields")).toBe("permalink_url");
  });
  it("sin texto, la foto sola", async () => {
    const { traer, pedidos } = exito();
    expect((await publicarEnPagina({ ...pedido, texto: null }, op(traer))).ok).toBe(true);
    expect(pedidos[0].params.get("message")).toBeNull();
  });
  it("historia: la foto sin publicar, luego photo_stories con su id; sin texto", async () => {
    const { traer, pedidos } = exito();
    const r = await publicarEnPagina({ ...pedido, historia: true }, op(traer));
    expect(r).toMatchObject({ ok: true, postId: POST_ID });
    expect(pedidos.map((p) => `${p.metodo} ${p.ruta}`)).toEqual([`POST /${PAGINA}/photos`, `POST /${PAGINA}/photo_stories`, `GET /${POST_ID}`]);
    expect(pedidos[0].params.get("published")).toBe("false");
    expect(pedidos[0].params.get("message")).toBeNull();
    expect(pedidos[1].params.get("photo_id")).toBe("122100000000000999");
  });
  it("si no puede leer el enlace, queda publicada sin él", async () => {
    const { traer } = exito({ [`GET /${POST_ID}`]: () => json({ error: { code: 100 } }, 400) });
    expect(await publicarEnPagina(pedido, op(traer))).toEqual({ ok: true, postId: POST_ID, permalink: null });
  });
  it("un enlace que no es de Facebook no se devuelve", async () => {
    const { traer } = exito({ [`GET /${POST_ID}`]: () => json({ permalink_url: "https://otro.example/x" }) });
    expect(await publicarEnPagina(pedido, op(traer))).toMatchObject({ ok: true, permalink: null });
  });
  it.each([
    ["sin pages_manage_posts", { code: 200, message: "(#200) requires pages_manage_posts" }, "permiso"],
    ["token vencido", { code: 190 }, "permiso"],
    ["permiso de la app", { code: 10 }, "permiso"],
    ["imagen que no se pudo leer", { code: 324 }, "imagen"],
    ["límite de uso", { code: 32 }, "otro"],
    ["otra cosa", { code: 100 }, "otro"],
  ])("publicación, %s: no publica y dice su clave", async (_, error, clave) => {
    const { traer, pedidos } = falso({ [`POST /${PAGINA}/photos`]: () => json({ error }, 400) });
    expect(await publicarEnPagina(pedido, op(traer))).toEqual({ ok: false, error: clave });
    expect(pedidos).toHaveLength(1);
  });
  it("historia: si falla la foto no se intenta la historia; si falla la historia, su clave", async () => {
    const sinFoto = falso({ [`POST /${PAGINA}/photos`]: () => json({ error: { code: 200 } }, 403) });
    expect(await publicarEnPagina({ ...pedido, historia: true }, op(sinFoto.traer))).toEqual({ ok: false, error: "permiso" });
    expect(sinFoto.pedidos).toHaveLength(1);
    const sinHistoria = exito({ [`POST /${PAGINA}/photo_stories`]: () => json({ error: { code: 324 } }, 400) });
    expect(await publicarEnPagina({ ...pedido, historia: true }, op(sinHistoria.traer))).toEqual({ ok: false, error: "imagen" });
  });
  it("sin token o sin página (o una página que no es un número): permiso, sin llamar a Facebook", async () => {
    const { traer, pedidos } = exito();
    expect(await publicarEnPagina(pedido, { traer, token: "", pagina: PAGINA })).toEqual({ ok: false, error: "permiso" });
    expect(await publicarEnPagina(pedido, { traer, token: TOKEN, pagina: "" })).toEqual({ ok: false, error: "permiso" });
    expect(await publicarEnPagina(pedido, { traer, token: TOKEN, pagina: "somos.nosotrxs" })).toEqual({ ok: false, error: "permiso" });
    expect(pedidos).toHaveLength(0);
  });
  it("con la red caída: otro", async () => {
    const traer = vi.fn(async () => {
      throw new Error("sin red");
    }) as unknown as typeof fetch;
    expect(await publicarEnPagina(pedido, op(traer))).toEqual({ ok: false, error: "otro" });
  });
  it("un id raro en la respuesta no se toma por publicado", async () => {
    const { traer } = falso({ [`POST /${PAGINA}/photos`]: () => json({ id: "../../me" }) });
    expect(await publicarEnPagina(pedido, op(traer))).toEqual({ ok: false, error: "otro" });
  });
  it("el token va en la llamada y nunca en lo que se devuelve", async () => {
    const { traer, pedidos } = exito();
    const r = await publicarEnPagina(pedido, op(traer));
    expect(pedidos[0].params.get("access_token")).toBe(TOKEN);
    expect(JSON.stringify(r)).not.toContain(TOKEN);
    const malo = falso({ [`POST /${PAGINA}/photos`]: () => json({ error: { code: 190, message: `token ${TOKEN} vencido` } }, 400) });
    expect(JSON.stringify(await publicarEnPagina(pedido, op(malo.traer)))).not.toContain(TOKEN);
  });
  it("va a graph.facebook.com", async () => {
    const { traer, pedidos } = exito();
    await publicarEnPagina(pedido, op(traer));
    expect(pedidos[0].url).toMatch(/^https:\/\/graph\.facebook\.com\/v[0-9.]+\/1374817622385572\/photos$/);
  });
});

describe("claveDeErrorFacebook", () => {
  it("sin error dice otro; la app sin capacidad es permiso", () => {
    expect(claveDeErrorFacebook(undefined)).toBe("otro");
    expect(claveDeErrorFacebook({ code: 3 })).toBe("permiso");
    expect(claveDeErrorFacebook({ code: 299 })).toBe("permiso");
  });
});

describe("publicarEnPagina con varias fotos (OL-464, el espejo de un carrusel)", () => {
  const fotos = [1, 2, 3].map((n) => `https://x.supabase.co/storage/v1/object/public/fotos/lugares/u/instagram-${n}.jpg`);
  const MURO = `${PAGINA}_122100000000000464`;
  const varias = (extra: Record<string, (p: URLSearchParams) => Response> = {}) => {
    let n = 0;
    return falso({
      [`POST /${PAGINA}/photos`]: () => json({ id: `12210000000000100${++n}` }),
      [`POST /${PAGINA}/feed`]: () => json({ id: MURO }),
      [`GET /${MURO}`]: () => json({ id: MURO, permalink_url: `https://www.facebook.com/${PAGINA}/posts/122100000000000464` }),
      ...extra,
    });
  };

  it("cada foto sin publicar; luego una publicación en el muro con attached_media en orden y el texto; lee el enlace", async () => {
    const { traer, pedidos } = varias();
    const r = await publicarEnPagina({ ...pedido, imagenes: fotos }, op(traer));
    expect(r).toEqual({ ok: true, postId: MURO, permalink: `https://www.facebook.com/${PAGINA}/posts/122100000000000464` });
    expect(pedidos.map((p) => `${p.metodo} ${p.ruta}`)).toEqual([`POST /${PAGINA}/photos`, `POST /${PAGINA}/photos`, `POST /${PAGINA}/photos`, `POST /${PAGINA}/feed`, `GET /${MURO}`]);
    expect(pedidos.slice(0, 3).map((p) => [p.params.get("url"), p.params.get("published"), p.params.get("message")])).toEqual(fotos.map((f) => [f, "false", null]));
    const muro = pedidos[3].params;
    expect([0, 1, 2].map((i) => JSON.parse(muro.get(`attached_media[${i}]`)!))).toEqual([1, 2, 3].map((n) => ({ media_fbid: `12210000000000100${n}` })));
    expect(muro.get("attached_media[3]")).toBeNull();
    expect(muro.get("message")).toBe(pedido.texto);
  });

  it("una foto que falla no deja publicación; el muro sin permiso es «permiso»", async () => {
    const { traer, pedidos } = varias({ [`POST /${PAGINA}/photos`]: (p) => (p.get("url") === fotos[1] ? json({ error: { code: 324 } }, 400) : json({ id: "122100000000001001" })) });
    expect(await publicarEnPagina({ ...pedido, imagenes: fotos }, op(traer))).toEqual({ ok: false, error: "imagen" });
    expect(pedidos.some((p) => p.ruta.endsWith("/feed"))).toBe(false);
    const sinPermiso = varias({ [`POST /${PAGINA}/feed`]: () => json({ error: { code: 200 } }, 400) });
    expect(await publicarEnPagina({ ...pedido, imagenes: fotos }, op(sinPermiso.traer))).toEqual({ ok: false, error: "permiso" });
  });

  it("con una sola foto en la lista es la publicación de siempre (/photos con el texto)", async () => {
    const { traer, pedidos } = exito();
    await publicarEnPagina({ ...pedido, imagenes: [pedido.imagen] }, op(traer));
    expect(pedidos[0].params.get("message")).toBe(pedido.texto);
    expect(pedidos.some((p) => p.ruta.endsWith("/feed"))).toBe(false);
  });
});
