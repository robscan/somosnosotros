import { beforeEach, describe, expect, it, vi } from "vitest";
import { anadirEvidencia, cambiarEstado, cambiarPuntaje, guardarNotas, importarLecturas, investigar, investigarVarios } from "./acciones";

/**
 * Las acciones del showcase (OL-426): solo la administración escribe (la base lo vuelve a exigir, `supabase/tests/pg/showcase.test.mjs`); una
 * evidencia sin enlace http(s) no llega a la base; lo que llega del navegador con otra forma no rompe la acción; el CSV dice cada fila que no entra.
 */
const m = vi.hoisted(() => ({ actual: vi.fn(), ruta: vi.fn(), despues: vi.fn(), escrito: [] as { tabla: string; como: string; datos: unknown }[], artistas: [] as { id: string; slug: string }[], enCurso: [] as Record<string, unknown>[], descartados: [] as { artista_id: string }[], filtros: [] as unknown[][] }));
vi.mock("next/cache", () => ({ revalidatePath: m.ruta }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3000" }) }));
vi.mock("next/server", () => ({ after: m.despues }));
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioActual: m.actual,
  clienteServidor: async () => ({
    from: (tabla: string) => {
      let escribe = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = { then: (ok: (v: unknown) => void) => Promise.resolve({ data: tabla === "artistas" ? m.artistas : tabla === "rutinas_corridas" && !escribe ? m.enCurso : tabla === "showcase_candidatos" && !escribe ? m.descartados : [{ id: "x" }], error: null }).then(ok) };
      for (const f of ["select", "eq", "in", "limit", "single"]) q[f] = (...args: unknown[]) => (tabla === "rutinas_corridas" && f !== "select" && m.filtros.push([f, ...args]), q);
      for (const como of ["insert", "upsert", "update"]) q[como] = (datos: unknown) => ((escribe = true), m.escrito.push({ tabla, como, datos }), q);
      return q;
    },
  }),
}));

const ID = "11111111-1111-4111-8111-111111111111";
const evidencia = (cambios = {}) => ({ senal: "obra", tipo: "premio", titulo: "Mención estatal", url: "https://cultura.example.org/p", fecha: "", fuente: "", ...cambios });

beforeEach(() => {
  vi.clearAllMocks();
  m.escrito = [];
  m.artistas = [];
  m.enCurso = [];
  m.descartados = [];
  m.filtros = [];
  m.actual.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
});

describe("solo la administración", () => {
  it.each([null, { perfil: { id: "u-1", rol: "usuario" } }])("sin ser admin (%j) no escribe nada", async (actual) => {
    m.actual.mockResolvedValue(actual);
    expect(await cambiarEstado(ID, "invitado", "x")).toEqual({ ok: false, error: "Solo la administración puede cambiar el showcase." });
    expect(await anadirEvidencia(ID, evidencia(), "x")).toMatchObject({ ok: false });
    expect(await importarLecturas("artista_slug,red,seguidores,publicaciones,ultima_publicacion,leido_en\nx,instagram,1,,,", "x")).toMatchObject({ ok: false });
    expect(m.escrito).toEqual([]);
  });
});

describe("estado, puntaje y notas", () => {
  it("guardan solo lo suyo y vuelven a leer la lista, la ficha y la portada", async () => {
    expect(await cambiarEstado(ID, "confirmado", "sangre-de-coyote")).toEqual({ ok: true });
    expect(await cambiarPuntaje(ID, "obra", 2, "sangre-de-coyote")).toEqual({ ok: true });
    expect(await guardarNotas(ID, "  Propuesto por dos foros.  ", "sangre-de-coyote")).toEqual({ ok: true });
    expect(await guardarNotas(ID, "   ", "sangre-de-coyote")).toEqual({ ok: true });
    expect(m.escrito.map((e) => e.datos)).toEqual([
      { artista_id: ID, estado: "confirmado" },
      { artista_id: ID, puntaje_obra: 2 },
      { artista_id: ID, notas: "Propuesto por dos foros." },
      { artista_id: ID, notas: null },
    ]);
    expect(m.ruta).toHaveBeenCalledWith("/admin/showcase");
    expect(m.ruta).toHaveBeenCalledWith("/admin/showcase/sangre-de-coyote");
    expect(m.ruta).toHaveBeenCalledWith("/admin");
  });
  it("lo que no existe no se manda", async () => {
    // @ts-expect-error: un estado que no existe, como lo mandaría un navegador manipulado
    expect(await cambiarEstado(ID, "ganador", "x")).toMatchObject({ ok: false });
    // @ts-expect-error: un puntaje de 3
    expect(await cambiarPuntaje(ID, "obra", 3, "x")).toMatchObject({ ok: false });
    expect(await cambiarEstado("no-es-un-id", "invitado", "x")).toMatchObject({ ok: false });
    // @ts-expect-error: unas notas que no son texto
    expect(await guardarNotas(ID, { malicioso: true }, "x")).toEqual({ ok: true });
    expect(m.escrito.map((e) => e.datos)).toEqual([{ artista_id: ID, notas: null }]);
  });
});

