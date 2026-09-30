import { describe, expect, it } from "vitest";
import { agruparPorLetra, gruposConPosicion, idGrupo, letraDe } from "./indice";

describe("letraDe", () => {
  it("sin acentos ni signos; lo que no empieza con una letra va en «#»", () => {
    expect(["Ángel", "ñandú", "¡Arte!", "3 Tiempos", "zoco", ""].map(letraDe)).toEqual(["A", "N", "A", "#", "Z", "#"]);
  });
});

describe("agruparPorLetra", () => {
  it("parte la lista en un grupo por cada racha de la misma letra, en el orden real de la lista", () => {
    const grupos = agruparPorLetra(["3 Tiempos", "Ana", "Álvaro", "Beto", "Bruno", "Carla"], (x) => x);
    expect(grupos).toEqual([
      { letra: "#", items: ["3 Tiempos"] },
      { letra: "A", items: ["Ana", "Álvaro"] },
      { letra: "B", items: ["Beto", "Bruno"] },
      { letra: "C", items: ["Carla"] },
    ]);
  });
  it("sin nada, no hay grupos", () => expect(agruparPorLetra([], (x: string) => x)).toEqual([]));
});

describe("idGrupo", () => {
  it("el id del encabezado; «#» no lleva el símbolo", () => {
    expect(idGrupo("M")).toBe("grupo-M");
    expect(idGrupo("#")).toBe("grupo-num");
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
