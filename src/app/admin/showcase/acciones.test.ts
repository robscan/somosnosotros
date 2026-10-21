import { beforeEach, describe, expect, it, vi } from "vitest";
import { anadirEvidencia, cambiarEstado, cambiarPuntaje, guardarNotas, importarLecturas, investigar } from "./acciones";

/**
 * Las acciones del showcase (OL-426): solo la administración escribe (la base lo vuelve a exigir, `supabase/tests/pg/showcase.test.mjs`); una
 * evidencia sin enlace http(s) no llega a la base; lo que llega del navegador con otra forma no rompe la acción; el CSV dice cada fila que no entra.
 */
const m = vi.hoisted(() => ({ actual: vi.fn(), ruta: vi.fn(), despues: vi.fn(), escrito: [] as { tabla: string; como: string; datos: unknown }[], artistas: [] as { id: string; slug: string }[], enCurso: [] as { id: string }[], filtros: [] as unknown[][] }));
vi.mock("next/cache", () => ({ revalidatePath: m.ruta }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3000" }) }));
vi.mock("next/server", () => ({ after: m.despues }));
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioActual: m.actual,
  clienteServidor: async () => ({
    from: (tabla: string) => {
      let escribe = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = { then: (ok: (v: unknown) => void) => Promise.resolve({ data: tabla === "artistas" ? m.artistas : tabla === "rutinas_corridas" && !escribe ? m.enCurso : [{ id: "x" }], error: null }).then(ok) };
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
    expect(m.escrito).toEqual([{ tabla: "rutinas_corridas", como: "insert", datos: { tipo: "showcase", ciudad: null, tope_usd: 1, creado_por: "admin-1", parametros: { artista_id: ID } } }]);
    // Antes, si ya había una en curso de este artista (pendiente o corriendo).
    expect(m.filtros).toEqual(expect.arrayContaining([["eq", "tipo", "showcase"], ["in", "estado", ["pendiente", "corriendo"]], ["eq", "parametros->>artista_id", ID]]));
    expect(m.despues).toHaveBeenCalledTimes(1);
    expect(m.ruta).toHaveBeenCalledWith("/admin/showcase/sangre-de-coyote");
  });
  it("una a la vez por artista; el tope tiene que valer; solo la administración", async () => {
    m.enCurso = [{ id: "c-1" }];
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
