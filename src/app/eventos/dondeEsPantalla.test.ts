import { describe, expect, it } from "vitest";
import type { LugarSugerido } from "@/lib/buscarLugares";
import type { LugarResumen } from "@/lib/lugares";
import { altoTeclado, combinarResultados, decidirGuardado, modoDePantalla, puedeGuardarLugar } from "./dondeEsPantalla";

function lugar(id: string, nombre: string): LugarResumen {
  return { id, nombre, tipo: "museo", direccion: "Calle 1", lat: 22.15, lng: -100.97, portada: null };
}
function sugerido(id: string, nombre: string): LugarSugerido {
  return { mapboxId: id, nombre, direccion: "Otra calle", categorias: [], esDireccion: false, ciudad: "San Luis Potosí", distanciaM: 100 };
}

describe("combinarResultados", () => {
  it("los lugares registrados van primero, en su propio orden", () => {
    const lugares = [lugar("a", "Museo A"), lugar("b", "Museo B")];
    const mapbox = [sugerido("x", "Plaza X")];
    const r = combinarResultados(lugares, mapbox);
    expect(r.map((x) => x.tipo)).toEqual(["lugar", "lugar", "mapbox"]);
    expect(r[0]).toMatchObject({ tipo: "lugar", lugar: { id: "a" } });
    expect(r[2]).toMatchObject({ tipo: "mapbox", item: { mapboxId: "x" } });
  });
  it("sin lugares registrados, solo lo de Mapbox", () => {
    const r = combinarResultados([], [sugerido("x", "Plaza X")]);
    expect(r).toEqual([{ tipo: "mapbox", item: sugerido("x", "Plaza X") }]);
  });
  it("sin nada de ningún lado, lista vacía", () => {
    expect(combinarResultados([], [])).toEqual([]);
  });
});

describe("modoDePantalla", () => {
  it("sin texto y sin panel: inicial", () => {
    expect(modoDePantalla("", false, false)).toBe("inicial");
    expect(modoDePantalla("   ", false, true)).toBe("inicial");
  });
  it("con texto y resultados: resultados", () => {
    expect(modoDePantalla("casa", false, true)).toBe("resultados");
  });
  it("con texto y sin resultados: no-encontrado", () => {
    expect(modoDePantalla("casa", false, false)).toBe("no-encontrado");
  });
  it("con el panel abierto, gana siempre a lo demás", () => {
    expect(modoDePantalla("casa", true, true)).toBe("agregar");
    expect(modoDePantalla("", true, false)).toBe("agregar");
  });
});

describe("decidirGuardado", () => {
  it("sin privado: registra, con el texto recortado", () => {
    expect(decidirGuardado(false, "  Casa de Cultura  ", " Calle 1 ")).toEqual({ modo: "registrar", nombre: "Casa de Cultura", direccion: "Calle 1" });
  });
  it("con privado: solo queda en el evento", () => {
    expect(decidirGuardado(true, "Cochera de Lupe", "")).toEqual({ modo: "privado", nombre: "Cochera de Lupe", direccion: "" });
  });
});

describe("altoTeclado", () => {
  it("sin visualViewport, 0 (la barra se queda al pie)", () => {
    expect(altoTeclado(844, null)).toBe(0);
  });
  it("visualViewport igual a la ventana: sin teclado, 0", () => {
    expect(altoTeclado(844, { height: 844, offsetTop: 0 })).toBe(0);
  });
  it("con el teclado abierto: la diferencia, redondeada", () => {
    expect(altoTeclado(844, { height: 544.4, offsetTop: 0 })).toBe(300);
  });
  it("con offsetTop (la página se movió) también cuenta", () => {
    expect(altoTeclado(844, { height: 544, offsetTop: 10 })).toBe(290);
  });
  it("una diferencia de un pixel (redondeo) no cuenta como teclado", () => {
    expect(altoTeclado(844, { height: 843.5, offsetTop: 0 })).toBe(0);
  });
});

describe("puedeGuardarLugar (OL-182, bitácora 217: nunca guardar un punto inventado)", () => {
  it("con nombre y punto: sí", () => {
    expect(puedeGuardarLugar({ nombre: "Cochera de Lupe", punto: { lat: 22.15, lng: -100.97 } })).toBe(true);
  });
  it("sin punto (el defecto reportado: guardaba un punto que nadie eligió): no, aunque haya nombre", () => {
    expect(puedeGuardarLugar({ nombre: "Cochera de Lupe", punto: null })).toBe(false);
  });
  it("sin nombre (solo espacios): no, aunque haya punto", () => {
    expect(puedeGuardarLugar({ nombre: "   ", punto: { lat: 22.15, lng: -100.97 } })).toBe(false);
  });
  it("sin nombre y sin punto: no", () => {
    expect(puedeGuardarLugar({ nombre: "", punto: null })).toBe(false);
  });
});
