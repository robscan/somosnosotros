/** Avisos push desde el navegador: qué se puede en este teléfono y cómo darlo de alta. Solo en el cliente. */
import { decidirEstadoPush, leerPlataforma, type EstadoPush, type Plataforma } from "./plataforma";
import { suscripcionPushActiva, tokenApnsActivo } from "@/app/perfil/acciones";
import { clienteNavegador } from "./supabase/navegador";
import { esAppNativa } from "./appNativa";
import type { EntornoApns } from "./dispositivosApns";

export type { EstadoPush } from "./plataforma";

// ---------- OL-213 (bitácora 242): dentro de la app de iPhone no hay Web Push (PushManager no existe en su
// WKWebView), así que aquí abajo cada función que pide permiso, da de alta o consulta el estado se desvía al
// puente nativo que agrega @capacitor/push-notifications (apps/ios/package.json; sin paquete nuevo en la web: el
// bridge lo inyecta la app en cualquier página que cargue, `window.Capacitor.Plugins.*`, sin que la web lo
// importe). Fuera de la app (`esAppNativa` falso) nada de esta sección se toca: mismo camino de siempre. ----------

type PuentePush = {
  checkPermissions(): Promise<{ receive: "granted" | "denied" | "prompt" }>;
  requestPermissions(): Promise<{ receive: "granted" | "denied" | "prompt" }>;
  register(): Promise<void>;
  unregister(): Promise<void>;
  // Por `window.Capacitor.Plugins` (sin el paquete de npm) la app devuelve el objeto para quitar el oyente directamente,
  // no una promesa: en TestFlight 1.0 (3) el `.then` rompía el alta (OL-220). Se aceptan las dos formas.
  addListener(evento: "registration", cb: (t: { value: string }) => void): Promise<Oyente> | Oyente;
  addListener(evento: "registrationError", cb: (e: { error: string }) => void): Promise<Oyente> | Oyente;
};
type PuenteEntorno = { entorno(): Promise<{ entorno: EntornoApns }> };
type Oyente = { remove: () => void | Promise<void> };
type Capacitor = { Plugins?: { PushNotifications?: PuentePush; EntornoApns?: PuenteEntorno } };

function puenteApns(): PuentePush | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: Capacitor }).Capacitor?.Plugins?.PushNotifications ?? null;
}

/** El puente nativo está: siempre dentro de la app (registrado por Capacitor), nunca fuera de ella. */
export function hayPuenteApns(): boolean {
  return !!puenteApns();
}

const CLAVE_TOKEN_APNS = "somosnosotros:apns-token";

// El permiso nativo solo se lee con una llamada async del puente (a diferencia de `Notification.permission`, que
// es síncrona); se cachea para que `disponibilidadPush` (síncrona, se llama desde el toque) tenga algo que decir de
// inmediato, y se refresca en cada llamada para que la siguiente lectura ya venga al día.
let permisoNativoCache: NotificationPermission | null = null;
function comoPermiso(receive: "granted" | "denied" | "prompt"): NotificationPermission {
  return receive === "prompt" ? "default" : receive;
}
function refrescarPermisoNativo(): void {
  const p = puenteApns();
  if (!p) return;
  p.checkPermissions().then((r) => { permisoNativoCache = comoPermiso(r.receive); }).catch(() => {});
}

// El entorno (sandbox/producción) no lo decide la web: lo sabe el compilador nativo (#if DEBUG, EntornoApnsPlugin.swift).
// Una sola consulta por sesión: no cambia mientras la app sigue abierta.
let entornoApnsCache: Promise<EntornoApns> | null = null;
function entornoApns(): Promise<EntornoApns> {
  const plugin = typeof window === "undefined" ? null : (window as unknown as { Capacitor?: Capacitor }).Capacitor?.Plugins?.EntornoApns;
  if (!plugin) return Promise.resolve("produccion");
  entornoApnsCache ??= plugin.entorno().then((r) => r.entorno).catch(() => "produccion" as const);
  return entornoApnsCache;
}

