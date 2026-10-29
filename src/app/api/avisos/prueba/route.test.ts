import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const m = vi.hoisted(() => ({ enviar: vi.fn(), marcar: vi.fn(), diagnostico: vi.fn(), filas: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/push", async (original) => ({
  huellaToken: (await original<typeof import("@/lib/push")>()).huellaToken,
  enviarPushApns: m.enviar, marcarDireccionMuerta: m.marcar, diagnosticoLlaveApns: m.diagnostico,
}));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => ({ from: () => ({ select: () => ({
  eq: (col: string, val: string) => { m.eq(col, val); return { order: () => ({ limit: m.filas }) }; } }) }) }) }));

const PERSONA = "0b6f2a54-8c1e-4c55-9d5e-1f0a7b3c2d41";
const VIVO = "a".repeat(64), MUERTO = "b".repeat(64);
const pedir = (cuerpo: unknown, secreto = "prueba") => POST(new Request("https://example.invalid/api/avisos/prueba", {
  method: "POST", headers: { authorization: `Bearer ${secreto}`, "content-type": "application/json" }, body: JSON.stringify(cuerpo) }));

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "prueba");
  m.diagnostico.mockReturnValue({ keyId: "ok", llave: "pem_escapada", legible: true, jwt: "ok" });
  m.filas.mockResolvedValue({ data: [
    { token: VIVO, entorno: "produccion", muerta_en: null, actualizado_en: "2026-10-29T10:00:00Z" },
    { token: MUERTO, entorno: "produccion", muerta_en: null, actualizado_en: "2026-09-26T10:00:00Z" },
  ], error: null });
  m.enviar.mockImplementation(async (s: { token: string }) => s.token === VIVO
    ? { estado: "enviada", codigo: "aceptado" } : { estado: "fallida", codigo: "apns_410_unregistered" });
  m.marcar.mockImplementation(async (_s: unknown, r: { codigo: string }) => r.codigo.startsWith("apns_410"));
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("prueba de humo de los avisos a la app (OL-476)", () => {
  it("sin el secreto, nada", async () => {
    expect((await pedir({ usuario_id: PERSONA }, "otro")).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await pedir({ usuario_id: PERSONA }, "")).status).toBe(401);
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("pide un id de persona válido", async () => {
    expect((await pedir({})).status).toBe(400);
    expect((await pedir({ usuario_id: "no-es-uuid" })).status).toBe(400);
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("manda UN aviso «Prueba de avisos · <hora>» a cada teléfono y devuelve el código por teléfono, sin tokens", async () => {
    const res = await pedir({ usuario_id: PERSONA });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(m.eq).toHaveBeenCalledWith("usuario_id", PERSONA);
    expect(m.enviar).toHaveBeenCalledTimes(2);
    const aviso = JSON.parse(m.enviar.mock.calls[0][1] as string);
    expect(aviso.titulo).toMatch(/^Prueba de avisos · \d{2}:\d{2}$/);
    expect(json.apns).toEqual({ keyId: "ok", llave: "pem_escapada", legible: true, jwt: "ok" });
    expect(json.dispositivos).toEqual([
      expect.objectContaining({ entorno: "produccion", estado: "enviada", codigo: "aceptado", marcada_muerta: false, huella: expect.stringMatching(/^[0-9a-f]{8}$/) }),
      expect.objectContaining({ estado: "fallida", codigo: "apns_410_unregistered", marcada_muerta: true }),
    ]);
    const texto = JSON.stringify(json);
    expect(texto).not.toContain(VIVO);
    expect(texto).not.toContain(MUERTO);
  });
  it("con la llave ilegible lo dice en apns y en el código de cada teléfono", async () => {
    m.diagnostico.mockReturnValue({ keyId: "ok", llave: "otra", legible: false, jwt: "apns_llave" });
    m.enviar.mockResolvedValue({ estado: "fallida", codigo: "apns_llave" });
    const json = await (await pedir({ usuario_id: PERSONA })).json();
    expect(json.apns.jwt).toBe("apns_llave");
    expect(json.dispositivos.map((d: { codigo: string }) => d.codigo)).toEqual(["apns_llave", "apns_llave"]);
  });
});
