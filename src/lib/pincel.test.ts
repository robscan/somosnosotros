import { describe, expect, it } from "vitest";
import {
  DELTAS_MAX_POR_MENSAJE,
  deltaDesdeOrientacion,
  entradasDesdePresencia,
  esMensajeTrazoValido,
  ESCALA_DELTA_PX,
  estadoDeFila,
  nombreSugerido,
  ordenDeFila,
  puntoInicial,
  quienesPintan,
  siguientesSegmentos,
  type EntradaPresencia,
} from "./pincel";

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

describe("entradasDesdePresencia", () => {
  it("saca remitente/llegada/presenceRef de cada clave de presencia, ignorando lo que no trae la forma esperada", () => {
    const estado = {
      "clave-1": [{ remitente: "persona-1", llegada: 10, presence_ref: "ref-1" }],
      "clave-2": [{ remitente: "persona-2", llegada: 5, presence_ref: "ref-2" }, { presence_ref: "ref-3" }],
      "clave-3": [{ remitente: "", llegada: 1, presence_ref: "ref-4" }],
    };
    expect(entradasDesdePresencia(estado)).toEqual([
      { remitente: "persona-1", llegada: 10, presenceRef: "ref-1" },
      { remitente: "persona-2", llegada: 5, presenceRef: "ref-2" },
    ]);
  });
  it("sin ninguna clave, ninguna entrada", () => {
    expect(entradasDesdePresencia({})).toEqual([]);
  });
});

describe("ordenDeFila", () => {
  it("ordena por hora de llegada", () => {
    const entradas: EntradaPresencia[] = [
      { remitente: "b", llegada: 20, presenceRef: "1" },
      { remitente: "a", llegada: 10, presenceRef: "2" },
    ];
    expect(ordenDeFila(entradas).map((e) => e.remitente)).toEqual(["a", "b"]);
  });
  it("con la misma hora, desempata por presenceRef", () => {
    const entradas: EntradaPresencia[] = [
      { remitente: "b", llegada: 10, presenceRef: "zzz" },
      { remitente: "a", llegada: 10, presenceRef: "aaa" },
    ];
    expect(ordenDeFila(entradas).map((e) => e.remitente)).toEqual(["a", "b"]);
  });
  it("no muta el arreglo original", () => {
    const entradas: EntradaPresencia[] = [{ remitente: "b", llegada: 2, presenceRef: "1" }, { remitente: "a", llegada: 1, presenceRef: "2" }];
    const copia = [...entradas];
    ordenDeFila(entradas);
    expect(entradas).toEqual(copia);
  });
});

describe("quienesPintan", () => {
  const entradas: EntradaPresencia[] = [
    { remitente: "a", llegada: 1, presenceRef: "1" },
    { remitente: "b", llegada: 2, presenceRef: "2" },
    { remitente: "c", llegada: 3, presenceRef: "3" },
  ];
  it("con cupo para todos, todos pintan", () => {
    expect(quienesPintan(entradas, 10)).toEqual(new Set(["a", "b", "c"]));
  });
  it("con cupo justo para los primeros que llegaron", () => {
    expect(quienesPintan(entradas, 2)).toEqual(new Set(["a", "b"]));
  });
  it("cupo cero, nadie pinta", () => {
    expect(quienesPintan(entradas, 0)).toEqual(new Set());
  });
});

describe("estadoDeFila", () => {
  const entradas: EntradaPresencia[] = [
    { remitente: "a", llegada: 1, presenceRef: "1" },
    { remitente: "b", llegada: 2, presenceRef: "2" },
    { remitente: "c", llegada: 3, presenceRef: "3" },
    { remitente: "d", llegada: 4, presenceRef: "4" },
  ];
  it("dentro del cupo, pintando", () => {
    expect(estadoDeFila(entradas, 2, "a")).toEqual({ tipo: "pintando" });
    expect(estadoDeFila(entradas, 2, "b")).toEqual({ tipo: "pintando" });
  });
  it("fuera del cupo, su lugar en la fila y cuántos esperan en total", () => {
    expect(estadoDeFila(entradas, 2, "c")).toEqual({ tipo: "esperando", lugar: 1, esperando: 2 });
    expect(estadoDeFila(entradas, 2, "d")).toEqual({ tipo: "esperando", lugar: 2, esperando: 2 });
  });
  it("un remitente sin trackear todavía (antes del primer sync)", () => {
    expect(estadoDeFila(entradas, 2, "nadie")).toEqual({ tipo: "fuera" });
  });
});
