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

describe("el horario por día de cada evento (OL-320)", () => {
  const sesiones = [
    { inicio: "2026-10-07T18:00:00Z", fin: "2026-10-07T20:00:00Z" },
    { inicio: "2026-10-14T18:00:00Z", fin: "2026-10-14T20:00:00Z" },
  ];
  const taller = { ...fila, id: "taller", inicio: sesiones[0].inicio, fin: sesiones[1].fin, sesiones };
  it("pide las sesiones en la misma consulta de los eventos y las deja en el evento si todavía le corresponden", async () => {
    const b = banco({ eventos: { data: [taller, { ...fila, sesiones: [] }, { ...fila, id: "sin-campo" }] } });
    const r = await cargarAgenda(CIUDAD_INICIAL, null, b.cliente);
    expect(b.from).toHaveBeenCalledWith("eventos");
    const select = (b.from.mock.results[0].value as { select: { mock: { calls: string[][] } } }).select.mock.calls[0][0];
    expect(select).toContain("sesiones:eventos_sesiones(inicio, fin)");
    expect(r.eventos.find((e) => e.id === "taller")?.sesiones).toEqual(sesiones);
    // casi todos viajan sin ellas: ni la propiedad
    expect(r.eventos.find((e) => e.id === "evento")).not.toHaveProperty("sesiones");
    expect(r.eventos.find((e) => e.id === "sin-campo")).not.toHaveProperty("sesiones");
  });
  it("las sesiones de un evento que se editó después y ya no coinciden con sus días se ignoran", async () => {
    const editado = { ...taller, inicio: "2026-10-09T18:00:00Z" };
    const r = await cargarAgenda(CIUDAD_INICIAL, null, banco({ eventos: { data: [editado] } }).cliente);
    expect(r.eventos[0]).not.toHaveProperty("sesiones");
  });
});

describe("señal preventiva de capacidad", () => {
  it.each([269, 270, 300])("%i eventos: avisa desde el90% sin registrar ciudad ni cuenta", async (n) => {
    const traza = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = banco({ eventos: { data: Array.from({ length: n }, (_, i) => ({ ...fila, id: `evento-${i}` })) } });
    const r = await cargarAgenda(CIUDAD_INICIAL, null, b.cliente);
    expect(r.eventos).toHaveLength(n);
    expect(traza).toHaveBeenCalledTimes(n >= 270 ? 1 : 0);
    if (n >= 270) expect(traza).toHaveBeenCalledWith("[agenda] capacidad: lectura al 90% del tope");
  });
});

describe("por clase (OL-322): la clase, el horario de cada exposición y el programa de cada festival", () => {
  const expo = { ...fila, id: "expo", clase: "exposicion", lugar_id: "muni", fin: "2026-10-31T05:59:00Z" };
  const propia = { ...expo, id: "propia" };
  const marco = { ...fila, id: "marco", clase: "festival" };
  const actos = [1, 2].map((n) => ({ ...fila, id: `acto${n}`, evento_padre_id: "marco" }));
  const horarios = {
    lugares_horarios: { data: [{ lugar_id: "muni", dias: [2, 3, 4, 5, 6, 7], abre: "10:00:00", cierra: "18:00:00" }] },
    eventos_horarios: { data: [{ evento_id: "propia", dias: [6, 7], abre: "11:00:00", cierra: "15:00:00" }] },
  };
  it("pide la clase y el festival en la misma consulta; el horario que vale (propio, o el del lugar) y cuántos actos tiene cada marco", async () => {
    const b = banco({ eventos: { data: [expo, propia, marco, ...actos] }, ...horarios });
    const r = await cargarAgenda(CIUDAD_INICIAL, null, b.cliente);
    const select = (b.from.mock.results[0].value as { select: { mock: { calls: string[][] } } }).select.mock.calls[0][0];
    expect(select).toContain("clase, evento_padre_id");
    expect(r.eventos.find((e) => e.id === "expo")?.horario).toEqual([{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }]);
    expect(r.eventos.find((e) => e.id === "propia")?.horario).toEqual([{ dias: [6, 7], abre: "11:00", cierra: "15:00" }]);
    // El doble devuelve las mismas filas a la consulta del programa: cuenta las que apuntan al marco.
    expect(r.eventos.find((e) => e.id === "marco")?.programa).toEqual({ registrados: 2 });
    expect(r.eventos.find((e) => e.id === "acto1")).not.toHaveProperty("programa");
    expect(r.eventos.find((e) => e.id === "acto1")).not.toHaveProperty("horario");
  });
  it("sin exposiciones ni festivales no pide nada más", async () => {
    const b = banco();
    await cargarAgenda(CIUDAD_INICIAL, null, b.cliente);
    expect(b.from).not.toHaveBeenCalledWith("eventos_horarios");
    expect(b.from).not.toHaveBeenCalledWith("lugares_horarios");
    expect(b.from).toHaveBeenCalledTimes(1);
  });
  it("sin poder leer el horario, la exposición no dice nada de él (no «Horario por confirmar») y la agenda sigue", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await cargarAgenda(CIUDAD_INICIAL, null, banco({ eventos: { data: [expo] }, ...horarios, lugares_horarios: fallo }).cliente);
    expect(r.eventos[0]).not.toHaveProperty("horario");
  });
  it("una exposición sin horario propio ni del lugar: horario vacío («Horario por confirmar»)", async () => {
    const r = await cargarAgenda(CIUDAD_INICIAL, null, banco({ eventos: { data: [{ ...expo, lugar_id: null }] }, eventos_horarios: { data: [] } }).cliente);
    expect(r.eventos[0].horario).toEqual([]);
  });
});
