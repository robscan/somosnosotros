import { describe, expect, it } from "vitest";
import { renglonLigado } from "./ligado";

// El caso del founder (2026-10-12): la inauguración de «DESIERTO: Observación y Espacio.», viernes 9 de octubre a las 20:00 de San Luis, sin fin.
const INAUGURACION = { inicio: "2026-10-10T02:00:00Z", fin: null, zona: "America/Mexico_City" };
const EXPO = { inicio: "2026-09-01T16:00:00Z", fin: "2026-11-30T05:59:00Z", zona: "America/Mexico_City" }; // hasta el domingo 29 de noviembre

describe("renglonLigado (OL-380, OL-388)", () => {
  it("una inauguración que ya pasó se dice en pasado y queda marcada como pasada (se enlaza a su ficha en pasado)", () => {
    const ahora = new Date("2026-10-12T17:00:00Z"); // lunes 12 de octubre, 11:00 de San Luis
    expect(renglonLigado(INAUGURACION, ahora)).toEqual({ pasado: true, cuando: "Fue el viernes 9 de octubre · 8:00 pm" });
  });
  it("la misma inauguración antes de empezar, como siempre: su fecha", () => {
    const ahora = new Date("2026-10-10T01:00:00Z"); // viernes 9 de octubre, 19:00 de San Luis
    expect(renglonLigado(INAUGURACION, ahora)).toEqual({ pasado: false, cuando: "viernes 9 de octubre · 8:00 pm" });
  });
  it("sin fin, sigue viva hasta 3 h después de empezar (la regla de eventoPaso)", () => {
    expect(renglonLigado(INAUGURACION, new Date("2026-10-10T04:59:00Z")).pasado).toBe(false); // 22:59
    expect(renglonLigado(INAUGURACION, new Date("2026-10-10T05:01:00Z")).pasado).toBe(true); // 23:01
  });
  it("con fin, manda su fin: una exposición abierta sigue viva aunque haya empezado hace semanas", () => {
    expect(renglonLigado(EXPO, new Date("2026-10-12T17:00:00Z")).pasado).toBe(false);
    expect(renglonLigado(EXPO, new Date("2026-12-01T17:00:00Z")).pasado).toBe(true);
  });
  it("con `cierre`, lo que ya acabó dice el día en que acabó; sin fin, cuándo fue", () => {
    const despues = new Date("2026-12-01T17:00:00Z");
    expect(renglonLigado(EXPO, despues, "Cerró")).toEqual({ pasado: true, cuando: "Cerró el domingo 29 de noviembre" });
    expect(renglonLigado(EXPO, despues, "Terminó").cuando).toBe("Terminó el domingo 29 de noviembre");
    expect(renglonLigado(INAUGURACION, despues, "Cerró").cuando).toBe("Fue el viernes 9 de octubre · 8:00 pm");
    // Sin haber acabado, el cierre no cambia nada.
    expect(renglonLigado(EXPO, new Date("2026-10-12T17:00:00Z"), "Cerró").pasado).toBe(false);
  });
  it("lo que ya pasó y se marcó «se canceló» (OL-391) dice «Se canceló» en vez de «Fue el …», también con `cierre`", () => {
    const despues = new Date("2026-12-01T17:00:00Z");
    expect(renglonLigado({ ...INAUGURACION, cancelado: true }, despues)).toEqual({ pasado: true, cuando: "Se canceló" });
    expect(renglonLigado({ ...EXPO, cancelado: true }, despues, "Cerró")).toEqual({ pasado: true, cuando: "Se canceló" });
    expect(renglonLigado({ ...INAUGURACION, cancelado: false }, despues).cuando).toBe("Fue el viernes 9 de octubre · 8:00 pm");
  });
  it("lo que no ha pasado no cambia aunque llegue marcado (la marca solo vale en pasado)", () => {
    const antes = new Date("2026-10-10T01:00:00Z");
    expect(renglonLigado({ ...INAUGURACION, cancelado: true }, antes)).toEqual({ pasado: false, cuando: "viernes 9 de octubre · 8:00 pm" });
  });
});
