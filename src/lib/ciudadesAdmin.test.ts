import { describe, expect, it } from "vitest";
import {
  avanceDe,
  cifra,
  cifrasCiudad,
  credito,
  detalleCorrida,
  diaMes,
  errorTope,
  gruposDeCorridas,
  leerPanelCiudades,
  leerTope,
  lineaCredito,
  lineaInvestigacion,
  notaBandeja,
  ordenarCiudades,
  pildoraCorrida,
  propuestasPorRevisar,
  resumenCiudades,
  textoBoton,
  tituloBandeja,
  tituloCorrida,
  ultimaPorBoton,
  usd,
  usdCorto,
  type CiudadPanel,
  type CorridaPanel,
} from "./ciudadesAdmin";

// Martes 20 de octubre de 2026, 10:00 en San Luis Potosí.
const AHORA = new Date("2026-10-20T16:00:00Z");
const ciudad = (slug: string, estado: CiudadPanel["estado"], consultas: number, creado_en = "2026-10-12T18:00:00Z"): CiudadPanel => ({
  slug, nombre: slug, estado, consultas, lat: null, lng: null, zona: "America/Mexico_City", creado_en,
});
const corrida = (c: Partial<CorridaPanel>): CorridaPanel => ({
  id: c.id ?? "c", tipo: "lugares", ciudad: "oaxaca", parametros: {}, tope_usd: 3, gasto_usd: 0, estado: "terminada", resumen: {}, creado_en: "2026-10-18T17:00:00Z",
  inicio: null, fin: null, propuestas: 0, aceptadas: 0, rechazadas: 0, por_revisar: 0, ...c,
});

describe("números y fechas", () => {
  it("dólares con coma y dos decimales, miles con espacio que no se parte", () => {
    expect(usd(3)).toBe("3,00");
    expect(usd(1.1)).toBe("1,10");
    expect(usd(187.4)).toBe("187,40");
    expect(cifra(1932)).toBe("1 932");
    expect(cifra(14)).toBe("14");
    expect(usdCorto(200)).toBe("200");
    expect(usdCorto(187.4)).toBe("187,40");
  });
  it("el día corto, sin puntos ni «de», con año solo si no es el actual", () => {
    expect(diaMes("2026-10-18T17:00:00Z", AHORA)).toBe("18 oct");
    expect(diaMes("2025-12-01T17:00:00Z", AHORA)).toBe("1 dic 2025");
  });
  it("el tope: coma o punto, de más de 0 y hasta 50", () => {
    expect(leerTope("3,00")).toBe(3);
    expect(leerTope(" 2.5 ")).toBe(2.5);
    expect(leerTope("50")).toBe(50);
    expect(leerTope("0")).toBeNull();
    expect(leerTope("51")).toBeNull();
    expect(leerTope("3,005")).toBeNull();
    expect(leerTope("tres")).toBeNull();
    expect(errorTope("")).toBe("Escribe el tope en dólares.");
    expect(errorTope("0")).toMatch(/más de 0 y hasta 50/);
    expect(errorTope("3,00")).toBeNull();
  });
});

