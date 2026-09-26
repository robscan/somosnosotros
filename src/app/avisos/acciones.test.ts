import { beforeEach, describe, expect, it, vi } from "vitest";
import { elegirAvisos } from "./acciones";

const mocks = vi.hoisted(() => ({
  cliente: vi.fn(),
  usuario: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  invalidar: vi.fn(),
  // `after` (OL-212, tercera vuelta): igual que en perfil/acciones.test.ts — ejecuta el cuerpo al toque para no
  // romper una prueba que solo quiera ver el resultado final, y la prueba nueva comprueba que se llamó a `after`
  // (no a `revalidatePath` directo), la prueba de que la revalidación quedó aplazada.
  despues: vi.fn((cuerpo: () => void) => cuerpo()),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidar }));
vi.mock("next/server", () => ({ after: mocks.despues }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: mocks.cliente }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eq.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.usuario.mockResolvedValue({ data: { user: { id: "persona" } } });
  mocks.cliente.mockResolvedValue({ auth: { getUser: mocks.usuario }, from: () => ({ update: mocks.update }) });
});

/**
 * elegirAvisos: se llama tras el primer "Voy"/"Seguir" (la hoja ConsentimientoAvisos, en una ficha o en un
 * renglón de lista) y desde Mi perfil. Ninguno de los dos necesita que revalide de inmediato — la hoja ya avisa
 * lo decidido por `onDecidido` (arreglo de la primera vuelta de OL-212) y Mi perfil hace su propio
 * `router.refresh()` — así que desde la tercera vuelta la revalidación se aplaza con `after`.
 */
describe("elegirAvisos", () => {
  it("sin sesión, no guarda ni revalida", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: null } });
    expect(await elegirAvisos({ correo: false })).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.despues).not.toHaveBeenCalled();
  });
  it("guarda la elección de correo y marca avisos_preguntado", async () => {
    expect(await elegirAvisos({ correo: true })).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ avisos_preguntado: true, avisos_correo: true, avisos_correo_desde: expect.any(String) }));
    expect(mocks.eq).toHaveBeenCalledWith("id", "persona");
  });
  it("si falla el guardado, no revalida", async () => {
    mocks.eq.mockResolvedValue({ error: { message: "fallo" } });
    expect(await elegirAvisos({ correo: false })).toBe(false);
    expect(mocks.despues).not.toHaveBeenCalled();
  });
  it("OL-212 (tercera vuelta): revalida Perfil e Inicio con `after`, no de inmediato — revalidar aquí de una vez repintaría de más la pantalla desde la que se abrió la hoja (un carril de Inicio, otra lista, una ficha)", async () => {
    expect(await elegirAvisos({ correo: false })).toBe(true);
    expect(mocks.despues).toHaveBeenCalledTimes(1);
    expect(mocks.despues).toHaveBeenCalledWith(expect.any(Function));
    expect(mocks.invalidar).toHaveBeenCalledWith("/perfil");
    expect(mocks.invalidar).toHaveBeenCalledWith("/");
    expect(mocks.invalidar).toHaveBeenCalledTimes(2);
  });
});
