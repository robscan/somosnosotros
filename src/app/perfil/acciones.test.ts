import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardarSuscripcionPush, suscripcionPushActiva } from "./acciones";

const mocks = vi.hoisted(() => ({ cliente: vi.fn(), usuario: vi.fn(), upsert: vi.fn(), perfil: vi.fn(),
  filtroPerfil: vi.fn(), seleccionar: vi.fn(), filtro: vi.fn(), leer: vi.fn(), invalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidar }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: mocks.cliente }));

const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/prueba", keys: {
  p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url"),
} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usuario.mockResolvedValue({ data: { user: { id: "persona" } }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.perfil.mockResolvedValue({ data: { id: "persona", avisos_push: true }, error: null });
  mocks.filtroPerfil.mockReturnValue({ select: () => ({ maybeSingle: mocks.perfil }) });
  mocks.leer.mockResolvedValue({ data: { endpoint: sub.endpoint, perfiles: { avisos_push: true } }, error: null });
  const lectura = { eq: mocks.filtro, maybeSingle: mocks.leer };
  mocks.filtro.mockReturnValue(lectura);
  mocks.seleccionar.mockReturnValue(lectura);
  mocks.cliente.mockResolvedValue({
    auth: { getUser: mocks.usuario },
    from: (table: string) => table === "suscripciones_push"
      ? { upsert: mocks.upsert, select: mocks.seleccionar }
      : { update: () => ({ eq: mocks.filtroPerfil }) },
  });
});

describe("guardarSuscripcionPush", () => {
  it("rechaza destinos externos antes de consultar la base", async () => {
    expect(await guardarSuscripcionPush({ ...sub, endpoint: "https://example.invalid/push" })).toBe(false);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("rechaza llaves invalidas antes de consultar la base", async () => {
    expect(await guardarSuscripcionPush({ ...sub, keys: { ...sub.keys, auth: "corta" } })).toBe(false);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("exige sesion", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: null } });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("registra solo en la cuenta autenticada", async () => {
    expect(await guardarSuscripcionPush(sub)).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith({ endpoint: sub.endpoint, usuario_id: "persona", ...sub.keys });
    expect(mocks.filtroPerfil).toHaveBeenCalledWith("id", "persona");
    expect(mocks.invalidar).toHaveBeenCalledTimes(2);
  });
  it("un rechazo de cupo no activa las preferencias", async () => {
    mocks.upsert.mockResolvedValue({ error: { code: "23514" } });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.perfil).not.toHaveBeenCalled();
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
  it("no confirma exito si fallan las preferencias", async () => {
    mocks.perfil.mockResolvedValue({ error: { message: "fallo" } });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
  it("no confirma un UPDATE de perfil que no encontro la cuenta", async () => {
    mocks.perfil.mockResolvedValue({ data: null, error: null });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
  it("un fallo de red al guardar permite reintentar la misma suscripcion", async () => {
    mocks.upsert.mockRejectedValueOnce(new Error("sin red"));
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(await guardarSuscripcionPush(sub)).toBe(true);
  });
  it("rechaza una sesion cuya verificacion fallo", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: { id: "persona" } }, error: { message: "sesion expirada" } });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});

describe("suscripcionPushActiva", () => {
  it("exige endpoint, cuenta y consentimiento en la misma consulta RLS", async () => {
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(true);
    expect(mocks.seleccionar).toHaveBeenCalledWith("endpoint, perfiles!inner(avisos_push)");
    expect(mocks.filtro.mock.calls).toEqual([
      ["endpoint", sub.endpoint], ["usuario_id", "persona"], ["perfiles.avisos_push", true],
    ]);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.perfil).not.toHaveBeenCalled();
  });
  it.each([null, 12, "https://example.invalid/push"])("rechaza entrada invalida: %s", async (endpoint) => {
    expect(await suscripcionPushActiva(endpoint as string)).toBe(false);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("sin sesion no consulta endpoints", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: null }, error: null });
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(false);
    expect(mocks.seleccionar).not.toHaveBeenCalled();
  });
  it("sin configuracion no declara encendido", async () => {
    mocks.cliente.mockResolvedValue(null);
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(false);
  });
  it("un error de autenticacion no autoriza la lectura", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: { id: "persona" } }, error: { message: "sesion expirada" } });
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(false);
    expect(mocks.seleccionar).not.toHaveBeenCalled();
  });
  it.each(["sin registro", "consentimiento apagado"])("no declara encendido: %s", async () => {
    mocks.leer.mockResolvedValue({ data: null, error: null });
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(false);
  });
  it("vuelve a comprobar la cuenta y no reutiliza el resultado anterior", async () => {
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(true);
    mocks.usuario.mockResolvedValue({ data: { user: { id: "otra" } }, error: null });
    mocks.leer.mockResolvedValue({ data: null, error: null });
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(false);
    expect(mocks.filtro).toHaveBeenCalledWith("usuario_id", "otra");
  });
  it("no acepta datos parciales de una consulta fallida", async () => {
    mocks.leer.mockResolvedValue({ data: { endpoint: sub.endpoint }, error: { message: "fallo" } });
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(false);
  });
  it("una excepcion de red devuelve apagado sin escribir", async () => {
    mocks.leer.mockRejectedValue(new Error("sin red"));
    expect(await suscripcionPushActiva(sub.endpoint)).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
