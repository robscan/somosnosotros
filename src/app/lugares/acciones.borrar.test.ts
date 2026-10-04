import { beforeEach, describe, expect, it, vi } from "vitest";
import { borrarLugar } from "./acciones";

const m = vi.hoisted(() => ({ sesion: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc }, user: { id: "autora" } });
});

describe("borrarLugar: contrato atómico OL-257", () => {
  it("la base confirma el borrado antes de revalidar y redirigir", async () => {
    m.rpc.mockResolvedValue({ data: true, error: null });
    await expect(borrarLugar("lugar")).rejects.toThrow("REDIRECT:/borrado?que=lugar");
    expect(m.sesion).toHaveBeenCalledWith("/lugares/lugar");
    expect(m.rpc).toHaveBeenCalledWith("borrar_lugar", { p_lugar: "lugar" });
    expect(m.revalidate).toHaveBeenCalledWith("/");
  });
  it("explica la restricción de eventos ajenos sin exponer filas ni detalles SQL", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "23503", details: "dato privado" } });
    await expect(borrarLugar("lugar")).rejects.toThrow("REDIRECT:/lugares/lugar?error=tiene-eventos");
    expect(m.revalidate).not.toHaveBeenCalled();
  });
  it.each([
    { data: false, error: null },
    { data: null, error: { code: "42501" } },
    { data: null, error: { code: "55P03" } },
    { data: null, error: { code: "PGRST202" } },
  ])("un fallo o RPC sin migrar conserva la ficha y no anuncia éxito: %j", async resultado => {
    m.rpc.mockResolvedValue(resultado);
    await expect(borrarLugar("lugar")).rejects.toThrow("REDIRECT:/lugares/lugar?error=borrar");
    expect(m.revalidate).not.toHaveBeenCalled();
  });
});
