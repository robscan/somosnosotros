import { describe, expect, it } from "vitest";
import { aFechaIcs, articuloDeHora, conMayuscula, cuandoCorto, horaDeAviso, combinarFechaHora, cuandoPorDia, cuandoVariosDias, diaConMes, diaConMesDe, diaCorto, diaLargo, diaPin, esDeVariosDias, esUnaNoche, eventoPaso, fechaCortaChip, filtroSinPasar, formatearCuando, formatearLargo, fraseCuando, horaCorta, horaDeReloj, horasDelEvento, inicioDelDia, isoALocal, localAIso, proximosDias, rangoCorto, rangoDeReloj, reloj24, sumarHoras, terminaDe, tramo, yaPaso, ZONA_INICIAL, zonaSegura } from "./fechas";

// "ahora": sábado 19 sep 2026, 10:00 hora de la ciudad (16:00Z)
const AHORA = new Date("2026-09-19T16:00:00Z");

describe("la hora de toda la app, en 12 horas (OL-418: «19:00 hrs era confuso, es mejor usar 7:00 pm»)", () => {
  it("siempre con minutos y con «am» o «pm» en minúsculas tras un espacio", () => {
    expect(horaDeReloj("19:00")).toBe("7:00 pm");
    expect(horaDeReloj("09:30")).toBe("9:30 am");
    expect(horaDeReloj("07:05")).toBe("7:05 am");
    expect(horaDeReloj("23:59")).toBe("11:59 pm");
    // Como la guarda la base, con segundos.
    expect(horaDeReloj("18:00:00")).toBe("6:00 pm");
  });
  it("mediodía es «12:00 pm» y medianoche «12:00 am»", () => {
    expect(horaDeReloj("12:00")).toBe("12:00 pm");
    expect(horaDeReloj("12:30")).toBe("12:30 pm");
    expect(horaDeReloj("00:00")).toBe("12:00 am");
    expect(horaDeReloj("00:15")).toBe("12:15 am");
    expect(horaDeReloj("13:00")).toBe("1:00 pm");
    expect(horaDeReloj("01:00")).toBe("1:00 am");
  });
  it("un rango con el mismo «am» o «pm» lo dice una vez, al final; guion corto sin espacios", () => {
    expect(rangoDeReloj("19:00", "21:30")).toBe("7:00–9:30 pm");
    expect(rangoDeReloj("09:00", "11:00")).toBe("9:00–11:00 am");
    expect(rangoDeReloj("12:00", "14:00")).toBe("12:00–2:00 pm");
  });
  it("un rango que cambia de «am» a «pm» (o de noche a madrugada) lleva cada uno el suyo", () => {
    expect(rangoDeReloj("20:00", "02:00")).toBe("8:00 pm–2:00 am");
    expect(rangoDeReloj("10:00", "18:00")).toBe("10:00 am–6:00 pm");
    expect(rangoDeReloj("11:00", "12:00")).toBe("11:00 am–12:00 pm");
    expect(rangoDeReloj("22:00", "00:00")).toBe("10:00 pm–12:00 am");
  });
  it("«la» con la una y «las» con las demás", () => {
    expect(articuloDeHora("13:00")).toBe("la");
    expect(articuloDeHora("01:30")).toBe("la");
    expect(articuloDeHora("12:00")).toBe("las");
    expect(articuloDeHora("20:00")).toBe("las");
  });
  it("en la zona del evento, y la de 24 h solo para comparar", () => {
    expect(horaCorta("2026-09-20T01:00:00Z")).toBe("7:00 pm");
    expect(horaCorta("2026-09-20T18:00:00Z")).toBe("12:00 pm");
    expect(horaCorta("2026-09-20T06:00:00Z")).toBe("12:00 am");
    expect(reloj24("2026-09-20T01:00:00Z")).toBe("19:00");
    expect(reloj24("2026-09-20T06:00:00Z")).toBe("00:00");
  });
  it("las horas de un evento en su día: sin fin, la de inicio; con fin el mismo día, el rango; una noche, también el rango", () => {
    expect(horasDelEvento("2026-09-20T01:00:00Z", null)).toBe("7:00 pm");
    expect(horasDelEvento("2026-09-20T01:00:00Z", "2026-09-20T03:30:00Z")).toBe("7:00–9:30 pm");
    expect(horasDelEvento("2026-09-19T17:00:00Z", "2026-09-19T20:00:00Z")).toBe("11:00 am–2:00 pm");
    // Sábado 8:00 pm a domingo 2:00 am: una noche es un día con su rango.
    expect(horasDelEvento("2026-10-18T02:00:00Z", "2026-10-18T08:00:00Z")).toBe("8:00 pm–2:00 am");
    // Lo de varios días: solo la de inicio (sus días y su horario los dice `cuandoVariosDias`).
    expect(horasDelEvento("2026-10-11T02:00:00Z", "2026-10-13T03:00:00Z")).toBe("8:00 pm");
  });
  it("una noche: su fin cae al día siguiente antes de su hora de inicio", () => {
    expect(esUnaNoche("2026-10-18T02:00:00Z", "2026-10-18T08:00:00Z")).toBe(true);
    expect(esUnaNoche("2026-10-18T02:00:00Z", "2026-10-18T06:00:00Z")).toBe(true); // hasta las 12:00 am
    expect(esUnaNoche("2026-10-18T02:00:00Z", "2026-10-18T04:00:00Z")).toBe(false); // termina el mismo día
    expect(esUnaNoche("2026-10-18T02:00:00Z", "2026-10-19T03:00:00Z")).toBe(false); // dos días
    expect(esUnaNoche("2026-10-18T02:00:00Z", null)).toBe(false);
  });
});

