import { describe, expect, it } from "vitest";
import { asistenciaTras, claveSeguir, claveVoy, huboArrastre, recortar, textoHecho } from "./deslizar";

describe("deslizar", () => {
  it("el botón único del evento: 'Voy' invita (también desde Me interesa), decidido lo quita", () => {
    expect(claveVoy(null)).toBe("voy");
    expect(claveVoy("me_interesa")).toBe("voy"); // Me interesa ya no tiene botón propio: el de la fila siempre invita a Voy.
    expect(claveVoy("voy")).toBe("no_voy");
    // Voy deja el evento en "voy"; No voy lo deja sin decisión.
    expect(asistenciaTras(claveVoy(null))).toBe("voy");
    expect(asistenciaTras(claveVoy("voy"))).toBe(null);
  });
  it("el botón único de lugar o artista: 'Seguir' invita, decidido lo quita", () => {
    expect(claveSeguir(false)).toBe("seguir");
    expect(claveSeguir(true)).toBe("dejar_de_seguir");
  });
  it("huboArrastre: cancela un toque que se movió más que la zona muerta, en cualquier dirección (carril de Destacados, L45, OL-094)", () => {
    expect(huboArrastre(0, 0)).toBe(false);
    expect(huboArrastre(4, 3)).toBe(false); // hypot 5, dentro de la zona muerta
    expect(huboArrastre(-15, 0)).toBe(true); // recorrer el carril
    expect(huboArrastre(0, 12)).toBe(true);
    expect(huboArrastre(3, 3, 2)).toBe(true); // umbral propio, para quien lo necesite
  });
  it("el aviso nombra lo que se hizo, con el nombre recortado", () => {
    expect(textoHecho("voy", "Huapangueada sobre rieles")).toBe("Vas a «Huapangueada sobre rieles»");
    expect(textoHecho("no_voy", "Huapangueada sobre rieles")).toBe("Ya no vas a «Huapangueada sobre rieles»");
    expect(textoHecho("me_interesa", "Gala de arias de las óperas de Julián Carrillo")).toBe("Te interesa «Gala de arias de las óperas de Julián C…»");
    expect(textoHecho("quitar_interes", "Huapangueada sobre rieles")).toBe("Ya no te interesa «Huapangueada sobre rieles»");
    expect(textoHecho("seguir", "Teatro de la Paz", "lugar")).toBe("Sigues Teatro de la Paz");
    expect(textoHecho("dejar_de_seguir", "Abril Merlot", "artista")).toBe("Ya no sigues a Abril Merlot");
    expect(recortar("  dos   espacios  ")).toBe("dos espacios");
  });
});
