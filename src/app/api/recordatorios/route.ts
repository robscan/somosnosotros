import { enviarRecordatorios } from "@/lib/avisos";

/** Hasta 60 s: los envíos van por lotes (avisos.ts); el límite del plan Hobby de Vercel es 60 s. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Lo llama Vercel Cron cada mañana (vercel.json). Manda el recordatorio del día a quienes dijeron "Voy".
 * Protegido con CRON_SECRET: Vercel lo manda como Bearer.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) return new Response("No autorizado", { status: 401 });
  const r = await enviarRecordatorios(24);
  console.info("recordatorios:", JSON.stringify(r));
  return Response.json({ ok: true, ...r });
}
