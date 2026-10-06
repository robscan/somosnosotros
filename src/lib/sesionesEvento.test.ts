import { describe, expect, it } from "vitest";
import { archivoIcs } from "./calendario";
import { kpiCuandoPorDia } from "./ficha";
import {
  MAX_DIAS_SESIONES,
  admitePorDia,
  conHoraDeInicio,
  conPrimerDia,
  cuantosDias,
  difiereDelComun,
  diasDelRango,
  finComun,
  finesDelDia,
  horarioComun,
  horasDeHorario,
  horasDeSesion,
  inicioFinDeHorarios,
  lineasDeSesiones,
  listaDeSesiones,
  resumenPorDia,
  sesionesParaEnviar,
  sesionesVigentes,
  validarSesiones,
  type HorarioDia,
} from "./sesionesEvento";

const ZONA = "America/Mexico_City";
const HOY = "2026-10-06";
const dias = { desde: "2026-10-09", hasta: "2026-10-11" };
// vie 9, sáb 10 y dom 11 de octubre de 2026, de 8:00 a 9:00 p.m. (UTC−6).
const comun = { hora: "20:00", fin: "21:00" };

describe("los días de un rango", () => {
  it("cuenta y lista cada día, incluidos los dos extremos", () => {
    expect(cuantosDias(dias)).toBe(3);
    expect(diasDelRango(dias)).toEqual(["2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(diasDelRango({ desde: "2026-10-30", hasta: "2026-11-02" })).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
  it("se ajusta día por día hasta 31 días (un mes); con más no", () => {
    expect(MAX_DIAS_SESIONES).toBe(31);
    expect(admitePorDia({ desde: "2026-10-01", hasta: "2026-10-31" })).toBe(true);
    expect(admitePorDia({ desde: "2026-10-01", hasta: "2026-11-01" })).toBe(false);
    expect(admitePorDia({ desde: "2026-10-09", hasta: "2026-11-15" })).toBe(false);
  });
});

describe("el horario común de cada día", () => {
  it("la hora de fin común sale del fin del último día; sin hora de fin o de madrugada, queda vacía", () => {
    expect(finComun("20:00", "2026-10-11T21:00")).toBe("21:00");
    expect(finComun("20:00", "")).toBe("");
    expect(finComun("20:00", "2026-10-11T23:59")).toBe("");
    expect(finComun("23:00", "2026-10-12T00:00")).toBe("");
    expect(finComun("20:00", "2026-10-11T20:00")).toBe("");
  });
  it("todos los días arrancan con el común", () => {
    expect(horarioComun(dias, "20:00", "2026-10-11T21:00")).toEqual([
      { dia: "2026-10-09", hora: "20:00", fin: "21:00" },
      { dia: "2026-10-10", hora: "20:00", fin: "21:00" },
      { dia: "2026-10-11", hora: "20:00", fin: "21:00" },
    ]);
    expect(horarioComun(dias, "20:00", "").map((h) => h.fin)).toEqual(["", "", ""]);
  });
  it("un día difiere del común si cambia su inicio o su fin", () => {
    expect(difiereDelComun({ dia: "2026-10-10", hora: "20:00", fin: "21:00" }, comun)).toBe(false);
    expect(difiereDelComun({ dia: "2026-10-10", hora: "18:00", fin: "21:00" }, comun)).toBe(true);
    expect(difiereDelComun({ dia: "2026-10-10", hora: "20:00", fin: "" }, comun)).toBe(true);
  });
  it("cambiar el inicio de un día conserva su fin si sigue después, y si no lo quita", () => {
    const h = { dia: "2026-10-10", hora: "20:00", fin: "21:00" };
    expect(conHoraDeInicio(h, "19:00")).toEqual({ hora: "19:00", fin: "21:00" });
    expect(conHoraDeInicio(h, "22:00")).toEqual({ hora: "22:00", fin: "" });
    expect(conHoraDeInicio(h, "21:00")).toEqual({ hora: "21:00", fin: "" });
    expect(conHoraDeInicio({ ...h, fin: "" }, "19:00")).toEqual({ hora: "19:00", fin: "" });
  });
  it("los fines sugeridos de un día son los que caen ese mismo día", () => {
    expect(finesDelDia("19:00")).toEqual(["20:00", "21:00", "22:00"]);
    expect(finesDelDia("22:00")).toEqual(["23:00"]);
    expect(finesDelDia("23:30")).toEqual([]);
    expect(finesDelDia("12:30")).toEqual(["13:30", "14:30", "15:30"]);
  });
});

describe("lo que dice el paso (12 h, como los chips)", () => {
  it("las horas de un día", () => {
    expect(horasDeHorario({ hora: "20:00", fin: "21:00" }).replace(/\s/g, " ")).toMatch(/^de 8:00 p\.\s?m\. a 9:00 p\.\s?m\.$/);
    expect(horasDeHorario({ hora: "20:00", fin: "" })).toMatch(/^desde las 8:00/);
    expect(horasDeHorario({ hora: "13:00", fin: "" })).toMatch(/^desde la 1:00/);
  });
  it("el resumen cuenta los días que se apartaron del común", () => {
    const igual = horarioComun(dias, "20:00", "2026-10-11T21:00");
    expect(resumenPorDia(igual, comun, HOY)).toBe("Del 9 al 11 de oct · cada día igual");
    const uno = igual.map((h) => (h.dia === "2026-10-10" ? { ...h, hora: "18:00" } : h));
    expect(resumenPorDia(uno, comun, HOY)).toBe("Del 9 al 11 de oct · 1 día con otro horario");
    const dos = uno.map((h) => (h.dia === "2026-10-11" ? { ...h, fin: "" } : h));
    expect(resumenPorDia(dos, comun, HOY)).toBe("Del 9 al 11 de oct · 2 días con otro horario");
  });
  it("de un mes a otro, y con el año si no es el actual", () => {
    const h = horarioComun({ desde: "2026-10-30", hasta: "2026-11-02" }, "20:00", "");
    expect(resumenPorDia(h, { hora: "20:00", fin: "" }, HOY)).toBe("Del 30 de oct al 2 de nov · cada día igual");
    expect(resumenPorDia(horarioComun({ desde: "2027-02-10", hasta: "2027-02-12" }, "20:00", ""), { hora: "20:00", fin: "" }, HOY)).toBe("Del 10 al 12 de feb de 2027 · cada día igual");
  });
});

describe("el inicio y el fin del evento salen de la primera y la última sesión", () => {
  const horarios: HorarioDia[] = [
    { dia: "2026-10-09", hora: "20:00", fin: "21:00" },
    { dia: "2026-10-10", hora: "18:00", fin: "21:00" },
    { dia: "2026-10-11", hora: "19:00", fin: "22:30" },
  ];
  it("inicio = primer día con su hora; fin = último día con su hora de fin", () => {
    expect(inicioFinDeHorarios(horarios)).toEqual({ inicio: "2026-10-09T20:00", fin: "2026-10-11T22:30" });
  });
  it("el último día sin hora de fin acaba con su día", () => {
    expect(inicioFinDeHorarios([horarios[0], { ...horarios[2], fin: "" }]).fin).toBe("2026-10-11T23:59");
  });
  it("lo que viaja al servidor es una sesión por día, con el fin vacío si no lo hay", () => {
    expect(JSON.parse(sesionesParaEnviar([horarios[0], { ...horarios[1], fin: "" }, horarios[2]]))).toEqual([
      { inicio: "2026-10-09T20:00", fin: "2026-10-09T21:00" },
      { inicio: "2026-10-10T18:00", fin: "" },
      { inicio: "2026-10-11T19:00", fin: "2026-10-11T22:30" },
    ]);
  });
});

describe("validarSesiones: lo que acepta el servidor", () => {
  const inicio = "2026-10-10T02:00:00.000Z"; // vie 9 a las 8:00 p.m. en San Luis
  const fin = "2026-10-12T03:00:00.000Z"; // dom 11 a las 9:00 p.m.
  const buenas = JSON.stringify([
    { inicio: "2026-10-09T20:00", fin: "2026-10-09T21:00" },
    { inicio: "2026-10-10T18:00", fin: "" },
    { inicio: "2026-10-11T20:00", fin: "2026-10-11T21:00" },
  ]);
  const validar = (texto: unknown, i: string = inicio, f: string | null = fin) => validarSesiones(texto as string, ZONA, i, f);

  it("sin campo no hay sesiones y no es un error", () => {
    expect(validar(null)).toEqual({ sesiones: null });
    expect(validar("")).toEqual({ sesiones: null });
    expect(validar("  ")).toEqual({ sesiones: null });
  });
  it("una por día, en instantes (ISO), con el fin nulo si no hay", () => {
    expect(validar(buenas)).toEqual({
      sesiones: [
        { inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-10T03:00:00.000Z" },
        { inicio: "2026-10-11T00:00:00.000Z", fin: null },
        { inicio: "2026-10-12T02:00:00.000Z", fin: "2026-10-12T03:00:00.000Z" },
      ],
    });
  });
  it("las ordena por inicio", () => {
    const al_reves = JSON.stringify([...JSON.parse(buenas)].reverse());
    expect(validar(al_reves).sesiones?.map((s) => s.inicio)).toEqual(["2026-10-10T02:00:00.000Z", "2026-10-11T00:00:00.000Z", "2026-10-12T02:00:00.000Z"]);
  });
  it("rechaza lo que no se entiende: no es JSON, no es una lista, una sola sesión, más de 31, sin inicio o con una fecha imposible", () => {
    for (const texto of ["no es json", "{}", "[]", JSON.stringify([{ inicio: "2026-10-09T20:00", fin: "" }]), JSON.stringify([{ fin: "" }, { fin: "" }]), JSON.stringify([{ inicio: "2026-02-31T20:00", fin: "" }, { inicio: "2026-10-11T20:00", fin: "" }])]) {
      expect(validar(texto).error, texto).toBeTruthy();
      expect(validar(texto).sesiones).toBeNull();
    }
    const treintaYDos = JSON.stringify(Array.from({ length: 32 }, (_, i) => ({ inicio: combinar(i), fin: "" })));
    expect(validar(treintaYDos).error).toBeTruthy();
  });
  it("rechaza un día repetido", () => {
    const repetido = JSON.stringify([{ inicio: "2026-10-09T20:00", fin: "" }, { inicio: "2026-10-09T21:00", fin: "" }, { inicio: "2026-10-11T20:00", fin: "" }]);
    expect(validar(repetido).error).toMatch(/dos horarios/);
  });
  it("rechaza un fin que no es posterior al inicio o que cae otro día", () => {
    const mismaHora = JSON.stringify([{ inicio: "2026-10-09T20:00", fin: "2026-10-09T20:00" }, { inicio: "2026-10-11T20:00", fin: "" }]);
    const antes = JSON.stringify([{ inicio: "2026-10-09T20:00", fin: "2026-10-09T19:00" }, { inicio: "2026-10-11T20:00", fin: "" }]);
    const otroDia = JSON.stringify([{ inicio: "2026-10-09T20:00", fin: "2026-10-10T01:00" }, { inicio: "2026-10-11T20:00", fin: "" }]);
    for (const texto of [mismaHora, antes, otroDia]) expect(validar(texto).error, texto).toMatch(/terminar después de empezar/);
  });
  it("rechaza sesiones que no coinciden con el evento: la primera no empieza cuando él, o la última cae en otro día", () => {
    expect(validar(buenas, "2026-10-10T03:00:00.000Z").error).toMatch(/no coinciden/);
    expect(validar(buenas, inicio, "2026-10-13T03:00:00.000Z").error).toMatch(/no coinciden/);
    expect(validar(buenas, inicio, null).error).toMatch(/no coinciden/);
  });
  it("la última sesión cuenta por su día aunque el fin del evento sea el fin del día", () => {
    expect(validar(buenas, inicio, "2026-10-12T05:59:00.000Z").sesiones).toHaveLength(3);
  });
});

function combinar(i: number): string {
  const dia = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
  return `${dia}T20:00`;
}

describe("lo que lee la ficha de un evento con sesiones", () => {
  const evento = { inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-12T03:00:00.000Z", zona: ZONA };
  const sesiones = [
    { inicio: "2026-10-12T02:00:00.000Z", fin: "2026-10-12T03:00:00.000Z" },
    { inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-10T03:00:00.000Z" },
    { inicio: "2026-10-11T00:00:00.000Z", fin: null },
  ];
  it("las sesiones vigentes salen ordenadas por inicio", () => {
    expect(sesionesVigentes(evento, sesiones).map((s) => s.inicio)).toEqual(["2026-10-10T02:00:00.000Z", "2026-10-11T00:00:00.000Z", "2026-10-12T02:00:00.000Z"]);
  });
  it("sin sesiones, con una sola o sin fin del evento, no hay horario por día", () => {
    expect(sesionesVigentes(evento, [])).toEqual([]);
    expect(sesionesVigentes(evento, null)).toEqual([]);
    expect(sesionesVigentes(evento, undefined)).toEqual([]);
    expect(sesionesVigentes(evento, [sesiones[1]])).toEqual([]);
    expect(sesionesVigentes({ ...evento, fin: null }, sesiones)).toEqual([]);
  });
  it("si se editó el evento por el formulario y ya no coincide, se ignoran y el evento se lee como cualquier otro", () => {
    expect(sesionesVigentes({ ...evento, inicio: "2026-10-10T01:00:00.000Z" }, sesiones)).toEqual([]);
    expect(sesionesVigentes({ ...evento, fin: "2026-10-13T03:00:00.000Z" }, sesiones)).toEqual([]);
  });
  it("la lista dice cada día con sus horas en 24 h; sin hora de fin, solo la de inicio", () => {
    const vigentes = sesionesVigentes(evento, sesiones);
    expect(listaDeSesiones(vigentes, ZONA, new Date("2026-10-06T12:00:00Z"))).toEqual([
      { dia: "vie 9 de oct", horas: "20:00–21:00" },
      { dia: "sáb 10 de oct", horas: "18:00" },
      { dia: "dom 11 de oct", horas: "20:00–21:00" },
    ]);
    expect(lineasDeSesiones(vigentes, ZONA, new Date("2026-10-06T12:00:00Z"))[0]).toBe("vie 9 de oct · 20:00–21:00");
    expect(horasDeSesion(vigentes[1], ZONA)).toBe("18:00");
  });
  it("el número de la fecha dice los días y «Horarios por día»", () => {
    expect(kpiCuandoPorDia(evento.inicio, evento.fin, ZONA, new Date("2026-10-06T12:00:00Z"))).toEqual({ dia: "Del 9 al 11 de oct", hora: "Horarios por día" });
  });
});

describe("«A mi calendario» con horario por día", () => {
  const e = { id: "00000000-0000-4000-8000-0000000000e1", slug: "festival-ab12", titulo: "Festival", inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-12T03:00:00.000Z", descripcion: "Tres días de lectura.", lugar: "Teatro de la Paz" };
  const sesiones = [
    { inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-10T03:00:00.000Z" },
    { inicio: "2026-10-11T00:00:00.000Z", fin: null },
    { inicio: "2026-10-12T02:00:00.000Z", fin: "2026-10-12T03:00:00.000Z" },
  ];
  it("el .ics lleva un evento por día, cada uno con su hora y su alerta (sin hora de fin, 2 horas) y ninguno del evento entero", () => {
    const ics = archivoIcs(e, new Date("2026-10-06T12:00:00Z"), sesiones);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(3);
    expect(ics).toContain(`UID:${e.id}-1@somosnosotros.org`);
    expect(ics).toContain(`UID:${e.id}-3@somosnosotros.org`);
    expect(ics).toContain("DTSTART:20261010T020000Z\r\nDTEND:20261010T030000Z");
    expect(ics).toContain("DTSTART:20261011T000000Z\r\nDTEND:20261011T020000Z");
    // El evento entero (del 9 al 11) no va como un cuarto evento encima de los días.
    expect(ics.match(/DTSTART:20261010T020000Z/g)).toHaveLength(1);
    expect(ics.match(/DTEND:20261012T030000Z/g)).toHaveLength(1);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("sin sesiones el archivo es el de siempre: un solo evento con el inicio y el fin del evento", () => {
    const ics = archivoIcs(e, new Date("2026-10-06T12:00:00Z"));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain(`UID:${e.id}@somosnosotros.org`);
    expect(ics).toContain("DTSTART:20261010T020000Z\r\nDTEND:20261012T030000Z");
  });
  it("la hoja nativa del iPhone agrega uno solo: el primer día, y en las notas todos los días con sus horas", () => {
    const vigentes = sesionesVigentes({ ...e, zona: ZONA }, sesiones);
    const nativo = conPrimerDia(e, vigentes, ZONA, new Date("2026-10-06T12:00:00Z"));
    expect(nativo.inicio).toBe("2026-10-10T02:00:00.000Z");
    expect(nativo.fin).toBe("2026-10-10T03:00:00.000Z");
    expect(nativo.descripcion).toBe("Tres días de lectura.\nvie 9 de oct · 20:00–21:00\nsáb 10 de oct · 18:00\ndom 11 de oct · 20:00–21:00");
    expect(conPrimerDia(e, [], ZONA)).toBe(e);
  });
});
