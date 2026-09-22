import "server-only";
import type { EventoAgenda } from "@/lib/agenda";
import { conProximaFecha, type Disciplina, type FechaDeArtista, type ProximaFecha, type TipoArtista } from "@/lib/artistas";
import { nombreSitio } from "@/lib/eventos";
import { eventoPaso, filtroSinPasar } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { conProximo, type ProximoEvento } from "@/lib/lugares";
import { clienteServidor, type Perfil } from "@/lib/supabase/servidor";

/** Con `proximo` y `proxima` cuando la ficha los pide: el mismo renglón que en Lugares y Artistas (OL-057). */
export type LugarSeguido = { id: string; slug: string; nombre: string; tipo: string; direccion: string | null; portada: string | null; proximo?: ProximoEvento | null };
export type ArtistaSeguido = { id: string; slug: string; nombre: string; disciplina: Disciplina; detalle: string | null; tipo: TipoArtista; foto: string | null; proxima?: ProximaFecha | null };
export type Persona = { perfil: Perfil; eventos: EventoAgenda[]; interesan: EventoAgenda[]; lugares: LugarSeguido[]; artistas: ArtistaSeguido[] };

type FilaEvento = { id: string; slug: string; titulo: string; inicio: string; fin: string | null; zona: string; imagen: string | null; precio: string | null; lugar_id: string | null; sitio_texto: string | null; sitio_direccion: string | null; sitio_reservado: boolean; sitio_lat: number | null; sitio_lng: number | null; creado_en: string; lugar: { nombre: string; portada: string | null; lat: number; lng: number } | { nombre: string; portada: string | null; lat: number; lng: number }[] | null };
type Cliente = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;
type FilaFecha = { artista_id: string; evento: FechaEvento | FechaEvento[] | null };
type FechaEvento = { id: string; titulo: string; inicio: string; zona: string; sitio_texto: string | null; sitio_direccion: string | null; sitio_reservado: boolean; lugar: { nombre: string } | { nombre: string }[] | null };

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** El próximo evento de cada lugar seguido, como en la lista de Lugares. */
async function conProximos(supabase: Cliente, lugares: LugarSeguido[]): Promise<LugarSeguido[]> {
  if (lugares.length === 0) return lugares;
  const { data } = await supabase.from("eventos").select("id, inicio, lugar_id, zona, titulo").in("lugar_id", lugares.map((l) => l.id)).eq("visible", true).or(filtroSinPasar()).order("inicio").limit(500);
  return conProximo(lugares, (data ?? []) as (ProximoEvento & { lugar_id: string | null })[]);
}

/** La próxima fecha de cada artista seguido, con su sitio, como en la lista de Artistas. */
async function conProximasFechas(supabase: Cliente, artistas: ArtistaSeguido[]): Promise<ArtistaSeguido[]> {
  if (artistas.length === 0) return artistas;
  const { data } = await supabase
    .from("eventos_artistas")
    .select("artista_id, evento:eventos!inner(id, titulo, inicio, zona, sitio_texto, sitio_direccion, sitio_reservado, lugar:lugares(nombre))")
    .in("artista_id", artistas.map((a) => a.id))
    .eq("evento.visible", true)
    .or(filtroSinPasar(), { referencedTable: "evento" })
    .order("evento(inicio)")
    .limit(500);
  const fechas: FechaDeArtista[] = [];
  for (const fila of (data ?? []) as unknown as FilaFecha[]) {
    const e = uno(fila.evento);
    if (!e) continue;
    const lugar = uno(e.lugar);
    fechas.push({ artista_id: fila.artista_id, evento: { id: e.id, titulo: e.titulo, inicio: e.inicio, zona: e.zona, sitio: nombreSitio({ lugar: lugar ? { nombre: lugar.nombre, portada: null } : null, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado }) } });
  }
  return conProximaFecha(artistas, fechas);
}

/**
 * Lo que una persona decidió en eventos y lo que sigue, como lo piden los gestos de las listas (OL-057). Con `sobre`, solo
 * lo que se ve en esa otra ficha: a quien mira no le llega más que su relación con lo que tiene delante.
 */
