import { describe, expect, it } from "vitest";
import {
  calcularCarrilesAgenda,
  carrilDestacados,
  carrilEstaSemana,
  carrilEstelar,
  carrilNuevos,
  carrilPopulares,
  carrilTusPlanes,
  eventosEstaSemana,
  idsUsadosEnAgenda,
  limiteBusqueda,
  MINIMO_NUEVOS,
  MINIMO_POPULARES,
  ordenBusqueda,
  sinRepetidos,
  TOPE_ESTA_SEMANA,
  TOPE_ESTELAR,
  tituloEstelar,
} from "./inicio";
import type { Agenda } from "./cargarAgenda";

const ahora = new Date("2026-09-23T18:00:00Z");
function evento(id: string, cambios: Partial<{ inicio: string; fin: string; van: number; titulo: string; creado_en: string }> = {}) {
  return { id, titulo: id, inicio: "2026-09-24T01:00:00Z", fin: "2026-09-24T03:00:00Z", van: 0, creado_en: "2026-09-01T00:00:00Z", ...cambios };
}
function agenda(cambios: Partial<Agenda> = {}): Agenda {
  return { eventos: [], seguidos: [], eventosSeguidos: [], asistencias: {}, destacados: [], ...cambios };
}
/** Un ISO fuera de la ventana de "Esta semana" (más de 7 días desde `ahora`): lo que necesita "Nuevos eventos". */
const fechaFueraDeEstaSemana = (horasDeMas = 0) => new Date(ahora.getTime() + (DIAS_ESTA_SEMANA_MS + horasDeMas * 3600000)).toISOString();
const DIAS_ESTA_SEMANA_MS = 8 * 86400000; // 8 días: de sobra, más allá de los 7 de la ventana.

describe("Inicio: esta semana (próximos 7 días)", () => {
  it("incluye hoy y el séptimo día, excluye el octavo", () => {
    const dentro = evento("a", { inicio: "2026-09-30T17:59:00Z", fin: "2026-09-30T18:00:00Z" });
    const fuera = evento("b", { inicio: "2026-09-30T18:00:01Z", fin: "2026-09-30T19:00:00Z" });
    expect(eventosEstaSemana([dentro, fuera], ahora).map((e) => e.id)).toEqual(["a"]);
  });
  it("un evento en curso (empezó antes, no ha terminado) cuenta", () => {
    const enCurso = evento("c", { inicio: "2026-09-20T00:00:00Z", fin: "2026-09-23T20:00:00Z" });
    const yaTermino = evento("d", { inicio: "2026-09-20T00:00:00Z", fin: "2026-09-23T17:00:00Z" });
    expect(eventosEstaSemana([enCurso, yaTermino], ahora).map((e) => e.id)).toEqual(["c"]);
  });
  it("sin eventos no ofrece nada", () => expect(eventosEstaSemana([], ahora)).toEqual([]));
});

describe("Inicio: sin duplicar eventos entre carriles", () => {
  it("un id ya visto no se repite y el conjunto de vistos crece", () => {
    const vistos = new Set(["a"]);
    const resultado = sinRepetidos([evento("a"), evento("b"), evento("c")], vistos);
    expect(resultado.map((e) => e.id)).toEqual(["b", "c"]);
    expect(vistos).toEqual(new Set(["a", "b", "c"]));
  });
  it("dos carriles consecutivos comparten el mismo conjunto: el segundo no repite lo del primero", () => {
    const vistos = new Set<string>();
    const favoritos = sinRepetidos([evento("a"), evento("b")], vistos);
    const destacados = sinRepetidos([evento("b"), evento("c")], vistos);
    expect(favoritos.map((e) => e.id)).toEqual(["a", "b"]);
    expect(destacados.map((e) => e.id)).toEqual(["c"]);
  });
});

