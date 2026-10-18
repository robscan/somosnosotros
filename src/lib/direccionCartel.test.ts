import { describe, expect, it } from "vitest";
import { mismaDireccion, partirDireccion, unicoConDireccion } from "./direccionCartel";

// OL-413: el lugar se reconoce por su dirección cuando el cartel no dice su nombre.
describe("la calle y el número de una dirección", () => {
  it("el cartel de Trayectos y la dirección del Laboratorio Centro Histórico dan la misma calle y el mismo número", () => {
    expect(partirDireccion("5 de mayo 1100")).toEqual({ calle: "5 de mayo", numero: "1100" });
    expect(partirDireccion("C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico")).toEqual({ calle: "5 de mayo", numero: "1100" });
    expect(partirDireccion("5 de mayo 1100 . Centro Histórico San Luis Potosí, México")).toEqual({ calle: "5 de mayo", numero: "1100" });
  });

  it("sin «Calle», «Av.», «No.» ni «#»; con letra o interior vale el número", () => {
    expect(partirDireccion("Calle Hermenegildo Galeana 423")).toEqual({ calle: "hermenegildo galeana", numero: "423" });
    expect(partirDireccion("Av. Manuel Nava No. 101, Zona Universitaria")).toEqual({ calle: "manuel nava", numero: "101" });
    expect(partirDireccion("Graciano Sánchez #220-A, Centro")).toEqual({ calle: "graciano sanchez", numero: "220" });
    expect(partirDireccion("Avenida 20 de Noviembre 300")).toEqual({ calle: "20 de noviembre", numero: "300" });
    expect(partirDireccion("Plaza 16 de Septiembre 5")).toEqual({ calle: "plaza 16 de septiembre", numero: "5" });
  });

  it("sin número tras la calle, o sin calle, no hay nada que comparar", () => {
    expect(partirDireccion("Manuel José Othón s/n esq. Chico Sein, Centro Histórico")).toBeNull();
    expect(partirDireccion("Centro Histórico")).toBeNull();
    expect(partirDireccion("1100")).toBeNull();
    expect(partirDireccion("")).toBeNull();
    expect(partirDireccion(null)).toBeNull();
  });
});

describe("¿la misma dirección?", () => {
  it("«5 de mayo 1100» es «C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico»", () => {
    expect(mismaDireccion("5 de mayo 1100", "C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico")).toBe(true);
    expect(mismaDireccion("5 de mayo 1100, Centro Histórico, San Luis Potosí, México", "C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico")).toBe(true);
  });

  it("otro número de la misma calle no es el mismo sitio (la Casa de Cultura de San Miguelito está en el 1225)", () => {
    expect(mismaDireccion("5 de mayo 1100", "5 de Mayo 1225, Barrio de San Miguelito, 78339, San Luis Potosí, S.L.P.")).toBe(false);
  });

  it("el mismo número en otra calle tampoco", () => {
    expect(mismaDireccion("5 de mayo 1100", "20 de Noviembre 1100")).toBe(false);
  });

  it("una calle escrita corta cabe en la larga", () => {
    expect(mismaDireccion("Galeana 423", "Calle Hermenegildo Galeana 423")).toBe(true);
  });
});

describe("el único lugar con esa dirección", () => {
  const LAB = { id: "lab", nombre: "Laboratorio Centro Histórico", direccion: "C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico" };
  const CASA = { id: "casa", nombre: "Casa de Cultura del Barrio de San Miguelito", direccion: "5 de Mayo 1225, Barrio de San Miguelito, 78339" };

  it("con uno solo, ese", () => {
    expect(unicoConDireccion("5 de mayo 1100 . Centro Histórico San Luis Potosí, México", [CASA, LAB])).toBe(LAB);
  });

  it("con dos iguales, ninguno: se pregunta", () => {
    expect(unicoConDireccion("5 de mayo 1100", [LAB, { ...LAB, id: "otro" }])).toBeNull();
  });

  it("sin ninguno, o sin dirección leída, ninguno", () => {
    expect(unicoConDireccion("5 de mayo 1100", [CASA])).toBeNull();
    expect(unicoConDireccion("", [LAB])).toBeNull();
  });
});
