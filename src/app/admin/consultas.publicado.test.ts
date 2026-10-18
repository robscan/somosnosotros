import { beforeEach, expect, it, vi } from "vitest";
import { clienteServidor } from "@/lib/supabase/servidor";
import { cargarPublicado } from "./consultas";

vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));
const cliente = vi.mocked(clienteServidor);
beforeEach(() => vi.resetAllMocks());

const PERFIL = "11111111-1111-4111-8111-111111111111";
const PAGINAS = { eventos: 20, lugares: 40, artistas: 20 };

type Respuesta = { data: unknown[] | null; count?: number | null; error?: { code: string } | null };
type Llamada = { tabla: string; pasos: [string, ...unknown[]][] };

/** Un cliente de Supabase de mentira: cada `from()` anota su cadena (select, eq, order, limit, in) y contesta lo que se le dio para esa tabla. */
function clienteDe(respuestas: Record<string, Respuesta[]>) {
  const llamadas: Llamada[] = [];
  const from = (tabla: string) => {
    const llamada: Llamada = { tabla, pasos: [] };
    llamadas.push(llamada);
    const r = respuestas[tabla].shift()!;
    const cadena: Record<string, unknown> = {};
    for (const paso of ["select", "eq", "order", "limit", "in"]) {
      cadena[paso] = (...args: unknown[]) => {
        llamada.pasos.push([paso, ...args]);
        return cadena;
      };
    }
    cadena.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: r.data, count: r.count ?? null, error: r.error ?? null }).then(ok);
    return cadena;
  };
  cliente.mockResolvedValue({ from } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  return llamadas;
}

const acto = { id: "e2", evento_padre_id: "f1", titulo: "Charla con la directora" };

it("lee lo que tiene creado_por = la persona en las tres tablas, del más reciente al más antiguo, con el total de la misma consulta", async () => {
  const llamadas = clienteDe({
    eventos: [{ data: [{ id: "f1", evento_padre_id: null, titulo: "Festival" }, acto], count: 27 }, { data: [{ id: "f1", titulo: "Festival de Cine de Invierno" }] }],
    lugares: [{ data: [{ id: "l1" }], count: 1 }],
    artistas: [{ data: [], count: 0 }],
  });
  const p = await cargarPublicado(PERFIL, PAGINAS);
  expect(p?.eventos.total).toBe(27);
  expect(p?.eventos.filas).toHaveLength(2);
  expect(p?.lugares.total).toBe(1);
  expect(p?.artistas.total).toBe(0);
  expect(p?.festivales).toEqual({ f1: "Festival de Cine de Invierno" });
  for (const tabla of ["eventos", "lugares", "artistas"]) {
    const pasos = llamadas.find((l) => l.tabla === tabla)!.pasos;
    expect(pasos.find(([p]) => p === "select")?.[2]).toEqual({ count: "exact" });
    expect(pasos).toContainEqual(["eq", "creado_por", PERFIL]);
    expect(pasos.find(([p]) => p === "order")).toEqual(["order", "creado_en", { ascending: false }]);
    expect(pasos).toContainEqual(["limit", PAGINAS[tabla as keyof typeof PAGINAS]]);
  }
  // El festival antes de sus actos (se dan de alta con la misma hora) y los actos en el orden del programa.
  expect(llamadas[0].pasos).toContainEqual(["order", "evento_padre_id", { ascending: true, nullsFirst: true }]);
  expect(llamadas[0].pasos).toContainEqual(["order", "inicio", { ascending: true }]);
  // El nombre del festival: una lectura por los ids de los padres, sin repetirlos.
  expect(llamadas[3]).toEqual({ tabla: "eventos", pasos: [["select", "id, titulo"], ["in", "id", ["f1"]], ["limit", 1]] });
});

it("sin actos de festival no hace la segunda lectura", async () => {
  const llamadas = clienteDe({ eventos: [{ data: [{ id: "e1", evento_padre_id: null }], count: 1 }], lugares: [{ data: [], count: 0 }], artistas: [{ data: [], count: 0 }] });
  expect((await cargarPublicado(PERFIL, PAGINAS))?.festivales).toEqual({});
  expect(llamadas).toHaveLength(3);
});

it("si una lectura falla no entrega una lista a medias ni ceros", async () => {
  clienteDe({ eventos: [{ data: null, error: { code: "42501" } }], lugares: [{ data: [], count: 0 }], artistas: [{ data: [], count: 0 }] });
  expect(await cargarPublicado(PERFIL, PAGINAS)).toBeNull();
  clienteDe({ eventos: [{ data: [acto], count: 1 }, { data: null, error: { code: "08006" } }], lugares: [{ data: [], count: 0 }], artistas: [{ data: [], count: 0 }] });
  expect(await cargarPublicado(PERFIL, PAGINAS)).toBeNull();
  cliente.mockRejectedValueOnce(new Error("red"));
  expect(await cargarPublicado(PERFIL, PAGINAS)).toBeNull();
});

it("un id que no es de una cuenta no consulta nada", async () => {
  expect(await cargarPublicado("no-es-uuid", PAGINAS)).toBeNull();
  expect(cliente).not.toHaveBeenCalled();
});
