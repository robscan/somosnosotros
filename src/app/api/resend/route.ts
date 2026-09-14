import { createHmac, timingSafeEqual } from "node:crypto";
import { clienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Webhook de Resend: un rebote o una queja de spam apagan el correo de esa persona solos,
 * antes de que el daño a la entrega del dominio se acumule.
 * Configuración (founder, una vez): Resend → Webhooks → https://somosnosotros.org/api/resend,
 * eventos email.bounced y email.complained; el "signing secret" va en Vercel como RESEND_WEBHOOK_SECRET.
 */
const TOLERANCIA_S = 5 * 60;

function firmaValida(cuerpo: string, cabeceras: Headers, secreto: string): boolean {
  const id = cabeceras.get("svix-id");
  const ts = cabeceras.get("svix-timestamp");
  const firmas = cabeceras.get("svix-signature");
  if (!id || !ts || !firmas) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > TOLERANCIA_S) return false;
  const llave = Buffer.from(secreto.replace(/^whsec_/, ""), "base64");
  const esperada = createHmac("sha256", llave).update(`${id}.${ts}.${cuerpo}`).digest("base64");
  return firmas.split(" ").some((par) => {
    const [, valor] = par.split(",");
    if (!valor) return false;
    const a = Buffer.from(valor);
    const b = Buffer.from(esperada);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request: Request) {
  const secreto = process.env.RESEND_WEBHOOK_SECRET;
  if (!secreto) return new Response("Sin RESEND_WEBHOOK_SECRET", { status: 503 });
  const cuerpo = await request.text();
  if (!firmaValida(cuerpo, request.headers, secreto)) return new Response("Firma inválida", { status: 401 });

  let evento: { type?: string; data?: { to?: string[] } } = {};
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }
  const motivo = evento.type === "email.bounced" ? "rebote" : evento.type === "email.complained" ? "queja" : null;
  if (!motivo) return Response.json({ ok: true, ignorado: evento.type });

  const admin = clienteAdmin();
  const correos = (evento.data?.to ?? []).map((c) => c.toLowerCase());
  if (!admin || correos.length === 0) return Response.json({ ok: true, apagados: 0 });

  // Los correos viven en auth.users: se buscan por lista (pocas personas; si crece, se indexa aparte).
  let apagados = 0;
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    const usuarios = data?.users ?? [];
    for (const u of usuarios) {
      if (u.email && correos.includes(u.email.toLowerCase())) {
        await admin.from("perfiles").update({ avisos_correo: false, avisos_correo_desde: null, avisos_correo_motivo: motivo }).eq("id", u.id);
        apagados++;
      }
    }
    if (usuarios.length < 200) break;
  }
  console.info("resend webhook:", evento.type, "apagados", apagados);
  return Response.json({ ok: true, apagados });
}
