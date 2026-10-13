import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarGrafo } from "./acciones";

const m = vi.hoisted(() => ({ actual: vi.fn(), etiqueta: vi.fn(), ruta: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.actual }));
vi.mock("next/cache", () => ({ updateTag: m.etiqueta, revalidatePath: m.ruta, unstable_cache: (f: unknown) => f }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => ({}) }));

beforeEach(() => vi.clearAllMocks());

describe("actualizarGrafo", () => {
  it("con una cuenta de administración invalida la caché del grafo y la ruta", async () => {
    m.actual.mockResolvedValue({ perfil: { rol: "admin" } });
    expect(await actualizarGrafo()).toEqual({ ok: true });
    expect(m.etiqueta).toHaveBeenCalledWith("grafo-admin");
    expect(m.ruta).toHaveBeenCalledWith("/admin/grafo");
  });
  it.each([null, { perfil: { rol: "usuario" } }, { perfil: { rol: "editor" } }])("sin ser admin (%j) no hace nada", async (actual) => {
    m.actual.mockResolvedValue(actual);
    expect(await actualizarGrafo()).toEqual({ ok: false });
    expect(m.etiqueta).not.toHaveBeenCalled();
    expect(m.ruta).not.toHaveBeenCalled();
  });
});
