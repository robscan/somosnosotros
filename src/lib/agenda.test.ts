import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  agruparPorPublicacion,
  buscarEventos,
  conFiltros,
  corteNuevos,
  DIAS_NUEVOS,
  eventosNuevos,
  filtrarAgenda,
  filtrosDeUrl,
  filtrosPuestos,
  hrefAgenda,
  LIMITE_NUEVOS,
  listarAgenda,
  SIN_FILTROS,
  sinSeguirSinSesion,
  textoDistancia,
  tituloPublicacion,
  type Cuanto,
  type EventoAgenda,
  type EventoBuscable,
  compararEventos,
} from "./agenda";
import { distanciaKm } from "./geo";
import { diasActivosCalendario } from "./calendario";
import { claveDe, textoParte } from "./ocurrencias";

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
  it("Cuánto deja lo gratis, lo de cooperación, lo que cuesta, o cualquier suma; vacío no filtra, y las tres clases cubren todo", () => {
    const gratis = evento({ id: "gratis", inicio: "2026-09-19T01:00:00Z", precio: null });
    const coop = evento({ id: "coop", inicio: "2026-09-19T02:00:00Z", precio: "Cooperación solidaria" });
    const pago = evento({ id: "pago", inicio: "2026-09-19T03:00:00Z", precio: "$150" });
    const de = (cuanto: Cuanto[]) => filtrarAgenda([gratis, coop, pago], { ...sinFiltros, cuanto }).map((e) => e.id);
    expect(de(["gratis"])).toEqual(["gratis"]);
    expect(de(["cooperacion"])).toEqual(["coop"]);
    expect(de(["costo"])).toEqual(["pago"]);
    expect(de(["gratis", "cooperacion"])).toEqual(["gratis", "coop"]);
    expect(de(["gratis", "cooperacion", "costo"])).toEqual(["gratis", "coop", "pago"]);
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
  it("«Solo lo que sigo» solo cuenta con sesión: sin ella, lo que llegue en la URL o en la memoria se ignora y lo demás se queda", () => {
    const puestos = { cuando: { desde: "2026-10-03", hasta: "2026-10-04" }, cuanto: ["gratis" as const], siguiendo: true };
    expect(sinSeguirSinSesion(puestos, true)).toBe(puestos);
    expect(sinSeguirSinSesion(puestos, false)).toEqual({ ...puestos, siguiendo: false });
    expect(filtrosPuestos(sinSeguirSinSesion(puestos, false))).toBe(1);
    const sinSeguir = { ...puestos, siguiendo: false };
    expect(sinSeguirSinSesion(sinSeguir, false)).toBe(sinSeguir);
    expect(sinSeguirSinSesion(SIN_FILTROS, false)).toBe(SIN_FILTROS);
  });
});

