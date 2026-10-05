import { describe, expect, it, vi } from "vitest";
import { rpcs, tablas } from "./fixture.mjs";
import { cargarCiudades, cargarCiudadesDeArtistas } from "../../../../src/lib/ciudades";
import { armarCiudades, armarCiudadesDeArtistas } from "../../../../src/lib/ciudad";
import { clienteServidor } from "../../../../src/lib/supabase/servidor";
vi.mock("../../../../src/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));

describe("respaldo: ciudades llegan desde las RPC", () => {
  it("el servidor conserva las ciudades y los centros del respaldo con el contrato nuevo", async () => {
    const ahora = new Date().toISOString();
    const datos = {
      ciudades_agregadas: rpcs.ciudades_agregadas({ p_ahora: ahora }, tablas),
      ciudades_artistas_agregadas: rpcs.ciudades_artistas_agregadas({}, tablas),
    };
    const rpc = vi.fn(async (nombre: keyof typeof datos) => ({ data: datos[nombre], error: null }));
    const from = vi.fn(() => { throw new Error("Consulta antigua no autorizada en esta prueba"); });
    vi.mocked(clienteServidor).mockResolvedValue({ rpc, from } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
    expect(await cargarCiudades()).toEqual(armarCiudades(tablas.lugares.filter(l => l.visible && !l.privado), tablas.eventos.filter(e => e.visible && new Date(e.termina) >= new Date(ahora))));
    expect(await cargarCiudadesDeArtistas()).toEqual(armarCiudadesDeArtistas(tablas.artistas.filter(a => a.visible)));
    expect(datos.ciudades_agregadas[0].lugares).toBeGreaterThan(0);
    expect(datos.ciudades_artistas_agregadas[0].artistas).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(from).not.toHaveBeenCalled();
  });
});
