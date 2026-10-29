import { contenidoPush, cuerpoPush, type EventoParaAviso } from "@/lib/avisos";
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
 *
 * OL-480 (bitácora 512): con `evento_id` (un evento visible), en vez del texto de prueba manda el aviso de «evento nuevo» de ese evento con la
 * forma nueva, tal cual lo armaría la cola para la app (título = el evento, «Nuevo en …» de subtítulo, la fecha corta, el hilo del evento y la
 * dirección con `?desde=aviso&tipo=nuevo`), y devuelve en `aviso` lo que se mandó (solo datos públicos del evento) para compararlo con la
 * pantalla del teléfono.
 */
export async function POST(request: Request) {
  if (!autorizadoPorSecreto(request.headers, process.env.CRON_SECRET)) return new Response("No autorizado", { status: 401 });
  let usuarioId: unknown;
  let eventoId: unknown;
  try { ({ usuario_id: usuarioId, evento_id: eventoId } = (await request.json()) as { usuario_id?: unknown; evento_id?: unknown }); } catch { /* cuerpo vacío o no JSON */ }
  if (typeof usuarioId !== "string" || !UUID.test(usuarioId)) return Response.json({ ok: false, error: "falta_usuario_id" }, { status: 400 });
  if (eventoId !== undefined && (typeof eventoId !== "string" || !UUID.test(eventoId))) return Response.json({ ok: false, error: "evento_id_invalido" }, { status: 400 });
  const apns = diagnosticoLlaveApns();
  const admin = clienteAdmin();
  if (!admin) return Response.json({ ok: false, error: "sin_config_supabase", apns }, { status: 503 });
  const { data, error } = await admin.from("dispositivos_apns").select("token, entorno, muerta_en, actualizado_en")
    .eq("usuario_id", usuarioId).order("actualizado_en", { ascending: false }).limit(10);
  if (error) return Response.json({ ok: false, error: "base", apns }, { status: 503 });

  const hora = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  let cuerpo = JSON.stringify({ titulo: `Prueba de avisos · ${hora}`, cuerpo: "Si ves esto, los avisos a la app ya llegan.",
    url: "https://somosnosotros.org/", tag: `prueba-avisos-${Date.now()}` });
  if (typeof eventoId === "string") {
    const { data: e, error: errorEvento } = await admin.from("eventos")
      .select("id, slug, titulo, inicio, fin, zona, sitio_texto, sitio_reservado, descripcion, visible, lugar:lugares(nombre, direccion, visible, privado)")
      .eq("id", eventoId).maybeSingle();
    if (errorEvento) return Response.json({ ok: false, error: "base", apns }, { status: 503 });
    const fila = e as (Omit<EventoParaAviso, "lugar"> & { descripcion: string | null; visible: boolean;
      lugar: { nombre: string; direccion: string | null; visible: boolean; privado: boolean } | null }) | null;
    // Lo mismo que exige la cola (`avisos_evento_publico`): visible, por venir y con su lugar visible y no privado.
    if (!fila || !fila.visible || Date.parse(fila.inicio) <= Date.now() || (fila.lugar && (!fila.lugar.visible || fila.lugar.privado))) {
      return Response.json({ ok: false, error: "evento_no_publico", apns }, { status: 404 });
    }
    const evento: EventoParaAviso = { ...fila, lugar: fila.lugar ? { nombre: fila.lugar.nombre, portada: null } : null };
    const forma = contenidoPush("nuevo_evento", evento, "ambos", new Date(), { motivo: "lugar", descripcion: fila.descripcion, direccion: fila.lugar?.direccion ?? null });
    cuerpo = JSON.stringify(cuerpoPush(forma, "app", `prueba-${Date.now()}`));
  }
  const dispositivos = await Promise.all(((data ?? []) as Dispositivo[]).map(async (d) => {
    const suscripcion = { token: d.token, entorno: d.entorno };
    const resultado = await enviarPushApns(suscripcion, cuerpo, 300, AbortSignal.timeout(10_000));
    const marcada = await marcarDireccionMuerta({ apns: suscripcion }, resultado);
    return { huella: huellaToken(d.token), entorno: d.entorno, actualizado_en: d.actualizado_en, muerta_antes: d.muerta_en !== null,
      estado: resultado.estado, codigo: resultado.codigo, marcada_muerta: marcada };
  }));
  return Response.json({ ok: true, hora, apns, dispositivos, ...(typeof eventoId === "string" ? { aviso: JSON.parse(cuerpo) } : {}) });
}
