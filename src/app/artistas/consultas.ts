import { esUuid } from "@/lib/formulario";
import type { ArtistaResumen } from "@/lib/artistas";
import { clienteServidor } from "@/lib/supabase/servidor";

/** Quién se presenta en un evento, en su orden. Lo usan la ficha de evento y su alta al editar o duplicar. */
export async function cargarQuien(eventoId: string): Promise<{ id: string; nombre: string }[]> {
  const supabase = await clienteServidor();
  if (!supabase || !esUuid(eventoId)) return [];
  const { data } = await supabase.from("eventos_artistas").select("orden, artista:artistas(id, nombre)").eq("evento_id", eventoId).order("orden");
  return (data ?? [])
    .map((f) => (Array.isArray(f.artista) ? f.artista[0] : f.artista))
    .filter((a): a is { id: string; nombre: string } => !!a);
}

/** Los artistas ligados a una cuenta ("Soy yo / es mi grupo"): Quién ya viene resuelto con ellos. */
export async function cargarMisArtistas(perfilId: string): Promise<ArtistaResumen[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase.from("artistas_cuentas").select("artista:artistas(id, nombre, disciplina, detalle, tipo, foto)").eq("perfil_id", perfilId);
  return (data ?? [])
    .map((f) => (Array.isArray(f.artista) ? f.artista[0] : f.artista))
    .filter((a): a is ArtistaResumen => !!a);
}
