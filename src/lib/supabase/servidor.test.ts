import { beforeEach, describe, expect, it, vi } from "vitest";
import { usuarioActual } from "./servidor";

const m = vi.hoisted(() => ({ claims: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/config", () => ({ configPublica: () => ({ supabaseUrl: "http://base.local", supabaseAnonKey: "fixture" }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getClaims: m.claims }, rpc: m.rpc, from: m.from }) }));
const perfil = { id: "titular", nombre: "Persona", foto: null, colonia: null, bio: null, rol: "usuario", avisos_push: false };
beforeEach(() => {
  vi.clearAllMocks();
  m.claims.mockResolvedValue({ data: { claims: { sub: "titular", email: "titular@example.com" } } });
  m.rpc.mockResolvedValue({ data: perfil, error: null });
});

describe("usuarioActual: frontera privada", () => {
  it("conserva la sesión y preferencias mediante RPC sin identificador suministrado", async () => {
    expect(await usuarioActual()).toEqual({ correo: "titular@example.com", perfil });
    expect(m.rpc).toHaveBeenCalledWith("mi_perfil");
    expect(m.from).not.toHaveBeenCalled();
  });
  it("sin claims no consulta perfiles", async () => {
    m.claims.mockResolvedValue({ data: null });
    expect(await usuarioActual()).toBeNull();
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: null },
    { data: perfil, error: { code: "42501" } },
    { data: { ...perfil, id: "otra" }, error: null },
  ])("no acepta un perfil ausente, rechazado o ajeno", async resultado => {
    m.rpc.mockResolvedValue(resultado);
    expect(await usuarioActual()).toBeNull();
  });
});
