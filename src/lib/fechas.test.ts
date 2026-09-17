import { describe, expect, it } from "vitest";
import { aFechaIcs, combinarFechaHora, diaCorto, diaLargo, eventoPaso, filtroSinPasar, formatearCuando, formatearLargo, fraseCuando, horaCorta, inicioDelDia, isoALocal, localAIso, proximosDias, sugerirInicio, sumarHoras, terminaDe, tramo, yaPaso, ZONA_INICIAL, zonaSegura } from "./fechas";

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
  it("escribe el año solo cuando no es el actual", () => {
    expect(formatearCuando("2027-08-23T01:00:00Z", null, AHORA)).toBe("dom 22 de ago de 2027 · 19:00");
    expect(formatearLargo("2027-08-23T01:00:00Z", AHORA)).toBe("domingo 22 de agosto de 2027 · 19:00");
    expect(formatearLargo("2026-09-21T01:00:00Z", AHORA)).toBe("domingo 20 de septiembre · 19:00");
    expect(formatearLargo("2026-09-21T01:00:00Z", AHORA, "2026-09-21T03:00:00Z")).toBe("domingo 20 de septiembre · 19:00 a 21:00");
  });
  it("clasifica en hoy, semana, próximos y pasado", () => {
    expect(tramo("2026-09-20T01:00:00Z", AHORA)).toBe("hoy"); // 19:00 de hoy
    expect(tramo("2026-09-19T14:00:00Z", AHORA)).toBe("hoy"); // empezó hace 2 h
    expect(tramo("2026-09-19T12:00:00Z", AHORA)).toBe("hoy"); // empezó a las 6:00: sigue siendo de hoy
    expect(tramo("2026-09-19T03:00:00Z", AHORA)).toBe("pasado"); // ayer a las 21:00
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
    expect(fraseCuando("2026-09-19T19:00", "2026-09-19T21:00", AHORA)).toBe("sábado 19 de septiembre · 19:00 a 21:00");
    expect(fraseCuando("2026-09-19T19:00", undefined, AHORA)).toBe("sábado 19 de septiembre · 19:00");
    expect(fraseCuando("nada")).toBe("");
  });
  it("un evento ya pasó cuando terminó o, sin hora de fin, cuando acabó su día en la ciudad", () => {
    expect(eventoPaso("2026-09-19T14:30:00Z", null, AHORA)).toBe(false); // hoy 8:30, sin fin: se queda todo el día
    expect(eventoPaso("2026-09-19T06:00:00Z", null, AHORA)).toBe(false); // hoy 0:00, sin fin: se queda todo el día
    expect(eventoPaso("2026-09-19T05:59:00Z", null, AHORA)).toBe(true); // ayer 23:59, sin fin: ya pasó
    expect(eventoPaso("2026-09-19T11:00:00Z", "2026-09-19T17:00:00Z", AHORA)).toBe(false); // termina a las 11:00
    expect(eventoPaso("2026-09-19T11:00:00Z", "2026-09-19T15:59:00Z", AHORA)).toBe(true); // terminó a las 9:59
    expect(inicioDelDia(AHORA)).toBe("2026-09-19T06:00:00.000Z");
  });
  it("las listas filtran con termina, que la base calcula en la zona de cada evento", () => {
    expect(filtroSinPasar(AHORA)).toBe(`termina.gte."2026-09-19T16:00:00.000Z"`);
  });
});

