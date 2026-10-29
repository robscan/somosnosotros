import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { diaConMes, diaLocal, ZONA_INICIAL } from "@/lib/fechas";
import { SIN_FOTO } from "@/lib/imagen";
import { armarSemana, cuandoDelDia, diaIso, diasDe, REGLA, estadoDelDia, lineaDelAviso, lineaDelEstado, lunesDeLaSemana, rangoDeLaSemana, resumenSemana, type Candidato, type EstadoDia, type EventoCandidato, type TipoDia } from "@/lib/instagram/semana";
import { usuarioDeInstagram } from "@/lib/instagram/texto";
import type { ClienteServidor } from "@/lib/supabase/servidor";

/**
 * La semana de Instagram de una ciudad (OL-479; firmada en el prototipo de OL-477, bitácora 509): lo que lee la pestaña «Semana» de
 * Administración › Instagram. Con la sesión de la administración (la base lo comprueba: `instagram_semana` solo la lee ella y sus funciones lo
 * vuelven a decir). Si a la semana le faltan días por delante, se arman aquí con la regla (`armarSemana`) y los candidatos de la base, y se
 * guardan (`instagram_semana_guardar`, que pone cada día en la cola a su hora): el sistema llena y programa; la administración solo corrige.
 */

export type FilaDia = {
  id: string;
  ciudad: string;
  fecha: string;
  tipo: TipoDia;
  artista_id: string | null;
  lugar_id: string | null;
  evento_id: string | null;
  eventos: string[] | null;
  hora: string | null;
  programado_para: string | null;
  estado: string;
  elegido_por: string;
  motivo: string | null;
  reemplaza: string | null;
  trabajo_id: string | null;
  aviso_en: string | null;
  dijo_no_en: string | null;
};
export const COLUMNAS_DIA = "id, ciudad, fecha, tipo, artista_id, lugar_id, evento_id, eventos, hora, programado_para, estado, elegido_por, motivo, reemplaza, trabajo_id, aviso_en, dijo_no_en";

/** Un renglón de la semana, ya dicho. */
export type DiaSemana = {
  id: string;
  fecha: string;
  tipo: TipoDia;
  nombre: string;
  /** La miniatura 4:5: la tarjeta (artista, lugar, «Esta semana»), el cartel (evento) o el símbolo SN (descanso, quitado). */
  imagen: string;
  cuando: string;
  estado: EstadoDia;
  lineaEstado: string;
  aviso: { texto: string; falta: boolean } | null;
  medida: string | null;
  permalink: string | null;
  /** Sin JavaScript, el renglón lleva a la ficha (o a la lista de hoy). */
  href: string;
};

export type Semana = { lunes: string; rango: string; resumen: string; dias: DiaSemana[]; zona: string };

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);
const db = (s: ClienteServidor) => s as unknown as SupabaseClient;

/** La zona de una ciudad (la de Administración › Ciudades; si no la tiene, la inicial). */
export async function zonaDeCiudad(supabase: ClienteServidor, ciudad: string): Promise<string> {
  const { data } = await supabase.from("ciudades").select("zona").eq("slug", ciudad).maybeSingle<{ zona: string }>();
  return data?.zona ?? ZONA_INICIAL;
}

/**
 * Los días guardados de la semana que empieza en `lunes`. `otraVez`: después de guardar, se vuelven a leer de verdad (Next guarda en la misma
 * petición la respuesta de un GET igual y devolvería la de antes de guardar: una señal propia lo deja fuera de esa memoria).
 */
async function leerDias(supabase: ClienteServidor, ciudad: string, lunes: string, otraVez = false): Promise<FilaDia[] | null> {
  const dias = diasDe(lunes);
  const q = supabase.from("instagram_semana").select(COLUMNAS_DIA).eq("ciudad", ciudad).gte("fecha", dias[0]).lte("fecha", dias[6]).order("fecha");
  const { data, error } = await (otraVez ? q.abortSignal(new AbortController().signal) : q);
  return error ? null : ((data ?? []) as FilaDia[]);
}

/** Los candidatos de la base para una semana (artistas o lugares), en el orden de la regla. */
export async function candidatos(supabase: ClienteServidor, ciudad: string, tipo: "artista" | "lugar", lunes: string): Promise<Candidato[]> {
  const { data, error } = await supabase.rpc("instagram_candidatos", { p_ciudad: ciudad, p_tipo: tipo, p_desde: lunes });
  return error || !Array.isArray(data) ? [] : (data as Candidato[]);
}

