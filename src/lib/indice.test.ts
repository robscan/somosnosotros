import { describe, expect, it } from "vitest";
import { accionDeLetra, conGrupos, idGrupo, LETRAS, letraDe, letraDestino, letraEnPunto } from "./indice";

describe("letraDe y conGrupos", () => {
  it("agrupa sin acentos ni signos; lo que empieza con número va en #", () => {
    expect(["Ángel", "ñandú", "¡Arte!", "3 Tiempos", "zoco"].map(letraDe)).toEqual(["A", "N", "A", "#", "Z"]);
    expect(idGrupo("#")).toBe("grupo-num");
  });
  it("marca solo el primero de cada letra, en el orden que ya trae la lista", () => {
    const g = conGrupos(["1 Uno", "Álamo", "Arte", "Beta", "Ébano"], (x) => x).map((f) => f.grupo);
    expect(g).toEqual(["#", "A", null, "B", "E"]);
  });
});

describe("letraEnPunto", () => {
  it("reparte la columna entre las 26 letras y no se sale por los extremos", () => {
    expect(LETRAS).toHaveLength(26);
    expect(letraEnPunto(0, 520)).toBe("A");
    expect(letraEnPunto(25, 520)).toBe("B");
    expect(letraEnPunto(519, 520)).toBe("Z");
    expect(letraEnPunto(-40, 520)).toBe("A");
    expect(letraEnPunto(900, 520)).toBe("Z");
  });
});

describe("letraDestino", () => {
  it("sin grupo, la siguiente letra que lo tiene; al final, la última", () => {
    expect(letraDestino("C", ["#", "A", "C", "M"])).toBe("C");
    expect(letraDestino("F", ["A", "C", "M"])).toBe("M");
    expect(letraDestino("Z", ["A", "C", "M"])).toBe("M");
    expect(letraDestino("A", ["#"])).toBeNull();
  });
});

describe("accionDeLetra (Artistas, paginado)", () => {
  const primera = { presentes: ["#", "A", "B", "C"], desde: null, completa: false };
  it("dentro de lo cargado salta; fuera lo pide al servidor", () => {
    expect(accionDeLetra("B", primera)).toEqual({ tipo: "saltar", letra: "B" });
    expect(accionDeLetra("M", primera)).toEqual({ tipo: "cargar", letra: "M" });
  });
  it("desde una letra, lo anterior se pide y la A vuelve al principio", () => {
    const desdeM = { presentes: ["M", "N", "O", "P", "R"], desde: "M", completa: false };
    expect(accionDeLetra("Q", desdeM)).toEqual({ tipo: "saltar", letra: "R" });
    expect(accionDeLetra("C", desdeM)).toEqual({ tipo: "cargar", letra: "C" });
    expect(accionDeLetra("A", desdeM)).toEqual({ tipo: "cargar", letra: null });
    expect(accionDeLetra("T", desdeM)).toEqual({ tipo: "cargar", letra: "T" });
  });
  it("con la lista completa, todo es salto, aunque la letra no tenga grupo", () => {
    const todo = { presentes: ["A", "C", "M"], desde: null, completa: true };
    expect(accionDeLetra("Z", todo)).toEqual({ tipo: "saltar", letra: "M" });
    expect(accionDeLetra("B", todo)).toEqual({ tipo: "saltar", letra: "C" });
  });
});
