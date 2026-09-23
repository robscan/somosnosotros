import { esUuid } from "@/lib/formulario";
import type { ArtistaResumen } from "@/lib/artistas";
import { clienteServidor } from "@/lib/supabase/servidor";

/** Solo el nombre y el slug (con el id, para `hrefArtista`), lo mínimo para el letrero para imprimir (OL-159,
 * doc 40e): por slug (la dirección de hoy) y, si no aparece, por UUID (la dirección vieja), como la ficha. */
export async function cargarArtistaLetrero(idOSlug: string): Promise<{ id: string; nombre: string; slug: string } | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const porSlug = await supabase.from("artistas").select("id, nombre, slug").eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("artistas").select("id, nombre, slug").eq("id", idOSlug).maybeSingle()).data : null);
  return data ?? null;
}

/** Quién se presenta en un evento, en su orden. Lo usan la ficha de evento y su alta al editar o duplicar. */
export async function cargarQuien(eventoId: string): Promise<{ id: string; slug: string; nombre: string }[]> {
  const supabase = await clienteServidor();
  if (!supabase || !esUuid(eventoId)) return [];
  // Un cartel no lleva más de unas decenas de nombres; tope explícito contra el corte silencioso de PostgREST.
  const { data } = await supabase.from("eventos_artistas").select("orden, artista:artistas(id, slug, nombre)").eq("evento_id", eventoId).order("orden").limit(50);
  return (data ?? [])
    .map((f) => (Array.isArray(f.artista) ? f.artista[0] : f.artista))
    .filter((a): a is { id: string; slug: string; nombre: string } => !!a);
}

/** Los artistas ligados a una cuenta ("Soy yo / es mi grupo"): Quién ya viene resuelto con ellos. */
export async function cargarMisArtistas(perfilId: string): Promise<ArtistaResumen[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  // Nadie liga decenas de fichas a su cuenta; tope explícito contra el corte silencioso de PostgREST.
  const { data } = await supabase.from("artistas_cuentas").select("artista:artistas(id, slug, nombre, disciplina, detalle, tipo, foto)").eq("perfil_id", perfilId).limit(50);
  return (data ?? [])
    .map((f) => (Array.isArray(f.artista) ? f.artista[0] : f.artista))
    .filter((a): a is ArtistaResumen => !!a);
}
