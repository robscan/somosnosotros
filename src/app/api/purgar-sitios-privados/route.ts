import { autorizadoPorSecreto } from "@/lib/autorizacionCron";
import { clienteAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Vercel Cron diario. El plazo y los cerrojos se resuelven en PostgreSQL. */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!autorizadoPorSecreto(request.headers, process.env.CRON_SECRET)) {
    return new Response("No autorizado", { status: 401, headers });
  }
  let eliminadas = 0;
  try {
    const db = clienteAdmin();
    if (!db) throw new Error("servicio_no_configurado");
    // Diez peticiones de hasta 4 s dejan margen para responder antes de los 60 s.
    // Si falla después de un lote confirmado, el reintento sigue siendo seguro.
    for (let lote = 0; lote < 10; lote++) {
      const { data, error } = await db.rpc("purgar_sitios_privados", { p_limite: 500 })
        .abortSignal(AbortSignal.timeout(4000));
      if (error || !Number.isInteger(data) || data < 0 || data > 500) {
        throw new Error("respuesta_de_purga_invalida");
      }
      eliminadas += data;
      if (data < 500) return Response.json({ ok: true, eliminadas }, { headers });
    }
    // Puede haber rezago: devolver un fallo visible para que operaciones revise
    // y repita la llamada. No se registran direcciones ni identificadores.
    return Response.json({ ok: false, error: "purga_limite_de_lotes", eliminadas }, { status: 503, headers });
  } catch {
    return Response.json({ ok: false, error: "purga_no_disponible", eliminadas }, { status: 503, headers });
  }
}
