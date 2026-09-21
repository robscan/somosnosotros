import { describe, expect, it } from "vitest";
import { conectarCanal, percentil } from "./simulador-mandos.mjs";

/** Canal falso: dispara la secuencia de estados dada, cada uno un poco después del anterior. */
function canalFalso(secuencia: string[], intervaloMs = 5) {
  return {
    subscribe(cb: (estado: string) => void) {
      secuencia.forEach((estado, i) => setTimeout(() => cb(estado), intervaloMs * (i + 1)));
    },
  };
}

describe("conectarCanal", () => {
  it("resuelve ok al recibir SUBSCRIBED", async () => {
    const r = await conectarCanal(canalFalso(["SUBSCRIBED"]));
    expect(r).toEqual({ ok: true, estado: "SUBSCRIBED" });
  });

  it("ignora un CLOSED que llega DESPUÉS de SUBSCRIBED: es un cierre ordenado, no un error (el bug medido el 2026-09-21)", async () => {
    const r = await conectarCanal(canalFalso(["SUBSCRIBED", "CLOSED"], 5));
    expect(r).toEqual({ ok: true, estado: "SUBSCRIBED" });
  });

  it("ignora también CHANNEL_ERROR/TIMED_OUT que llegan después de SUBSCRIBED", async () => {
    const r = await conectarCanal(canalFalso(["SUBSCRIBED", "CHANNEL_ERROR"], 5));
    expect(r).toEqual({ ok: true, estado: "SUBSCRIBED" });
  });

  it("cuenta CHANNEL_ERROR como fallo si llega antes de conectar", async () => {
    const r = await conectarCanal(canalFalso(["CHANNEL_ERROR"]));
    expect(r).toEqual({ ok: false, estado: "CHANNEL_ERROR" });
  });

  it("cuenta TIMED_OUT como fallo si llega antes de conectar", async () => {
    const r = await conectarCanal(canalFalso(["TIMED_OUT"]));
    expect(r).toEqual({ ok: false, estado: "TIMED_OUT" });
  });

  it("cuenta un CLOSED que llega ANTES de SUBSCRIBED como fallo real: nunca llegó a abrir", async () => {
    const r = await conectarCanal(canalFalso(["CLOSED"]));
    expect(r).toEqual({ ok: false, estado: "CLOSED" });
  });

  it("solo resuelve una vez, aunque lleguen varios estados seguidos", async () => {
    let llamadas = 0;
    const original = conectarCanal;
    const p = original(canalFalso(["SUBSCRIBED", "CLOSED", "CLOSED", "CHANNEL_ERROR"], 3));
    p.then(() => llamadas++);
    await p;
    await new Promise((r) => setTimeout(r, 20)); // deja pasar los estados tardíos, no deberían romper nada
    expect(llamadas).toBe(1);
  });

  it("se rinde con el temporizador si el canal nunca manda ningún estado (no se cuelga la corrida)", async () => {
    const r = await conectarCanal({ subscribe() {} }, { timeoutMs: 20 });
    expect(r).toEqual({ ok: false, estado: "TIMEOUT_LOCAL" });
  });
});

describe("percentil", () => {
  it("la mediana de una lista ordenada", () => {
    expect(percentil([10, 20, 30, 40, 50], 50)).toBe(30);
  });
  it("el p95 de una lista ordenada", () => {
    expect(percentil(Array.from({ length: 100 }, (_, i) => i + 1), 95)).toBe(95);
  });
  it("una lista vacía da null", () => {
    expect(percentil([], 50)).toBe(null);
  });
});
