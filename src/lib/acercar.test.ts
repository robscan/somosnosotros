import { describe, expect, it } from "vitest";
import { dobleToque, escalarEn, ESCALA_DOBLE_TOQUE, ESCALA_MAXIMA, limitar, razonConRueda, SIN_ACERCAR } from "./acercar";

/** Una ventana de teléfono y una imagen que a 1× llena el ancho y deja aire arriba y abajo. */
const VENTANA = { ancho: 390, alto: 844 };
const IMAGEN = { ancho: 390, alto: 260 };

describe("acercar: límites", () => {
  it("la escala no baja de 1 ni pasa de 4", () => {
    expect(limitar({ escala: 0.5, x: 0, y: 0 }, IMAGEN, VENTANA).escala).toBe(1);
    expect(limitar({ escala: 9, x: 0, y: 0 }, IMAGEN, VENTANA).escala).toBe(ESCALA_MAXIMA);
  });
  it("a 1× la imagen se queda centrada: no hay a dónde moverla", () => {
    const v = limitar({ escala: 1, x: 80, y: -50 }, IMAGEN, VENTANA);
    expect([v.escala, v.x + 0, v.y + 0]).toEqual([1, 0, 0]);
  });
  it("acercada, no se sale de sus bordes: a 2× una imagen del ancho de la ventana se mueve hasta media ventana a cada lado", () => {
    const v = limitar({ escala: 2, x: 500, y: 0 }, IMAGEN, VENTANA);
    expect(v.x).toBe(195);
    expect(limitar({ escala: 2, x: -500, y: 0 }, IMAGEN, VENTANA).x).toBe(-195);
  });
  it("en el eje donde sigue cabiendo entera queda centrada aunque en el otro se mueva", () => {
    // A 2×, la imagen mide 520 de alto y la ventana 844: cabe, así que no se mueve en vertical.
    expect(limitar({ escala: 2, x: 0, y: 300 }, IMAGEN, VENTANA).y).toBe(0);
    // A 4× mide 1 040: sobra 196, a 98 de cada lado.
    expect(limitar({ escala: 4, x: 0, y: 300 }, IMAGEN, VENTANA).y).toBe(98);
  });
});

describe("acercar: pellizcar y doble toque", () => {
  it("el punto de la imagen bajo los dedos se queda bajo los dedos al acercar", () => {
    // Los dedos en (100, 50) respecto al centro: tras duplicar la escala, ese punto sigue en (100, 50).
    const v = escalarEn(SIN_ACERCAR, 2, { x: 100, y: 50 }, { x: 100, y: 50 });
    const bajoElDedo = { x: (100 - v.x) / v.escala, y: (50 - v.y) / v.escala };
    expect(bajoElDedo).toEqual({ x: 100, y: 50 });
  });
  it("si los dedos se mueven mientras se pellizca, la imagen los sigue", () => {
    const v = escalarEn(SIN_ACERCAR, 2, { x: 100, y: 0 }, { x: 140, y: 30 });
    // El punto de la imagen que estaba bajo (100, 0) ahora está bajo (140, 30).
    expect({ x: v.x + 100 * v.escala, y: v.y }).toEqual({ x: 140, y: 30 });
  });
  it("alejar al mismo punto deshace el acercar", () => {
    const foco = { x: -60, y: 120 };
    const cerca = escalarEn(SIN_ACERCAR, 3, foco, foco);
    expect(escalarEn(cerca, 1 / 3, foco, foco)).toEqual(SIN_ACERCAR);
  });
  it("el doble toque acerca a 2,5× alrededor del punto tocado y otro doble toque vuelve a 1×", () => {
    const foco = { x: 100, y: 40 };
    const acercada = dobleToque(SIN_ACERCAR, foco);
    expect(acercada.escala).toBe(ESCALA_DOBLE_TOQUE);
    expect({ x: (foco.x - acercada.x) / acercada.escala, y: (foco.y - acercada.y) / acercada.escala }).toEqual(foco);
    expect(dobleToque(acercada, foco)).toEqual(SIN_ACERCAR);
    expect(dobleToque({ escala: 4, x: 10, y: 0 }, foco)).toEqual(SIN_ACERCAR);
  });
  it("la escala no pasa de 4 ni baja de 1 aunque el pellizco siga, y el punto bajo los dedos se queda bajo los dedos hasta el tope", () => {
    const foco = { x: 50, y: 20 };
    const tope = escalarEn(escalarEn(SIN_ACERCAR, 3, foco, foco), 3, foco, foco);
    expect(tope.escala).toBe(ESCALA_MAXIMA);
    expect({ x: (foco.x - tope.x) / tope.escala, y: (foco.y - tope.y) / tope.escala }).toEqual(foco);
    expect(escalarEn(SIN_ACERCAR, 0.3, foco, foco)).toEqual(SIN_ACERCAR);
  });
  it("la rueda acerca con deltaY negativo y aleja con positivo, y cada punto pesa igual a cualquier escala", () => {
    expect(razonConRueda(-100)).toBeGreaterThan(1);
    expect(razonConRueda(100)).toBeLessThan(1);
    expect(razonConRueda(0)).toBe(1);
    expect(razonConRueda(-50) ** 2).toBeCloseTo(razonConRueda(-100), 10);
  });
});
