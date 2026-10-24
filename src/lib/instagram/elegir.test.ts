import { describe, expect, it } from "vitest";
import { lineaDeSenal, porSenal, sePuedePublicar, yaEmpezo } from "./elegir";

/** OL-458 (bitácora 490): solo se sugiere y se publica lo que está por venir; el orden de la lista. */
const ahora = new Date("2026-10-03T17:00:00Z"); // sábado 3 de octubre, 11:00 en San Luis Potosí
const z = "America/Mexico_City";

describe("sePuedePublicar", () => {
  it("lo que todavía no empieza, sí; lo que ya empezó, no", () => {
    expect(sePuedePublicar({ inicio: "2026-10-03T23:00:00Z", termina: "2026-10-04T01:00:00Z", zona: z, clase: "puntual" }, ahora)).toBe(true);
    expect(sePuedePublicar({ inicio: "2026-10-03T15:00:00Z", termina: "2026-10-03T20:00:00Z", zona: z, clase: "puntual" }, ahora)).toBe(false);
    expect(yaEmpezo({ inicio: "2026-10-03T15:00:00Z", termina: "2026-10-03T20:00:00Z", zona: z, clase: "puntual" }, ahora)).toBe(true);
  });
  it("una exposición o un festival en curso, mientras termine después de hoy", () => {
    expect(sePuedePublicar({ inicio: "2026-10-01T06:00:00Z", termina: "2027-02-13T05:59:00Z", zona: z, clase: "exposicion" }, ahora)).toBe(true);
    expect(sePuedePublicar({ inicio: "2026-10-01T06:00:00Z", termina: "2026-10-04T05:00:00Z", zona: z, clase: "festival" }, ahora)).toBe(false);
  });
  it("un taller en curso, mientras le quede una sesión", () => {
    const t = { inicio: "2026-10-01T23:00:00Z", termina: "2026-10-06T01:00:00Z", zona: z, clase: "taller" };
    expect(sePuedePublicar({ ...t, sesiones: [{ inicio: "2026-10-01T23:00:00Z" }, { inicio: "2026-10-05T23:00:00Z" }] }, ahora)).toBe(true);
    expect(sePuedePublicar({ ...t, sesiones: [{ inicio: "2026-10-01T23:00:00Z" }] }, ahora)).toBe(false);
  });
  it("nunca lo oculto, cancelado, borrador o retirado", () => {
    const e = { inicio: "2026-10-04T23:00:00Z", termina: "2026-10-05T01:00:00Z", zona: z, clase: "puntual" };
    expect(sePuedePublicar({ ...e, visible: false }, ahora)).toBe(false);
    expect(sePuedePublicar({ ...e, cancelado: true }, ahora)).toBe(false);
    expect(sePuedePublicar({ ...e, borrador: true }, ahora)).toBe(false);
    expect(sePuedePublicar({ ...e, retirado_por_admin: true }, ahora)).toBe(false);
  });
});

describe("el orden de la lista", () => {
  it("destacado, luego «Voy» y «Me interesa», con cartel antes, y lo más próximo", () => {
    const base = { destacado: false, van: 0, interesa: 0, conCartel: true, inicio: "2026-10-05" };
    const lista = [
      { ...base, inicio: "2026-10-09", id: "c" },
      { ...base, van: 22, interesa: 40, id: "b" },
      { ...base, destacado: true, van: 1, id: "a" },
      { ...base, conCartel: false, id: "e" },
      { ...base, inicio: "2026-10-04", id: "d" },
    ];
    expect(lista.sort(porSenal).map((x) => x.id)).toEqual(["a", "b", "d", "c", "e"]);
  });
  it("la línea de por qué está arriba", () => {
    expect(lineaDeSenal({ destacado: true, van: 31, interesa: 54, conCartel: true, inicio: "" })).toBe("Destacado · 31 van · 54 les interesa");
    expect(lineaDeSenal({ destacado: false, van: 6, interesa: 15, conCartel: false, inicio: "" })).toBe("Sin cartel · 6 van · 15 les interesa");
  });
});
