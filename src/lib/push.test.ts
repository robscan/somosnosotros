import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enviarPushEndpoint } from "./push";
const m = vi.hoisted(() => ({ enviar: vi.fn(), cifrar: vi.fn() }));
vi.mock("web-push", () => ({ default: { generateRequestDetails: m.cifrar } }));
const s = { endpoint: "https://fcm.googleapis.com/fcm/send/local", keys: {
  p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url"),
} };
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "prueba"); vi.stubEnv("VAPID_PRIVATE_KEY", "prueba");
  m.enviar.mockReset().mockImplementation(async () => new Response(null, { status: 201 }));
  m.cifrar.mockReset().mockReturnValue({ headers: {}, body: Buffer.from("cifrado") }); vi.stubGlobal("fetch", m.enviar);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("push por endpoint", () => {
  it("valida antes de cualquier red", async () => {
    expect((await enviarPushEndpoint({ ...s, endpoint: "http://127.0.0.1" }, "{}", 30)).estado).toBe("fallida");
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("conserva payload, limita TTL y timeout", async () => {
    expect((await enviarPushEndpoint(s, '{"tag":"job"}', 6000)).estado).toBe("enviada");
    expect(m.cifrar).toHaveBeenCalledWith(s, '{"tag":"job"}', expect.objectContaining({ TTL: 3600 }));
    expect(m.enviar).toHaveBeenCalledWith(s.endpoint, expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal), body: new Uint8Array(Buffer.from("cifrado")) }));
  });
  it.each([404, 410, 400, 403])("%i es fallo permanente de este endpoint", async (statusCode) => {
    m.enviar.mockResolvedValue(new Response(null, { status: statusCode }));
    expect((await enviarPushEndpoint(s, "{}", 30)).estado).toBe("fallida");
  });
  it.each([429, 500, 503, 408])("%i se reintenta por endpoint", async (statusCode) => {
    m.enviar.mockResolvedValue(new Response(null, { status: statusCode }));
    expect((await enviarPushEndpoint(s, "{}", 30)).estado).toBe("reintentar");
  });
  it("red no registra endpoint ni claves", async () => {
    m.enviar.mockRejectedValue(new Error(s.endpoint));
    expect(await enviarPushEndpoint(s, "{}", 30)).toEqual({ estado: "reintentar", codigo: "push_red" });
  });
  it("sin VAPID no envia", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect((await enviarPushEndpoint(s, "{}", 30)).estado).toBe("reintentar");
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("cancela toda la peticion al vencer el plazo", async () => {
    m.enviar.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason));
    }));
    expect((await enviarPushEndpoint(s, "{}", 0.002)).estado).toBe("reintentar");
  });
  it("no envia si ya caduco", async () => {
    expect((await enviarPushEndpoint(s, "{}", 0)).estado).toBe("descartada");
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("respeta la cancelacion del deadline del worker", async () => {
    const controller = new AbortController(); controller.abort();
    m.enviar.mockImplementation(async (_url, options) => { options.signal.throwIfAborted(); });
    expect((await enviarPushEndpoint(s, "{}", 3600, controller.signal)).estado).toBe("reintentar");
  });
});
