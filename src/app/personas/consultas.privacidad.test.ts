import { expect, it, vi } from "vitest";
import { cargarPersona } from "./consultas";

const m = vi.hoisted(() => ({ select: vi.fn(), rpc: vi.fn() }));
const id = "00000000-0000-4000-8000-000000000001";
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: async () => ({
  from: (tabla: string) => ({ select: (columnas: string) => {
    m.select(tabla, columnas);
    if (tabla === "perfiles") {
      // Simula la prohibición efectiva de columnas privadas, también para ficha propia.
      if (/avisos|novedades/.test(columnas)) throw new Error("42501");
      return { eq: () => ({ maybeSingle: async () => ({ data: { id, nombre: "Persona", foto: null, colonia: null, bio: null, rol: "usuario", reservado: true } }) }) };
    }
    const q = { eq: () => q, or: () => q, limit: async () => ({ data: [] }) };
    return q;
  } }), rpc: m.rpc,
}) }));

it("la ficha conserva identidad y reserva sin pedir preferencias ajenas", async () => {
  const persona = await cargarPersona(id);
  expect(persona?.perfil).toMatchObject({ id, nombre: "Persona", reservado: true });
  expect(Object.keys(persona!.perfil).sort()).toEqual(["id", "nombre", "foto", "colonia", "bio", "rol", "reservado"].sort());
  expect(m.select).toHaveBeenCalledWith("perfiles", "id, nombre, foto, colonia, bio, rol, reservado");
  expect(persona?.eventos).toEqual([]);
});
