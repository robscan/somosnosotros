import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const m = vi.hoisted(() => ({ enviar: vi.fn(), marcar: vi.fn(), diagnostico: vi.fn(), filas: vi.fn(), eq: vi.fn(), evento: vi.fn() }));
vi.mock("@/lib/push", async (original) => ({
  huellaToken: (await original<typeof import("@/lib/push")>()).huellaToken,
  enviarPushApns: m.enviar, marcarDireccionMuerta: m.marcar, diagnosticoLlaveApns: m.diagnostico,
}));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => ({ from: (tabla: string) => ({ select: () => ({
  eq: (col: string, val: string) => { m.eq(col, val); return tabla === "eventos" ? { maybeSingle: m.evento } : { order: () => ({ limit: m.filas }) }; } }) }) }) }));

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
  it("OL-480: con evento_id manda el aviso de ese evento con la forma nueva (subtítulo, hilo, ?desde=aviso) y lo devuelve", async () => {
    const EVENTO = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
    const inicio = new Date(Date.now() + 3 * 86400000).toISOString();
    m.evento.mockResolvedValue({ data: { id: EVENTO, slug: "noche-de-danzon", titulo: "Noche de danzón", inicio, fin: null, zona: "America/Mexico_City",
      sitio_texto: null, sitio_reservado: false, descripcion: "Baile de salón con orquesta", visible: true,
      lugar: { nombre: "Teatro de la Paz", direccion: "Villerías 2", visible: true, privado: false } }, error: null });
    const json = await (await pedir({ usuario_id: PERSONA, evento_id: EVENTO })).json();
    expect(m.eq).toHaveBeenCalledWith("id", EVENTO);
    const aviso = JSON.parse(m.enviar.mock.calls[0][1] as string);
    expect(aviso).toEqual(json.aviso);
    expect(aviso).toMatchObject({ titulo: "Noche de danzón", subtitulo: "Nuevo en Teatro de la Paz", hilo: `evento-${EVENTO}`,
      url: "https://somosnosotros.org/eventos/noche-de-danzon?desde=aviso&tipo=nuevo" });
    expect(aviso.cuerpo).toMatch(/ · Baile de salón con orquesta$/);
  });
  it("OL-480: un evento oculto, pasado o con lugar privado no se manda", async () => {
    const EVENTO = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
    m.evento.mockResolvedValue({ data: { id: EVENTO, titulo: "x", inicio: new Date(Date.now() + 86400000).toISOString(), fin: null, zona: "America/Mexico_City",
      sitio_texto: null, sitio_reservado: false, descripcion: null, visible: true, lugar: { nombre: "Casa", direccion: null, visible: true, privado: true } }, error: null });
    expect((await pedir({ usuario_id: PERSONA, evento_id: EVENTO })).status).toBe(404);
    expect((await pedir({ usuario_id: PERSONA, evento_id: "no-es-uuid" })).status).toBe(400);
    expect(m.enviar).not.toHaveBeenCalled();
  });
});
