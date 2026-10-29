import { describe, expect, it, vi } from "vitest";
import { atenderVuelta, firmarEstado, leerEstado, secretoDeEstado, uriDeVuelta, urlDeConexion, VIGENCIA_ESTADO_MS, type Conexion, type EntradaVuelta } from "./conexion";
import { PERMISOS_PEDIDOS } from "./conexionEstado";

// OL-471 (bitácora 503): «Conectar Instagram». Todo inventado: nunca un token, un código ni un secreto de verdad.
const SECRETO = "secreto-inventado-para-pruebas-471";
const ADMIN = "11111111-2222-4333-8444-555555555555";
const OTRO = "99999999-2222-4333-8444-555555555555";
const AHORA = Date.parse("2026-10-28T18:00:00Z");
const PAGINA = "1374800000000471";
const IG = "17841400000000471";
const VUELTA = "https://somosnosotros.org/api/instagram/vuelta";
const T_CORTO = "EAAcortoinventado471xxxxxxxxxxxxxxxx";
const T_LARGO = "EAAlargoinventado471yyyyyyyyyyyyyyyy";
const T_PAGINA = "EAApaginainventado471zzzzzzzzzzzzzzz";
const TODOS = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish", "instagram_manage_insights", "business_management"];

describe("el state firmado", () => {
  it("lo que se firma se lee, con el id de quien conecta", () => {
    const e = firmarEstado(ADMIN, AHORA, SECRETO);
    expect(leerEstado(e, SECRETO, AHORA + 1000)).toEqual({ adminId: ADMIN });
    expect(e.split(".")).toHaveLength(4);
  });
  it("caduca a los 10 minutos", () => {
    const e = firmarEstado(ADMIN, AHORA, SECRETO);
    expect(leerEstado(e, SECRETO, AHORA + VIGENCIA_ESTADO_MS - 1)).not.toBeNull();
    expect(leerEstado(e, SECRETO, AHORA + VIGENCIA_ESTADO_MS)).toBeNull();
  });
  it("con otro secreto, otro admin o una firma tocada no vale", () => {
    const e = firmarEstado(ADMIN, AHORA, SECRETO);
    expect(leerEstado(e, "otro-secreto-inventado-471-aaaa", AHORA)).toBeNull();
    expect(leerEstado(e.replace(ADMIN, OTRO), SECRETO, AHORA)).toBeNull();
    const partes = e.split(".");
    expect(leerEstado([...partes.slice(0, 3), partes[3].slice(0, -1) + (partes[3].endsWith("A") ? "B" : "A")].join("."), SECRETO, AHORA)).toBeNull();
    // Alargar la caducidad rompe la firma.
    expect(leerEstado([partes[0], String(AHORA + 10 * VIGENCIA_ESTADO_MS), partes[2], partes[3]].join("."), SECRETO, AHORA)).toBeNull();
  });
  it("basura no vale", () => {
    for (const x of [null, "", "a.b.c", "a.b.c.d", `${ADMIN}.123.azar.firma`, "x".repeat(400)]) expect(leerEstado(x, SECRETO, AHORA)).toBeNull();
  });
  it("cada state es distinto (lleva azar)", () => {
    expect(firmarEstado(ADMIN, AHORA, SECRETO)).not.toBe(firmarEstado(ADMIN, AHORA, SECRETO));
  });
  it("el secreto sale de CRON_SECRET y tiene que ser largo", () => {
    expect(secretoDeEstado({ CRON_SECRET: SECRETO })).toBe(SECRETO);
    expect(secretoDeEstado({ CRON_SECRET: "corto" })).toBeNull();
    expect(secretoDeEstado({})).toBeNull();
  });
});

describe("la dirección del diálogo de Meta", () => {
  it("la vuelta es https del origen propio", () => {
    expect(uriDeVuelta("https://somosnosotros.org")).toBe(VUELTA);
    expect(uriDeVuelta("http://localhost:3000")).toBeNull();
    expect(uriDeVuelta("https://somosnosotros.org/otra")).toBeNull();
  });
  it("lleva la app, la vuelta, el state, el código como respuesta y los siete permisos", () => {
    const u = new URL(urlDeConexion("1459504089615420", VUELTA, "estado-inventado"));
    expect(u.origin + u.pathname).toBe("https://www.facebook.com/v23.0/dialog/oauth");
    expect(u.searchParams.get("client_id")).toBe("1459504089615420");
    expect(u.searchParams.get("redirect_uri")).toBe(VUELTA);
    expect(u.searchParams.get("state")).toBe("estado-inventado");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")?.split(",")).toEqual([...PERMISOS_PEDIDOS]);
    expect(u.searchParams.get("scope")).toBe("pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,instagram_manage_insights,business_management");
    expect(u.searchParams.has("client_secret")).toBe(false);
  });
});

