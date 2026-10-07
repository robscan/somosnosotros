import { describe, expect, it } from "vitest";
import { contraste, elegirPaleta, matizYSaturacion, PALETAS, type IdPaleta } from "./paleta";

describe("PALETAS: todas pasan AA", () => {
  for (const p of Object.values(PALETAS)) {
    it(`${p.id}: texto y texto suave sobre el fondo ≥ 4,5; texto sobre el acento ≥ 4,5; acento sobre el fondo ≥ 3 (solo letra grande)`, () => {
      expect(contraste(p.texto, p.fondo)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.suave, p.fondo)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.sobreAcento, p.acento)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.acento, p.fondo)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("contraste", () => {
  it("negro sobre blanco es 21 y un color contra sí mismo es 1", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#777777", "#777777")).toBe(1);
  });
});

describe("elegirPaleta", () => {
  const admitidas: IdPaleta[] = ["noche", "vino", "bosque", "marino"];
  it("sin foto: la primera, o la que toque por la semilla", () => {
    expect(elegirPaleta(admitidas, null).id).toBe("noche");
    expect(elegirPaleta(admitidas, null, 2).id).toBe("bosque");
    expect(elegirPaleta(admitidas, null, -5).id).toBe("vino");
  });
  it("una foto gris (sin color) manda la primera", () => {
    expect(elegirPaleta(admitidas, { r: 90, g: 92, b: 95 }).id).toBe("noche");
  });
  it("la más parecida al tono de la foto (pesa más el fondo): verde con bosque, naranja con vino, azul con marino", () => {
    expect(elegirPaleta(admitidas, { r: 60, g: 140, b: 70 }).id).toBe("bosque");
    expect(elegirPaleta(admitidas, { r: 200, g: 110, b: 50 }).id).toBe("vino");
    expect(elegirPaleta(admitidas, { r: 40, g: 90, b: 170 }).id).toBe("marino");
  });
  it("sin admitidas cae en noche", () => {
    expect(elegirPaleta([], { r: 255, g: 0, b: 0 }).id).toBe("noche");
  });
  it("matizYSaturacion: rojo puro 0°, verde 120°, azul 240°", () => {
    expect(matizYSaturacion({ r: 255, g: 0, b: 0 }).matiz).toBe(0);
    expect(matizYSaturacion({ r: 0, g: 255, b: 0 }).matiz).toBe(120);
    expect(matizYSaturacion({ r: 0, g: 0, b: 255 }).matiz).toBe(240);
  });
});
