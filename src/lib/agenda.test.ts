import { describe, expect, it } from "vitest";
import { agruparPorDia, buscarEventos, filtrarAgenda, filtrosDeUrl, filtrosPuestos, hrefAgenda, listarAgenda, SIN_FILTROS, textoDistancia, type EventoAgenda, type EventoBuscable } from "./agenda";
import { distanciaKm } from "./geo";

// "ahora": lunes 14 sep 2026, 12:00 hora de la ciudad (18:00Z)
const AHORA = new Date("2026-09-14T18:00:00Z");
/** Cuándo de un solo día. */
const dia = (d: string) => ({ desde: d, hasta: d });
/** Sin ningún filtro puesto: todo lo que hay, en orden de agenda. */
const sinFiltros = { siguiendo: false, seguidos: null, cuando: null };

function evento(p: Partial<EventoAgenda> & { id: string; inicio: string }): EventoAgenda {
  return { titulo: p.id, fin: null, imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, lugar: null, creado_en: "2026-09-01T00:00:00Z", van: 0, zona: "America/Mexico_City", ...p };
}

describe("agenda", () => {
  it("agrupa por día con Hoy, Mañana y días cortos, en orden", () => {
    const grupos = agruparPorDia(
      [evento({ id: "c", inicio: "2026-09-17T01:00:00Z" }), evento({ id: "a", inicio: "2026-09-15T01:00:00Z" }), evento({ id: "b", inicio: "2026-09-16T01:00:00Z" }), evento({ id: "a2", inicio: "2026-09-14T23:00:00Z" })],
      AHORA,
    );
    expect(grupos.map((g) => g.titulo)).toEqual(["Hoy", "Mañana", "mié 16 de sep"]);
    expect(grupos[0].eventos.map((e) => e.id)).toEqual(["a2", "a"]); // 17:00 y 19:00 de hoy
  });
  it("cada evento cae en el día de su zona, y el chip de fecha también", () => {
    // Lunes 14 a las 23:30 UTC: en San Luis son las 17:30 del lunes; en Madrid, la 1:30 del martes.
    const slp = evento({ id: "slp", inicio: "2026-09-14T23:30:00Z" });
    const madrid = evento({ id: "madrid", inicio: "2026-09-14T23:30:00Z", zona: "Europe/Madrid" });
    const grupos = agruparPorDia([slp, madrid], AHORA);
    expect(grupos.map((g) => [g.clave, g.titulo, g.eventos.map((e) => e.id)])).toEqual([
      ["2026-09-14", "Hoy", ["slp"]],
      ["2026-09-15", "Mañana", ["madrid"]],
    ]);
    expect(filtrarAgenda([slp, madrid], { ...sinFiltros, cuando: dia("2026-09-15") }).map((e) => e.id)).toEqual(["madrid"]);
  });
  it("el chip de fecha también encuentra un evento de varios días en cualquiera de los días que ocupa (OL-218)", () => {
    // Del 6 al 8 de octubre: el calendario de Cuándo marca los tres días con evento (`diasActivosCalendario`)
    // — sin esto, elegir el 7 (no el día de inicio) filtraba a una lista vacía (bitácora 247).
    const varios = evento({ id: "varios", inicio: "2026-10-06T17:00:00Z", fin: "2026-10-08T20:00:00Z" });
    for (const d of ["2026-10-06", "2026-10-07", "2026-10-08"]) {
      expect(filtrarAgenda([varios], { ...sinFiltros, cuando: dia(d) }).map((e) => e.id)).toEqual(["varios"]);
    }
    expect(filtrarAgenda([varios], { ...sinFiltros, cuando: dia("2026-10-05") })).toEqual([]);
    expect(filtrarAgenda([varios], { ...sinFiltros, cuando: dia("2026-10-09") })).toEqual([]);
  });
  it("a la misma hora ordena por título y luego por id, llegue como llegue de la base", () => {
    // Jueves 17 a las 19:00 en la ciudad, en el mismo lugar y agregados a la vez.
    const comun = { inicio: "2026-09-18T01:00:00Z", creado_en: "2026-09-13T00:00:00Z", lugar_id: "L1", lugar: { nombre: "Casa", portada: null } };
    const llegada = [
      evento({ ...comun, id: "e1", titulo: "Lectura del Taller de Creación Literaria" }),
      evento({ ...comun, id: "e4", titulo: "Mariachi" }),
      evento({ ...comun, id: "e2", titulo: "Demostración folclórica" }),
      evento({ ...comun, id: "e3", titulo: "Mariachi" }),
    ];
    const esperado = ["e2", "e1", "e3", "e4"];
    for (const eventos of [llegada, [...llegada].reverse()]) {
      expect(agruparPorDia(eventos, AHORA)[0].eventos.map((e) => e.id)).toEqual(esperado);
      // Con el día elegido la lista se pinta tal cual sale del filtro (el caso del jueves 17 en el iPhone).
      for (const siguiendo of [false, true]) {
        expect(filtrarAgenda(eventos, { siguiendo, seguidos: ["L1"], cuando: dia("2026-09-17") }).map((e) => e.id)).toEqual(esperado);
      }
    }
  });
  it("mide distancias y las escribe en metros o kilómetros", () => {
    const plaza = { lat: 22.1497, lng: -100.9764 };
    const km = distanciaKm(plaza, { lat: 22.1449, lng: -100.9753 });
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(0.6);
    expect(textoDistancia(0.54)).toBe("a 550 m");
    expect(textoDistancia(2.4)).toBe("a 2.4 km");
    expect(textoDistancia(12.6)).toBe("a 13 km");
  });
  it("filtra por seguidos y por día", () => {
    const lejos = evento({ id: "lejos", inicio: "2026-09-15T01:00:00Z" });
    const cerca = evento({ id: "cerca", inicio: "2026-09-15T02:00:00Z", lugar_id: "L1", lugar: { nombre: "Casa", portada: null } });
    const eventos = [lejos, cerca];
    expect(filtrarAgenda(eventos, { ...sinFiltros, siguiendo: true, seguidos: ["L1"] }).map((e) => e.id)).toEqual(["cerca"]);
    expect(filtrarAgenda(eventos, { ...sinFiltros, siguiendo: true, seguidos: null })).toEqual([]);
    expect(filtrarAgenda(eventos, { ...sinFiltros, siguiendo: true, seguidos: null, eventosSeguidos: ["lejos"] }).map((e) => e.id)).toEqual(["lejos"]);
    expect(filtrarAgenda(eventos, { ...sinFiltros, cuando: dia("2026-09-14") }).map((e) => e.id)).toEqual(["lejos", "cerca"]);
    expect(filtrarAgenda(eventos, { ...sinFiltros, cuando: dia("2026-09-20") })).toEqual([]);
  });

  it("busca por título, sitio o artista, a medias y sin acentos; cada palabra escrita tiene que estar", () => {
    const con = (artistas: string[], e: EventoAgenda): EventoBuscable => ({ ...e, artistas });
    const lista = [
      con([], evento({ id: "a", inicio: "2026-09-15T01:00:00Z", titulo: "Noche de jazz", lugar: { nombre: "Museo Leonora Carrington", portada: null } })),
      con(["Camerata de San Luis"], evento({ id: "b", inicio: "2026-09-15T01:00:00Z", titulo: "Función de títeres", sitio_texto: "Jardín de San Miguelito" })),
      con([], evento({ id: "c", inicio: "2026-09-15T01:00:00Z", titulo: "Lectura", lugar: null })),
    ];
    expect(buscarEventos(lista, "").map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(buscarEventos(lista, "JAZZ").map((e) => e.id)).toEqual(["a"]);
    expect(buscarEventos(lista, "carrington").map((e) => e.id)).toEqual(["a"]);
    expect(buscarEventos(lista, "camerata").map((e) => e.id)).toEqual(["b"]);
    expect(buscarEventos(lista, "titeres jardin").map((e) => e.id)).toEqual(["b"]);
    expect(buscarEventos(lista, "jazz jardin")).toEqual([]);
    expect(buscarEventos(lista, "sitio por confirmar").map((e) => e.id)).toEqual(["c"]);
  });
});

describe("Cuándo y Cuánto en la agenda (docs/rediseno/50, P5)", () => {
  // Todos a las 19:00 de la ciudad (01:00Z del día siguiente): lun 14, mar 15, sáb 19, dom 20 y lun 21 de sep.
  const lun = evento({ id: "lun", inicio: "2026-09-15T01:00:00Z" });
  const mar = evento({ id: "mar", inicio: "2026-09-16T01:00:00Z" });
  const sab = evento({ id: "sab", inicio: "2026-09-20T01:00:00Z" });
  const dom = evento({ id: "dom", inicio: "2026-09-21T01:00:00Z" });
  const lun21 = evento({ id: "lun21", inicio: "2026-09-22T01:00:00Z" });
  const todos = [lun, mar, sab, dom, lun21];

  it("un rango deja los eventos de todos sus días, con los dos extremos dentro", () => {
    const enRango = (desde: string, hasta: string) => filtrarAgenda(todos, { ...sinFiltros, cuando: { desde, hasta } }).map((e) => e.id);
    expect(enRango("2026-09-19", "2026-09-20")).toEqual(["sab", "dom"]);
    expect(enRango("2026-09-14", "2026-09-15")).toEqual(["lun", "mar"]);
    expect(enRango("2026-09-17", "2026-09-18")).toEqual([]);
  });
  it("un evento de varios días cuenta si su tramo toca el rango, aunque empiece antes o termine después", () => {
    const expo = evento({ id: "expo", inicio: "2026-09-10T17:00:00Z", fin: "2026-09-30T20:00:00Z" });
    expect(filtrarAgenda([expo], { ...sinFiltros, cuando: { desde: "2026-09-19", hasta: "2026-09-20" } }).map((e) => e.id)).toEqual(["expo"]);
    expect(filtrarAgenda([expo], { ...sinFiltros, cuando: { desde: "2026-10-01", hasta: "2026-10-02" } })).toEqual([]);
  });
  it("Cuánto deja lo gratis (sin precio), lo de cooperación, o los dos; vacío no filtra", () => {
    const gratis = evento({ id: "gratis", inicio: "2026-09-19T01:00:00Z", precio: null });
    const coop = evento({ id: "coop", inicio: "2026-09-19T02:00:00Z", precio: "Cooperación solidaria" });
    const pago = evento({ id: "pago", inicio: "2026-09-19T03:00:00Z", precio: "$150" });
    const de = (cuanto: ("gratis" | "cooperacion")[]) => filtrarAgenda([gratis, coop, pago], { ...sinFiltros, cuanto }).map((e) => e.id);
    expect(de(["gratis"])).toEqual(["gratis"]);
    expect(de(["cooperacion"])).toEqual(["coop"]);
    expect(de(["gratis", "cooperacion"])).toEqual(["gratis", "coop"]);
    expect(de([])).toEqual(["gratis", "coop", "pago"]);
  });
  it("con `desde`, lo que empezó antes va en el primer día del rango y no en el que ya pasó", () => {
    const expo = evento({ id: "expo", inicio: "2026-09-10T17:00:00Z", fin: "2026-09-30T20:00:00Z" });
    const grupos = agruparPorDia([expo, sab], AHORA, "2026-09-19");
    expect(grupos.map((g) => [g.clave, g.titulo, g.eventos.map((e) => e.id)])).toEqual([["2026-09-19", "sáb 19 de sep", ["expo", "sab"]]]);
  });
  it("listarAgenda: lo que dice cada botón «Ver N eventos» es lo que la lista trae con esos filtros", () => {
    // A las 19:00 y 20:00 del sábado 19 y a las 19:00 del domingo 20 (la ciudad va seis horas detrás de UTC).
    const jazz = evento({ id: "jazz", titulo: "Noche de jazz", inicio: "2026-09-20T01:00:00Z", lugar_id: "L1" });
    const cine = evento({ id: "cine", titulo: "Cine de barrio", inicio: "2026-09-20T02:00:00Z", precio: "$50" });
    const domingo = evento({ id: "domingo", titulo: "Jazz en el parque", inicio: "2026-09-21T01:00:00Z", precio: "Cooperación solidaria" });
    const agenda = { eventos: [cine, domingo, jazz], seguidos: ["L1"], eventosSeguidos: [] };
    const ids = (f: Partial<typeof SIN_FILTROS>) => listarAgenda(agenda, { ...SIN_FILTROS, ...f }).map((e) => e.id);
    expect(ids({})).toEqual(["jazz", "cine", "domingo"]);
    expect(ids({ cuando: { desde: "2026-09-19", hasta: "2026-09-19" } })).toEqual(["jazz", "cine"]);
    expect(ids({ siguiendo: true })).toEqual(["jazz"]);
    expect(ids({ cuanto: ["cooperacion"] })).toEqual(["domingo"]);
    expect(ids({ cuando: { desde: "2026-09-19", hasta: "2026-09-21" }, cuanto: ["cooperacion"] })).toEqual(["domingo"]);
  });
  it("los filtros viajan por la URL de Agenda y lo que no se reconoce se ignora", () => {
    const filtros = { cuando: { desde: "2026-10-03", hasta: "2026-10-04" }, cuanto: ["gratis" as const], siguiendo: true };
    expect(hrefAgenda(filtros, "queretaro")).toBe("/agenda?ciudad=queretaro&desde=2026-10-03&hasta=2026-10-04&cuanto=gratis&filtro=siguiendo");
    expect(hrefAgenda(SIN_FILTROS)).toBe("/agenda");
    expect(hrefAgenda({ ...SIN_FILTROS, cuando: { desde: "2026-10-03", hasta: "2026-10-03" } })).toBe("/agenda?desde=2026-10-03");
    expect(filtrosDeUrl({ desde: "2026-10-03", hasta: "2026-10-04", cuanto: "gratis,otro", filtro: "siguiendo" })).toEqual({ cuando: filtros.cuando, cuanto: ["gratis"], siguiendo: true });
    expect(filtrosDeUrl({ filtro: "cercanos", desde: "mañana" })).toEqual(SIN_FILTROS);
    expect(filtrosPuestos(filtros)).toBe(2);
  });
});