describe("una ciudad", () => {
  it("sus cifras, en singular cuando toca", () => {
    expect(cifrasCiudad({ consultas: 14, lugares: 0, eventos: 0, artistas: 0 })).toBe("14 consultas en 30 días · 0 lugares · 0 eventos próximos · 0 artistas");
    expect(cifrasCiudad({ consultas: 1, lugares: 1, eventos: 1, artistas: 1 })).toBe("1 consulta en 30 días · 1 lugar · 1 evento próximo · 1 artista");
  });
  it("la última investigación", () => {
    const qro = ciudad("queretaro", "detectada", 14);
    expect(lineaInvestigacion(qro, [], AHORA)).toBe("Nunca investigada · detectada el 12 oct");
    expect(lineaInvestigacion(ciudad("slp", "abierta", 1932), [], AHORA)).toBe("Nunca investigada");
    expect(lineaInvestigacion(qro, [corrida({ estado: "pendiente" })], AHORA)).toBe("Nunca investigada · detectada el 12 oct · una búsqueda espera turno");
    expect(lineaInvestigacion(qro, [corrida({ estado: "corriendo", inicio: "2026-10-20T16:42:00Z" })], AHORA)).toMatch(/^Investigando desde hoy, 10:42/);
    expect(lineaInvestigacion(qro, [corrida({ fin: "2026-10-18T17:10:00Z" }), corrida({ fin: "2026-10-01T17:10:00Z" })], AHORA)).toBe("Última investigación: 18 oct");
  });
  it("lo que dice cada botón de su última corrida", () => {
    expect(textoBoton(null, AHORA)).toBe("Sin correr");
    expect(textoBoton(corrida({ estado: "pendiente", tope_usd: 3 }), AHORA)).toBe("Pendiente de correr · tope 3,00 USD");
    expect(textoBoton(corrida({ estado: "corriendo", gasto_usd: 0.4, resumen: { paso: "3 de 10 meses" } }), AHORA)).toBe("Corriendo · 3 de 10 meses · 0,40 de 3,00 USD");
    expect(textoBoton(corrida({ propuestas: 14, aceptadas: 9, por_revisar: 5, gasto_usd: 1.1, fin: "2026-10-18T17:10:00Z" }), AHORA)).toBe("18 oct · 14 propuestos · 9 aceptados · 5 por revisar · 1,10 USD");
    expect(textoBoton(corrida({ propuestas: 0, gasto_usd: 3, tope_usd: 3 }), AHORA)).toBe("18 oct · llegó al tope · 0 propuestos · 3,00 USD");
    expect(textoBoton(corrida({ estado: "cancelada", fin: "2026-10-19T17:00:00Z" }), AHORA)).toBe("Cancelada el 19 oct");
    expect(textoBoton(corrida({ estado: "fallida", gasto_usd: 0.2 }), AHORA)).toBe("Falló el 18 oct · 0,20 USD");
  });
  it("el avance solo de la que corre y entre 0 y 1", () => {
    expect(avanceDe(corrida({ estado: "corriendo", resumen: { avance: 0.3 } }))).toBe(0.3);
    expect(avanceDe(corrida({ estado: "corriendo", resumen: { avance: 7 } }))).toBe(1);
    expect(avanceDe(corrida({ estado: "corriendo", resumen: {} }))).toBeNull();
    expect(avanceDe(corrida({ estado: "terminada", resumen: { avance: 1 } }))).toBeNull();
  });
  it("la última de cada botón: la que está en curso o la más reciente", () => {
    const vieja = corrida({ id: "vieja", creado_en: "2026-10-01T17:00:00Z" });
    const nueva = corrida({ id: "nueva", creado_en: "2026-10-18T17:00:00Z" });
    const enCurso = corrida({ id: "en-curso", estado: "pendiente", creado_en: "2026-10-10T17:00:00Z" });
    const otra = corrida({ id: "otra", ciudad: "slp" });
    const u = ultimaPorBoton([vieja, nueva, enCurso, otra, corrida({ id: "agendas", tipo: "agendas" })], "oaxaca");
    expect(u.lugares?.id).toBe("en-curso");
    expect(u.agendas?.id).toBe("agendas");
    expect(u.artistas).toBeNull();
    expect(ultimaPorBoton([vieja, nueva], "oaxaca").lugares?.id).toBe("nueva");
  });
});

