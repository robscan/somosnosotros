import { describe, expect, it, vi } from "vitest";
import { buscarDirecciones, direccionDesdePunto, interpretarRespuesta, urlGeocodificar } from "./geocodificar";

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
        { properties: { name: "Villerías 2", full_address: "Villerías 2, Centro, San Luis Potosí", coordinates: { latitude: 22.1, longitude: -100.9 } } },
        { properties: { name: "Sin coords" } },
      ],
    });
    expect(s).toEqual([{ nombre: "Villerías 2", direccion: "Villerías 2, Centro, San Luis Potosí", lat: 22.1, lng: -100.9 }]);
  });
  it("no llama a la red con menos de 3 letras", async () => {
    const f = vi.fn();
    expect(await buscarDirecciones("ab", "pk.x", { lat: 0, lng: 0 }, f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("deduce la dirección de un punto con la búsqueda inversa", async () => {
    const f = vi.fn(async (url: string) => {
      expect(url).toContain("/reverse?");
      expect(url).toContain("latitude=22.15");
      return new Response(JSON.stringify({ features: [{ properties: { name: "Villerías 2", full_address: "Villerías 2, Centro", coordinates: { latitude: 22.15, longitude: -100.97 } } }] }), { status: 200 });
    });
    expect(await direccionDesdePunto({ lat: 22.15, lng: -100.97 }, "pk.x", f)).toBe("Villerías 2, Centro");
  });
});
