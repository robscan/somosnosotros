import { beforeEach, expect, it, vi } from "vitest";
import { borrarMiCuenta } from "./acciones";

// OL-512: borrar la cuenta borra antes sus fotos de perfil (`fotos/perfiles/<id>/`) con la propia sesión; si no se pueden, la cuenta se borra igual.
const m = vi.hoisted(() => ({
  orden: [] as string[], listar: vi.fn(), quitar: vi.fn(), rpc: vi.fn(), salir: vi.fn(), medir: vi.fn(), revalidar: vi.fn(),
  redirigir: vi.fn((ruta: string) => {
    throw new Error(`redirect:${ruta}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("next/navigation", () => ({ redirect: m.redirigir }));
vi.mock("next/server", () => ({ after: (f: () => void) => f() }));
vi.mock("@/lib/medirServidor", () => ({ medirServidor: m.medir }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteServidor: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "persona-1" } } }), signOut: m.salir },
    storage: { from: (cubo: string) => ({ list: (carpeta: string, o: unknown) => m.listar(cubo, carpeta, o), remove: (rutas: string[]) => m.quitar(cubo, rutas) }) },
    rpc: m.rpc,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  m.orden.length = 0;
  m.listar.mockImplementation(async () => {
    m.orden.push("listar");
    return { data: [{ id: "a", name: "foto-1.jpg" }, { id: "b", name: "foto-2.jpg" }, { id: null, name: "subcarpeta" }], error: null };
  });
  m.quitar.mockImplementation(async () => {
    m.orden.push("quitar");
    return { error: null };
  });
  m.rpc.mockImplementation(async () => {
    m.orden.push("rpc");
    return { error: null };
  });
});

const borrar = () => borrarMiCuenta().catch((e: Error) => e.message);

it("borra las fotos de su carpeta antes de borrar la cuenta y lo anota", async () => {
  expect(await borrar()).toBe("redirect:/?cuenta=borrada");
  expect(m.listar).toHaveBeenCalledWith("fotos", "perfiles/persona-1", { limit: 1000 });
  expect(m.quitar).toHaveBeenCalledWith("fotos", ["perfiles/persona-1/foto-1.jpg", "perfiles/persona-1/foto-2.jpg"]);
  expect(m.orden).toEqual(["listar", "quitar", "rpc"]);
  expect(m.medir).toHaveBeenCalledWith("cuenta_borrada", { fotos: "borradas" });
});

it("sin fotos no borra nada y la cuenta se borra", async () => {
  m.listar.mockResolvedValueOnce({ data: [], error: null });
  expect(await borrar()).toBe("redirect:/?cuenta=borrada");
  expect(m.quitar).not.toHaveBeenCalled();
  expect(m.medir).toHaveBeenCalledWith("cuenta_borrada", { fotos: "sin_fotos" });
});

it.each([
  ["no se pueden listar", () => m.listar.mockResolvedValueOnce({ data: null, error: { message: "x" } })],
  ["no se pueden quitar", () => m.quitar.mockResolvedValueOnce({ error: { message: "x" } })],
  ["Storage lanza", () => m.listar.mockRejectedValueOnce(new Error("red"))],
])("si %s, la cuenta se borra igual y queda anotado", async (_caso, preparar) => {
  const errorConsola = vi.spyOn(console, "error").mockImplementation(() => {});
  preparar();
  expect(await borrar()).toBe("redirect:/?cuenta=borrada");
  expect(m.rpc).toHaveBeenCalledWith("borrar_mi_cuenta");
  expect(m.medir).toHaveBeenCalledWith("cuenta_borrada", { fotos: "fallo" });
  errorConsola.mockRestore();
});
