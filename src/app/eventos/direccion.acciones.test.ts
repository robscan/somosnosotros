import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarEvento, crearEvento } from "./acciones";

const m = vi.hoisted(() => ({ rpc: vi.fn(), sesion: vi.fn(), after: vi.fn(), redirect: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn(), esAdminDeSesion: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/avisos", () => ({ avisarCambioEvento: vi.fn(), avisarNuevoEvento: vi.fn() }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/cartel", () => ({ leerCartel: vi.fn() }));

const ID = "00000000-0000-4000-8000-0000000000f2";
function formulario() {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ operacion: ID, revision: "2030-09-01T12:00:00Z", modo_sitio: "otro",
    sitio_texto: "Foro de prueba", sitio_direccion: "Calle Prueba 123", sitio_lat: "22.15", sitio_lng: "-100.98",
    sitio_pin_pendiente: "no", titulo: "Evento", inicio: "2030-10-01T19:00", gratis: "si", quien: "[]" })) fd.set(k, v);
  return fd;
}
beforeEach(() => {
  vi.clearAllMocks();
  // El slug lo pone el disparador de la base; crearEvento lo relee con una consulta de sobra (bitácora 154).
  m.maybeSingle.mockResolvedValue({ data: null });
  const from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: m.maybeSingle })) })) }));
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc, from }, user: { id: ID } });
  m.rpc.mockResolvedValue({ data: { id: ID, artistas: [], artistas_anteriores: [], lugar_anterior: null, cambio: "donde" }, error: null });
  m.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe("transporte de direccion del formulario al guardado", () => {
  it("el alta entrega nombre, direccion y punto por separado a la RPC", async () => {
    await expect(crearEvento(null, formulario())).rejects.toThrow("REDIRECT");
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_evento: null, p_privado: null, p_datos: {
      sitio_texto: "Foro de prueba", sitio_direccion: "Calle Prueba 123", sitio_lat: 22.15, sitio_lng: -100.98,
    } });
    expect(m.rpc.mock.calls[0][1].p_datos).not.toHaveProperty("sitio_pin_pendiente");
  });
  it("editar transporta una direccion nueva sin concatenar la anterior", async () => {
    const fd = formulario(); fd.set("sitio_direccion", "Calle Nueva 456");
    expect((await actualizarEvento(ID, null, fd)).ok).toBe(true);
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_evento: ID, p_datos: { sitio_texto: "Foro de prueba", sitio_direccion: "Calle Nueva 456" } });
  });
  it("una ubicacion pendiente no se guarda aunque llegue un pin anterior", async () => {
    const fd = formulario(); fd.set("sitio_pin_pendiente", "si");
    expect(await crearEvento(null, fd)).toMatchObject({ ok: false, errores: { sitio_direccion: expect.any(String) } });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.after).not.toHaveBeenCalled();
  });
  it("reservado entrega direccion/pin solo al objeto privado, no a los campos publicos", async () => {
    const fd = formulario();
    fd.set("modo_sitio", "reservado"); fd.set("direccion_privada", "Calle Reservada 789");
    fd.set("privado_lat", "22.16"); fd.set("privado_lng", "-100.99"); fd.set("revelar_horas", "24");
    expect((await actualizarEvento(ID, null, fd)).ok).toBe(true);
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_datos: { sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: true },
      p_privado: { direccion: "Calle Reservada 789", lat: 22.16, lng: -100.99 } });
    expect(JSON.stringify(m.rpc.mock.calls[0][1].p_datos)).not.toContain("Calle Reservada");
  });
});
