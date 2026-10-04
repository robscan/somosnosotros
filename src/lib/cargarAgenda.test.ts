import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarAgenda } from "./cargarAgenda";
import { CIUDAD_INICIAL } from "./ciudad";

vi.mock("./supabase/servidor", () => ({ clienteServidor: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
const fila = { id: "evento", titulo: "Concierto", inicio: "2026-10-07T18:00:00Z", fin: null, zona: "America/Mexico_City", lugar: [] };
type Respuesta = { data: unknown[] | null; error?: unknown } | Error;
const fallo = { data: null, error: { message: "correo@privado.test cuenta-secreta", details: "datos privados" } };
function banco(cambios: Record<string, Respuesta> = {}) {
  const datos: Record<string, Respuesta> = {
    eventos: { data: [fila] }, seguimientos: { data: [{ lugar_id: "lugar", artista_id: "artista" }] },
    asistencias: { data: [{ evento_id: "evento", estado: "voy" }] }, eventos_artistas: { data: [{ evento_id: "evento" }] },
    van_por_evento: { data: [{ evento_id: "evento", n: 3 }] }, tira_destacados: { data: [] }, ...cambios,
  };
  const resolver = (nombre: string) => datos[nombre] instanceof Error ? Promise.reject(datos[nombre]) : Promise.resolve(datos[nombre]);
  const from = vi.fn((nombre: string) => {
    const q = { select: vi.fn(), eq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(), in: vi.fn(), then: (ok: (r: Respuesta) => unknown, no: (e: unknown) => unknown) => resolver(nombre).then(ok, no) };
    for (const metodo of [q.select, q.eq, q.or, q.order, q.limit, q.in]) metodo.mockReturnValue(q);
    return q;
  });
  const rpc = vi.fn((nombre: string) => resolver(nombre));
  return { cliente: { from, rpc } as unknown as SupabaseClient, from, rpc };
}

describe("Agenda distingue fallos de una lista vacía", () => {
  it("una respuesta vacía real es una agenda válida; no pide recuentos", async () => {
    const b = banco({ eventos: { data: [], error: null } });
    expect((await cargarAgenda(CIUDAD_INICIAL, null, b.cliente)).eventos).toEqual([]);
    expect(b.rpc).not.toHaveBeenCalledWith("van_por_evento", expect.anything());
  });
  it.each([fallo, new Error("correo@privado.test"), { data: null }])("un error principal no se presenta como vacío (%j)", async (respuesta) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = banco({ eventos: respuesta });
    await expect(cargarAgenda(CIUDAD_INICIAL, null, b.cliente)).rejects.toThrow("No pudimos cargar la agenda.");
    expect(b.rpc).not.toHaveBeenCalledWith("van_por_evento", expect.anything());
  });
  it("sin cliente configurado también pide reintentar", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(cargarAgenda(CIUDAD_INICIAL, null, null)).rejects.toThrow("No pudimos cargar la agenda.");
  });
  it.each([fallo, new Error("correo@privado.test"), { data: null }])("recuento fallido conserva eventos con cantidad desconocida (%j)", async (respuesta) => {
    const traza = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await cargarAgenda(CIUDAD_INICIAL, "cuenta-secreta", banco({ van_por_evento: respuesta }).cliente);
    expect(r.eventos).toMatchObject([{ id: "evento", lugar: null, van: null }]);
    expect(r.asistencias).toEqual({ evento: "voy" });
    expect(r.seguidos).toEqual(["lugar"]);
    expect(r.artistasSeguidos).toEqual(["artista"]);
    expect(JSON.stringify(traza.mock.calls)).not.toMatch(/privado|secreta/);
    expect(traza).toHaveBeenCalled();
  });
  it("cero confirmado y recuento positivo siguen siendo números", async () => {
    expect((await cargarAgenda(CIUDAD_INICIAL, null, banco({ van_por_evento: { data: [] } }).cliente)).eventos[0].van).toBe(0);
    expect((await cargarAgenda(CIUDAD_INICIAL, null, banco().cliente)).eventos[0].van).toBe(3);
  });
  it.each(["seguimientos", "asistencias", "eventos_artistas"])("si falla %s con sesión, no inventa decisiones vacías", async (tabla) => {
    const traza = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(cargarAgenda(CIUDAD_INICIAL, "cuenta-secreta", banco({ [tabla]: fallo }).cliente)).rejects.toThrow("No pudimos cargar la agenda.");
    expect(JSON.stringify(traza.mock.calls)).not.toMatch(/privado|secreta/);
  });
  it("los destacados son opcionales: un fallo no oculta los eventos", async () => {
    const traza = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await cargarAgenda(CIUDAD_INICIAL, null, banco({ tira_destacados: fallo }).cliente);
    expect(r.eventos).toHaveLength(1);
    expect(r.destacados).toEqual([]);
    expect(traza).toHaveBeenCalled();
  });
});
