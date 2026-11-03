import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REFRESCO_MS } from "@/lib/redes/reglas";
import { hayCambio, sondear, type Estados } from "./sondeo";

// OL-506: el sondeo de `useAlDia` con un reloj falso: cada 2 s, solo con algo en camino, y entrega el estado en vez de refrescar.
describe("OL-506 · sondeo de la cola", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const armar = (vivos: { id: string; reintentando: boolean }[], respuestas: Estados[], visible = () => true) => {
    const preguntas: string[][] = [];
    const entregas: Estados[] = [];
    const s = sondear(vivos, {
      preguntar: async (ids) => {
        preguntas.push(ids);
        return respuestas.shift() ?? {};
      },
      alCambiar: (m) => entregas.push(m),
      visible,
      cada: REFRESCO_MS,
    });
    return { s, preguntas, entregas };
  };

  it("pregunta cada 2 s mientras algo va en camino y entrega el estado nuevo al terminar", async () => {
    const publicado = { t1: { estado: "publicado" as const, reintentando: false } };
    const { s, preguntas, entregas } = armar([{ id: "t1", reintentando: false }], [{ t1: { estado: "en_cola", reintentando: false } }, publicado]);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(preguntas).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(preguntas).toEqual([["t1"]]);
    expect(entregas).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(preguntas).toHaveLength(2);
    expect(entregas).toEqual([publicado]);
    s.parar();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(preguntas).toHaveLength(2);
  });

  it("sin nada en camino no pregunta nada; con la pantalla oculta tampoco", async () => {
    const vacio = armar([], []);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vacio.preguntas).toHaveLength(0);
    const oculto = armar([{ id: "t1", reintentando: false }], [], () => false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(oculto.preguntas).toHaveLength(0);
  });

  it("al volver a la app pregunta en seguida; nunca dos preguntas a la vez", async () => {
    let soltar: (m: Estados) => void = () => undefined;
    const preguntas: string[][] = [];
    const s = sondear([{ id: "t1", reintentando: false }], {
      preguntar: (ids) => {
        preguntas.push(ids);
        return new Promise((ok) => (soltar = ok));
      },
      alCambiar: () => undefined,
      visible: () => true,
      cada: REFRESCO_MS,
    });
    s.pregunta();
    expect(preguntas).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(preguntas).toHaveLength(1);
    soltar({});
    await vi.advanceTimersByTimeAsync(2_000);
    expect(preguntas).toHaveLength(2);
    s.parar();
  });

  it("cambio: terminó (publicado o no) o pasó a otro intento", () => {
    const vivos = [{ id: "t1", reintentando: false }];
    expect(hayCambio(vivos, { t1: { estado: "publicando", reintentando: false } })).toBe(false);
    expect(hayCambio(vivos, { t1: { estado: "publicando", reintentando: true } })).toBe(true);
    expect(hayCambio(vivos, { t1: { estado: "fallido", reintentando: false } })).toBe(true);
    expect(hayCambio(vivos, {})).toBe(false);
  });
});
