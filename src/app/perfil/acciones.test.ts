import { beforeEach, describe, expect, it, vi } from "vitest";
import { borrarSuscripcionPush, guardarSuscripcionPush, suscripcionPushActiva, tokenApnsActivo } from "./acciones";

const mocks = vi.hoisted(() => ({ cliente: vi.fn(), usuario: vi.fn(), upsert: vi.fn(), perfil: vi.fn(),
  filtroPerfil: vi.fn(), seleccionar: vi.fn(), filtro: vi.fn(), leer: vi.fn(), invalidar: vi.fn(),
  apnsUpsert: vi.fn(), apnsSeleccionar: vi.fn(), apnsFiltro: vi.fn(), apnsLeer: vi.fn(),
  borrarWeb: vi.fn(), borrarApns: vi.fn(), contarWeb: vi.fn(), contarApns: vi.fn(),
  // `after` (OL-212, tercera vuelta): aquí se ejecuta el cuerpo al toque, como si la respuesta ya hubiera salido,
  // para que las pruebas de abajo (ya escritas antes de esta pieza) seguir viendo `invalidar` sin tocarlas; la
  // prueba nueva de cada bloque comprueba que se llamó a `after` (no a `revalidatePath` directo) para demostrar
  // que la revalidación quedó aplazada y no repinta la pantalla desde la que se guarda.
  despues: vi.fn((cuerpo: () => void) => cuerpo()) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidar }));
vi.mock("next/server", () => ({ after: mocks.despues }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: mocks.cliente }));

