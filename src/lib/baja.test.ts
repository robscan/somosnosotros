import { describe, expect, it } from "vitest";
import { firmarBaja, urlBaja, verificarBaja } from "./baja";

const ID = "629499a0-8e08-4992-9097-078fb0cb526c";
const LLAVE = "llave-de-prueba";

describe("baja de avisos", () => {
  it("firma y verifica el token de una persona", () => {
    const token = firmarBaja(ID, LLAVE);
    expect(verificarBaja(token, LLAVE)).toBe(ID);
    expect(urlBaja(ID, LLAVE)).toBe(`https://somosnosotros.org/avisos/baja?t=${token}`);
  });
  it("rechaza tokens alterados, de otra llave o vacíos", () => {
    const token = firmarBaja(ID, LLAVE);
    expect(verificarBaja(token.slice(0, -1) + "0", LLAVE)).toBeNull();
    expect(verificarBaja(token, "otra-llave")).toBeNull();
    expect(verificarBaja(`${ID}.corto`, LLAVE)).toBeNull();
    expect(verificarBaja("", LLAVE)).toBeNull();
    expect(verificarBaja(token, "")).toBeNull();
  });
});
