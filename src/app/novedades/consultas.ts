import "server-only";
import { primerNombre } from "@/lib/comunidad";
import { nombreSitio } from "@/lib/eventos";
import { diaLocal, eventoPaso, formatearCuando, inicioDelDia } from "@/lib/fechas";
import { DIAS_NOVEDADES, esNueva, hayNuevas, queCambio, queJuntos, type Novedad } from "@/lib/novedades";
import { clienteServidor } from "@/lib/supabase/servidor";

type EventoBase = { id: string; titulo: string; inicio: string; fin: string | null; zona: string; lugar_id: string | null; sitio_texto: string | null; sitio_reservado: boolean; creado_en: string; creado_por: string | null; lugar: { nombre: string; portada: string | null } | { nombre: string; portada: string | null }[] | null };
const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const CAMPOS = "id, titulo, inicio, fin, zona, lugar_id, sitio_texto, sitio_reservado, creado_en, creado_por, lugar:lugares(nombre, portada)";

/**
 * Las novedades de una persona, calculadas (decisión 1 de docs/rediseno/13): nuevo en lo que sigue, cambios en
 * lo que va (guardados por el servidor), hoy vas y quién más va. Con `sigue` false no hay nada que calcular.
 */
export async function cargarNovedades(usuarioId: string, vistasEn: string | null, ahora = new Date()): Promise<{ lista: Novedad[]; sigue: number; hay: boolean }> {
  const supabase = await clienteServidor();
  if (!supabase) return { lista: [], sigue: 0, hay: false };
  const desde = new Date(ahora.getTime() - DIAS_NOVEDADES * 86400000).toISOString();
  // Topes explícitos (una sola persona): de sobra para lo que sigue, a lo que va y sus novedades recientes;
  // guardan del corte silencioso de PostgREST en 1 000 filas sin tocar lo que hoy se ve (revisión 2026-09-14, A1).
  const [{ data: seguidos }, { data: van }, { data: cambios }] = await Promise.all([
    supabase.from("seguimientos").select("lugar_id, artista_id, lugar:lugares(nombre), artista:artistas(nombre)").eq("usuario_id", usuarioId).limit(1000),
    supabase.from("asistencias").select(`evento:eventos!inner(${CAMPOS})`).eq("usuario_id", usuarioId).eq("estado", "voy").limit(1000),
    supabase.from("novedades").select(`detalle, creado_en, evento:eventos!inner(${CAMPOS})`).eq("usuario_id", usuarioId).gte("creado_en", desde).limit(500),
  ]);
  const lugares = new Map<string, string>();
  const artistas = new Map<string, string>();
  for (const s of (seguidos ?? []) as { lugar_id: string | null; artista_id: string | null; lugar: unknown; artista: unknown }[]) {
    const l = uno(s.lugar as { nombre: string } | null);
    const a = uno(s.artista as { nombre: string } | null);
    if (s.lugar_id && l) lugares.set(s.lugar_id, l.nombre);
    if (s.artista_id && a) artistas.set(s.artista_id, a.nombre);
  }
  const misEventos = ((van ?? []) as { evento: EventoBase | EventoBase[] }[]).map((v) => uno(v.evento)).filter((e): e is EventoBase => !!e && !eventoPaso(e.inicio, e.fin, ahora, e.zona));
  const lista: Novedad[] = [];
  const cuandoDe = (e: EventoBase) => `${formatearCuando(e.inicio, e.fin, ahora, e.zona)} · ${nombreSitio({ lugar: uno(e.lugar), sitio_texto: e.sitio_texto, sitio_reservado: e.sitio_reservado })}`;

  // 1. Nuevo en lo que sigo (lugares) y nueva fecha de quien sigo (artistas), últimos 14 días, no publicados por mí.
  // Acotado a los últimos DIAS_NOVEDADES días; el tope es cinturón y tirantes contra el corte silencioso de PostgREST.
  const [porLugar, porArtista] = await Promise.all([
    lugares.size ? supabase.from("eventos").select(CAMPOS).eq("visible", true).gte("creado_en", desde).in("lugar_id", [...lugares.keys()]).limit(500) : Promise.resolve({ data: [] as EventoBase[] }),
    artistas.size ? supabase.from("eventos_artistas").select(`artista_id, evento:eventos!inner(${CAMPOS})`).in("artista_id", [...artistas.keys()]).gte("evento.creado_en", desde).limit(500) : Promise.resolve({ data: [] as { artista_id: string; evento: EventoBase }[] }),
  ]);
  const vistos = new Set<string>();
  for (const e of (porLugar.data ?? []) as EventoBase[]) {
    if (e.creado_por === usuarioId || eventoPaso(e.inicio, e.fin, ahora, e.zona) || vistos.has(e.id)) continue;
    vistos.add(e.id);
    lista.push({ clave: `nuevo-${e.id}`, tipo: "nuevo", que: `Nuevo en ${lugares.get(e.lugar_id ?? "") ?? "un lugar que sigues"}`, eventoId: e.id, titulo: e.titulo, cuando: cuandoDe(e), inicio: e.inicio, fecha: e.creado_en, nueva: esNueva(e.creado_en, vistasEn) });
  }
  for (const f of (porArtista.data ?? []) as { artista_id: string; evento: EventoBase | EventoBase[] }[]) {
    const e = uno(f.evento);
    if (!e || e.creado_por === usuarioId || eventoPaso(e.inicio, e.fin, ahora, e.zona) || vistos.has(e.id)) continue;
    vistos.add(e.id);
    lista.push({ clave: `nuevo-${e.id}`, tipo: "nuevo", que: `Nueva fecha de ${artistas.get(f.artista_id) ?? "alguien que sigues"}`, eventoId: e.id, titulo: e.titulo, cuando: cuandoDe(e), inicio: e.inicio, fecha: e.creado_en, nueva: esNueva(e.creado_en, vistasEn) });
  }
  // 2. Cambió la fecha o el lugar de algo a lo que voy (lo guarda el servidor al editar).
  for (const c of (cambios ?? []) as { detalle: string | null; creado_en: string; evento: EventoBase | EventoBase[] }[]) {
    const e = uno(c.evento);
    if (!e) continue;
    lista.push({ clave: `cambio-${e.id}-${c.creado_en}`, tipo: "cambio", que: queCambio(c.detalle), eventoId: e.id, titulo: e.titulo, cuando: `Ahora es ${cuandoDe(e)}`, inicio: e.inicio, fecha: c.creado_en, nueva: esNueva(c.creado_en, vistasEn) });
  }
  // 3. Hoy vas: cuenta como novedad del día (nueva hasta que se abre la sección ese día).
  // Hoy es el del evento, en su zona; la novedad cuenta desde las 00:00 de ese día (antes, las 00:00 del reloj del
  // servidor, que en Vercel es UTC: las 18:00 del día anterior en San Luis, y la novedad caía en "Ayer").
  for (const e of misEventos) {
    if (diaLocal(new Date(e.inicio), e.zona) !== diaLocal(ahora, e.zona)) continue;
    const inicioHoy = new Date(inicioDelDia(ahora, e.zona));
    lista.push({ clave: `hoy-${e.id}`, tipo: "hoy", que: "Hoy vas", eventoId: e.id, titulo: e.titulo, cuando: cuandoDe(e), inicio: e.inicio, fecha: inicioHoy.toISOString(), nueva: !vistasEn || new Date(vistasEn) < inicioHoy });
  }
  // 4. Van a lo mismo: quién más dijo "Voy" (perfil público: la política de la base ya esconde a los reservados) en los últimos 14 días.
  if (misEventos.length) {
    // Quién más va a mis próximos eventos, en los últimos días: tope de sobra contra el corte silencioso de PostgREST.
    const { data: otros } = await supabase.from("asistencias").select("evento_id, usuario_id, creado_en, perfil:perfiles(nombre)").in("evento_id", misEventos.map((e) => e.id)).eq("estado", "voy").neq("usuario_id", usuarioId).gte("creado_en", desde).order("creado_en", { ascending: false }).limit(1000);
    const porEvento = new Map<string, { nombres: string[]; fecha: string }>();
    for (const o of (otros ?? []) as { evento_id: string; creado_en: string; perfil: { nombre: string } | { nombre: string }[] | null }[]) {
      const p = uno(o.perfil);
      if (!p) continue;
      const g = porEvento.get(o.evento_id) ?? { nombres: [], fecha: o.creado_en };
      g.nombres.push(primerNombre(p.nombre));
      porEvento.set(o.evento_id, g);
    }
    for (const e of misEventos) {
      const g = porEvento.get(e.id);
      if (!g) continue;
      lista.push({ clave: `juntos-${e.id}`, tipo: "juntos", que: queJuntos(g.nombres), eventoId: e.id, titulo: e.titulo, cuando: cuandoDe(e), inicio: e.inicio, fecha: g.fecha, nueva: esNueva(g.fecha, vistasEn) });
    }
  }
  return { lista, sigue: lugares.size + artistas.size, hay: hayNuevas(lista) };
}