describe("el orden de las ciudades (firma: «las ciudades con algo por decidir primero»)", () => {
  const slp = ciudad("san-luis-potosi", "abierta", 1932);
  const sma = ciudad("san-miguel-de-allende", "abierta", 87);
  const qro = ciudad("queretaro", "detectada", 14);
  const oax = ciudad("oaxaca", "investigando", 46);
  const gdl = ciudad("guadalajara", "detectada", 30);
  it("primero propuestas por revisar o búsquedas en curso; luego las detectadas; luego por consultas", () => {
    const corridas = [corrida({ ciudad: "oaxaca", por_revisar: 5 })];
    expect(ordenarCiudades([slp, sma, qro, oax, gdl], corridas).map((c) => c.slug)).toEqual(["oaxaca", "guadalajara", "queretaro", "san-luis-potosi", "san-miguel-de-allende"]);
  });
  it("una corrida pendiente también sube su ciudad", () => {
    expect(ordenarCiudades([slp, sma], [corrida({ ciudad: "san-miguel-de-allende", estado: "pendiente" })]).map((c) => c.slug)).toEqual(["san-miguel-de-allende", "san-luis-potosi"]);
  });
  it("sin nada por decidir, por consultas y luego por nombre", () => {
    expect(ordenarCiudades([sma, slp], []).map((c) => c.slug)).toEqual(["san-luis-potosi", "san-miguel-de-allende"]);
    expect(ordenarCiudades([ciudad("b", "abierta", 3), ciudad("a", "abierta", 3)], []).map((c) => c.slug)).toEqual(["a", "b"]);
  });
  it("el resumen de la portada", () => {
    expect(resumenCiudades([slp, sma, oax, qro])).toBe("2 abiertas · 1 investigando · 1 detectada");
    expect(resumenCiudades([slp, sma])).toBe("2 abiertas");
    expect(resumenCiudades([])).toBe("Sin ciudades todavía");
  });
});

describe("propuestas y corridas", () => {
  it("un renglón por corrida con algo por revisar, lo más viejo primero", () => {
    const filas = propuestasPorRevisar(
      [corrida({ id: "b", por_revisar: 2, creado_en: "2026-10-19T17:00:00Z", tipo: "artistas" }), corrida({ id: "a", por_revisar: 5 }), corrida({ id: "nada" })],
      [{ slug: "oaxaca", nombre: "Oaxaca" }],
      AHORA,
    );
    expect(filas).toEqual([
      { corrida: "a", tipo: "lugares", titulo: "Lugares de Oaxaca", detalle: "5 por revisar · de la corrida del 18 oct", n: 5 },
      { corrida: "b", tipo: "artistas", titulo: "Artistas de Oaxaca", detalle: "2 por revisar · de la corrida del 19 oct", n: 2 },
    ]);
  });
  it("títulos y nota de la bandeja", () => {
    expect(tituloBandeja("lugares", "Oaxaca")).toBe("Lugares de Oaxaca");
    expect(tituloBandeja("agendas", "Oaxaca")).toBe("Agendas y eventos de Oaxaca");
    expect(notaBandeja({ creado_en: "2026-10-18T17:00:00Z", propuestas: 14, aceptadas: 9, rechazadas: 0 }, AHORA)).toBe("Corrida del 18 oct · 14 propuestos · 9 aceptados");
    expect(tituloCorrida({ tipo: "agendas" }, "Oaxaca")).toBe("Agendas y eventos · Oaxaca");
    expect(tituloCorrida({ tipo: "showcase" }, null)).toBe("Showcase");
  });
  it("el detalle y la píldora de cada corrida", () => {
    expect(detalleCorrida(corrida({ estado: "pendiente", creado_en: "2026-10-20T15:30:00Z", parametros: { fuentes: ["sic", "cultura", "web"] } }), AHORA)).toBe("Hoy, 9:30 am · 3 fuentes · tope 3,00 USD");
    expect(detalleCorrida(corrida({ propuestas: 14, aceptadas: 9, gasto_usd: 1.1, parametros: { fuentes: ["a", "b", "c"] } }), AHORA)).toBe("18 oct · 3 fuentes · 14 propuestos · 9 aceptados · 1,10 USD");
    expect(pildoraCorrida(corrida({ estado: "pendiente" }))).toEqual({ texto: "Pendiente", tono: "gris" });
    expect(pildoraCorrida(corrida({ estado: "corriendo" }))).toEqual({ texto: "En curso", tono: "violeta" });
    expect(pildoraCorrida(corrida({ gasto_usd: 1 }))).toEqual({ texto: "Terminada", tono: "verde" });
    expect(pildoraCorrida(corrida({ gasto_usd: 3 }))).toEqual({ texto: "Llegó al tope", tono: "naranja" });
    // OL-428: el motor para antes de pasarse y lo deja dicho en el resumen.
    expect(pildoraCorrida(corrida({ gasto_usd: 2.73, resumen: { tope: true } }))).toEqual({ texto: "Llegó al tope", tono: "naranja" });
    expect(textoBoton(corrida({ propuestas: 4, gasto_usd: 2.73, resumen: { tope: true } }), AHORA)).toBe("18 oct · llegó al tope · 4 propuestos · 2,73 USD");
    expect(pildoraCorrida(corrida({ estado: "fallida" }))).toEqual({ texto: "Falló", tono: "rojo" });
  });
  it("por cuándo: en curso, esta semana y por mes", () => {
    const grupos = gruposDeCorridas(
      [
        corrida({ id: "sep", creado_en: "2026-09-20T17:00:00Z" }),
        corrida({ id: "semana", creado_en: "2026-10-18T17:00:00Z" }),
        corrida({ id: "oct", creado_en: "2026-10-02T17:00:00Z" }),
        corrida({ id: "pendiente", estado: "pendiente", creado_en: "2026-10-01T17:00:00Z" }),
        corrida({ id: "2025", creado_en: "2025-12-01T17:00:00Z" }),
      ],
      AHORA,
    );
    expect(grupos.map((g) => [g.titulo, g.corridas.map((c) => c.id)])).toEqual([
      ["En curso", ["pendiente"]],
      ["Esta semana", ["semana"]],
      ["Octubre", ["oct"]],
      ["Septiembre", ["sep"]],
      ["Diciembre 2025", ["2025"]],
    ]);
  });
});

