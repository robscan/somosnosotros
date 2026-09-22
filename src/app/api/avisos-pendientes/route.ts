import { drenarAvisos, drenarAvisosAdmin } from "@/lib/avisosWorker";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) return new Response("No autorizado", { status: 401 });
  try {
    // Mismo cron y endpoint que el aviso al administrador (OL-115): corren en paralelo, cada uno con su cola.
    const [principal, admin] = await Promise.all([
      drenarAvisos({ ms: 40_000, recordatorios: true }),
      drenarAvisosAdmin({ ms: 8_000 }).catch(() => ({ enviados: 0, error: true })),
    ]);
    return Response.json({ ok: true, ...principal, admin });
  } catch { return Response.json({ ok: false, error: "avisos_no_disponibles" }, { status: 503 }); }
}
export const POST = GET;