describe("una noche se dice de una sola manera (OL-418)", () => {
  // Sábado 17 de oct, de 8:00 pm a 2:00 am del domingo, en la ciudad.
  const inicio = "2026-10-18T02:00:00Z";
  const fin = "2026-10-18T08:00:00Z";
  const ahora = new Date("2026-10-12T16:00:00Z");
  it("un solo día con su rango, en la lista, la ficha y «Revisa»; nunca dos días ni «→»", () => {
    expect(formatearCuando(inicio, fin, ahora)).toBe("sáb 17 de oct · 8:00 pm–2:00 am");
    expect(formatearLargo(inicio, ahora, fin)).toBe("sábado 17 de octubre · 8:00 pm–2:00 am");
    expect(fraseCuando("2026-10-17T20:00", "2026-10-18T02:00", ahora)).toBe("sábado 17 de octubre · 8:00 pm–2:00 am");
  });
  it("lo que de verdad dura varios días sigue con sus días («Del … al …»)", () => {
    expect(formatearCuando(inicio, "2026-10-19T03:00:00Z", ahora)).toBe("Del 17 al 18 de oct · 8:00–9:00 pm");
  });
});

describe("fechas", () => {
  it("convierte la hora del teléfono a ISO con la zona de la ciudad y de vuelta", () => {
    const iso = localAIso("2026-09-20T19:00");
    expect(iso).toBe("2026-09-21T01:00:00.000Z");
    expect(isoALocal(iso)).toBe("2026-09-20T19:00");
    expect(localAIso("nada")).toBeNull();
    expect(localAIso("")).toBeNull();
  });
  it("formatea Hoy / Mañana / día corto y el fin", () => {
    expect(formatearCuando("2026-09-20T01:00:00Z", null, AHORA)).toBe("Hoy · 7:00 pm");
    expect(formatearCuando("2026-09-21T01:00:00Z", "2026-09-21T03:00:00Z", AHORA)).toBe("Mañana · 7:00–9:00 pm");
    expect(formatearCuando("2026-09-27T01:00:00Z", null, AHORA)).toBe("sáb 26 de sep · 7:00 pm");
  });
  it("escribe el año solo cuando no es el actual", () => {
    expect(formatearCuando("2027-08-23T01:00:00Z", null, AHORA)).toBe("dom 22 de ago de 2027 · 7:00 pm");
    expect(formatearLargo("2027-08-23T01:00:00Z", AHORA)).toBe("domingo 22 de agosto de 2027 · 7:00 pm");
    expect(formatearLargo("2026-09-21T01:00:00Z", AHORA)).toBe("domingo 20 de septiembre · 7:00 pm");
    expect(formatearLargo("2026-09-21T01:00:00Z", AHORA, "2026-09-21T03:00:00Z")).toBe("domingo 20 de septiembre · 7:00–9:00 pm");
  });
  it("clasifica en hoy, semana, próximos y pasado", () => {
    expect(tramo("2026-09-20T01:00:00Z", AHORA)).toBe("hoy"); // 19:00 de hoy
    expect(tramo("2026-09-19T14:00:00Z", AHORA)).toBe("hoy"); // empezó hace 2 h
    expect(tramo("2026-09-19T12:00:00Z", AHORA)).toBe("hoy"); // empezó a las 6:00: sigue siendo de hoy
    expect(tramo("2026-09-19T03:00:00Z", AHORA)).toBe("pasado"); // ayer a las 21:00
    expect(tramo("2026-09-24T01:00:00Z", AHORA)).toBe("semana");
    expect(tramo("2026-10-05T01:00:00Z", AHORA)).toBe("proximos");
  });
  it("el pin del mapa dice Hoy, el día en tres letras con acento, o nada (docs/rediseno/35)", () => {
    expect(diaPin("2026-09-20T01:00:00Z", AHORA)).toBe("Hoy"); // 19:00 de hoy
    expect(diaPin("2026-09-24T01:00:00Z", AHORA)).toBe("Mié"); // miércoles de esta semana
    expect(diaPin("2026-09-26T01:00:00Z", AHORA)).toBe("Vie"); // viernes de esta semana
    expect(diaPin("2026-09-19T03:00:00Z", AHORA)).toBeNull(); // pasado
    expect(diaPin("2026-10-05T01:00:00Z", AHORA)).toBeNull(); // fuera de la semana
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
    expect(fraseCuando("2026-09-19T19:00", "2026-09-19T21:00", AHORA)).toBe("sábado 19 de septiembre · 7:00–9:00 pm");
    expect(fraseCuando("2026-09-19T19:00", undefined, AHORA)).toBe("sábado 19 de septiembre · 7:00 pm");
    expect(fraseCuando("nada")).toBe("");
  });
  it("un evento ya pasó cuando terminó o, sin hora de fin, 3 horas después de empezar (OL-358)", () => {
    expect(eventoPaso("2026-09-19T14:30:00Z", null, AHORA)).toBe(false); // hoy 8:30, sin fin: se ve hasta las 11:30
    expect(eventoPaso("2026-09-19T13:00:00Z", null, AHORA)).toBe(false); // hoy 7:00, sin fin: las 10:00 justas aún cuentan
    expect(eventoPaso("2026-09-19T12:59:00Z", null, AHORA)).toBe(true); // hoy 6:59, sin fin: se fue a las 9:59
    expect(eventoPaso("2026-09-19T06:00:00Z", null, AHORA)).toBe(true); // hoy 0:00, sin fin: ya no se queda todo el día
    expect(eventoPaso("2026-09-19T11:00:00Z", "2026-09-19T17:00:00Z", AHORA)).toBe(false); // termina a las 11:00
    expect(eventoPaso("2026-09-19T11:00:00Z", "2026-09-19T15:59:00Z", AHORA)).toBe(true); // terminó a las 9:59
    expect(inicioDelDia(AHORA)).toBe("2026-09-19T06:00:00.000Z");
  });
  it("la regla de las 3 horas: sin fin a las 10:00 sigue a las 12:59 y ya pasó a las 13:01; con fin manda el fin", () => {
    const diez = "2026-10-09T16:00:00Z"; // 10:00 en San Luis Potosí
    expect(terminaDe(diez, null)).toBe("2026-10-09T19:00:00.000Z");
    expect(eventoPaso(diez, null, new Date("2026-10-09T18:59:00Z"))).toBe(false); // 12:59
    expect(eventoPaso(diez, null, new Date("2026-10-09T19:01:00Z"))).toBe(true); // 13:01
    expect(terminaDe(diez, "2026-10-09T23:00:00Z")).toBe("2026-10-09T23:00:00.000Z"); // fin 17:00
    expect(eventoPaso(diez, "2026-10-09T23:00:00Z", new Date("2026-10-09T19:01:00Z"))).toBe(false);
    expect(eventoPaso(diez, "2026-10-09T17:00:00Z", new Date("2026-10-09T17:30:00Z"))).toBe(true); // fin corto antes de 3 h
  });
  it("la regla de las 3 horas no depende de la zona", () => {
    expect(terminaDe("2026-09-19T17:00:00Z", null, "Europe/Madrid")).toBe("2026-09-19T20:00:00.000Z");
    expect(terminaDe("2026-09-19T17:00:00Z", null, "Asia/Tokyo")).toBe("2026-09-19T20:00:00.000Z");
    // Una noche que cruza la medianoche: 22:00 sin fin se ve hasta la 1:00.
    expect(eventoPaso("2026-09-20T04:00:00Z", null, new Date("2026-09-20T06:30:00Z"))).toBe(false);
  });
  it("las listas filtran con termina, que la base calcula en la zona de cada evento", () => {
    expect(filtroSinPasar(AHORA)).toBe(`termina.gte."2026-09-19T16:00:00.000Z"`);
  });
});