describe("añadir evidencia", () => {
  it("sin un enlace http(s) no llega a la base", async () => {
    for (const url of ["ftp://cultura.example.org", "javascript:alert(1)", "", "cultura.example.org"]) {
      const r = await anadirEvidencia(ID, evidencia({ url }), "x");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errores?.url).toBeTruthy();
    }
    // @ts-expect-error: lo que manda un navegador manipulado
    expect(await anadirEvidencia(ID, { url: 3, titulo: null }, "x")).toMatchObject({ ok: false });
    expect(m.escrito).toEqual([]);
  });
  it("la que añade una persona entra aceptada, leída por una persona, con la fuente del dominio", async () => {
    expect(await anadirEvidencia(ID, evidencia(), "x")).toEqual({ ok: true });
    expect(m.escrito).toEqual([
      { tabla: "showcase_evidencias", como: "insert", datos: { artista_id: ID, senal: "obra", tipo: "premio", titulo: "Mención estatal", url: "https://cultura.example.org/p", fecha: null, fuente: "cultura.example.org", leida_por: "persona", estado: "aceptada" } },
    ]);
  });
});

describe("importar el CSV de redes", () => {
  it("entran las filas de artistas que existen; las demás se dicen con su línea", async () => {
    m.artistas = [{ id: ID, slug: "sangre-de-coyote" }];
    const csv = "artista_slug,red,seguidores,publicaciones,ultima_publicacion,leido_en\nsangre-de-coyote,instagram,3200,412,2026-10-18,2026-10-19\nnadie,instagram,10,,,\nsangre-de-coyote,myspace,1,,,";
    const r = await importarLecturas(csv, "sangre-de-coyote");
    expect(r).toEqual({ ok: true, importadas: 1, errores: [{ linea: 3, motivo: "No hay ningún artista con la dirección «nadie»." }, { linea: 4, motivo: "Elige la red." }] });
    const insertado = m.escrito.find((e) => e.tabla === "lecturas_redes");
    expect(insertado?.datos).toEqual([{ artista_id: ID, red: "instagram", seguidores: 3200, publicaciones: 412, ultima_publicacion: "2026-10-18", leido_en: "2026-10-19T12:00:00.000Z" }]);
  });
  it("un archivo vacío, enorme o sin cabecera no importa nada", async () => {
    expect(await importarLecturas("", "x")).toEqual({ ok: false, error: "El archivo está vacío." });
    expect(await importarLecturas("x".repeat(300 * 1024), "x")).toMatchObject({ ok: false, error: "El archivo es demasiado grande (hasta 256 KB)." });
    expect(await importarLecturas("slug,red\nx,instagram", "x")).toMatchObject({ ok: false });
    expect(m.escrito).toEqual([]);
  });
});

describe("«Investigar» (OL-430)", () => {
  it("deja una corrida de showcase sin ciudad, con el artista y el tope, y pide su primer paso después de responder", async () => {
    expect(await investigar(ID, "1,00", "sangre-de-coyote")).toEqual({ ok: true });
    expect(m.escrito).toEqual([{ tabla: "rutinas_corridas", como: "insert", datos: [{ tipo: "showcase", ciudad: null, tope_usd: 1, creado_por: "admin-1", parametros: { artista_id: ID } }] }]);
    // Antes, las corridas en curso (pendientes o corriendo): si ya hay una de este artista, no se crea otra (OL-439: la misma función que la lista).
    expect(m.filtros).toEqual(expect.arrayContaining([["in", "estado", ["pendiente", "corriendo"]]]));
    expect(m.despues).toHaveBeenCalledTimes(1);
    expect(m.ruta).toHaveBeenCalledWith("/admin/showcase/sangre-de-coyote");
  });
  it("una a la vez por artista; el tope tiene que valer; solo la administración", async () => {
    m.enCurso = [{ id: "c-1", tipo: "showcase", estado: "pendiente", parametros: { artista_id: ID }, resumen: {}, creado_en: new Date().toISOString() }];
    expect(await investigar(ID, "1,00", "x")).toEqual({ ok: false, error: "Ya hay una investigación en curso de este artista." });
    m.enCurso = [];
    expect(await investigar(ID, "0", "x")).toEqual({ ok: false, error: "Escribe un tope de más de 0 y hasta 50 USD." });
    expect(await investigar(ID, "80", "x")).toMatchObject({ ok: false });
    expect(await investigar("no-es-un-id", "1", "x")).toEqual({ ok: false, error: "No encontramos a ese artista." });
    m.actual.mockResolvedValue({ perfil: { id: "u-1", rol: "usuario" } });
    expect(await investigar(ID, "1", "x")).toEqual({ ok: false, error: "Solo la administración puede cambiar el showcase." });
    expect(m.escrito).toEqual([]);
    expect(m.despues).not.toHaveBeenCalled();
  });
});

