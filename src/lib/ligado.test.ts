import { describe, expect, it } from "vitest";
import { renglonLigado } from "./ligado";

// El caso del founder (2026-10-12): la inauguración de «DESIERTO: Observación y Espacio.», viernes 9 de octubre a las 20:00 de San Luis, sin fin.
const INAUGURACION = { inicio: "2026-10-10T02:00:00Z", fin: null, zona: "America/Mexico_City" };

describe("renglonLigado (OL-380)", () => {
  it("una inauguración que ya pasó no se enlaza y se dice en pasado", () => {
    const ahora = new Date("2026-10-12T17:00:00Z"); // lunes 12 de octubre, 11:00 de San Luis
    expect(renglonLigado(INAUGURACION, ahora)).toEqual({ enlaza: false, cuando: "Fue el viernes 9 de octubre · 20:00" });
  });
  it("la misma inauguración antes de empezar se enlaza con su fecha", () => {
    const ahora = new Date("2026-10-10T01:00:00Z"); // viernes 9 de octubre, 19:00 de San Luis
    expect(renglonLigado(INAUGURACION, ahora)).toEqual({ enlaza: true, cuando: "viernes 9 de octubre · 20:00" });
  });
  it("sin fin, sigue enlazada hasta 3 h después de empezar (la regla de eventoPaso)", () => {
    expect(renglonLigado(INAUGURACION, new Date("2026-10-10T04:59:00Z")).enlaza).toBe(true); // 22:59
    expect(renglonLigado(INAUGURACION, new Date("2026-10-10T05:01:00Z")).enlaza).toBe(false); // 23:01
  });
  it("con fin, manda su fin: una exposición abierta se enlaza aunque haya empezado hace semanas", () => {
    const expo = { inicio: "2026-09-01T16:00:00Z", fin: "2026-11-30T05:59:00Z", zona: "America/Mexico_City" };
    expect(renglonLigado(expo, new Date("2026-10-12T17:00:00Z")).enlaza).toBe(true);
    expect(renglonLigado(expo, new Date("2026-12-01T17:00:00Z")).enlaza).toBe(false);
  });
});