const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/prueba", keys: {
  p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url"),
} };
const TOKEN_APNS = "a".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usuario.mockResolvedValue({ data: { user: { id: "persona" } }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.apnsUpsert.mockResolvedValue({ error: null });
  mocks.perfil.mockResolvedValue({ data: { id: "persona", avisos_push: true }, error: null });
  mocks.filtroPerfil.mockReturnValue({ select: () => ({ maybeSingle: mocks.perfil }) });
  mocks.leer.mockResolvedValue({ data: { endpoint: sub.endpoint, perfiles: { avisos_push: true } }, error: null });
  const lectura = { eq: mocks.filtro, maybeSingle: mocks.leer };
  mocks.filtro.mockReturnValue(lectura);
  mocks.seleccionar.mockReturnValue(lectura);
  mocks.apnsLeer.mockResolvedValue({ data: { token: TOKEN_APNS, perfiles: { avisos_push: true } }, error: null });
  const lecturaApns = { eq: mocks.apnsFiltro, maybeSingle: mocks.apnsLeer };
  mocks.apnsFiltro.mockReturnValue(lecturaApns);
  mocks.apnsSeleccionar.mockReturnValue(lecturaApns);
  mocks.borrarWeb.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
  mocks.borrarApns.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
  mocks.contarWeb.mockReturnValue({ eq: () => Promise.resolve({ count: 0 }) });
  mocks.contarApns.mockReturnValue({ eq: () => Promise.resolve({ count: 0 }) });
  // `select(cols, { count, head })` (quedanDispositivos) usa una segunda firma; se distingue por el número de
  // argumentos de `select(cols)` (suscripcionPushActiva/tokenApnsActivo), que solo recibe uno.
  mocks.cliente.mockImplementation(async () => ({
    auth: { getUser: mocks.usuario },
    from: (table: string) => ({
      upsert: table === "suscripciones_push" ? mocks.upsert : mocks.apnsUpsert,
      delete: table === "suscripciones_push" ? mocks.borrarWeb : mocks.borrarApns,
      select: (...args: unknown[]) => (args.length > 1
        ? (table === "suscripciones_push" ? mocks.contarWeb() : mocks.contarApns())
        : (table === "suscripciones_push" ? mocks.seleccionar(args[0] as string) : mocks.apnsSeleccionar(args[0] as string))),
      update: () => ({ eq: mocks.filtroPerfil }),
    }),
  }));
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
  it("OL-212 (tercera vuelta): revalida con `after`, no de inmediato — quien llama ya se entera solo (onDecidido, su propio estado o su propio router.refresh), y revalidar aquí de más solo repintaría la pantalla desde la que se guarda", async () => {
    expect(await guardarSuscripcionPush(sub)).toBe(true);
    expect(mocks.despues).toHaveBeenCalledTimes(1);
    expect(mocks.despues).toHaveBeenCalledWith(expect.any(Function));
    expect(mocks.invalidar).toHaveBeenCalledWith("/perfil");
    expect(mocks.invalidar).toHaveBeenCalledWith("/");
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

// ---------- OL-213 (bitácora 242): dentro de la app de iPhone no hay endpoint/llaves, solo un token APNs; mismas
// reglas que arriba (cuenta autenticada, consentimiento en la misma consulta RLS), tabla distinta. ----------
describe("guardarSuscripcionPush: token APNs (dentro de la app)", () => {
  it("registra en dispositivos_apns, no en suscripciones_push", async () => {
    expect(await guardarSuscripcionPush({ apns: { token: TOKEN_APNS, entorno: "sandbox" } })).toBe(true);
    expect(mocks.apnsUpsert).toHaveBeenCalledWith({ token: TOKEN_APNS, usuario_id: "persona", entorno: "sandbox", actualizado_en: expect.any(String) });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.invalidar).toHaveBeenCalledTimes(2);
  });
  it("OL-212 (tercera vuelta): revalida con `after`, no de inmediato (mismo motivo que la suscripción web)", async () => {
    expect(await guardarSuscripcionPush({ apns: { token: TOKEN_APNS, entorno: "sandbox" } })).toBe(true);
    expect(mocks.despues).toHaveBeenCalledTimes(1);
    expect(mocks.despues).toHaveBeenCalledWith(expect.any(Function));
  });
  it("rechaza un token con forma invalida antes de consultar la base", async () => {
    expect(await guardarSuscripcionPush({ apns: { token: "no-es-hex", entorno: "sandbox" } })).toBe(false);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("no confirma exito si fallan las preferencias", async () => {
    mocks.perfil.mockResolvedValue({ error: { message: "fallo" } });
    expect(await guardarSuscripcionPush({ apns: { token: TOKEN_APNS, entorno: "produccion" } })).toBe(false);
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
});

describe("tokenApnsActivo", () => {
  it("exige token, cuenta y consentimiento en la misma consulta RLS", async () => {
    expect(await tokenApnsActivo(TOKEN_APNS)).toBe(true);
    expect(mocks.apnsSeleccionar).toHaveBeenCalledWith("token, perfiles!inner(avisos_push)");
    expect(mocks.apnsFiltro.mock.calls).toEqual([
      ["token", TOKEN_APNS], ["usuario_id", "persona"], ["perfiles.avisos_push", true],
    ]);
  });
  it.each([null, 12, "no-es-hex"])("rechaza entrada invalida: %s", async (token) => {
    expect(await tokenApnsActivo(token as string)).toBe(false);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("sin registro o sin consentimiento no declara encendido", async () => {
    mocks.apnsLeer.mockResolvedValue({ data: null, error: null });
    expect(await tokenApnsActivo(TOKEN_APNS)).toBe(false);
  });
});

describe("borrarSuscripcionPush", () => {
  it("un endpoint de navegador se borra de suscripciones_push, nunca de dispositivos_apns", async () => {
    await borrarSuscripcionPush({ tipo: "web", endpoint: sub.endpoint });
    expect(mocks.borrarWeb).toHaveBeenCalled();
    expect(mocks.borrarApns).not.toHaveBeenCalled();
  });
  it("un token APNs se borra de dispositivos_apns, nunca de suscripciones_push", async () => {
    await borrarSuscripcionPush({ tipo: "apns", token: TOKEN_APNS });
    expect(mocks.borrarApns).toHaveBeenCalled();
    expect(mocks.borrarWeb).not.toHaveBeenCalled();
  });
  it("apaga avisos_push solo si no queda NINGÚN dispositivo (ni navegador ni app)", async () => {
    await borrarSuscripcionPush({ tipo: "web", endpoint: sub.endpoint });
    expect(mocks.filtroPerfil).toHaveBeenCalledWith("id", "persona");
  });
  it("borrar el último navegador no apaga la cuenta si el teléfono con la app sigue dado de alta", async () => {
    mocks.contarApns.mockReturnValue({ eq: () => Promise.resolve({ count: 1 }) });
    await borrarSuscripcionPush({ tipo: "web", endpoint: sub.endpoint });
    expect(mocks.filtroPerfil).not.toHaveBeenCalled();
  });
  it("borrar el último token APNs no apaga la cuenta si un navegador sigue dado de alta", async () => {
    mocks.contarWeb.mockReturnValue({ eq: () => Promise.resolve({ count: 1 }) });
    await borrarSuscripcionPush({ tipo: "apns", token: TOKEN_APNS });
    expect(mocks.filtroPerfil).not.toHaveBeenCalled();
  });
  it("sin sesion no toca la base", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: null }, error: null });
    await borrarSuscripcionPush({ tipo: "web", endpoint: sub.endpoint });
    expect(mocks.filtroPerfil).not.toHaveBeenCalled();
  });
});
