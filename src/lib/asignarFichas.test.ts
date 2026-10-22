import { describe, expect, it } from "vitest";
import {
  avisoCompartida,
  esTipoAsignable,
  hrefFicha,
  lineaQueEs,
  lineaQuienLaLleva,
  nombrePersona,
  ordenarAdministradas,
  queEs,
  textoAsignar,
  textoCodigoAsignar,
  textoCodigoQuitar,
} from "./asignarFichas";

describe("asignar fichas (OL-447)", () => {
  it("solo lugares y artistas se asignan", () => {
    expect(esTipoAsignable("lugar")).toBe(true);
    expect(esTipoAsignable("artista")).toBe(true);
    expect(esTipoAsignable("evento")).toBe(false);
    expect(esTipoAsignable(undefined)).toBe(false);
  });

  it("dice qué es la ficha con las etiquetas de la app", () => {
    expect(queEs({ tipo: "lugar", clase: "galeria", detalle: null })).toBe("Galería");
    expect(queEs({ tipo: "lugar", clase: "otro", detalle: "Cafetería" })).toBe("Otro · Cafetería");
    expect(queEs({ tipo: "artista", clase: "musica", detalle: "Acordeón" })).toBe("Música · Acordeón");
    expect(queEs({ tipo: "artista", clase: "por_completar", detalle: null })).toBe("Disciplina por completar");
    expect(lineaQueEs({ tipo: "lugar", clase: "galeria", detalle: null, ciudad: "Oaxaca" })).toBe("Lugar · Galería · Oaxaca");
    expect(lineaQueEs({ tipo: "artista", clase: "musica", detalle: null, ciudad: null })).toBe("Artista · Música");
  });

  it("dice quién administra ya la ficha", () => {
    expect(lineaQuienLaLleva({ suya: false, otros: null, otros_n: 0 }, "Ana")).toBe("Nadie la administra");
    expect(lineaQuienLaLleva({ suya: false, otros: "Bea", otros_n: 1 }, "Ana")).toBe("La administra Bea");
    expect(lineaQuienLaLleva({ suya: false, otros: "Bea", otros_n: 3 }, "Ana")).toBe("La administran Bea y 2 más");
    expect(lineaQuienLaLleva({ suya: false, otros: "", otros_n: 1 }, "Ana")).toBe("La administra una cuenta sin nombre");
    expect(lineaQuienLaLleva({ suya: true, otros: "Bea", otros_n: 1 }, "Ana")).toBe("Ya la administra Ana");
  });

  it("al elegir una ficha compartida, avisa que asignar agrega y no reemplaza", () => {
    expect(avisoCompartida({ otros_n: 0 })).toBeNull();
    expect(avisoCompartida({ otros_n: 1 })).toBe("No se la quitamos a quien ya la administra: las dos cuentas podrán editarla.");
    expect(avisoCompartida({ otros_n: 2 })).toBe("No se la quitamos a quienes ya la administran: todas las cuentas podrán editarla.");
  });

  it("el botón dice lo que va a pasar y la persona sin nombre es «esta persona»", () => {
    expect(textoAsignar("Foro Lunaria", "Ana")).toBe("Asignar Foro Lunaria a Ana");
    expect(nombrePersona("  ")).toBe("esta persona");
    expect(nombrePersona(null)).toBe("esta persona");
    expect(nombrePersona("Ana")).toBe("Ana");
  });

  it("lee los códigos de la base en palabras", () => {
    expect(textoCodigoAsignar("ok")).toBeNull();
    expect(textoCodigoAsignar("no_admin")).toBe("Solo la administración asigna fichas.");
    expect(textoCodigoAsignar("sin_persona")).toBe("Esta cuenta ya no existe.");
    expect(textoCodigoAsignar("sin_ficha")).toMatch(/ya no existe/);
    expect(textoCodigoAsignar("ya")).toMatch(/Ya la administraba/);
    expect(textoCodigoAsignar("raro")).toBe("No se pudo asignar. Intenta de nuevo.");
    expect(textoCodigoQuitar("ok")).toBeNull();
    expect(textoCodigoQuitar("no_estaba")).toBeNull();
    expect(textoCodigoQuitar("no_admin")).toBe("Solo la administración quita fichas.");
    expect(textoCodigoQuitar("raro")).toBe("No se pudo quitar. Intenta de nuevo.");
  });

  it("abre la ficha pública y ordena por nombre sin importar acentos", () => {
    expect(hrefFicha({ tipo: "lugar", id: "x", slug: "foro-lunaria" })).toBe("/lugares/foro-lunaria");
    expect(hrefFicha({ tipo: "artista", id: "y", slug: null })).toBe("/artistas/y");
    expect(ordenarAdministradas([{ id: "1", nombre: "Ópalo" }, { id: "2", nombre: "ateneo" }, { id: "3", nombre: "Nube" }]).map((f) => f.nombre)).toEqual(["ateneo", "Nube", "Ópalo"]);
  });
});
