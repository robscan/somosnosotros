import { describe, expect, it } from "vitest";
import { tituloCorto } from "./tituloCorto";

describe("tituloCorto", () => {
  it("corta antes de los dos puntos", () => {
    expect(tituloCorto("La música de la generación trentina: docufilm y conversatorio")).toBe("La música de la generación trentina");
  });
  it("sin dos puntos corta en la coma seguida de minúscula", () => {
    expect(tituloCorto("Presentación de Caracolas para Luciana, de Jacobo Reyna")).toBe("Presentación de Caracolas para Luciana");
  });
  it("una coma dentro del nombre no corta", () => {
    expect(tituloCorto("Verbena, Ritmo y Sabor")).toBe("Verbena, Ritmo y Sabor");
  });
  it("salta el tipo cuando sigue un nombre", () => {
    expect(tituloCorto("Inauguración: Dos siglos a través de la lente")).toBe("Dos siglos a través de la lente");
    expect(tituloCorto("Inauguración: DESIERTO: observación y espacio")).toBe("DESIERTO");
  });
  it("salta el nombre del festival cuando sigue un nombre", () => {
    expect(tituloCorto("CINEMA: El atractivo de la resistencia, función con charla", "CINEMA")).toBe("El atractivo de la resistencia");
  });
  it("se queda con el festival si lo que sigue empieza con minúscula", () => {
    expect(tituloCorto("Verbena, Ritmo y Sabor: verbena musical", "Verbena, Ritmo y Sabor")).toBe("Verbena, Ritmo y Sabor");
  });
  it("sin el nombre del festival no lo salta", () => {
    expect(tituloCorto("CINEMA: El atractivo de la resistencia")).toBe("CINEMA");
  });
  it("quita el punto final y deja un título simple igual", () => {
    expect(tituloCorto("Taller de grabado en el barrio.")).toBe("Taller de grabado en el barrio");
    expect(tituloCorto("Macario")).toBe("Macario");
  });
});
