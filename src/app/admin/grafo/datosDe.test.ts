import { describe, expect, it } from "vitest";
import { textoDatosDe } from "./datosDe";

// 14:05 en Ciudad de México (UTC−6) = 20:05 UTC
const CALCULADO = "2026-10-12T20:05:00.000Z";

describe("textoDatosDe", () => {
  it("si fue hoy dice solo la hora", () => {
    expect(textoDatosDe(CALCULADO, new Date("2026-10-12T22:00:00Z"))).toBe("Datos de las 14:05");
  });
  it("si fue otro día dice el día y la hora", () => {
    expect(textoDatosDe(CALCULADO, new Date("2026-10-13T16:00:00Z"))).toBe("Datos del 12 oct, 14:05");
  });
  it("«hoy» es el día de Ciudad de México, no el de UTC", () => {
    // 02:00 UTC del 13 sigue siendo el 12 por la tarde-noche en México
    expect(textoDatosDe(CALCULADO, new Date("2026-10-13T02:00:00Z"))).toBe("Datos de las 14:05");
    expect(textoDatosDe("2026-10-13T05:30:00Z", new Date("2026-10-13T16:00:00Z"))).toBe("Datos del 12 oct, 23:30");
  });
  it("una fecha ilegible no rompe la pantalla", () => {
    expect(textoDatosDe("no es fecha", new Date())).toBe("Datos de hace un rato");
  });
});
