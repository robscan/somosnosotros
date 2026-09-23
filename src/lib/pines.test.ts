import { describe, expect, it } from "vitest";
import { colorPin, radioPin, RADIO_MEDIANO, RADIO_PEQUENO, type EstadoLugarPin } from "./pines";

const colores = { tinta: "#1a1a1a", primario: "#6d34c8", destacado: "#d35400", seguido: "#1f6f43", privado: "#5c5c5c" };

function estado(parcial: Partial<EstadoLugarPin>): EstadoLugarPin {
  return { dia: null, privado: false, seguido: false, destacado: false, ...parcial };
}

describe("radioPin", () => {
  it("sin evento esta semana, el pin es chico", () => {
    expect(radioPin({ dia: null })).toBe(RADIO_PEQUENO);
  });

  it("con evento esta semana (el día encima), el pin es grande, sea o no seguido o destacado", () => {
    expect(radioPin({ dia: "Hoy" })).toBe(RADIO_MEDIANO);
  });
});

describe("colorPin", () => {
  it("sin seguir y sin eventos: tinta", () => {
    expect(colorPin(estado({}), colores)).toBe(colores.tinta);
  });

  it("con evento esta semana, sin seguir ni destacar: el color de acción (primario)", () => {
    expect(colorPin(estado({ dia: "Hoy" }), colores)).toBe(colores.primario);
  });

  it("destacado que no se sigue: naranja, tenga o no evento", () => {
    expect(colorPin(estado({ destacado: true }), colores)).toBe(colores.destacado);
    expect(colorPin(estado({ destacado: true, dia: "Vie" }), colores)).toBe(colores.destacado);
  });

  it("seguido: verde, y gana al destacado y al evento", () => {
    expect(colorPin(estado({ seguido: true }), colores)).toBe(colores.seguido);
    expect(colorPin(estado({ seguido: true, destacado: true, dia: "Hoy" }), colores)).toBe(colores.seguido);
  });

  it("privado: gris, siempre, aunque sea seguido o destacado", () => {
    expect(colorPin(estado({ privado: true, seguido: true, destacado: true, dia: "Hoy" }), colores)).toBe(colores.privado);
  });
});
