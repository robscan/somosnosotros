import { describe, expect, it } from "vitest";
import { cierreDesdeEvento, cierreSugeridoIso } from "./obras-colectivas";

describe("obras-colectivas", () => {
  it("sugiere cerrar dos horas después de ahora", () => {
    expect(cierreSugeridoIso(new Date("2026-09-19T20:00:00Z"))).toBe("2026-09-19T22:00:00.000Z");
  });
  it("desde un evento, usa su fin si lo tiene", () => {
    expect(cierreDesdeEvento("2026-09-19T19:00:00Z", "2026-09-19T21:00:00Z")).toBe("2026-09-19T21:00:00Z");
  });
  it("desde un evento sin fin, dos horas después de su inicio", () => {
    expect(cierreDesdeEvento("2026-09-19T19:00:00Z", null)).toBe("2026-09-19T21:00:00.000Z");
  });
});
