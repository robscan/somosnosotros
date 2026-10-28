import "server-only";
import { esUuid } from "@/lib/formulario";
import { ordenarAdministradas, type FichaAdministrada } from "@/lib/asignarFichas";
import { clienteServidor } from "@/lib/supabase/servidor";

type Lugar = { id: string; slug: string | null; nombre: string; portada: string | null; tipo: string; detalle: string | null; ciudad: string | null };
type Artista = { id: string; slug: string | null; nombre: string; foto: string | null; disciplina: string; detalle: string | null; ciudad: string | null };
const una = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

/**
 * OL-447: las fichas que una persona administra (sus ligas en `lugares_cuentas` y `artistas_cuentas`, por reclamo aprobado o asignadas desde
 * aquí), con foto, tipo o disciplina y ciudad para el renglón. Las ligas se leen en público; las fichas, con la lectura de la administración
 * (ve también las ocultas). null si no se pudo leer: la pantalla lo dice en vez de afirmar «ninguna».
 */
export async function cargarAdministradas(perfilId: string): Promise<FichaAdministrada[] | null> {
  if (!esUuid(perfilId)) return [];
  const supabase = await clienteServidor();
  if (!supabase) return null;
  // Nadie lleva decenas de fichas; tope explícito contra el corte silencioso de PostgREST.
  const [l, a] = await Promise.all([
    supabase.from("lugares_cuentas").select("lugar:lugares(id, slug, nombre, portada, tipo, detalle, ciudad)").eq("perfil_id", perfilId).limit(100),
    supabase.from("artistas_cuentas").select("artista:artistas(id, slug, nombre, foto, disciplina, detalle, ciudad)").eq("perfil_id", perfilId).limit(100),
  ]);
  if (l.error || a.error) return null;
  const lugares = (l.data ?? []).map((f) => una(f.lugar as Lugar | Lugar[] | null)).filter((x): x is Lugar => !!x);
  const artistas = (a.data ?? []).map((f) => una(f.artista as Artista | Artista[] | null)).filter((x): x is Artista => !!x);
  return ordenarAdministradas([
    ...lugares.map((x): FichaAdministrada => ({ tipo: "lugar", id: x.id, slug: x.slug, nombre: x.nombre, foto: x.portada, clase: x.tipo, detalle: x.detalle, ciudad: x.ciudad })),
    ...artistas.map((x): FichaAdministrada => ({ tipo: "artista", id: x.id, slug: x.slug, nombre: x.nombre, foto: x.foto, clase: x.disciplina, detalle: x.detalle, ciudad: x.ciudad })),
  ]);
}
