import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearArtista } from "./acciones";

const m = vi.hoisted(() => ({ sesion: vi.fn(), insert: vi.fn(), rol: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("REDIRECT"); }), RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const USUARIO = "00000000-0000-4000-8000-0000000000a1";

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue({
    supabase: {
      from: vi.fn((tabla: string) => {
        if (tabla === "perfiles") return { select: () => ({ eq: () => ({ maybeSingle: m.rol }) }) };
        if (tabla === "artistas") return { insert: m.insert };
        throw new Error(`tabla inesperada: ${tabla}`);
      }),
    },
    user: { id: USUARIO },
  });
  m.rol.mockResolvedValue({ data: { rol: "miembro" } });
  m.insert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: "a1", slug: "ana-ruiz" }, error: null }) }) });
});

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

/** OL-299: el servidor no publica un artista sin disciplina aunque el formulario se salte, y no la deduce por su cuenta. */
describe("crearArtista y la disciplina (OL-299)", () => {
  it("sin disciplina rechaza el alta con «Falta la disciplina.» y no toca la base", async () => {
    const r = await crearArtista(null, formulario({ nombre: "Ana Ruiz", tipo: "solista", ciudad: "San Luis Potosí" }));
    expect(r).toEqual({ ok: false, errores: { disciplina: "Falta la disciplina." } });
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("con la disciplina elegida publica y la guarda tal cual", async () => {
    await expect(crearArtista(null, formulario({ nombre: "Ana Ruiz", disciplina: "artes_visuales", tipo: "solista", ciudad: "San Luis Potosí" }))).rejects.toThrow("REDIRECT");
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(m.insert.mock.calls[0][0]).toMatchObject({ nombre: "Ana Ruiz", disciplina: "artes_visuales", creado_por: USUARIO });
  });
});
