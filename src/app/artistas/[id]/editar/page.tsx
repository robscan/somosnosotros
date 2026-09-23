import Barra from "@/components/ui/Barra";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { esUuid } from "@/lib/formulario";
import { hrefArtista, type Artista } from "@/lib/artistas";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioArtista from "../../FormularioArtista";
import { actualizarArtista } from "../../acciones";

export const metadata = { title: "Editar artista · Somos Nosotros", robots: { index: false, follow: false } };

/** Igual que la ficha: se busca por slug y, si no aparece, por UUID (la dirección vieja). */
async function cargarArtista(idOSlug: string) {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const porSlug = await supabase.from("artistas").select("*").eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("artistas").select("*").eq("id", idOSlug).maybeSingle()).data : null);
  return data as Artista | null;
}

export default async function EditarArtista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/artistas/${id}/editar`)}`);
  const [artista, ciudades] = await Promise.all([cargarArtista(id), cargarCiudadesDeArtistas()]);
  if (!artista) notFound();
  // Dirección vieja (/artistas/<uuid>/editar): redirige a la de hoy, con el mismo id real por debajo.
  if (id !== artista.slug) permanentRedirect(`${hrefArtista(artista)}/editar`);
  const supabase = await clienteServidor();
  const { data: liga } = (await supabase?.from("artistas_cuentas").select("perfil_id").eq("artista_id", artista.id).eq("perfil_id", actual.perfil.id).maybeSingle()) ?? { data: null };
  // Edita el autor, la cuenta ligada ("Soy yo / es mi grupo") o el administrador.
  if (actual.perfil.rol !== "admin" && artista.creado_por !== actual.perfil.id && !liga) redirect(hrefArtista(artista));
  return (
    <main className="pagina">
      <Barra volver={{ href: hrefArtista(artista), texto: "Volver a la ficha" }} />
      <h1 className="titulo">Editar artista</h1>
      <FormularioArtista accion={actualizarArtista.bind(null, artista.id)} artista={artista} usuarioId={actual.perfil.id} esAdmin={actual.perfil.rol === "admin"} ciudadInicial={artista.ciudad} ciudades={ciudades} />
    </main>
  );
}
