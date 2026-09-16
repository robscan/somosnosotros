import { describe, expect, it, vi } from "vitest";
import { distanciaKm } from "./geo";
import { buscarDirecciones, direccionDesdePunto, interpretarRespuesta, lugarDesdePunto, urlGeocodificar } from "./geocodificar";

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
});
