import { describe, expect, it } from "vitest";
import { kpiCuando, kpiDistancia, kpiProximos } from "./ficha";

describe("kpiCuando (el número de fecha de una ficha de evento)", () => {
  it("el día en una línea y la hora en la otra, sin la palabra «Fecha»", () => {
    expect(kpiCuando("2026-10-03T01:00:00Z", null, "America/Mexico_City")).toEqual({ dia: "vie 2 oct", hora: "19:00" });
  });
  it("si termina el mismo día, el día es solo el de arranque", () => {
    expect(kpiCuando("2026-10-03T01:00:00Z", "2026-10-03T04:00:00Z", "America/Mexico_City").dia).toBe("vie 2 oct");
  });
  it("si termina otro día, el día dice hasta cuándo", () => {
    expect(kpiCuando("2026-10-03T01:00:00Z", "2026-10-05T04:00:00Z", "America/Mexico_City").dia).toBe("vie 2 oct – dom 4 oct");
  });
  it("usa la zona del evento, no la de quien mira", () => {
    expect(kpiCuando("2026-10-03T06:30:00Z", null, "America/Mexico_City")).toEqual({ dia: "sáb 3 oct", hora: "00:30" });
    expect(kpiCuando("2026-10-03T06:30:00Z", null, "America/Tijuana")).toEqual({ dia: "vie 2 oct", hora: "23:30" });
  });
});

describe("kpiDistancia (el número de distancia de una ficha de lugar)", () => {
  it("menos de un kilómetro, en metros de 50 en 50 y nunca menos de 50", () => {
    expect(kpiDistancia(0.54)).toBe("550 m");
    expect(kpiDistancia(0.01)).toBe("50 m");
  });
  it("hasta 10 km con un decimal y coma, sin «,0»", () => {
    expect(kpiDistancia(1.44)).toBe("1,4 km");
    expect(kpiDistancia(2)).toBe("2 km");
  });
  it("de 10 km en adelante, sin decimales", () => {
    expect(kpiDistancia(14.6)).toBe("15 km");
  });
});

describe("kpiProximos (cuántos eventos o fechas vienen)", () => {
  it("ninguno, uno y varios, en masculino", () => {
    expect(kpiProximos(0)).toBe("Ninguno");
    expect(kpiProximos(1)).toBe("1 próximo");
    expect(kpiProximos(3)).toBe("3 próximos");
  });
  it("en femenino, para las fechas de un artista", () => {
    expect(kpiProximos(0, true)).toBe("Ninguna");
    expect(kpiProximos(1, true)).toBe("1 próxima");
    expect(kpiProximos(2, true)).toBe("2 próximas");
  });
});