describe("Inicio: carril Tus planes (Voy + Me interesa juntos, por fecha)", () => {
  it("junta las dos listas y ordena por fecha, sin importar de cuál vino cada una", () => {
    const voy = [evento("b", { inicio: "2026-09-26T01:00:00Z" })];
    const interesan = [evento("a", { inicio: "2026-09-24T01:00:00Z" }), evento("c", { inicio: "2026-09-28T01:00:00Z" })];
    expect(carrilTusPlanes(voy, interesan).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
  it("tiene el mismo tope que el carril estelar (12), aunque haya más planes", () => {
    expect(TOPE_ESTELAR).toBe(12);
    const voy = Array.from({ length: 8 }, (_, i) => evento(`voy${i}`, { inicio: new Date(ahora.getTime() + (i + 1) * 86400000).toISOString() }));
    const interesan = Array.from({ length: 8 }, (_, i) => evento(`interesa${i}`, { inicio: new Date(ahora.getTime() + (i + 20) * 86400000).toISOString() }));
    expect(carrilTusPlanes(voy, interesan)).toHaveLength(12);
  });
  it("sin nada en ninguna de las dos listas, no ofrece nada (el carril no existe)", () => expect(carrilTusPlanes([], [])).toEqual([]));
});

describe("Inicio: carril Populares", () => {
  it("exige el mínimo de Destacados (3 'Voy') y descarta lo que no llega", () => {
    expect(MINIMO_POPULARES).toBe(3);
    const vistos = new Set<string>();
    const r = carrilPopulares([evento("poco", { van: 2 }), evento("justo", { van: 3 })], vistos);
    expect(r.map((e) => e.id)).toEqual(["justo"]);
  });
  it("ordena de más a menos 'Voy'; a igualdad, el orden de siempre de la agenda", () => {
    const vistos = new Set<string>();
    const r = carrilPopulares([
      evento("bajo", { van: 4, inicio: "2026-09-24T01:00:00Z" }),
      evento("alto", { van: 20, inicio: "2026-09-25T01:00:00Z" }),
      evento("empate-b", { van: 4, titulo: "b", inicio: "2026-09-24T01:00:00Z" }),
    ], vistos);
    // "bajo" y "empate-b" empatan en van: desempata compararEventos por título ("b" antes que "bajo").
    expect(r.map((e) => e.id)).toEqual(["alto", "empate-b", "bajo"]);
  });
  it("no repite lo ya visto en un carril anterior (tus planes, estelar, esta semana)", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilPopulares([evento("ya-usado", { van: 50 }), evento("nuevo", { van: 10 })], vistos);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
  it("vacío si nada llega al mínimo (el carril, entonces, no se muestra)", () => {
    expect(carrilPopulares([evento("a", { van: 1 })], new Set())).toEqual([]);
  });
});

describe("Inicio: carril estelar (Seleccionados para ti)", () => {
  it("ordena por destacado, luego por 'Voy', luego por fecha", () => {
    const destacados = new Set(["d"]);
    const vistos = new Set<string>();
    const r = carrilEstelar([
      evento("a", { van: 20, inicio: "2026-09-24T01:00:00Z" }),
      evento("d", { van: 1, inicio: "2026-09-25T01:00:00Z" }),
      evento("b", { van: 20, titulo: "b", inicio: "2026-09-24T01:00:00Z" }),
    ], destacados, vistos);
    // "d" no es el que más va, pero es destacado: va primero; "a" y "b" empatan en van, desempata compararEventos.
    expect(r.map((e) => e.id)).toEqual(["d", "a", "b"]);
  });
  it("tiene tope de 12, aunque haya más favoritos", () => {
    const vistos = new Set<string>();
    const muchos = Array.from({ length: 20 }, (_, i) => evento(`e${i}`, { van: i }));
    expect(TOPE_ESTELAR).toBe(12);
    expect(carrilEstelar(muchos, new Set(), vistos)).toHaveLength(12);
  });
  it("no repite lo que ya usó otro carril", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilEstelar([evento("ya-usado"), evento("nuevo")], new Set(), vistos);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
  it("el título dice cuál de los dos es: con favoritos, 'Seleccionados para ti'; sin ellos, el respaldo 'Destacados'", () => {
    expect(tituloEstelar(true)).toBe("Seleccionados para ti");
    expect(tituloEstelar(false)).toBe("Destacados");
  });
});

describe("Inicio: carril Destacados (respaldo del estelar, sin sesión o sin favoritos)", () => {
  it("conserva el orden de la curaduría, sin recortar por fecha (puede incluir semanas siguientes)", () => {
    const vistos = new Set<string>();
    // Antes (carrilDestacadosEstaSemana) un evento así de lejano habría quedado fuera; ya no.
    const lejano = evento("lejano", { inicio: "2026-11-01T01:00:00Z", fin: "2026-11-01T03:00:00Z" });
    const cercano = evento("cercano", { inicio: "2026-09-24T01:00:00Z" });
    expect(carrilDestacados([lejano, cercano], vistos).map((e) => e.id)).toEqual(["lejano", "cercano"]);
  });
  it("tiene tope de 12", () => {
    const vistos = new Set<string>();
    const muchos = Array.from({ length: 20 }, (_, i) => evento(`d${i}`));
    expect(carrilDestacados(muchos, vistos)).toHaveLength(12);
  });
  it("no repite lo que ya usó otro carril", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilDestacados([evento("ya-usado"), evento("nuevo")], vistos);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
});

describe("Inicio: carril Esta semana (todos los próximos 7 días, tope 20)", () => {
  it("en orden de fecha, no de llegada", () => {
    const vistos = new Set<string>();
    const r = carrilEstaSemana([evento("b", { inicio: "2026-09-25T01:00:00Z" }), evento("a", { inicio: "2026-09-24T01:00:00Z" })], vistos, ahora);
    expect(r.map((e) => e.id)).toEqual(["a", "b"]);
  });
  it("sin mínimo: una sola tarjeta no vacía el carril (a diferencia de Populares o Nuevos eventos)", () => {
    const vistos = new Set<string>();
    expect(carrilEstaSemana([evento("sola")], vistos, ahora).map((e) => e.id)).toEqual(["sola"]);
  });
  it("no repite lo ya visto (por ejemplo, por Tus planes o el carril estelar)", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilEstaSemana([evento("ya-usado"), evento("nuevo", { inicio: "2026-09-25T01:00:00Z" })], vistos, ahora);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
  it("deja fuera lo de fuera de la ventana de 7 días", () => {
    const vistos = new Set<string>();
    const r = carrilEstaSemana([evento("dentro"), evento("fuera", { inicio: fechaFueraDeEstaSemana() })], vistos, ahora);
    expect(r.map((e) => e.id)).toEqual(["dentro"]);
  });
  it("tope de 20 tarjetas, aunque haya más en la semana", () => {
    expect(TOPE_ESTA_SEMANA).toBe(20);
    const vistos = new Set<string>();
    const muchos = Array.from({ length: 25 }, (_, i) => evento(`e${i}`, { inicio: new Date(ahora.getTime() + (i + 1) * 3600000).toISOString() }));
    expect(carrilEstaSemana(muchos, vistos, ahora)).toHaveLength(20);
  });
});

describe("Inicio: carril Nuevos eventos (publicado hace ≤7 días Y empieza después de Esta semana)", () => {
  it("un evento dentro de la ventana de Esta semana no cuenta como Nuevo, aunque se haya publicado hace poco", () => {
    const vistos = new Set<string>();
    const dentroDeEstaSemana = evento("dentro", { creado_en: ahora.toISOString(), inicio: "2026-09-25T01:00:00Z" });
    // Otros tres, todos fuera de la ventana: con "dentro" excluido, siguen llegando al mínimo de 3.
    const a = evento("a", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) });
    const b = evento("b", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) });
    const c = evento("c", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(3) });
    expect(carrilNuevos([dentroDeEstaSemana, a, b, c], vistos, ahora).map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
  });
  it("con al menos 3 candidatos: de lo más reciente a lo más viejo; a igual publicación, el orden de siempre de la agenda", () => {
    const vistos = new Set<string>();
    const r = carrilNuevos([
      evento("viejo", { creado_en: "2026-09-20T00:00:00Z", inicio: fechaFueraDeEstaSemana(3) }),
      evento("nuevo", { creado_en: "2026-09-22T00:00:00Z", inicio: fechaFueraDeEstaSemana(1) }),
      evento("empate", { creado_en: "2026-09-22T00:00:00Z", titulo: "aa", inicio: fechaFueraDeEstaSemana(2) }),
    ], vistos, ahora);
    // "nuevo" y "empate" empatan en publicación (22 sep): desempata compararEventos por fecha del evento (inicio).
    expect(r.map((e) => e.id)).toEqual(["nuevo", "empate", "viejo"]);
  });
  it("excluye lo publicado hace más de 7 días", () => {
    const vistos = new Set<string>();
    const dentroDe7 = evento("a", { creado_en: new Date(ahora.getTime() - 7 * 86400000).toISOString(), inicio: fechaFueraDeEstaSemana(1) });
    const fueraDe7 = evento("b", { creado_en: new Date(ahora.getTime() - 8 * 86400000).toISOString(), inicio: fechaFueraDeEstaSemana(2) });
    const otroDentro = evento("c", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(3) });
    // Con "b" descartado por antiguo, solo quedan 2 candidatos ("a", "c"): bajo el mínimo, el carril no se pinta.
    expect(carrilNuevos([dentroDe7, fueraDe7, otroDentro], vistos, ahora)).toEqual([]);
  });
  it("con menos de 3 candidatos no se pinta (ni con 1 ni con 2) — mismo umbral que Populares", () => {
    expect(MINIMO_NUEVOS).toBe(MINIMO_POPULARES);
    const uno = [evento("a", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) })];
    expect(carrilNuevos(uno, new Set(), ahora)).toEqual([]);
    const dos = [...uno, evento("b", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) })];
    expect(carrilNuevos(dos, new Set(), ahora)).toEqual([]);
  });
  it("un candidato descartado por no llegar al mínimo no toca el conjunto compartido (sigue disponible para Cercanos)", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilNuevos([evento("ya-usado", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) }), evento("solo", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) })], vistos, ahora);
    expect(r).toEqual([]);
    expect(vistos).toEqual(new Set(["ya-usado"]));
  });
  it("con el mínimo cumplido, sí extiende el conjunto compartido (no repite lo ya visto en un carril anterior)", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilNuevos([
      evento("ya-usado", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) }),
      evento("a", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) }),
      evento("b", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(3) }),
      evento("c", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(4) }),
    ], vistos, ahora);
    // Los tres empatan en publicación (mismo `ahora`): desempata compararEventos por fecha del evento, ascendente.
    expect(r.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(vistos).toEqual(new Set(["ya-usado", "a", "b", "c"]));
  });
});

