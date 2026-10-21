import { describe, expect, it } from "vitest";
import { centroDeCiudad, direccionParaBuscar, estadoDePunto, mismaCalle, ubicar, type AreaCiudad, type Mapbox } from "./mapbox";

const AREA: AreaCiudad = { centro: { lat: 22.1497, lng: -100.9764 }, radioKm: 15, nombres: ["San Luis Potosí", "Soledad de Graciano Sánchez"] };

/** Mapbox de mentira: responde por ruta y anota lo pedido (sin red). */
function mapbox(respuestas: Record<string, unknown>) {
  const pedidas: URL[] = [];
  const pedir = (async (url: string) => {
    const u = new URL(url);
    pedidas.push(u);
    const clave = Object.keys(respuestas).find((k) => u.pathname.includes(k));
    return clave ? Response.json(respuestas[clave]) : new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { m: { token: "token-de-prueba", pedir } satisfies Mapbox, pedidas };
}
const direccion = (lat: number, lng: number, full_address: string) => ({ features: [{ properties: { feature_type: "address", full_address, coordinates: { latitude: lat, longitude: lng } } }] });

describe("Mapbox desde el servidor", () => {
  it("la dirección va sin la ciudad (la ciudad va en la caja) y solo vale la misma calle", () => {
    expect(direccionParaBuscar("Villerías 205, Centro, San Luis Potosí, México", AREA.nombres)).toBe("Villerías 205, Centro");
    expect(mismaCalle("Villerías 205, Centro", "Calle Villerías 205, Centro, 78000 San Luis Potosí")).toBe(true);
    expect(mismaCalle("Villerías 205, Centro", "Avenida Carranza 205, 78000 San Luis Potosí")).toBe(false);
  });

  it("con el punto de la fuente dentro del área, no pregunta a Mapbox", async () => {
    const { m, pedidas } = mapbox({});
    expect(await ubicar({ nombre: "Teatro", direccion: "Villerías 205", lat: 22.1519, lng: -100.9738 }, AREA, m)).toEqual({ lat: 22.1519, lng: -100.9738, direccion: null, como: "fuente" });
    expect(pedidas).toHaveLength(0);
  });

  it("sin punto: por dirección, dentro de la caja de la ciudad y cerca de su centro; la URL lleva el token pero nunca se registra", async () => {
    const { m, pedidas } = mapbox({ "/geocode/v6/forward": direccion(22.152, -100.974, "Calle Villerías 205, Centro, 78000 San Luis Potosí") });
    const u = await ubicar({ nombre: "Teatro", direccion: "Villerías 205, Centro", lat: null, lng: null }, AREA, m);
    expect(u).toMatchObject({ lat: 22.152, lng: -100.974, como: "direccion" });
    const p = pedidas[0].searchParams;
    expect(p.get("types")).toBe("address");
    expect(p.get("bbox")?.split(",").map(Number)).toHaveLength(4);
    expect(p.get("proximity")).toBe("-100.9764,22.1497");
  });

  it("la dirección cae fuera del área o en otra calle: prueba por nombre; sin nada, «sin ubicación»", async () => {
    const otraCalle = mapbox({
      "/geocode/v6/forward": direccion(22.152, -100.974, "Avenida Carranza 205"),
      "/searchbox/v1/suggest": { suggestions: [{ mapbox_id: "abc", name: "Foro La Carrilla" }] },
      "/searchbox/v1/retrieve/abc": { features: [{ geometry: { coordinates: [-100.94, 22.18] }, properties: { full_address: "Av. Juárez 10, Soledad" } }] },
    });
    expect(await ubicar({ nombre: "Foro La Carrilla", direccion: "Villerías 205", lat: null, lng: null }, AREA, otraCalle.m)).toMatchObject({ como: "nombre", direccion: "Av. Juárez 10, Soledad" });
    const nada = mapbox({ "/searchbox/v1/suggest": { suggestions: [{ mapbox_id: "x", name: "Otra Cosa" }] } });
    expect(await ubicar({ nombre: "Foro La Carrilla", direccion: null, lat: null, lng: null }, AREA, nada.m)).toBeNull();
    expect(await ubicar({ nombre: "Foro", direccion: null, lat: null, lng: null }, AREA, null)).toBeNull();
  });

  it("el punto de la fuente fuera del área y Mapbox sin nada mejor: fuera de la ciudad", async () => {
    expect(await ubicar({ nombre: "Teatro Valles", direccion: null, lat: 21.98, lng: -99.01 }, AREA, null)).toBe("fuera");
    expect(await ubicar({ nombre: "Teatro Valles", direccion: null, lat: 21.98, lng: -99.01 }, AREA, mapbox({}).m)).toBe("fuera");
  });

  it("el estado de un punto (solo de México) y el centro de una ciudad sin centro", async () => {
    const { m } = mapbox({
      "/geocode/v6/reverse": { features: [{ properties: { context: { country: { country_code: "mx" }, region: { name: "San Luis Potosí", region_code: "SLP" } } } }] },
      "/geocode/v6/forward": { features: [{ properties: { coordinates: { latitude: 20.59, longitude: -100.39 } } }] },
    });
    expect(await estadoDePunto(AREA.centro, m)).toEqual({ codigo: "SLP", nombre: "San Luis Potosí" });
    expect(await centroDeCiudad("Querétaro", m)).toEqual({ lat: 20.59, lng: -100.39 });
    const fuera = mapbox({ "/geocode/v6/reverse": { features: [{ properties: { context: { country: { country_code: "ES" }, region: { name: "Andalucía" } } } }] } });
    expect(await estadoDePunto({ lat: 37.88, lng: -4.77 }, fuera.m)).toBeNull();
  });
});
