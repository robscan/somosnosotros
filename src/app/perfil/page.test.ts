import { Suspense } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import BotonTuAnio from "@/components/BotonTuAnio";

/**
 * «Tu año» en Mi perfil (OL-394): el botón sale solo para la persona con sesión y si dijo «Voy» a algo que ya pasó este año. Se llama a la
 * página y se recorre el árbol de elementos sin pintarlo; lo diferido (`<Suspense>`) se resuelve a mano.
 */

const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  pasados: [] as { inicio: string; zona: string }[],
  sesion: true,
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect, notFound: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioActual: vi.fn(async () => (m.sesion ? { correo: null, perfil: { id: "p-1", nombre: "Marcos", foto: null, colonia: null, bio: null, rol: "usuario" } } : null)),
  clienteServidor: vi.fn(async () => null),
}));
vi.mock("@/app/personas/consultas", () => ({
  cargarPersona: vi.fn(async () => ({ perfil: { id: "p-1", nombre: "Marcos", foto: null, colonia: null, bio: null, rol: "usuario" }, eventos: [], interesan: [], lugares: [], artistas: [] })),
  relacionDe: vi.fn(() => ({ decididas: {}, seguidos: [] })),
}));
vi.mock("@/app/artistas/consultas", () => ({ cargarMisArtistas: vi.fn(async () => []) }));
vi.mock("@/lib/cargarTuAnio", () => ({ cargarPasadosPersona: vi.fn(async () => m.pasados) }));

function* recorrer(nodo: unknown): Generator<{ type: unknown; props: Record<string, unknown> }> {
  if (nodo == null || typeof nodo === "boolean" || typeof nodo === "string" || typeof nodo === "number") return;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) yield* recorrer(hijo);
    return;
  }
  if (typeof nodo === "object" && "$$typeof" in nodo) {
    const el = nodo as unknown as { type: unknown; props: Record<string, unknown> };
    yield el;
    yield* recorrer(el.props?.children);
  }
}

/** Mi perfil con esos «Voy» pasados: el botón «Tu año» que pinta, o nada. */
async function boton(pasados: { inicio: string; zona: string }[]) {
  m.pasados = pasados;
  const { default: PaginaPerfil } = await import("./page");
  const arbol = await PaginaPerfil();
  const diferidos = [...recorrer(arbol)].filter((e) => e.type === Suspense).map((s) => s.props.children as { type: (p: unknown) => Promise<unknown>; props: unknown });
  const resueltos = await Promise.all(diferidos.map((d) => d.type(d.props)));
  return resueltos.flatMap((r) => [...recorrer(r)]).find((e) => e.type === BotonTuAnio);
}

describe("«Tu año» en Mi perfil (OL-394)", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T20:00:00Z"));
  });
  afterAll(() => vi.useRealTimers());

  it("con un «Voy» pasado de este año, el botón lleva a /tu-anio", async () => {
    const b = await boton([{ inicio: "2026-10-03T02:00:00Z", zona: "America/Mexico_City" }]);
    expect(b?.props.href).toBe("/tu-anio");
  });

  it("sin nada pasado, o solo del año pasado, no hay botón", async () => {
    expect(await boton([])).toBeUndefined();
    expect(await boton([{ inicio: "2025-10-03T02:00:00Z", zona: "America/Mexico_City" }])).toBeUndefined();
  });

  it("sin sesión no hay perfil (a Entrar), ni botón", async () => {
    m.sesion = false;
    try {
      const { default: PaginaPerfil } = await import("./page");
      await expect(PaginaPerfil()).rejects.toThrow("REDIRECT:/entrar?siguiente=/perfil");
    } finally {
      m.sesion = true;
    }
  });
});
