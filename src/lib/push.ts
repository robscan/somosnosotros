import "server-only";
import webpush from "web-push";
import { validarSuscripcionPush } from "./suscripcionPush";
import type { ResultadoEnvio } from "./correo";

export function pushActivo(): boolean { return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY); }
export type AvisoPush = { titulo: string; cuerpo: string; url: string; tag?: string };

/** Una entrega por endpoint. El worker, no esta funcion, limita la concurrencia global. */
export async function enviarPushEndpoint(suscripcion: unknown, cuerpo: string, ttl: number, deadline?: AbortSignal): Promise<ResultadoEnvio> {
  const s = validarSuscripcionPush(suscripcion);
  if (!s || !Number.isFinite(ttl)) return { estado: "fallida", codigo: "push_invalido" };
  if (ttl <= 0) return { estado: "descartada", codigo: "push_caducado" };
  if (!pushActivo()) return { estado: "reintentar", codigo: "push_config" };
  try {
    const peticion = webpush.generateRequestDetails(s, cuerpo, {
      TTL: Math.max(0, Math.min(3600, Math.floor(ttl))),
      vapidDetails: { subject: process.env.VAPID_SUBJECT || "mailto:hola@somosnosotros.org",
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
    });
    // La libreria cifra/firma; fetch limita todo HTTP, no solo inactividad del socket.
    const res = await fetch(s.endpoint, { method: "POST", headers: peticion.headers,
      body: new Uint8Array(peticion.body), redirect: "error",
      signal: AbortSignal.any([...(deadline ? [deadline] : []), AbortSignal.timeout(Math.max(1, Math.floor(Math.min(8_000, ttl * 1000))))]) });
    const status = res.status;
    await res.body?.cancel();
    if (res.ok) return { estado: "enviada", codigo: "aceptado" };
    // No se borra una suscripcion que pudo renovarse mientras respondia el proveedor.
    return { estado: status >= 400 && status < 500 && status !== 429 && status !== 408 ? "fallida" : "reintentar", codigo: `push_${status}` };
  } catch { return { estado: "reintentar", codigo: "push_red" }; }
}
