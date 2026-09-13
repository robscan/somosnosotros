import { describe, expect, it } from "vitest";
import { CIUDAD_INICIAL } from "./ciudad";

describe("CIUDAD_INICIAL", () => {
  it("es San Luis Potosí y el centro cae dentro de la ciudad", () => {
    expect(CIUDAD_INICIAL.nombre).toBe("San Luis Potosí");
    expect(CIUDAD_INICIAL.centro.lat).toBeGreaterThan(22.0);
    expect(CIUDAD_INICIAL.centro.lat).toBeLessThan(22.3);
    expect(CIUDAD_INICIAL.centro.lng).toBeGreaterThan(-101.1);
    expect(CIUDAD_INICIAL.centro.lng).toBeLessThan(-100.8);
  });
});
