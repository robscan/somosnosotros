import { describe, expect, it } from "vitest";
import { aFechaIcs, combinarFechaHora, formatearCuando, fraseCuando, isoALocal, localAIso, proximosDias, sugerirInicio, sumarHoras, tramo } from "./fechas";

// "ahora": sábado 19 sep 2026, 10:00 hora de la ciudad (16:00Z)
const AHORA = new Date("2026-09-19T16:00:00Z");

describe("fechas", () => {
  it("convierte la hora del teléfono a ISO con la zona de la ciudad y de vuelta", () => {
    const iso = localAIso("2026-09-20T19:00");
    expect(iso).toBe("2026-09-21T01:00:00.000Z");
    expect(isoALocal(iso)).toBe("2026-09-20T19:00");
    expect(localAIso("nada")).toBeNull();
    expect(localAIso("")).toBeNull();
  });
  it("formatea Hoy / Mañana / día corto y el fin", () => {
    expect(formatearCuando("2026-09-20T01:00:00Z", null, AHORA)).toBe("Hoy · 19:00");
    expect(formatearCuando("2026-09-21T01:00:00Z", "2026-09-21T03:00:00Z", AHORA)).toBe("Mañana · 19:00–21:00");
    expect(formatearCuando("2026-09-27T01:00:00Z", null, AHORA)).toBe("sáb 26 de sep · 19:00");
  });
  it("clasifica en hoy, semana, próximos y pasado", () => {
    expect(tramo("2026-09-20T01:00:00Z", AHORA)).toBe("hoy"); // 19:00 de hoy
    expect(tramo("2026-09-19T14:00:00Z", AHORA)).toBe("hoy"); // empezó hace 2 h
    expect(tramo("2026-09-19T12:00:00Z", AHORA)).toBe("pasado"); // hace 4 h
    expect(tramo("2026-09-24T01:00:00Z", AHORA)).toBe("semana");
    expect(tramo("2026-10-05T01:00:00Z", AHORA)).toBe("proximos");
  });
  it("sugiere hoy 19:00 antes de las 18 y mañana después", () => {
    expect(sugerirInicio(AHORA)).toBe("2026-09-19T19:00");
    expect(sugerirInicio(new Date("2026-09-20T01:30:00Z"))).toBe("2026-09-20T19:00"); // 19:30 del 19 → mañana
  });
  it("escribe fechas de calendario", () => {
    expect(aFechaIcs("2026-09-21T01:00:00.000Z")).toBe("20260921T010000Z");
  });

  it("ofrece los próximos días con nombre y combina fecha + hora", () => {
    const dias = proximosDias(AHORA, 4);
    expect(dias.map((d) => d.etiqueta)).toEqual(["Hoy", "Mañana", "lun 21", "mar 22"]);
    expect(dias[2].valor).toBe("2026-09-21");
    expect(combinarFechaHora("2026-09-21", "19:00")).toBe("2026-09-21T19:00");
    expect(combinarFechaHora("", "19:00")).toBe("");
  });
  it("calcula el fin como duración y arma la frase", () => {
    expect(sumarHoras("2026-09-19T19:00", 2)).toBe("2026-09-19T21:00");
    expect(sumarHoras("2026-09-19T23:00", 2)).toBe("2026-09-20T01:00");
    expect(fraseCuando("2026-09-19T19:00", "2026-09-19T21:00")).toBe("sábado, 19 de septiembre, 19:00 a 21:00");
    expect(fraseCuando("2026-09-19T19:00")).toBe("sábado, 19 de septiembre, 19:00");
    expect(fraseCuando("nada")).toBe("");
  });
});
