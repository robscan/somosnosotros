import { describe, expect, it } from "vitest";
import { validarReporte } from "./reportes";

describe("validarReporte", () => {
  const id = "2a63c4d0-6a3e-4d75-bc67-8c3226d4401b";
  it("acepta un reporte con motivo y limpia el detalle", () => {
    const r = validarReporte({ tipo: "evento", objeto_id: id, motivo: "duplicado", detalle: "  ya está   en la agenda " });
    expect(r.ok && r.datos).toEqual({ tipo: "evento", objeto_id: id, motivo: "duplicado", detalle: "ya está en la agenda" });
  });
  it("rechaza tipo, id o motivo inválidos", () => {
    expect(validarReporte({ tipo: "x", objeto_id: id, motivo: "otro" }).ok).toBe(false);
    expect(validarReporte({ tipo: "lugar", objeto_id: "nope", motivo: "otro" }).ok).toBe(false);
    expect(validarReporte({ tipo: "lugar", objeto_id: id, motivo: "porque sí" }).ok).toBe(false);
  });
});
