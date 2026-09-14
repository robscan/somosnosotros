import "server-only";
import { correoNuevoEvento, correoRecordatorio } from "./comunidad";
import { correoActivo, enviarCorreo } from "./correo";
import { nombreSitio } from "./eventos";
import { formatearCuando } from "./fechas";
import { enviarPush } from "./push";
import { clienteAdmin } from "./supabase/admin";

type EventoAviso = { id: string; titulo: string; inicio: string; fin: string | null; lugar_id: string | null; sitio_texto: string | null; sitio_reservado: boolean; lugar: { nombre: string; portada: string | null } | null };

async function cargarEvento(id: string): Promise<EventoAviso | null> {
  const admin = clienteAdmin();
  if (!admin) return null;
  const { data } = await admin.from("eventos").select("id, titulo, inicio, fin, lugar_id, sitio_texto, sitio_reservado, lugar:lugares(nombre, portada)").eq("id", id).eq("visible", true).maybeSingle();
  if (!data) return null;
  const lugar = Array.isArray(data.lugar) ? (data.lugar[0] ?? null) : data.lugar;
  return { ...(data as unknown as EventoAviso), lugar: lugar as EventoAviso["lugar"] };
}

/** Correo de una persona (auth.users), o null. */
async function correoDe(usuarioId: string): Promise<string | null> {
  const admin = clienteAdmin();
  if (!admin) return null;
  const { data } = await admin.auth.admin.getUserById(usuarioId);
  return data.user?.email ?? null;
}

/**
 * Manda el aviso a cada persona una sola vez (avisos_enviados) y solo si tiene los avisos encendidos:
 * push al teléfono si lo activó, y correo si hay llave. Cuenta como enviado si llegó por cualquiera de los dos.
 */
async function avisar(evento: EventoAviso, usuarios: string[], tipo: "nuevo_evento" | "recordatorio"): Promise<number> {
  const admin = clienteAdmin();
  if (!admin || usuarios.length === 0) return 0;
  const { data: perfiles } = await admin.from("perfiles").select("id, avisos").in("id", usuarios);
  const { data: ya } = await admin.from("avisos_enviados").select("usuario_id").eq("evento_id", evento.id).eq("tipo", tipo);
  const yaEnviados = new Set((ya ?? []).map((r) => r.usuario_id as string));
  const cuando = formatearCuando(evento.inicio, evento.fin);
  const lugar = nombreSitio(evento);
  const plantilla = tipo === "nuevo_evento" ? correoNuevoEvento : correoRecordatorio;
  const correo = plantilla({ titulo: evento.titulo, cuando, lugar, eventoId: evento.id });
  const aviso = { titulo: tipo === "nuevo_evento" ? `Nuevo en ${lugar}` : `Hoy: ${evento.titulo}`, cuerpo: tipo === "nuevo_evento" ? `${evento.titulo} · ${cuando}` : `${cuando} · ${lugar}`, url: `https://somosnosotros.org/eventos/${evento.id}` };
  const pendientes = (perfiles ?? []).filter((p) => p.avisos && !yaEnviados.has(p.id)).map((p) => p.id as string);
  let enviados = 0;
  // Por lotes: cada persona recibe push y correo a la vez, y el lote entero en paralelo.
  // Así 100 personas caben en el minuto que da Vercel; una por una no cabían.
  for (const lote of lotes(pendientes, LOTE)) {
    const resultados = await Promise.all(
      lote.map(async (usuarioId) => {
        const [porPush, porCorreo] = await Promise.all([
          enviarPush([usuarioId], aviso).then((n) => n > 0),
          correoActivo()
            ? correoDe(usuarioId).then((para) => (para ? enviarCorreo({ para, ...correo }) : false))
            : Promise.resolve(false),
        ]);
        return porPush || porCorreo ? usuarioId : null;
      }),
    );
    const llegaron = resultados.filter((u): u is string => !!u);
    if (llegaron.length > 0) {
      await admin.from("avisos_enviados").insert(llegaron.map((usuario_id) => ({ usuario_id, evento_id: evento.id, tipo })));
      enviados += llegaron.length;
    }
  }
  return enviados;
}

/** Cuántas personas se atienden a la vez. */
const LOTE = 10;

function lotes<T>(lista: T[], tamano: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) out.push(lista.slice(i, i + tamano));
  return out;
}

/** Nuevo evento en un lugar: aviso a quienes siguen ese lugar (menos al autor). */
export async function avisarNuevoEvento(eventoId: string, autorId: string | null): Promise<number> {
  const admin = clienteAdmin();
  const evento = await cargarEvento(eventoId);
  if (!admin || !evento?.lugar_id) return 0;
  const { data } = await admin.from("seguimientos").select("usuario_id").eq("lugar_id", evento.lugar_id);
  const usuarios = (data ?? []).map((s) => s.usuario_id as string).filter((u) => u !== autorId);
  return avisar(evento, usuarios, "nuevo_evento");
}

/** Recordatorio a quienes dijeron "Voy" a eventos que empiezan entre ahora y las próximas `horas`. */
export async function enviarRecordatorios(horas = 24): Promise<{ eventos: number; destinatarios: number; enviados: number; ms: number }> {
  const t0 = Date.now();
  const admin = clienteAdmin();
  if (!admin) return { eventos: 0, destinatarios: 0, enviados: 0, ms: 0 };
  const desde = new Date().toISOString();
  const hasta = new Date(Date.now() + horas * 3600000).toISOString();
  const { data: eventos } = await admin.from("eventos").select("id").eq("visible", true).gte("inicio", desde).lte("inicio", hasta);
  let enviados = 0;
  let destinatarios = 0;
  for (const e of eventos ?? []) {
    const evento = await cargarEvento(e.id);
    if (!evento) continue;
    const { data } = await admin.from("asistencias").select("usuario_id").eq("evento_id", e.id).eq("estado", "voy");
    const usuarios = (data ?? []).map((a) => a.usuario_id as string);
    destinatarios += usuarios.length;
    enviados += await avisar(evento, usuarios, "recordatorio");
  }
  return { eventos: (eventos ?? []).length, destinatarios, enviados, ms: Date.now() - t0 };
}
