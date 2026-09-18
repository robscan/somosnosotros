import "server-only";
import webpush from "web-push";
import { clienteAdmin } from "./supabase/admin";
import { CONCURRENCIA_PUSH, ESPERA_PUSH_MS, validarSuscripcionPush } from "./suscripcionPush";

/** Los avisos push se activan con las llaves VAPID en el servidor. */
export function pushActivo(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configurado = false;
function configurar() {
  if (configurado || !pushActivo()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hola@somosnosotros.org", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configurado = true;
}

export type AvisoPush = { titulo: string; cuerpo: string; url: string };

/** Manda un aviso a todos los teléfonos de esas personas. Borra las suscripciones muertas. Devuelve cuántos llegaron. */
export async function enviarPush(usuarios: string[], aviso: AvisoPush): Promise<number> {
  const admin = clienteAdmin();
  if (!admin || !pushActivo() || usuarios.length === 0) return 0;
  configurar();
  const { data, error } = await admin.from("suscripciones_push").select("endpoint, p256dh, auth, usuario_id").in("usuario_id", usuarios).limit(5000);
  if (error) return 0;
  const suscripciones = (data ?? []).flatMap((s) => {
    const valida = validarSuscripcionPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } });
    return valida ? [valida] : [];
  });
  let siguiente = 0;
  let enviados = 0;
  // El mismo limite cubre filas antiguas; ninguna entra a la red sin validarse.
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA_PUSH, suscripciones.length) }, async () => {
    while (siguiente < suscripciones.length) {
      const s = suscripciones[siguiente++];
      try {
        await webpush.sendNotification(s, JSON.stringify(aviso), { TTL: 6 * 3600, timeout: ESPERA_PUSH_MS });
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("suscripciones_push").delete().eq("endpoint", s.endpoint);
        else console.error("enviarPush: fallo del proveedor", status ?? "red");
      }
    }
  }));
  return enviados;
}
