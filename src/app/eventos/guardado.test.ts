import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarEvento, crearEvento } from "./acciones";

const m = vi.hoisted(() => ({ rpc: vi.fn(), sesion: vi.fn(), after: vi.fn(), invalidar: vi.fn(), redirect: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.invalidar }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn(), esAdminDeSesion: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/cartel", () => ({ leerCartel: vi.fn() }));

const ID = "00000000-0000-4000-8000-000000000001";
const ANTERIOR = "00000000-0000-4000-8000-000000000002";
function formulario() {
  const fd = new FormData();
  fd.set("operacion", ID);
  fd.set("revision", "2030-09-01T12:00:00Z");
  for (const [k, v] of Object.entries({ modo_sitio: "otro", sitio_texto: "Plaza de prueba", titulo: "Evento", inicio: "2030-10-01T19:00", gratis: "si", quien: JSON.stringify([{ nombre: "Trio de prueba" }]) })) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  // El slug lo pone el disparador de la base; crearEvento lo relee con una consulta de sobra (bitácora 154).
  m.maybeSingle.mockResolvedValue({ data: null });
  const from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: m.maybeSingle })) })) }));
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc, from }, user: { id: ID } });
  m.rpc.mockResolvedValue({ data: { id: ID, artistas: [ID], artistas_anteriores: [ANTERIOR], lugar_anterior: ANTERIOR, cambio: "donde" }, error: null });
  m.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe("horario por día al publicar (OL-311)", () => {
  // Zona de las pruebas: sin punto, la de la ciudad inicial (UTC−6). Del 1 al 3 de octubre de 2030: de 19:00 a 21:00, y el segundo día desde las 17:00.
  const porDia = JSON.stringify([
    { inicio: "2030-10-01T19:00", fin: "2030-10-01T21:00" },
    { inicio: "2030-10-02T17:00", fin: "" },
    { inicio: "2030-10-03T19:00", fin: "2030-10-03T21:00" },
  ]);
  function conSesiones(sesiones: string | null = porDia) {
    const fd = formulario();
    fd.set("fin", "2030-10-03T21:00");
    fd.set("quedarse", "1");
    if (sesiones !== null) fd.set("sesiones", sesiones);
    return fd;
  }

  it("con sesiones guarda con la función que las escribe en la misma transacción, en instantes y con el fin nulo si no hay", async () => {
    expect((await crearEvento(null, conSesiones())).ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_sesiones", expect.objectContaining({
      p_evento: null,
      p_datos: expect.objectContaining({ inicio: "2030-10-02T01:00:00.000Z", fin: "2030-10-04T03:00:00.000Z" }),
      p_sesiones: [
        { inicio: "2030-10-02T01:00:00.000Z", fin: "2030-10-02T03:00:00.000Z" },
        { inicio: "2030-10-02T23:00:00.000Z", fin: null },
        { inicio: "2030-10-04T01:00:00.000Z", fin: "2030-10-04T03:00:00.000Z" },
      ],
    }));
    // Las sesiones no se cuelan en la fila del evento.
    expect(m.rpc.mock.calls[0][1].p_datos).not.toHaveProperty("sesiones");
    expect(m.after).toHaveBeenCalledTimes(1);
  });

  it("sin el campo (la casilla marcada) guarda como siempre, con la función de siempre", async () => {
    expect((await crearEvento(null, conSesiones(null))).ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_avisos", expect.not.objectContaining({ p_sesiones: expect.anything() }));
    expect(m.rpc.mock.calls[0][1]).not.toHaveProperty("p_sesiones");
  });

  it("un horario por día que no cuadra con el evento no llega a la base: el error sale junto al cuándo", async () => {
    const resultado = await crearEvento(null, conSesiones(JSON.stringify([{ inicio: "2030-10-01T18:00", fin: "" }, { inicio: "2030-10-03T19:00", fin: "" }])));
    expect(resultado).toMatchObject({ ok: false, errores: { sesiones: expect.stringContaining("no coinciden") } });
    expect(m.rpc).not.toHaveBeenCalled();
    expect((await crearEvento(null, conSesiones("no es json"))).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("si la base rechaza algo, no confirma ni avisa ni redirige (todo se revierte junto con el evento)", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "22023" } });
    const resultado = await crearEvento(null, conSesiones());
    expect(resultado).toMatchObject({ ok: false, general: expect.stringContaining("No se pudo publicar") });
    expect(m.after).not.toHaveBeenCalled();
    expect(m.redirect).not.toHaveBeenCalled();
  });
});