/** Una Graph API falsa: código → token corto → largo → permisos → páginas. Apunta cada llamada (sin el secreto). */
function graphFalsa(o: { permisos?: string[]; paginas?: unknown[]; fallaEn?: string } = {}) {
  const llamadas: { ruta: string; q: URLSearchParams }[] = [];
  const responde = (cuerpo: unknown, ok = true) => new Response(JSON.stringify(cuerpo), { status: ok ? 200 : 400, headers: { "Content-Type": "application/json" } });
  const traer = vi.fn(async (url: string | URL | Request) => {
    const u = new URL(String(url));
    const ruta = u.pathname.replace(/^\/v[0-9.]+/, "");
    llamadas.push({ ruta, q: u.searchParams });
    if (o.fallaEn && ruta === o.fallaEn) return responde({ error: { code: 190, message: "inventado" } }, false);
    if (ruta === "/oauth/access_token") {
      if (u.searchParams.get("grant_type") === "fb_exchange_token") return u.searchParams.get("fb_exchange_token") === T_CORTO ? responde({ access_token: T_LARGO, token_type: "bearer", expires_in: 5183944 }) : responde({ error: { code: 190 } }, false);
      return u.searchParams.get("code") === "codigo-inventado" && u.searchParams.get("redirect_uri") === VUELTA ? responde({ access_token: T_CORTO, token_type: "bearer", expires_in: 3600 }) : responde({ error: { code: 100 } }, false);
    }
    if (u.searchParams.get("access_token") !== T_LARGO) return responde({ error: { code: 190 } }, false);
    if (ruta === "/me/permissions") return responde({ data: [...(o.permisos ?? TODOS).map((permission) => ({ permission, status: "granted" })), { permission: "ads_read", status: "declined" }] });
    if (ruta === "/me/accounts")
      return responde({
        data: o.paginas ?? [
          { id: "1000000000000001", name: "Otra página", access_token: "EAAotrapaginainventada471wwwwwwwww" },
          { id: PAGINA, name: "Somos Nosotrxs", access_token: T_PAGINA, instagram_business_account: { id: IG, username: "smsnstrsapp" } },
        ],
      });
    return responde({ error: { code: 100 } }, false);
  });
  return { traer: traer as unknown as typeof fetch, llamadas };
}

const CONFIG = { appId: "1459504089615420", appSecret: "secreto-de-app-inventado", paginaId: PAGINA, instagramId: IG, secreto: SECRETO };
function entrada(cambios: Partial<EntradaVuelta> = {}): EntradaVuelta {
  const estado = firmarEstado(ADMIN, AHORA, SECRETO);
  return { code: "codigo-inventado", state: estado, galleta: estado, errorMeta: null, adminId: ADMIN, ahora: AHORA + 30_000, redirectUri: VUELTA, ...cambios };
}

