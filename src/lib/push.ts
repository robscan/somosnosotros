import "server-only";
import webpush from "web-push";
import { clienteAdmin } from "./supabase/admin";

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
  // Necesita venir completa: a quien no se manda aquí no le llega el push. Tope de sobra contra el corte
  // silencioso de PostgREST (hoy se llama con una persona a la vez).
  const { data } = await admin.from("suscripciones_push").select("endpoint, p256dh, auth, usuario_id").in("usuario_id", usuarios).limit(5000);
  // Todos los teléfonos a la vez: cada envío es una petición HTTP independiente.
  const resultados = await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 6 * 3600 });
        return true;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("suscripciones_push").delete().eq("endpoint", s.endpoint);
        else console.error("enviarPush:", status, e instanceof Error ? e.message : e);
        return false;
      }
    }),
  );
  return resultados.filter(Boolean).length;
}
