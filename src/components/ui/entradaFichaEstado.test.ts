import { describe, expect, it } from "vitest";
import { debePasarAQuieta, estadoInicial } from "./entradaFichaEstado";

describe("estadoInicial", () => {
  it("sin reducir movimiento, nace cerrada (para animar la entrada)", () => {
    expect(estadoInicial(false)).toBe("cerrada");
  });

  it("con reducir movimiento, nace quieta y nunca lleva transform", () => {
    expect(estadoInicial(true)).toBe("quieta");
  });
});

describe("debePasarAQuieta", () => {
  it("desde cerrada, sí (nunca debería quedarse así)", () => {
    expect(debePasarAQuieta("cerrada")).toBe(true);
  });

  it("desde abierta (transitionend o el tope de 400 ms), sí: hay que soltar el transform", () => {
    expect(debePasarAQuieta("abierta")).toBe(true);
  });

  it("ya quieta, no hay nada que hacer", () => {
    expect(debePasarAQuieta("quieta")).toBe(false);
  });
});
