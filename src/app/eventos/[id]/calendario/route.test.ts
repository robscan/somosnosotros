import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { clienteServidor } from "@/lib/supabase/servidor";

vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));
const cliente = vi.mocked(clienteServidor);
const evento = { id: "00000000-0000-4000-8000-0000000000e1", titulo: "Prueba", inicio: "2035-12-01T20:00:00Z", fin: null, zona: "America/Mexico_City", descripcion: null, sitio_texto: "Foro · Patio", sitio_direccion: "Calle 456", sitio_reservado: false, lugar: null };
beforeEach(() => vi.resetAllMocks());

for (const reservado of [false, true]) it(`calendario usa direccion estructurada solo si publico: ${!reservado}`, async () => {
  const consulta = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: {...evento,sitio_reservado: reservado} }) };
  cliente.mockResolvedValue({from: vi.fn().mockReturnValue(consulta)} as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const respuesta = await GET(new Request("http://localhost/calendario"), {params:Promise.resolve({id:evento.id})});
  expect(respuesta.status).toBe(200);
  const contenido = await respuesta.text();
  expect(contenido).toContain(reservado ? "LOCATION:Foro · Patio · sitio reservado" : "LOCATION:Foro · Patio · Calle 456");
  if(reservado) expect(contenido).not.toContain("Calle 456");
  expect(consulta.select.mock.calls[0][0]).toContain("sitio_direccion");
  expect(consulta.select.mock.calls[0][0]).toContain("sitio_reservado");
});