describe("la vuelta", () => {
  it("código → token → larga duración → permisos → páginas: guarda el token de la página con su estado", async () => {
    const g = graphFalsa();
    const guardadas: Conexion[] = [];
    const r = await atenderVuelta(entrada(), CONFIG, { traer: g.traer, guardar: async (c) => (guardadas.push(c), true) });
    expect(r).toBe("conectado");
    expect(g.llamadas.map((l) => l.ruta)).toEqual(["/oauth/access_token", "/oauth/access_token", "/me/permissions", "/me/accounts"]);
    expect(g.llamadas[0].q.get("client_secret")).toBe("secreto-de-app-inventado");
    expect(g.llamadas[1].q.get("grant_type")).toBe("fb_exchange_token");
    expect(g.llamadas[3].q.get("fields")).toContain("instagram_business_account");
    expect(guardadas).toEqual([
      { token: T_PAGINA, paginaId: PAGINA, paginaNombre: "Somos Nosotrxs", instagramId: IG, instagramUsuario: "smsnstrsapp", permisos: [...TODOS].sort(), conectadoPor: ADMIN },
    ]);
  });

  it("state inválido: sin galleta, otra galleta, caducado, de otra cuenta o tocado; no llama a Meta", async () => {
    const otro = firmarEstado(ADMIN, AHORA, SECRETO);
    const casos: Partial<EntradaVuelta>[] = [
      { galleta: null },
      { galleta: otro },
      { ahora: AHORA + VIGENCIA_ESTADO_MS + 1 },
      { adminId: OTRO },
      { state: "basura", galleta: "basura" },
      { code: null },
      { code: "con espacio" },
    ];
    for (const c of casos) {
      const g = graphFalsa();
      const guardar = vi.fn(async () => true);
      expect(await atenderVuelta(entrada(c), CONFIG, { traer: g.traer, guardar })).toBe("estado");
      expect(g.llamadas).toHaveLength(0);
      expect(guardar).not.toHaveBeenCalled();
    }
  });

  it("cancelado en Facebook", async () => {
    const g = graphFalsa();
    expect(await atenderVuelta(entrada({ code: null, errorMeta: "access_denied" }), CONFIG, { traer: g.traer, guardar: async () => true })).toBe("cancelado");
    expect(g.llamadas).toHaveLength(0);
  });

  it("sin el secreto de la app, la página o el secreto del state: falta configurar", async () => {
    for (const c of [{ appSecret: undefined }, { paginaId: undefined }, { paginaId: "no-es-numero" }, { secreto: null }]) {
      const g = graphFalsa();
      expect(await atenderVuelta(entrada(), { ...CONFIG, ...c }, { traer: g.traer, guardar: async () => true })).toBe("config");
      expect(g.llamadas).toHaveLength(0);
    }
  });

  it("página ausente: la cuenta que entró no administra la página", async () => {
    const g = graphFalsa({ paginas: [{ id: "1000000000000001", name: "Otra página", access_token: "EAAotrapaginainventada471wwwwwwwww" }] });
    const guardar = vi.fn(async () => true);
    expect(await atenderVuelta(entrada(), CONFIG, { traer: g.traer, guardar })).toBe("pagina");
    expect(guardar).not.toHaveBeenCalled();
  });

  it("la página sin su cuenta de Instagram, o con otra", async () => {
    for (const ig of [undefined, { id: "17841499999999999", username: "otra" }]) {
      const g = graphFalsa({ paginas: [{ id: PAGINA, name: "Somos Nosotrxs", access_token: T_PAGINA, instagram_business_account: ig }] });
      expect(await atenderVuelta(entrada(), CONFIG, { traer: g.traer, guardar: async () => true })).toBe("instagram");
    }
  });

  it("permiso faltante para publicar: no guarda nada", async () => {
    const g = graphFalsa({ permisos: TODOS.filter((p) => p !== "instagram_content_publish") });
    const guardar = vi.fn(async () => true);
    expect(await atenderVuelta(entrada(), CONFIG, { traer: g.traer, guardar })).toBe("permisos");
    expect(guardar).not.toHaveBeenCalled();
    expect(g.llamadas.map((l) => l.ruta)).not.toContain("/me/accounts");
  });

  it("sin el permiso de leer cuentas: se conecta igual y lo guarda sin él (la pantalla pide reconectar)", async () => {
    const g = graphFalsa({ permisos: TODOS.filter((p) => p !== "instagram_manage_insights") });
    const guardadas: Conexion[] = [];
    expect(await atenderVuelta(entrada(), CONFIG, { traer: g.traer, guardar: async (c) => (guardadas.push(c), true) })).toBe("conectado");
    expect(guardadas[0].permisos).not.toContain("instagram_manage_insights");
    expect(guardadas[0].permisos).not.toContain("ads_read");
  });

  it("Meta que falla en cualquier paso: «meta», sin guardar", async () => {
    for (const fallaEn of ["/oauth/access_token", "/me/permissions", "/me/accounts"]) {
      const g = graphFalsa({ fallaEn });
      const guardar = vi.fn(async () => true);
      expect(await atenderVuelta(entrada(), CONFIG, { traer: g.traer, guardar })).toBe("meta");
      expect(guardar).not.toHaveBeenCalled();
    }
    const caida = vi.fn(async () => {
      throw new Error("sin red");
    }) as unknown as typeof fetch;
    expect(await atenderVuelta(entrada(), CONFIG, { traer: caida, guardar: async () => true })).toBe("meta");
  });

  it("si no se pudo guardar, lo dice", async () => {
    expect(await atenderVuelta(entrada(), CONFIG, { traer: graphFalsa().traer, guardar: async () => false })).toBe("guardar");
    expect(await atenderVuelta(entrada(), CONFIG, { traer: graphFalsa().traer, guardar: async () => Promise.reject(new Error("x")) })).toBe("guardar");
  });

  it("nunca escribe un token, el código ni el secreto en la consola", async () => {
    const espias = (["log", "warn", "error", "info"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await atenderVuelta(entrada(), CONFIG, { traer: graphFalsa().traer, guardar: async () => true });
    await atenderVuelta(entrada(), CONFIG, { traer: graphFalsa({ fallaEn: "/me/accounts" }).traer, guardar: async () => true });
    const escrito = JSON.stringify(espias.flatMap((e) => e.mock.calls));
    for (const x of [T_CORTO, T_LARGO, T_PAGINA, "codigo-inventado", "secreto-de-app-inventado", SECRETO]) expect(escrito).not.toContain(x);
    espias.forEach((e) => e.mockRestore());
  });
});
