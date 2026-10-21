import { describe, expect, it } from "vitest";
import {
  avanceDe,
  baseArtistas,
  baseEventos,
  baseLugares,
  busquedasDe,
  cabeceraCiudad,
  cifra,
  credito,
  detalleCorrida,
  detallePorRevisar,
  diaMes,
  errorTope,
  estadoBusqueda,
  estadoVisible,
  ETIQUETA_ESTADO,
  gastoDe,
  gruposDeCorridas,
  juntarAlias,
  leerPanelCiudades,
  leerParametrosVista,
  leerTope,
  lineaBusqueda,
  lineaCredito,
  lineaFila,
  listaCorta,
  listaY,
  notaBandeja,
  ordenarCiudades,
  pildoraCorrida,
  porRevisarDe,
  propuestasPorRevisar,
  razonCorrida,
  resumenCiudades,
  siguientePaso,
  slugsDe,
  tarjetaConsultas,
  textoRevisar,
  tituloBandeja,
  tituloCorrida,
  usd,
  usdCorto,
  vezPasada,
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

describe("una ciudad (OL-432)", () => {
  it("los estados que se ven: investigando es abierta (respuesta 3) y cerrada es oculta (respuesta 6)", () => {
    expect(estadoVisible("investigando")).toBe("abierta");
    expect(estadoVisible("detectada")).toBe("detectada");
    expect(ETIQUETA_ESTADO[estadoVisible("cerrada")]).toBe("Oculta");
  });
  it("el avance solo de la que corre y entre 0 y 1", () => {
    expect(avanceDe(corrida({ estado: "corriendo", resumen: { avance: 0.3 } }))).toBe(0.3);
    expect(avanceDe(corrida({ estado: "corriendo", resumen: { avance: 7 } }))).toBe(1);
    expect(avanceDe(corrida({ estado: "corriendo", resumen: {} }))).toBeNull();
    expect(avanceDe(corrida({ estado: "terminada", resumen: { avance: 1 } }))).toBeNull();
  });
  it("la búsqueda de cada botón: la que está en curso o la más reciente; una cancelada no cuenta", () => {
    const vieja = corrida({ id: "vieja", creado_en: "2026-10-01T17:00:00Z" });
    const nueva = corrida({ id: "nueva", creado_en: "2026-10-18T17:00:00Z" });
    const enCurso = corrida({ id: "en-curso", estado: "pendiente", creado_en: "2026-10-10T17:00:00Z" });
    const cancelada = corrida({ id: "cancelada", estado: "cancelada", creado_en: "2026-10-19T17:00:00Z", tipo: "artistas" });
    const b = busquedasDe([vieja, nueva, enCurso, cancelada, corrida({ id: "otra", ciudad: "slp" }), corrida({ id: "agendas", tipo: "agendas" })], "oaxaca");
    expect(b.lugares?.id).toBe("en-curso");
    expect(b.agendas?.id).toBe("agendas");
    expect(b.artistas).toBeNull();
    expect(busquedasDe([vieja, nueva], "oaxaca").lugares?.id).toBe("nueva");
  });
  it("cómo quedó: llegó al tope es una terminada en su tope (por lo gastado o porque la rutina lo dijo)", () => {
    expect(estadoBusqueda(corrida({ gasto_usd: 1 }))).toBe("terminada");
    expect(estadoBusqueda(corrida({ gasto_usd: 3 }))).toBe("tope");
    expect(estadoBusqueda(corrida({ gasto_usd: 2.73, resumen: { tope: true } }))).toBe("tope");
    expect(estadoBusqueda(corrida({ estado: "fallida" }))).toBe("fallo");
    expect(estadoBusqueda(corrida({ estado: "cancelada" }))).toBeNull();
  });
  it("las propuestas por revisar de una ciudad suman todas sus búsquedas", () => {
    expect(porRevisarDe([corrida({ por_revisar: 5 }), corrida({ por_revisar: 12, tipo: "agendas" }), corrida({ ciudad: "slp", por_revisar: 3 })], "oaxaca")).toBe(17);
  });
});

describe("la tercera línea de la fila (pantalla A)", () => {
  const abierta = { estado: "abierta" as const };
  const b = (c: Partial<Record<"lugares" | "agendas" | "artistas", CorridaPanel | null>>) => ({ lugares: null, agendas: null, artistas: null, ...c });
  it("una búsqueda que corre, con su paso y su barra", () => {
    expect(lineaFila(abierta, b({ agendas: corrida({ tipo: "agendas", estado: "corriendo", resumen: { paso: "3 de 10 meses", avance: 0.3 } }) }), AHORA)).toEqual({ texto: "Buscando agendas y eventos · 3 de 10 meses", alerta: false, avance: 0.3 });
  });
  it("falló, llegó al tope o las dos, en una frase", () => {
    const fallo = corrida({ tipo: "agendas", estado: "fallida" });
    const tope = corrida({ gasto_usd: 3 });
    expect(lineaFila(abierta, b({ lugares: tope, agendas: fallo }), AHORA)).toEqual({ texto: "Una búsqueda falló y otra llegó al tope", alerta: true, avance: null });
    expect(lineaFila(abierta, b({ agendas: fallo }), AHORA)?.texto).toBe("«Buscar agendas y eventos» falló");
    expect(lineaFila(abierta, b({ lugares: tope }), AHORA)).toEqual({ texto: "«Buscar lugares» llegó al tope", alerta: false, avance: null });
    expect(lineaFila(abierta, b({ lugares: corrida({ estado: "fallida" }), agendas: fallo }), AHORA)?.texto).toBe("Dos búsquedas fallaron");
  });
  it("una que espera: recién corrida empieza en unos segundos; si no, espera su turno", () => {
    expect(lineaFila(abierta, b({ lugares: corrida({ estado: "pendiente", creado_en: "2026-10-20T15:59:30Z" }) }), AHORA)?.texto).toBe("«Buscar lugares» empieza en unos segundos");
    expect(lineaFila(abierta, b({ lugares: corrida({ estado: "pendiente", creado_en: "2026-10-20T15:00:00Z" }) }), AHORA)?.texto).toBe("«Buscar lugares» espera su turno");
  });
  it("recién abierta, con todo por correr; nada que decidir, ninguna línea; una detectada, tampoco", () => {
    expect(lineaFila({ estado: "abierta", abiertaEn: "2026-10-20T15:40:00Z" }, b({}), AHORA)?.texto).toBe("Abierta hoy · 3 búsquedas por correr");
    expect(lineaFila({ estado: "investigando", abiertaEn: null }, b({}), AHORA)?.texto).toBe("3 búsquedas por correr");
    expect(lineaFila(abierta, b({ lugares: corrida({}) }), AHORA)).toBeNull();
    expect(lineaFila({ estado: "detectada" }, b({}), AHORA)).toBeNull();
  });
});

describe("el orden de la lista (firma de OL-425, ampliada en OL-431)", () => {
  const slp = ciudad("san-luis-potosi", "abierta", 125);
  const sma = ciudad("san-miguel-de-allende", "abierta", 31);
  const ags = ciudad("aguascalientes", "detectada", 9);
  const cdmx = ciudad("ciudad-de-mexico", "abierta", 12);
  const qro = ciudad("queretaro", "cerrada", 40);
  const nada = [corrida({ ciudad: "san-miguel-de-allende" }), corrida({ ciudad: "ciudad-de-mexico" }), corrida({ ciudad: "san-luis-potosi" })];
  it("primero lo que tiene algo por decidir, luego las detectadas, luego el resto; dentro, por consultas; las ocultas no salen", () => {
    const corridas = [...nada, corrida({ id: "r", ciudad: "san-luis-potosi", por_revisar: 17, creado_en: "2026-10-19T17:00:00Z" }), corrida({ id: "f", tipo: "agendas", estado: "fallida", ciudad: "ciudad-de-mexico" })];
    expect(ordenarCiudades([sma, ags, cdmx, slp, qro], corridas).map((c) => c.slug)).toEqual(["san-luis-potosi", "ciudad-de-mexico", "aguascalientes", "san-miguel-de-allende"]);
  });
  it("una recién abierta, con todo por correr, también tiene algo por decidir", () => {
    const oax = ciudad("oaxaca", "abierta", 0);
    expect(ordenarCiudades([slp, oax, ags], nada).map((c) => c.slug)).toEqual(["oaxaca", "aguascalientes", "san-luis-potosi"]);
  });
  it("sin nada por decidir, por consultas y luego por nombre", () => {
    expect(ordenarCiudades([sma, slp], nada).map((c) => c.slug)).toEqual(["san-luis-potosi", "san-miguel-de-allende"]);
    const igual = [corrida({ ciudad: "a" }), corrida({ ciudad: "b" })];
    expect(ordenarCiudades([ciudad("b", "abierta", 3), ciudad("a", "abierta", 3)], igual).map((c) => c.slug)).toEqual(["a", "b"]);
  });
  it("el resumen de la portada: investigando cuenta abierta y las ocultas, aparte", () => {
    expect(resumenCiudades([slp, sma, ciudad("oaxaca", "investigando", 46), ags])).toBe("3 abiertas · 1 detectada");
    expect(resumenCiudades([slp, qro])).toBe("1 abierta · 1 oculta");
    expect(resumenCiudades([])).toBe("Sin ciudades todavía");
  });
});

describe("el panel de una ciudad (pantallas D, E y F)", () => {
  const b = (c: Partial<Record<"lugares" | "agendas" | "artistas", CorridaPanel | null>>) => ({ lugares: null, agendas: null, artistas: null, ...c });
  it("un solo botón violeta: revisar; si algo espera o corre, ninguno; si no, la primera que falta o no terminó", () => {
    expect(siguientePaso(b({}), 17)).toBe("revisar");
    expect(siguientePaso(b({}), 0)).toBe("lugares");
    expect(siguientePaso(b({ lugares: corrida({}) }), 0)).toBe("agendas");
    expect(siguientePaso(b({ lugares: corrida({}), agendas: corrida({ tipo: "agendas", gasto_usd: 3 }) }), 0)).toBe("agendas");
    expect(siguientePaso(b({ lugares: corrida({ estado: "corriendo" }) }), 0)).toBeNull();
    expect(siguientePaso(b({ lugares: corrida({}), agendas: corrida({ tipo: "agendas" }), artistas: corrida({ tipo: "artistas" }) }), 0)).toBeNull();
  });
  it("bajo la raya: la píldora de Corridas, el detalle y la razón si falló o llegó al tope", () => {
    const terminada = corrida({ propuestas: 30, rechazadas: 13, gasto_usd: 0.33, fin: "2026-10-20T15:10:00Z", creado_en: "2026-10-20T15:00:00Z" });
    expect(lineaBusqueda(terminada, [], AHORA)).toEqual({ pildora: { texto: "Terminada", tono: "verde" }, texto: "Hoy, 9:10 am · 30 propuestos · 13 rechazados · 0,33 USD", razon: null, alerta: false, avance: null });
    const tope = corrida({ propuestas: 40, gasto_usd: 1.5, tope_usd: 1.5, fin: "2026-10-18T17:10:00Z", resumen: { tope: true, paso: "2 de 3 fuentes", descartados: { de_mas: 41 } } });
    expect(lineaBusqueda(tope, [], AHORA)).toEqual({
      pildora: { texto: "Llegó al tope", tono: "naranja" },
      texto: "18 oct · 40 propuestos · 41 esperan a la siguiente · 1,50 USD",
      razon: "Se detuvo en el tope de 1,50 USD en 2 de 3 fuentes; la siguiente sigue donde se quedó.",
      alerta: false,
      avance: null,
    });
    const fallo = corrida({ tipo: "artistas", estado: "fallida", gasto_usd: 0, fin: "2026-10-18T17:10:00Z", resumen: { error: "Este botón todavía no tiene rutina" } });
    expect(lineaBusqueda(fallo, [], AHORA)).toMatchObject({ pildora: { texto: "Falló", tono: "rojo" }, texto: "18 oct · 0,00 USD", razon: "Este botón todavía no tiene rutina.", alerta: true });
    expect(razonCorrida(corrida({ estado: "fallida" }))).toBe("Se detuvo sin dejar la razón.");
    expect(vezPasada(tope)).toBe("se detuvo en el tope de 1,50 USD en 2 de 3 fuentes; la siguiente sigue donde se quedó.");
    expect(vezPasada(terminada)).toBeNull();
  });
  it("corriendo, con su barra; pendiente dice a qué espera", () => {
    const corre = corrida({ id: "a", tipo: "agendas", estado: "corriendo", gasto_usd: 0.4, resumen: { paso: "3 de 10 meses", avance: 0.3 } });
    expect(lineaBusqueda(corre, [], AHORA)).toMatchObject({ pildora: { texto: "Corriendo", tono: "violeta" }, texto: "3 de 10 meses · 0,40 de 3,00 USD", avance: 0.3 });
    const espera = corrida({ id: "b", tipo: "artistas", estado: "pendiente", tope_usd: 2, creado_en: "2026-10-20T15:00:00Z" });
    expect(lineaBusqueda(espera, [corre, espera], AHORA)?.texto).toBe("Espera a la de agendas · tope 2,00 USD");
    expect(lineaBusqueda(espera, [espera], AHORA)?.texto).toBe("Espera su turno · tope 2,00 USD");
    expect(lineaBusqueda({ ...espera, creado_en: "2026-10-20T15:59:40Z" }, [espera], AHORA)?.texto).toBe("Empieza en unos segundos · tope 2,00 USD");
  });
  it("la cabecera: desde cuándo y qué cuenta con ella", () => {
    const p = (x: Partial<ReturnType<typeof leerParametrosVista>>) => ({ ...leerParametrosVista({}), ...x });
    const base = { estado: "abierta" as const, creado_en: "2026-10-20T00:00:00Z", alias: [] as string[] };
    const cdmx = p({ alcaldias: ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez", "Álvaro Obregón"], abiertaEn: "2026-10-20T14:05:00Z" });
    expect(cabeceraCiudad({ ...base, parametros: cdmx }, b({}), AHORA)).toBe("Abierta hoy, 8:05 am · Cuauhtémoc, Miguel Hidalgo y 3 más");
    const corre = corrida({ estado: "corriendo", inicio: "2026-10-20T15:12:00Z" });
    expect(cabeceraCiudad({ ...base, alias: ["Soledad de Graciano Sánchez"], parametros: p({}) }, b({ lugares: corre }), AHORA)).toBe("Buscando desde hoy, 9:12 am · con Soledad de Graciano Sánchez");
    const oax = p({ municipios: ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"], abiertaEn: "2026-10-12T15:40:00Z" });
    expect(cabeceraCiudad({ ...base, alias: ["Oaxaca de Juárez", "Santa Lucía del Camino", "Santa Cruz Xoxocotlán"], parametros: oax }, b({}), AHORA)).toBe("Abierta el 12 oct · con Santa Lucía del Camino y Santa Cruz Xoxocotlán");
    expect(cabeceraCiudad({ ...base, estado: "detectada", creado_en: "2026-10-12T18:00:00Z", parametros: p({}) }, b({}), AHORA)).toBe("Detectada el 12 oct");
    expect(cabeceraCiudad({ ...base, parametros: p({}) }, b({}), AHORA)).toBe("");
  });
  it("los parámetros que se leen: lo que no se entiende se ignora", () => {
    expect(leerParametrosVista({ alcaldias: ["Cuauhtémoc", 3, " ", "Cuauhtémoc"], municipios: "x", radio_km: "12", abierta_en: "ayer" })).toEqual({ alcaldias: ["Cuauhtémoc"], municipios: [], radioKm: 12, abiertaEn: null });
    expect(leerParametrosVista(null)).toEqual({ alcaldias: [], municipios: [], radioKm: null, abiertaEn: null });
  });
  it("«Por revisar»: de qué búsqueda y cuántas ya se decidieron", () => {
    const r = corrida({ por_revisar: 17, propuestas: 30, rechazadas: 13, creado_en: "2026-10-20T15:00:00Z" });
    expect(detallePorRevisar([r], "oaxaca", AHORA)).toBe("De «Buscar lugares» de hoy, 9:00 am: 30 propuestas, 13 ya rechazadas");
    expect(detallePorRevisar([{ ...r, creado_en: "2026-10-18T17:00:00Z" }], "oaxaca", AHORA)).toBe("De «Buscar lugares» del 18 oct: 30 propuestas, 13 ya rechazadas");
    expect(detallePorRevisar([r, corrida({ id: "x", tipo: "agendas", por_revisar: 2 })], "oaxaca", AHORA)).toBe("De 2 búsquedas: «Buscar lugares» y «Buscar agendas y eventos»");
    expect(textoRevisar(17)).toBe("Revisar las 17");
    expect(textoRevisar(1)).toBe("Revisar la propuesta");
  });
  it("lo que dice cada número", () => {
    expect(baseLugares(71, 3)).toBe("3 nuevos este mes");
    expect(baseLugares(43, 0)).toBe("Ninguno nuevo este mes");
    expect(baseLugares(0, 0)).toBeNull();
    expect(baseEventos([{ origen: null, n: 23 }, { origen: "agenda-secult-2026-10", n: 30 }, { origen: "agenda-secult-2026-11", n: 11 }])).toBe("41 de la agenda de Cultura · 23 de su gente");
    expect(baseEventos([{ origen: null, n: 0 }])).toBeNull();
    expect(baseArtistas(686, 520)).toBe("520 del Catálogo CAPO · 166 por su cuenta");
    expect(baseArtistas(1, 0)).toBe("1 por su cuenta");
    expect(gastoDe([corrida({ gasto_usd: 0.33 }), corrida({ gasto_usd: 0.4 }), corrida({ ciudad: "slp", gasto_usd: 9 })], "oaxaca")).toBe(0.73);
  });
  it("las consultas: 30 días, la tendencia por semana solo con cuatro enteras y el cambio contra la semana pasada", () => {
    const hoy = "2026-10-21";
    const vistas = Array.from({ length: 35 }, (_, i) => ({ dia: new Date(Date.parse(`${hoy}T00:00:00Z`) - i * 86400000).toISOString().slice(0, 10), consultas: i < 7 ? 5 : i < 14 ? 4 : 3 }));
    const t = tarjetaConsultas(vistas, hoy, "2026-09-01");
    expect(t.valor).toBe(7 * 5 + 7 * 4 + 16 * 3);
    expect(t.serie).toEqual([21, 21, 21, 28, 35]);
    expect(t.cambio).toBe("▲ 7 esta semana");
    expect(t.base).toBe("en 30 días, al abrir Inicio o Lugares");
    const nueva = tarjetaConsultas([{ dia: hoy, consultas: 12 }], hoy, hoy);
    expect(nueva).toEqual({ valor: 12, serie: null, base: "desde hoy, al abrir Inicio o Lugares", cambio: null });
    expect(tarjetaConsultas([], hoy, hoy).base).toBe("se cuentan desde hoy");
    expect(tarjetaConsultas([], hoy, "2026-10-20").base).toBe("desde el 20 oct, al abrir Inicio o Lugares");
  });
  it("listas: enteras hasta tres, luego cuántas más", () => {
    expect(listaY(["a"])).toBe("a");
    expect(listaY(["a", "b", "c"])).toBe("a, b y c");
    expect(listaCorta(["a", "b", "c", "d", "e"])).toBe("a, b y 3 más");
  });
});

describe("los nombres de una ciudad (respuesta 1)", () => {
  it("una abierta junta a la detectada que es ella con otro nombre y suma sus consultas", () => {
    const oax = ciudad("oaxaca", "abierta", 10);
    const larga = ciudad("oaxaca-de-juarez", "detectada", 5);
    const slp = ciudad("san-luis-potosi", "abierta", 125);
    const nombres = new Map([
      ["oaxaca", { nombre: "Oaxaca", alias: ["Oaxaca de Juárez"] }],
      ["san-luis-potosi", { nombre: "San Luis Potosí", alias: ["Soledad de Graciano Sánchez"] }],
    ]);
    const { ciudades, juntadas } = juntarAlias([oax, larga, slp], nombres);
    expect(ciudades.map((c) => [c.slug, c.consultas])).toEqual([["oaxaca", 15], ["san-luis-potosi", 125]]);
    expect(juntadas.get("oaxaca-de-juarez")).toBe("oaxaca");
    expect(slugsDe({ slug: "oaxaca", nombre: "Oaxaca", alias: ["Oaxaca de Juárez"] })).toEqual(["oaxaca", "oaxaca-de-juarez"]);
  });
  it("dos abiertas no se juntan", () => {
    const { ciudades } = juntarAlias([ciudad("a", "abierta", 1), ciudad("b", "abierta", 1)], new Map([["a", { nombre: "a", alias: ["b"] }]]));
    expect(ciudades).toHaveLength(2);
  });
});

describe("propuestas y corridas", () => {
  it("a «Pendiente» de la portada: un renglón por ciudad que lleva a su bandeja; lo más viejo primero", () => {
    const filas = propuestasPorRevisar(
      [
        corrida({ id: "b", por_revisar: 2, creado_en: "2026-10-19T17:00:00Z", tipo: "artistas" }),
        corrida({ id: "a", por_revisar: 5 }),
        corrida({ id: "c", ciudad: "slp", por_revisar: 3, creado_en: "2026-10-19T18:00:00Z" }),
        corrida({ id: "s", tipo: "showcase", ciudad: null, por_revisar: 1, creado_en: "2026-10-20T10:00:00Z" }),
        corrida({ id: "nada" }),
      ],
      [{ slug: "oaxaca", nombre: "Oaxaca" }, { slug: "slp", nombre: "San Luis Potosí" }],
      AHORA,
    );
    expect(filas).toEqual([
      { corrida: "a", tipo: "lugares", titulo: "Propuestas de Oaxaca", detalle: "7 por revisar · de 2 búsquedas", n: 7, href: "/admin/ciudades/oaxaca/propuestas" },
      { corrida: "c", tipo: "lugares", titulo: "Lugares de San Luis Potosí", detalle: "3 por revisar · de la búsqueda del 19 oct", n: 3, href: "/admin/ciudades/slp/propuestas" },
      { corrida: "s", tipo: "showcase", titulo: "Showcase", detalle: "1 por revisar · de la búsqueda del 20 oct", n: 1, href: "/admin/ciudades/propuestas/s" },
    ]);
  });
  it("títulos y nota de la bandeja", () => {
    expect(tituloBandeja("lugares", "Oaxaca")).toBe("Lugares de Oaxaca");
    expect(tituloBandeja("agendas", "Oaxaca")).toBe("Agendas y eventos de Oaxaca");
    expect(notaBandeja({ creado_en: "2026-10-18T17:00:00Z", propuestas: 14, aceptadas: 9, rechazadas: 0 }, AHORA)).toBe("18 oct · 14 propuestos · 9 aceptados");
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
