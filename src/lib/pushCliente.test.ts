import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { desuscribirPush, detalleNoSoportado, disponibilidadPush, estadoPush, observarEstadoPush, suscribirPush } from "./pushCliente";

const mocks = vi.hoisted(() => ({ activa: vi.fn(), tokenActivo: vi.fn(), suscripcion: vi.fn(), alta: vi.fn(), sesion: vi.fn(), desobservar: vi.fn(), unsuscribir: vi.fn() }));
vi.mock("@/app/perfil/acciones", () => ({ suscripcionPushActiva: mocks.activa, tokenApnsActivo: mocks.tokenActivo }));
vi.mock("./supabase/navegador", () => ({ clienteNavegador: () => ({ auth: { onAuthStateChange: mocks.sesion } }) }));

const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/prueba", toJSON: () => ({ keys: { p256dh: "p", auth: "a" } }), unsubscribe: mocks.unsuscribir };
const otraSub = { endpoint: "https://fcm.googleapis.com/fcm/send/nueva-propia", toJSON: () => ({ keys: { p256dh: "p2", auth: "a2" } }) };
let notification: { permission: NotificationPermission; requestPermission: ReturnType<typeof vi.fn> };
let avisarSesion: (evento: string) => void;
const observadores: ReturnType<typeof observarEstadoPush>[] = [];

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  mocks.activa.mockResolvedValue(true);
  mocks.suscripcion.mockResolvedValue(sub);
  mocks.alta.mockResolvedValue(sub);
  mocks.unsuscribir.mockResolvedValue(undefined);
  mocks.sesion.mockImplementation((callback) => {
    avisarSesion = callback;
    return { data: { subscription: { unsubscribe: mocks.desobservar } } };
  });
  notification = { permission: "granted", requestPermission: vi.fn().mockResolvedValue("granted") };
  vi.stubGlobal("Notification", notification);
  vi.stubGlobal("window", Object.assign(new EventTarget(), { matchMedia: () => ({ matches: true }), PushManager: {}, Notification: notification }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 Chrome/130.0.0.0", maxTouchPoints: 0, onLine: true,
    serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: mocks.suscripcion, subscribe: mocks.alta } }) },
  });
});