describe("«Investigar» a varios desde la lista (OL-439)", () => {
  const OTRO = "22222222-2222-4222-8222-222222222222";
  const TERCERO = "33333333-3333-4333-8333-333333333333";
  const insertado = () => m.escrito.find((e) => e.tabla === "rutinas_corridas" && e.como === "insert")?.datos as { parametros: { artista_id: string; lote?: string } }[] | undefined;

  it("una corrida por artista, de la misma orden (lote), con la misma forma que la de la ficha; el primer paso, una sola vez", async () => {
    expect(await investigarVarios([ID, OTRO, ID, "no-es-un-id", 7], "0,50")).toEqual({ ok: true, creadas: 2, omitidas: 0 });
    const filas = insertado()!;
    expect(filas).toHaveLength(2);
    expect(filas.map((f) => f.parametros.artista_id)).toEqual([ID, OTRO]);
    expect(filas[0]).toMatchObject({ tipo: "showcase", ciudad: null, tope_usd: 0.5, creado_por: "admin-1" });
    expect(filas[0].parametros.lote).toMatch(/^[0-9a-f-]{36}$/);
    expect(filas[1].parametros.lote).toBe(filas[0].parametros.lote);
    expect(m.despues).toHaveBeenCalledTimes(1);
    expect(m.ruta).toHaveBeenCalledWith("/admin/showcase");
    expect(m.ruta).toHaveBeenCalledWith("/admin/corridas");
  });
  it("los descartados y quien ya tiene una en curso no entran; se cuentan como omitidos", async () => {
    m.descartados = [{ artista_id: OTRO }];
    m.enCurso = [{ id: "c-1", tipo: "showcase", estado: "corriendo", parametros: { artista_id: TERCERO }, resumen: { ocupada_hasta: new Date(Date.now() + 60_000).toISOString() }, creado_en: new Date().toISOString() }];
    expect(await investigarVarios([ID, OTRO, TERCERO], "1")).toEqual({ ok: true, creadas: 1, omitidas: 2 });
    expect(insertado()!.map((f) => f.parametros.artista_id)).toEqual([ID]);
  });
  it("si el motor ya está corriendo otras, no pide otro paso: las nuevas esperan su turno en la misma cadena", async () => {
    m.enCurso = [{ id: "c-9", tipo: "lugares", estado: "corriendo", parametros: {}, resumen: { actualizada: new Date().toISOString() }, creado_en: new Date().toISOString() }];
    expect(await investigarVarios([ID], "1")).toMatchObject({ ok: true, creadas: 1 });
    expect(m.despues).not.toHaveBeenCalled();
  });
  it("si todas las que esperan están varadas (la cadena se paró), sí lo pide", async () => {
    const hace5min = new Date(Date.now() - 5 * 60_000).toISOString();
    m.enCurso = [{ id: "c-9", tipo: "showcase", estado: "pendiente", parametros: { artista_id: TERCERO }, resumen: {}, creado_en: hace5min }];
    expect(await investigarVarios([ID], "1")).toMatchObject({ ok: true, creadas: 1 });
    expect(m.despues).toHaveBeenCalledTimes(1);
  });
  it("hasta 60 por orden; nadie, un tope que no vale o sin ser admin: nada se crea", async () => {
    const muchos = Array.from({ length: 61 }, (_, i) => `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`);
    expect(await investigarVarios(muchos, "1")).toEqual({ ok: false, error: "Son 61: elige hasta 60 o filtra por disciplina." });
    expect(await investigarVarios(muchos.slice(0, 60), "1")).toMatchObject({ ok: true, creadas: 60 });
    m.escrito = [];
    expect(await investigarVarios([], "1")).toEqual({ ok: false, error: "Elige a quién investigar." });
    expect(await investigarVarios("todos", "1")).toEqual({ ok: false, error: "Elige a quién investigar." });
    expect(await investigarVarios([ID], "0")).toEqual({ ok: false, error: "Escribe un tope de más de 0 y hasta 50 USD." });
    m.descartados = [{ artista_id: ID }];
    expect(await investigarVarios([ID], "1")).toEqual({ ok: false, error: "Ya están todos en curso o descartados. Recarga la página." });
    m.actual.mockResolvedValue({ perfil: { id: "u-1", rol: "usuario" } });
    expect(await investigarVarios([OTRO], "1")).toEqual({ ok: false, error: "Solo la administración puede cambiar el showcase." });
    expect(m.escrito).toEqual([]);
  });
});
