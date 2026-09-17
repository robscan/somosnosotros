/** Avisos push desde el navegador: qué se puede en este teléfono y cómo darlo de alta. Solo en el cliente. */
import { decidirEstadoPush, leerPlataforma, type EstadoPush, type Plataforma } from "./plataforma";

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

/** Qué se puede hacer con los avisos en este teléfono (el orden está en decidirEstadoPush). */
export async function estadoPush(llavePublica: string): Promise<EstadoPush> {
  const p = plataformaActual();
  const soporte = hayAvisosEnElNavegador();
  const permiso = "Notification" in window ? Notification.permission : null;
  let suscrito = false;
  if (!p.deOtraApp && !(p.ios && !p.instalada) && soporte && llavePublica && permiso !== "denied") {
    const reg = await registroListo();
    suscrito = !!(reg && (await reg.pushManager.getSubscription()));
  }
  return decidirEstadoPush(p, { llave: !!llavePublica, soporte, permiso, suscrito });
}

export type Suscripcion = { endpoint: string; keys: { p256dh: string; auth: string } };
export type ResultadoAlta = { ok: true; sub: Suscripcion } | { ok: false; motivo: "bloqueado" | "fallo" };

/**
 * Pide el permiso y da de alta este teléfono. Se llama desde un toque: el iPhone solo muestra su permiso así.
 * "bloqueado": dijo que no (o ya estaba bloqueado); "fallo": no se pudo terminar el alta.
 */
export async function suscribirPush(llavePublica: string): Promise<ResultadoAlta> {
  try {
    if (!llavePublica || !hayAvisosEnElNavegador()) return { ok: false, motivo: "fallo" };
    const permiso = await Notification.requestPermission();
    if (permiso === "denied") return { ok: false, motivo: "bloqueado" };
    if (permiso !== "granted") return { ok: false, motivo: "fallo" };
    const reg = await registroListo();
    if (!reg) return { ok: false, motivo: "fallo" };
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(llavePublica) as BufferSource }));
    const json = sub.toJSON();
    return { ok: true, sub: { endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } } };
  } catch {
    return { ok: false, motivo: "fallo" };
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
