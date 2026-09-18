import { describe, expect, it } from "vitest";
import { agruparPorDia, agruparPorPublicacion, buscarEventos, corteNuevos, DIAS_NUEVOS, distanciaKm, filtrarAgenda, textoDistancia, tituloPublicacion, type EventoAgenda } from "./agenda";

// "ahora": lunes 14 sep 2026, 12:00 hora de la ciudad (18:00Z)
const AHORA = new Date("2026-09-14T18:00:00Z");

function evento(p: Partial<EventoAgenda> & { id: string; inicio: string }): EventoAgenda {
  return { titulo: p.id, fin: null, imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, lugar: null, creado_en: "2026-09-01T00:00:00Z", lat: null, lng: null, van: 0, zona: "America/Mexico_City", ...p };
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
    const ctx = { filtro: "todos" as const, punto: null, seguidos: null, fecha: "2026-09-15", ahora: AHORA };
    expect(filtrarAgenda([slp, madrid], ctx).lista.map((e) => e.id)).toEqual(["madrid"]);
  });
  it("con orden dado, respeta el orden dentro del día (Cercanos: por distancia) y los días siguen en orden", () => {
    const grupos = agruparPorDia(
      [evento({ id: "lejos-manana", inicio: "2026-09-16T01:00:00Z" }), evento({ id: "cerca-hoy-tarde", inicio: "2026-09-15T01:00:00Z" }), evento({ id: "lejos-hoy-temprano", inicio: "2026-09-14T23:00:00Z" })],
      AHORA,
      true,
    );
    expect(grupos.map((g) => g.titulo)).toEqual(["Hoy", "Mañana"]);
    expect(grupos[0].eventos.map((e) => e.id)).toEqual(["cerca-hoy-tarde", "lejos-hoy-temprano"]);
  });
  it("a la misma hora ordena por título y luego por id, llegue como llegue de la base", () => {
    // Jueves 17 a las 19:00 en la ciudad, en el mismo lugar y agregados a la vez: empatan también en Cercanos y Nuevos.
    const comun = { inicio: "2026-09-18T01:00:00Z", creado_en: "2026-09-13T00:00:00Z", lugar_id: "L1", lugar: { nombre: "Casa", portada: null, lat: 22.1449, lng: -100.9753 } };
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
      for (const filtro of ["todos", "cercanos", "siguiendo", "nuevos"] as const) {
        const { lista } = filtrarAgenda(eventos, { filtro, punto: { lat: 22.1497, lng: -100.9764 }, seguidos: ["L1"], fecha: "2026-09-17", ahora: AHORA });
        expect(lista.map((e) => e.id)).toEqual(esperado);
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
  it("filtra por cercanía, seguidos, nuevos y día", () => {
    const lejos = evento({ id: "lejos", inicio: "2026-09-15T01:00:00Z", lat: 22.2, lng: -101.1, creado_en: "2026-09-13T00:00:00Z" });
    const cerca = evento({ id: "cerca", inicio: "2026-09-15T02:00:00Z", lugar_id: "L1", lugar: { nombre: "Casa", portada: null, lat: 22.1449, lng: -100.9753 } });
    const eventos = [lejos, cerca];
    const punto = { lat: 22.1497, lng: -100.9764 };
    expect(filtrarAgenda(eventos, { filtro: "cercanos", punto, seguidos: null, fecha: "", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["cerca", "lejos"]);
    expect(filtrarAgenda(eventos, { filtro: "siguiendo", punto: null, seguidos: ["L1"], fecha: "", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["cerca"]);
    expect(filtrarAgenda(eventos, { filtro: "nuevos", punto: null, seguidos: null, fecha: "", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["lejos"]);
    expect(filtrarAgenda(eventos, { filtro: "todos", punto: null, seguidos: null, fecha: "2026-09-14", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["lejos", "cerca"]);
    expect(filtrarAgenda(eventos, { filtro: "todos", punto: null, seguidos: null, fecha: "2026-09-20", ahora: AHORA }).lista).toEqual([]);
    // El de "cerca" se publicó el 1 de septiembre: queda fuera del tope de 7 días.
  });

  it("busca por título, sitio o artista, a medias y sin acentos; cada palabra escrita tiene que estar", () => {
    const lista = [
      evento({ id: "a", inicio: "2026-09-15T01:00:00Z", titulo: "Noche de jazz", lugar: { nombre: "Museo Leonora Carrington", portada: null } }),
      evento({ id: "b", inicio: "2026-09-15T01:00:00Z", titulo: "Función de títeres", sitio_texto: "Jardín de San Miguelito", artistas: ["Camerata de San Luis"] }),
      evento({ id: "c", inicio: "2026-09-15T01:00:00Z", titulo: "Lectura", lugar: null }),
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

describe("Nuevos: lo recién publicado, arriba", () => {
  // Jueves 17 de septiembre de 2026, 18:00 en la ciudad. Lo que el founder vio el día que lo pidió.
  const HOY = new Date("2026-09-17T18:00:00Z");
  const suyo = evento({ id: "suyo", inicio: "2026-10-08T23:00:00Z", creado_en: "2026-09-17T17:00:00Z" });
  const hoyPronto = evento({ id: "hoy-pronto", inicio: "2026-09-19T03:00:00Z", creado_en: "2026-09-17T16:00:00Z" });
  const ayer = evento({ id: "ayer", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-16T10:00:00Z" });
  const semana = evento({ id: "semana", inicio: "2026-09-20T01:00:00Z", creado_en: "2026-09-14T10:00:00Z" });
  const eventos = [ayer, semana, suyo, hoyPronto];
  const ctx = { filtro: "nuevos" as const, punto: null, seguidos: null, fecha: "", ahora: HOY };

  it("pone arriba lo último publicado, aunque el evento sea el más lejano", () => {
    // El caso del founder: publica un taller del 8 de octubre y espera verlo primero. Con `agruparPorDia` salía
    // último, porque los grupos van por el día del evento; de ahí esta prueba de las dos piezas juntas.
    const { lista } = filtrarAgenda(eventos, ctx);
    const pintado = agruparPorPublicacion(lista, HOY).flatMap((g) => g.eventos.map((e) => e.id));
    expect(pintado[0]).toBe("suyo");
    expect(pintado).toEqual(["suyo", "hoy-pronto", "ayer", "semana"]);
  });

  it("agrupa por cuándo se publicó, con el primer grupo sin fecha", () => {
    const grupos = agruparPorPublicacion(filtrarAgenda(eventos, ctx).lista, HOY);
    expect(grupos.map((g) => [g.titulo, g.eventos.length])).toEqual([
      ["Lo más nuevo", 2],
      ["Publicado ayer", 1],
      ["Esta semana", 1],
    ]);
    // El primer grupo no promete un día: quien vuelve tras tres días ve arriba lo de anteayer.
    expect(tituloPublicacion("2026-09-15T10:00:00Z", HOY)).toBe("Esta semana");
  });

  it("lo publicado a la vez va en orden de agenda, para que dos cargas no lo traigan distinto", () => {
    const a = evento({ id: "a", titulo: "Bailar", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T12:00:00Z" });
    const b = evento({ id: "b", titulo: "Almorzar", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T12:00:00Z" });
    expect(agruparPorPublicacion([a, b], HOY)[0].eventos.map((e) => e.id)).toEqual(["b", "a"]);
    expect(agruparPorPublicacion([b, a], HOY)[0].eventos.map((e) => e.id)).toEqual(["b", "a"]);
  });

  describe("el corte: desde la última visita, con tope de 7 días", () => {
    const tope = HOY.getTime() - 7 * 86400000;

    it("sin marca, vale el tope", () => {
      expect(corteNuevos(null, HOY)).toBe(tope);
      expect(corteNuevos(undefined, HOY)).toBe(tope);
    });

    it("con marca de ayer, manda la marca", () => {
      expect(corteNuevos("2026-09-16T18:00:00Z", HOY)).toBe(new Date("2026-09-16T18:00:00Z").getTime());
    });

    it("con marca de hace un mes, manda el tope: no se muestran cuatro semanas", () => {
      expect(corteNuevos("2026-08-17T18:00:00Z", HOY)).toBe(tope);
    });

    it("con el reloj mal puesto (marca en el futuro) o marca ilegible, vale el tope", () => {
      expect(corteNuevos("2026-12-31T00:00:00Z", HOY)).toBe(tope);
      expect(corteNuevos("no es una fecha", HOY)).toBe(tope);
      expect(corteNuevos("", HOY)).toBe(tope);
    });

    it("el corte decide qué entra a la pestaña", () => {
      const soloHoy = filtrarAgenda(eventos, { ...ctx, corte: corteNuevos("2026-09-17T00:00:00Z", HOY) });
      expect(soloHoy.lista.map((e) => e.id)).toEqual(["suyo", "hoy-pronto"]);
      const nada = filtrarAgenda(eventos, { ...ctx, corte: corteNuevos("2026-09-17T17:30:00Z", HOY) });
      expect(nada.lista).toEqual([]);
    });
  });

  it("Todos y Cercanos no cambian: siguen por día del evento", () => {
    const todos = filtrarAgenda(eventos, { ...ctx, filtro: "todos" });
    expect(agruparPorDia(todos.lista, HOY).map((g) => g.titulo)).toEqual(["Mañana", "sáb 19 de sep", "jue 8 de oct"]);
    expect(todos.lista.map((e) => e.id)).toEqual(["ayer", "hoy-pronto", "semana", "suyo"]);
    const cercanos = filtrarAgenda(eventos, { ...ctx, filtro: "cercanos" });
    expect(cercanos.lista.map((e) => e.id)).toEqual(["ayer", "hoy-pronto", "semana", "suyo"]);
  });
});

/** Lo que salió de la revisión de gestión de cambios del 2026-09-17: cada hallazgo, con su prueba. */
describe("Nuevos: los bordes del corte y de los grupos", () => {
  const HOY = new Date("2026-09-17T18:00:00Z");
  const ZONA_SLP = "America/Mexico_City";

  it("el tope se aplica también a un corte ya calculado, venga de donde venga", () => {
    // Un corte que la memoria de pantalla repone tras días con la pestaña abierta no puede abrir más de 7 días.
    const hace30dias = HOY.getTime() - 30 * 86400000;
    expect(corteNuevos(hace30dias, HOY)).toBe(HOY.getTime() - DIAS_NUEVOS * 86400000);
    // Uno más reciente que el tope sí manda.
    const ayer = HOY.getTime() - 86400000;
    expect(corteNuevos(ayer, HOY)).toBe(ayer);
    // Y uno del futuro, o inválido, cae al tope.
    expect(corteNuevos(HOY.getTime() + 86400000, HOY)).toBe(HOY.getTime() - DIAS_NUEVOS * 86400000);
    expect(corteNuevos(Number.NaN, HOY)).toBe(HOY.getTime() - DIAS_NUEVOS * 86400000);
  });

  it("el filtro acota el corte que le llega: una pestaña vieja no abre un mes", () => {
    const viejo = evento({ id: "viejo", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-08-20T10:00:00Z" });
    const nuevo = evento({ id: "nuevo", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T10:00:00Z" });
    const ctx = { filtro: "nuevos" as const, punto: null, seguidos: null, fecha: "", ahora: HOY };
    const conCorteDeUnMes = filtrarAgenda([viejo, nuevo], { ...ctx, corte: HOY.getTime() - 30 * 86400000 });
    expect(conCorteDeUnMes.lista.map((e) => e.id)).toEqual(["nuevo"]);
  });

  it("el grupo se cuenta en la zona de quien mira, no en la de la ciudad", () => {
    // Publicado a las 07:00 del 17 en Madrid: allí es de hoy; en San Luis, todavía del 16.
    const enMadrid = "2026-09-17T05:00:00Z";
    const ahoraMadrid = new Date("2026-09-17T09:00:00Z");
    expect(tituloPublicacion(enMadrid, ahoraMadrid, "Europe/Madrid")).toBe("Lo más nuevo");
    expect(tituloPublicacion(enMadrid, ahoraMadrid, ZONA_SLP)).toBe("Publicado ayer");
    // Y al revés: lo de ayer a las 23:30 en Tijuana no es "Lo más nuevo" allí.
    const tijuana = "2026-09-17T06:30:00Z";
    expect(tituloPublicacion(tijuana, new Date("2026-09-17T20:00:00Z"), "America/Tijuana")).toBe("Publicado ayer");
  });

  it("lo publicado 'en el futuro' por un reloj atrasado va con lo de hoy, y primero", () => {
    const futuro = evento({ id: "futuro", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-18T12:00:00Z" });
    const hoy = evento({ id: "hoy", inicio: "2026-09-19T01:00:00Z", creado_en: "2026-09-17T10:00:00Z" });
    expect(tituloPublicacion(futuro.creado_en, HOY, ZONA_SLP)).toBe("Lo más nuevo");
    const grupos = agruparPorPublicacion([hoy, futuro], HOY, ZONA_SLP);
    expect(grupos.map((g) => g.titulo)).toEqual(["Lo más nuevo"]);
    expect(grupos[0].eventos.map((e) => e.id)).toEqual(["futuro", "hoy"]);
  });
});
