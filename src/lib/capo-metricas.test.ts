import { describe, expect, it } from "vitest";
import { fechaCapo, leerMetricasCapo, porcentajeCapo } from "./capo-metricas";

const m = { invitados: 45, ya_vinculados_al_invitar: 5, elegibles: 40, solicitaron_despues: 8, vinculados_despues: 3, primer_envio: "2026-09-16T18:00:00+00:00", ultimo_envio: "2026-09-18T18:00:00+00:00", corte: "2026-09-18T19:00:00+00:00" };
describe("métricas CAPO", () => {
  it("acepta resultados independientes: un vínculo no requiere solicitud", () => {
    expect(leerMetricasCapo({ ...m, solicitaron_despues: 0 })).not.toBeNull();
  });
  it("distingue cohorte vacía de consulta fallida", () => {
    expect(leerMetricasCapo({ ...m, invitados: 0, ya_vinculados_al_invitar: 0, elegibles: 0, solicitaron_despues: 0, vinculados_despues: 0, primer_envio: null, ultimo_envio: null })).not.toBeNull();
    for (const v of [null, undefined, {}, { ...m, invitados: "45" }, { ...m, solicitaron_despues: -1 }, { ...m, elegibles: 1 }, { ...m, correo: "privado@example.com" }]) expect(leerMetricasCapo(v)).toBeNull();
  });
  it("rechaza fechas incoherentes o ausentes con invitados", () => {
    expect(leerMetricasCapo({ ...m, primer_envio: null })).toBeNull();
    expect(leerMetricasCapo({ ...m, corte: "2025-01-01T00:00:00Z" })).toBeNull();
    expect(leerMetricasCapo({ ...m, primer_envio: "2027-01-01T00:00:00Z" })).toBeNull();
  });
  it("porcentaje sobre elegibles y sin división entre cero", () => {
    expect(porcentajeCapo(8, m.elegibles)).toBe("20%");
    expect(porcentajeCapo(1, 431)).toBe("0.2%");
    expect(porcentajeCapo(0, 0)).toBeNull();
  });
  it("fecha en México, incluso en el borde UTC", () => {
    expect(fechaCapo("2026-09-18T02:00:00Z")).toContain("17");
  });
});
