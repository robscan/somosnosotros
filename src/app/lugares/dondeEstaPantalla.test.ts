import { describe, expect, it } from "vitest";
import type { LugarResumen } from "@/lib/lugares";
import { lugarCercano, textoInicialBusqueda } from "./dondeEstaPantalla";

function lugar(id: string, nombre: string, lat: number, lng: number): LugarResumen {
  return { id, nombre, tipo: "museo", direccion: "Calle 1", lat, lng, portada: null };
}

describe("lugarCercano (OL-211: avisar «ya existe», nunca elegir)", () => {
  const centro = { lat: 22.15, lng: -100.97 };

  it("sin lugares cerca: nada que avisar", () => {
    expect(lugarCercano([lugar("a", "Museo A", 22.2, -101.1)], centro)).toBeNull();
  });

  it("un lugar a menos de 150 m: se avisa", () => {
    // ~0.001° de latitud son ~111 m.
    const cerca = lugar("a", "Museo A", centro.lat + 0.001, centro.lng);
    expect(lugarCercano([cerca], centro)).toEqual(cerca);
  });

  it("justo en el mismo punto: se avisa (0 m)", () => {
    const aqui = lugar("a", "Museo A", centro.lat, centro.lng);
    expect(lugarCercano([aqui], centro)).toEqual(aqui);
  });

  it("a más de 150 m: no se avisa", () => {
    // ~0.002° de latitud son ~222 m.
    const lejos = lugar("a", "Museo A", centro.lat + 0.002, centro.lng);
    expect(lugarCercano([lejos], centro)).toBeNull();
  });

  it("con varios cerca, avisa del más cercano", () => {
    const lejano = lugar("lejano", "Foro lejano", centro.lat + 0.0012, centro.lng);
    const cercano = lugar("cercano", "Foro cercano", centro.lat + 0.0003, centro.lng);
    expect(lugarCercano([lejano, cercano], centro)).toEqual(cercano);
  });

  it("sin lugares: null", () => {
    expect(lugarCercano([], centro)).toBeNull();
  });

  it("admite un radio distinto", () => {
    const aUnos300m = lugar("a", "Museo A", centro.lat + 0.0027, centro.lng);
    expect(lugarCercano([aUnos300m], centro)).toBeNull();
    expect(lugarCercano([aUnos300m], centro, 500)).toEqual(aUnos300m);
  });
});

describe("textoInicialBusqueda (OL-211: el nombre ya escrito adelanta la primera búsqueda)", () => {
  it('entrando por "Buscar" (sin ubicación), arranca con el nombre ya escrito', () => {
    expect(textoInicialBusqueda("Laboratorio de Arte Escénico", false)).toBe("Laboratorio de Arte Escénico");
  });

  it("recorta espacios", () => {
    expect(textoInicialBusqueda("  Casa de Cultura  ", false)).toBe("Casa de Cultura");
  });

  it('entrando por "Cambiar" (ya hay ubicación), arranca vacío aunque haya nombre', () => {
    expect(textoInicialBusqueda("Laboratorio de Arte Escénico", true)).toBe("");
  });

  it("sin nombre todavía, arranca vacío", () => {
    expect(textoInicialBusqueda("", false)).toBe("");
  });
});
