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


it("catálogo compartido conserva ciudades vacías en otra sección sin inventar oferta ni centro", async () => {
  const rpc=vi.fn(async (nombre:string) => ({error:null,data:nombre === "ciudades_agregadas"
    ? [{ciudad:"León",zona:"America/Mexico_City",lugares:0,eventos:1,lat_suma:0,lng_suma:0}]
    : [{ciudad:"Zacatecas",artistas:2}]}));
  vi.mocked(clienteServidor).mockResolvedValue({rpc} as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const artistas=await cargarCiudadesDeArtistas(true);
  expect(artistas.find(c=>c.slug === "leon")).toMatchObject({nombre:"León",artistas:0});
  const oferta=await cargarCiudades(true);
  expect(oferta.find(c=>c.slug === "zacatecas")).toMatchObject({nombre:"Zacatecas",lugares:0,eventos:0,centroConocido:false});
  expect(oferta.find(c=>c.slug === "leon")).toMatchObject({eventos:1,lugares:0});
});

describe("OL-283: centro de ciudades sin lugares a partir de sus eventos con punto público", () => {
  const Z = "America/Mexico_City";
  const buscar = async (slug: string) => (await cargarCiudades()).find(c => c.slug === slug);
  it("solo eventos con punto: centro promedio de esos puntos y centro conocido", async () => {
    banco([
      { ciudad: "Morelia", zona: Z, lugares: 0, eventos: 3, lat_suma: 0, lng_suma: 0, eventos_con_punto: 2, ev_lat_suma: 39, ev_lng_suma: -202 },
    ]);
    expect(await buscar("morelia")).toMatchObject({ lugares: 0, eventos: 3, centro: { lat: 19.5, lng: -101 }, centroConocido: true });
  });
  it("el promedio une zonas distintas de la misma ciudad", async () => {
    banco([
      { ciudad: "Puebla", zona: Z, lugares: 0, eventos: 1, lat_suma: 0, lng_suma: 0, eventos_con_punto: 1, ev_lat_suma: 19, ev_lng_suma: -98 },
      { ciudad: "Puebla", zona: "America/Cancun", lugares: 0, eventos: 1, lat_suma: 0, lng_suma: 0, eventos_con_punto: 1, ev_lat_suma: 21, ev_lng_suma: -96 },
    ]);
    expect(await buscar("puebla")).toMatchObject({ eventos: 2, centro: { lat: 20, lng: -97 }, centroConocido: true });
  });
  it("eventos sin punto (o solo con sitio reservado): sin centro conocido y respaldo de la ciudad inicial", async () => {
    banco([{ ciudad: "León", zona: Z, lugares: 0, eventos: 2, lat_suma: 0, lng_suma: 0, eventos_con_punto: 0, ev_lat_suma: 0, ev_lng_suma: 0 }]);
    const inicial = (await cargarCiudades())[0];
    expect(await buscar("leon")).toMatchObject({ eventos: 2, centro: inicial.centro, centroConocido: false });
  });
  it("con lugares usa solo los lugares, sin mezclar los puntos de los eventos", async () => {
    banco([
      { ciudad: "Querétaro", zona: Z, lugares: 2, eventos: 0, lat_suma: 44, lng_suma: -196, eventos_con_punto: 0, ev_lat_suma: 0, ev_lng_suma: 0 },
      { ciudad: "Querétaro", zona: Z, lugares: 0, eventos: 4, lat_suma: 0, lng_suma: 0, eventos_con_punto: 4, ev_lat_suma: 400, ev_lng_suma: 400 },
    ]);
    expect(await buscar("queretaro")).toMatchObject({ lugares: 2, eventos: 4, centro: { lat: 22, lng: -98 }, centroConocido: true });
  });
  it("la ciudad inicial conserva su centro fijo aunque sus eventos traigan puntos", async () => {
    banco([{ ciudad: "San Luis Potosí", zona: Z, lugares: 0, eventos: 2, lat_suma: 0, lng_suma: 0, eventos_con_punto: 2, ev_lat_suma: 40, ev_lng_suma: -200 }]);
    const inicial = (await cargarCiudades())[0];
    expect(inicial.centro).toEqual(armarCiudades([], [])[0].centro);
    expect(inicial.centroConocido).toBe(true);
  });
  it("función vieja sin los campos nuevos: se comporta como antes", async () => {
    banco([{ ciudad: "León", zona: Z, lugares: 0, eventos: 1, lat_suma: 0, lng_suma: 0 }]);
    const inicial = (await cargarCiudades())[0];
    expect(await buscar("leon")).toMatchObject({ eventos: 1, centro: inicial.centro, centroConocido: false });
  });
});
