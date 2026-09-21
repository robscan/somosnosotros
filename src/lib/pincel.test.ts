import { describe, expect, it } from "vitest";
import { esMensajeTrazoValido, nombreSugerido } from "./pincel";

describe("pincel", () => {
  it("sugiere el nombre a partir del lugar", () => {
    expect(nombreSugerido("Centro de las Artes")).toBe("Pincel en Centro de las Artes");
  });
});

describe("esMensajeTrazoValido", () => {
  it("acepta un mensaje bien formado", () => {
    expect(esMensajeTrazoValido({ trazo: "spray", color: "#e4552f", dx: 0.4, dy: -0.2 })).toBe(true);
  });
  it("rechaza un trazo que no existe", () => {
    expect(esMensajeTrazoValido({ trazo: "acuarela", color: "#141414", dx: 0, dy: 0 })).toBe(false);
  });
  it("rechaza un color que no es una de las cinco tintas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#ffffff", dx: 0, dy: 0 })).toBe(false);
  });
  it("rechaza dx/dy fuera de -1..1 (no es una coordenada absoluta)", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", dx: 42, dy: 0 })).toBe(false);
  });
  it("rechaza dx/dy no numéricos", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", dx: "0.5", dy: 0 })).toBe(false);
  });
  it("rechaza cualquier cosa que no sea un objeto", () => {
    expect(esMensajeTrazoValido(null)).toBe(false);
    expect(esMensajeTrazoValido("trazo")).toBe(false);
    expect(esMensajeTrazoValido(undefined)).toBe(false);
  });
});
