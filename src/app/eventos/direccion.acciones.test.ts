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
    sitio_pin_pendiente: "no", ciudad: "San Luis Potosí", titulo: "Evento", inicio: "2030-10-01T19:00", gratis: "si", quien: "[]" })) fd.set(k, v);
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
  it("edita un reservado vencido sin reponer dirección y conserva su zona", async () => {
    m.maybeSingle.mockResolvedValue({ data: { sitio_reservado: true, inicio: "2000-01-01T12:00:00Z", fin: null, zona: "Asia/Tokyo", imagen: null } });
    const fd = formulario(); fd.set("modo_sitio", "reservado"); fd.set("inicio", "2000-01-01T21:00");
    expect((await actualizarEvento(ID, null, fd)).ok).toBe(true);
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_privado: null, p_datos: { sitio_reservado: true, zona: "Asia/Tokyo", inicio: "2000-01-01T12:00:00.000Z" } });
  });
  it("un reservado vencido reprogramado exige una dirección nueva", async () => {
    m.maybeSingle.mockResolvedValue({ data: { sitio_reservado: true, inicio: "2000-01-01T12:00:00Z", fin: null, zona: "Asia/Tokyo" } });
    const fd = formulario(); fd.set("modo_sitio", "reservado");
    expect(await actualizarEvento(ID, null, fd)).toMatchObject({ ok: false, errores: { direccion_privada: expect.any(String) } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("un campo manipulado no habilita la omisión en un evento vigente", async () => {
    const fd = formulario(); fd.set("modo_sitio", "reservado"); fd.set("direccion_retirada", "si");
    expect(await actualizarEvento(ID, null, fd)).toMatchObject({ ok: false, errores: { direccion_privada: expect.any(String) } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
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

const SIN_CIUDAD = "No pudimos saber en qué ciudad está. Intenta de nuevo.";

/** OL-299: la ciudad de un evento en «otro sitio» ya no cae en San Luis Potosí en silencio cuando hay un punto. */
describe("ciudad del evento en otro sitio", () => {
  it("el alta con un pin de otra ciudad guarda esa ciudad, no la inicial", async () => {
    const fd = formulario(); fd.set("ciudad", "Querétaro");
    await expect(crearEvento(null, fd)).rejects.toThrow("REDIRECT");
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_datos: { ciudad: "Querétaro" } });
  });
  it("el alta con un pin y sin ciudad no se publica y lo dice en la dirección del sitio", async () => {
    const fd = formulario(); fd.set("ciudad", "");
    expect(await crearEvento(null, fd)).toEqual({ ok: false, errores: { sitio_direccion: SIN_CIUDAD } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("un reservado con pin nuevo y sin ciudad tampoco, y lo dice en la dirección privada", async () => {
    const fd = formulario(); fd.set("ciudad", ""); fd.set("modo_sitio", "reservado"); fd.set("direccion_privada", "Calle Reservada 789");
    fd.set("privado_lat", "20.6"); fd.set("privado_lng", "-100.4");
    expect(await crearEvento(null, fd)).toEqual({ ok: false, errores: { direccion_privada: SIN_CIUDAD } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("un sitio escrito sin coordenadas no tiene de dónde deducir la ciudad: sigue en la inicial y se publica", async () => {
    const fd = formulario(); fd.set("ciudad", ""); fd.set("sitio_direccion", ""); fd.set("sitio_lat", ""); fd.set("sitio_lng", "");
    await expect(crearEvento(null, fd)).rejects.toThrow("REDIRECT");
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_datos: { ciudad: "San Luis Potosí" } });
  });
  it("(edición) con el mismo pin y sin ciudad en el formulario conserva la del evento guardado", async () => {
    m.maybeSingle.mockResolvedValue({ data: { sitio_reservado: false, inicio: "2030-10-01T19:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, ciudad: "Querétaro", sitio_lat: 22.15, sitio_lng: -100.98 } });
    const fd = formulario(); fd.set("ciudad", "");
    expect((await actualizarEvento(ID, null, fd)).ok).toBe(true);
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_evento: ID, p_datos: { ciudad: "Querétaro" } });
  });
  it("(edición) moviendo el pin a un punto sin ciudad no se guarda y lo dice", async () => {
    m.maybeSingle.mockResolvedValue({ data: { sitio_reservado: false, inicio: "2030-10-01T19:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, ciudad: "Querétaro", sitio_lat: 20.6, sitio_lng: -100.4 } });
    const fd = formulario(); fd.set("ciudad", "");
    expect(await actualizarEvento(ID, null, fd)).toEqual({ ok: false, errores: { sitio_direccion: SIN_CIUDAD } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
