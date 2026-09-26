import { describe, expect, it, vi } from "vitest";
import { cargarBloqueados, estaBloqueada } from "./consultas";

const QUIEN = "00000000-0000-4000-8000-000000000001";
const BLOQUEADO = "00000000-0000-4000-8000-000000000002";

describe("estaBloqueada", () => {
  it("verdadero cuando hay una fila (mi bloqueo hacia esa persona)", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { quien: QUIEN }, error: null });
    const eq2 = vi.fn().mockReturnValue({ maybeSingle });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    const supabase = { from: vi.fn().mockReturnValue({ select }) } as never;
    expect(await estaBloqueada(supabase, QUIEN, BLOQUEADO)).toBe(true);
    expect(eq1).toHaveBeenCalledWith("quien", QUIEN);
    expect(eq2).toHaveBeenCalledWith("bloqueado", BLOQUEADO);
  });
  it("falso sin fila", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq2 = vi.fn().mockReturnValue({ maybeSingle });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    const supabase = { from: vi.fn().mockReturnValue({ select }) } as never;
    expect(await estaBloqueada(supabase, QUIEN, BLOQUEADO)).toBe(false);
  });
});

describe("cargarBloqueados", () => {
  it("las personas bloqueadas, más reciente primero, sin filas sin persona (cuenta borrada)", async () => {
    const filas = [
      { creado_en: "2026-09-25T00:00:00Z", persona: { id: BLOQUEADO, nombre: "Beto", foto: null } },
      { creado_en: "2026-09-20T00:00:00Z", persona: null },
    ];
    const limit = vi.fn().mockResolvedValue({ data: filas, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ select }) } as never;
    expect(await cargarBloqueados(supabase, QUIEN)).toEqual([{ id: BLOQUEADO, nombre: "Beto", foto: null }]);
    expect(eq).toHaveBeenCalledWith("quien", QUIEN);
    expect(order).toHaveBeenCalledWith("creado_en", { ascending: false });
  });
  it("vacío sin filas", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ select }) } as never;
    expect(await cargarBloqueados(supabase, QUIEN)).toEqual([]);
  });
});
