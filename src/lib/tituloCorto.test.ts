import { describe, expect, it } from "vitest";
import { comoOracion, tituloCorto } from "./tituloCorto";

describe("comoOracion (OL-370, E1 firmado)", () => {
  it("un título escrito entero en mayúsculas pasa a oración", () => {
    expect(comoOracion("DESIERTO")).toBe("Desierto");
    expect(comoOracion("CINEMA")).toBe("Cinema");
    expect(comoOracion("MERK LOCAL EDICIÓN CATRINAS")).toBe("Merk local edición catrinas");
    expect(comoOracion("LXS COLOCAOS")).toBe("Lxs colocaos");
    expect(comoOracion("¡KOWAIFEST!")).toBe("¡Kowaifest!");
  });
  it("un título con minúsculas no se toca: las siglas se quedan", () => {
    expect(comoOracion("Festival de Cine UASLP")).toBe("Festival de Cine UASLP");
    expect(comoOracion("XV Festival de Cine México-Alemania")).toBe("XV Festival de Cine México-Alemania");
    expect(comoOracion("Tributo a The Beatles con Help!")).toBe("Tributo a The Beatles con Help!");
    expect(comoOracion("Noche  de  ROCK")).toBe("Noche  de  ROCK");
    expect(comoOracion("Día de la ÑANDUTÍ")).toBe("Día de la ÑANDUTÍ");
  });
  it("con menos de cuatro letras se queda como viene (suele ser una sigla)", () => {
    expect(comoOracion("OCA")).toBe("OCA");
    expect(comoOracion("XV")).toBe("XV");
  });
});

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
