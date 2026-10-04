import { describe, expect, it, vi } from "vitest";
import Buscar from "./page";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
vi.mock("@/lib/ciudades", () => ({ cargarCiudades: vi.fn(async () => [{ ...CIUDAD_INICIAL, lugares: 1, eventos: 2, zona: "America/Mexico_City" }]) }));
vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: vi.fn(async () => null) }));
vi.mock("./BuscarPantalla", () => ({ default: () => null }));

describe("Buscar: contrato de enlaces antiguos", () => {
  it("entrega el texto de q a la pantalla sin perder ciudad y origen", async () => {
    const p = await Buscar({ searchParams: Promise.resolve({ q: "Rob", ciudad: "san-luis-potosi", desde: "artistas" }) });
    expect(p.props).toMatchObject({ consultaInicial: "Rob", desde: "artistas", ciudad: { slug: "san-luis-potosi" }, conSesion: false });
  });
  it("sin q abre la búsqueda vacía", async () => {
    const p = await Buscar({ searchParams: Promise.resolve({}) });
    expect(p.props.consultaInicial).toBe("");
  });
});