describe("Nuevos: lo publicado desde la última visita (docs/rediseno/23)", () => {
  // Jueves 17 de septiembre de 2026, 18:00 en la ciudad: lo que el founder vio el día que pidió «lo más reciente arriba».
  const HOY = new Date("2026-09-17T18:00:00Z");
  const ZONA_SLP = "America/Mexico_City";
  const suyo = evento({ id: "suyo", inicio: "2026-10-08T23:00:00Z", creado_en: "2026-09-17T17:00:00Z" });
  const hoyPronto = evento({ id: "hoy-pronto", inicio: "2026-09-19T03:00:00Z", creado_en: "2026-09-17T16:00:00Z" });
  const ayer = evento({ id: "ayer", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-16T10:00:00Z" });
  const semana = evento({ id: "semana", inicio: "2026-09-20T01:00:00Z", creado_en: "2026-09-14T10:00:00Z" });
  const eventos = [ayer, semana, suyo, hoyPronto];
  const agenda = { eventos, seguidos: null, eventosSeguidos: [] };
  const tope = HOY.getTime() - DIAS_NUEVOS * 86400000;

  describe("el corte: desde la última visita, con tope de 7 días", () => {
    it("sin marca, o con una marca ilegible o del futuro (un teléfono con la hora mal puesta), vale el tope", () => {
      for (const marca of [null, undefined, "", "no es una fecha", "2026-12-31T00:00:00Z", HOY.getTime() + 86400000, Number.NaN]) expect(corteNuevos(marca, HOY)).toBe(tope);
    });
    it("con una marca de ayer manda la marca, sea texto o número", () => {
      const ayerALas18 = new Date("2026-09-16T18:00:00Z").getTime();
      expect(corteNuevos("2026-09-16T18:00:00Z", HOY)).toBe(ayerALas18);
      expect(corteNuevos(ayerALas18, HOY)).toBe(ayerALas18);
    });
    it("con una marca de hace un mes manda el tope: no se muestran cuatro semanas", () => {
      expect(corteNuevos("2026-08-17T18:00:00Z", HOY)).toBe(tope);
      expect(corteNuevos(HOY.getTime() - 30 * 86400000, HOY)).toBe(tope);
    });
  });

  describe("lo nuevo: una sola definición", () => {
    it("deja lo publicado desde el corte, lo último primero, aunque el evento sea el más lejano", () => {
      // El caso del founder: publica un taller del 8 de octubre y espera verlo primero (con los grupos por día del evento salía el último).
      expect(eventosNuevos(eventos, tope).map((e) => e.id)).toEqual(["suyo", "hoy-pronto", "ayer", "semana"]);
      expect(eventosNuevos(eventos, new Date("2026-09-17T00:00:00Z").getTime()).map((e) => e.id)).toEqual(["suyo", "hoy-pronto"]);
      expect(eventosNuevos(eventos, new Date("2026-09-17T17:30:00Z").getTime())).toEqual([]);
    });
    it("lo publicado a la vez va en orden de agenda, llegue como llegue de la base", () => {
      const a = evento({ id: "a", titulo: "Bailar", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T12:00:00Z" });
      const b = evento({ id: "b", titulo: "Almorzar", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T12:00:00Z" });
      expect(eventosNuevos([a, b], tope).map((e) => e.id)).toEqual(["b", "a"]);
      expect(eventosNuevos([b, a], tope).map((e) => e.id)).toEqual(["b", "a"]);
    });
  });

  describe("los grupos: por cuándo se publicó, en la zona de quien mira", () => {
    it("Lo más nuevo, Publicado ayer y Esta semana, en ese orden y sin repetirse", () => {
      const grupos = agruparPorPublicacion(eventosNuevos(eventos, tope), HOY, ZONA_SLP);
      expect(grupos.map((g) => [g.titulo, g.eventos.map((e) => e.id)])).toEqual([
        ["Lo más nuevo", ["suyo", "hoy-pronto"]],
        ["Publicado ayer", ["ayer"]],
        ["Esta semana", ["semana"]],
      ]);
      // El primer grupo no promete un día: quien vuelve tras tres días ve arriba lo de anteayer.
      expect(tituloPublicacion("2026-09-15T10:00:00Z", HOY, ZONA_SLP)).toBe("Esta semana");
    });
    it("agrupa igual llegue como llegue la lista", () => {
      expect(agruparPorPublicacion([...eventos].reverse(), HOY, ZONA_SLP).map((g) => g.titulo)).toEqual(["Lo más nuevo", "Publicado ayer", "Esta semana"]);
    });
    it("el grupo se cuenta en la zona de quien mira, no en la de la ciudad", () => {
      // Publicado a las 07:00 del 17 en Madrid: allí es de hoy; en San Luis, todavía del 16.
      const enMadrid = "2026-09-17T05:00:00Z";
      const ahoraMadrid = new Date("2026-09-17T09:00:00Z");
      expect(tituloPublicacion(enMadrid, ahoraMadrid, "Europe/Madrid")).toBe("Lo más nuevo");
      expect(tituloPublicacion(enMadrid, ahoraMadrid, ZONA_SLP)).toBe("Publicado ayer");
      // Y al revés: lo de ayer a las 23:30 en Tijuana no es «Lo más nuevo» allí.
      expect(tituloPublicacion("2026-09-17T06:30:00Z", new Date("2026-09-17T20:00:00Z"), "America/Tijuana")).toBe("Publicado ayer");
    });
    it("lo publicado «en el futuro» por un reloj atrasado va con lo de hoy, y primero", () => {
      const futuro = evento({ id: "futuro", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-18T12:00:00Z" });
      const hoy = evento({ id: "hoy", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T10:00:00Z" });
      const grupos = agruparPorPublicacion([hoy, futuro], HOY, ZONA_SLP);
      expect(grupos.map((g) => g.titulo)).toEqual(["Lo más nuevo"]);
      expect(grupos[0].eventos.map((e) => e.id)).toEqual(["futuro", "hoy"]);
    });
  });

  describe("la pestaña: los mismos filtros que Todos", () => {
    const de = (filtros: Partial<typeof SIN_FILTROS>, desde = tope) => listarAgenda(agenda, { ...SIN_FILTROS, ...filtros }, desde).map((e) => e.id);
    it("sin corte es Todos, en orden de agenda; con él, lo nuevo en orden de publicación", () => {
      expect(listarAgenda(agenda, SIN_FILTROS).map((e) => e.id)).toEqual(["ayer", "hoy-pronto", "semana", "suyo"]);
      expect(de({})).toEqual(["suyo", "hoy-pronto", "ayer", "semana"]);
    });
    it("Cuándo, Cuánto y «Solo lo que sigo» valen igual en las dos pestañas", () => {
      const conLugar = evento({ id: "conLugar", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T15:00:00Z", lugar_id: "L1", precio: "$80" });
      const lista = { eventos: [...eventos, conLugar], seguidos: ["L1"], eventosSeguidos: [] };
      const ids = (filtros: Partial<typeof SIN_FILTROS>, desde?: number) => listarAgenda(lista, { ...SIN_FILTROS, ...filtros }, desde).map((e) => e.id);
      expect(ids({ siguiendo: true }, tope)).toEqual(["conLugar"]);
      expect(ids({ cuanto: ["gratis"] }, tope)).toEqual(["suyo", "hoy-pronto", "ayer", "semana"]);
      // El jueves 18 (a las 19:00 y 21:00 de la ciudad): lo mismo en Todos, en su orden.
      expect(ids({ cuando: { desde: "2026-09-18", hasta: "2026-09-18" } }, tope)).toEqual(["hoy-pronto", "conLugar", "ayer"]);
      expect(ids({ cuando: { desde: "2026-09-18", hasta: "2026-09-18" } })).toEqual(["ayer", "conLugar", "hoy-pronto"]);
    });
    it("el tope de 20 se aplica después de los filtros: lo que no cumple no le quita su lugar a lo que sí", () => {
      // 25 eventos: los 5 más recientes cuestan y los 20 anteriores son gratis. Con «Gratis», caben los 20 gratis (y no 15).
      const muchos = Array.from({ length: 25 }, (_, i) => evento({ id: `e${i}`, inicio: "2026-09-19T01:00:00Z", creado_en: new Date(HOY.getTime() - (i + 1) * 3600000).toISOString(), precio: i < 5 ? "$100" : null }));
      const lista = { eventos: muchos, seguidos: null, eventosSeguidos: [] };
      expect(listarAgenda(lista, SIN_FILTROS, tope)).toHaveLength(LIMITE_NUEVOS);
      expect(listarAgenda(lista, { ...SIN_FILTROS, cuanto: ["gratis"] }, tope)).toHaveLength(LIMITE_NUEVOS);
      expect(listarAgenda(lista, SIN_FILTROS)).toHaveLength(25);
    });
    it("con un día elegido, la pestaña trae solo lo nuevo de ese día: lo que dice el botón «Ver N eventos»", () => {
      expect(de({}, new Date("2026-09-17T00:00:00Z").getTime())).toEqual(["suyo", "hoy-pronto"]);
      expect(de({ cuando: { desde: "2026-10-08", hasta: "2026-10-08" } }, new Date("2026-09-17T00:00:00Z").getTime())).toEqual(["suyo"]);
      expect(de({ cuando: { desde: "2026-09-20", hasta: "2026-09-20" } }, new Date("2026-09-17T00:00:00Z").getTime())).toEqual([]);
    });
  });

  it("la pestaña vive en la URL, sin perder la ciudad ni los filtros", () => {
    expect(hrefAgenda(SIN_FILTROS, null, true)).toBe("/agenda?ver=nuevos");
    expect(hrefAgenda(SIN_FILTROS, "queretaro", true)).toBe("/agenda?ciudad=queretaro&ver=nuevos");
    expect(hrefAgenda({ ...SIN_FILTROS, cuanto: ["gratis"] }, "queretaro")).toBe("/agenda?ciudad=queretaro&cuanto=gratis");
  });
  it("hay filtros si hay Cuándo o algo en Filtros", () => {
    expect(conFiltros(SIN_FILTROS)).toBe(false);
    expect(conFiltros({ ...SIN_FILTROS, cuando: { desde: "2026-09-19", hasta: "2026-09-19" } })).toBe(true);
    expect(conFiltros({ ...SIN_FILTROS, cuanto: ["gratis"] })).toBe(true);
    expect(conFiltros({ ...SIN_FILTROS, siguiendo: true })).toBe(true);
  });
});

describe("la agenda por día: cada día en que pasa algo (OL-320)", () => {
  // Hoy lunes 14 sep 2026, 12:00 de la ciudad. Sábados 19 y 26 de sep y 3 de oct (América/México, UTC−6): cada sesión con su hora.
  const hora = (d: string, h: string) => new Date(`${d}T${h}:00-06:00`).toISOString();
  const sesiones = [
    { inicio: hora("2026-09-19", "17:00"), fin: hora("2026-09-19", "19:00") },
    { inicio: hora("2026-09-26", "18:00"), fin: hora("2026-09-26", "20:00") },
    { inicio: hora("2026-10-03", "17:00"), fin: hora("2026-10-03", "19:00") },
  ];
  const taller = evento({ id: "taller", titulo: "Taller de grabado", inicio: sesiones[0].inicio, fin: sesiones[2].fin, sesiones, precio: "$300" });
  const jazz = evento({ id: "jazz", titulo: "Noche de jazz", inicio: hora("2026-09-26", "19:00") });
  const festival = evento({ id: "festival", titulo: "Festival", inicio: hora("2026-09-18", "20:00"), fin: hora("2026-09-20", "21:00") });
  const agenda = { eventos: [jazz, taller, festival], seguidos: null, eventosSeguidos: [] };
  const lista = (f: Partial<typeof SIN_FILTROS> = {}, ahora = AHORA) => listarAgenda(agenda, { ...SIN_FILTROS, ...f }, undefined, ahora);

  it("un evento con tres sesiones sale tres veces, cada una con la hora de ese día, y el festival de cada día una por día", () => {
    expect(lista().map((e) => [claveDe(e), e.inicio])).toEqual([
      ["festival:2026-09-18", hora("2026-09-18", "20:00")],
      ["taller:2026-09-19", sesiones[0].inicio],
      ["festival:2026-09-19", hora("2026-09-19", "20:00")],
      ["festival:2026-09-20", hora("2026-09-20", "20:00")],
      ["taller:2026-09-26", sesiones[1].inicio],
      ["jazz:2026-09-26", jazz.inicio],
      ["taller:2026-10-03", sesiones[2].inicio],
    ]);
  });
  it("las tres llaves son distintas aunque el evento sea el mismo: es lo que usan los renglones", () => {
    const llaves = lista().map(claveDe);
    expect(new Set(llaves).size).toBe(llaves.length);
    expect(lista().filter((e) => e.id === "taller").map(textoParte)).toEqual(["Día 1 de 3", "Día 2 de 3", "Día 3 de 3"]);
  });
  it("los días se agrupan por el de cada sesión, no por el del inicio del evento", () => {
    const grupos = agruparPorDia(lista(), AHORA);
    expect(grupos.map((g) => [g.clave, g.eventos.map((e) => e.id)])).toEqual([
      ["2026-09-18", ["festival"]],
      ["2026-09-19", ["taller", "festival"]],
      ["2026-09-20", ["festival"]],
      ["2026-09-26", ["taller", "jazz"]],
      ["2026-10-03", ["taller"]],
    ]);
  });
  it("el día que ya pasó no sale: con el reloj en el segundo sábado, el primero ya no está", () => {
    const despues = new Date(hora("2026-09-26", "12:00"));
    expect(lista({}, despues).filter((e) => e.id === "taller").map(textoParte)).toEqual(["Día 2 de 3", "Día 3 de 3"]);
    // y el festival, que acabó el domingo 20, tampoco
    expect(lista({}, despues).some((e) => e.id === "festival")).toBe(false);
  });
  it("Cuándo: un día con sesión lo trae, y uno de en medio sin sesión no", () => {
    expect(lista({ cuando: dia("2026-09-26") }).map((e) => e.id)).toEqual(["taller", "jazz"]);
    expect(lista({ cuando: dia("2026-09-23") })).toEqual([]);
    expect(lista({ cuando: { desde: "2026-09-20", hasta: "2026-09-25" } }).map(claveDe)).toEqual(["festival:2026-09-20"]);
  });
  it("«Ver N eventos» cuenta los renglones de la lista: lo que dice el botón es lo que se ve", () => {
    const f = { cuando: { desde: "2026-09-19", hasta: "2026-09-26" } };
    expect(lista(f)).toHaveLength(5);
    expect(lista({ ...f, cuanto: ["costo"] }).map((e) => e.id)).toEqual(["taller", "taller"]);
  });
  it("Nuevos lista eventos, una vez cada uno, aunque Cuándo mire los días de sus sesiones", () => {
    const nuevos = (f: Partial<typeof SIN_FILTROS>) => listarAgenda(agenda, { ...SIN_FILTROS, ...f }, 0, AHORA).map((e) => e.id);
    expect(nuevos({})).toEqual(["festival", "taller", "jazz"]);
    expect(nuevos({ cuando: dia("2026-09-26") })).toEqual(["taller", "jazz"]);
    expect(nuevos({ cuando: dia("2026-09-23") })).toEqual([]);
    expect(listarAgenda(agenda, SIN_FILTROS, 0, AHORA).find((e) => e.id === "taller")?.sesiones).toHaveLength(3);
  });
  it("los puntos del calendario de Cuándo caen en los días de las sesiones, no en los de en medio", () => {
    const dias = diasActivosCalendario([taller]);
    expect([...dias.keys()]).toEqual(["2026-09-19", "2026-09-26", "2026-10-03"]);
    // El festival (sin horario por día) ocupa cada uno de sus días; el jazz, el suyo: el número de un día cuenta lo que hay ese día.
    expect(diasActivosCalendario(agenda.eventos).get("2026-09-26")).toBe(2);
    expect(diasActivosCalendario(agenda.eventos).get("2026-09-20")).toBe(1);
    expect(diasActivosCalendario(agenda.eventos).get("2026-09-23")).toBeUndefined();
  });
  it("el orden de agenda compara instantes, no letras: «…Z» y «…+00:00» de la misma hora empatan y decide el título", () => {
    const a = evento({ id: "a", titulo: "Beta", inicio: "2026-09-26T01:00:00.000Z" });
    const b = evento({ id: "b", titulo: "Alfa", inicio: "2026-09-26T01:00:00+00:00" });
    expect([a, b].sort(compararEventos).map((e) => e.id)).toEqual(["b", "a"]);
  });
});
