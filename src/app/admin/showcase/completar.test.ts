import { beforeEach, describe, expect, it, vi } from "vitest";
import { completarFicha, decidirEvidencia, descartarSugerencia } from "./acciones";

/**
 * «Completar ficha» (OL-445): la acción vuelve a leer la ficha y la propuesta en el servidor (la pantalla solo manda la clave), escribe solo lo
 * que falta, exige que la ficha no haya cambiado desde la lectura, no toca una ficha reclamada y guarda lo descartado en el candidato. Aceptar
 * una evidencia vuelve a leer también su ficha pública (el hito la cambia).
 */
type Ficha = { disciplina: string; detalle: string | null; descripcion: string | null; redes: unknown; actualizado_en: string };
const m = vi.hoisted(() => ({
  actual: vi.fn(),
  ruta: vi.fn(),
  escrito: [] as { tabla: string; como: string; datos: unknown; filtros: unknown[][] }[],
  ficha: null as Ficha | null,
  cuentas: 0,
  descartadas: [] as string[],
  propuestas: [] as unknown[],
  evidencias: [] as unknown[],
  filasActualizadas: [{ id: "x" }] as unknown[],
}));
vi.mock("next/cache", () => ({ revalidatePath: m.ruta }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3000" }) }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioActual: m.actual,
  clienteServidor: async () => ({
    from: (tabla: string) => {
      let escrito: (typeof m.escrito)[number] | null = null;
      const filtros: unknown[][] = [];
      const respuesta = () => {
        if (escrito) return { data: tabla === "artistas" ? m.filasActualizadas : [{ id: "x" }], error: null };
        if (tabla === "artistas") return { data: m.ficha, error: null };
        if (tabla === "showcase_candidatos") return { data: { completar_descartadas: m.descartadas }, error: null };
        if (tabla === "propuestas") return { data: m.propuestas, error: null };
        if (tabla === "showcase_evidencias") return { data: m.evidencias, error: null };
        if (tabla === "artistas_cuentas") return { data: null, count: m.cuentas, error: null };
        return { data: [], error: null };
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = { then: (ok: (v: unknown) => void) => Promise.resolve(respuesta()).then(ok) };
      for (const f of ["select", "eq", "in", "limit", "maybeSingle"]) q[f] = (...args: unknown[]) => (filtros.push([f, ...args]), q);
      for (const como of ["insert", "upsert", "update"]) q[como] = (datos: unknown) => ((escrito = { tabla, como, datos, filtros }), m.escrito.push(escrito), q);
      return q;
    },
  }),
}));

const ID = "11111111-1111-4111-8111-111111111111";
const PROPUESTA = { id: "p1", fuente: "PECDA 2026", datos: { disciplina: "letras", detalle: "Poesía", redes: ["https://open.spotify.com/artist/abc"], obra: "Poeta del altiplano.", url: "https://cultura.example.org/pecda" } };

beforeEach(() => {
  vi.clearAllMocks();
  m.escrito = [];
  m.ficha = { disciplina: "por_completar", detalle: null, descripcion: null, redes: [], actualizado_en: "2026-10-22T10:00:00+00:00" };
  m.cuentas = 0;
  m.descartadas = [];
  m.propuestas = [PROPUESTA];
  m.evidencias = [];
  m.filasActualizadas = [{ id: "x" }];
  m.actual.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
});

describe("Completar ficha (OL-445)", () => {
  it("escribe solo lo que falta, contra la ficha leída, y vuelve a leer el showcase y su perfil", async () => {
    expect(await completarFicha(ID, "disciplina:letras", "marta-solis")).toEqual({ ok: true });
    expect(await completarFicha(ID, "enlace:open.spotify.com/artist/abc", "marta-solis")).toEqual({ ok: true });
    const escritos = m.escrito.filter((e) => e.tabla === "artistas");
    expect(escritos.map((e) => e.datos)).toEqual([{ disciplina: "letras" }, { redes: [{ red: "spotify", url: "https://open.spotify.com/artist/abc" }] }]);
    expect(escritos[0].filtros).toContainEqual(["eq", "actualizado_en", "2026-10-22T10:00:00+00:00"]);
    expect(m.ruta).toHaveBeenCalledWith("/artistas/marta-solis");
    expect(m.ruta).toHaveBeenCalledWith("/admin/showcase/marta-solis");
  });

  it("no pisa lo que alguien puso: si ya no falta, la sugerencia no aplica y no escribe", async () => {
    m.ficha = { ...m.ficha!, disciplina: "musica", detalle: "Jazz" };
    expect(await completarFicha(ID, "disciplina:letras", "x")).toMatchObject({ ok: false, error: expect.stringMatching(/ya no aplica/) });
    expect(await completarFicha(ID, "detalle:poesía", "x")).toMatchObject({ ok: false });
    expect(m.escrito).toEqual([]);
  });

  it("con la ficha reclamada no cambia nada", async () => {
    m.cuentas = 1;
    expect(await completarFicha(ID, "disciplina:letras", "x")).toMatchObject({ ok: false, error: expect.stringMatching(/no se cambia/) });
    expect(m.escrito).toEqual([]);
  });

  it("si la ficha cambió entre la lectura y la escritura, lo dice", async () => {
    m.filasActualizadas = [];
    expect(await completarFicha(ID, "descripcion:p1", "x")).toEqual({ ok: false, error: "La ficha cambió mientras tanto. Recarga la página." });
  });

  it("sin ser admin, o con lo que no es un id o una clave, no escribe", async () => {
    expect(await completarFicha("no-es-id", "disciplina:letras", "x")).toMatchObject({ ok: false });
    // @ts-expect-error: una clave que no es texto
    expect(await completarFicha(ID, { x: 1 }, "x")).toMatchObject({ ok: false });
    m.actual.mockResolvedValue({ perfil: { id: "u", rol: "usuario" } });
    expect(await completarFicha(ID, "disciplina:letras", "x")).toEqual({ ok: false, error: "Solo la administración puede cambiar el showcase." });
    expect(await descartarSugerencia(ID, "disciplina:letras", "x")).toMatchObject({ ok: false });
    expect(m.escrito).toEqual([]);
  });

  it("descartar guarda la clave en el candidato; deshacer la quita", async () => {
    m.descartadas = ["detalle:jazz"];
    expect(await descartarSugerencia(ID, "disciplina:letras", "x")).toEqual({ ok: true });
    expect(await descartarSugerencia(ID, "detalle:jazz", "x", true)).toEqual({ ok: true });
    expect(m.escrito.map((e) => [e.tabla, e.datos])).toEqual([
      ["showcase_candidatos", { artista_id: ID, completar_descartadas: ["detalle:jazz", "disciplina:letras"] }],
      ["showcase_candidatos", { artista_id: ID, completar_descartadas: [] }],
    ]);
  });
});

describe("aceptar una evidencia publica en su perfil", () => {
  it("vuelve a leer la ficha pública del artista", async () => {
    expect(await decidirEvidencia(ID, "aceptada", "marta-solis")).toEqual({ ok: true });
    expect(m.ruta).toHaveBeenCalledWith("/artistas/marta-solis");
  });
});
