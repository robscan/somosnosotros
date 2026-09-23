import { describe, expect, it } from "vitest";
import { cabenRepartidas, MAXIMO_ACCIONES_REPARTIDAS } from "./ficha";

describe("cabenRepartidas (OL-163, reparto de los círculos de la ficha)", () => {
  it("uno o los que quepan hasta el máximo, repartidos", () => {
    expect(cabenRepartidas(1)).toBe(true);
    expect(cabenRepartidas(2)).toBe(true);
    expect(cabenRepartidas(MAXIMO_ACCIONES_REPARTIDAS)).toBe(true);
  });
  it("más del máximo, carril deslizable", () => {
    expect(cabenRepartidas(MAXIMO_ACCIONES_REPARTIDAS + 1)).toBe(false);
    expect(cabenRepartidas(6)).toBe(false);
  });
});
