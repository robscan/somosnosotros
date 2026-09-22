import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
const m = vi.hoisted(() => ({ drenar: vi.fn(), drenarAdmin: vi.fn() }));
vi.mock("@/lib/avisosWorker", () => ({ drenarAvisos: m.drenar, drenarAvisosAdmin: m.drenarAdmin }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("cron de avisos", () => {
  it("sin secreto o con credencial incorrecta no accede a la cola", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(new Request("https://example.invalid"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "prueba");
    expect((await GET(new Request("https://example.invalid", { headers: { authorization: "Bearer otro" } }))).status).toBe(401);
    expect(m.drenar).not.toHaveBeenCalled();
    expect(m.drenarAdmin).not.toHaveBeenCalled();
  });
  it("POST autorizado drena y programa recordatorios sin enviar desde SQL; mismo cron drena tambien el aviso al admin (OL-115)", async () => {
    vi.stubEnv("CRON_SECRET", "prueba"); m.drenar.mockResolvedValue({ enviados: 0 }); m.drenarAdmin.mockResolvedValue({ enviados: 0 });
    const res = await POST(new Request("https://example.invalid", { method: "POST", headers: { authorization: "Bearer prueba" } }));
    expect(res.status).toBe(200); expect(m.drenar).toHaveBeenCalledWith({ ms: 40_000, recordatorios: true });
    expect(m.drenarAdmin).toHaveBeenCalledWith({ ms: 8_000 });
    expect((await res.json()).admin).toEqual({ enviados: 0 });
  });
  it("fallo de base devuelve 503, no exito silencioso", async () => {
    vi.stubEnv("CRON_SECRET", "prueba"); m.drenar.mockRejectedValue(new Error("secreto")); m.drenarAdmin.mockResolvedValue({ enviados: 0 });
    const res = await GET(new Request("https://example.invalid", { headers: { authorization: "Bearer prueba" } }));
    expect(res.status).toBe(503); expect(await res.text()).not.toContain("secreto");
  });
  it("un fallo del aviso al admin no tumba el aviso principal", async () => {
    vi.stubEnv("CRON_SECRET", "prueba"); m.drenar.mockResolvedValue({ enviados: 2 }); m.drenarAdmin.mockRejectedValue(new Error("cola admin caida"));
    const res = await POST(new Request("https://example.invalid", { method: "POST", headers: { authorization: "Bearer prueba" } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enviados).toBe(2);
    expect(json.admin).toEqual({ enviados: 0, error: true });
  });
});
