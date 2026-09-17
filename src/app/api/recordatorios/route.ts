import { enviarRecordatorios } from "@/lib/avisos";
import { guardarIndicadores } from "@/lib/indicadores";

/** Hasta 60 s: los envíos van por lotes (avisos.ts); el límite del plan Hobby de Vercel es 60 s. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Lo llama Vercel Cron cada mañana (vercel.json). Manda el recordatorio del día a quienes dijeron "Voy" y deja la foto del
 * día de los indicadores del panel (docs/rediseno/19, decisión 4); si la foto falla, los recordatorios no se enteran.
 * Protegido con CRON_SECRET: Vercel lo manda como Bearer.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) return new Response("No autorizado", { status: 401 });
  const r = await enviarRecordatorios(24);
  console.info("recordatorios:", JSON.stringify(r));
  const indicadores = await guardarIndicadores().catch(() => ({ ok: false }));
  console.info("indicadores:", JSON.stringify(indicadores));
  return Response.json({ ok: true, ...r, indicadores: indicadores.ok });
}
