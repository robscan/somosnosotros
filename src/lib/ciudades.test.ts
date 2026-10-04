import { afterEach, describe, expect, it, vi } from "vitest";
import { cargarCiudades, cargarCiudadesDeArtistas } from "./ciudades";
import { armarCiudades, armarCiudadesDeArtistas } from "./ciudad";
import { clienteServidor } from "./supabase/servidor";
vi.mock("./supabase/servidor", () => ({ clienteServidor: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
const lugares = [
  { ciudad: "Querétaro", zona: "America/Mexico_City", lat: 20, lng: -100 },
  { ciudad: " Querétaro ", zona: "America/Cancun", lat: 22, lng: -98 },
  { ciudad: "Querétaro", zona: "America/Mexico_City", lat: 24, lng: -96 },
  { ciudad: "Soledad de Graciano Sánchez", zona: "America/Mexico_City", lat: 22, lng: -100 },
];
const eventos = [{ ciudad: "Querétaro", zona: "America/Cancun" }, { ciudad: "Madrid", zona: "Europe/Madrid" }, { ciudad: "", zona: "America/Mexico_City" }];
function banco(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  const from = vi.fn(() => { throw new Error("No debe descargar filas individuales"); });
  vi.mocked(clienteServidor).mockResolvedValue({ rpc, from } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  return { rpc, from };
}
const agrupadas = [
  { ciudad: "Querétaro", zona: "America/Mexico_City", lugares: 2, eventos: 0, lat_suma: 44, lng_suma: -196 },
  { ciudad: " Querétaro ", zona: "America/Cancun", lugares: 1, eventos: 0, lat_suma: 22, lng_suma: -98 },
  { ciudad: "Querétaro", zona: "America/Cancun", lugares: 0, eventos: 1, lat_suma: 0, lng_suma: 0 },
  { ciudad: "Soledad de Graciano Sánchez", zona: "America/Mexico_City", lugares: 1, eventos: 0, lat_suma: 22, lng_suma: -100 },
  { ciudad: "Madrid", zona: "Europe/Madrid", lugares: 0, eventos: 1, lat_suma: 0, lng_suma: 0 },
  { ciudad: "", zona: "America/Mexico_City", lugares: 0, eventos: 1, lat_suma: 0, lng_suma: 0 },
];
describe("ciudades agregadas: mismo resultado sin descargar cada ficha", () => {
  it("preserva centro ponderado, alias metropolitano, nombres, orden y desempate de zona", async () => {
    const b = banco(agrupadas);
    expect(await cargarCiudades()).toEqual(armarCiudades(lugares, eventos));
    expect(b.rpc).toHaveBeenCalledExactlyOnceWith("ciudades_agregadas");
    expect(b.from).not.toHaveBeenCalled();
  });
  it("más de5000 lugares y eventos siguen completos con solo un agregado", async () => {
    banco([{ ciudad: "Ciudad numerosa", zona: "America/Mexico_City", lugares: 6000, eventos: 7000, lat_suma: 120000, lng_suma: -600000 }]);
    expect((await cargarCiudades())[1]).toMatchObject({ lugares: 6000, eventos: 7000, centro: { lat: 20, lng: -100 } });
  });
  it("Artistas conserva la canonización y el orden, sin límite por fichas", async () => {
    const b = banco([{ ciudad: "Soledad de Graciano Sánchez", artistas: 1 }, { ciudad: "", artistas: 1 }, { ciudad: "Querétaro", artistas: 2 }]);
    expect(await cargarCiudadesDeArtistas()).toEqual(armarCiudadesDeArtistas([{ ciudad: "Soledad de Graciano Sánchez" }, { ciudad: "" }, { ciudad: "Querétaro" }, { ciudad: "Querétaro" }]));
    expect(b.rpc).toHaveBeenCalledExactlyOnceWith("ciudades_artistas_agregadas");
    banco([{ ciudad: "Querétaro", artistas: 6000 }]);
    expect((await cargarCiudadesDeArtistas())[1].artistas).toBe(6000);
  });
  it("vacío real conserva la ciudad inicial", async () => {
    banco([]);
    expect(await cargarCiudades()).toEqual(armarCiudades([], []));
    expect(await cargarCiudadesDeArtistas()).toEqual(armarCiudadesDeArtistas([]));
  });
  it("fallo de RPC conserva el respaldo y emite traza sin detalles remotos", async () => {
    const traza = vi.spyOn(console, "warn").mockImplementation(() => {});
    banco(null, { message: "correo@privado.test" });
    expect(await cargarCiudades()).toEqual(armarCiudades([], []));
    expect(await cargarCiudadesDeArtistas()).toEqual(armarCiudadesDeArtistas([]));
    expect(traza).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(traza.mock.calls)).not.toMatch(/privado/);
  });
});