// Lugares y eventos de cualquier país (migración 0029): cada evento con la hora de su zona.
describe("fechas en la zona del evento", () => {
  // AHORA es sábado 19 sep a las 10:00 en San Luis y a las 18:00 en Madrid.
  const MADRID = "Europe/Madrid";
  it("lee y escribe la hora del selector en la zona del evento", () => {
    expect(localAIso("2026-09-20T19:00", MADRID)).toBe("2026-09-20T17:00:00.000Z");
    expect(isoALocal("2026-09-20T17:00:00.000Z", MADRID)).toBe("2026-09-20T19:00");
    // Costa Rica va igual que San Luis todo el año.
    expect(localAIso("2026-09-20T19:00", "America/Costa_Rica")).toBe("2026-09-21T01:00:00.000Z");
    expect(localAIso("2026-09-20T19:00", "America/Argentina/Cordoba")).toBe("2026-09-20T22:00:00.000Z");
  });
  it("respeta los cambios de horario", () => {
    // Madrid adelanta el reloj el 29 mar 2026 (02:00 → 03:00) y lo atrasa el 25 oct (03:00 → 02:00).
    expect(localAIso("2026-03-29T01:30", MADRID)).toBe("2026-03-29T00:30:00.000Z");
    expect(localAIso("2026-03-29T03:30", MADRID)).toBe("2026-03-29T01:30:00.000Z");
    expect(localAIso("2026-10-25T12:00", MADRID)).toBe("2026-10-25T11:00:00.000Z");
    expect(sumarHoras("2026-03-28T23:00", 4, MADRID)).toBe("2026-03-29T04:00");
    // El 25 oct dura 25 horas: a las 00:30, "mañana" sigue siendo el 26.
    const madrugada = new Date("2026-10-24T22:30:00Z");
    expect(formatearCuando("2026-10-25T22:30:00Z", null, madrugada, MADRID)).toBe("Hoy · 23:30");
    expect(formatearCuando("2026-10-26T12:00:00Z", null, madrugada, MADRID)).toBe("Mañana · 13:00");
  });
  it("Hoy y Mañana son los de la zona del evento", () => {
    expect(formatearCuando("2026-09-19T20:00:00Z", null, AHORA, MADRID)).toBe("Hoy · 22:00");
    // El mismo instante: en Madrid es la 1:30 del domingo; en San Luis, las 17:30 del sábado.
    expect(formatearCuando("2026-09-19T23:30:00Z", null, AHORA, MADRID)).toBe("Mañana · 01:30");
    expect(formatearCuando("2026-09-19T23:30:00Z", null, AHORA)).toBe("Hoy · 17:30");
    expect(formatearLargo("2026-09-20T17:00:00Z", AHORA, "2026-09-20T19:00:00Z", MADRID)).toBe("domingo 20 de septiembre · 19:00 a 21:00");
    expect(horaCorta("2026-09-20T17:00:00Z", MADRID)).toBe("19:00");
    expect(diaCorto("2026-09-19T23:30:00Z", AHORA, MADRID)).toBe("Mañana");
    expect(diaLargo("2026-09-20", AHORA, MADRID)).toBe("domingo 20 de septiembre");
  });
  it("un evento sin hora de fin se va al acabar el día de su zona", () => {
    // A las 00:30 del domingo en Madrid (16:30 del sábado en San Luis), un evento del sábado a las 19:00 de Madrid ya pasó.
    const medianoche = new Date("2026-09-19T22:30:00Z");
    expect(eventoPaso("2026-09-19T17:00:00Z", null, medianoche, MADRID)).toBe(true);
    expect(eventoPaso("2026-09-19T17:00:00Z", null, medianoche)).toBe(false);
    expect(tramo("2026-09-19T17:00:00Z", medianoche, MADRID)).toBe("pasado");
    expect(inicioDelDia(AHORA, MADRID)).toBe("2026-09-18T22:00:00.000Z");
  });
  it("sugiere, ofrece días y avisa si ya pasó con el reloj de la zona", () => {
    // A las 18:00 de Madrid ya no se sugiere hoy; a las 10:00 de San Luis, sí.
    expect(sugerirInicio(AHORA, MADRID)).toBe("2026-09-20T19:00");
    expect(sugerirInicio(AHORA)).toBe("2026-09-19T19:00");
    const medianoche = new Date("2026-09-19T22:30:00Z");
    expect(proximosDias(medianoche, 3, MADRID)).toEqual([
      { valor: "2026-09-20", etiqueta: "Hoy" },
      { valor: "2026-09-21", etiqueta: "Mañana" },
      { valor: "2026-09-22", etiqueta: "mar 22" },
    ]);
    expect(proximosDias(medianoche, 1)[0].valor).toBe("2026-09-19");
    expect(yaPaso("2026-09-19T17:30", AHORA, MADRID)).toBe(true);
    expect(yaPaso("2026-09-19T17:30", AHORA)).toBe(false);
    expect(fraseCuando("2026-09-20T19:00", "2026-09-20T21:00", AHORA, MADRID)).toBe("domingo 20 de septiembre · 19:00 a 21:00");
  });
  it("una zona que no es cae en la de la ciudad inicial, y una fecha que no existe no se lee", () => {
    expect(zonaSegura("Europe/Madrid")).toBe("Europe/Madrid");
    expect(zonaSegura("America/Argentina/Cordoba")).toBe("America/Argentina/Cordoba");
    for (const mala of ["Marte/Olimpo", "CST", "UTC", "posix/America/Mexico_City", "", null, undefined]) expect(zonaSegura(mala)).toBe(ZONA_INICIAL);
    expect(formatearCuando("2026-09-20T01:00:00Z", null, AHORA, "Marte/Olimpo")).toBe("Hoy · 19:00");
    expect(localAIso("2026-02-31T19:00")).toBeNull();
    expect(localAIso("2026-09-20T24:00")).toBeNull();
  });
});

