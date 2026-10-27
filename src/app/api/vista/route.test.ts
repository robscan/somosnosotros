import { beforeEach, describe, expect, it, vi } from "vitest";

const tareas: (() => unknown)[] = [];
const rpc = vi.fn();
let sub: string | undefined;
let conLlave = true;
vi.mock("next/server", () => ({ after: (f: () => unknown) => tareas.push(f) }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: async () => ({ auth: { getClaims: async () => ({ data: sub ? { claims: { sub } } : null }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => (conLlave ? { rpc } : null) }));

import { POST } from "./route";

const EVENTO = "11111111-1111-4111-8111-111111111111";
const PERSONA = "22222222-2222-4222-8222-222222222222";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const pedir = (cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  POST(new Request("https://somosnosotros.org/api/vista", { method: "POST", headers: { "sec-fetch-site": "same-origin", "user-agent": SAFARI, ...cabeceras }, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) }));
const correr = async () => { for (const t of tareas) await t(); };

beforeEach(() => {
  tareas.length = 0;
  rpc.mockReset();
  sub = undefined;
  conLlave = true;
});

describe("POST /api/vista (OL-459)", () => {
  it("sin cuenta y sin cookie: responde 204 al momento, le da su cookie de un día y cuenta después", async () => {
    const r = await pedir({ evento: EVENTO });
    expect(r.status).toBe(204);
    const cookie = r.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^sn_visita=[a-f0-9]{32}; Path=\/; Max-Age=86400; HttpOnly; SameSite=Lax; Secure$/);
    expect(rpc).not.toHaveBeenCalled(); // aún no: va en `after`
    await correr();
    expect(rpc).toHaveBeenCalledWith("contar_vista_evento", { p_evento: EVENTO, p_visitante: cookie.slice(10, 42), p_usuario: null });
  });
  it("con su cookie: cuenta con ella y no da otra", async () => {
    const r = await pedir({ evento: EVENTO }, { cookie: "otra=1; sn_visita=abcdefabcdefabcdefabcdefabcdef12" });
    expect(r.headers.get("set-cookie")).toBeNull();
    await correr();
    expect(rpc).toHaveBeenCalledWith("contar_vista_evento", { p_evento: EVENTO, p_visitante: "abcdefabcdefabcdefabcdefabcdef12", p_usuario: null });
  });
  it("con cuenta: su id solo para no contar doble (la base no lo guarda), sin cookie", async () => {
    sub = PERSONA;
    const r = await pedir({ evento: EVENTO }, { cookie: "sn_visita=abcdefabcdefabcdefabcdefabcdef12" });
    expect(r.headers.get("set-cookie")).toBeNull();
    await correr();
    expect(rpc).toHaveBeenCalledWith("contar_vista_evento", { p_evento: EVENTO, p_visitante: PERSONA, p_usuario: PERSONA });
  });
  it("una cookie que no dimos nosotros no vale: se da una nueva", async () => {
    const r = await pedir({ evento: EVENTO }, { cookie: "sn_visita=<script>" });
    expect(r.headers.get("set-cookie")).toMatch(/^sn_visita=[a-f0-9]{32};/);
  });
  it("robots evidentes: 204 y no cuenta", async () => {
    for (const ua of ["Googlebot/2.1 (+http://www.google.com/bot.html)", "facebookexternalhit/1.1", "WhatsApp/2.23", "curl/8.4.0", "Mozilla/5.0 HeadlessChrome/120", ""]) {
      expect((await pedir({ evento: EVENTO }, { "user-agent": ua })).status).toBe(204);
    }
    expect(tareas).toHaveLength(0);
  });
  it("desde otra página: 403; sin evento válido: 400; cuerpo grande: 413", async () => {
    expect((await pedir({ evento: EVENTO }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    for (const cuerpo of [{ evento: "no-es-uuid" }, {}, "no es json", "null"]) expect((await pedir(cuerpo)).status).toBe(400);
    expect((await pedir({ evento: EVENTO, relleno: "x".repeat(200) })).status).toBe(413);
    expect(tareas).toHaveLength(0);
  });
  it("OL-461: con la marca de origen de un enlace de la marca, cuenta con la red y el medio", async () => {
    const r = await pedir({ evento: EVENTO, origen: "facebook", medio: "post" }, { cookie: "sn_visita=abcdefabcdefabcdefabcdefabcdef12" });
    expect(r.status).toBe(204);
    await correr();
    expect(rpc).toHaveBeenCalledWith("contar_vista_evento_origen", { p_evento: EVENTO, p_visitante: "abcdefabcdefabcdefabcdefabcdef12", p_usuario: null, p_origen: "facebook", p_medio: "post" });
  });
  it("OL-461: un origen que no es de la lista cuenta como siempre, sin origen", async () => {
    await pedir({ evento: EVENTO, origen: "tiktok", medio: "post" }, { cookie: "sn_visita=abcdefabcdefabcdefabcdefabcdef12" });
    await correr();
    expect(rpc).toHaveBeenCalledWith("contar_vista_evento", { p_evento: EVENTO, p_visitante: "abcdefabcdefabcdefabcdefabcdef12", p_usuario: null });
  });
  it("OL-461: la red sin medio válido va sin medio", async () => {
    await pedir({ evento: EVENTO, origen: "instagram", medio: "<b>" }, { cookie: "sn_visita=abcdefabcdefabcdefabcdefabcdef12" });
    await correr();
    expect(rpc).toHaveBeenCalledWith("contar_vista_evento_origen", expect.objectContaining({ p_origen: "instagram", p_medio: null }));
  });
  it("sin la llave de servicio (local): responde igual y no cuenta", async () => {
    conLlave = false;
    expect((await pedir({ evento: EVENTO })).status).toBe(204);
    await correr();
    expect(rpc).not.toHaveBeenCalled();
  });
});
