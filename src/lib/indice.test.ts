import { describe, expect, it } from "vitest";
import { conGrupos, gruposConPosicion, idGrupo, letraDe, letrasPresentes } from "./indice";

describe("letraDe", () => {
  it("sin acentos ni signos; lo que no empieza con una letra va en «#»", () => {
    expect(["Ángel", "ñandú", "¡Arte!", "3 Tiempos", "zoco", ""].map(letraDe)).toEqual(["A", "N", "A", "#", "Z", "#"]);
  });
});

describe("idGrupo", () => {
  it("el id del encabezado; «#» no lleva el símbolo", () => {
    expect(idGrupo("M")).toBe("grupo-M");
    expect(idGrupo("#")).toBe("grupo-num");
  });
});

describe("conGrupos", () => {
  it("marca solo el primero de cada letra, en el orden real de la lista (no fuerza A–Z)", () => {
    const g = conGrupos(["Zoco", "1 Uno", "Álamo", "Arte", "Beta"], (x) => x).map((f) => f.grupo);
    expect(g).toEqual(["Z", "#", "A", null, "B"]);
  });
});

describe("letrasPresentes", () => {
  it("solo las letras con algo, en el orden en que aparecen", () => {
    expect(letrasPresentes(["Beta", "Banana", "Ébano", "3 Tiempos"], (x) => x)).toEqual(["B", "E", "#"]);
    expect(letrasPresentes([], (x: string) => x)).toEqual([]);
  });
});

describe("gruposConPosicion", () => {
  it("en qué índice (0-based) empieza cada letra, en una lista ya ordenada", () => {
    expect(gruposConPosicion(["ana", "andres", "beto", "carla", "carlos"], (x) => x)).toEqual([
      { letra: "A", desde: 0 },
      { letra: "B", desde: 2 },
      { letra: "C", desde: 3 },
    ]);
  });
  it("vacía, sin grupos", () => {
    expect(gruposConPosicion([], (x: string) => x)).toEqual([]);
  });
});
