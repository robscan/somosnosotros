import "server-only";
import { correoNuevoEvento, correoRecordatorio } from "./comunidad";
import { correoActivo, enviarCorreo } from "./correo";
import { nombreSitio } from "./eventos";
import { formatearCuando } from "./fechas";
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

/** Manda el aviso a cada persona una sola vez (avisos_enviados) y solo si tiene los avisos encendidos. */
async function avisar(evento: EventoAviso, usuarios: string[], tipo: "nuevo_evento" | "recordatorio"): Promise<number> {
  const admin = clienteAdmin();
  if (!admin || !correoActivo() || usuarios.length === 0) return 0;
  const { data: perfiles } = await admin.from("perfiles").select("id, avisos").in("id", usuarios);
  const { data: ya } = await admin.from("avisos_enviados").select("usuario_id").eq("evento_id", evento.id).eq("tipo", tipo);
  const yaEnviados = new Set((ya ?? []).map((r) => r.usuario_id as string));
  const cuando = formatearCuando(evento.inicio, evento.fin);
  const lugar = nombreSitio(evento);
  const plantilla = tipo === "nuevo_evento" ? correoNuevoEvento : correoRecordatorio;
  const correo = plantilla({ titulo: evento.titulo, cuando, lugar, eventoId: evento.id });
  let enviados = 0;
  for (const p of perfiles ?? []) {
    if (!p.avisos || yaEnviados.has(p.id)) continue;
    const para = await correoDe(p.id);
    if (!para) continue;
    const ok = await enviarCorreo({ para, ...correo });
    if (ok) {
      await admin.from("avisos_enviados").insert({ usuario_id: p.id, evento_id: evento.id, tipo });
      enviados++;
    }
  }
  return enviados;
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
export async function enviarRecordatorios(horas = 24): Promise<{ eventos: number; enviados: number }> {
  const admin = clienteAdmin();
  if (!admin) return { eventos: 0, enviados: 0 };
  const desde = new Date().toISOString();
  const hasta = new Date(Date.now() + horas * 3600000).toISOString();
  const { data: eventos } = await admin.from("eventos").select("id").eq("visible", true).gte("inicio", desde).lte("inicio", hasta);
  let enviados = 0;
  for (const e of eventos ?? []) {
    const evento = await cargarEvento(e.id);
    if (!evento) continue;
    const { data } = await admin.from("asistencias").select("usuario_id").eq("evento_id", e.id).eq("estado", "voy");
    enviados += await avisar(evento, (data ?? []).map((a) => a.usuario_id as string), "recordatorio");
  }
  return { eventos: (eventos ?? []).length, enviados };
}
