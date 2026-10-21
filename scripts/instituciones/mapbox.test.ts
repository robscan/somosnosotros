import { describe, expect, it } from "vitest";
import { ubicarSitio } from "./mapbox";

// Respuestas simuladas de Mapbox (sin red): Search Box sugiere y recupera; Geocoding v6 responde por dirección.
function simulado(opciones: { nombre?: string; punto?: [number, number]; direccion?: { punto: [number, number]; full_address: string } }) {
  const pedidas: string[] = [];
  const responder = (cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: 200, headers: { "content-type": "application/json" } });
  const pedir = (async (url: string) => {
    pedidas.push(url);
    if (url.includes("/searchbox/v1/suggest")) return responder({ suggestions: opciones.nombre ? [{ mapbox_id: "poi.1", name: opciones.nombre }] : [] });
    if (url.includes("/searchbox/v1/retrieve/"))
      return responder({ features: opciones.punto ? [{ geometry: { coordinates: opciones.punto }, properties: { name: opciones.nombre, full_address: "Av. Himno Nacional 4000, 78390 San Luis Potosí" } }] : [] });
    if (url.includes("/geocode/v6/forward")) {
      const d = opciones.direccion;
      return responder({ features: d ? [{ properties: { feature_type: "address", full_address: d.full_address, coordinates: { longitude: d.punto[0], latitude: d.punto[1] } } }] : [] });
    }
    return new Response("", { status: 404 });
  }) as typeof fetch;
  return { pedir, pedidas };
}

describe("ubicarSitio (OL-424): el punto de un sitio sin ficha, dentro de la ciudad", () => {
  it("lo encuentra por su nombre, aunque la agenda lo corte con puntos suspensivos", async () => {
    const { pedir, pedidas } = simulado({ nombre: "El Meteorito Museo Interactivo", punto: [-100.9921, 22.1312] });
    const eleccion = await ubicarSitio("El Meteorito. Museo Interactivo…", null, { token: "pk.prueba", fetch: pedir, api: "http://mapbox.local" });
    expect(eleccion).toMatchObject({ como: "Mapbox por nombre", punto: { lat: 22.1312, lng: -100.9921 } });
    expect(pedidas[0]).toContain("http://mapbox.local/search/searchbox/v1/suggest?");
    const pedida = new URL(pedidas[0] ?? "").searchParams;
    expect(pedida.get("q")).toBe("El Meteorito. Museo Interactivo");
    expect(pedida.get("bbox")).toBe("-101.1,22,-100.85,22.3");
  });

  it("fuera de la ciudad no vale (otro municipio con el mismo nombre)", async () => {
    const { pedir } = simulado({ nombre: "El Meteorito Museo Interactivo", punto: [-99.13, 19.43] });
    expect(await ubicarSitio("El Meteorito. Museo Interactivo", null, { token: "pk.prueba", fetch: pedir })).toBeNull();
  });

  it("un nombre que no coincide no se adivina; sin resultados, nada", async () => {
    const { pedir } = simulado({ nombre: "Museo Laberinto de las Ciencias y las Artes", punto: [-100.99, 22.13] });
    expect(await ubicarSitio("El Meteorito", null, { token: "pk.prueba", fetch: pedir })).toBeNull();
    expect(await ubicarSitio("Plaza sin nombre", null, { token: "pk.prueba", fetch: simulado({}).pedir })).toBeNull();
  });

  it("con dirección, la usa si el nombre no aparece", async () => {
    const { pedir } = simulado({ direccion: { punto: [-100.975, 22.151], full_address: "Calle Zaragoza 410, Centro, 78000 San Luis Potosí" } });
    const eleccion = await ubicarSitio("Patio del callejón", "Zaragoza 410, Centro", { token: "pk.prueba", fetch: pedir });
    expect(eleccion).toMatchObject({ como: "Mapbox por dirección", punto: { lat: 22.151, lng: -100.975, direccion: "Calle Zaragoza 410, Centro, 78000 San Luis Potosí" } });
  });
});
