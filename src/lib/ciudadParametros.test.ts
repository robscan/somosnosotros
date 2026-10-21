import { describe, expect, it } from "vitest";
import { leerParametrosCiudad, nombraAlcaldia, SIN_PARAMETROS } from "./ciudadParametros";

describe("los parámetros de una ciudad (OL-429)", () => {
  it("el ejemplo de Ciudad de México se lee entero", () => {
    const p = leerParametrosCiudad({
      alcaldias: ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez", "Álvaro Obregón"],
      radio_km: 12,
      guias: [
        { nombre: "Cartelera de la Secretaría de Cultura de la Ciudad de México", url: "https://cartelera.cdmx.gob.mx/" },
        { nombre: "Time Out México", url: "https://www.timeoutmexico.mx/ciudad-de-mexico" },
      ],
    });
    expect(p.alcaldias).toHaveLength(5);
    expect(p.radio_km).toBe(12);
    expect(p.guias.map((g) => g.url)).toEqual(["https://cartelera.cdmx.gob.mx/", "https://www.timeoutmexico.mx/ciudad-de-mexico"]);
  });

  it("vacío o con basura: sin parámetros (la ciudad se comporta como antes); lo que no se entiende se ignora", () => {
    expect(leerParametrosCiudad(undefined)).toEqual(SIN_PARAMETROS);
    expect(leerParametrosCiudad([])).toEqual(SIN_PARAMETROS);
    const p = leerParametrosCiudad({
      alcaldias: ["Coyoacán", "Coyoacán", "", 7, "x"],
      radio_km: 500,
      guias: [{ nombre: "Sin enlace" }, { nombre: "Peligro", url: "javascript:alert(1)" }, { nombre: "Buena", url: "https://guia.example/" }, { nombre: "Repetida", url: "https://guia.example/" }],
    });
    expect(p).toEqual({ alcaldias: ["Coyoacán"], radio_km: null, guias: [{ nombre: "Buena", url: "https://guia.example/" }] });
    expect(leerParametrosCiudad({ radio_km: "8" }).radio_km).toBe(8);
  });

  it("nombraAlcaldia: por palabras enteras, sin acentos ni mayúsculas", () => {
    const alc = ["Cuauhtémoc", "Benito Juárez"];
    expect(nombraAlcaldia(["Av. Reforma 50, Col. Juárez, CUAUHTEMOC, 06600 CDMX"], alc)).toBe(true);
    expect(nombraAlcaldia([null, "Benito Juárez"], alc)).toBe(true);
    expect(nombraAlcaldia(["Tlalpan", "Calle Juárez 3"], alc)).toBe(false);
    expect(nombraAlcaldia([], alc)).toBe(false);
  });
});