describe("fechaCortaChip", () => {
  it("«mié 30 sep»: día en tres letras con acento y minúscula, número sin cero, mes en tres letras, sin «de»", () => {
    expect(fechaCortaChip("2026-09-30T18:00:00Z")).toBe("mié 30 sep");
    expect(fechaCortaChip("2026-09-24T18:00:00Z")).toBe("jue 24 sep");
    expect(fechaCortaChip("2026-01-05T18:00:00Z")).toBe("lun 5 ene");
  });
  it("nunca dice Hoy ni Mañana, siempre la fecha corta", () => {
    // AHORA es sábado 19 sep 2026; "2026-09-20T01:00:00Z" es hoy (19:00 hora local); "...21T01:00:00Z" es mañana.
    expect(fechaCortaChip("2026-09-20T01:00:00Z")).toBe("sáb 19 sep");
    expect(fechaCortaChip("2026-09-21T01:00:00Z")).toBe("dom 20 sep");
  });
  it("en la zona pedida (America/Mexico_City por defecto)", () => {
    expect(fechaCortaChip("2026-09-19T20:00:00Z", "Europe/Madrid")).toBe("sáb 19 sep"); // 22:00 en Madrid, mismo día
    expect(fechaCortaChip("2026-09-19T22:30:00Z", "Europe/Madrid")).toBe("dom 20 sep"); // 00:30 del día siguiente en Madrid
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
    expect(formatearCuando("2026-10-25T22:30:00Z", null, madrugada, MADRID)).toBe("Hoy · 11:30 pm");
    expect(formatearCuando("2026-10-26T12:00:00Z", null, madrugada, MADRID)).toBe("Mañana · 1:00 pm");
  });
  it("Hoy y Mañana son los de la zona del evento", () => {
    expect(formatearCuando("2026-09-19T20:00:00Z", null, AHORA, MADRID)).toBe("Hoy · 10:00 pm");
    // El mismo instante: en Madrid es la 1:30 del domingo; en San Luis, las 17:30 del sábado.
    expect(formatearCuando("2026-09-19T23:30:00Z", null, AHORA, MADRID)).toBe("Mañana · 1:30 am");
    expect(formatearCuando("2026-09-19T23:30:00Z", null, AHORA)).toBe("Hoy · 5:30 pm");
    expect(formatearLargo("2026-09-20T17:00:00Z", AHORA, "2026-09-20T19:00:00Z", MADRID)).toBe("domingo 20 de septiembre · 7:00–9:00 pm");
    expect(horaCorta("2026-09-20T17:00:00Z", MADRID)).toBe("7:00 pm");
    expect(diaCorto("2026-09-19T23:30:00Z", AHORA, MADRID)).toBe("Mañana");
    expect(diaLargo("2026-09-20", AHORA, MADRID)).toBe("domingo 20 de septiembre");
  });
  it("un evento sin hora de fin se va 3 h después de empezar, en cualquier zona; el tramo agrupa por el día de su zona", () => {
    // A las 00:30 del domingo en Madrid (16:30 del sábado en San Luis), un evento del sábado a las 19:00 de Madrid (17:00Z) ya pasó (20:00Z).
    const medianoche = new Date("2026-09-19T22:30:00Z");
    expect(eventoPaso("2026-09-19T17:00:00Z", null, medianoche, MADRID)).toBe(true);
    expect(eventoPaso("2026-09-19T17:00:00Z", null, medianoche)).toBe(true);
    expect(eventoPaso("2026-09-19T17:00:00Z", null, new Date("2026-09-19T19:59:00Z"), MADRID)).toBe(false);
    expect(tramo("2026-09-19T17:00:00Z", medianoche, MADRID)).toBe("pasado");
    expect(tramo("2026-09-19T17:00:00Z", medianoche)).toBe("hoy");
    expect(inicioDelDia(AHORA, MADRID)).toBe("2026-09-18T22:00:00.000Z");
  });
  it("ofrece días y avisa si ya pasó con el reloj de la zona", () => {
    const medianoche = new Date("2026-09-19T22:30:00Z");
    expect(proximosDias(medianoche, 3, MADRID)).toEqual([
      { valor: "2026-09-20", etiqueta: "Hoy" },
      { valor: "2026-09-21", etiqueta: "Mañana" },
      { valor: "2026-09-22", etiqueta: "mar 22" },
    ]);
    expect(proximosDias(medianoche, 1)[0].valor).toBe("2026-09-19");
    expect(yaPaso("2026-09-19T17:30", AHORA, MADRID)).toBe(true);
    expect(yaPaso("2026-09-19T17:30", AHORA)).toBe(false);
    expect(fraseCuando("2026-09-20T19:00", "2026-09-20T21:00", AHORA, MADRID)).toBe("domingo 20 de septiembre · 7:00–9:00 pm");
  });
  it("una zona que no es cae en la de la ciudad inicial, y una fecha que no existe no se lee", () => {
    expect(zonaSegura("Europe/Madrid")).toBe("Europe/Madrid");
    expect(zonaSegura("America/Argentina/Cordoba")).toBe("America/Argentina/Cordoba");
    for (const mala of ["Marte/Olimpo", "CST", "UTC", "posix/America/Mexico_City", "", null, undefined]) expect(zonaSegura(mala)).toBe(ZONA_INICIAL);
    expect(formatearCuando("2026-09-20T01:00:00Z", null, AHORA, "Marte/Olimpo")).toBe("Hoy · 7:00 pm");
    expect(localAIso("2026-02-31T19:00")).toBeNull();
    expect(localAIso("2026-09-20T24:00")).toBeNull();
  });
});

