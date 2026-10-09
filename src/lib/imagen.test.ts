import { describe, expect, it } from "vitest";
import { ajustarAlTope, CALIDADES, FRACCIONES_DE_LADO, LADOS, prepararImagen, TAMANO_MAX_FOTO } from "./imagen";

/**
 * OL-352: los pasos para caber en el tope (calidad y luego lado) con un codificador simulado. El lienzo, `createImageBitmap` y la
 * transparencia se prueban con Chrome real en las pruebas de componentes (alta de evento, creador de cartel y portada de lugar).
 */

/** Un codificador de mentira: el peso sale de una fórmula de lado y calidad, y anota cada intento. */
function simulado(peso: (lado: number, calidad: number) => number) {
  const intentos: [number, number][] = [];
  const codificar = async (lado: number, calidad: number) => {
    intentos.push([lado, calidad]);
    return new Blob([new Uint8Array(peso(lado, calidad))]);
  };
  return { codificar, intentos };
}

describe("ajustarAlTope", () => {
  it("la primera calidad basta casi siempre: un solo intento, al lado pedido", async () => {
    const { codificar, intentos } = simulado(() => 300 * 1024);
    const blob = await ajustarAlTope(codificar, 2000);
    expect(blob?.size).toBe(300 * 1024);
    expect(intentos).toEqual([[2000, 0.85]]);
  });

  it("si no cabe, baja la calidad antes que el lado", async () => {
    const { codificar, intentos } = simulado((_, calidad) => (calidad > 0.7 ? TAMANO_MAX_FOTO + 1 : TAMANO_MAX_FOTO));
    const blob = await ajustarAlTope(codificar, 1600);
    expect(blob?.size).toBe(TAMANO_MAX_FOTO); // el tope cuenta como que cabe
    expect(intentos).toEqual([
      [1600, 0.85],
      [1600, 0.75],
      [1600, 0.65],
    ]);
  });

  it("con la calidad más baja aún grande, baja el lado: 0,75 y luego la mitad", async () => {
    const { codificar, intentos } = simulado((lado) => (lado > 1000 ? TAMANO_MAX_FOTO * 2 : 1000));
    const blob = await ajustarAlTope(codificar, 2000);
    expect(blob?.size).toBe(1000);
    expect(intentos.map(([l]) => l)).toEqual([2000, 2000, 2000, 1500, 1500, 1500, 1000]);
    expect(intentos.at(-1)).toEqual([1000, 0.85]);
  });

  it("si nada cabe, null tras probar todo, sin seguir para siempre", async () => {
    const { codificar, intentos } = simulado(() => TAMANO_MAX_FOTO + 1);
    expect(await ajustarAlTope(codificar, 800)).toBeNull();
    expect(intentos).toHaveLength(CALIDADES.length * FRACCIONES_DE_LADO.length);
  });

  it("un codificador que no da nada (o vacío) no cuenta como que cabe", async () => {
    let n = 0;
    const blob = await ajustarAlTope(async () => (n++ === 0 ? null : n === 2 ? new Blob([]) : new Blob(["ok"])), 1600);
    expect(await blob?.text()).toBe("ok");
    expect(n).toBe(3);
  });

  it("respeta otro tope", async () => {
    const { codificar, intentos } = simulado((_, calidad) => Math.round(calidad * 100));
    expect((await ajustarAlTope(codificar, 1600, 70))?.size).toBe(65);
    expect(intentos).toHaveLength(3);
  });
});

describe("prepararImagen", () => {
  it("los lados por uso: cartel 2000, portada 1600, perfil 800", () => {
    expect(LADOS).toEqual({ cartel: 2000, portada: 1600, perfil: 800 });
  });

  it("fuera del navegador no toca el archivo", async () => {
    const archivo = new File(["x"], "foto.png", { type: "image/png" });
    expect(await prepararImagen(archivo)).toEqual({ archivo });
  });
});
