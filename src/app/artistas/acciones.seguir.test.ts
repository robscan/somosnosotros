import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarSeguimientoArtista } from "./acciones";

const USUARIO = "00000000-0000-4000-8000-0000000000f3";
const ARTISTA_ID = "00000000-0000-4000-8000-0000000000f4";

const m = vi.hoisted(() => ({ sesion: vi.fn(), upsert: vi.fn(), borrar: vi.fn(), invalidar: vi.fn(), despues: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.invalidar }));
vi.mock("next/server", () => ({ after: m.despues }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

function supabaseDoble() {
  return {
    from: vi.fn((tabla: string) => {
      if (tabla !== "seguimientos") throw new Error(`tabla inesperada: ${tabla}`);
      return { upsert: m.upsert, delete: m.borrar };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue({ supabase: supabaseDoble(), user: { id: USUARIO } });
  m.upsert.mockResolvedValue({ error: null });
  m.borrar.mockReturnValue({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) });
});

/** cambiarSeguimientoArtista (OL-212, tercera vuelta): mismo patrón y mismo motivo que cambiarSeguimiento (lugares/acciones.ts). */
describe("cambiarSeguimientoArtista", () => {
  it("por defecto (ficha): revalida de inmediato, sin `after`", async () => {
    expect(await cambiarSeguimientoArtista(ARTISTA_ID, true)).toBe(true);
    expect(m.despues).not.toHaveBeenCalled();
    expect(m.invalidar).toHaveBeenCalledWith(`/artistas/${ARTISTA_ID}`);
    expect(m.invalidar).toHaveBeenCalledTimes(3);
  });
  it("diferir:true (lista): NO revalida de inmediato, revalida con `after`", async () => {
    expect(await cambiarSeguimientoArtista(ARTISTA_ID, true, true)).toBe(true);
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.despues).toHaveBeenCalledTimes(1);
    const cuerpo = m.despues.mock.calls[0][0] as () => void;
    cuerpo();
    expect(m.invalidar).toHaveBeenCalledWith(`/artistas/${ARTISTA_ID}`);
    expect(m.invalidar).toHaveBeenCalledWith("/perfil");
    expect(m.invalidar).toHaveBeenCalledWith(`/personas/${USUARIO}`);
    expect(m.invalidar).toHaveBeenCalledTimes(3);
  });
  it("si no se pudo guardar, no revalida ni de inmediato ni con `after`", async () => {
    m.upsert.mockResolvedValue({ error: { message: "fallo" } });
    expect(await cambiarSeguimientoArtista(ARTISTA_ID, true, true)).toBe(false);
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.despues).not.toHaveBeenCalled();
  });
});
