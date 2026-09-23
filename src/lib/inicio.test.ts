import { describe, expect, it } from "vitest";
import { calcularCarrilesAgenda, carrilEstelar, carrilNuevos, carrilPopulares, eventosEstaSemana, limiteBusqueda, MINIMO_POPULARES, ordenBusqueda, sinRepetidos, TOPE_ESTELAR, tituloEstelar } from "./inicio";
import type { Agenda } from "./cargarAgenda";

const ahora = new Date("2026-09-23T18:00:00Z");
function evento(id: string, cambios: Partial<{ inicio: string; fin: string; van: number; titulo: string; creado_en: string }> = {}) {
  return { id, titulo: id, inicio: "2026-09-24T01:00:00Z", fin: "2026-09-24T03:00:00Z", van: 0, creado_en: "2026-09-01T00:00:00Z", ...cambios };
}
function agenda(cambios: Partial<Agenda> = {}): Agenda {
  return { eventos: [], seguidos: [], eventosSeguidos: [], asistencias: {}, destacados: [], ...cambios };
}

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
  it("no repite lo ya visto en un carril anterior (favoritos o destacados)", () => {
    const vistos = new Set(["ya-en-destacados"]);
    const r = carrilPopulares([evento("ya-en-destacados", { van: 50 }), evento("nuevo", { van: 10 })], vistos);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
  it("vacío si nada llega al mínimo (el carril, entonces, no se muestra)", () => {
    expect(carrilPopulares([evento("a", { van: 1 })], new Set())).toEqual([]);
  });
});

describe("Inicio: carril estelar (De tus favoritos / Destacados esta semana)", () => {
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
  it("el título dice cuál de los dos es: con favoritos, 'De tus favoritos'; sin ellos, el respaldo", () => {
    expect(tituloEstelar(true)).toBe("De tus favoritos");
    expect(tituloEstelar(false)).toBe("Destacados esta semana");
  });
});

describe("Inicio: carril Nuevos esta semana (publicado en los últimos 7 días)", () => {
  it("incluye lo publicado hace 7 días exactos, excluye lo de hace 8", () => {
    const dentroDe7 = evento("a", { creado_en: new Date(ahora.getTime() - 7 * 86400000).toISOString() });
    const fueraDe7 = evento("b", { creado_en: new Date(ahora.getTime() - 8 * 86400000).toISOString() });
    expect(carrilNuevos([dentroDe7, fueraDe7], new Set(), ahora).map((e) => e.id)).toEqual(["a"]);
  });
  it("de lo más reciente a lo más viejo; a igual publicación, el orden de siempre de la agenda", () => {
    const r = carrilNuevos([
      evento("viejo", { creado_en: "2026-09-20T00:00:00Z", inicio: "2026-09-24T01:00:00Z" }),
      evento("nuevo", { creado_en: "2026-09-22T00:00:00Z", inicio: "2026-09-25T01:00:00Z" }),
      evento("empate", { creado_en: "2026-09-22T00:00:00Z", titulo: "aa", inicio: "2026-09-24T01:00:00Z" }),
    ], new Set(), ahora);
    expect(r.map((e) => e.id)).toEqual(["empate", "nuevo", "viejo"]);
  });
  it("no repite lo ya visto en un carril anterior", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilNuevos([evento("ya-usado", { creado_en: ahora.toISOString() }), evento("nuevo", { creado_en: ahora.toISOString() })], vistos, ahora);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
});

function eventoAgenda(id: string, cambios: Partial<import("./agenda").EventoAgenda> = {}): import("./agenda").EventoAgenda {
  return { id, titulo: id, inicio: "2026-09-24T01:00:00Z", fin: "2026-09-24T03:00:00Z", imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, zona: "America/Mexico_City", lugar: null, creado_en: "2026-09-01T00:00:00Z", lat: null, lng: null, van: 0, ...cambios };
}

describe("Inicio: los tres carriles de una sola agenda (estelar, populares, nuevos), sin repetirse", () => {
  it("con favoritos: el estelar es 'De tus favoritos' y los otros dos no repiten lo que ya usó", () => {
    const seguido = eventoAgenda("favorito", { lugar_id: "lugar-1" });
    const popular = eventoAgenda("popular", { van: 10 });
    const r = calcularCarrilesAgenda(agenda({ eventos: [seguido, popular], seguidos: ["lugar-1"] }), ahora);
    expect(r.titulo).toBe("De tus favoritos");
    expect(r.estelar.map((e) => e.id)).toEqual(["favorito"]);
    expect(r.populares.map((e) => e.id)).toEqual(["popular"]);
    expect(r.nuevos).toEqual([]);
    expect(r.vistos).toEqual(new Set(["favorito", "popular"]));
  });
  it("un evento que calificaría para dos carriles solo sale en el primero (estelar gana sobre populares y nuevos)", () => {
    const e = eventoAgenda("el-mismo", { lugar_id: "lugar-1", van: 50, creado_en: ahora.toISOString() });
    const r = calcularCarrilesAgenda(agenda({ eventos: [e], seguidos: ["lugar-1"] }), ahora);
    expect(r.estelar.map((x) => x.id)).toEqual(["el-mismo"]);
    expect(r.populares).toEqual([]);
    expect(r.nuevos).toEqual([]);
  });
  it("sin favoritos (o sin sesión), el estelar cae al respaldo de destacados de esta semana", () => {
    const destacado = eventoAgenda("destacado");
    const r = calcularCarrilesAgenda(agenda({ eventos: [destacado], seguidos: null, destacados: [{ id: "destacado", motivo: "elegido", hasta: null, van: 0 }] }), ahora);
    expect(r.titulo).toBe("Destacados esta semana");
    expect(r.estelar.map((e) => e.id)).toEqual(["destacado"]);
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
