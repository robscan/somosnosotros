import { afterEach, describe, expect, it } from "vitest";
import { pedirSalida, ponerGuardia, quitarGuardia } from "./guardiaSalida";

describe("guardia de salida", () => {
  afterEach(() => quitarGuardia());
  it("sin guardia, Atrás se va solo", () => {
    let fue = 0;
    expect(pedirSalida(() => fue++)).toBe(false);
    expect(fue).toBe(0);
  });
  it("con guardia, Atrás le entrega la salida y ella decide", () => {
    let fue = 0;
    let continuar: (() => void) | null = null;
    ponerGuardia((c) => (continuar = c));
    expect(pedirSalida(() => fue++)).toBe(true);
    expect(fue).toBe(0);
    continuar!();
    expect(fue).toBe(1);
  });
  it("una pantalla no quita la guardia de otra", () => {
    const a = () => {};
    const b = () => {};
    ponerGuardia(a);
    quitarGuardia(b);
    expect(pedirSalida(() => {})).toBe(true);
    quitarGuardia(a);
    expect(pedirSalida(() => {})).toBe(false);
  });
});
