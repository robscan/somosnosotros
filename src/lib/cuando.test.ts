import { describe, expect, it } from "vitest";
import { atajosCuando, cuandoDeUrl, elegirEnRango, etiquetaCuando, mismoCuando } from "./cuando";

const de = (hoy: string) => Object.fromEntries(atajosCuando(hoy).map((a) => [a.etiqueta, [a.cuando.desde, a.cuando.hasta]]));

describe("los atajos de Cuándo se cuentan desde hoy (docs/rediseno/50, P5)", () => {
  it("de lunes a viernes, el fin de semana es el sábado y el domingo que vienen", () => {
    // Martes 29 de septiembre de 2026.
    expect(de("2026-09-29")).toEqual({
      Hoy: ["2026-09-29", "2026-09-29"],
      Mañana: ["2026-09-30", "2026-09-30"],
      "Fin de semana": ["2026-10-03", "2026-10-04"],
      "Esta semana": ["2026-09-29", "2026-10-05"],
    });
    // Lunes 28 y viernes 2 de octubre: el mismo fin de semana.
    expect(de("2026-09-28")["Fin de semana"]).toEqual(["2026-10-03", "2026-10-04"]);
    expect(de("2026-10-02")["Fin de semana"]).toEqual(["2026-10-03", "2026-10-04"]);
  });
  it("el sábado el fin de semana es hoy y mañana; el domingo, solo hoy", () => {
    expect(de("2026-10-03")["Fin de semana"]).toEqual(["2026-10-03", "2026-10-04"]);
    expect(de("2026-10-04")["Fin de semana"]).toEqual(["2026-10-04", "2026-10-04"]);
  });
  it("cruzan de mes y de año sin trabarse", () => {
    expect(de("2026-12-31")).toMatchObject({ Mañana: ["2027-01-01", "2027-01-01"], "Fin de semana": ["2027-01-02", "2027-01-03"], "Esta semana": ["2026-12-31", "2027-01-06"] });
  });
});

describe("lo que dice el chip Cuándo", () => {
  const hoy = "2026-09-29";
  it("un atajo dice su nombre, sea cual sea la forma en que se eligió", () => {
    expect(etiquetaCuando({ desde: "2026-09-29", hasta: "2026-09-29" }, hoy)).toBe("Hoy");
    expect(etiquetaCuando({ desde: "2026-10-03", hasta: "2026-10-04" }, hoy)).toBe("Fin de semana");
    expect(etiquetaCuando({ desde: "2026-09-29", hasta: "2026-10-05" }, hoy)).toBe("Esta semana");
  });
  it("un día dice «mié 30 sep» y varios, «30 sep – 3 oct»", () => {
    expect(etiquetaCuando({ desde: "2026-10-07", hasta: "2026-10-07" }, hoy)).toBe("mié 7 oct");
    expect(etiquetaCuando({ desde: "2026-09-30", hasta: "2026-10-03" }, hoy)).toBe("30 sep – 3 oct");
  });
});

describe("el calendario de la hoja Cuándo: un toque un día, dos un rango, el mismo día lo quita", () => {
  it("el primer toque elige un día", () => {
    expect(elegirEnRango(null, "2026-10-03")).toEqual({ desde: "2026-10-03", hasta: "2026-10-03" });
  });
  it("un segundo toque en un día posterior cierra el rango", () => {
    expect(elegirEnRango({ desde: "2026-10-03", hasta: "2026-10-03" }, "2026-10-05")).toEqual({ desde: "2026-10-03", hasta: "2026-10-05" });
  });
  it("un segundo toque en un día anterior empieza de nuevo desde ese día", () => {
    expect(elegirEnRango({ desde: "2026-10-03", hasta: "2026-10-03" }, "2026-10-01")).toEqual({ desde: "2026-10-01", hasta: "2026-10-01" });
  });
  it("tocar otra vez el único día elegido lo quita", () => {
    expect(elegirEnRango({ desde: "2026-10-03", hasta: "2026-10-03" }, "2026-10-03")).toBeNull();
  });
  it("con un rango ya hecho, un toque empieza uno nuevo (también en el primer día del rango)", () => {
    const rango = { desde: "2026-10-03", hasta: "2026-10-05" };
    expect(elegirEnRango(rango, "2026-10-08")).toEqual({ desde: "2026-10-08", hasta: "2026-10-08" });
    expect(elegirEnRango(rango, "2026-10-03")).toEqual({ desde: "2026-10-03", hasta: "2026-10-03" });
  });
});

describe("el Cuándo que llega en la URL", () => {
  it("un día, un rango, o todos los próximos", () => {
    expect(cuandoDeUrl("2026-10-03", "2026-10-04")).toEqual({ desde: "2026-10-03", hasta: "2026-10-04" });
    expect(cuandoDeUrl("2026-10-03")).toEqual({ desde: "2026-10-03", hasta: "2026-10-03" });
    expect(cuandoDeUrl()).toBeNull();
  });
  it("lo que no es un día válido no filtra, y un `hasta` anterior se ignora", () => {
    expect(cuandoDeUrl("mañana", "2026-10-04")).toBeNull();
    expect(cuandoDeUrl("2026-10-03", "ayer")).toEqual({ desde: "2026-10-03", hasta: "2026-10-03" });
    expect(cuandoDeUrl("2026-10-03", "2026-10-01")).toEqual({ desde: "2026-10-03", hasta: "2026-10-03" });
  });
  it("mismoCuando compara los dos extremos, y dos «todos» son iguales", () => {
    expect(mismoCuando(null, null)).toBe(true);
    expect(mismoCuando({ desde: "2026-10-03", hasta: "2026-10-04" }, { desde: "2026-10-03", hasta: "2026-10-04" })).toBe(true);
    expect(mismoCuando({ desde: "2026-10-03", hasta: "2026-10-04" }, null)).toBe(false);
  });
});
