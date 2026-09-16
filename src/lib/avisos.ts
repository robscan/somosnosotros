import "server-only";
import { correoCambioEvento, correoNuevoEvento, correoRecordatorio, textoCambio } from "./comunidad";
import { correoActivo, enviarCorreo } from "./correo";
import { nombreSitio, type CambioEvento } from "./eventos";
import { formatearCuando } from "./fechas";
import { urlBaja } from "./baja";
import { enviarPush, type AvisoPush } from "./push";
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
 * Manda el aviso a cada persona una sola vez (avisos_enviados) y solo por los canales que consintió
 * (avisos_push, avisos_correo). Cuenta como enviado si llegó por cualquiera de los dos.
 */
type TipoAviso = "nuevo_evento" | "recordatorio" | "cambio";
type Cambio = Exclude<CambioEvento, null>;
export type EventoParaAviso = Pick<EventoAviso, "id" | "titulo" | "inicio" | "fin" | "sitio_texto" | "sitio_reservado" | "lugar">;
export type Canales = { id: string; avisos_correo: boolean; avisos_push: boolean };

/** El título, cuerpo y enlace del aviso push, según el tipo. Puro: mismos textos que antes de extraerla. */
export function contenidoPush(tipo: TipoAviso, evento: EventoParaAviso, cambio: Cambio = "ambos", ahora: Date = new Date()): AvisoPush {
  const cuando = formatearCuando(evento.inicio, evento.fin, ahora);
  const lugar = nombreSitio(evento);
  const url = `https://somosnosotros.org/eventos/${evento.id}`;
  if (tipo === "nuevo_evento") return { titulo: `Nuevo en ${lugar}`, cuerpo: `${evento.titulo} · ${cuando}`, url };
  if (tipo === "cambio") return { titulo: `Cambió ${textoCambio(cambio)}: ${evento.titulo}`, cuerpo: `Ahora es ${cuando} · ${lugar}`, url };
  return { titulo: `Hoy: ${evento.titulo}`, cuerpo: `${cuando} · ${lugar}`, url };
}

/** Quién falta por avisar: tiene algún canal activo (correo o push) y no está ya en avisos_enviados. Puro. */
export function pendientesDeAviso<T extends Canales>(perfiles: T[], yaEnviados: Set<string>): T[] {
  return perfiles.filter((p) => (p.avisos_correo || p.avisos_push) && !yaEnviados.has(p.id));
}

