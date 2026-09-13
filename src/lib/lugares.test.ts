import { describe, expect, it } from "vitest";
import { enlaceRed, filtrarLugares, normalizarNombre, validarLugar } from "./lugares";

describe("normalizarNombre", () => {
  it("quita acentos, mayúsculas y signos", () => {
    expect(normalizarNombre("  Casa de Cultura  #3 — Potosí ")).toBe("casa de cultura 3 potosi");
  });
});

describe("filtrarLugares", () => {
  const lugares = [
    { nombre: "Teatro de la Paz", direccion: "Villerías 2" },
    { nombre: "Galería Ángel", direccion: null },
  ];
  it("busca sin acentos y a medias", () => {
    expect(filtrarLugares(lugares, "angel").map((l) => l.nombre)).toEqual(["Galería Ángel"]);
    expect(filtrarLugares(lugares, "VILLER").map((l) => l.nombre)).toEqual(["Teatro de la Paz"]);
    expect(filtrarLugares(lugares, "")).toHaveLength(2);
  });
});

describe("enlaceRed", () => {
  it("arma enlaces desde usuario, @usuario, número o enlace completo", () => {
    expect(enlaceRed("instagram", "@casadelacultura")).toBe("https://instagram.com/casadelacultura");
    expect(enlaceRed("facebook", "https://facebook.com/x")).toBe("https://facebook.com/x");
    expect(enlaceRed("whatsapp", "444 123 4567")).toBe("https://wa.me/524441234567");
    expect(enlaceRed("whatsapp", "+52 444 123 4567")).toBe("https://wa.me/524441234567");
    expect(enlaceRed("sitio", "ejemplo.org")).toBe("https://ejemplo.org");
    expect(enlaceRed("sitio", "")).toBeNull();
  });
});

describe("validarLugar", () => {
  const base = { nombre: "Foro X", tipo: "foro", direccion: "Calle 1", lat: "22.15", lng: "-100.97", descripcion: "", portada: "" };
  it("acepta un lugar mínimo y limpia", () => {
    const { datos, errores } = validarLugar({ ...base, instagram: " @forox " });
    expect(errores).toEqual({});
    expect(datos.lat).toBeCloseTo(22.15);
    expect(datos.redes).toEqual({ instagram: "@forox" });
    expect(datos.portada).toBeNull();
  });
  it("exige nombre, tipo válido y ubicación", () => {
    const { errores } = validarLugar({ ...base, nombre: "", tipo: "bar", lat: "0", lng: "0" });
    expect(errores.nombre).toBeTruthy();
    expect(errores.tipo).toBeTruthy();
    expect(errores.ubicacion).toBeTruthy();
  });
  it("revisa el WhatsApp", () => {
    expect(validarLugar({ ...base, whatsapp: "123" }).errores.whatsapp).toBeTruthy();
    expect(validarLugar({ ...base, whatsapp: "4441234567" }).errores.whatsapp).toBeUndefined();
  });
});
