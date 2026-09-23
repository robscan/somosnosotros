import { describe, expect, it } from "vitest";
import { carrilPopulares, eventosEstaSemana, limiteBusqueda, MINIMO_POPULARES, ordenBusqueda, sinRepetidos } from "./inicio";

const ahora = new Date("2026-09-23T18:00:00Z");
function evento(id: string, cambios: Partial<{ inicio: string; fin: string; van: number; titulo: string }> = {}) {
  return { id, titulo: id, inicio: "2026-09-24T01:00:00Z", fin: "2026-09-24T03:00:00Z", van: 0, ...cambios };
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