afterEach(() => {
  observadores.splice(0).forEach((observador) => observador.cerrar());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("estado push reconciliado", () => {
  it("comprobar compatibilidad antes de pedir permiso es sincrono y no consulta registro", () => {
    expect(disponibilidadPush("AA")).toBe("apagado");
    const alta = suscribirPush("AA");
    expect(notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(mocks.activa).not.toHaveBeenCalled();
    return expect(alta).resolves.toMatchObject({ ok: true });
  });
  it("solo declara encendido con confirmacion del servidor para ese endpoint", async () => {
    expect(await estadoPush("AA")).toBe("encendido");
    expect(mocks.activa).toHaveBeenCalledWith(sub.endpoint);
  });
  it("el alta rechazada por cupo sigue apagada al volver y puede reintentarse", async () => {
    mocks.suscripcion.mockResolvedValueOnce(null);
    expect((await suscribirPush("AA")).ok).toBe(true);
    mocks.activa.mockResolvedValue(false);
    expect(await estadoPush("AA")).toBe("apagado");
    // El servidor no confirma esa suscripción como propia de esta cuenta (aquí, por el cupo): el reintento no la
    // reutiliza a ciegas, la da de baja y pide una nueva (bitácora 166, OL-131) — por eso `alta` se llama otra vez.
    expect((await suscribirPush("AA")).ok).toBe(true);
    expect(mocks.alta).toHaveBeenCalledTimes(2);
    expect(mocks.unsuscribir).toHaveBeenCalledTimes(1);
    mocks.activa.mockResolvedValue(true);
    expect(await estadoPush("AA")).toBe("encendido");
  });
  it("reutiliza la suscripción del navegador si el servidor confirma que ya es de esta cuenta", async () => {
    // mocks.activa (beforeEach) ya resuelve true: la suscripción existente se queda tal cual, sin dar de baja ni pedir otra.
    const alta = await suscribirPush("AA");
    expect(alta).toEqual({ ok: true, sub: { endpoint: sub.endpoint, keys: { p256dh: "p", auth: "a" } } });
    expect(mocks.unsuscribir).not.toHaveBeenCalled();
    expect(mocks.alta).not.toHaveBeenCalled();
  });
  it("una suscripción del navegador que es de OTRA cuenta se da de baja y se pide una propia (bitácora 166, OL-131)", async () => {
    // Medido: hay un solo PushSubscription por origen; si otra cuenta ya la registró en esta computadora,
    // guardarla para la cuenta de ahora la base la rechaza (el endpoint no se transfiere de una cuenta a otra).
    mocks.activa.mockResolvedValue(false); // el servidor no la reconoce como de esta cuenta
    mocks.alta.mockResolvedValueOnce(otraSub);
    const alta = await suscribirPush("AA");
    expect(mocks.unsuscribir).toHaveBeenCalledTimes(1);
    expect(mocks.alta).toHaveBeenCalledTimes(1);
    expect(alta).toEqual({ ok: true, sub: { endpoint: otraSub.endpoint, keys: { p256dh: "p2", auth: "a2" } } });
  });
  it("sin suscripción previa, no consulta al servidor antes de pedir una (nada que confirmar)", async () => {
    mocks.suscripcion.mockResolvedValueOnce(null);
    await suscribirPush("AA");
    expect(mocks.activa).not.toHaveBeenCalled();
    expect(mocks.alta).toHaveBeenCalledTimes(1);
  });
  it("no conserva encendido cuando cambia la cuenta o se revoca el consentimiento", async () => {
    expect(await estadoPush("AA")).toBe("encendido");
    mocks.activa.mockResolvedValue(false);
    expect(await estadoPush("AA")).toBe("apagado");
    expect(mocks.activa).toHaveBeenCalledTimes(2);
  });
  it("si el navegador silencia el permiso (Chrome deja un icono y no resuelve), no se queda esperando para siempre", async () => {
    notification.requestPermission.mockImplementation(() => new Promise(() => {})); // nunca resuelve, como el icono sin tocar
    const alta = suscribirPush("AA");
    await vi.advanceTimersByTimeAsync(8000);
    expect(await alta).toEqual({ ok: false, motivo: "silenciado" });
  });
  it("con el permiso concedido, si el navegador se niega a registrar el aviso, se distingue de un fallo cualquiera (bitácora 164)", async () => {
    // Medido en Chrome real con un perfil efímero: AbortError "Registration failed - permission denied" aunque
    // Notification.permission diga "granted" — el mismo error que documenta Chromium cuando el sistema tiene
    // apagados los avisos del navegador. El código no debe tragárselo como un "fallo" genérico.
    mocks.suscripcion.mockResolvedValueOnce(null);
    mocks.alta.mockRejectedValueOnce(Object.assign(new Error("Registration failed - permission denied"), { name: "AbortError" }));
    expect(await suscribirPush("AA")).toEqual({ ok: false, motivo: "rechazado", detalle: "AbortError: Registration failed - permission denied" });
  });
  it("un rechazo sin mensaje solo lleva el nombre del error", async () => {
    mocks.suscripcion.mockResolvedValueOnce(null);
    mocks.alta.mockRejectedValueOnce(Object.assign(new Error(), { name: "AbortError" }));
    expect(await suscribirPush("AA")).toEqual({ ok: false, motivo: "rechazado", detalle: "AbortError" });
  });
  it("si la confirmación del servidor se cuelga, no deja el interruptor deshabilitado para siempre (bitácora 166, OL-131)", async () => {
    // Antes de esto: `estado` se quedaría en null y el interruptor deshabilitado sin ningún aviso — el caso
    // medido en Ajustes con la cuenta de Gmail. Se resuelve tarde (no nunca) para no dejar nada pendiente al
    // terminar la prueba; lo que importa es que `estadoPush` no espera esa resolución tardía.
    let terminar!: (activa: boolean) => void;
    mocks.activa.mockImplementation(() => new Promise<boolean>((resolve) => { terminar = resolve; }));
    const resultado = estadoPush("AA");
    await vi.advanceTimersByTimeAsync(8000);
    expect(await resultado).toBe("apagado");
    terminar(true);
    await vi.advanceTimersByTimeAsync(0);
  });
  it("un fallo de red conserva la opcion de reintentar", async () => {
    mocks.activa.mockRejectedValueOnce(new Error("sin red"));
    expect(await estadoPush("AA")).toBe("apagado");
    expect(await estadoPush("AA")).toBe("encendido");
  });
  it("un fallo del navegador tampoco declara encendido", async () => {
    mocks.suscripcion.mockRejectedValue(new Error("service worker fallo"));
    expect(await estadoPush("AA")).toBe("apagado");
    expect(mocks.activa).not.toHaveBeenCalled();
  });
  it("sin suscripcion no consulta el servidor", async () => {
    mocks.suscripcion.mockResolvedValue(null);
    expect(await estadoPush("AA")).toBe("apagado");
    expect(mocks.activa).not.toHaveBeenCalled();
  });
  it("sin permiso concedido no basta una suscripcion vieja", async () => {
    notification.permission = "default";
    expect(await estadoPush("AA")).toBe("apagado");
    notification.permission = "denied";
    expect(await estadoPush("AA")).toBe("bloqueado");
    expect(mocks.activa).not.toHaveBeenCalled();
  });
  it("sin configuracion mantiene no-soportado", async () => {
    expect(await estadoPush("")).toBe("no-soportado");
    Object.assign(navigator, { onLine: false });
    expect(await estadoPush("")).toBe("no-soportado");
    expect(mocks.activa).not.toHaveBeenCalled();
  });
  it("sin conexion no reutiliza una confirmacion anterior", async () => {
    expect(await estadoPush("AA")).toBe("encendido");
    Object.assign(navigator, { onLine: false });
    expect(await estadoPush("AA")).toBe("apagado");
    expect(mocks.activa).toHaveBeenCalledTimes(1);
  });
});

describe("observacion del estado push", () => {
  function observar() {
    const recibir = vi.fn();
    const observador = observarEstadoPush("AA", recibir);
    observadores.push(observador);
    return { recibir, observador };
  }

  it("descarta la respuesta de la cuenta anterior al cambiar de sesion", async () => {
    let terminar!: (activa: boolean) => void;
    mocks.activa.mockImplementationOnce(() => new Promise<boolean>((resolve) => { terminar = resolve; }));
    const { recibir } = observar();
    await vi.waitFor(() => expect(mocks.activa).toHaveBeenCalledTimes(1));
    mocks.activa.mockResolvedValue(false);
    avisarSesion("SIGNED_IN");
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("apagado"));
    terminar(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(recibir.mock.calls).not.toContainEqual(["encendido"]);
  });

  it("al cerrar sesion invalida encendido antes de recibir la nueva lectura", async () => {
    const { recibir } = observar();
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("encendido"));
    mocks.activa.mockResolvedValue(false);
    avisarSesion("SIGNED_OUT");
    expect(recibir).toHaveBeenLastCalledWith(null);
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("apagado"));
  });

  it("relee al volver a la app y al recuperar conexion", async () => {
    const { recibir } = observar();
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("encendido"));
    Object.assign(navigator, { onLine: false });
    window.dispatchEvent(new Event("offline"));
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("apagado"));
    Object.assign(navigator, { onLine: true });
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("encendido"));
    mocks.activa.mockResolvedValue(false);
    window.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("apagado"));
    mocks.activa.mockResolvedValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("encendido"));
  });

  it("fijar encendido tras un alta requiere confirmar la sesion actual", async () => {
    mocks.activa.mockResolvedValue(false);
    const { recibir, observador } = observar();
    await vi.waitFor(() => expect(recibir).toHaveBeenLastCalledWith("apagado"));
    observador.fijar("encendido");
    await vi.waitFor(() => expect(mocks.activa).toHaveBeenCalledTimes(2));
    expect(recibir.mock.calls).not.toContainEqual(["encendido"]);
  });

  it("una baja local invalida cualquier lectura anterior pendiente", async () => {
    let terminar!: (activa: boolean) => void;
    mocks.activa.mockImplementationOnce(() => new Promise<boolean>((resolve) => { terminar = resolve; }));
    const { recibir, observador } = observar();
    await vi.waitFor(() => expect(mocks.activa).toHaveBeenCalledTimes(1));
    observador.fijar("apagado");
    terminar(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(recibir).toHaveBeenLastCalledWith("apagado");
  });

  it("desmontar retira observadores y descarta respuestas pendientes", async () => {
    let terminar!: (activa: boolean) => void;
    mocks.activa.mockImplementationOnce(() => new Promise<boolean>((resolve) => { terminar = resolve; }));
    const { recibir, observador } = observar();
    await vi.waitFor(() => expect(mocks.activa).toHaveBeenCalledTimes(1));
    observador.cerrar();
    recibir.mockClear();
    terminar(true);
    window.dispatchEvent(new Event("focus"));
    avisarSesion("SIGNED_IN");
    await vi.advanceTimersByTimeAsync(0);
    expect(recibir).not.toHaveBeenCalled();
    expect(mocks.desobservar).toHaveBeenCalled();
  });
});

