import { describe, expect, it } from "vitest";
import { sumarHoras } from "./fechas";
import { conHoraFin, horasDelDia, partirLocal, resumenCadaDia } from "./cuandoEvento";

const ZONA = "America/Mexico_City";
const hoyDeDos = { inicio: "2026-11-14T19:00", fin: "2026-11-14T21:00" };
const sinFin = { inicio: "2026-11-14T19:00", fin: "" };

describe("partirLocal", () => {
  it("parte el día y la hora; sin valor, vacíos", () => {
    expect(partirLocal("2026-11-14T19:00")).toEqual({ fecha: "2026-11-14", hora: "19:00" });
    expect(partirLocal("")).toEqual({ fecha: "", hora: "" });
  });
});

describe("conHoraFin", () => {
  it("el fin cae en el día del inicio", () => {
    expect(conHoraFin(sinFin, "21:00")).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-14T21:00" });
  });
  it("un fin anterior al inicio, en un evento de un solo día, es la madrugada del día siguiente (OL-300); la misma hora no se acepta", () => {
    expect(conHoraFin(sinFin, "18:00")).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-15T18:00" });
    expect(conHoraFin(sinFin, "19:00")).toBe(sinFin);
  });
  it("«Otra hora» 01:00 con inicio 22:00 cae el día siguiente; la duración de 3 horas desde 22:00 llega a la misma hora", () => {
    const noche = { inicio: "2026-11-14T22:00", fin: "" };
    expect(conHoraFin(noche, "01:00")).toEqual({ inicio: "2026-11-14T22:00", fin: "2026-11-15T01:00" });
    expect(sumarHoras("2026-11-14T22:00", 3, ZONA)).toBe("2026-11-15T01:00");
    // En el último día del mes, el día siguiente es el 1.º.
    expect(conHoraFin({ inicio: "2026-11-30T22:00", fin: "" }, "01:00").fin).toBe("2026-12-01T01:00");
  });
  it("una hora posterior al inicio sigue cayendo el mismo día: 1 hora desde 19:00 termina a las 20:00", () => {
    expect(conHoraFin(sinFin, "20:00")).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-14T20:00" });
    expect(sumarHoras("2026-11-14T19:00", 1, ZONA)).toBe("2026-11-14T20:00");
  });
  it("varios días + «Sin hora de fin» sigue acabando con su último día, y una hora anterior al inicio cae en el último día, no un día después", () => {
    const largo = { inicio: "2026-11-14T19:00", fin: "2026-11-16T21:00" };
    expect(conHoraFin(largo, "")).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-16T23:59" });
    expect(conHoraFin({ inicio: "2026-11-14T19:00", fin: "2026-11-16T23:59" }, "01:00").fin).toBe("2026-11-16T01:00");
  });
  it("en un evento de varios días la hora cae en su último día, aunque sea anterior a la de inicio", () => {
    const largo = { inicio: "2026-11-14T19:00", fin: "2026-11-16T23:59" };
    expect(conHoraFin(largo, "10:00")).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-16T10:00" });
  });
  it("en uno que cruza la medianoche, también", () => {
    expect(conHoraFin({ inicio: "2026-11-14T22:00", fin: "2026-11-15T23:59" }, "02:30").fin).toBe("2026-11-15T02:30");
  });
  it("«Sin hora de fin»: de un solo día, quita el fin; de varios días, acaba con su último día", () => {
    expect(conHoraFin(hoyDeDos, "")).toEqual({ inicio: "2026-11-14T19:00", fin: "" });
    expect(conHoraFin({ inicio: "2026-11-14T19:00", fin: "2026-11-16T21:00" }, "")).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-16T23:59" });
  });
});

describe("resumenCadaDia: la línea del paso «¿A qué hora, cada día?» (OL-309)", () => {
  const dias = { desde: "2026-10-10", hasta: "2026-10-12" };
  const HOY = "2026-10-06";
  it("con hora de fin: «cada día de 8:00 a 9:00 p.m.»", () => {
    expect(resumenCadaDia(dias, "20:00", "2026-10-12T21:00", HOY)).toBe("Del 10 al 12 de oct · cada día de 8:00 a 9:00 p.m.");
  });
  it("si las horas no comparten a.m. o p.m., cada una lleva el suyo", () => {
    expect(resumenCadaDia(dias, "11:00", "2026-10-12T14:00", HOY)).toBe("Del 10 al 12 de oct · cada día de 11:00 a.m. a 2:00 p.m.");
  });
  it("sin hora de fin (vacía o la de «acaba con su último día»): «cada día desde las 8:00 p.m.»", () => {
    expect(resumenCadaDia(dias, "20:00", "", HOY)).toBe("Del 10 al 12 de oct · cada día desde las 8:00 p.m.");
    expect(resumenCadaDia(dias, "20:00", "2026-10-12T23:59", HOY)).toBe("Del 10 al 12 de oct · cada día desde las 8:00 p.m.");
  });
  it("la una dice «la», no «las»", () => {
    expect(resumenCadaDia(dias, "13:00", "", HOY)).toBe("Del 10 al 12 de oct · cada día desde la 1:00 p.m.");
    expect(resumenCadaDia(dias, "12:00", "", HOY)).toBe("Del 10 al 12 de oct · cada día desde las 12:00 p.m.");
  });
  it("de un mes a otro y con el año si no es el actual", () => {
    expect(resumenCadaDia({ desde: "2026-10-30", hasta: "2026-11-02" }, "19:00", "2026-11-02T21:00", HOY)).toBe("Del 30 de oct al 2 de nov · cada día de 7:00 a 9:00 p.m.");
    expect(resumenCadaDia({ desde: "2027-02-10", hasta: "2027-02-12" }, "19:00", "", HOY)).toBe("Del 10 al 12 de feb de 2027 · cada día desde las 7:00 p.m.");
  });
});

describe("horasDelDia: dos horas de un mismo día en la letra de los chips", () => {
  it("sin hora de fin, solo la de inicio", () => {
    expect(horasDelDia("20:00")).toEqual({ desde: "8:00 p.m." });
  });
  it("con el mismo «p.m.», se dice una vez; con distinto, cada una el suyo", () => {
    expect(horasDelDia("20:00", "21:00")).toEqual({ desde: "8:00", hasta: "9:00 p.m." });
    expect(horasDelDia("11:00", "14:00")).toEqual({ desde: "11:00 a.m.", hasta: "2:00 p.m." });
  });
});
