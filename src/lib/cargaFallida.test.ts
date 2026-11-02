import { describe, expect, it } from "vitest";
import { CLAVE_CARGA_FALLIDA, tomarCargaFallida } from "./cargaFallida";
import { validarMedicion } from "./medir";

function almacen(valor: string | null) {
  const m = new Map<string, string>(valor === null ? [] : [[CLAVE_CARGA_FALLIDA, valor]]);
  return { getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => void m.delete(k), m };
}
const AHORA = Date.parse("2026-11-02T18:00:00Z");

describe("OL-501: carga_fallida", () => {
  it("está en la lista cerrada con sus dos datos fijos, y nada más", () => {
    expect(validarMedicion("carga_fallida", { app: "pwa", motivo: "red" })).toEqual({ app: "pwa", motivo: "red" });
    expect(validarMedicion("carga_fallida", { app: "tienda", motivo: "servidor" })).toEqual({ app: "tienda", motivo: "servidor" });
    expect(validarMedicion("carga_fallida", { app: "pwa", motivo: "otra" })).toBeNull();
    expect(validarMedicion("carga_fallida", { app: "pwa" })).toBeNull();
    expect(validarMedicion("carga_fallida", { app: "pwa", motivo: "red", ruta: "/" })).toBeNull();
  });

  it("la marca de la página de respaldo se lee una vez y se borra", () => {
    const a = almacen(JSON.stringify({ cuando: "2026-11-02T17:59:00Z", motivo: "servidor", app: "pwa" }));
    expect(tomarCargaFallida(a, AHORA)).toEqual({ app: "pwa", motivo: "servidor" });
    expect(a.m.size).toBe(0);
    expect(tomarCargaFallida(a, AHORA)).toBeNull();
  });

  it("sin marca, nada", () => {
    expect(tomarCargaFallida(almacen(null), AHORA)).toBeNull();
  });

  it("una marca rota, con datos fuera de la lista o de hace más de una semana se borra sin medirla", () => {
    for (const valor of ["{", JSON.stringify({ cuando: "2026-11-02T17:00:00Z", motivo: "otro", app: "pwa" }), JSON.stringify({ cuando: "2026-10-20T17:00:00Z", motivo: "red", app: "pwa" }), JSON.stringify({ motivo: "red", app: "pwa" })]) {
      const a = almacen(valor);
      expect(tomarCargaFallida(a, AHORA)).toBeNull();
      expect(a.m.size).toBe(0);
    }
  });

  it("sin memoria (modo privado) no lanza", () => {
    const roto = { getItem: () => { throw new Error("SecurityError"); }, removeItem: () => {} };
    expect(tomarCargaFallida(roto, AHORA)).toBeNull();
  });
});
