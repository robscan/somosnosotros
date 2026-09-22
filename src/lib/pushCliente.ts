/** Avisos push desde el navegador: qué se puede en este teléfono y cómo darlo de alta. Solo en el cliente. */
import { decidirEstadoPush, leerPlataforma, type EstadoPush, type Plataforma } from "./plataforma";
import { suscripcionPushActiva } from "@/app/perfil/acciones";
import { clienteNavegador } from "./supabase/navegador";

export type { EstadoPush } from "./plataforma";

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
  if (!llavePublica) return "Falta la llave pública de avisos en este despliegue";
  if (!hayAvisosEnElNavegador()) return "Este navegador no tiene Service Worker, Push o Notification";
  return null;
}

/** El estado encendido requiere registro y consentimiento de la cuenta actual en el servidor. */
export async function estadoPush(llavePublica: string): Promise<EstadoPush> {
  const disponible = disponibilidadPush(llavePublica);
  if (disponible !== "apagado") return disponible;
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

export type Suscripcion = { endpoint: string; keys: { p256dh: string; auth: string } };
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

/** Da de baja este teléfono. Devuelve el endpoint que tenía, para borrarlo en la base. */
export async function desuscribirPush(): Promise<string | null> {
  const reg = await registroListo();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
