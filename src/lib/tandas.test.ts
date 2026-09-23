import { describe, expect, it } from "vitest";
import { siguienteTanda, tandaAcotada, tandaInicial, TANDA_INICIAL, TANDA_SIGUIENTE } from "./tandas";

describe("tandaInicial", () => {
  it("muestra la tanda entera cuando el total la supera", () => {
    expect(tandaInicial(100)).toEqual({ mostrados: TANDA_INICIAL, hayMas: true });
  });
  it("muestra todo, sin sobrar, cuando el total cabe en la tanda", () => {
    expect(tandaInicial(5)).toEqual({ mostrados: 5, hayMas: false });
    expect(tandaInicial(TANDA_INICIAL)).toEqual({ mostrados: TANDA_INICIAL, hayMas: false });
  });
  it("una lista vacía no muestra nada y no pide más", () => {
    expect(tandaInicial(0)).toEqual({ mostrados: 0, hayMas: false });
  });
  it("acepta un tamaño de tanda propio", () => {
    expect(tandaInicial(30, 10)).toEqual({ mostrados: 10, hayMas: true });
  });
});

describe("siguienteTanda", () => {
  it("suma una tanda más sin pasarse del total", () => {
    expect(siguienteTanda(45, 20)).toEqual({ mostrados: 40, hayMas: true });
    expect(siguienteTanda(45, 40)).toEqual({ mostrados: 45, hayMas: false });
  });
  it("ya no hay más cuando la tanda alcanza justo el total", () => {
    expect(siguienteTanda(40, 20, 20)).toEqual({ mostrados: 40, hayMas: false });
  });
  it("no revienta con menos mostrados que cero", () => {
    expect(siguienteTanda(10, -5, 20)).toEqual({ mostrados: 10, hayMas: false });
  });
});

describe("tandaAcotada", () => {
  it("conserva lo que ya se había mostrado (memoria de pantalla) sin pasarse del total", () => {
    expect(tandaAcotada(100, 60)).toEqual({ mostrados: 60, hayMas: true });
  });
  it("nunca muestra menos que la tanda inicial, aunque lo guardado sea menor", () => {
    expect(tandaAcotada(100, 5)).toEqual({ mostrados: TANDA_INICIAL, hayMas: true });
  });
  it("nunca muestra más que el total (la lista se hizo más chica, p. ej. otro filtro)", () => {
    expect(tandaAcotada(10, 60)).toEqual({ mostrados: 10, hayMas: false });
  });
  it("acepta un tamaño de tanda propio, igual que las otras dos", () => {
    expect(tandaAcotada(50, 3, TANDA_SIGUIENTE)).toEqual({ mostrados: TANDA_SIGUIENTE, hayMas: true });
  });
});