function base64AUint8(b64: string): Uint8Array {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

let plataformaGuardada: Plataforma | null = null;
/** Qué teléfono es: se lee una vez (en la misma pestaña no cambia). */
export function plataformaActual(): Plataforma {
  if (!plataformaGuardada) {
    const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    plataformaGuardada = leerPlataforma(navigator.userAgent, navigator.maxTouchPoints ?? 0, instalada);
  }
  return plataformaGuardada;
}

function hayAvisosEnElNavegador(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** El service worker listo, sin quedarse esperando para siempre si no se registró (navegadores dentro de otra app). */
async function registroListo(ms = 4000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/**
 * Con tope: si `promesa` no resuelve a tiempo, se rechaza en vez de quedarse esperando para siempre (mismo motivo
 * que `pedirPermiso` en `suscribirPush`, bitácora 164/166, OL-131). Sin esto, un `suscripcionPushActiva` que se
 * cuelga deja el interruptor de Ajustes deshabilitado sin ningún aviso, para siempre: el `catch` de `estadoPush`
 * ya sabe qué hacer con un fallo, pero solo si la promesa de verdad llega a fallar.
 */
function conTope<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const id = setTimeout(() => rechazar(new Error("tardó demasiado")), ms);
    promesa.then((v) => {
      clearTimeout(id);
      resolver(v);
    }, (e) => {
      clearTimeout(id);
      rechazar(e);
    });
  });
}

/** Compatibilidad local: permite pedir el permiso desde el toque, sin esperar una consulta de red. */
export function disponibilidadPush(llavePublica: string): EstadoPush {
  const p = plataformaActual();
  if (esAppNativa(navigator.userAgent)) {
    refrescarPermisoNativo();
    return decidirEstadoPush(p, { llave: true, soporte: hayPuenteApns(), permiso: permisoNativoCache, suscrito: false, nativo: true });
  }
  const soporte = hayAvisosEnElNavegador();
  const permiso = "Notification" in window ? Notification.permission : null;
  return decidirEstadoPush(p, { llave: !!llavePublica, soporte, permiso, suscrito: false });
}

/**
 * Por qué "no-soportado", en llano (OL-131, punto 3 del encargo): sin la llave pública o sin las tres APIs del
 * navegador son cosas distintas de arreglar (una es nuestra, la otra es del navegador de la persona), y el
 * subtítulo no lo distinguía. null si el estado no es "no-soportado".
 */
export function detalleNoSoportado(llavePublica: string): string | null {
  if (esAppNativa(navigator.userAgent)) return hayPuenteApns() ? null : "La app no pudo activar los avisos nativos";
  if (!llavePublica) return "Falta la llave pública de avisos en este despliegue";
  if (!hayAvisosEnElNavegador()) return "Este navegador no tiene Service Worker, Push o Notification";
  return null;
}

/** El estado encendido requiere registro y consentimiento de la cuenta actual en el servidor. */
export async function estadoPush(llavePublica: string): Promise<EstadoPush> {
  const disponible = disponibilidadPush(llavePublica);
  if (disponible !== "apagado") return disponible;
  if (esAppNativa(navigator.userAgent)) {
    const p = puenteApns();
    if (!p) return "apagado";
    let token: string | null = null;
    try { token = localStorage.getItem(CLAVE_TOKEN_APNS); } catch { /* modo privado: sin memoria, se vuelve a pedir */ }
    if (!token) return "apagado";
    try {
      const chequeo = await p.checkPermissions();
      permisoNativoCache = comoPermiso(chequeo.receive);
      if (chequeo.receive !== "granted" || navigator.onLine === false) return "apagado";
      return (await conTope(tokenApnsActivo(token), 8000)) ? "encendido" : "apagado";
    } catch {
      return "apagado";
    }
  }
  if (Notification.permission !== "granted" || navigator.onLine === false) return "apagado";
  try {
    const reg = await registroListo();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub && (await conTope(suscripcionPushActiva(sub.endpoint), 8000)) ? "encendido" : "apagado";
  } catch {
    // Un fallo de lectura, de red, o que se tardó de más (conTope) no prueba el alta; queda disponible el reintento.
    return "apagado";
  }
}

