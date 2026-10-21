import { describe, expect, it } from "vitest";
import { validarArtista } from "../artistas";
import { entradaDeArtista } from "../propuestas";
import {
  armarConocidosArtistas,
  clavesDeNombre,
  datosDeArtista,
  disciplinaDeTexto,
  disciplinasQueFaltan,
  limpiarArtista,
  marcarPropuesto,
  motivoArtista,
} from "./nombresArtistas";

// Todo inventado.
describe("las formas de un nombre (OL-430)", () => {
  it("«&» es «y», y también sin la «y»", () => {
    expect(clavesDeNombre("Rosa & Luna")).toEqual(expect.arrayContaining(["rosa y luna", "rosa luna"]));
    expect(clavesDeNombre("Rosa y Luna")).toEqual(expect.arrayContaining(["rosa y luna", "rosa luna"]));
  });
  it("el nombre artístico entre comillas, solo y sin él", () => {
    for (const n of ['Ana "La Güera" Ruiz', "Ana «La Güera» Ruiz", "Ana “La Güera” Ruiz"]) expect(clavesDeNombre(n)).toEqual(expect.arrayContaining(["ana la guera ruiz", "la guera", "ana ruiz", "guera"]));
  });
  it("sin el artículo o la palabra de grupo del principio, si queda algo que distinga", () => {
    expect(clavesDeNombre("Los Tecolotes del Desierto")).toContain("tecolotes del desierto");
    expect(clavesDeNombre("Grupo Funk Sintético")).toContain("funk sintetico");
    expect(clavesDeNombre("La Ño")).toEqual(["la no"]);
  });
  it("sin etiquetas ni acentos ni mayúsculas", () => {
    expect(clavesDeNombre("Coro <i>Voces</i> del Altiplano")).toContain("coro voces del altiplano");
  });
});

describe("lo que ya se conoce", () => {
  const c = armarConocidosArtistas(
    [{ nombre: "Rosa y Luna" }, { nombre: "La Güera" }, { nombre: "Los Tecolotes" }],
    [
      { nombre: "Banda Rechazada", estado: "rechazada" },
      { nombre: "Ya Propuesto", estado: "propuesta" },
      { nombre: "Ya Aceptado", estado: "aceptada" },
    ],
  );
  it("lo que está en artistas, con sus variantes", () => {
    expect(motivoArtista("Rosa & Luna", c)).toBe("ya_existe");
    expect(motivoArtista('Ana "La Güera" Ruiz', c)).toBe("ya_existe");
    expect(motivoArtista("Tecolotes", c)).toBe("ya_existe");
  });
  it("lo propuesto o aceptado, y lo rechazado (que manda)", () => {
    expect(motivoArtista("ya propuesto", c)).toBe("ya_propuesto");
    expect(motivoArtista("Ya Aceptado", c)).toBe("ya_propuesto");
    expect(motivoArtista("La Banda Rechazada", c)).toBe("rechazado_antes");
    expect(motivoArtista("Alguien Nuevo", c)).toBeNull();
    marcarPropuesto("Alguien Nuevo", c);
    expect(motivoArtista("alguien nuevo", c)).toBe("ya_propuesto");
  });
  it("la lista para el modelo, sin repetir", () => {
    expect(c.lista).toEqual(["Rosa y Luna", "La Güera", "Los Tecolotes", "Banda Rechazada", "Ya Propuesto", "Ya Aceptado"]);
  });
});

describe("disciplina y limpieza", () => {
  it("la disciplina de la app a partir de como la escribe la fuente", () => {
    expect(["Música", "Artes plásticas", "Literatura", "Danza folclórica", "Teatro", "Audiovisual", "Circo", "Multidisciplinaria", "artes_visuales"].map(disciplinaDeTexto)).toEqual([
      "musica",
      "artes_visuales",
      "letras",
      "danza",
      "teatro",
      "cine",
      "circo",
      "otro",
      "artes_visuales",
    ]);
  });
  it("textos a sus topes (el detalle, 40 como la ficha), tipo deducido, enlaces seguros; sin nombre, nada", () => {
    const a = limpiarArtista({
      fuente: "padrones",
      nombreFuente: "Padrones y estímulos",
      nombre: "  Colectivo   Barro <b>Vivo</b> ",
      disciplina: "inventada",
      detalle: "Cerámica de alta temperatura y escultura en barro negro de la región",
      tipo: "banda",
      municipio: "San Luis Potosí",
      redes: ["instagram.com/barrovivo", "javascript:alert(1)", "https://barrovivo.example/"],
      url: "https://cultura.slp.gob.mx/pecda",
      obra: "Expone piezas de barro en galerías del estado.",
    })!;
    expect(a).toMatchObject({ nombre: "Colectivo Barro Vivo", disciplina: "otro", tipo: "colectivo", municipio: "San Luis Potosí", url: "https://cultura.slp.gob.mx/pecda" });
    expect(a.detalle!.length).toBeLessThanOrEqual(40);
    expect(a.redes).toEqual(["https://instagram.com/barrovivo", "https://barrovivo.example/"]);
    expect(limpiarArtista({ fuente: "web", nombreFuente: "x", nombre: "  " })).toBeNull();
  });
  it("`datos` con el contrato de la bandeja; aceptarlo pasa la validación del alta de artista", () => {
    const a = limpiarArtista({ fuente: "web", nombreFuente: "Búsqueda web", nombre: "Trío Huasteco del Centro", disciplina: "musica", detalle: "Son huasteco", tipo: "grupo", municipio: null, redes: [], url: "https://noticias.example/trio", obra: null })!;
    const datos = datosDeArtista(a, "San Luis Potosí", "2026-10-21T16:00:00.000Z");
    expect(datos).toEqual({ nombre: "Trío Huasteco del Centro", disciplina: "musica", tipo: "grupo", ciudad: "San Luis Potosí", redes: [], leida: "2026-10-21T16:00:00.000Z", detalle: "Son huasteco", url: "https://noticias.example/trio" });
    const { errores, datos: ficha } = validarArtista(entradaDeArtista({ datos }, "San Luis Potosí"), { esAdmin: true });
    expect(errores).toEqual({});
    expect(ficha).toMatchObject({ nombre: "Trío Huasteco del Centro", disciplina: "musica", detalle: "Son huasteco", tipo: "grupo", ciudad: "San Luis Potosí" });
  });
  it("las dos disciplinas que más faltan en la ciudad (para la búsqueda web)", () => {
    expect(disciplinasQueFaltan([])).toEqual(["musica", "artes_visuales"]);
    expect(disciplinasQueFaltan(["musica", "musica", "artes_visuales", "teatro", "danza", "otro"])).toEqual(["letras", "cine"]);
  });
});
