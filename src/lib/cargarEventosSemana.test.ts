import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarEventosSemana } from "./cargarEventosSemana";

const ahora = new Date("2026-09-18T18:00:00Z");
const evento = { id: "evento", inicio: "2026-09-19T01:00:00Z", termina: "2026-09-19T06:00:00Z", zona: "America/Mexico_City", visible: true, lugar_id: null, lugar: null };
const artista = (id: string) => ({ artista: { id, nombre: id, foto: null, visible: true }, evento });

function banco(paginas: { data: unknown[] | null; error: object | null }[]) {
  const abortSignal = vi.fn().mockImplementation(() => Promise.resolve(paginas.shift()));
  const consulta = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(), abortSignal,
  };
  const from = vi.fn().mockReturnValue(consulta);
  return { cliente: { from } as unknown as SupabaseClient, consulta, from, abortSignal };
}

describe("lectura semanal independiente de la página del directorio", () => {
  it("lee más allá de 500 relaciones y no pierde al artista cuya primera fecha llega en otro lote", async () => {
    const { cliente, consulta } = banco([
      { data: Array.from({ length: 500 }, () => artista("repetido")), error: null },
      { data: [artista("en-segundo-lote")], error: null },
    ]);
    const r = await cargarEventosSemana(cliente, "artistas", "San Luis Potosí", ahora);
    expect(r.map((x) => x.id)).toEqual(["en-segundo-lote", "repetido"]);
    expect(consulta.range.mock.calls).toEqual([[0, 499], [500, 999]]);
    expect(consulta.eq).toHaveBeenCalledWith("artista.ciudad", "San Luis Potosí");
    expect(consulta.eq).toHaveBeenCalledWith("evento.ciudad", "San Luis Potosí");
    expect(consulta.eq).toHaveBeenCalledWith("evento.visible", true);
  });
  it("un fallo en el segundo lote descarta el carril parcial", async () => {
    const { cliente } = banco([
      { data: Array.from({ length: 500 }, () => artista("repetido")), error: null },
      { data: null, error: { message: "sin red" } },
    ]);
    expect(await cargarEventosSemana(cliente, "artistas", "San Luis Potosí", ahora)).toEqual([]);
  });
  it("agotar el presupuesto global de filas no muestra el ranking parcial ni abre una tercera consulta", async () => {
    const { cliente, consulta } = banco([
      { data: Array.from({ length: 500 }, () => artista("repetido")), error: null },
      { data: Array.from({ length: 500 }, () => artista("todavia-repetido")), error: null },
    ]);
    expect(await cargarEventosSemana(cliente, "artistas", "San Luis Potosí", ahora)).toEqual([]);
    expect(consulta.range.mock.calls).toEqual([[0, 499], [500, 999]]);
  });
  it("el límite de consultas es global aunque sobren filas", async () => {
    const { cliente, consulta } = banco([{ data: Array.from({ length: 500 }, () => artista("repetido")), error: null }]);
    expect(await cargarEventosSemana(cliente, "artistas", "San Luis Potosí", ahora, { consultas: 1 })).toEqual([]);
    expect(consulta.range.mock.calls).toEqual([[0, 499]]);
  });
  it("al vencer, aborta el transporte suspendido y devuelve sin esperar el carril", async () => {
    const estado = { senal: null as AbortSignal | null };
    const consulta = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockImplementation((signal: AbortSignal) => {
        estado.senal = signal;
        return new Promise(() => undefined);
      }),
    };
    const cliente = { from: vi.fn().mockReturnValue(consulta) } as unknown as SupabaseClient;
    await expect(cargarEventosSemana(cliente, "artistas", "San Luis Potosí", ahora, { esperaMs: 1 })).resolves.toEqual([]);
    expect(consulta.abortSignal).toHaveBeenCalledOnce();
    expect(estado.senal?.aborted).toBe(true);
  });
  it("en la frontera exacta conserva el carril completo", async () => {
    const { cliente, consulta } = banco([
      { data: Array.from({ length: 500 }, () => artista("repetido")), error: null },
      { data: [artista("segunda-pagina")], error: null },
    ]);
    expect((await cargarEventosSemana(cliente, "artistas", "San Luis Potosí", ahora, { filas: 501 })).map((x) => x.id)).toEqual(["repetido", "segunda-pagina"]);
    expect(consulta.range.mock.calls).toEqual([[0, 499], [500, 999]]);
  });
  it("lugares públicos de la ciudad: filtros en consulta y portada en tarjeta", async () => {
    const { cliente, consulta, from } = banco([{ data: [{ ...evento, lugar_id: "l", lugar: { id: "l", nombre: "Foro", portada: "/foro.jpg", visible: true, privado: false } }], error: null }]);
    expect(await cargarEventosSemana(cliente, "lugares", "San Luis Potosí", ahora)).toMatchObject([{ id: "l", foto: "/foro.jpg", href: "/lugares/l" }]);
    expect(from).toHaveBeenCalledWith("eventos");
    expect(consulta.eq).toHaveBeenCalledWith("lugar.privado", false);
    expect(consulta.eq).toHaveBeenCalledWith("lugar.visible", true);
    expect(consulta.eq).toHaveBeenCalledWith("lugar.ciudad", "San Luis Potosí");
  });
  it("sin conexión configurada devuelve un carril vacío", async () => {
    expect(await cargarEventosSemana(null, "lugares", "San Luis Potosí", ahora)).toEqual([]);
  });
});
