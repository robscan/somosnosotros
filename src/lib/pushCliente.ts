/** Avisos push desde el navegador: qué se puede en este teléfono y cómo suscribirlo. Solo en el cliente. */

export type EstadoPush = "no-soportado" | "instalar-primero" | "apagado" | "encendido" | "bloqueado";

function base64AUint8(b64: string): Uint8Array {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function esIphone(): boolean {
  return /iPhone|iPad/i.test(navigator.userAgent);
}

export function estaInstalada(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Qué se puede hacer con los avisos en este teléfono. En iPhone solo funcionan con la app instalada. */
export async function estadoPush(llavePublica: string): Promise<EstadoPush> {
  if (!llavePublica || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "no-soportado";
  if (esIphone() && !estaInstalada()) return "instalar-primero";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? "encendido" : "apagado";
}

export type Suscripcion = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Pide permiso y suscribe este teléfono. Devuelve la suscripción, o el estado si no se pudo. */
export async function suscribirPush(llavePublica: string): Promise<{ ok: true; sub: Suscripcion } | { ok: false; estado: EstadoPush }> {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return { ok: false, estado: permiso === "denied" ? "bloqueado" : "apagado" };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(llavePublica) as BufferSource });
  const json = sub.toJSON();
  return { ok: true, sub: { endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } } };
}

export async function desuscribirPush(): Promise<string | null> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
