import { describe, expect, it, vi } from "vitest";
import { distanciaKm } from "./geo";
import { buscarCiudades, buscarDirecciones, ciudadDelContexto, direccionDesdePunto, interpretarCiudades, interpretarRespuesta, lugarDesdePunto, urlCiudades, urlGeocodificar } from "./geocodificar";

describe("geocodificar", () => {
  it("arma la URL con cercanía, país y español", () => {
    const u = new URL(urlGeocodificar("Villerías 2", "pk.x", { lat: 22.15, lng: -100.97 }));
    expect(u.searchParams.get("q")).toBe("Villerías 2");
    expect(u.searchParams.get("country")).toBe("mx");
    expect(u.searchParams.get("language")).toBe("es");
    expect(u.searchParams.get("proximity")).toBe("-100.97,22.15");
  });
  it("interpreta la respuesta v6 y descarta lo que no tiene coordenadas", () => {
    const s = interpretarRespuesta({
      features: [
        { properties: { name: "Villerías 2", full_address: "Villerías 2, Centro, San Luis Potosí", coordinates: { latitude: 22.1, longitude: -100.9 }, context: { place: { name: "San Luis Potosí" } } } },
        { properties: { name: "Sin coords" } },
      ],
    });
    expect(s).toEqual([{ nombre: "Villerías 2", direccion: "Villerías 2, Centro, San Luis Potosí", lat: 22.1, lng: -100.9, ciudad: "San Luis Potosí" }]);
  });
  it("no llama a la red con menos de 3 letras", async () => {
    const f = vi.fn();
    expect(await buscarDirecciones("ab", "pk.x", { lat: 0, lng: 0 }, f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("pide 10 a Mapbox pero ordena por cercanía real y devuelve las 5 más cercanas", async () => {
    // Buscando "Plaza de Armas" desde San Luis, Mapbox trae primero las de otras ciudades (founder, 2026-09-16).
    const cerca = { lat: 22.1497, lng: -100.9764 };
    const ciudades = [
      { nombre: "Plaza de Armas, Querétaro", lat: 20.5888, lng: -100.3899 },
      { nombre: "Plaza de Armas, Zacatecas", lat: 22.7709, lng: -102.5832 },
      { nombre: "Plaza de Armas, Saltillo", lat: 25.4232, lng: -101.0053 },
      { nombre: "Plaza de Armas, Monterrey", lat: 25.6714, lng: -100.309 },
      { nombre: "Plaza de Armas, San Luis Potosí", lat: 22.1512, lng: -100.976 },
      { nombre: "Plaza de Armas, Guadalajara", lat: 20.6767, lng: -103.3475 },
    ]; // a propósito, desordenadas: así llegan de Mapbox
    const masCercanas = [...ciudades].sort((a, b) => distanciaKm(cerca, a) - distanciaKm(cerca, b)).slice(0, 5).map((c) => c.nombre);
    const f = vi.fn(async (url: string) => {
      expect(new URL(url).searchParams.get("limit")).toBe("10");
      const features = ciudades.map((c) => ({ properties: { name: c.nombre, full_address: c.nombre, coordinates: { latitude: c.lat, longitude: c.lng } } }));
      return new Response(JSON.stringify({ features }), { status: 200 });
    });
    const r = await buscarDirecciones("Plaza de Armas", "pk.x", cerca, f);
    expect(r.map((s) => s.nombre)).toEqual(masCercanas);
    expect(r[0].nombre).toBe("Plaza de Armas, San Luis Potosí");
  });

  it("deduce la dirección de un punto con la búsqueda inversa", async () => {
    const f = vi.fn(async (url: string) => {
      expect(url).toContain("/reverse?");
      expect(url).toContain("latitude=22.15");
      return new Response(JSON.stringify({ features: [{ properties: { name: "Villerías 2", full_address: "Villerías 2, Centro", coordinates: { latitude: 22.15, longitude: -100.97 }, context: { locality: { name: "Cerro de San Pedro" } } } }] }), { status: 200 });
    });
    expect(await direccionDesdePunto({ lat: 22.15, lng: -100.97 }, "pk.x", f)).toBe("Villerías 2, Centro");
    expect(await lugarDesdePunto({ lat: 22.15, lng: -100.97 }, "pk.x", f)).toEqual({ direccion: "Villerías 2, Centro", ciudad: "Cerro de San Pedro" });
  });

  it("busca ciudades de cualquier país, en español, primero las cercanas a la ciudad que se ve (el contexto ordena, no limita)", () => {
    const u = new URL(urlCiudades("Guadal", "pk.x", { lat: 22.15, lng: -100.97 }));
    expect(u.searchParams.get("types")).toBe("place");
    expect(u.searchParams.has("country")).toBe(false);
    expect(u.searchParams.get("language")).toBe("es");
    expect(u.searchParams.get("proximity")).toBe("-100.97,22.15");
    expect(u.searchParams.get("limit")).toBe("10");
  });
  it("fuera de México la ciudad lleva su país; en México, no (así están todas las que hay)", () => {
    expect(ciudadDelContexto({ place: { name: "Heredia" }, country: { name: "Costa Rica", country_code: "CR" } })).toBe("Heredia, Costa Rica");
    expect(ciudadDelContexto({ place: { name: "Córdoba" }, country: { name: "México", country_code: "mx" } })).toBe("Córdoba");
    expect(ciudadDelContexto({ locality: { name: "Cerro de San Pedro" } })).toBe("Cerro de San Pedro");
    expect(ciudadDelContexto({ country: { name: "España", country_code: "ES" } })).toBeNull();
  });
  it("nombra la ciudad como la de un lugar (el contexto manda), unida a su área y sin repetirla", () => {
    // Formas reales de Mapbox (2026-09-16): "Mexico DF" trae "Ciudad de México" en el contexto; el estado en minúsculas.
    const mx = { name: "México", country_code: "MX" };
    const en = (latitude: number, longitude: number) => ({ latitude, longitude });
    const c = interpretarCiudades({
      features: [
        { properties: { name: "Guadalajara", place_formatted: "estado de Jalisco, México", coordinates: en(20.67, -103.35), context: { place: { name: "Guadalajara" }, country: mx } } },
        { properties: { name: "Mexico DF", place_formatted: "México", coordinates: en(19.43, -99.13), context: { place: { name: "Ciudad de México" }, country: mx } } },
        { properties: { name: "Soledad de Graciano Sánchez", place_formatted: "San Luis Potosí, México", coordinates: en(22.18, -100.94), context: { place: { name: "Soledad de Graciano Sánchez" }, country: mx } } },
        { properties: { name: "Guadalajara", place_formatted: "estado de Jalisco, México", coordinates: en(20.67, -103.35), context: { place: { name: "Guadalajara" }, country: mx } } },
        { properties: { name: "Córdoba", place_formatted: "provincia de Córdoba, España", coordinates: en(37.88, -4.78), context: { place: { name: "Córdoba" }, country: { name: "España", country_code: "ES" } } } },
        { properties: { name: "Córdoba", place_formatted: "Provincia de Córdoba, Argentina", coordinates: en(-31.42, -64.18), context: { place: { name: "Córdoba" }, country: { name: "Argentina", country_code: "AR" } } } },
        { properties: { name: "Córdoba", place_formatted: "Estado de Veracruz, México", coordinates: en(18.88, -96.93), context: { place: { name: "Córdoba" }, country: mx } } },
        { properties: { name: "San Petersburgo", place_formatted: "Rusia", coordinates: en(59.94, 30.31), context: { place: { name: "San Petersburgo" }, country: { name: "Rusia", country_code: "RU" } } } },
        { properties: { name: "Guadalupe", place_formatted: "Zacatecas, México", coordinates: en(22.75, -102.52) } },
        { properties: { name: "Sin punto", place_formatted: "Zacatecas, México" } },
        { properties: {} },
      ],
    });
    expect(c.map(({ ciudad, donde }) => ({ ciudad, donde }))).toEqual([
      { ciudad: "Guadalajara", donde: "Estado de Jalisco, México" },
      { ciudad: "Ciudad de México", donde: "México" },
      { ciudad: "San Luis Potosí", donde: "San Luis Potosí, México" },
      { ciudad: "Córdoba, España", donde: "Provincia de Córdoba" },
      { ciudad: "Córdoba, Argentina", donde: "Provincia de Córdoba" },
      { ciudad: "Córdoba", donde: "Estado de Veracruz, México" },
      { ciudad: "San Petersburgo, Rusia", donde: "" },
      { ciudad: "Guadalupe", donde: "Zacatecas, México" },
    ]);
    expect(c[0]).toMatchObject({ lat: 20.67, lng: -103.35 });
  });
  it("pone las ciudades por cercanía a la ciudad que se ve: con «San», San Luis Potosí antes que San Petersburgo", async () => {
    // Orden en que llegaron de Mapbox el 2026-09-16 buscando «San» desde San Luis Potosí.
    const llegan = [
      ["San Petersburgo", "RU", "Rusia", 59.94, 30.31],
      ["San Francisco", "US", "Estados Unidos", 37.77, -122.42],
      ["San Miguel de Allende", "MX", "México", 20.91, -100.74],
      ["San Luis Potosí", "MX", "México", 22.15, -100.98],
      ["Santiago de Querétaro", "MX", "México", 20.59, -100.39],
    ] as const;
    const f = vi.fn(async () => {
      const features = llegan.map(([name, country_code, pais, latitude, longitude]) => ({ properties: { name, place_formatted: pais, coordinates: { latitude, longitude }, context: { place: { name }, country: { name: pais, country_code } } } }));
      return new Response(JSON.stringify({ features }), { status: 200 });
    });
    const r = await buscarCiudades("San", "pk.x", { lat: 22.1497, lng: -100.9764 }, f);
    expect(r.map((x) => x.ciudad)).toEqual(["San Luis Potosí", "San Miguel de Allende", "Santiago de Querétaro", "San Francisco, Estados Unidos", "San Petersburgo, Rusia"]);
  });
  it("no busca ciudades con menos de 2 letras y, si Mapbox falla, lo dice en vez de devolver nada", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 401 }));
    expect(await buscarCiudades("g", "pk.x", { lat: 0, lng: 0 }, f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
    await expect(buscarCiudades("Guadal", "pk.x", { lat: 0, lng: 0 }, f)).rejects.toThrow();
  });
});
