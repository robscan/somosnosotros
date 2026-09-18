import { drenarAvisos } from "@/lib/avisosWorker";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) return new Response("No autorizado", { status: 401 });
  try { return Response.json({ ok: true, ...await drenarAvisos({ ms: 40_000, recordatorios: true }) }); }
  catch { return Response.json({ ok: false, error: "avisos_no_disponibles" }, { status: 503 }); }
}
export const POST = GET;