// Banco por zona: Ciudad de México, Bogotá y Madrid, con los dos cambios de horario de Madrid. Los valores de `terminaDe`
// son los mismos que la base calcula en `eventos.termina` (comprobados en un Postgres local): la misma regla en los dos lados.
describe("banco por zona", () => {
  const casos = [
    { zona: "America/Mexico_City", local: "2026-09-20T19:00", iso: "2026-09-21T01:00:00.000Z", termina: "2026-09-21T04:00:00.000Z" },
    { zona: "America/Bogota", local: "2026-09-20T19:00", iso: "2026-09-21T00:00:00.000Z", termina: "2026-09-21T03:00:00.000Z" },
    { zona: "Europe/Madrid", local: "2026-09-20T19:00", iso: "2026-09-20T17:00:00.000Z", termina: "2026-09-20T20:00:00.000Z" },
    // Madrid adelanta el reloj el 29 mar y lo atrasa el 25 oct: las 3 h son reales, no de reloj (OL-358).
    { zona: "Europe/Madrid", local: "2026-03-29T01:30", iso: "2026-03-29T00:30:00.000Z", termina: "2026-03-29T03:30:00.000Z" },
    { zona: "Europe/Madrid", local: "2026-10-25T01:30", iso: "2026-10-24T23:30:00.000Z", termina: "2026-10-25T02:30:00.000Z" },
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
    expect(formatearCuando(inicio, null, ahora, "America/Bogota")).toBe("Mañana · 12:30 am");
    expect(formatearCuando(inicio, null, ahora, "America/Mexico_City")).toBe("Hoy · 11:30 pm");
    expect(formatearCuando(inicio, null, ahora, "Europe/Madrid")).toBe("Hoy · 7:30 am");
  });
  it("una fila sin zona se lee como de la ciudad inicial, sin romperse", () => {
    const sinZona = null as unknown as string;
    expect(formatearCuando("2026-09-20T01:00:00Z", null, AHORA, sinZona)).toBe("Hoy · 7:00 pm");
    expect(horaCorta("2026-09-20T01:00:00Z", undefined)).toBe("7:00 pm");
    expect(terminaDe("2026-09-21T01:00:00.000Z", null, sinZona)).toBe("2026-09-21T04:00:00.000Z");
    expect(eventoPaso("2026-09-19T05:59:00Z", null, AHORA, sinZona)).toBe(true);
    expect(localAIso("2026-09-20T19:00", sinZona)).toBe("2026-09-21T01:00:00.000Z");
  });
});

