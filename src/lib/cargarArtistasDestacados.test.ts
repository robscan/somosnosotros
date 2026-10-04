import { afterEach, describe, expect, it, vi } from "vitest";
import { cargarArtistasDestacados, ordenarPorSeguidores, TOPE_ARTISTAS_DESTACADOS } from "./cargarArtistasDestacados";

describe("Artistas destacadxs de Inicio: respaldo por seguidores (sin tira de la administración)", () => {
  it("ordena de más a menos seguidores", () => {
    const conteo = new Map([["b", 5], ["a", 20], ["c", 1]]);
    expect(ordenarPorSeguidores(["a", "b", "c"], conteo)).toEqual(["a", "b", "c"]);
  });
  it("a empate de seguidores (o sin ninguno), conserva el orden de llegada", () => {
    expect(ordenarPorSeguidores(["x", "y", "z"], new Map())).toEqual(["x", "y", "z"]);
  });
  it("respeta el tope", () => {
    expect(TOPE_ARTISTAS_DESTACADOS).toBe(12);
    const ids = Array.from({ length: 20 }, (_, i) => `id${i}`);
    expect(ordenarPorSeguidores(ids, new Map())).toHaveLength(12);
  });
});


// Las respuestas son inventadas; nunca hay conexión real.
afterEach(() => vi.restoreAllMocks());
const f = { artista_id: "a", evento: { id: "e", titulo: "Ensayo", inicio: "2026-10-08T18:00:00Z", zona: "America/Mexico_City", lugar: null, sitio_texto: "Foro", sitio_direccion: null, sitio_reservado: false } };
function respaldo(cambios: Record<string, { data: unknown[] | null; error?: unknown } | Error> = {}) {
  const respuestas = { tira: { data: [] }, eventos_artistas: { data: [f] }, seguimientos: { data: [{ artista_id: "a" }] }, artistas: { data: [{ id: "a", nombre: "Artista", foto: "/a.jpg", disciplina: "musica", tipo: "solista", detalle: null }] }, ...cambios };
  const resolver = (nombre: keyof typeof respuestas) => respuestas[nombre] instanceof Error ? Promise.reject(respuestas[nombre]) : Promise.resolve(respuestas[nombre]);
  const from = vi.fn((nombre: keyof typeof respuestas) => {
    const q = { select: vi.fn(), eq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(), in: vi.fn(), not: vi.fn(), then: (ok: (r: unknown) => unknown, no: (e: unknown) => unknown) => resolver(nombre).then(ok, no) };
    [q.select, q.eq, q.or, q.order, q.limit, q.in, q.not].forEach((m) => m.mockReturnValue(q));
    return q;
  });
  return { from, rpc: vi.fn(() => resolver("tira")) } as unknown as import("@supabase/supabase-js").SupabaseClient;
}
describe("el carril opcional no inventa destacados cuando faltan datos", () => {
  it("con datos completos conserva el respaldo por seguidores", async () => {
    expect(await cargarArtistasDestacados(respaldo(), "San Luis Potosí")).toMatchObject([{ id: "a" }]);
  });
  it.each(["tira", "eventos_artistas", "seguimientos", "artistas"])("un fallo en %s omite el carril sin filtrar detalles a la traza", async (recurso) => {
    const traza = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await cargarArtistasDestacados(respaldo({ [recurso]: { data: null, error: { message: "correo@privado.test" } } }), "ciudad privada");
    expect(r).toEqual([]);
    expect(traza).toHaveBeenCalledWith("[agenda] carril de artistas destacados no disponible");
    expect(JSON.stringify(traza.mock.calls)).not.toMatch(/privado|privada/);
  });
  it("una promesa rechazada también degrada solo este carril", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(cargarArtistasDestacados(respaldo({ seguimientos: new Error("correo@privado.test") }), "San Luis Potosí")).resolves.toEqual([]);
  });
  it("la tira manual no depende de que el recuento de seguidores esté disponible", async () => {
    const b = respaldo({ tira: { data: [{ id: "a", motivo: "elegido", van: 0, hasta: null }] }, seguimientos: { data: null, error: {} } });
    expect(await cargarArtistasDestacados(b, "San Luis Potosí")).toMatchObject([{ id: "a" }]);
    expect(b.from).not.toHaveBeenCalledWith("seguimientos");
  });
});
