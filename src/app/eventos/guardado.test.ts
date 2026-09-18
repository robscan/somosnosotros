import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarEvento, crearEvento } from "./acciones";

const m = vi.hoisted(() => ({ rpc: vi.fn(), sesion: vi.fn(), after: vi.fn(), invalidar: vi.fn(), redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.invalidar }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));
vi.mock("@/lib/avisos", () => ({ avisarCambioEvento: vi.fn(), avisarNuevoEvento: vi.fn() }));
vi.mock("@/lib/cartel", () => ({ leerCartel: vi.fn() }));

const ID = "00000000-0000-4000-8000-000000000001";
const ANTERIOR = "00000000-0000-4000-8000-000000000002";
function formulario() {
  const fd = new FormData();
  fd.set("operacion", ID);
  fd.set("revision", "2030-09-01T12:00:00Z");
  for (const [k, v] of Object.entries({ modo_sitio: "otro", sitio_texto: "Plaza de prueba", titulo: "Evento", inicio: "2030-10-01T19:00", gratis: "si", quien: JSON.stringify([{ nombre: "Trio de prueba" }]) })) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc }, user: { id: ID } });
  m.rpc.mockResolvedValue({ data: { id: ID, artistas: [ID], artistas_anteriores: [ANTERIOR], lugar_anterior: ANTERIOR, cambio: "donde" }, error: null });
  m.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe("guardado completo del evento", () => {
  it("publica con una sola RPC, sin escrituras parciales separadas", async () => {
    await expect(crearEvento(null, formulario())).rejects.toThrow("REDIRECT");
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_completo", expect.objectContaining({
      p_evento: null, p_privado: null, p_datos: expect.objectContaining({ titulo: "Evento" }),
      p_quien: [expect.objectContaining({ nombre: "Trio de prueba" })],
    }));
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.redirect).toHaveBeenCalledWith(`/eventos/${ID}?nuevo=1`, "replace");
  });

  it("un fallo de cualquier parte no confirma, no avisa ni redirige", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "23514" } });
    expect((await crearEvento(null, formulario())).ok).toBe(false);
    expect(m.after).not.toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.redirect).not.toHaveBeenCalled();
  });

  it("editar no devuelve exito si el guardado atomico falla", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await actualizarEvento(ID, null, formulario())).ok).toBe(false);
    expect(m.after).not.toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
  });

  it("edita e invalida tanto artistas/lugar retirados como los actuales", async () => {
    expect((await actualizarEvento(ID, null, formulario())).ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.invalidar).toHaveBeenCalledWith(`/artistas/${ANTERIOR}`);
    expect(m.invalidar).toHaveBeenCalledWith(`/artistas/${ID}`);
    expect(m.invalidar).toHaveBeenCalledWith(`/lugares/${ANTERIOR}`);
    expect(m.after).toHaveBeenCalledTimes(1);
  });

  it("la validacion impide llamar a la base con un formulario incompleto", async () => {
    const fd = formulario();
    fd.set("titulo", "");
    expect((await crearEvento(null, fd)).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("un conflicto no avisa ni confirma el guardado", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    expect(await actualizarEvento(ID, null, formulario())).toEqual(expect.objectContaining({ ok: false, general: expect.stringContaining("cambió mientras") }));
    expect(m.after).not.toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_completo", expect.objectContaining({ p_revision: "2030-09-01T12:00:00Z" }));
  });

  it("una pantalla antigua sin revision no sobreescribe el evento", async () => {
    const fd = formulario();
    fd.delete("revision");
    expect((await actualizarEvento(ID, null, fd)).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("recuperar un alta confirmada no programa otro aviso", async () => {
    m.rpc.mockResolvedValue({ data: { id: ID, artistas: [], repetido: true }, error: null });
    await expect(crearEvento(null, formulario())).rejects.toThrow("REDIRECT");
    expect(m.after).not.toHaveBeenCalled();
    expect(m.redirect).toHaveBeenCalledWith(`/eventos/${ID}?nuevo=1`, "replace");
  });

  it("no guarda sin una clave valida de operacion", async () => {
    const fd = formulario();
    fd.delete("operacion");
    expect((await crearEvento(null, fd)).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