describe("un evento de varios días dice sus días y su horario de cada día, sin escribir su 23:59 (OL-298, OL-309)", () => {
  // Inicio sáb 26 sep 19:00 en la ciudad (UTC-6); fin lun 28 sep 23:59 en la ciudad = 05:59Z del 29.
  const inicio = "2026-09-27T01:00:00Z";
  const finDelDia = "2026-09-29T05:59:00Z";

  it("varios días con 23:59 (sin hora de fin): los días y solo la hora de inicio", () => {
    expect(formatearCuando(inicio, finDelDia, AHORA)).toBe("Del 26 al 28 de sep · 7:00 pm");
    expect(formatearLargo(inicio, AHORA, finDelDia)).toBe("sábado 26 de septiembre · 7:00 pm hasta lunes 28 de septiembre");
    expect(fraseCuando("2026-09-26T19:00", "2026-09-28T23:59", AHORA)).toBe("sábado 26 de septiembre · 7:00 pm hasta lunes 28 de septiembre");
  });
  it("varios días con hora de fin: el horario de cada día, con la hora de toda la app", () => {
    expect(formatearCuando(inicio, "2026-09-29T03:00:00Z", AHORA)).toBe("Del 26 al 28 de sep · 7:00–9:00 pm");
    expect(formatearCuando(inicio, "2026-09-29T05:58:00Z", AHORA)).toBe("Del 26 al 28 de sep · 7:00–11:58 pm");
    expect(formatearLargo(inicio, AHORA, "2026-09-29T03:00:00Z")).toBe("sábado 26 de septiembre · 7:00 pm hasta lunes 28 de septiembre · 9:00 pm");
  });
  it("el ejemplo del alta: del 10 al 12 de oct de 8:00 a 9:00 pm", () => {
    expect(formatearCuando("2026-10-11T02:00:00Z", "2026-10-13T03:00:00Z", AHORA)).toBe("Del 10 al 12 de oct · 8:00–9:00 pm");
    expect(cuandoVariosDias("2026-10-11T02:00:00Z", "2026-10-13T03:00:00Z", AHORA)).toEqual({ dias: "Del 10 al 12 de oct", horas: "8:00–9:00 pm" });
  });
  it("de la mañana a la tarde, cada hora con su «am» o «pm»", () => {
    expect(formatearCuando("2026-10-10T17:00:00Z", "2026-10-12T20:00:00Z", AHORA)).toBe("Del 10 al 12 de oct · 11:00 am–2:00 pm");
  });
  it("la cadena es limpia: sin espacios no separables ni unidores de palabra (viaja a compartir, avisos y correos)", () => {
    const textos = [
      formatearCuando("2026-10-11T02:00:00Z", "2026-10-13T03:00:00Z", AHORA),
      formatearCuando(inicio, finDelDia, AHORA),
      cuandoVariosDias("2026-10-11T02:00:00Z", "2026-10-13T03:00:00Z", AHORA)?.horas ?? "",
    ];
    for (const t of textos) expect(t).not.toMatch(/[\u00a0\u202f\u2060]/);
  });
  it("dos días seguidos también son varios días; un día con fin posterior a la hora de inicio, no", () => {
    expect(formatearCuando("2026-10-11T02:00:00Z", "2026-10-12T03:00:00Z", AHORA)).toBe("Del 10 al 11 de oct · 8:00–9:00 pm");
    expect(formatearCuando("2026-10-11T02:00:00Z", "2026-10-11T04:00:00Z", AHORA)).toBe("sáb 10 de oct · 8:00–10:00 pm");
  });
  it("una noche que cruza la medianoche no es un evento de varios días: un día con su rango (OL-418)", () => {
    // Empieza vie 9 oct 10:00 pm y termina sáb 10 a la 1:00 am (fin antes de la hora de inicio).
    expect(formatearCuando("2026-10-10T04:00:00Z", "2026-10-10T07:00:00Z", AHORA)).toBe("vie 9 de oct · 10:00 pm–1:00 am");
    expect(cuandoVariosDias("2026-10-10T04:00:00Z", "2026-10-10T07:00:00Z", AHORA)).toBeNull();
  });
  it("un solo día que termina a las 23:59 la conserva", () => {
    expect(formatearCuando(inicio, "2026-09-27T05:59:00Z", AHORA)).toBe("sáb 26 de sep · 7:00–11:59 pm");
    expect(formatearLargo(inicio, AHORA, "2026-09-27T05:59:00Z")).toBe("sábado 26 de septiembre · 7:00–11:59 pm");
  });
  it("respeta la zona del evento: las 23:59 de la ciudad no son las 23:59 de Madrid", () => {
    // Las 23:59 de Madrid (21:59Z) se esconden allá; el mismo instante visto con la zona de la ciudad (15:59) lleva su hora.
    expect(formatearCuando("2026-09-26T17:00:00Z", "2026-09-28T21:59:00Z", AHORA, "Europe/Madrid")).toBe("Del 26 al 28 de sep · 7:00 pm");
    expect(formatearCuando("2026-09-26T17:00:00Z", "2026-09-28T21:59:00Z", AHORA)).toBe("Del 26 al 28 de sep · 11:00 am–3:59 pm");
    // Y las 23:59 de la ciudad, vistas desde Madrid (07:59 del día siguiente), también llevan su hora.
    expect(formatearCuando(inicio, finDelDia, AHORA, "Europe/Madrid")).toBe("Del 27 al 29 de sep · 3:00–7:59 am");
  });
  it("sin fin no hay varios días", () => {
    expect(cuandoVariosDias(inicio, null, AHORA)).toBeNull();
    expect(cuandoVariosDias(inicio, undefined, AHORA)).toBeNull();
  });
});