/** Relee al cambiar la sesion o volver a la app; una respuesta vieja no puede restaurar otra cuenta. */
export function observarEstadoPush(llavePublica: string, recibir: (estado: EstadoPush | null) => void) {
  let version = 0;
  let cerrado = false;
  async function leer() {
    if (cerrado) return;
    const actual = ++version;
    recibir(null);
    const estado = await estadoPush(llavePublica).catch(() => "apagado" as const);
    if (!cerrado && actual === version) recibir(estado);
  }
  function visible() {
    if (document.visibilityState === "visible") void leer();
  }
  const auth = clienteNavegador()?.auth.onAuthStateChange((evento) => {
    if (cerrado || evento === "INITIAL_SESSION") return;
    ++version;
    recibir(null);
    // La callback de Auth no debe esperar otra operacion de autenticacion.
    queueMicrotask(() => void leer());
  });
  window.addEventListener("focus", leer);
  window.addEventListener("online", leer);
  window.addEventListener("offline", leer);
  document.addEventListener("visibilitychange", visible);
  void leer();
  return {
    fijar(estado: EstadoPush) {
      if (cerrado) return;
      ++version;
      if (estado === "encendido") void leer();
      else recibir(estado);
    },
    cerrar() {
      if (cerrado) return;
      cerrado = true;
      ++version;
      auth?.data.subscription.unsubscribe();
      window.removeEventListener("focus", leer);
      window.removeEventListener("online", leer);
      window.removeEventListener("offline", leer);
      document.removeEventListener("visibilitychange", visible);
    },
  };
}

export type SuscripcionWeb = { endpoint: string; keys: { p256dh: string; auth: string } };
/** Lo que guarda un teléfono con la app: no hay endpoint ni llaves, solo el token que dio APNs y su entorno. */
export type SuscripcionApns = { apns: { token: string; entorno: EntornoApns } };
export type Suscripcion = SuscripcionWeb | SuscripcionApns;
export type ResultadoAlta =
  | { ok: true; sub: Suscripcion }
  | { ok: false; motivo: "bloqueado" | "silenciado" | "rechazado" | "fallo"; detalle?: string };

const TARDANDO = Symbol("tardando");

/**
 * Chrome de escritorio puede volver el permiso silencioso: en vez de su aviso, deja un icono junto a la dirección y la
 * promesa de `Notification.requestPermission()` se queda pendiente hasta que la persona lo note y lo toque (a veces
 * nunca). Sin este tope, el botón se quedaba "trabajando" para siempre y el toque parecía no haber hecho nada.
 */
async function pedirPermiso(ms = 8000): Promise<NotificationPermission | typeof TARDANDO> {
  return Promise.race([Notification.requestPermission(), new Promise<typeof TARDANDO>((r) => setTimeout(() => r(TARDANDO), ms))]);
}

/** Nombre y mensaje de un error de navegador, listos para el "(AbortError: …)" en gris chico (patrón de Pincel, OL-117). */
function detalleDe(e: unknown): string | undefined {
  const err = e as { name?: string; message?: string };
  if (!err?.name) return undefined;
  return err.message ? `${err.name}: ${err.message}` : err.name;
}

/** Como `pedirPermiso`, pero con el puente nativo (`requestPermissions` en vez de `Notification.requestPermission`). */
async function pedirPermisoNativo(p: PuentePush, ms = 8000): Promise<NotificationPermission | typeof TARDANDO> {
  return Promise.race([p.requestPermissions().then((r) => comoPermiso(r.receive)), new Promise<typeof TARDANDO>((r) => setTimeout(() => r(TARDANDO), ms))]);
}

/**
 * `register()` solo dispara el pedido; el token de verdad llega por el evento `registration` (o el error, por
 * `registrationError`) — con el mismo tope de 8 s que el resto de este archivo, para no dejar "Activando…" para
 * siempre si el evento nunca llega.
 */
function esperarTokenApns(p: PuentePush, ms = 8000): Promise<string | null> {
  return new Promise((resolver) => {
    let listo = false;
    const limpiar: Array<() => void> = [];
    const terminar = (valor: string | null) => {
      if (listo) return;
      listo = true;
      limpiar.forEach((f) => f());
      resolver(valor);
    };
    const id = setTimeout(() => terminar(null), ms);
    limpiar.push(() => clearTimeout(id));
    const guardar = (h: Promise<Oyente> | Oyente) =>
      Promise.resolve(h)
        .then((o) => limpiar.push(() => void o?.remove?.()))
        .catch(() => {});
    guardar(p.addListener("registration", (t) => terminar(t.value)));
    guardar(p.addListener("registrationError", () => terminar(null)));
    p.register().catch(() => terminar(null));
  });
}