/** Arma y guarda los días que le faltan a una semana (los que ya están no se tocan). Devuelve si intentó guardar alguno. */
async function llenar(supabase: ClienteServidor, ciudad: string, lunes: string, zona: string, existentes: FilaDia[], ahora: Date): Promise<boolean> {
  const [artistas, lugares, sugeridos] = await Promise.all([
    candidatos(supabase, ciudad, "artista", lunes),
    candidatos(supabase, ciudad, "lugar", lunes),
    supabase.rpc("instagram_sugerencias", { p_ciudad: ciudad, p_dias: 14 }),
  ]);
  const eventos = (Array.isArray(sugeridos.data) ? sugeridos.data : []) as EventoCandidato[];
  const usados = new Set(existentes.flatMap((d) => [d.artista_id, d.lugar_id, d.evento_id, ...(d.eventos ?? [])].filter((x): x is string => !!x)));
  const nuevas = armarSemana({ lunes, zona, ahora, artistas, lugares, eventos, existentes: new Set(existentes.map((d) => d.fecha)), usados });
  if (!nuevas.length) return false;
  const { error } = await supabase.rpc("instagram_semana_guardar", { p_ciudad: ciudad, p_casillas: nuevas });
  return !error;
}

/** La semana («esta» o «la que viene») de una ciudad: se arma lo que falte y se dice cada día. Null si no se pudo leer. */
export async function cargarSemana(supabase: ClienteServidor, ciudad: string, cual: "esta" | "viene", ahora = new Date()): Promise<Semana | null> {
  const zona = await zonaDeCiudad(supabase, ciudad);
  const lunes = lunesDeLaSemana(cual, ahora, zona);
  let filas = await leerDias(supabase, ciudad, lunes);
  if (!filas) return null;
  if (filas.length < 7 && (await llenar(supabase, ciudad, lunes, zona, filas, ahora))) filas = (await leerDias(supabase, ciudad, lunes, true)) ?? filas;
  const dichos = await decirDias(supabase, filas, ahora, zona);
  // Un día que no se armó (ya había pasado su hora cuando se llenó la semana) se dice igual: la semana siempre tiene sus siete renglones.
  const dias = diasDe(lunes).map((fecha) => dichos.find((d) => d.fecha === fecha) ?? sinArmar(fecha, ahora, zona));
  return { lunes, rango: rangoDeLaSemana(lunes), resumen: resumenSemana(dias.map((d) => ({ estado: d.estado, fecha: d.fecha, falta: !!d.aviso?.falta }))), dias, zona };
}

type Ficha = { id: string; slug: string; nombre: string; redes: unknown; imagen: string | null };
type Evento = { id: string; slug: string | null; titulo: string; imagen: string | null; inicio: string; zona: string };
type Trabajo = { id: string; estado: string; siguiente_en: string; resultado: { instagram?: { permalink?: string | null } } | null };

/** Lo que dice cada día: el nombre, la miniatura, cómo va, el aviso y (ya publicado) lo que dio. */
export async function decirDias(supabase: ClienteServidor, filas: FilaDia[], ahora: Date, zona: string): Promise<DiaSemana[]> {
  const ids = (k: "artista_id" | "lugar_id" | "evento_id") => [...new Set(filas.map((f) => f[k]).filter((x): x is string => !!x))];
  const deEventos = [...new Set([...ids("evento_id"), ...filas.flatMap((f) => f.eventos ?? [])])];
  const trabajos = [...new Set(filas.map((f) => f.trabajo_id).filter((x): x is string => !!x))];
  const publicados = filas.filter((f) => f.estado === "publicado").map((f) => f.id);
  const [a, l, e, t, r] = await Promise.all([
    ids("artista_id").length ? supabase.from("artistas").select("id, slug, nombre, redes, imagen:foto").in("id", ids("artista_id")) : null,
    ids("lugar_id").length ? supabase.from("lugares").select("id, slug, nombre, redes, imagen:portada").in("id", ids("lugar_id")) : null,
    deEventos.length ? supabase.from("eventos").select("id, slug, titulo, imagen, inicio, zona").in("id", deEventos) : null,
    trabajos.length ? supabase.from("redes_trabajos").select("id, estado, siguiente_en, resultado").in("id", trabajos) : null,
    publicados.length ? supabase.rpc("instagram_resultado", { p_casillas: publicados }) : null,
  ]);
  const por = <T extends { id: string }>(x: { data: unknown } | null) => new Map(((x?.data ?? []) as T[]).map((y) => [y.id, y]));
  const artistas = por<Ficha>(a);
  const lugares = por<Ficha>(l);
  const eventos = por<Evento>(e);
  const trabajosPor = por<Trabajo>(t);
  const medidas = new Map(((r?.data ?? []) as { casilla: string; visitas: number; van: number }[]).map((x) => [x.casilla, x]));
  return filas.map((f) => {
    const trabajo = f.trabajo_id ? (trabajosPor.get(f.trabajo_id) ?? null) : null;
    const estado = estadoDelDia({ estado: f.estado, tipo: f.tipo, fecha: f.fecha, programado_para: f.programado_para, trabajo }, ahora, zona);
    const ficha = f.artista_id ? artistas.get(f.artista_id) : f.lugar_id ? lugares.get(f.lugar_id) : null;
    const evento = f.evento_id ? eventos.get(f.evento_id) : null;
    const delFin = (f.eventos ?? []).map((id) => eventos.get(id)).filter((x): x is Evento => !!x);
    const nombre =
      f.tipo === "descanso" ? "Sin publicación" : ficha?.nombre ?? evento?.titulo ?? (f.tipo === "semana" ? nombreDelFin(delFin) : "Sin ficha");
    const tarjeta = `/api/instagram/semana/${f.id}?mini=1`;
    const imagen = f.tipo === "descanso" || estado === "quitado" ? SIN_FOTO : f.tipo === "evento" ? (evento?.imagen ?? SIN_FOTO) : tarjeta;
    const m = medidas.get(f.id);
    return {
      id: f.id,
      fecha: f.fecha,
      tipo: f.tipo,
      nombre,
      imagen,
      cuando: cuandoDelDia({ fecha: f.fecha, hora: f.hora, tipo: f.tipo }, ahora, zona, f.tipo === "semana" ? delFin.length + 1 : 0),
      estado,
      lineaEstado: lineaDelEstado(estado, f.hora, f.tipo === "descanso" ? f.motivo : null),
      aviso: lineaDelAviso({ tipo: f.tipo, cuenta: ficha ? usuarioDeInstagram(ficha.redes) : null, aviso_en: f.aviso_en, reemplaza: f.reemplaza }, estado, ahora, zona),
      medida: m ? `${m.visitas === 1 ? "1 visita" : `${m.visitas} visitas`} · ${m.van} van` : null,
      permalink: trabajo?.resultado?.instagram?.permalink ?? null,
      href: f.artista_id && ficha ? `/artistas/${ficha.slug}` : f.lugar_id && ficha ? `/lugares/${ficha.slug}` : evento ? `/eventos/${evento.slug ?? evento.id}` : "/admin/instagram",
    };
  });
}