describe("rangoCorto: «Del 10 al 12 de oct»", () => {
  const HOY = "2026-10-06";
  it("el mismo mes lleva el mes una sola vez", () => {
    expect(rangoCorto("2026-10-10", "2026-10-12", HOY)).toBe("Del 10 al 12 de oct");
  });
  it("de un mes a otro, cada día con su mes", () => {
    expect(rangoCorto("2026-10-30", "2026-11-02", HOY)).toBe("Del 30 de oct al 2 de nov");
  });
  it("el año solo se escribe si no es el actual", () => {
    expect(rangoCorto("2027-02-10", "2027-02-12", HOY)).toBe("Del 10 al 12 de feb de 2027");
    expect(rangoCorto("2026-12-30", "2027-01-02", HOY)).toBe("Del 30 de dic al 2 de ene de 2027");
  });
});


describe("el día de una sesión y el cuándo con horario por día (OL-311)", () => {
  const ahora = new Date("2026-10-06T12:00:00Z");
  it("diaConMes dice «vie 9 de oct» (sin «Hoy» ni «Mañana») en la zona del evento, con el año si no es el actual", () => {
    // Las 8:00 p.m. del viernes en San Luis son las 02:00 UTC del sábado: el día es el del lugar, no el de UTC.
    expect(diaConMes("2026-10-10T02:00:00Z", ahora, "America/Mexico_City")).toBe("vie 9 de oct");
    expect(diaConMes("2026-10-07T02:00:00Z", ahora, "America/Mexico_City")).toBe("mar 6 de oct");
    expect(diaConMes("2027-02-11T02:00:00Z", ahora, "America/Mexico_City")).toBe("mié 10 de feb de 2027");
  });
  it("diaConMesDe lo dice desde un día de calendario; uno que no es fecha vuelve tal cual", () => {
    expect(diaConMesDe("2026-10-09", ahora, "America/Mexico_City")).toBe("vie 9 de oct");
    expect(diaConMesDe("2026-10-11", ahora, "America/Mexico_City")).toBe("dom 11 de oct");
    expect(diaConMesDe("no es fecha", ahora)).toBe("no es fecha");
  });
  it("cuandoPorDia: los días y «horarios por día», con la cadena limpia", () => {
    const texto = cuandoPorDia("2026-10-10T02:00:00Z", "2026-10-12T03:00:00Z", "America/Mexico_City", ahora);
    expect(texto).toBe("Del 9 al 11 de oct · horarios por día");
    expect(texto).not.toMatch(/[\u00a0\u202f\u2060]/);
  });
});

