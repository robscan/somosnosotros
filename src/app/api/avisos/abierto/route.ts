import { esTipoAvisoAbierto } from "@/lib/avisoAbierto";
import { leerCuerpoAcotado } from "@/lib/cuerpoAcotado";
import { clienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Un tipo cabe de sobra. */
const MAX_CUERPO = 128;
const RESPUESTA = { status: 204, headers: { "Cache-Control": "no-store" } } as const;

/**
 * POST /api/avisos/abierto — OL-480 (bitácora 512): suma uno al conteo de avisos abiertos del día y del tipo (`avisos_contar_abierto`, con la
 * llave de servicio: nadie más puede llamarla). Lo manda `AvisoAbierto` al abrir la app desde un aviso. No lee la sesión ni guarda nada de quien
 * lo abre: ni cuenta, ni teléfono, ni IP, ni el evento. Solo desde el propio sitio (`Sec-Fetch-Site`, como `/api/medir`) y con un tipo de la lista
 * cerrada (`lib/avisoAbierto`). Sin base configurada (local, pruebas) responde igual y no cuenta. Nunca dice si contó: medir no rompe nada.
 */
export async function POST(request: Request) {
  try {
    const sitio = request.headers.get("sec-fetch-site");
    if (sitio && sitio !== "same-origin") return new Response(null, { status: 403 });
    const texto = await leerCuerpoAcotado(request, MAX_CUERPO);
    if (texto === null) return new Response(null, { status: 413 });
    const tipo = (JSON.parse(texto) as { tipo?: unknown } | null)?.tipo;
    if (!esTipoAvisoAbierto(tipo)) return new Response(null, { status: 400 });
    const admin = clienteAdmin();
    if (admin) await admin.rpc("avisos_contar_abierto", { p_tipo: tipo }).abortSignal(AbortSignal.timeout(3_000));
    return new Response(null, RESPUESTA);
  } catch {
    return new Response(null, { status: 400 });
  }
}
