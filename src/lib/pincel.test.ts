import { describe, expect, it } from "vitest";
import { DELTAS_MAX_POR_MENSAJE, deltaDesdeOrientacion, esMensajeTrazoValido, ESCALA_DELTA_PX, nombreSugerido, puntoInicial, siguientesSegmentos } from "./pincel";

describe("pincel", () => {
  it("sugiere el nombre a partir del lugar", () => {
    expect(nombreSugerido("Centro de las Artes")).toBe("Pincel en Centro de las Artes");
  });
});

const REMITENTE = "00000000-0000-4000-8000-000000000001";

describe("esMensajeTrazoValido", () => {
  it("acepta un mensaje bien formado con un delta", () => {
    expect(esMensajeTrazoValido({ trazo: "spray", color: "#e4552f", deltas: [{ dx: 0.4, dy: -0.2 }], remitente: REMITENTE })).toBe(true);
  });
  it("acepta varios deltas juntados en un mismo mensaje (envío agrupado)", () => {
    const deltas = [
      { dx: 0.1, dy: 0.1 },
      { dx: -0.2, dy: 0.05 },
      { dx: 0.05, dy: -0.3 },
    ];
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas, remitente: REMITENTE })).toBe(true);
  });
  it("rechaza un trazo que no existe", () => {
    expect(esMensajeTrazoValido({ trazo: "acuarela", color: "#141414", deltas: [{ dx: 0, dy: 0 }], remitente: REMITENTE })).toBe(false);
  });
  it("rechaza un color que no es una de las cinco tintas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#ffffff", deltas: [{ dx: 0, dy: 0 }], remitente: REMITENTE })).toBe(false);
  });
  it("rechaza un mensaje sin deltas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [], remitente: REMITENTE })).toBe(false);
  });
  it(`rechaza más de ${DELTAS_MAX_POR_MENSAJE} deltas en un mismo mensaje`, () => {
    const deltas = Array.from({ length: DELTAS_MAX_POR_MENSAJE + 1 }, () => ({ dx: 0, dy: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas, remitente: REMITENTE })).toBe(false);
  });
  it(`acepta justo ${DELTAS_MAX_POR_MENSAJE} deltas`, () => {
    const deltas = Array.from({ length: DELTAS_MAX_POR_MENSAJE }, () => ({ dx: 0, dy: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas, remitente: REMITENTE })).toBe(true);
  });
  it("rechaza un delta fuera de -1..1 (no es una coordenada absoluta)", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: 42, dy: 0 }], remitente: REMITENTE })).toBe(false);
  });
  it("rechaza un delta no numérico", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: "0.5", dy: 0 }], remitente: REMITENTE })).toBe(false);
  });
  it("rechaza deltas que no es un arreglo", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: { dx: 0, dy: 0 }, remitente: REMITENTE })).toBe(false);
  });
  it("rechaza sin remitente", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: 0, dy: 0 }] })).toBe(false);
  });
  it("rechaza un remitente vacío", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: 0, dy: 0 }], remitente: "" })).toBe(false);
  });
  it("rechaza cualquier cosa que no sea un objeto", () => {
    expect(esMensajeTrazoValido(null)).toBe(false);
    expect(esMensajeTrazoValido("trazo")).toBe(false);
    expect(esMensajeTrazoValido(undefined)).toBe(false);
  });
});

describe("puntoInicial", () => {
  it("da siempre el mismo punto para el mismo remitente", () => {
    const a = puntoInicial(REMITENTE, 800, 600);
    const b = puntoInicial(REMITENTE, 800, 600);
    expect(a).toEqual(b);
  });
  it("da puntos distintos para remitentes distintos (normalmente)", () => {
    const a = puntoInicial("00000000-0000-4000-8000-000000000001", 800, 600);
    const b = puntoInicial("00000000-0000-4000-8000-000000000002", 800, 600);
    expect(a).not.toEqual(b);
  });
  it("nunca da un punto fuera del lienzo", () => {
    const p = puntoInicial(REMITENTE, 390, 844);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(390);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(844);
  });
});

describe("siguientesSegmentos", () => {
  it("un delta da un segmento, moviéndose ESCALA_DELTA_PX por unidad de delta", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 100, y: 100 }, [{ dx: 1, dy: 0 }], 800, 600);
    expect(segmentos).toHaveLength(1);
    expect(segmentos[0][0]).toEqual({ x: 100, y: 100 });
    expect(hasta).toEqual({ x: 100 + ESCALA_DELTA_PX, y: 100 });
  });
  it("varios deltas encadenan los segmentos, cada uno desde donde terminó el anterior", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 0, y: 0 }, [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }], 800, 600);
    expect(segmentos).toHaveLength(2);
    expect(segmentos[1][0]).toEqual(segmentos[0][1]);
    expect(hasta).toEqual(segmentos[1][1]);
  });
  it("rebota en el borde derecho en vez de salirse del lienzo", () => {
    const { hasta } = siguientesSegmentos({ x: 790, y: 0 }, [{ dx: 1, dy: 0 }], 800, 600);
    // 790 + 24 = 814, 14 de más -> rebota: 800 - 14 = 786
    expect(hasta.x).toBe(786);
    expect(hasta.x).toBeLessThanOrEqual(800);
  });
  it("rebota en el borde izquierdo/superior (cero) igual que en el derecho/inferior", () => {
    const { hasta } = siguientesSegmentos({ x: 5, y: 5 }, [{ dx: -1, dy: -1 }], 800, 600);
    expect(hasta.x).toBeGreaterThanOrEqual(0);
    expect(hasta.y).toBeGreaterThanOrEqual(0);
  });
  it("sin deltas no da segmentos y el punto no se mueve", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 50, y: 50 }, [], 800, 600);
    expect(segmentos).toEqual([]);
    expect(hasta).toEqual({ x: 50, y: 50 });
  });
});

describe("deltaDesdeOrientacion", () => {
  it("sin lectura anterior, no hay delta que mandar", () => {
    expect(deltaDesdeOrientacion(null, { beta: 10, gamma: 5 })).toEqual({ dx: 0, dy: 0 });
  });
  it("si a cualquiera de las dos le falta un valor, tampoco hay delta", () => {
    expect(deltaDesdeOrientacion({ beta: null, gamma: 5 }, { beta: 10, gamma: 5 })).toEqual({ dx: 0, dy: 0 });
    expect(deltaDesdeOrientacion({ beta: 5, gamma: 5 }, { beta: 10, gamma: null })).toEqual({ dx: 0, dy: 0 });
  });
  it("un cambio de gamma mueve dx, un cambio de beta mueve dy", () => {
    const d = deltaDesdeOrientacion({ beta: 0, gamma: 0 }, { beta: 3, gamma: 6 }, 6);
    expect(d.dx).toBeCloseTo(1); // 6 grados de gamma con sensibilidad 6 -> delta 1
    expect(d.dy).toBeCloseTo(0.5); // 3 grados de beta con sensibilidad 6 -> delta 0.5
  });
  it("un cambio grande se acota a -1..1, no se manda como si fuera una coordenada absoluta", () => {
    const d = deltaDesdeOrientacion({ beta: 0, gamma: 0 }, { beta: 90, gamma: -90 }, 6);
    expect(d.dx).toBe(-1);
    expect(d.dy).toBe(1);
  });
  it("sin cambio, delta cero", () => {
    expect(deltaDesdeOrientacion({ beta: 12, gamma: -8 }, { beta: 12, gamma: -8 })).toEqual({ dx: 0, dy: 0 });
  });
});
