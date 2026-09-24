import Barra from "@/components/ui/Barra";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { esUuid } from "@/lib/formulario";
import { hrefArtista, type Artista } from "@/lib/artistas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { publicarNovedadArtista } from "../acciones";
import FormularioNovedad from "./FormularioNovedad";

export const metadata = { title: "Publicar novedad · Somos Nosotros", robots: { index: false, follow: false } };

/** Igual que la ficha y Editar artista: se busca por slug y, si no aparece, por UUID (la dirección vieja). */
async function cargarArtista(idOSlug: string) {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const columnas = "id, slug, nombre, creado_por";
  const porSlug = await supabase.from("artistas").select(columnas).eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("artistas").select(columnas).eq("id", idOSlug).maybeSingle()).data : null);
  return data as Pick<Artista, "id" | "slug" | "nombre" | "creado_por"> | null;
}

/** "Publicar novedad" (doc 44, fase 1): solo quien gestiona la ficha (autor, cuenta ligada o admin). */
export default async function PublicarNovedadArtista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/artistas/${id}/novedades/nueva`)}`);
  const artista = await cargarArtista(id);
  if (!artista) notFound();
  if (id !== artista.slug) permanentRedirect(`${hrefArtista(artista)}/novedades/nueva`);

  const supabase = await clienteServidor();
  const { data: liga } = (await supabase?.from("artistas_cuentas").select("perfil_id").eq("artista_id", artista.id).eq("perfil_id", actual.perfil.id).maybeSingle()) ?? { data: null };
  const puedeGestionar = actual.perfil.rol === "admin" || artista.creado_por === actual.perfil.id || !!liga;
  if (!puedeGestionar) redirect(hrefArtista(artista));

  return (
    <main className="pagina">
      <Barra volver={{ href: hrefArtista(artista), texto: "Volver a la ficha" }} />
      <h1 className="titulo">Publicar novedad</h1>
      <p className="subtitulo">Para {artista.nombre}</p>
      <FormularioNovedad accion={publicarNovedadArtista.bind(null, artista.id, hrefArtista(artista))} artistaNombre={artista.nombre} />
    </main>
  );
}