export function relacionDe(persona: Persona, sobre?: Persona): { decididas: Record<string, "voy" | "me_interesa">; seguidos: string[] } {
  const eventos = sobre ? new Set(sobre.eventos.map((e) => e.id)) : null;
  const seguibles = sobre ? new Set([...sobre.lugares, ...sobre.artistas].map((x) => x.id)) : null;
  const decididas: Record<string, "voy" | "me_interesa"> = {};
  for (const e of persona.eventos) if (!eventos || eventos.has(e.id)) decididas[e.id] = "voy";
  for (const e of persona.interesan) if (!eventos || eventos.has(e.id)) decididas[e.id] = "me_interesa";
  const seguidos = [...persona.lugares, ...persona.artistas].map((x) => x.id).filter((id) => !seguibles || seguibles.has(id));
  return { decididas, seguidos };
}

/**
 * La ficha de una persona: quién es, a qué va y qué sigue. La misma consulta para Mi perfil y para la ficha ajena.
 * `conProximos`: lo que sigue trae su próximo evento o fecha, para pintarlo con los renglones de las listas (OL-057).
 */
export async function cargarPersona(id: string, { conProximos: proximos = false }: { conProximos?: boolean } = {}): Promise<Persona | null> {
  const supabase = await clienteServidor();
  if (!supabase || !esUuid(id)) return null;
  const { data: perfil } = await supabase.from("perfiles").select("id, nombre, foto, colonia, bio, rol, avisos_correo, avisos_push, avisos_preguntado, reservado").eq("id", id).maybeSingle();
  if (!perfil) return null;
  // Topes explícitos (una sola persona): de sobra para lo que sigue y a lo que va; guardan del corte silencioso
  // de PostgREST en 1 000 filas sin tocar lo que hoy se ve (revisión 2026-09-14, A1).
  const [{ data: sigue }, { data: va }] = await Promise.all([
    supabase.from("seguimientos").select("lugar:lugares(id, slug, nombre, tipo, direccion, portada), artista:artistas(id, slug, nombre, disciplina, detalle, tipo, foto)").eq("usuario_id", id).limit(1000),
    supabase
      .from("asistencias")
      .select("estado, evento:eventos!inner(id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, sitio_lat, sitio_lng, creado_en, lugar:lugares(nombre, portada, lat, lng))")
      .eq("usuario_id", id)
      .or(filtroSinPasar(), { referencedTable: "evento" })
      .limit(1000),
  ]);
  const seguidosLugares = (sigue ?? []).map((s) => uno(s.lugar)).filter(Boolean) as LugarSeguido[];
  const seguidosArtistas = (sigue ?? []).map((s) => uno(s.artista)).filter(Boolean) as ArtistaSeguido[];
  const [lugares, artistas] = proximos ? await Promise.all([conProximos(supabase, seguidosLugares), conProximasFechas(supabase, seguidosArtistas)]) : [seguidosLugares, seguidosArtistas];
  const filas = (va ?? []).map((a) => ({ estado: a.estado as string, e: uno(a.evento as unknown as FilaEvento | FilaEvento[]) })).filter((x): x is { estado: string; e: FilaEvento } => !!x.e && !eventoPaso(x.e.inicio, x.e.fin, new Date(), x.e.zona));
  // Cuántos van a cada uno, contado en la base.
  const ids = filas.map((x) => x.e.id);
  const { data: conteo } = ids.length ? await supabase.rpc("van_por_evento", { ids }) : { data: [] as { evento_id: string; n: number }[] };
  const van = new Map<string, number>();
  for (const c of (conteo ?? []) as { evento_id: string; n: number }[]) van.set(c.evento_id, Number(c.n));
  const aAgenda = (e: FilaEvento): EventoAgenda => {
    const lugar = uno(e.lugar);
    return { ...e, lugar, lat: lugar?.lat ?? e.sitio_lat, lng: lugar?.lng ?? e.sitio_lng, van: van.get(e.id) ?? 0 };
  };
  const porEstado = (estado: string) => filas.filter((x) => x.estado === estado).map((x) => aAgenda(x.e)).sort((a, b) => a.inicio.localeCompare(b.inicio));
  return { perfil: perfil as Perfil, eventos: porEstado("voy"), interesan: porEstado("me_interesa"), lugares, artistas };
}
