import { describe, expect, it } from "vitest";
import { archivoIcs, datosEventoNativo, diasActivosCalendario, diasEnMes, escaparIcs, etiquetaDia, hayMesAnterior, haySiguienteMes, mesAnterior, mesInicial, mesSiguiente, nombreArchivoIcs, pasoMasCercano, pasosHora, semanasDelMes, sumarDiasIso } from "./calendario";

const evento = { id: "fba5bd3e-7898-4261-b4fd-97a17b1d61ee", titulo: "Navidad queretana: danza, música; y más", inicio: "2026-12-06T18:00:00.000Z", fin: null, descripcion: "Espectáculo\nnavideño", lugar: "Teatro del IMSS, Tomasa Estévez 805" };

describe("escaparIcs", () => {
  it("escapa barra, punto y coma, coma y saltos de línea", () => {
    expect(escaparIcs("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("archivoIcs", () => {
  const ics = archivoIcs(evento, new Date("2026-09-16T23:00:00.000Z"));
  const lineas = ics.split("\r\n");

  it("lleva una alerta 1 hora antes, dentro del evento", () => {
    const inicioAlerta = lineas.indexOf("BEGIN:VALARM");
    expect(inicioAlerta).toBeGreaterThan(lineas.indexOf("BEGIN:VEVENT"));
    expect(lineas.indexOf("END:VALARM")).toBeLessThan(lineas.indexOf("END:VEVENT"));
    expect(lineas).toContain("TRIGGER:-PT1H");
    expect(lineas).toContain("ACTION:DISPLAY");
  });
  it("sin hora de fin dura 2 horas", () => {
    expect(lineas).toContain("DTSTART:20261206T180000Z");
    expect(lineas).toContain("DTEND:20261206T200000Z");
  });
  it("el título y el lugar van escapados, con el punto y coma incluido", () => {
    expect(lineas).toContain("SUMMARY:Navidad queretana: danza\\, música\\; y más");
    expect(lineas).toContain("LOCATION:Teatro del IMSS\\, Tomasa Estévez 805");
  });
  it("sin lugar no hay renglón de lugar; la descripción termina con la liga", () => {
    const sinLugar = archivoIcs({ ...evento, lugar: null }).split("\r\n");
    expect(sinLugar.some((l) => l.startsWith("LOCATION:"))).toBe(false);
    expect(lineas).toContain(`DESCRIPTION:Espectáculo\\nnavideño\\nhttps://somosnosotros.org/eventos/${evento.id}`);
  });
  it("termina en CRLF", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("datosEventoNativo", () => {
  it("sin hora de fin, dura 2 horas (mismo criterio que archivoIcs)", () => {
    const datos = datosEventoNativo({ ...evento, fin: null });
    expect(datos.inicio).toBe(evento.inicio);
    expect(datos.fin).toBe("2026-12-06T20:00:00.000Z");
  });

  it("respeta la hora de fin cuando llega", () => {
    const datos = datosEventoNativo({ ...evento, fin: "2026-12-06T21:00:00.000Z" });
    expect(datos.fin).toBe("2026-12-06T21:00:00.000Z");
  });

  it("arma la URL de la ficha (slug si lo hay) y pasa el lugar y las notas sin escapar", () => {
    const datos = datosEventoNativo({ ...evento, slug: "navidad-queretana" });
    expect(datos.url).toBe("https://somosnosotros.org/eventos/navidad-queretana");
    expect(datos.titulo).toBe(evento.titulo);
    expect(datos.lugar).toBe(evento.lugar);
    expect(datos.notas).toBe(evento.descripcion);
  });

  it("sin slug, la URL cae al UUID", () => {
    expect(datosEventoNativo({ ...evento, slug: null }).url).toBe(`https://somosnosotros.org/eventos/${evento.id}`);
  });
});

describe("nombreArchivoIcs", () => {
  it("usa el título en ASCII, sin acentos ni signos", () => {
    expect(nombreArchivoIcs("Noche de son en el patio")).toBe("noche-de-son-en-el-patio.ics");
    expect(nombreArchivoIcs("KOSMOS: Camerata de San Luis, música")).toBe("kosmos-camerata-de-san-luis-musica.ics");
  });
  it("si no queda nada, evento.ics", () => {
    expect(nombreArchivoIcs("¡¿…?!")).toBe("evento.ics");
  });
});

// El calendario del mes y las horas del día, para SelectorFecha (OL-162, bitácora 197).
describe("calendario del mes", () => {
  it("cuenta los días del mes, incluido el año bisiesto", () => {
    expect(diasEnMes(2026, 9)).toBe(30);
    expect(diasEnMes(2026, 2)).toBe(28); // 2026 no es bisiesto
    expect(diasEnMes(2028, 2)).toBe(29); // 2028 sí lo es
    expect(diasEnMes(2026, 12)).toBe(31);
  });

  it("cruza de diciembre a enero y de enero a diciembre", () => {
    expect(mesSiguiente(2026, 12)).toEqual({ anio: 2027, mes: 1 });
    expect(mesSiguiente(2026, 9)).toEqual({ anio: 2026, mes: 10 });
    expect(mesAnterior(2027, 1)).toEqual({ anio: 2026, mes: 12 });
    expect(mesAnterior(2026, 9)).toEqual({ anio: 2026, mes: 8 });
  });

  it("suma días de calendario, cruzando meses", () => {
    expect(sumarDiasIso("2026-09-19", 1)).toBe("2026-09-20");
    expect(sumarDiasIso("2026-09-30", 1)).toBe("2026-10-01");
    expect(sumarDiasIso("2026-09-19", -1)).toBe("2026-09-18");
    expect(sumarDiasIso("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("arma un mes de 5 semanas (septiembre 2026 empieza en martes)", () => {
    const semanas = semanasDelMes(2026, 9, "2026-09-19");
    expect(semanas).toHaveLength(5);
    expect(semanas[0][0].fecha).toBe("2026-08-31"); // relleno del mes anterior, lunes
    expect(semanas[0][0].delMes).toBe(false);
    expect(semanas[4][6].fecha).toBe("2026-10-04"); // relleno del mes siguiente, domingo
    expect(semanas[4][6].delMes).toBe(false);
    for (const semana of semanas) expect(semana).toHaveLength(7);
  });

  it("arma un mes de 6 semanas (agosto 2026 empieza en sábado)", () => {
    const semanas = semanasDelMes(2026, 8, "2026-08-01");
    expect(semanas).toHaveLength(6);
    expect(semanas[0][0].fecha).toBe("2026-07-27");
    expect(semanas[5][6].fecha).toBe("2026-09-06");
  });

  it("marca hoy y respeta el año bisiesto al pintar febrero", () => {
    const semanas = semanasDelMes(2028, 2, "2028-02-15");
    const dias = semanas.flat();
    expect(dias.filter((d) => d.hoy)).toHaveLength(1);
    expect(dias.find((d) => d.hoy)?.fecha).toBe("2028-02-15");
    expect(dias.some((d) => d.fecha === "2028-02-29" && d.delMes)).toBe(true);
  });

  it("sin límite propio, lo pasado es antes de hoy", () => {
    const semanas = semanasDelMes(2026, 9, "2026-09-19");
    const dias = semanas.flat();
    expect(dias.find((d) => d.fecha === "2026-09-18")?.pasado).toBe(true);
    expect(dias.find((d) => d.fecha === "2026-09-19")?.pasado).toBe(false);
    expect(dias.find((d) => d.fecha === "2026-09-20")?.pasado).toBe(false);
  });

  it("con un límite mínimo posterior a hoy, lo pasado llega hasta ese límite", () => {
    const semanas = semanasDelMes(2026, 9, "2026-09-19", "2026-09-22");
    const dias = semanas.flat();
    expect(dias.find((d) => d.fecha === "2026-09-21")?.pasado).toBe(true);
    expect(dias.find((d) => d.fecha === "2026-09-22")?.pasado).toBe(false);
  });

  it("un límite mínimo anterior a hoy no revive días ya pasados", () => {
    const semanas = semanasDelMes(2026, 9, "2026-09-19", "2026-09-01");
    const dias = semanas.flat();
    expect(dias.find((d) => d.fecha === "2026-09-18")?.pasado).toBe(true);
    expect(dias.find((d) => d.fecha === "2026-09-19")?.pasado).toBe(false);
  });

  it("da las horas del día en pasos de 15 minutos", () => {
    const horas = pasosHora();
    expect(horas).toHaveLength(96);
    expect(horas[0]).toBe("00:00");
    expect(horas[1]).toBe("00:15");
    expect(horas.at(-1)).toBe("23:45");
  });

  it("acepta otro paso", () => {
    const horas = pasosHora(30);
    expect(horas).toHaveLength(48);
    expect(horas[1]).toBe("00:30");
  });

  it("redondea al paso más cercano", () => {
    expect(pasoMasCercano("19:07")).toBe("19:00");
    expect(pasoMasCercano("19:08")).toBe("19:15");
    expect(pasoMasCercano("23:59")).toBe("23:45"); // no se pasa de la última hora del día
    expect(pasoMasCercano("00:00")).toBe("00:00");
    expect(pasoMasCercano("nada")).toBe("00:00");
  });
});

// El calendario propio con días sin eventos desactivados (OL-218, bitácora 247): qué días tienen eventos, hasta
// dónde se puede navegar y el nombre accesible de cada día.
describe("diasActivosCalendario", () => {
  const ZONA = "America/Mexico_City";

  it("un evento sin fin cuenta solo su día de inicio (nunca 'dura' más, igual que terminaDe)", () => {
    const dias = diasActivosCalendario([{ inicio: "2026-09-25T19:00:00-06:00", fin: null, zona: ZONA }]);
    expect([...dias.entries()]).toEqual([["2026-09-25", 1]]);
  });

  it("un evento de varios días cuenta en cada día que ocupa, igual que la Agenda", () => {
    const dias = diasActivosCalendario([{ inicio: "2026-09-25T10:00:00-06:00", fin: "2026-09-27T18:00:00-06:00", zona: ZONA }]);
    expect([...dias.keys()].sort()).toEqual(["2026-09-25", "2026-09-26", "2026-09-27"]);
    expect(dias.get("2026-09-26")).toBe(1);
  });

  it("suma cuántos eventos toca cada día, entre varios eventos y zonas distintas", () => {
    const dias = diasActivosCalendario([
      { inicio: "2026-09-25T19:00:00-06:00", fin: null, zona: ZONA }, // San Luis Potosí
      { inicio: "2026-09-25T19:00:00+02:00", fin: null, zona: "Europe/Madrid" }, // 17:00 de Madrid, sigue siendo 25 allá
      { inicio: "2026-09-26T09:00:00-06:00", fin: null, zona: ZONA },
    ]);
    expect(dias.get("2026-09-25")).toBe(2);
    expect(dias.get("2026-09-26")).toBe(1);
  });

  it("un `fin` corrupto (antes del inicio) no cuelga la función: solo cuenta el día de inicio", () => {
    const dias = diasActivosCalendario([{ inicio: "2026-09-25T19:00:00-06:00", fin: "2026-09-20T19:00:00-06:00", zona: ZONA }]);
    expect([...dias.keys()]).toEqual(["2026-09-25"]);
  });

  it("sin eventos, un Map vacío", () => {
    expect(diasActivosCalendario([]).size).toBe(0);
  });
});

describe("hayMesAnterior", () => {
  it("sin bloquear pasado, siempre se puede ir atrás", () => {
    expect(hayMesAnterior(2020, 1, "2026-09-19", false)).toBe(true);
  });
  it("bloqueando pasado, no antes del mes de `limite`", () => {
    expect(hayMesAnterior(2026, 9, "2026-09-19", true)).toBe(false); // ya se muestra el mes de hoy
    expect(hayMesAnterior(2026, 10, "2026-09-19", true)).toBe(true); // se puede volver a septiembre
    expect(hayMesAnterior(2026, 8, "2026-09-19", true)).toBe(false); // ya antes del límite
  });
});

describe("haySiguienteMes", () => {
  it("sin `diasActivos` (alta de evento), siempre se puede avanzar", () => {
    expect(haySiguienteMes(2026, 9)).toBe(true);
  });
  it("con `diasActivos`, solo hasta donde haya datos", () => {
    const dias = diasActivosCalendario([{ inicio: "2026-10-04T19:00:00-06:00", fin: null, zona: "America/Mexico_City" }]);
    expect(haySiguienteMes(2026, 9, dias)).toBe(true); // octubre tiene datos
    expect(haySiguienteMes(2026, 10, dias)).toBe(false); // no hay nada después de octubre
  });
  it("sin ningún día activo, nunca hay mes siguiente", () => {
    expect(haySiguienteMes(2026, 9, new Map())).toBe(false);
  });
});

describe("etiquetaDia", () => {
  const disponible = { hoy: false, pasado: false };
  const hoy = { hoy: true, pasado: false };
  const pasado = { hoy: false, pasado: true };

  it("sin `conEventos` (alta de evento), solo el texto largo y, si aplica, 'hoy'", () => {
    expect(etiquetaDia("viernes 25 de septiembre", disponible)).toBe("viernes 25 de septiembre");
    expect(etiquetaDia("viernes 25 de septiembre", hoy)).toBe("viernes 25 de septiembre, hoy");
  });
  it("con `conEventos` (Agenda y Lugares): hoy, cuántos eventos, o 'sin eventos' o 'ya pasó'", () => {
    expect(etiquetaDia("viernes 25 de septiembre", hoy, { conEventos: 3 })).toBe("viernes 25 de septiembre, hoy, 3 eventos");
    expect(etiquetaDia("domingo 27 de septiembre", disponible, { conEventos: 1 })).toBe("domingo 27 de septiembre, 1 evento");
    expect(etiquetaDia("sábado 26 de septiembre", disponible, { conEventos: 0 })).toBe("sábado 26 de septiembre, sin eventos");
    expect(etiquetaDia("miércoles 23 de septiembre", pasado, { conEventos: 0 })).toBe("miércoles 23 de septiembre, ya pasó");
  });
  it('elegido y `permiteQuitar` (modo "filtro"): agrega "toca para quitar"', () => {
    expect(etiquetaDia("domingo 27 de septiembre", disponible, { conEventos: 2, elegido: true, permiteQuitar: true })).toBe("domingo 27 de septiembre, 2 eventos, toca para quitar");
  });
  it('elegido sin `permiteQuitar` (modo "campo", alta de evento): no agrega nada por estar elegido', () => {
    expect(etiquetaDia("domingo 27 de septiembre", disponible, { elegido: true })).toBe("domingo 27 de septiembre");
  });
});

describe("mesInicial", () => {
  it("con una fecha ya elegida, el mes de esa fecha", () => {
    expect(mesInicial("2026-12-24", "2026-09-19")).toEqual({ anio: 2026, mes: 12 });
  });
  it("sin fecha elegida, el mes del límite (hoy, o `min` si es posterior)", () => {
    expect(mesInicial("", "2026-09-19")).toEqual({ anio: 2026, mes: 9 });
  });
});
