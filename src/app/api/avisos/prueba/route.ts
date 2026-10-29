import { autorizadoPorSecreto } from "@/lib/autorizacionCron";
import { diagnosticoLlaveApns, enviarPushApns, huellaToken, marcarDireccionMuerta } from "@/lib/push";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { EntornoApns } from "@/lib/dispositivosApns";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Dispositivo = { token: string; entorno: EntornoApns; muerta_en: string | null; actualizado_en: string };

/**
 * Prueba de humo de los avisos a la app de iPhone (OL-476, bitácora 508). Solo con `CRON_SECRET`, como los crons.
 * Manda UN aviso «Prueba de avisos · <hora>» a cada teléfono con la app de una persona (por id, en el cuerpo) y devuelve,
 * por teléfono, el código de Apple; nunca el token (solo una huella de 8 caracteres para distinguirlos) ni la llave.
 * También dice si la llave de Vercel se puede leer y en qué forma llegó. No pasa por la cola: no crea entregas ni
 * cuenta contra el tope de avisos; si Apple dice que el token ya no existe, lo marca `muerta_en`, como la cola.
 */
export async function POST(request: Request) {
  if (!autorizadoPorSecreto(request.headers, process.env.CRON_SECRET)) return new Response("No autorizado", { status: 401 });
  let usuarioId: unknown;
  try { usuarioId = ((await request.json()) as { usuario_id?: unknown })?.usuario_id; } catch { /* cuerpo vacío o no JSON */ }
  if (typeof usuarioId !== "string" || !UUID.test(usuarioId)) return Response.json({ ok: false, error: "falta_usuario_id" }, { status: 400 });
  const apns = diagnosticoLlaveApns();
  const admin = clienteAdmin();
  if (!admin) return Response.json({ ok: false, error: "sin_config_supabase", apns }, { status: 503 });
  const { data, error } = await admin.from("dispositivos_apns").select("token, entorno, muerta_en, actualizado_en")
    .eq("usuario_id", usuarioId).order("actualizado_en", { ascending: false }).limit(10);
  if (error) return Response.json({ ok: false, error: "base", apns }, { status: 503 });

  const hora = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const cuerpo = JSON.stringify({ titulo: `Prueba de avisos · ${hora}`, cuerpo: "Si ves esto, los avisos a la app ya llegan.",
    url: "https://somosnosotros.org/", tag: `prueba-avisos-${Date.now()}` });
  const dispositivos = await Promise.all(((data ?? []) as Dispositivo[]).map(async (d) => {
    const suscripcion = { token: d.token, entorno: d.entorno };
    const resultado = await enviarPushApns(suscripcion, cuerpo, 300, AbortSignal.timeout(10_000));
    const marcada = await marcarDireccionMuerta({ apns: suscripcion }, resultado);
    return { huella: huellaToken(d.token), entorno: d.entorno, actualizado_en: d.actualizado_en, muerta_antes: d.muerta_en !== null,
      estado: resultado.estado, codigo: resultado.codigo, marcada_muerta: marcada };
  }));
  return Response.json({ ok: true, hora, apns, dispositivos });
}