function eventoAgenda(id: string, cambios: Partial<import("./agenda").EventoAgenda> = {}): import("./agenda").EventoAgenda {
  return { id, titulo: id, inicio: "2026-09-24T01:00:00Z", fin: "2026-09-24T03:00:00Z", imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, zona: "America/Mexico_City", lugar: null, creado_en: "2026-09-01T00:00:00Z", lat: null, lng: null, van: 0, ...cambios };
}

describe("Inicio: los carriles de una sola agenda (estelar, esta semana, populares, nuevos), sin repetirse", () => {
  it("con favoritos: el estelar es 'Seleccionados para ti'; 'Esta semana' se lleva lo que no siguió (aunque sea popular), Populares solo ve lo de otras semanas", () => {
    const seguido = eventoAgenda("favorito", { lugar_id: "lugar-1" }); // dentro de la semana (fecha por defecto)
    // Igual de popular que el de abajo, pero dentro de la semana: se lo lleva "Esta semana" antes de que Populares
    // tenga oportunidad — el mismo caso que demuestra el prototipo firmado con "Festival Independencia Cultural".
    const popularEstaSemana = eventoAgenda("popular-esta-semana", { van: 10 });
    const popularLejano = eventoAgenda("popular-lejano", { van: 10, inicio: "2026-10-25T01:00:00Z", fin: "2026-10-25T03:00:00Z" });
    const r = calcularCarrilesAgenda(agenda({ eventos: [seguido, popularEstaSemana, popularLejano], seguidos: ["lugar-1"] }), ahora);
    expect(r.titulo).toBe("Seleccionados para ti");
    expect(r.estelar.map((e) => e.id)).toEqual(["favorito"]);
    expect(r.estaSemana.map((e) => e.id)).toEqual(["popular-esta-semana"]);
    expect(r.populares.map((e) => e.id)).toEqual(["popular-lejano"]);
    expect(r.nuevos).toEqual([]);
    expect(r.vistos).toEqual(new Set(["favorito", "popular-esta-semana", "popular-lejano"]));
  });
  it("un evento que calificaría para varios carriles solo sale en el primero (estelar gana sobre esta semana, populares y nuevos)", () => {
    const e = eventoAgenda("el-mismo", { lugar_id: "lugar-1", van: 50, creado_en: ahora.toISOString() });
    const r = calcularCarrilesAgenda(agenda({ eventos: [e], seguidos: ["lugar-1"] }), ahora);
    expect(r.estelar.map((x) => x.id)).toEqual(["el-mismo"]);
    expect(r.estaSemana).toEqual([]);
    expect(r.populares).toEqual([]);
    expect(r.nuevos).toEqual([]);
  });
  it("sin favoritos (o sin sesión), el estelar cae al respaldo 'Destacados' — ya sin recorte de 7 días", () => {
    const destacado = eventoAgenda("destacado", { inicio: "2026-11-01T01:00:00Z", fin: "2026-11-01T03:00:00Z" });
    const r = calcularCarrilesAgenda(agenda({ eventos: [destacado], seguidos: null, destacados: [{ id: "destacado", motivo: "elegido", hasta: null, van: 0 }] }), ahora);
    expect(r.titulo).toBe("Destacados");
    expect(r.estelar.map((e) => e.id)).toEqual(["destacado"]);
    expect(r.estaSemana).toEqual([]);
  });
  it("'Tus planes' no le quita eventos a los carriles de descubrir: lo que ya está en tus planes sigue saliendo aquí (founder, OL-221)", () => {
    const enTusPlanes = eventoAgenda("en-tus-planes", { lugar_id: "lugar-1", van: 50 });
    expect(carrilTusPlanes([enTusPlanes], []).map((e) => e.id)).toEqual(["en-tus-planes"]);
    const r = calcularCarrilesAgenda(agenda({ eventos: [enTusPlanes], seguidos: ["lugar-1"] }), ahora);
    expect(r.estelar.map((e) => e.id)).toEqual(["en-tus-planes"]);
  });
});