describe("guardado completo del evento", () => {
  it("cooperación solidaria llega a la RPC como precio, sin cifra", async () => {
    const fd = formulario();
    fd.set("gratis", "no");
    fd.set("cooperacion", "si");
    await expect(crearEvento(null, fd)).rejects.toThrow("REDIRECT");
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_avisos", expect.objectContaining({
      p_datos: expect.objectContaining({ precio: "Cooperación solidaria" }),
    }));
  });
  it("publica con una sola RPC, sin escrituras parciales separadas", async () => {
    await expect(crearEvento(null, formulario())).rejects.toThrow("REDIRECT");
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_avisos", expect.objectContaining({
      p_evento: null, p_privado: null, p_datos: expect.objectContaining({ titulo: "Evento" }),
      p_quien: [expect.objectContaining({ nombre: "Trio de prueba" })],
    }));
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.redirect).toHaveBeenCalledWith(`/eventos/${ID}?nuevo=1`, "replace");
  });

  it("con `quedarse` (el alta por pasos) devuelve lo publicado en vez de redirigir, con el mismo guardado y los mismos avisos", async () => {
    m.maybeSingle.mockResolvedValue({ data: { slug: "evento-ab12" } });
    const fd = formulario();
    fd.set("quedarse", "1");
    expect(await crearEvento(null, fd)).toEqual({ ok: true, id: ID, slug: "evento-ab12", href: "/eventos/evento-ab12", volver: "/eventos/evento-ab12" });
    expect(m.redirect).not.toHaveBeenCalled();
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.invalidar).toHaveBeenCalledWith("/eventos/evento-ab12");
  });

  it("con `quedarse` y sin slug todavía, la dirección cae al UUID como en la ficha", async () => {
    const fd = formulario();
    fd.set("quedarse", "1");
    expect(await crearEvento(null, fd)).toEqual({ ok: true, id: ID, slug: null, href: `/eventos/${ID}`, volver: `/eventos/${ID}` });
  });

  it("`quedarse` no cambia los errores: un formulario incompleto sigue sin llamar a la base", async () => {
    const fd = formulario();
    fd.set("quedarse", "1");
    fd.set("titulo", "");
    expect((await crearEvento(null, fd)).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("un fallo de cualquier parte no confirma, no avisa ni redirige", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "23514" } });
    expect((await crearEvento(null, formulario())).ok).toBe(false);
    expect(m.after).not.toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.redirect).not.toHaveBeenCalled();
  });

  it("editar no devuelve exito si el guardado atomico falla", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await actualizarEvento(ID, null, formulario())).ok).toBe(false);
    expect(m.after).not.toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
  });

  it("edita e invalida tanto artistas/lugar retirados como los actuales", async () => {
    expect((await actualizarEvento(ID, null, formulario())).ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.invalidar).toHaveBeenCalledWith(`/artistas/${ANTERIOR}`);
    expect(m.invalidar).toHaveBeenCalledWith(`/artistas/${ID}`);
    expect(m.invalidar).toHaveBeenCalledWith(`/lugares/${ANTERIOR}`);
    expect(m.after).toHaveBeenCalledTimes(1);
  });

  it("la validacion impide llamar a la base con un formulario incompleto", async () => {
    const fd = formulario();
    fd.set("titulo", "");
    expect((await crearEvento(null, fd)).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("un conflicto no avisa ni confirma el guardado", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    expect(await actualizarEvento(ID, null, formulario())).toEqual(expect.objectContaining({ ok: false, general: expect.stringContaining("cambió mientras") }));
    expect(m.after).not.toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_avisos", expect.objectContaining({ p_revision: "2030-09-01T12:00:00Z" }));
  });

  it("una pantalla antigua sin revision no sobreescribe el evento", async () => {
    const fd = formulario();
    fd.delete("revision");
    expect((await actualizarEvento(ID, null, fd)).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("recuperar un alta confirmada drena la misma cola sin crear otro aviso", async () => {
    m.rpc.mockResolvedValue({ data: { id: ID, artistas: [], repetido: true }, error: null });
    await expect(crearEvento(null, formulario())).rejects.toThrow("REDIRECT");
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.redirect).toHaveBeenCalledWith(`/eventos/${ID}?nuevo=1`, "replace");
  });

  it("no guarda sin una clave valida de operacion", async () => {
    const fd = formulario();
    fd.delete("operacion");
    expect((await crearEvento(null, fd)).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