/** El alta dentro de la app: permiso nativo + token APNs, sin llave VAPID ni Service Worker (OL-213, bitácora 242). */
async function suscribirApns(): Promise<ResultadoAlta> {
  const p = puenteApns();
  if (!p) return { ok: false, motivo: "fallo" };
  try {
    const chequeo = await p.checkPermissions();
    const permiso = chequeo.receive === "prompt" ? await pedirPermisoNativo(p) : comoPermiso(chequeo.receive);
    if (permiso === TARDANDO) return { ok: false, motivo: "silenciado" };
    permisoNativoCache = permiso;
    if (permiso === "denied") return { ok: false, motivo: "bloqueado" };
    if (permiso !== "granted") return { ok: false, motivo: "fallo" };
    const token = await esperarTokenApns(p);
    if (!token) return { ok: false, motivo: "fallo" };
    try { localStorage.setItem(CLAVE_TOKEN_APNS, token); } catch { /* modo privado: se vuelve a pedir la próxima vez */ }
    return { ok: true, sub: { apns: { token, entorno: await entornoApns() } } };
  } catch (e) {
    return { ok: false, motivo: "fallo", detalle: detalleDe(e) };
  }
}

/**
 * Pide el permiso y da de alta este teléfono. Se llama desde un toque: el iPhone solo muestra su permiso así.
 * "bloqueado": dijo que no (o ya estaba bloqueado); "silenciado": el navegador no mostró su aviso a tiempo (queda un
 * icono por tocar en la propia barra); "rechazado": el permiso quedó "granted" pero el navegador se negó a
 * registrar el aviso (medido, bitácora 164: `pushManager.subscribe()` lanza `AbortError: "Registration failed -
 * permission denied"` con un perfil efímero de Chrome — el mismo error que documenta Chromium cuando macOS tiene
 * apagados los avisos del navegador a nivel de sistema, o en una ventana de incógnito/invitado: el permiso del
 * SITIO no es el único candado); "fallo": no se pudo terminar el alta por otra razón.
 *
 * Hay un solo `PushSubscription` por origen en todo el navegador, sin importar la cuenta (medido, bitácora 166,
 * OL-131): si otra cuenta ya la dio de alta en esta misma computadora, `getSubscription()` la devuelve tal cual, y
 * guardarla para la cuenta de ahora la base la rechaza (el endpoint no se transfiere de una cuenta a otra). Por
 * eso una suscripción que ya existe solo se reutiliza si el servidor confirma que es de la cuenta que pidió
 * "Activar"; si no, se da de baja y se pide una nueva, propia de esta cuenta.
 */
export async function suscribirPush(llavePublica: string): Promise<ResultadoAlta> {
  if (esAppNativa(navigator.userAgent)) return suscribirApns();
  try {
    if (!llavePublica || !hayAvisosEnElNavegador()) return { ok: false, motivo: "fallo" };
    const permiso = await pedirPermiso();
    if (permiso === TARDANDO) return { ok: false, motivo: "silenciado" };
    if (permiso === "denied") return { ok: false, motivo: "bloqueado" };
    if (permiso !== "granted") return { ok: false, motivo: "fallo" };
    const reg = await registroListo();
    if (!reg) return { ok: false, motivo: "fallo" };
    let sub: PushSubscription;
    try {
      const existente = await reg.pushManager.getSubscription();
      const esMia = existente && (await suscripcionPushActiva(existente.endpoint).catch(() => false));
      if (existente && !esMia) await existente.unsubscribe().catch(() => {});
      sub = existente && esMia ? existente : await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(llavePublica) as BufferSource });
    } catch (e) {
      return { ok: false, motivo: "rechazado", detalle: detalleDe(e) };
    }
    const json = sub.toJSON();
    return { ok: true, sub: { endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } } };
  } catch (e) {
    return { ok: false, motivo: "fallo", detalle: detalleDe(e) };
  }
}

export type IdentidadPush = { tipo: "web"; endpoint: string } | { tipo: "apns"; token: string };

/** Da de baja este teléfono. Devuelve lo que tenía (endpoint o token), para borrarlo en la base. */
export async function desuscribirPush(): Promise<IdentidadPush | null> {
  if (esAppNativa(navigator.userAgent)) {
    let token: string | null = null;
    try { token = localStorage.getItem(CLAVE_TOKEN_APNS); } catch { /* nada que leer sin memoria */ }
    await puenteApns()?.unregister().catch(() => {});
    try { localStorage.removeItem(CLAVE_TOKEN_APNS); } catch { /* nada que borrar sin memoria */ }
    return token ? { tipo: "apns", token } : null;
  }
  const reg = await registroListo();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return { tipo: "web", endpoint };
}
