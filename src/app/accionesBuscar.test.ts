import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarUnificado, vigentesDeRecientes } from "./accionesBuscar";

// OL-338: lo que devuelve Buscar. Una base de mentira que contesta por tabla y por columnas pedidas, y anota cada consulta.
type Consulta = { tabla: string; columnas: string; filtros: unknown[][] };
const m = vi.hoisted(() => ({ consultas: [] as Consulta[], filas: {} as Record<string, unknown[]>, fallar: "" }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteServidor: async () => ({
    from(tabla: string) {
      const c: Consulta = { tabla, columnas: "", filtros: [] };
      m.consultas.push(c);
      const cadena = {
        select(columnas: string) {
          c.columnas = columnas;
          return cadena;
        },
        then(resolver: (r: unknown) => unknown) {
          const llave = c.columnas === "evento_padre_id" ? "programa" : tabla;
          if (m.fallar === llave) return Promise.resolve({ data: null, error: { message: "falla" } }).then(resolver);
          const ids = c.filtros.find((f) => f[0] === "in" && f[1] === "id")?.[2] as string[] | undefined;
          const filas = (m.filas[llave] ?? []) as { id: string }[];
          return Promise.resolve({ data: ids ? filas.filter((f) => ids.includes(f.id)) : filas, error: null }).then(resolver);
        },
      } as Record<string, unknown>;
      for (const metodo of ["eq", "or", "order", "limit", "ilike", "in"]) cadena[metodo] = (...args: unknown[]) => (c.filtros.push([metodo, ...args]), cadena);
      return cadena;
    },
  }),
}));

const ZONA = "America/Mexico_City";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const evento = (n: number, titulo: string, extra: Record<string, unknown> = {}) => ({ id: id(n), slug: `e${n}`, titulo, inicio: "2026-10-10T01:00:00Z", fin: null, zona: ZONA, imagen: `/foto-${n}.jpg`, precio: null, lugar_id: null, sitio_texto: "Jardín", sitio_direccion: null, sitio_reservado: false, creado_en: "2026-10-01T00:00:00Z", ciudad: "San Luis Potosí", clase: "puntual", lugar: null, artistas: [], ...extra });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-07T16:00:00Z"));
  m.consultas = [];
  m.fallar = "";
  m.filas = {
    eventos: [
      evento(1, "Festival de Cine de Invierno", { clase: "festival", inicio: "2026-10-16T01:00:00Z", fin: "2026-10-19T06:00:00Z" }),
      evento(2, "Cine de barrio", {}),
      evento(3, "Ecos del cine", { clase: "exposicion", inicio: "2026-10-04T06:00:00Z", fin: "2026-10-28T05:59:00Z" }),
      evento(4, "Taller de cine", { clase: "taller" }),
    ],
    programa: [{ evento_padre_id: id(1) }, { evento_padre_id: id(1) }, { evento_padre_id: id(1) }],
    lugares: [],
    artistas: [],
  };
});
afterEach(() => vi.useRealTimers());

describe("buscarUnificado: un festival y una exposición se distinguen (OL-338)", () => {
  it("pide la clase y nombra el festival y la exposición con sus días; el evento y el taller, sin nombre", async () => {
    const r = await buscarUnificado("cine", ["San Luis Potosí"]);
    expect(m.consultas.find((c) => c.tabla === "eventos")?.columnas).toContain("clase");
    const por = Object.fromEntries(r.eventos.map((e) => [e.titulo, e]));
    expect(por["Festival de Cine de Invierno"]).toMatchObject({ clase: "Festival", detalle: "Del 15 al 18 de oct", sitio: "Programa registrado: 3 actividades" });
    expect(por["Ecos del cine"]).toMatchObject({ clase: "Exposición", detalle: "Hasta el mar 27 de oct" });
    expect(por["Cine de barrio"].clase).toBeUndefined();
    expect(por["Taller de cine"].clase).toBeUndefined();
  });
  it("si no se puede contar el programa, el festival sale igual, con su sede", async () => {
    m.fallar = "programa";
    const r = await buscarUnificado("festival", ["San Luis Potosí"]);
    expect(r.eventos[0]).toMatchObject({ clase: "Festival", sitio: "Jardín" });
  });
});

describe("vigentesDeRecientes: los recientes con lo que hay hoy (OL-338)", () => {
  it("devuelve la foto de hoy de cada uno y null para el que ya no se ve; solo pide lo que hace falta", async () => {
    m.filas.eventos = [evento(2, "Cine de barrio", { imagen: "/portada-nueva.jpg" })];
    const r = await vigentesDeRecientes([
      { grupo: "eventos", id: id(2) },
      { grupo: "eventos", id: id(9) },
    ]);
    expect(r?.[`eventos:${id(2)}`]).toMatchObject({ foto: "/portada-nueva.jpg", titulo: "Cine de barrio" });
    expect(r?.[`eventos:${id(9)}`]).toBeNull();
    expect(m.consultas.map((c) => c.tabla)).toEqual(["eventos"]);
    expect(m.consultas[0].filtros).toContainEqual(["eq", "visible", true]);
  });
  it("si una lectura falla, null: no se toca lo guardado", async () => {
    m.fallar = "eventos";
    expect(await vigentesDeRecientes([{ grupo: "eventos", id: id(2) }])).toBeNull();
  });
  it("lo que no tiene la forma (otro grupo, un id que no es UUID) no se pregunta", async () => {
    expect(await vigentesDeRecientes([{ grupo: "otro" as "eventos", id: id(2) }, { grupo: "eventos", id: "x' or 1=1" }])).toEqual({});
    expect(m.consultas).toEqual([]);
  });
});
