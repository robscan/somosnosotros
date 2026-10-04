import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const m = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: m.admin }));
const request = (token = "prueba") => new Request("https://example.invalid/api/purgar-sitios-privados", {
  headers: { authorization: `Bearer ${token}` },
});
beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "prueba");
  m.admin.mockReturnValue({ rpc: m.rpc });
  m.rpc.mockReturnValue({ abortSignal: m.abortSignal });
  m.abortSignal.mockResolvedValue({ data: 0, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("purga de direcciones reservadas", () => {
  it("sin secreto, sin token o con token incorrecto no usa el cliente privilegiado", async () => {
    expect((await GET(request("incorrecto"))).status).toBe(401);
    expect((await GET(new Request("https://example.invalid"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request())).status).toBe(401);
    expect(m.admin).not.toHaveBeenCalled();
  });
  it("sin configuración de servicio falla sin exponer detalles", async () => {
    m.admin.mockReturnValue(null);
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "purga_no_disponible", eliminadas: 0 });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("drena lotes acotados; la base determina la fecha y solo vuelve un contador", async () => {
    m.abortSignal.mockResolvedValueOnce({ data: 500, error: null }).mockResolvedValueOnce({ data: 2, error: null });
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, eliminadas: 502 });
    expect(m.rpc.mock.calls).toEqual([
      ["purgar_sitios_privados", { p_limite: 500 }],
      ["purgar_sitios_privados", { p_limite: 500 }],
    ]);
    expect(m.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it("repetir sin copias vencidas devuelve cero", async () => {
    expect(await (await GET(request())).json()).toEqual({ ok: true, eliminadas: 0 });
    expect(m.rpc).toHaveBeenCalledTimes(1);
  });
  it.each([null, "1", -1, 501, 1.5])("rechaza un contador inválido: %s", async data => {
    m.abortSignal.mockResolvedValue({ data, error: null });
    expect((await GET(request())).status).toBe(503);
  });
  it("el error SQL no se filtra ni se presenta como éxito", async () => {
    m.abortSignal.mockResolvedValue({ data: null, error: { message: "dirección secreta" } });
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("secreta");
  });
  it("un fallo/timeout conserva el contador ya confirmado sin exponer el error", async () => {
    m.abortSignal.mockResolvedValueOnce({ data: 500, error: null }).mockRejectedValueOnce(new Error("llave secreta"));
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "purga_no_disponible", eliminadas: 500 });
  });
  it("avisa si agota el máximo de lotes, en lugar de seguir indefinidamente", async () => {
    m.abortSignal.mockResolvedValue({ data: 500, error: null });
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "purga_limite_de_lotes", eliminadas: 5000 });
    expect(m.rpc).toHaveBeenCalledTimes(10);
  });
});
