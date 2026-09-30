import { describe, expect, it } from "vitest";
import { faltaEnArtista, faltaEnEvento, faltaEnLugar, queFalta } from "./formulario";

describe("queFalta: la nota del botón", () => {
  it("sin nada que falte no hay nota", () => {
    expect(queFalta([])).toBeNull();
    expect(queFalta([false, false])).toBeNull();
  });
  it("una cosa, dos o tres, en el orden en que se piden", () => {
    expect(queFalta(["el nombre"])).toBe("Falta el nombre.");
    expect(queFalta(["el nombre", false, "dónde es"])).toBe("Falta el nombre y dónde es.");
    expect(queFalta(["el nombre", "la fecha", "dónde es"])).toBe("Falta el nombre, la fecha y dónde es.");
  });
});

describe("qué falta en cada alta", () => {
  it("evento: el nombre y dónde es, y se actualiza al completar", () => {
    expect(faltaEnEvento({ nombre: "", donde: "falta" })).toBe("Falta el nombre y dónde es.");
    expect(faltaEnEvento({ nombre: "   ", donde: "falta" })).toBe("Falta el nombre y dónde es.");
    expect(faltaEnEvento({ nombre: "Concierto", donde: "falta" })).toBe("Falta dónde es.");
    expect(faltaEnEvento({ nombre: "", donde: "listo" })).toBe("Falta el nombre.");
    expect(faltaEnEvento({ nombre: "Concierto", donde: "listo" })).toBeNull();
  });
  it("evento: un sitio leído del cartel pide confirmar, no «dónde es»", () => {
    expect(faltaEnEvento({ nombre: "Concierto", donde: "por-confirmar" })).toBe("Falta confirmar dónde es.");
    expect(faltaEnEvento({ nombre: "", donde: "por-confirmar" })).toBe("Falta el nombre y confirmar dónde es.");
  });
  it("lugar: el nombre y dónde está (el tipo se deduce y no detiene)", () => {
    expect(faltaEnLugar({ nombre: "", ubicado: false })).toBe("Falta el nombre y dónde está.");
    expect(faltaEnLugar({ nombre: "Foro del Carmen", ubicado: false })).toBe("Falta dónde está.");
    expect(faltaEnLugar({ nombre: "", ubicado: true })).toBe("Falta el nombre.");
    expect(faltaEnLugar({ nombre: "Foro del Carmen", ubicado: true })).toBeNull();
  });
  it("artista: solo el nombre, y que no esté ya registrado en su ciudad", () => {
    expect(faltaEnArtista({ nombre: "", repetido: false })).toBe("Falta el nombre.");
    expect(faltaEnArtista({ nombre: " Los Vecinos ", repetido: false })).toBeNull();
    expect(faltaEnArtista({ nombre: "Los Vecinos", repetido: true })).toBe("Ese artista ya está registrado.");
  });
});