// Banco por zona: Ciudad de México, Bogotá y Madrid, con los dos cambios de horario de Madrid. Los valores de `terminaDe`
// son los mismos que la base calcula en `eventos.termina` (comprobados en un Postgres local): la misma regla en los dos lados.
describe("banco por zona", () => {
  const casos = [
    { zona: "America/Mexico_City", local: "2026-09-20T19:00", iso: "2026-09-21T01:00:00.000Z", termina: "2026-09-21T06:00:00.000Z" },
    { zona: "America/Bogota", local: "2026-09-20T19:00", iso: "2026-09-21T00:00:00.000Z", termina: "2026-09-21T05:00:00.000Z" },
    { zona: "Europe/Madrid", local: "2026-09-20T19:00", iso: "2026-09-20T17:00:00.000Z", termina: "2026-09-20T22:00:00.000Z" },
    // Madrid adelanta el reloj el 29 mar (un día de 23 horas) y lo atrasa el 25 oct (de 25 horas).
    { zona: "Europe/Madrid", local: "2026-03-29T01:30", iso: "2026-03-29T00:30:00.000Z", termina: "2026-03-29T22:00:00.000Z" },
    { zona: "Europe/Madrid", local: "2026-10-25T01:30", iso: "2026-10-24T23:30:00.000Z", termina: "2026-10-25T23:00:00.000Z" },
  ];
  const min = 60000;
  for (const c of casos) {
    it(`${c.zona} ${c.local}: hora, Hoy y Mañana, y cuándo deja de verse`, () => {
      expect(localAIso(c.local, c.zona)).toBe(c.iso);
      expect(isoALocal(c.iso, c.zona)).toBe(c.local);
      expect(terminaDe(c.iso, null, c.zona)).toBe(c.termina);
      // La base lo muestra mientras termina >= ahora: hasta ese instante, no después.
      expect(eventoPaso(c.iso, null, new Date(c.termina), c.zona)).toBe(false);
      expect(eventoPaso(c.iso, null, new Date(Date.parse(c.termina) + min), c.zona)).toBe(true);
      const medianoche = Date.parse(localAIso(`${c.local.slice(0, 10)}T00:00`, c.zona)!);
      expect(diaCorto(c.iso, new Date(medianoche + min), c.zona)).toBe("Hoy");
      expect(diaCorto(c.iso, new Date(medianoche - min), c.zona)).toBe("Mañana");
      expect(terminaDe(c.iso, "2026-12-01T00:00:00.000Z", c.zona)).toBe("2026-12-01T00:00:00.000Z");
    });
  }
  it("el mismo instante en las tres zonas", () => {
    // 04:30 UTC del 21 sep: 23:30 del 20 en Bogotá, 22:30 del 20 en San Luis, 06:30 del 21 en Madrid.
    const ahora = new Date("2026-09-21T04:30:00Z");
    const inicio = "2026-09-21T05:30:00Z";
    expect(formatearCuando(inicio, null, ahora, "America/Bogota")).toBe("Mañana · 00:30");
    expect(formatearCuando(inicio, null, ahora, "America/Mexico_City")).toBe("Hoy · 23:30");
    expect(formatearCuando(inicio, null, ahora, "Europe/Madrid")).toBe("Hoy · 07:30");
  });
  it("una fila sin zona se lee como de la ciudad inicial, sin romperse", () => {
    const sinZona = null as unknown as string;
    expect(formatearCuando("2026-09-20T01:00:00Z", null, AHORA, sinZona)).toBe("Hoy · 19:00");
    expect(horaCorta("2026-09-20T01:00:00Z", undefined)).toBe("19:00");
    expect(terminaDe("2026-09-21T01:00:00.000Z", null, sinZona)).toBe("2026-09-21T06:00:00.000Z");
    expect(eventoPaso("2026-09-19T05:59:00Z", null, AHORA, sinZona)).toBe(true);
    expect(localAIso("2026-09-20T19:00", sinZona)).toBe("2026-09-21T01:00:00.000Z");
  });
});