describe("esDeVariosDias (OL-320)", () => {
  it("un fin otro día después de la hora de inicio, o dos días más tarde, es de varios días", () => {
    expect(esDeVariosDias("2026-10-11T02:00:00Z", "2026-10-13T03:00:00Z", "America/Mexico_City")).toBe(true);
    expect(esDeVariosDias("2026-10-10T16:00:00Z", "2026-10-11T18:00:00Z", "America/Mexico_City")).toBe(true);
  });
  it("sin fin, o el mismo día, no", () => {
    expect(esDeVariosDias("2026-10-10T16:00:00Z", null, "America/Mexico_City")).toBe(false);
    expect(esDeVariosDias("2026-10-10T16:00:00Z", "2026-10-10T18:00:00Z", "America/Mexico_City")).toBe(false);
  });
  it("una noche que cruza la medianoche es una noche, no dos días (hasta la misma hora del día siguiente); más tarde que eso ya son dos días", () => {
    expect(esDeVariosDias("2026-10-11T04:00:00Z", "2026-10-11T07:00:00Z", "America/Mexico_City")).toBe(false); // 22:00 → 01:00
    expect(esDeVariosDias("2026-10-11T04:00:00Z", "2026-10-12T04:00:00Z", "America/Mexico_City")).toBe(false); // 22:00 → 22:00 del día siguiente: todavía una noche
    expect(esDeVariosDias("2026-10-11T04:00:00Z", "2026-10-12T05:00:00Z", "America/Mexico_City")).toBe(true); // 22:00 → 23:00 del día siguiente
  });
});

