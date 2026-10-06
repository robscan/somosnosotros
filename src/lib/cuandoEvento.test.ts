import { describe, expect, it } from "vitest";
import { sumarHoras } from "./fechas";
import { conDias, conHoraFin, conHoraInicio, finDelDia, horasDelDia, horasEntre, partirLocal, resumenCadaDia, terminaOtroDia } from "./cuandoEvento";

const ZONA = "America/Mexico_City";
const hoyDeDos = { inicio: "2026-11-14T19:00", fin: "2026-11-14T21:00" };
const sinFin = { inicio: "2026-11-14T19:00", fin: "" };

describe("partirLocal y horasEntre", () => {
  it("parte el día y la hora; sin valor, vacíos", () => {
    expect(partirLocal("2026-11-14T19:00")).toEqual({ fecha: "2026-11-14", hora: "19:00" });
    expect(partirLocal("")).toEqual({ fecha: "", hora: "" });
  });
  it("cuenta horas con cuartos, cruzando la medianoche; sin uno de los dos, 0", () => {
    expect(horasEntre("2026-11-14T19:00", "2026-11-14T21:30", ZONA)).toBe(2.5);
    expect(horasEntre("2026-11-14T22:00", "2026-11-15T02:00", ZONA)).toBe(4);
    expect(horasEntre("2026-11-14T22:00", "", ZONA)).toBe(0);
  });
});

describe("conDias: rango de días (OL-298)", () => {
  it("un rango pone el fin en el último día, a la hora de fin que ya había", () => {
    expect(conDias(hoyDeDos, "2026-11-14", "2026-11-16")).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-16T21:00" });
  });
  it("un rango sin hora de fin previa acaba con su último día (sin hora de fin)", () => {
    const r = conDias(sinFin, "2026-11-14", "2026-11-16");
    expect(r).toEqual({ inicio: "2026-11-14T19:00", fin: "2026-11-16T23:59" });
    expect(finDelDia(r)).toBe(true);
    expect(terminaOtroDia(r)).toBe(true);
  });
  it("el fin nunca queda antes del inicio: con un rango siempre es de un día posterior", () => {
    const r = conDias(hoyDeDos, "2026-11-20", "2026-11-21");
    expect(r.fin > r.inicio).toBe(true);
  });
  it("un solo día: el fin acompaña al inicio con la misma duración (como siempre)", () => {
    expect(conDias(hoyDeDos, "2026-11-20", null)).toEqual({ inicio: "2026-11-20T19:00", fin: "2026-11-20T21:00" });
    expect(conDias(hoyDeDos, "2026-11-20", "2026-11-20")).toEqual({ inicio: "2026-11-20T19:00", fin: "2026-11-20T21:00" });
  });
  it("un solo día sin hora de fin sigue sin ella", () => {
    expect(conDias(sinFin, "2026-11-20", null)).toEqual({ inicio: "2026-11-20T19:00", fin: "" });
  });
  it("un evento que cruzaba la medianoche y cambia de día sigue cruzándola: termina al día siguiente a la misma hora (OL-300)", () => {
    const cruza = { inicio: "2026-11-14T22:00", fin: "2026-11-15T02:00" };
    expect(conDias(cruza, "2026-11-20", null)).toEqual({ inicio: "2026-11-20T22:00", fin: "2026-11-21T02:00" });
  });
  it("y si lo que se confirma es su mismo rango de dos días, no cambia", () => {
    const cruza = { inicio: "2026-11-14T22:00", fin: "2026-11-15T02:00" };
    expect(conDias(cruza, "2026-11-14", "2026-11-15")).toEqual(cruza);
  });
  it("un fin que no es posterior al inicio ese día no se arrastra", () => {
    expect(conDias({ inicio: "2026-11-14T19:00", fin: "2026-11-14T19:00" }, "2026-11-20", null).fin).toBe("");
  });
  it("cruzar la medianoche con el calendario: 14 al 15 con la hora de fin de la 1:00", () => {
    const cruza = { inicio: "2026-11-14T22:00", fin: "2026-11-14T23:30" };
    expect(conDias({ ...cruza, fin: "" }, "2026-11-14", "2026-11-15").fin).toBe("2026-11-15T23:59");
    expect(conHoraFin(conDias({ ...cruza, fin: "" }, "2026-11-14", "2026-11-15"), "01:00").fin).toBe("2026-11-15T01:00");
  });
  it("un evento que acababa con su último día vuelve a un solo día sin hora de fin (no arrastra la duración de días)", () => {
    const largo = { inicio: "2026-11-14T19:00", fin: "2026-11-16T23:59" };
    expect(conDias(largo, "2026-11-14", null)).toEqual({ inicio: "2026-11-14T19:00", fin: "" });
  });
  it("sin hora de inicio (evento sin cuándo) arranca a las 19:00", () => {
    expect(conDias({ inicio: "", fin: "" }, "2026-11-14", null)).toEqual({ inicio: "2026-11-14T19:00", fin: "" });
  });
  it("editar un evento ya pasado: confirmar su mismo día no lo cambia", () => {
    const pasado = { inicio: "2026-03-01T18:00", fin: "2026-03-01T20:00" };
    expect(conDias(pasado, "2026-03-01", null)).toEqual(pasado);
  });
  it("editar un evento pasado de varios días: confirmar su rango no lo cambia", () => {
    const pasado = { inicio: "2026-03-01T18:00", fin: "2026-03-03T20:00" };
    expect(conDias(pasado, "2026-03-01", "2026-03-03")).toEqual(pasado);
  });
});

describe("conHoraInicio", () => {
  it("el fin se mueve con el inicio, misma duración", () => {
    expect(conHoraInicio(hoyDeDos, "20:30", ZONA)).toEqual({ inicio: "2026-11-14T20:30", fin: "2026-11-14T22:30" });
  });
  it("un evento que cruza la medianoche conserva su duración", () => {
    expect(conHoraInicio({ inicio: "2026-11-14T22:00", fin: "2026-11-15T02:00" }, "21:00", ZONA)).toEqual({ inicio: "2026-11-14T21:00", fin: "2026-11-15T01:00" });
  });
  it("sin hora de fin sigue sin ella", () => {
    expect(conHoraInicio(sinFin, "20:00", ZONA)).toEqual({ inicio: "2026-11-14T20:00", fin: "" });
  });
  it("uno que acaba con su último día conserva ese fin", () => {
    const largo = { inicio: "2026-11-14T19:00", fin: "2026-11-16T23:59" };
    expect(conHoraInicio(largo, "17:00", ZONA)).toEqual({ inicio: "2026-11-14T17:00", fin: "2026-11-16T23:59" });
  });
  it("sin día de inicio no hay nada que mover", () => {
    expect(conHoraInicio({ inicio: "", fin: "" }, "20:00", ZONA)).toEqual({ inicio: "", fin: "" });
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
