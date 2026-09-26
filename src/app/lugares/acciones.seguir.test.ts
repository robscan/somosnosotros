import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarSeguimiento } from "./acciones";

const USUARIO = "00000000-0000-4000-8000-0000000000f1";
const LUGAR_ID = "00000000-0000-4000-8000-0000000000f2";

const m = vi.hoisted(() => ({
  sesion: vi.fn(),
  upsert: vi.fn(),
  borrar: vi.fn(),
  invalidar: vi.fn(),
  // `after` (OL-212, tercera vuelta): guarda el cuerpo sin ejecutarlo — a diferencia de otras pruebas de esta
  // pieza, aquí interesa comprobar que revalidar NO pasó todavía (la pantalla desde la que se sigue no se repinta
  // sola) y solo pasa al invocar el cuerpo guardado a mano, como si la respuesta ya hubiera salido.
  despues: vi.fn(),
}));
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

/**
 * cambiarSeguimiento (OL-212, tercera vuelta): el tercer parámetro `diferir` distingue quién llama.
 * - La ficha (Seguir.tsx, `cambiarSeguimiento.bind(null, lugarId)`) llama con dos argumentos: `diferir` queda en
 *   `false` por su valor por defecto, y la revalidación sigue exactamente como antes de esta pieza (su propio
 *   "N personas lo siguen", en la misma ruta, se ve al día en el mismo toque).
 * - Un renglón de lista (useSeguirEnLista.tsx, Inicio u otra pantalla con carriles) llama con `diferir: true`: el
 *   botón ya se ve al día solo (estado optimista), así que revalidar de inmediato solo repintaría de más la
 *   pantalla en la que ya se está — cualquier `revalidatePath` en la acción hace que Next rehaga y reenvíe toda
 *   la ruta actual en la misma respuesta, sin importar qué ruta se le pase (confirmado con captura de red real,
 *   bitácora 241 tercera vuelta). Con `after`, Perfil y la propia ficha del lugar se marcan igual de viejos para
 *   la próxima vez que se pidan, sin repintar la lista desde la que se guardó.
 */
describe("cambiarSeguimiento", () => {
  it("por defecto (ficha): revalida de inmediato, sin `after`", async () => {
    expect(await cambiarSeguimiento(LUGAR_ID, true)).toBe(true);
    expect(m.despues).not.toHaveBeenCalled();
    expect(m.invalidar).toHaveBeenCalledWith(`/lugares/${LUGAR_ID}`);
    expect(m.invalidar).toHaveBeenCalledWith("/perfil");
    expect(m.invalidar).toHaveBeenCalledWith(`/personas/${USUARIO}`);
    expect(m.invalidar).toHaveBeenCalledTimes(3);
  });
  it("diferir:false explícito (mismo resultado que el valor por defecto)", async () => {
    expect(await cambiarSeguimiento(LUGAR_ID, true, false)).toBe(true);
    expect(m.despues).not.toHaveBeenCalled();
    expect(m.invalidar).toHaveBeenCalledTimes(3);
  });
  it("diferir:true (lista): NO revalida de inmediato, revalida con `after`", async () => {
    expect(await cambiarSeguimiento(LUGAR_ID, true, true)).toBe(true);
    // Nada de revalidatePath todavía: la respuesta de la acción no repinta la lista desde la que se llamó.
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.despues).toHaveBeenCalledTimes(1);
    const cuerpo = m.despues.mock.calls[0][0] as () => void;
    // Al invocar el cuerpo aplazado (como si la respuesta ya hubiera salido), la invalidación sí ocurre: Perfil y
    // la ficha del lugar no se quedan viejos la próxima vez que se pidan.
    cuerpo();
    expect(m.invalidar).toHaveBeenCalledWith(`/lugares/${LUGAR_ID}`);
    expect(m.invalidar).toHaveBeenCalledWith("/perfil");
    expect(m.invalidar).toHaveBeenCalledWith(`/personas/${USUARIO}`);
    expect(m.invalidar).toHaveBeenCalledTimes(3);
  });
  it("si no se pudo guardar, no revalida ni de inmediato ni con `after`", async () => {
    m.upsert.mockResolvedValue({ error: { message: "fallo" } });
    expect(await cambiarSeguimiento(LUGAR_ID, true, true)).toBe(false);
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.despues).not.toHaveBeenCalled();
  });
});
