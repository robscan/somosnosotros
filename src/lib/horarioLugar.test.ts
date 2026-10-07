import { describe, expect, it } from "vitest";
import { conAbre, conDias, diasLibres, estructurar, franjaDeFila, franjaNueva, horarioDesdeJson, horarioParaEnviar, horasDeCerrar, lineasHorario, textoDias, type Franja } from "./horarioLugar";

/** OL-315: el horario del lugar, estructurado por el sistema (ley de Postel; decisiones 2 a 4 de la bitácora 342). Horas como las de los chips. */
const f = (dias: number[], abre: string, cierra: string): Franja => ({ dias, abre, cierra });
const LU_VI = [1, 2, 3, 4, 5];
/** Lo que se lee, en una sola cadena por renglón, para comparar sin depender del espacio fino que Intl pone antes de «p.m.». */
const leer = (franjas: Franja[]) => {
  const { lineas, cierra } = lineasHorario(franjas);
  return [...lineas.map((l) => `${l.dias} · ${l.horas}`), ...(cierra ? [cierra] : [])].map((t) => t.replace(/\s/g, " "));
};

describe("estructurar y lineasHorario", () => {
  it("una franja: sus días en tramo y los que cierra", () => {
    expect(leer([f([2, 3, 4, 5, 6, 7], "10:00", "18:00")])).toEqual(["Ma–Do · 10:00 a.m.–6:00 p.m.", "Cierra Lu"]);
  });
  it("Lu–Vi y Sá–Do con horas distintas: dos renglones, nada cierra", () => {
    expect(leer([f(LU_VI, "09:00", "17:00"), f([6, 7], "11:00", "14:00")])).toEqual(["Lu–Vi · 9:00 a.m.–5:00 p.m.", "Sá, Do · 11:00 a.m.–2:00 p.m."]);
  });
  it("cierre a comer: el mismo día en dos franjas sale en un renglón con la «y»; el sábado va aparte y el domingo cierra", () => {
    expect(leer([f(LU_VI, "10:00", "14:00"), f(LU_VI, "16:00", "20:00"), f([6], "16:00", "20:00")])).toEqual(["Lu–Vi · 10:00 a.m.–2:00 p.m. y 4:00 p.m.–8:00 p.m.", "Sá · 4:00 p.m.–8:00 p.m.", "Cierra Do"]);
  });
  it("franjas que se enciman o se tocan se unen; el orden en que se capturaron no importa", () => {
    expect(estructurar([f([1], "13:00", "18:00"), f([1], "10:00", "14:00")]).grupos).toEqual([{ dias: [1], rangos: [{ abre: "10:00", cierra: "18:00" }] }]);
    expect(estructurar([f([1], "10:00", "14:00"), f([1], "14:00", "16:00")]).grupos[0].rangos).toEqual([{ abre: "10:00", cierra: "16:00" }]);
    expect(estructurar([f([1], "10:00", "18:00"), f([1], "11:00", "12:00")]).grupos[0].rangos).toEqual([{ abre: "10:00", cierra: "18:00" }]);
  });
  it("un día repetido (en la misma franja o en otra igual) no se cuenta dos veces", () => {
    expect(leer([f([1, 1, 2, 3], "10:00", "18:00"), f([3], "10:00", "18:00")])).toEqual(["Lu–Mi · 10:00 a.m.–6:00 p.m.", "Cierra Ju–Do"]);
  });
  it("todos los días con la misma hora: un renglón y nada cierra", () => {
    expect(leer([f([1, 2, 3, 4, 5, 6, 7], "09:00", "21:00")])).toEqual(["Lu–Do · 9:00 a.m.–9:00 p.m."]);
  });
  it("ninguna franja, o franjas sin días: no hay horario que decir", () => {
    expect(lineasHorario([])).toEqual({ lineas: [], cierra: null });
    expect(lineasHorario([f([], "10:00", "18:00")])).toEqual({ lineas: [], cierra: null });
    expect(estructurar([]).cierra).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("los días con las mismas horas se juntan aunque no sean seguidos, en el orden del primero", () => {
    expect(leer([f([6], "10:00", "14:00"), f([1, 3], "10:00", "14:00"), f([2], "16:00", "20:00")])).toEqual(["Lu, Mi, Sá · 10:00 a.m.–2:00 p.m.", "Ma · 4:00 p.m.–8:00 p.m.", "Cierra Ju, Vi, Do"]);
  });
  it("un bar que cierra pasada la medianoche cuenta para el día en que abre y se une a lo que se le encima", () => {
    expect(leer([f([5, 6], "20:00", "02:00")])).toEqual(["Vi, Sá · 8:00 p.m.–2:00 a.m.", "Cierra Lu–Ju, Do"]);
    expect(estructurar([f([5], "20:00", "02:00"), f([5], "23:00", "03:00")]).grupos[0].rangos).toEqual([{ abre: "20:00", cierra: "03:00" }]);
  });
  it("tres franjas el mismo día se leen con comas y la «y» al final", () => {
    expect(leer([f([1], "08:00", "09:00"), f([1], "12:00", "13:00"), f([1], "18:00", "19:00")])[0]).toBe("Lu · 8:00 a.m.–9:00 a.m., 12:00 p.m.–1:00 p.m. y 6:00 p.m.–7:00 p.m.");
  });
});

describe("textoDias", () => {
  it("tres o más seguidos son un tramo; dos seguidos o sueltos van con coma; un hueco parte el tramo", () => {
    expect(textoDias([1, 2, 3, 4, 5])).toBe("Lu–Vi");
    expect(textoDias([6, 7])).toBe("Sá, Do");
    expect(textoDias([1, 2, 3, 5])).toBe("Lu–Mi, Vi");
    expect(textoDias([7, 1, 3])).toBe("Lu, Mi, Do");
    expect(textoDias([9, 0, 2])).toBe("Ma");
  });
});

describe("franjas nuevas y horas", () => {
  it("«Agregar otro horario» llega con los días libres y las horas de la franja de la que se parte; sin días libres, vacía", () => {
    expect(diasLibres([f(LU_VI, "10:00", "18:00")])).toEqual([6, 7]);
    expect(franjaNueva([f(LU_VI, "10:00", "14:00")], { abre: "10:00", cierra: "14:00" })).toEqual({ dias: [6, 7], abre: "10:00", cierra: "14:00" });
    expect(franjaNueva([f([1, 2, 3, 4, 5, 6, 7], "10:00", "14:00")], { abre: "10:00", cierra: "14:00" }).dias).toEqual([]);
  });
  it("abrir más tarde que el cierre del mismo día lleva el cierre a la primera hora que sí es posterior", () => {
    expect(conAbre(f([1], "10:00", "14:00"), "16:00")).toEqual(f([1], "16:00", "17:00"));
    expect(conAbre(f([1], "10:00", "18:00"), "12:00")).toEqual(f([1], "12:00", "18:00"));
    expect(conAbre(f([1], "10:00", "21:00"), "22:00").cierra).toBe("23:00");
    // Un cierre al día siguiente se queda como está.
    expect(conAbre(f([5], "20:00", "02:00"), "21:00")).toEqual(f([5], "21:00", "02:00"));
    expect(horasDeCerrar("16:00")).toEqual(["17:00", "18:00", "19:00", "20:00", "21:00"]);
  });
  it("lo que viaja: solo las franjas con días, sin repetidos", () => {
    expect(conDias([f([], "10:00", "14:00"), f([3, 1, 1], "10:00", "14:00")])).toEqual([f([1, 3], "10:00", "14:00")]);
    expect(JSON.parse(horarioParaEnviar([f([2, 1], "10:00", "14:00"), f([], "16:00", "20:00")]))).toEqual([{ dias: [1, 2], abre: "10:00", cierra: "14:00" }]);
  });
});

describe("horarioDesdeJson (lo que acepta el servidor)", () => {
  it("sin el campo no se toca el horario; vacío lo borra; lo legible se lee y las franjas sin días se descartan", () => {
    expect(horarioDesdeJson(null)).toEqual({ franjas: null });
    expect(horarioDesdeJson("")).toEqual({ franjas: [] });
    expect(horarioDesdeJson("[]")).toEqual({ franjas: [] });
    expect(horarioDesdeJson(JSON.stringify([{ dias: [5, 1, 1, 9], abre: "10:00", cierra: "14:00" }, { dias: [], abre: "10:00", cierra: "14:00" }]))).toEqual({ franjas: [f([1, 5], "10:00", "14:00")] });
    // Postel: cruzar la medianoche se acepta.
    expect(horarioDesdeJson(JSON.stringify([{ dias: [5], abre: "20:00", cierra: "02:00" }])).franjas).toEqual([f([5], "20:00", "02:00")]);
  });
  it("lo que no es un horario es un error", () => {
    const malos = ["{", "{}", JSON.stringify([{ dias: [1], abre: "25:00", cierra: "14:00" }]), JSON.stringify([{ dias: [1], abre: "10:00" }]), JSON.stringify([{ dias: [1], abre: "10:00", cierra: "10:00" }]), JSON.stringify(Array.from({ length: 51 }, () => ({ dias: [1], abre: "10:00", cierra: "14:00" })))];
    for (const malo of malos) {
      const r = horarioDesdeJson(malo);
      expect(r.franjas, malo).toBeNull();
      expect(r.error, malo).toBeTruthy();
    }
  });
  it("una fila de la base (horas con segundos) es una franja", () => {
    expect(franjaDeFila({ dias: [2, 1], abre: "10:00:00", cierra: "18:30:00" })).toEqual(f([1, 2], "10:00", "18:30"));
  });
});
