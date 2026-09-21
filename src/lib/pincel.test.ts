import { describe, expect, it } from "vitest";
import { DELTAS_MAX_POR_MENSAJE, esMensajeTrazoValido, nombreSugerido } from "./pincel";

describe("pincel", () => {
  it("sugiere el nombre a partir del lugar", () => {
    expect(nombreSugerido("Centro de las Artes")).toBe("Pincel en Centro de las Artes");
  });
});

describe("esMensajeTrazoValido", () => {
  it("acepta un mensaje bien formado con un delta", () => {
    expect(esMensajeTrazoValido({ trazo: "spray", color: "#e4552f", deltas: [{ dx: 0.4, dy: -0.2 }] })).toBe(true);
  });
  it("acepta varios deltas juntados en un mismo mensaje (envío agrupado)", () => {
    const deltas = [
      { dx: 0.1, dy: 0.1 },
      { dx: -0.2, dy: 0.05 },
      { dx: 0.05, dy: -0.3 },
    ];
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas })).toBe(true);
  });
  it("rechaza un trazo que no existe", () => {
    expect(esMensajeTrazoValido({ trazo: "acuarela", color: "#141414", deltas: [{ dx: 0, dy: 0 }] })).toBe(false);
  });
  it("rechaza un color que no es una de las cinco tintas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#ffffff", deltas: [{ dx: 0, dy: 0 }] })).toBe(false);
  });
  it("rechaza un mensaje sin deltas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [] })).toBe(false);
  });
  it(`rechaza más de ${DELTAS_MAX_POR_MENSAJE} deltas en un mismo mensaje`, () => {
    const deltas = Array.from({ length: DELTAS_MAX_POR_MENSAJE + 1 }, () => ({ dx: 0, dy: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas })).toBe(false);
  });
  it(`acepta justo ${DELTAS_MAX_POR_MENSAJE} deltas`, () => {
    const deltas = Array.from({ length: DELTAS_MAX_POR_MENSAJE }, () => ({ dx: 0, dy: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas })).toBe(true);
  });
  it("rechaza un delta fuera de -1..1 (no es una coordenada absoluta)", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: 42, dy: 0 }] })).toBe(false);
  });
  it("rechaza un delta no numérico", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: "0.5", dy: 0 }] })).toBe(false);
  });
  it("rechaza deltas que no es un arreglo", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: { dx: 0, dy: 0 } })).toBe(false);
  });
  it("rechaza cualquier cosa que no sea un objeto", () => {
    expect(esMensajeTrazoValido(null)).toBe(false);
    expect(esMensajeTrazoValido("trazo")).toBe(false);
    expect(esMensajeTrazoValido(undefined)).toBe(false);
  });
});
