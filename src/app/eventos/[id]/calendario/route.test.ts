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

it("un evento con horario por día entrega un evento de calendario por día; si sus horas ya no coinciden con las sesiones, el de siempre", async () => {
  const pedir = async (datos: object) => {
    const consulta = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: datos }) };
    cliente.mockResolvedValue({ from: vi.fn().mockReturnValue(consulta) } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
    const respuesta = await GET(new Request("http://localhost/calendario"), { params: Promise.resolve({ id: evento.id }) });
    return { respuesta, consulta, contenido: await respuesta.text() };
  };
  // Del 1 al 3 de enero de 2099: de 20:00 a 21:00 el primer y el último día, y desde las 18:00 el segundo (UTC−6).
  const porDia = { ...evento, inicio: "2099-01-02T02:00:00Z", fin: "2099-01-04T03:00:00Z", sesiones: [{ inicio: "2099-01-04T02:00:00Z", fin: "2099-01-04T03:00:00Z" }, { inicio: "2099-01-02T02:00:00Z", fin: "2099-01-02T03:00:00Z" }, { inicio: "2099-01-03T00:00:00Z", fin: null }] };
  const { respuesta, consulta, contenido } = await pedir(porDia);
  expect(respuesta.status).toBe(200);
  expect(consulta.select.mock.calls[0][0]).toContain("eventos_sesiones");
  expect(contenido.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  expect(contenido).toContain("DTSTART:20990102T020000Z\r\nDTEND:20990102T030000Z");
  expect(contenido).toContain("DTSTART:20990103T000000Z\r\nDTEND:20990103T020000Z");
  expect(contenido).toContain("DTSTART:20990104T020000Z\r\nDTEND:20990104T030000Z");
  const desactualizado = await pedir({ ...porDia, inicio: "2099-01-02T01:00:00Z" });
  expect(desactualizado.contenido.match(/BEGIN:VEVENT/g)).toHaveLength(1);
});
