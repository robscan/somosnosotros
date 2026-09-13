import { describe, expect, it, vi } from "vitest";
import { deducirTipo, interpretarRecuperado, interpretarSugerencias, recuperarLugar, sugerirLugares, urlSugerir } from "./buscarLugares";

describe("buscarLugares", () => {
  it("arma la URL de sugerencias con sesión, cercanía y tipos poi+address", () => {
    const u = new URL(urlSugerir("teatro", "pk.x", { lat: 22.15, lng: -100.97 }, "s1"));
    expect(u.pathname).toBe("/search/searchbox/v1/suggest");
    expect(u.searchParams.get("session_token")).toBe("s1");
    expect(u.searchParams.get("types")).toBe("poi,address");
    expect(u.searchParams.get("proximity")).toBe("-100.97,22.15");
  });
  it("interpreta sugerencias y descarta las que no tienen id o nombre", () => {
    const s = interpretarSugerencias({
      suggestions: [
        { mapbox_id: "a", name: "Teatro de la Paz", full_address: "Villerías 2, Centro", poi_category: ["theatre"] },
        { name: "sin id" },
      ],
    });
    expect(s).toEqual([{ mapboxId: "a", nombre: "Teatro de la Paz", direccion: "Villerías 2, Centro", categorias: ["theatre"] }]);
  });
  it("recupera coordenadas del primer resultado", () => {
    const r = interpretarRecuperado({ features: [{ geometry: { coordinates: [-100.97, 22.15] }, properties: { name: "X", full_address: "Y" } }] });
    expect(r).toEqual({ nombre: "X", direccion: "Y", lng: -100.97, lat: 22.15, categorias: [] });
    expect(interpretarRecuperado({})).toBeNull();
  });
  it("no llama a la red con menos de 3 letras y tolera errores", async () => {
    const f = vi.fn(async () => new Response("", { status: 500 }));
    expect(await sugerirLugares("ab", "pk.x", { lat: 0, lng: 0 }, "s", f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
    expect(await sugerirLugares("abc", "pk.x", { lat: 0, lng: 0 }, "s", f)).toEqual([]);
    expect(await recuperarLugar("id", "pk.x", "s", f)).toBeNull();
  });
});

describe("deducirTipo", () => {
  it("usa la categoría de Mapbox o palabras del nombre", () => {
    expect(deducirTipo("Teatro de la Paz", ["theatre"])).toBe("foro");
    expect(deducirTipo("Biblioteca Central")).toBe("biblioteca");
    expect(deducirTipo("Galería Ángel")).toBe("galeria");
    expect(deducirTipo("Casa de la Cultura de SLP")).toBe("casa_de_cultura");
    expect(deducirTipo("Centro Cultural Universitario Bicentenario")).toBe("casa_de_cultura");
    expect(deducirTipo("Colectivo Nido")).toBe("colectivo");
    expect(deducirTipo("La Bodega")).toBeNull();
  });
});
