import { describe, expect, it } from "vitest";
import { programaDeFestival, textoActividades, textoProgramaConPasados, vistaDeFicha } from "./programaFestival";

const ZONA = "America/Mexico_City";
/** Los 11 actos del CINEMA (del 29 de sep al 24 de oct en San Luis: 2026-09-30T00:00Z a 2026-10-25T02:00Z), sin hora de fin. */
const CINEMA = [
  "2026-09-30T00:00:00Z", // mar 29 de sep, 18:00
  "2026-09-30T02:00:00Z", // mar 29 de sep, 20:00
  "2026-10-01T02:00:00Z", // mié 30 de sep, 20:00
  "2026-10-02T02:00:00Z", // jue 1 de oct, 20:00
  "2026-10-03T02:00:00Z", // vie 2 de oct, 20:00
  "2026-10-13T01:00:00Z", // lun 12 de oct, 19:00 (hoy, todavía no empieza)
  "2026-10-16T01:00:00Z",
  "2026-10-21T00:00:00Z",
  "2026-10-22T00:00:00Z",
  "2026-10-23T00:00:00Z",
  "2026-10-25T02:00:00Z", // sáb 24 de oct, 20:00: la clausura
].map((inicio, i) => ({ id: `acto-${i + 1}`, inicio, fin: null, zona: ZONA }));
/** 12 de octubre de 2026, 11:00 en San Luis Potosí (UTC−6). */
const AHORA = new Date("2026-10-12T17:00:00Z");

describe("el programa de un festival, partido en lo que viene y lo que ya pasó (OL-383)", () => {
  it("el CINEMA el 12 de octubre a las 11:00: 5 ya pasaron y 6 están por venir, cada lado en su orden", () => {
    const { porVenir, pasados } = programaDeFestival(CINEMA, AHORA);
    expect(pasados.map((a) => a.id)).toEqual(["acto-1", "acto-2", "acto-3", "acto-4", "acto-5"]);
    expect(porVenir.map((a) => a.id)).toEqual(["acto-6", "acto-7", "acto-8", "acto-9", "acto-10", "acto-11"]);
    expect(textoProgramaConPasados(CINEMA.length, porVenir.length)).toBe("Programa registrado: 11 actividades · 6 por venir");
    expect(textoActividades(pasados.length)).toBe("5 actividades");
  });

  it("un acto sin fin pasa 3 h después de empezar; con fin, al terminar", () => {
    const acto = { inicio: "2026-10-12T15:00:00Z", fin: null, zona: ZONA }; // 9:00 en San Luis
    expect(programaDeFestival([acto], new Date("2026-10-12T17:59:00Z")).pasados).toHaveLength(0);
    expect(programaDeFestival([acto], new Date("2026-10-12T18:01:00Z")).pasados).toHaveLength(1);
    const conFin = { ...acto, fin: "2026-10-12T22:00:00Z" };
    expect(programaDeFestival([conFin], new Date("2026-10-12T21:00:00Z")).porVenir).toHaveLength(1);
  });

  it("sin pasados la línea es la de siempre; sin nada por venir, «ninguna por venir»", () => {
    expect(textoProgramaConPasados(3, 3)).toBe("Programa registrado: 3 actividades");
    expect(textoProgramaConPasados(1, 0)).toBe("Programa registrado: 1 actividad · ninguna por venir");
    expect(textoActividades(1)).toBe("1 actividad");
  });
});

describe("la ficha de un evento que ya pasó (OL-383)", () => {
  const base = { paso: true, puedeEditar: false, visible: true, borrador: false, conDireccionReservada: false };
  it("un evento pasado que se ve se pinta en pasado", () => {
    expect(vistaDeFicha(base)).toBe("pasado");
  });
  it("uno oculto o borrador sigue sin existir para quien no lo gestiona", () => {
    expect(vistaDeFicha({ ...base, visible: false })).toBe("no-existe");
    expect(vistaDeFicha({ ...base, borrador: true })).toBe("no-existe");
  });
  it("quien lo publicó o administra lo sigue viendo como antes; lo que no ha pasado, la ficha de siempre", () => {
    expect(vistaDeFicha({ ...base, visible: false, puedeEditar: true })).toBe("viva");
    expect(vistaDeFicha({ ...base, paso: false, visible: false })).toBe("viva");
  });
  it("la sesión que aún puede consultar la dirección reservada (OL-257) lo ve en pasado", () => {
    expect(vistaDeFicha({ ...base, visible: false, conDireccionReservada: true })).toBe("pasado");
  });
});