describe("Inicio: idsUsadosEnAgenda", () => {
  it("solo lo que calculó de esta agenda (sin 'Tus planes', OL-221)", () => {
    const popular = eventoAgenda("popular", { van: 10, inicio: "2026-10-25T01:00:00Z", fin: "2026-10-25T03:00:00Z" });
    const ids = idsUsadosEnAgenda(agenda({ eventos: [popular] }), ahora);
    expect(new Set(ids)).toEqual(new Set(["popular"]));
  });
});

describe("Inicio: buscador único, orden de grupos", () => {
  it("desde Inicio o Agenda: eventos, lugares, artistas", () => {
    expect(ordenBusqueda("inicio")).toEqual(["eventos", "lugares", "artistas"]);
    expect(ordenBusqueda("agenda")).toEqual(["eventos", "lugares", "artistas"]);
  });
  it("desde Lugares: lugares primero", () => expect(ordenBusqueda("lugares")).toEqual(["lugares", "eventos", "artistas"]));
  it("desde Artistas: artistas primero", () => expect(ordenBusqueda("artistas")).toEqual(["artistas", "eventos", "lugares"]));
});

describe("Inicio: buscador único, cuántos por grupo", () => {
  it("la sección propia trae más (5) que las otras (3)", () => {
    expect(limiteBusqueda("lugares", "lugares")).toBe(5);
    expect(limiteBusqueda("lugares", "eventos")).toBe(3);
    expect(limiteBusqueda("lugares", "artistas")).toBe(3);
  });
  it("desde Inicio, sin sección propia, las tres van con el mismo tope corto", () => {
    expect(limiteBusqueda("inicio", "eventos")).toBe(3);
    expect(limiteBusqueda("inicio", "lugares")).toBe(3);
    expect(limiteBusqueda("inicio", "artistas")).toBe(3);
  });
});