/** Un día que no se armó: lo que pedía la regla, sin publicación. No abre hoja (`id` empieza con «sin-»). */
function sinArmar(fecha: string, ahora: Date, zona: string): DiaSemana {
  const r = REGLA[diaIso(fecha)];
  return {
    id: `sin-${fecha}`,
    fecha,
    tipo: r.tipo,
    nombre: "Sin publicación",
    imagen: SIN_FOTO,
    cuando: cuandoDelDia({ fecha, hora: r.hora, tipo: r.tipo }, ahora, zona),
    estado: r.tipo === "descanso" ? "descanso" : "sin",
    lineaEstado: r.tipo === "descanso" ? "La cuenta descansa" : "No se programó",
    aviso: null,
    medida: null,
    permalink: null,
    href: "/admin/instagram",
  };
}

/** «Del viernes 16 al domingo 18»: el nombre del día de «Esta semana», de los días de sus eventos. */
function nombreDelFin(eventos: Evento[]): string {
  if (!eventos.length) return "Esta semana";
  const dias = eventos.map((e) => ({ dia: diaLocal(new Date(e.inicio), e.zona), zona: e.zona })).sort((x, y) => x.dia.localeCompare(y.dia));
  const fmt = (d: string) => new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric" }).format(new Date(`${d}T12:00:00Z`)).replace(",", "");
  const a = dias[0].dia;
  const b = dias.at(-1)!.dia;
  return a === b ? `El ${fmt(a)}` : `Del ${fmt(a)} al ${fmt(b)}`;
}

/** Un día, con su ciudad (para la hoja y la vista previa). */
export async function leerDia(supabase: ClienteServidor, id: string): Promise<FilaDia | null> {
  const { data } = await supabase.from("instagram_semana").select(COLUMNAS_DIA).eq("id", id).maybeSingle<FilaDia>();
  return data ?? null;
}

/** Resumen para la portada de Administración: «Semana: 4 de 6 programadas» (null si no hay semana armada o no se pudo leer). */
export async function resumenDeLaPortada(supabase: ClienteServidor, ciudad: string | null, ahora = new Date()): Promise<string | null> {
  if (!ciudad) return null;
  const zona = await zonaDeCiudad(supabase, ciudad);
  const filas = await leerDias(supabase, ciudad, lunesDeLaSemana("esta", ahora, zona));
  if (!filas?.length) return null;
  const vivos = filas.filter((f) => f.tipo !== "descanso");
  const listos = vivos.filter((f) => f.estado === "publicado" || (f.estado === "programado" && f.trabajo_id)).length;
  return `Semana: ${listos} de ${vivos.length} ${vivos.length === 1 ? "programada" : "programadas"}`;
}

/** «el mié 7 de oct» si la ficha dijo que no a salir en Instagram (solo lo ve la administración: la base no se lo da a nadie más); null si no. */
export async function fueraDeInstagram(supabase: ClienteServidor | null, tipo: "artista" | "lugar", id: string, ahora = new Date()): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("instagram_fuera").select("desde").eq(tipo === "artista" ? "artista_id" : "lugar_id", id).maybeSingle<{ desde: string }>();
  return data ? `el ${diaConMes(data.desde, ahora, ZONA_INICIAL)}` : null;
}

export { db as comoCliente, uno };