describe("detalleNoSoportado", () => {
  it("distingue la llave que falta (nuestra) de un navegador sin las APIs (suya)", () => {
    expect(detalleNoSoportado("")).toBe("Falta la llave pública de avisos en este despliegue");
    expect(detalleNoSoportado("AA")).toBeNull(); // navigator/window del beforeEach sí tienen las tres APIs
  });
  it("nombra lo que falta cuando el navegador no las tiene", () => {
    vi.stubGlobal("window", Object.assign(new EventTarget(), { matchMedia: () => ({ matches: true }) })); // sin PushManager
    expect(detalleNoSoportado("AA")).toBe("Este navegador no tiene Service Worker, Push o Notification");
  });
});

// ---------- OL-213 (bitácora 242): dentro de la app de iPhone no hay PushManager; todo pasa por el puente que
// agrega @capacitor/push-notifications (window.Capacitor.Plugins.*), sin paquete nuevo en la web. ----------
describe("dentro de la app de iPhone (APNs)", () => {
  const NATIVO = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 SomosNosotrosApp";
  const CLAVE = "somosnosotros:apns-token";
  let almacen: Map<string, string>;
  let puente: { checkPermissions: ReturnType<typeof vi.fn>; requestPermissions: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn>; unregister: ReturnType<typeof vi.fn>; addListener: ReturnType<typeof vi.fn> };
  let listeners: Record<string, Array<(arg: { value?: string }) => void>>;

  beforeEach(() => {
    almacen = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (almacen.has(k) ? (almacen.get(k) as string) : null),
      setItem: (k: string, v: string) => { almacen.set(k, v); },
      removeItem: (k: string) => { almacen.delete(k); },
    });
    listeners = {};
    puente = {
      checkPermissions: vi.fn().mockResolvedValue({ receive: "granted" }),
      requestPermissions: vi.fn().mockResolvedValue({ receive: "granted" }),
      register: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn((evento: string, cb: (arg: { value?: string }) => void) => {
        (listeners[evento] ??= []).push(cb);
        return Promise.resolve({ remove: vi.fn() });
      }),
    };
    vi.stubGlobal("navigator", { userAgent: NATIVO, maxTouchPoints: 5, onLine: true });
    (window as unknown as { Capacitor?: unknown }).Capacitor = {
      Plugins: { PushNotifications: puente, EntornoApns: { entorno: vi.fn().mockResolvedValue({ entorno: "sandbox" }) } },
    };
  });

  function dispararRegistro(token: string) {
    listeners.registration?.forEach((cb) => cb({ value: token }));
  }
  function dispararErrorDeRegistro() {
    listeners.registrationError?.forEach((cb) => cb({}));
  }

  it("disponibilidadPush usa el puente nativo, no la llave VAPID ni las tres APIs del navegador", () => {
    expect(disponibilidadPush("")).toBe("apagado");
  });
  it("sin el puente (no debería pasar dentro de la app real), no-soportado", () => {
    (window as unknown as { Capacitor?: unknown }).Capacitor = undefined;
    expect(disponibilidadPush("")).toBe("no-soportado");
  });
  it("suscribirPush pide permiso si hace falta, espera el token del evento 'registration' y guarda el entorno que dio la app", async () => {
    puente.checkPermissions.mockResolvedValue({ receive: "prompt" });
    const alta = suscribirPush("");
    await vi.waitFor(() => expect(puente.register).toHaveBeenCalled());
    dispararRegistro("token-nativo");
    expect(await alta).toEqual({ ok: true, sub: { apns: { token: "token-nativo", entorno: "sandbox" } } });
    expect(localStorage.getItem(CLAVE)).toBe("token-nativo");
    expect(puente.requestPermissions).toHaveBeenCalled();
  });
  it("con el permiso ya concedido, no lo vuelve a pedir", async () => {
    const alta = suscribirPush("");
    await vi.waitFor(() => expect(puente.register).toHaveBeenCalled());
    dispararRegistro("token-nativo");
    await alta;
    expect(puente.requestPermissions).not.toHaveBeenCalled();
  });
  it("permiso bloqueado no llega a pedir el token", async () => {
    puente.checkPermissions.mockResolvedValue({ receive: "denied" });
    expect(await suscribirPush("")).toEqual({ ok: false, motivo: "bloqueado" });
    expect(puente.register).not.toHaveBeenCalled();
  });
  it("si la app devuelve el oyente sin promesa (window.Capacitor.Plugins), el alta sigue (OL-220)", async () => {
    puente.addListener.mockImplementation((evento: string, cb: (arg: { value?: string }) => void) => {
      (listeners[evento] ??= []).push(cb);
      return { remove: vi.fn() };
    });
    const alta = suscribirPush("");
    await vi.waitFor(() => expect(puente.register).toHaveBeenCalled());
    dispararRegistro("a".repeat(64));
    expect(await alta).toMatchObject({ ok: true });
  });
  it("un registrationError sin token es un fallo, no un bloqueo (el permiso sí se concedió)", async () => {
    const alta = suscribirPush("");
    await vi.waitFor(() => expect(puente.register).toHaveBeenCalled());
    dispararErrorDeRegistro();
    expect(await alta).toEqual({ ok: false, motivo: "fallo" });
  });
  it("sin respuesta del evento de registro a tiempo, fallo (con tope, como el resto del archivo)", async () => {
    vi.useFakeTimers();
    const alta = suscribirPush("");
    await vi.advanceTimersByTimeAsync(8000);
    expect(await alta).toEqual({ ok: false, motivo: "fallo" });
    vi.useRealTimers();
  });
  it("estadoPush sin token guardado en este teléfono esta apagado, sin consultar el servidor", async () => {
    expect(await estadoPush("")).toBe("apagado");
    expect(mocks.tokenActivo).not.toHaveBeenCalled();
  });
  it("estadoPush con token guardado consulta al servidor con ESE token", async () => {
    almacen.set(CLAVE, "token-guardado");
    mocks.tokenActivo.mockResolvedValue(true);
    expect(await estadoPush("")).toBe("encendido");
    expect(mocks.tokenActivo).toHaveBeenCalledWith("token-guardado");
  });
  it("estadoPush con token guardado pero sin consentimiento del servidor esta apagado", async () => {
    almacen.set(CLAVE, "token-guardado");
    mocks.tokenActivo.mockResolvedValue(false);
    expect(await estadoPush("")).toBe("apagado");
  });
  it("desuscribirPush llama unregister y devuelve el token guardado, para borrarlo en la base", async () => {
    almacen.set(CLAVE, "token-viejo");
    expect(await desuscribirPush()).toEqual({ tipo: "apns", token: "token-viejo" });
    expect(puente.unregister).toHaveBeenCalled();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
  it("desuscribirPush sin token guardado no tiene nada que borrar en la base", async () => {
    expect(await desuscribirPush()).toBeNull();
  });
});
