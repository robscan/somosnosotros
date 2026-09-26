import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarAsistencia } from "./acciones";

const USUARIO = "00000000-0000-4000-8000-0000000000f5";
const EVENTO_ID = "00000000-0000-4000-8000-0000000000f6";

const m = vi.hoisted(() => ({ sesion: vi.fn(), upsert: vi.fn(), borrar: vi.fn(), invalidar: vi.fn(), despues: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.invalidar }));
vi.mock("next/server", () => ({ after: m.despues }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

function supabaseDoble() {
  return {
    from: vi.fn((tabla: string) => {
      if (tabla !== "asistencias") throw new Error(`tabla inesperada: ${tabla}`);
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

/**
 * cambiarAsistencia (OL-212, tercera vuelta): el tercer parámetro `diferir` distingue quién llama, mismo patrón
 * que cambiarSeguimiento/cambiarSeguimientoArtista.
 * - La ficha (Asistencia.tsx) llama con dos argumentos: `diferir` en `false` por defecto, revalida de inmediato
 *   como antes de esta pieza (incluida `/` — "la agenda muestra lo decidido... al volver de la ficha, al día").
 * - useAsistenciaEnLista.tsx (Inicio y cualquier otra lista) llama con `diferir: true`: el botón ya se ve al día
 *   solo; revalidar "/" de inmediato mientras se está EN Inicio es justo la causa de OL-212 (confirmado con
 *   captura de red real: la respuesta de la acción pasó de traer una nueva página de Inicio completa —23 808
 *   bytes en la reproducción de la bitácora 241, tercera vuelta— a solo su valor de regreso, unas decenas de
 *   bytes, sin cambiar el scroll ni reaparecer ningún esqueleto).
 */
describe("cambiarAsistencia", () => {
  it("por defecto (ficha): revalida de inmediato, sin `after`", async () => {
    expect(await cambiarAsistencia(EVENTO_ID, "voy")).toBe(true);
    expect(m.despues).not.toHaveBeenCalled();
    expect(m.invalidar).toHaveBeenCalledWith(`/eventos/${EVENTO_ID}`);
    expect(m.invalidar).toHaveBeenCalledWith("/");
    expect(m.invalidar).toHaveBeenCalledWith("/perfil");
    expect(m.invalidar).toHaveBeenCalledWith(`/personas/${USUARIO}`);
    expect(m.invalidar).toHaveBeenCalledTimes(4);
  });
  it("diferir:true (lista, Inicio incluida): NO revalida de inmediato — ni siquiera \"/\" —, revalida con `after`", async () => {
    expect(await cambiarAsistencia(EVENTO_ID, "voy", true)).toBe(true);
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.despues).toHaveBeenCalledTimes(1);
    const cuerpo = m.despues.mock.calls[0][0] as () => void;
    cuerpo();
    expect(m.invalidar).toHaveBeenCalledWith(`/eventos/${EVENTO_ID}`);
    expect(m.invalidar).toHaveBeenCalledWith("/");
    expect(m.invalidar).toHaveBeenCalledWith("/perfil");
    expect(m.invalidar).toHaveBeenCalledWith(`/personas/${USUARIO}`);
    expect(m.invalidar).toHaveBeenCalledTimes(4);
  });
  it("quitar asistencia (estado null) también respeta `diferir`", async () => {
    expect(await cambiarAsistencia(EVENTO_ID, null, true)).toBe(true);
    expect(m.borrar).toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.despues).toHaveBeenCalledTimes(1);
  });
  it("si no se pudo guardar, no revalida ni de inmediato ni con `after`", async () => {
    m.upsert.mockResolvedValue({ error: { message: "fallo" } });
    expect(await cambiarAsistencia(EVENTO_ID, "voy", true)).toBe(false);
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.despues).not.toHaveBeenCalled();
  });
});
