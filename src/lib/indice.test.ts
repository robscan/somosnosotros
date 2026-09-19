import { describe, expect, it } from "vitest";
import { letraDe, letraDesdeUrl, LETRAS, ORDEN_LETRAS, rangoDeLetra } from "./indice";

describe("letraDe", () => {
  it("sin acentos ni signos; lo que no empieza con una letra va en «#»", () => {
    expect(["Ángel", "ñandú", "¡Arte!", "3 Tiempos", "zoco", ""].map(letraDe)).toEqual(["A", "N", "A", "#", "Z", "#"]);
  });
});

describe("ORDEN_LETRAS", () => {
  it("las 26 letras y, al final, «#»; sin «Todos»", () => {
    expect(LETRAS).toHaveLength(26);
    expect(ORDEN_LETRAS).toEqual([...LETRAS, "#"]);
  });
});

describe("letraDesdeUrl", () => {
  it("una letra válida (A–Z o #) se conserva en mayúscula; lo demás, o su ausencia, vale la A", () => {
    expect(letraDesdeUrl("m")).toBe("M");
    expect(letraDesdeUrl("#")).toBe("#");
    expect(letraDesdeUrl(undefined)).toBe("A");
    expect(letraDesdeUrl("á")).toBe("A");
    expect(letraDesdeUrl("AB")).toBe("A");
  });
});

describe("rangoDeLetra", () => {
  it("cada letra cubre su propio rango de `nombre_orden`", () => {
    expect(rangoDeLetra("M")).toEqual({ desde: "m", hasta: "n" });
    expect(rangoDeLetra("Z")).toEqual({ desde: "z", hasta: "{" });
  });
  it("«#» cubre lo que no empieza con una letra (dígitos o vacío, siempre antes de «a»)", () => {
    const { desde, hasta } = rangoDeLetra("#");
    expect(hasta).toBe("a");
    expect("3 tiempos" >= desde && "3 tiempos" < hasta).toBe(true);
    expect("" >= desde && "" < hasta).toBe(true);
    expect("abigail" >= hasta).toBe(true);
  });
});
