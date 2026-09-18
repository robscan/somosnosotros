import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cuerpoCorreo, enviarCorreoIdempotente } from "./correo";

const fetchMock = vi.fn();
beforeEach(() => { vi.stubEnv("RESEND_API_KEY", "prueba-no-real"); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const body = cuerpoCorreo({ para: "local@example.invalid", asunto: "Evento", texto: "Texto", html: "<p>Texto</p>", bajaUrl: "https://example.invalid/baja" });

describe("correo idempotente", () => {
  it("conserva bytes y clave en ambos intentos", async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const signal = AbortSignal.timeout(1000);
    await enviarCorreoIdempotente(body, "aviso/123", signal);
    await enviarCorreoIdempotente(body, "aviso/123", signal);
    expect(fetchMock.mock.calls[0]).toEqual(fetchMock.mock.calls[1]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ body, signal, redirect: "error", headers: { "Idempotency-Key": "aviso/123" } });
  });
  it.each([429, 500, 503, 408])("reintenta %i", async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    expect((await enviarCorreoIdempotente(body, "k", AbortSignal.timeout(1000))).estado).toBe("reintentar");
  });
  it.each([400, 401, 403, 422])("no insiste ante %i permanente", async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    expect((await enviarCorreoIdempotente(body, "k", AbortSignal.timeout(1000))).estado).toBe("fallida");
  });
  it("distingue las dos clases de conflicto Resend", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ name: "concurrent_idempotent_requests" }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ name: "invalid_idempotent_request" }, { status: 409 }));
    expect((await enviarCorreoIdempotente(body, "k", AbortSignal.timeout(1000))).estado).toBe("reintentar");
    expect((await enviarCorreoIdempotente(body, "k", AbortSignal.timeout(1000))).estado).toBe("fallida");
  });
  it("abort/red no se marca entregado y no registra datos privados", async () => {
    fetchMock.mockRejectedValue(new Error("secreto"));
    expect(await enviarCorreoIdempotente(body, "k", AbortSignal.abort())).toEqual({ estado: "reintentar", codigo: "correo_red" });
  });
  it("sin configuracion no sale a red", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await enviarCorreoIdempotente(body, "k", AbortSignal.timeout(1000))).estado).toBe("reintentar");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
