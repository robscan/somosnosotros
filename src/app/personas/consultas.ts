import "server-only";
import type { EventoAgenda } from "@/lib/agenda";
import type { Disciplina, TipoArtista } from "@/lib/artistas";
import { eventoPaso, filtroSinPasar } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { clienteServidor, type Perfil } from "@/lib/supabase/servidor";

export type LugarSeguido = { id: string; nombre: string; tipo: string; direccion: string | null; portada: string | null };
export type ArtistaSeguido = { id: string; nombre: string; disciplina: Disciplina; detalle: string | null; tipo: TipoArtista; foto: string | null };
export type Persona = { perfil: Perfil; eventos: EventoAgenda[]; interesan: EventoAgenda[]; lugares: LugarSeguido[]; artistas: ArtistaSeguido[] };

type FilaEvento = { id: string; titulo: string; inicio: string; fin: string | null; imagen: string | null; precio: string | null; lugar_id: string | null; sitio_texto: string | null; sitio_reservado: boolean; sitio_lat: number | null; sitio_lng: number | null; creado_en: string; lugar: { nombre: string; portada: string | null; lat: number; lng: number } | { nombre: string; portada: string | null; lat: number; lng: number }[] | null };

/** La ficha de una persona: quién es, a qué va y qué sigue. La misma consulta para Mi perfil y para la ficha ajena. */
export async function cargarPersona(id: string): Promise<Persona | null> {
  const supabase = await clienteServidor();
  if (!supabase || !esUuid(id)) return null;
  const { data: perfil } = await supabase.from("perfiles").select("id, nombre, foto, colonia, bio, rol, avisos_correo, avisos_push, avisos_preguntado, reservado").eq("id", id).maybeSingle();
  if (!perfil) return null;
  const [{ data: sigue }, { data: va }] = await Promise.all([
    supabase.from("seguimientos").select("lugar:lugares(id, nombre, tipo, direccion, portada), artista:artistas(id, nombre, disciplina, detalle, tipo, foto)").eq("usuario_id", id),
    supabase
      .from("asistencias")
      .select("estado, evento:eventos!inner(id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, sitio_lat, sitio_lng, creado_en, lugar:lugares(nombre, portada, lat, lng))")
      .eq("usuario_id", id)
      .or(filtroSinPasar(), { referencedTable: "evento" }),
  ]);
  const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
  const lugares = (sigue ?? []).map((s) => uno(s.lugar)).filter(Boolean) as LugarSeguido[];
  const artistas = (sigue ?? []).map((s) => uno(s.artista)).filter(Boolean) as ArtistaSeguido[];
  const filas = (va ?? []).map((a) => ({ estado: a.estado as string, e: uno(a.evento as unknown as FilaEvento | FilaEvento[]) })).filter((x): x is { estado: string; e: FilaEvento } => !!x.e && !eventoPaso(x.e.inicio, x.e.fin));
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
