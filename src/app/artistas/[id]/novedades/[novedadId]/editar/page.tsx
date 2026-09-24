import Barra from "@/components/ui/Barra";
import Borrar from "@/components/Borrar";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { esUuid } from "@/lib/formulario";
import { hrefArtista, type Artista } from "@/lib/artistas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { actualizarNovedadArtista, borrarNovedadArtista } from "../../acciones";
import FormularioNovedad from "../../nueva/FormularioNovedad";

export const metadata = { title: "Editar novedad · Somos Nosotros", robots: { index: false, follow: false } };

/** Igual que la ficha y "Publicar novedad": se busca por slug y, si no aparece, por UUID (la dirección vieja). */
async function cargarArtista(idOSlug: string) {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const columnas = "id, slug, nombre, creado_por";
  const porSlug = await supabase.from("artistas").select(columnas).eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("artistas").select(columnas).eq("id", idOSlug).maybeSingle()).data : null);
  return data as Pick<Artista, "id" | "slug" | "nombre" | "creado_por"> | null;
}

/**
 * "Editar novedad" (docs/rediseno/44-novedades-artista.md §6, cambiado por el founder el 2026-09-24, OL-185): solo
 * quien gestiona la ficha (autor, cuenta ligada o admin — mismo criterio que "Publicar novedad"). La novedad se
 * carga con el cliente de sesión, ya filtrada por artista: si el id no existe, es de otro artista, o se borró
 * entre que se tocó "Editar" y que cargó la pantalla, `notFound()` (la RLS, además, ya limita a lo que esta cuenta
 * puede gestionar u ocultar — segunda capa, no la única).
 */
export default async function EditarNovedadArtista({ params }: { params: Promise<{ id: string; novedadId: string }> }) {
  const { id, novedadId } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/artistas/${id}/novedades/${novedadId}/editar`)}`);
  const artista = await cargarArtista(id);
  if (!artista) notFound();
  if (id !== artista.slug) permanentRedirect(`${hrefArtista(artista)}/novedades/${novedadId}/editar`);

  const supabase = await clienteServidor();
  const { data: liga } = (await supabase?.from("artistas_cuentas").select("perfil_id").eq("artista_id", artista.id).eq("perfil_id", actual.perfil.id).maybeSingle()) ?? { data: null };
  const puedeGestionar = actual.perfil.rol === "admin" || artista.creado_por === actual.perfil.id || !!liga;
  if (!puedeGestionar) redirect(hrefArtista(artista));

  if (!esUuid(novedadId)) notFound();
  const { data: novedad } = (await supabase?.from("novedades_artista").select("id, url, titulo, texto").eq("id", novedadId).eq("artista_id", artista.id).maybeSingle()) ?? { data: null };
  if (!novedad) notFound();

  const volver = hrefArtista(artista);
  return (
    <main className="pagina">
      <Barra volver={{ href: volver, texto: "Volver a la ficha" }} />
      <h1 className="titulo">Editar novedad</h1>
      <p className="subtitulo">Para {artista.nombre}</p>
      <FormularioNovedad
        accion={actualizarNovedadArtista.bind(null, artista.id, novedad.id, volver)}
        artistaNombre={artista.nombre}
        modo="editar"
        inicial={{ url: novedad.url, titulo: novedad.titulo ?? "", texto: novedad.texto ?? "" }}
      />
      <Borrar que="la novedad" icono="artista" aviso="Se quita de tu ficha." accion={borrarNovedadArtista.bind(null, artista.id, novedad.id, volver)} />
    </main>
  );
}
