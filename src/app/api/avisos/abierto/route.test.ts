import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const m = vi.hoisted(() => ({ rpc: vi.fn(), sinBase: false }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => (m.sinBase ? null : { rpc: (...a: unknown[]) => { m.rpc(...a); return { abortSignal: async () => ({ error: null }) }; } }) }));

const pedir = (cuerpo: unknown, sitio: string | null = "same-origin") => POST(new Request("https://somosnosotros.org/api/avisos/abierto", {
  method: "POST", headers: { "content-type": "application/json", ...(sitio ? { "sec-fetch-site": sitio } : {}) }, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) }));

afterEach(() => { vi.clearAllMocks(); m.sinBase = false; });

describe("POST /api/avisos/abierto (OL-480)", () => {
  it("cuenta un tipo de la lista con la llave de servicio y no pide ni guarda nada más", async () => {
    const r = await pedir({ tipo: "recordatorio" });
    expect(r.status).toBe(204);
    expect(m.rpc).toHaveBeenCalledWith("avisos_contar_abierto", { p_tipo: "recordatorio" });
  });
  it("otra página no puede contar; un tipo fuera de la lista o un cuerpo raro, tampoco", async () => {
    expect((await pedir({ tipo: "nuevo" }, "cross-site")).status).toBe(403);
    expect((await pedir({ tipo: "nuevo" }, null)).status).toBe(403); // OL-485: sin la cabecera (curl, un programa), tampoco
    expect((await pedir({ tipo: "nuevo" }, "none")).status).toBe(403);
    expect((await pedir({ tipo: "fulano" })).status).toBe(400);
    expect((await pedir("no es json")).status).toBe(400);
    expect((await pedir({ tipo: "nuevo", relleno: "x".repeat(300) })).status).toBe(413);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("sin base configurada responde igual y no cuenta", async () => {
    m.sinBase = true;
    expect((await pedir({ tipo: "nuevo" })).status).toBe(204);
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
