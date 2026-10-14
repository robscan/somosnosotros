import { describe, expect, it } from "vitest";
import { posicionMenu } from "./MenuOpciones";

describe("posicionMenu (OL-400: el menú del orden nunca bajo la navegación)", () => {
  const boton = { top: 520, bottom: 564, right: 370 };
  it("debajo del botón, alineado a su borde derecho, si cabe antes de la navegación", () => {
    expect(posicionMenu(boton, 160, 390, 844, 760)).toEqual({ right: 20, top: 568 });
  });
  it("encima del botón si debajo lo taparía la navegación (la hoja recogida, junto a la barra)", () => {
    expect(posicionMenu({ top: 700, bottom: 744, right: 370 }, 160, 390, 844, 760)).toEqual({ right: 20, bottom: 148 });
  });
  it("si tampoco cabe encima, debajo", () => {
    expect(posicionMenu({ top: 100, bottom: 144, right: 370 }, 700, 390, 844, 760)).toEqual({ right: 20, top: 148 });
  });
});
