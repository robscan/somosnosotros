import { describe, expect, it } from "vitest";
import { tiempoEnMs } from "./movimiento";

describe("tiempoEnMs: lo que el minificador hace con las duraciones de globals.css", () => {
  it("lee los milisegundos tal cual y los segundos que deja el minificador (800ms sale como .8s)", () => {
    expect(tiempoEnMs("800ms")).toBe(800);
    expect(tiempoEnMs(" 366ms ")).toBe(366);
    expect(tiempoEnMs(".8s")).toBe(800);
    expect(tiempoEnMs("0.366s")).toBe(366);
  });
});
