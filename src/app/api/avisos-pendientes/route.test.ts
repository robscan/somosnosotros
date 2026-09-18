import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
const m = vi.hoisted(() => ({ drenar: vi.fn() }));
vi.mock("@/lib/avisosWorker", () => ({ drenarAvisos: m.drenar }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("cron de avisos", () => {
  it("sin secreto o con credencial incorrecta no accede a la cola", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(new Request("https://example.invalid"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "prueba");
    expect((await GET(new Request("https://example.invalid", { headers: { authorization: "Bearer otro" } }))).status).toBe(401);
    expect(m.drenar).not.toHaveBeenCalled();
  });
  it("POST autorizado drena y programa recordatorios sin enviar desde SQL", async () => {
    vi.stubEnv("CRON_SECRET", "prueba"); m.drenar.mockResolvedValue({ enviados: 0 });
    const res = await POST(new Request("https://example.invalid", { method: "POST", headers: { authorization: "Bearer prueba" } }));
    expect(res.status).toBe(200); expect(m.drenar).toHaveBeenCalledWith({ ms: 40_000, recordatorios: true });
  });
  it("fallo de base devuelve 503, no exito silencioso", async () => {
    vi.stubEnv("CRON_SECRET", "prueba"); m.drenar.mockRejectedValue(new Error("secreto"));
    const res = await GET(new Request("https://example.invalid", { headers: { authorization: "Bearer prueba" } }));
    expect(res.status).toBe(503); expect(await res.text()).not.toContain("secreto");
  });
});
