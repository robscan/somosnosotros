import Barra from "@/components/ui/Barra";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cargarMisArtistas, cargarQuien } from "@/app/artistas/consultas";
import { esUuid } from "@/lib/formulario";
import { hrefEvento, type Evento, type SitioPrivado } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { zonaDelSitio } from "@/lib/zona";
import FormularioEvento from "../../FormularioEvento";
import { actualizarEvento } from "../../acciones";

export const metadata = { title: "Editar evento · Somos Nosotros" };

/** Igual que la ficha: se busca por slug y, si no aparece, por UUID (la dirección vieja). */
async function cargarEvento(idOSlug: string) {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const porSlug = await supabase.from("eventos").select("*").eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("eventos").select("*").eq("id", idOSlug).maybeSingle()).data : null);
  return data as (Evento & { actualizado_en: string }) | null;
}

export default async function EditarEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/eventos/${id}/editar`)}`);
  const evento = await cargarEvento(id);
  if (!evento) notFound();
  // Dirección vieja (/eventos/<uuid>/editar): redirige a la de hoy, con el mismo id real por debajo.
  if (id !== evento.slug) permanentRedirect(`${hrefEvento(evento)}/editar`);
  if (actual.perfil.rol !== "admin" && evento.creado_por !== actual.perfil.id) redirect(hrefEvento(evento));
  const supabase = await clienteServidor();
  const { data: lugares } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona").eq("visible", true).order("nombre")) ?? { data: [] };
  const { data: privado } = evento.sitio_reservado ? ((await supabase?.from("eventos_sitio_privado").select("direccion, lat, lng, indicaciones, revelar_desde").eq("evento_id", evento.id).maybeSingle()) ?? { data: null }) : { data: null };
  const [quien, mios] = await Promise.all([cargarQuien(evento.id), cargarMisArtistas(actual.perfil.id)]);
  return (
    <main className="pagina">
      <Barra volver={{ href: hrefEvento(evento), texto: "Volver al evento" }} />
      <h1 className="titulo">Editar evento</h1>
      <FormularioEvento accion={actualizarEvento.bind(null, evento.id)} lugares={(lugares ?? []) as LugarResumen[]} evento={evento} revision={evento.actualizado_en} privado={privado as SitioPrivado | null} zonaSitio={zonaDelSitio(evento, privado as SitioPrivado | null)} modo="editar" usuarioId={actual.perfil.id} quienInicial={quien} mios={mios} esAdmin={actual.perfil.rol === "admin"} />
    </main>
  );
}