describe("el crédito y lo que llega de la base", () => {
  it("lo que queda, cuándo vence y cuántos días faltan", () => {
    const c = credito({ usd: 200, vence: "2026-11-11", gastado: 12.6 }, AHORA);
    expect(c).toEqual({ queda: 187.4, inicial: 200, gastado: 12.6, vence: "2026-11-11", dias: 22 });
    expect(lineaCredito(c)).toBe("Crédito: 187,40 USD · vence el 11 de noviembre");
    expect(lineaCredito(credito({ usd: 200, vence: "2026-10-01", gastado: 0 }, AHORA))).toBe("Crédito: 200,00 USD · venció el 1 de octubre");
  });
  it("el panel con números como texto se lee; sin lo esencial, null", () => {
    const panel = leerPanelCiudades({
      ciudades: [{ slug: "slp", nombre: "San Luis Potosí", estado: "abierta", lat: 22.1, lng: -100.9, zona: "America/Mexico_City", creado_en: "2026-10-20T00:00:00Z", consultas: "1932" }],
      corridas: [{ id: "x", tipo: "lugares", ciudad: "slp", parametros: {}, tope_usd: "3.00", gasto_usd: "0.0000", estado: "pendiente", resumen: {}, creado_en: "2026-10-20T00:00:00Z", inicio: null, fin: null, propuestas: 0, aceptadas: 0, rechazadas: 0, por_revisar: 0 }],
      credito: { usd: 200, vence: "2026-11-11", gastado: "0" },
    });
    expect(panel?.ciudades[0].consultas).toBe(1932);
    expect(panel?.corridas[0].tope_usd).toBe(3);
    expect(leerPanelCiudades([])).toBeNull();
    expect(leerPanelCiudades({ ciudades: [], corridas: [{ id: "x", tipo: "otro" }], credito: {} })).toBeNull();
  });
});
