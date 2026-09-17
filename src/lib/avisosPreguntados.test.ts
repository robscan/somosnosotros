import { describe, expect, it } from "vitest";
import { hayQuePreguntar, marcarAvisosContestados } from "./avisosPreguntados";

describe("la pregunta de avisos", () => {
  it("sale una vez por cuenta, aunque la página traiga el dato viejo, y otra cuenta en la misma pestaña sí la ve", () => {
    expect(hayQuePreguntar("ana", false)).toBe(true);
    expect(hayQuePreguntar("ana", true)).toBe(false);

    marcarAvisosContestados("ana");
    expect(hayQuePreguntar("ana", false)).toBe(false); // la página de antes de contestar

    // Ana cierra sesión y Beto entra con código sin recargar.
    expect(hayQuePreguntar("beto", false)).toBe(true);
    expect(hayQuePreguntar("beto", true)).toBe(false);

    marcarAvisosContestados("beto");
    expect(hayQuePreguntar("beto", false)).toBe(false);
    // Y si vuelve Ana, lo que manda es su base: ya contestó.
    expect(hayQuePreguntar("ana", true)).toBe(false);
  });

  it("sin cuenta no se marca nada", () => {
    marcarAvisosContestados("");
    expect(hayQuePreguntar("", false)).toBe(true);
  });
});
