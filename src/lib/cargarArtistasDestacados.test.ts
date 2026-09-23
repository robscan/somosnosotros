import { describe, expect, it } from "vitest";
import { ordenarPorSeguidores, TOPE_ARTISTAS_DESTACADOS } from "./cargarArtistasDestacados";

describe("Artistas destacados de Inicio: respaldo por seguidores (sin tira de la administración)", () => {
  it("ordena de más a menos seguidores", () => {
    const conteo = new Map([["b", 5], ["a", 20], ["c", 1]]);
    expect(ordenarPorSeguidores(["a", "b", "c"], conteo)).toEqual(["a", "b", "c"]);
  });
  it("a empate de seguidores (o sin ninguno), conserva el orden de llegada", () => {
    expect(ordenarPorSeguidores(["x", "y", "z"], new Map())).toEqual(["x", "y", "z"]);
  });
  it("respeta el tope", () => {
    expect(TOPE_ARTISTAS_DESTACADOS).toBe(12);
    const ids = Array.from({ length: 20 }, (_, i) => `id${i}`);
    expect(ordenarPorSeguidores(ids, new Map())).toHaveLength(12);
  });
});
