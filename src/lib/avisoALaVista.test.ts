import { describe, expect, it } from "vitest";
import { seVeEntero } from "@/components/ui/abrirConError";

/**
 * Al abrir un renglón con error, el aviso se acerca solo si no cabe entero en la pantalla: si ya se veía,
 * la página no se mueve bajo los dedos de nadie.
 */
describe("aviso a la vista", () => {
  const ALTO = 844;
  it("no mueve nada cuando el aviso ya se ve entero", () => {
    expect(seVeEntero({ top: 100, bottom: 140 }, ALTO)).toBe(true);
    expect(seVeEntero({ top: 0, bottom: ALTO }, ALTO)).toBe(true);
  });
  it("lo acerca cuando asoma por abajo, por arriba o no cabe", () => {
    expect(seVeEntero({ top: 820, bottom: 880 }, ALTO)).toBe(false);
    expect(seVeEntero({ top: -20, bottom: 30 }, ALTO)).toBe(false);
    expect(seVeEntero({ top: -50, bottom: 900 }, ALTO)).toBe(false);
  });
});
