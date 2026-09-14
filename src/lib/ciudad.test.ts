import { describe, expect, it } from "vitest";
import { CIUDADES, CIUDAD_INICIAL, ciudadPorNombre, ciudadPorSlug } from "./ciudad";

describe("ciudad", () => {
  it("empieza en San Luis Potosí, centrada en el centro histórico", () => {
    expect(CIUDAD_INICIAL.nombre).toBe("San Luis Potosí");
    expect(CIUDAD_INICIAL.centro.lat).toBeCloseTo(22.15, 1);
    expect(CIUDAD_INICIAL.centro.lng).toBeCloseTo(-100.98, 1);
    expect(CIUDAD_INICIAL.zoom).toBeGreaterThanOrEqual(11);
  });
  it("resuelve por slug o nombre y cae en la inicial si no existe", () => {
    expect(ciudadPorSlug("san-luis-potosi").nombre).toBe("San Luis Potosí");
    expect(ciudadPorSlug("otra").nombre).toBe(CIUDAD_INICIAL.nombre);
    expect(ciudadPorNombre("San Luis Potosí").slug).toBe("san-luis-potosi");
    expect(CIUDADES.every((c) => /^[a-z0-9-]+$/.test(c.slug))).toBe(true);
  });
});
