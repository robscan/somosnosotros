import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import type { LugarLista } from "@/lib/lugares";
import VistaLugares, { type ExtrasLugares } from "./VistaLugares";

const m = vi.hoisted(() => ({ consulta: "", mapa: vi.fn(), cliente: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(m.consulta),
  usePathname: () => "/lugares",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock("@/components/Mapa", () => ({ default: m.mapa }));
vi.mock("@/app/lugares/acciones", () => ({ cambiarSeguimiento: vi.fn() }));
vi.mock("@/app/artistas/acciones", () => ({ cambiarSeguimientoArtista: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: m.cliente, usuarioActual: () => new Promise(() => {}) }));
vi.mock("@/lib/ciudades", () => ({ cargarCiudades: async () => [] }));
vi.mock("@/lib/destacados", () => ({ leerTira: async () => [] }));

const lugares: LugarLista[] = Array.from({ length: 25 }, (_, i) => ({
  id: `id-${i}`, slug: `espacio-${String(i).padStart(2, "0")}`, nombre: `Espacio ${String(i).padStart(2, "0")}`,
  tipo: i % 2 ? "galeria" : "museo", direccion: "Calle de prueba 123", lat: 22.15, lng: -100.97,
  portada: null, proximo: null, privado: false,
}));

function pintar(lista = lugares) {
  // Nunca se resuelve: el render público no debe depender de la cuenta ni de destacados.
  const extras = new Promise<ExtrasLugares>(() => {});
  return renderToStaticMarkup(createElement(VistaLugares, {
    lugares: lista, ciudad: CIUDAD_INICIAL, ciudades: [], extras, hoy: "2026-10-07", abrirFicha: vi.fn(),
  }));
}

describe("Lugares: HTML público antes de resolver la personalización (OL-279)", () => {
  beforeEach(() => { m.consulta = ""; m.mapa.mockClear(); });

  it("entrega una sola lista con la primera tanda de enlaces slug y datos, sin seguir ni montar el mapa", () => {
    const html = pintar();
    expect(html.match(/<section[^>]*aria-label="Lugares"/g)).toHaveLength(1);
    expect(html.match(/href="\/lugares\/espacio-\d+"/g)).toHaveLength(20);
    expect(html).toContain('href="/lugares/espacio-00"');
    expect(html).not.toContain('href="/lugares/id-0"');
    expect(html).toContain("Calle de prueba 123");
    expect(html).not.toMatch(/aria-label="(Seguir|Sigues) —/);
    expect(html).toContain("data-techo-hoja");
    expect(m.mapa).not.toHaveBeenCalled();
  });

  it("respeta el filtro de tipo que ya trae la URL y conserva UUID solo como respaldo", () => {
    m.consulta = "tipo=galeria";
    const html = pintar(lugares.map((l) => l.id === "id-1" ? { ...l, slug: null } : l));
    expect(html.match(/href="\/lugares\//g)).toHaveLength(12);
    expect(html).toContain('href="/lugares/id-1"');
    expect(html).not.toContain('href="/lugares/espacio-00"');
  });

  it("dice el vacío público sin decidir prematuramente a dónde entra la cuenta", () => {
    const html = pintar([]);
    expect(html).toContain("Aún no hay lugares en San Luis Potosí.");
    expect(html).not.toContain("siguiente=");
    expect(html).not.toContain("Registrar un lugar");
  });

  it("la página real conserva la exclusión de privados aunque la consulta pueda leer el lugar propio", async () => {
    const filtros: [string, unknown][] = [];
    m.cliente.mockImplementation(async () => ({
      from: (tabla: string) => {
        const privada = { ...lugares[0], id: "privado-propio", slug: "sitio-reservado", nombre: "Sitio reservado", direccion: "Dirección reservada", privado: true };
        let filas = tabla === "lugares" ? [...lugares, privada].map((l) => ({ ...l, visible: true, ciudad: "San Luis Potosí" })) : [];
        const consulta = {
          select: () => consulta, order: () => consulta, limit: () => consulta, not: () => consulta, or: () => consulta,
          eq: (campo: string, valor: unknown) => {
            filtros.push([campo, valor]);
            filas = filas.filter((fila) => (fila as unknown as Record<string, unknown>)[campo] === valor);
            return consulta;
          },
          then: (resolver: (resultado: unknown) => void) => Promise.resolve({ data: filas, error: null }).then(resolver),
        };
        return consulta;
      },
    }));
    const { default: Pagina } = await import("./page");
    const html = renderToStaticMarkup(await Pagina({ searchParams: Promise.resolve({}) }));
    expect(filtros).toContainEqual(["privado", false]);
    expect(html.match(/href="\/lugares\/espacio-\d+"/g)).toHaveLength(20);
    expect(html).not.toContain("sitio-reservado");
    expect(html).not.toContain("Dirección reservada");
  });
});
