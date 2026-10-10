import { describe, expect, it } from "vitest";
import { conAlfa, paletaDePixeles, paletaPropia, PALETAS_PROPIAS } from "./coloresCartel";

/** Píxeles RGBA sintéticos: `n` veces el color dado. */
const pixeles = (...grupos: [number, [number, number, number, number?]][]) => grupos.flatMap(([n, [r, g, b, a = 255]]) => Array.from({ length: n }, () => [r, g, b, a]).flat());
const luminancia = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3;
};

describe("paletaDePixeles", () => {
  it("un cartel azul con un toque naranja: fondo azul oscuro y el naranja entre las luces", () => {
    const p = paletaDePixeles(pixeles([280, [30, 60, 200]], [40, [240, 120, 20]]))!;
    expect(p).toHaveLength(4);
    const fondo = parseInt(p[0].slice(1), 16);
    expect(fondo & 255).toBeGreaterThan(fondo >> 16); // azul domina
    expect(luminancia(p[0])).toBeLessThan(40); // oscuro: el blanco se lee
    expect(p.slice(1).some((c) => parseInt(c.slice(1), 16) >> 16 > 200)).toBe(true); // hay una luz naranja
  });
  it("un cartel en sepia da sus tonos, no una paleta ajena", () => {
    const p = paletaDePixeles(pixeles([320, [150, 120, 80]]))!;
    for (const c of p) {
      const n = parseInt(c.slice(1), 16);
      expect(n >> 16).toBeGreaterThanOrEqual(n & 255); // más rojo que azul: sepia
    }
  });
  it("blanco y negro: sale de los grises sin romperse", () => {
    const p = paletaDePixeles(pixeles([160, [0, 0, 0]], [160, [255, 255, 255]]))!;
    expect(p.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
  });
  it("los transparentes no cuentan; sin píxeles, null", () => {
    expect(paletaDePixeles([])).toBeNull();
    expect(paletaDePixeles(pixeles([10, [255, 0, 0, 0]]))).toBeNull();
  });
  it("es determinista", () => {
    const datos = pixeles([100, [200, 30, 90]], [100, [20, 180, 160]]);
    expect(paletaDePixeles(datos)).toEqual(paletaDePixeles(datos));
  });
});

describe("paleta propia", () => {
  it("la misma para el mismo id y siempre una de las seis", () => {
    expect(paletaPropia("cancion")).toEqual(paletaPropia("cancion"));
    const todas = new Set(PALETAS_PROPIAS.map((p) => p.c));
    expect(todas.has(paletaPropia("abc"))).toBe(true);
    expect(new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(paletaPropia)).size).toBeGreaterThan(1);
  });
  it("conAlfa", () => expect(conAlfa("#6d34c8", 0.5)).toBe("rgba(109,52,200,0.5)"));
});
