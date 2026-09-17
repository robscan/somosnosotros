import Barra from "@/components/ui/Barra";
import { notFound, redirect } from "next/navigation";
import type { Artista } from "@/lib/artistas";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioArtista from "../../FormularioArtista";
import { actualizarArtista } from "../../acciones";

export const metadata = { title: "Editar artista · Somos Nosotros" };

export default async function EditarArtista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/artistas/${id}/editar`)}`);
  const supabase = await clienteServidor();
  const [{ data }, { data: liga }, ciudades] = await Promise.all([
    supabase?.from("artistas").select("*").eq("id", id).maybeSingle() ?? Promise.resolve({ data: null }),
    supabase?.from("artistas_cuentas").select("perfil_id").eq("artista_id", id).eq("perfil_id", actual.perfil.id).maybeSingle() ?? Promise.resolve({ data: null }),
    cargarCiudadesDeArtistas(supabase),
  ]);
  if (!data) notFound();
  const artista = data as Artista;
  // Edita el autor, la cuenta ligada ("Soy yo / es mi grupo") o el administrador.
  if (actual.perfil.rol !== "admin" && artista.creado_por !== actual.perfil.id && !liga) redirect(`/artistas/${id}`);
  return (
    <main className="pagina">
      <Barra volver={{ href: `/artistas/${id}`, texto: "Volver a la ficha" }} />
      <h1 className="titulo">Editar artista</h1>
      <FormularioArtista accion={actualizarArtista.bind(null, id)} artista={artista} usuarioId={actual.perfil.id} esAdmin={actual.perfil.rol === "admin"} ciudadInicial={artista.ciudad} ciudades={ciudades} />
    </main>
  );
}
