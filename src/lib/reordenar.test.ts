import { describe, expect, it } from "vitest";
import { indiceDestino, mover } from "./reordenar";

describe("mover", () => {
  it("mueve un elemento de un puesto a otro, adelante y atrás", () => {
    expect(mover(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(mover(["a", "b", "c", "d"], 2, 0)).toEqual(["c", "a", "b", "d"]);
  });
  it("mover al mismo puesto no cambia el orden (pero sigue devolviendo una copia)", () => {
    const lista = ["a", "b", "c"];
    const resultado = mover(lista, 1, 1);
    expect(resultado).toEqual(["a", "b", "c"]);
    expect(resultado).not.toBe(lista);
  });
  it("no muta la lista original", () => {
    const lista = ["a", "b", "c"];
    mover(lista, 0, 2);
    expect(lista).toEqual(["a", "b", "c"]);
  });
  it("primer renglón al último puesto y viceversa", () => {
    expect(mover(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(mover(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
  it("una lista de un solo elemento no tiene a dónde moverse", () => {
    expect(mover(["a"], 0, 0)).toEqual(["a"]);
  });
  it("índices fuera de rango devuelven una copia sin cambios, sin lanzar", () => {
    expect(mover(["a", "b"], -1, 1)).toEqual(["a", "b"]);
    expect(mover(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(mover([], 0, 0)).toEqual([]);
  });
  it("funciona con objetos, conservando la identidad de cada uno", () => {
    const enlaces = [{ url: "a" }, { url: "b" }, { url: "c" }];
    const resultado = mover(enlaces, 2, 0);
    expect(resultado.map((e) => e.url)).toEqual(["c", "a", "b"]);
    expect(resultado[0]).toBe(enlaces[2]);
  });
});

describe("indiceDestino", () => {
  it("desplazamiento cero se queda en el mismo puesto", () => {
    expect(indiceDestino(0, 1, 60, 4)).toBe(1);
  });
  it("redondea al renglón más cercano, hacia abajo y hacia arriba", () => {
    expect(indiceDestino(60, 0, 60, 4)).toBe(1);
    expect(indiceDestino(-60, 2, 60, 4)).toBe(1);
    expect(indiceDestino(35, 0, 60, 4)).toBe(1); // más de medio renglón: redondea al siguiente
    expect(indiceDestino(25, 0, 60, 4)).toBe(0); // menos de medio renglón: se queda
  });
  it("no rebasa el primer renglón aunque el desplazamiento sea muy negativo", () => {
    expect(indiceDestino(-1000, 0, 60, 4)).toBe(0);
    expect(indiceDestino(-1000, 2, 60, 4)).toBe(0);
  });
  it("no rebasa el último renglón aunque el desplazamiento sea muy grande", () => {
    expect(indiceDestino(1000, 3, 60, 4)).toBe(3);
    expect(indiceDestino(1000, 0, 60, 4)).toBe(3);
  });
  it("con un solo enlace no hay a dónde ir: siempre el puesto 0", () => {
    expect(indiceDestino(500, 0, 60, 1)).toBe(0);
    expect(indiceDestino(-500, 0, 60, 1)).toBe(0);
  });
  it("un alto de renglón inválido (cero, negativo) no rompe: se queda en el índice de partida, recortado", () => {
    expect(indiceDestino(100, 1, 0, 4)).toBe(1);
    expect(indiceDestino(100, 1, -10, 4)).toBe(1);
    expect(indiceDestino(100, 9, 0, 4)).toBe(3);
  });
  it("un paso de teclado es un desplazamiento de exactamente un altoRenglon", () => {
    expect(indiceDestino(60, 1, 60, 4)).toBe(2); // flecha abajo
    expect(indiceDestino(-60, 1, 60, 4)).toBe(0); // flecha arriba
  });
});
