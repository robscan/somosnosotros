import { describe, expect, it } from "vitest";
import { repartoDeAcciones, MAXIMO_ACCIONES_REPARTIDAS } from "./ficha";

describe("repartoDeAcciones (OL-167, reparto a partir de 3)", () => {
  it("1 o 2, a la izquierda, sin repartir", () => {
    expect(repartoDeAcciones(1)).toBe("izquierda");
    expect(repartoDeAcciones(2)).toBe("izquierda");
  });
  it("3 hasta el máximo, repartidas a todo el ancho", () => {
    expect(repartoDeAcciones(3)).toBe("repartidas");
    expect(repartoDeAcciones(MAXIMO_ACCIONES_REPARTIDAS)).toBe("repartidas");
  });
  it("más del máximo, carril deslizable", () => {
    expect(repartoDeAcciones(MAXIMO_ACCIONES_REPARTIDAS + 1)).toBe("carril");
    expect(repartoDeAcciones(6)).toBe("carril");
  });
});
