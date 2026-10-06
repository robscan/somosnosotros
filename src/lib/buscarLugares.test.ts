import { describe, expect, it, vi } from "vitest";
import { deducirTipo, esNegocio, interpretarRecuperado, interpretarSugerencias, recuperarLugar, sugerirLugares, urlSugerir } from "./buscarLugares";

describe("buscarLugares", () => {
  it("arma la URL de sugerencias con sesión, cercanía y tipos poi+address, de cualquier país", () => {
    const u = new URL(urlSugerir("teatro", "pk.x", { lat: 22.15, lng: -100.97 }, "s1"));
    expect(u.pathname).toBe("/search/searchbox/v1/suggest");
    expect(u.searchParams.get("session_token")).toBe("s1");
    expect(u.searchParams.get("types")).toBe("poi,address");
    expect(u.searchParams.get("proximity")).toBe("-100.97,22.15");
    expect(u.searchParams.has("country")).toBe(false);
    expect(u.searchParams.get("limit")).toBe("10");
    expect(u.searchParams.has("bbox")).toBe(false);
  });
  it("con bbox, acota la búsqueda a la ciudad de contexto (OL-100, caso 'Galeana #423, S.L.P.')", () => {
    const u = new URL(urlSugerir("Galeana", "pk.x", { lat: 22.15, lng: -100.97 }, "s1", [-101.1, 22.05, -100.85, 22.25]));
    expect(u.searchParams.get("bbox")).toBe("-101.1,22.05,-100.85,22.25");
  });
  it("pone lo más cercano primero, todas — sin recortar (quien llama filtra y recorta después, OL-100)", async () => {
    // "Teatro de la Paz" desde San Luis: Mapbox puede anteponer el de otra ciudad.
    const llegan = [
      { mapbox_id: "gdl", name: "Teatro de la Paz", full_address: "Guadalajara", distance: 440000 },
      { mapbox_id: "sin", name: "Teatro sin distancia", full_address: "?" },
      { mapbox_id: "slp", name: "Teatro de la Paz", full_address: "Villerías 2, Centro", distance: 350 },
      ...["a", "b", "c", "d", "e"].map((id, i) => ({ mapbox_id: id, name: `Teatro ${id}`, full_address: "X", distance: 1000 * (i + 1) })),
    ];
    expect(interpretarSugerencias({ suggestions: llegan }).map((s) => s.mapboxId)).toEqual(["slp", "a", "b", "c", "d", "e", "gdl", "sin"]);
    const f = vi.fn(async () => Response.json({ suggestions: llegan }));
    expect((await sugerirLugares("teatro", "pk.x", { lat: 22.15, lng: -100.97 }, "s", f)).map((s) => s.mapboxId)).toEqual(["slp", "a", "b", "c", "d", "e", "gdl", "sin"]);
  });
  it("interpreta sugerencias y descarta las que no tienen id o nombre", () => {
    const s = interpretarSugerencias({
      suggestions: [
        { mapbox_id: "a", name: "Teatro de la Paz", full_address: "Villerías 2, Centro", poi_category: ["theatre"], context: { place: { name: "San Luis Potosí" } } },
        { name: "sin id" },
      ],
    });
    expect(s).toEqual([{ mapboxId: "a", nombre: "Teatro de la Paz", direccion: "Villerías 2, Centro", categorias: ["theatre"], esDireccion: false, ciudad: "San Luis Potosí", distanciaM: null }]);
  });
  it("recupera coordenadas del primer resultado", () => {
    const r = interpretarRecuperado({ features: [{ geometry: { coordinates: [-100.97, 22.15] }, properties: { name: "X", full_address: "Y" } }] });
    expect(r).toEqual({ nombre: "X", direccion: "Y", lng: -100.97, lat: 22.15, categorias: [], ciudad: null });
    expect(interpretarRecuperado({ features: [{ geometry: { coordinates: [-100.4, 20.6] }, properties: { name: "X", context: { place: { name: "Querétaro" } } } }] })?.ciudad).toBe("Querétaro");
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
    expect(deducirTipo("Museo Nacional de la Máscara")).toBe("museo");
    expect(deducirTipo("Casa Museo Manuel José Othón")).toBe("museo");
    expect(deducirTipo("Escuela Estatal de Teatro")).toBe("escuela");
    expect(deducirTipo("Instituto Potosino de Bellas Artes")).toBe("escuela");
    expect(deducirTipo("Casa de la Cultura de SLP")).toBe("casa_de_cultura");
    expect(deducirTipo("Centro Cultural Universitario Bicentenario")).toBe("casa_de_cultura");
    expect(deducirTipo("Colectivo Nido")).toBe("colectivo");
    expect(deducirTipo("La Bodega")).toBeNull();
  });
  it("plaza, jardín, parque y alameda proponen «Plaza, jardín o parque», sin acentos ni mayúsculas", () => {
    expect(deducirTipo("Jardín Botánico El Izotal")).toBe("plaza");
    expect(deducirTipo("PARQUE TANGAMANGA I")).toBe("plaza");
    expect(deducirTipo("Plaza de Armas")).toBe("plaza");
    expect(deducirTipo("Alameda Juan Sarabia")).toBe("plaza");
    expect(deducirTipo("Sitio sin pista", ["park"])).toBe("plaza");
    expect(deducirTipo("Sitio sin pista", ["garden"])).toBe("plaza");
  });
  it("una palabra institucional gana a la de plaza o parque", () => {
    expect(deducirTipo("Teatro del Parque")).toBe("foro");
    expect(deducirTipo("Museo del Jardín")).toBe("museo");
    expect(deducirTipo("Galería Plaza Norte")).toBe("galeria");
    expect(deducirTipo("Estacionamiento Parking", ["parking"])).toBeNull();
    expect(deducirTipo("Parquesol Eventos")).toBeNull();
  });
});

