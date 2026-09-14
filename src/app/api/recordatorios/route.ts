import { enviarRecordatorios } from "@/lib/avisos";

/**
 * Lo llama Vercel Cron cada mañana (vercel.json). Manda el recordatorio del día a quienes dijeron "Voy".
 * Protegido con CRON_SECRET: Vercel lo manda como Bearer.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) return new Response("No autorizado", { status: 401 });
  const r = await enviarRecordatorios(24);
  return Response.json({ ok: true, ...r });
}