async function avisar(evento: EventoAviso, usuarios: string[], tipo: TipoAviso, cambio: Cambio = "ambos"): Promise<number> {
  const admin = clienteAdmin();
  if (!admin || usuarios.length === 0) return 0;
  // Ambas necesitan venir completas (a quién avisar y a quién no repetir); tope de sobra contra el corte
  // silencioso de PostgREST, muy por encima de los seguidores o asistentes que junta hoy un evento.
  const { data: perfiles } = await admin.from("perfiles").select("id, avisos_correo, avisos_push").in("id", usuarios).limit(5000);
  const { data: ya } = await admin.from("avisos_enviados").select("usuario_id").eq("evento_id", evento.id).eq("tipo", tipo).limit(5000);
  const yaEnviados = new Set((ya ?? []).map((r) => r.usuario_id as string));
  const cuando = formatearCuando(evento.inicio, evento.fin);
  const lugar = nombreSitio(evento);
  const plantilla = tipo === "nuevo_evento" ? correoNuevoEvento : tipo === "cambio" ? (p: Parameters<typeof correoNuevoEvento>[0]) => correoCambioEvento({ ...p, cambio }) : correoRecordatorio;
  const llaveBaja = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const aviso = contenidoPush(tipo, evento, cambio);
  const pendientes = pendientesDeAviso((perfiles ?? []) as Canales[], yaEnviados);
  let enviados = 0;
  // Por lotes: cada persona recibe push y correo a la vez, y el lote entero en paralelo.
  // Así 100 personas caben en el minuto que da Vercel; una por una no cabían.
  for (const lote of lotes(pendientes, LOTE)) {
    const resultados = await Promise.all(
      lote.map(async (p) => {
        const bajaUrl = llaveBaja ? urlBaja(p.id, llaveBaja) : undefined;
        const correo = plantilla({ titulo: evento.titulo, cuando, lugar, eventoId: evento.id, bajaUrl });
        const [porPush, porCorreo] = await Promise.all([
          p.avisos_push ? enviarPush([p.id], aviso).then((n) => n > 0) : Promise.resolve(false),
          p.avisos_correo && correoActivo()
            ? correoDe(p.id).then((para) => (para ? enviarCorreo({ para, ...correo, bajaUrl }) : false))
            : Promise.resolve(false),
        ]);
        return porPush || porCorreo ? p.id : null;
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

/** Parte una lista en lotes de `tamano` (el último puede quedar más corto). Puro. */
export function lotes<T>(lista: T[], tamano: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) out.push(lista.slice(i, i + tamano));
  return out;
}

/** Tope de eventos por autor y día que disparan avisos: a partir del cuarto, el evento se publica pero no avisa
 *  (una cuenta nueva no puede quemar el dominio de correo ni cansar a los seguidores; revisión 2026-09-14, M2). */
export const TOPE_AVISOS_POR_AUTOR_DIA = 3;

/** Si ya alcanzó el tope de eventos por autor y día: a partir de ahí, el evento se publica pero no avisa. Puro. */
export function superoTopeAvisos(cuenta: number, tope: number = TOPE_AVISOS_POR_AUTOR_DIA): boolean {
  return cuenta > tope;
}

/** Nuevo evento: aviso a quienes siguen el lugar o a alguno de los artistas que se presentan (menos al autor), una vez por persona. */
export async function avisarNuevoEvento(eventoId: string, autorId: string | null): Promise<number> {
  const admin = clienteAdmin();
  const evento = await cargarEvento(eventoId);
  if (!admin || !evento) return 0;
  if (autorId) {
    const hace24h = new Date(Date.now() - 24 * 3600000).toISOString();
    const { count } = await admin.from("eventos").select("id", { count: "exact", head: true }).eq("creado_por", autorId).gte("creado_en", hace24h);
    if (superoTopeAvisos(count ?? 0)) {
      console.info(`avisos: ${autorId} lleva ${count} eventos en 24 h; el ${eventoId} se publica sin avisar`);
      return 0;
    }
  }
  // Un cartel no lleva más de unas decenas de nombres; tope explícito contra el corte silencioso de PostgREST.
  const { data: ea } = await admin.from("eventos_artistas").select("artista_id").eq("evento_id", eventoId).limit(50);
  const artistas = (ea ?? []).map((r) => r.artista_id as string);
  if (!evento.lugar_id && artistas.length === 0) return 0;
  // Necesitan venir completas: a quien no se avisa aquí no se le avisa nunca de este evento. Tope de sobra
  // contra el corte silencioso de PostgREST, muy por encima de los seguidores que junta hoy un lugar o artista.
  const [porLugar, porArtista] = await Promise.all([
    evento.lugar_id ? admin.from("seguimientos").select("usuario_id").eq("lugar_id", evento.lugar_id).limit(5000) : Promise.resolve({ data: [] as { usuario_id: string }[] }),
    artistas.length ? admin.from("seguimientos").select("usuario_id").in("artista_id", artistas).limit(5000) : Promise.resolve({ data: [] as { usuario_id: string }[] }),
  ]);
  const usuarios = [...new Set([...(porLugar.data ?? []), ...(porArtista.data ?? [])].map((s) => s.usuario_id as string))].filter((u) => u !== autorId);
  return avisar(evento, usuarios, "nuevo_evento");
}

/**
 * Cambió la fecha o el lugar: aviso a quienes dijeron "Voy" (menos a quien editó). Cada cambio avisa de nuevo:
 * se borra el registro del aviso de cambio anterior para que "una vez por persona" cuente por cambio, no por evento.
 */
export async function avisarCambioEvento(eventoId: string, editorId: string | null, cambio: Cambio): Promise<number> {
  const admin = clienteAdmin();
  const evento = await cargarEvento(eventoId);
  if (!admin || !evento) return 0;
  // Necesita venir completa: a quien no se avisa aquí no se le avisa del cambio. Tope de sobra contra el corte
  // silencioso de PostgREST, muy por encima de los "voy" que junta hoy un evento.
  const { data } = await admin.from("asistencias").select("usuario_id").eq("evento_id", eventoId).eq("estado", "voy").limit(5000);
  const usuarios = (data ?? []).map((a) => a.usuario_id as string).filter((u) => u !== editorId);
  if (usuarios.length === 0) return 0;
  // Queda en Novedades para todos los que van, tengan o no avisos activados (docs/rediseno/13, decisión 1).
  await admin.from("novedades").insert(usuarios.map((usuario_id) => ({ usuario_id, evento_id: eventoId, tipo: "cambio", detalle: cambio })));
  await admin.from("avisos_enviados").delete().eq("evento_id", eventoId).eq("tipo", "cambio");
  return avisar(evento, usuarios, "cambio", cambio);
}

/** La ventana del recordatorio: desde ahora hasta dentro de `horas`, en ISO. Puro. */
export function ventanaRecordatorio(horas: number, ahora = new Date()): { desde: string; hasta: string } {
  return { desde: ahora.toISOString(), hasta: new Date(ahora.getTime() + horas * 3600000).toISOString() };
}

/** Recordatorio a quienes dijeron "Voy" a eventos que empiezan entre ahora y las próximas `horas`. */
export async function enviarRecordatorios(horas = 24): Promise<{ eventos: number; destinatarios: number; enviados: number; ms: number }> {
  const t0 = Date.now();
  const admin = clienteAdmin();
  if (!admin) return { eventos: 0, destinatarios: 0, enviados: 0, ms: 0 };
  const { desde, hasta } = ventanaRecordatorio(horas);
  // Acotado a la ventana de horas del recordatorio; el tope es cinturón y tirantes contra el corte silencioso de PostgREST.
  const { data: eventos } = await admin.from("eventos").select("id").eq("visible", true).gte("inicio", desde).lte("inicio", hasta).limit(1000);
  let enviados = 0;
  let destinatarios = 0;
  for (const e of eventos ?? []) {
    const evento = await cargarEvento(e.id);
    if (!evento) continue;
    // Necesita venir completa: a quien no se avisa aquí no le llega el recordatorio. Tope de sobra contra el
    // corte silencioso de PostgREST, muy por encima de los "voy" que junta hoy un evento.
    const { data } = await admin.from("asistencias").select("usuario_id").eq("evento_id", e.id).eq("estado", "voy").limit(5000);
    const usuarios = (data ?? []).map((a) => a.usuario_id as string);
    destinatarios += usuarios.length;
    enviados += await avisar(evento, usuarios, "recordatorio");
  }
  return { eventos: (eventos ?? []).length, destinatarios, enviados, ms: Date.now() - t0 };
}