describe("interpretarSugerencias · direcciones", () => {
  it("marca las direcciones para que no se conviertan en nombre", () => {
    const r = interpretarSugerencias({
      suggestions: [
        { mapbox_id: "a", name: "Workshop 850", full_address: "Av. Carranza 850, Centro", poi_category: ["cafe"], feature_type: "poi" },
        { mapbox_id: "b", name: "Calle 850", address: "Calle 850", place_formatted: "Centro, San Luis Potosí", feature_type: "address" },
      ],
    });
    expect(r.map((s) => s.esDireccion)).toEqual([false, true]);
    expect(r[1].direccion).toBe("Calle 850, Centro, San Luis Potosí");
  });
});

describe("esNegocio", () => {
  it("un bar, un café, un restaurante o un antro, por la categoría del mapa o por su nombre, es un negocio", () => {
    expect(esNegocio("La Cantina", ["bar"])).toBe(true);
    expect(esNegocio("Café Tacuba", ["coffee_shop"])).toBe(true);
    expect(esNegocio("Tacuba", ["cafe"])).toBe(true);
    expect(esNegocio("Casa Luna", ["restaurant"])).toBe(true);
    expect(esNegocio("Casa Luna", ["fast_food"])).toBe(true);
    expect(esNegocio("Fuego", ["night_club"])).toBe(true);
    expect(esNegocio("Cantina Don Beto")).toBe(true);
    expect(esNegocio("Cafetería Central")).toBe(true);
  });
  it("un espacio cultural no lo es, aunque el mapa lo junte con un café", () => {
    expect(esNegocio("Museo Federico Silva", ["museum"])).toBe(false);
    expect(esNegocio("Teatro de la Paz", ["theatre", "cafe"])).toBe(false);
    expect(esNegocio("Centro de las Artes")).toBe(false);
    expect(esNegocio("Jardín de San Juan de Dios", ["park"])).toBe(false);
    expect(esNegocio("Galería Ángel", ["art_gallery", "bar"])).toBe(false);
  });
  it("«plaza, jardín o parque» en el nombre no salva a un café", () => {
    expect(esNegocio("Café del Jardín", ["cafe"])).toBe(true);
  });
  it("una dirección sin nombre ni categorías no es un negocio", () => {
    expect(esNegocio("")).toBe(false);
    expect(esNegocio("", [])).toBe(false);
  });
});