describe("cuandoCorto: la fecha corta de los avisos (OL-480)", () => {
  // Jueves 8 de octubre de 2026, 10:00 en San Luis (las fechas del prototipo firmado, bitácora 510).
  const JUEVES = new Date("2026-10-08T16:00:00Z");
  const Z = "America/Mexico_City";
  it("«vie 9 · 8 pm»: día de la semana y número, la hora sin «:00»", () => {
    expect(cuandoCorto("2026-10-10T02:00:00Z", null, JUEVES, Z)).toBe("vie 9 · 8 pm");
    expect(cuandoCorto("2026-10-10T02:30:00Z", null, JUEVES, Z)).toBe("vie 9 · 8:30 pm");
    expect(horaDeAviso("2026-10-09T19:00:00Z", Z)).toBe("1 pm");
  });
  it("sin «Hoy» ni «Mañana» salvo que se pida: con `relativo`, en minúscula para ir a media frase", () => {
    expect(cuandoCorto("2026-10-09T02:00:00Z", null, JUEVES, Z)).toBe("jue 8 · 8 pm");
    expect(cuandoCorto("2026-10-09T02:00:00Z", null, JUEVES, Z, true)).toBe("hoy a las 8 pm");
    expect(cuandoCorto("2026-10-10T02:00:00Z", null, JUEVES, Z, true)).toBe("mañana a las 8 pm");
    expect(cuandoCorto("2026-10-09T19:00:00Z", null, JUEVES, Z, true)).toBe("mañana a la 1 pm");
    // Más lejos que mañana, `relativo` no inventa nada: la fecha corta.
    expect(cuandoCorto("2026-10-11T02:00:00Z", null, JUEVES, Z, true)).toBe("sáb 10 · 8 pm");
    expect(conMayuscula("hoy a las 8 pm")).toBe("Hoy a las 8 pm");
  });
  it("a dos semanas o más, con el mes (sin él, «vie 9» se repite cada mes); otro año, con el año", () => {
    expect(cuandoCorto("2026-10-22T02:00:00Z", null, JUEVES, Z)).toBe("mié 21 · 8 pm");
    expect(cuandoCorto("2026-10-23T02:00:00Z", null, JUEVES, Z)).toBe("jue 22 de oct · 8 pm");
    expect(cuandoCorto("2027-01-09T02:00:00Z", null, JUEVES, Z)).toBe("vie 8 de ene de 2027 · 8 pm");
  });
  it("lo que dura varios días dice sus días; ya empezado, hasta cuándo", () => {
    expect(cuandoCorto("2026-10-09T17:00:00Z", "2026-10-19T05:59:00Z", JUEVES, Z)).toBe("del vie 9 al dom 18");
    expect(cuandoCorto("2026-10-01T17:00:00Z", "2026-10-19T05:59:00Z", JUEVES, Z)).toBe("hasta el dom 18");
    // Una noche que cruza la medianoche es un solo día.
    expect(cuandoCorto("2026-10-10T04:00:00Z", "2026-10-10T08:00:00Z", JUEVES, Z)).toBe("vie 9 · 10 pm");
  });
  it("en la zona del evento: el mismo instante es otro día en Madrid", () => {
    expect(cuandoCorto("2026-10-08T23:00:00Z", null, JUEVES, "Europe/Madrid", true)).toBe("mañana a la 1 am");
    expect(cuandoCorto("2026-10-08T23:00:00Z", null, JUEVES, Z, true)).toBe("hoy a las 5 pm");
  });
});
