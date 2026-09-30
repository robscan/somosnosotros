import { describe, expect, it } from "vitest";
import { resultadosPerdidos } from "./mapa";

describe("resultadosPerdidos: ¿ningún lugar cae en lo que se ve del mapa?", () => {
  // Un mapa de 390×500 con la hoja tapando 200 px por abajo: lo que se ve es de 0,0 a 390,300.
  const mapa = { ancho: 390, alto: 500 };
  const tapa = 200;

  it("con un lugar a la vista no hay nada perdido, aunque los demás estén lejos", () => {
    expect(resultadosPerdidos([{ x: 100, y: 100 }], mapa, tapa)).toBe(false);
    expect(resultadosPerdidos([{ x: -500, y: -500 }, { x: 390, y: 300 }, { x: 900, y: 900 }], mapa, tapa)).toBe(false);
  });

  it("los bordes de lo que se ve cuentan como a la vista", () => {
    expect(resultadosPerdidos([{ x: 0, y: 0 }], mapa, tapa)).toBe(false);
    expect(resultadosPerdidos([{ x: 390, y: 300 }], mapa, tapa)).toBe(false);
  });

  it("si todos quedan fuera por un lado, están perdidos", () => {
    expect(resultadosPerdidos([{ x: -1, y: 100 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 391, y: 100 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: -1 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: 800 }, { x: -20, y: 40 }], mapa, tapa)).toBe(true);
  });

  it("lo que la hoja tapa no se ve: un lugar debajo de ella está perdido, y sin hoja sí se ve", () => {
    expect(resultadosPerdidos([{ x: 100, y: 400 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: 301 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: 400 }], mapa, 0)).toBe(false);
  });

  it("sin lugares no hay nada perdido que encuadrar", () => {
    expect(resultadosPerdidos([], mapa, tapa)).toBe(false);
  });
});
