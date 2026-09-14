import Barra from "@/components/ui/Barra";
import { notFound, redirect } from "next/navigation";
import type { Evento, SitioPrivado } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioEvento from "../../FormularioEvento";
import { actualizarEvento } from "../../acciones";

export const metadata = { title: "Editar evento · Somos Nosotros" };

export default async function EditarEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/eventos/${id}/editar`)}`);
  const supabase = await clienteServidor();
  const { data } = (await supabase?.from("eventos").select("*").eq("id", id).maybeSingle()) ?? { data: null };
  if (!data) notFound();
  const evento = data as Evento;
  if (actual.perfil.rol !== "admin" && evento.creado_por !== actual.perfil.id) redirect(`/eventos/${id}`);
  const { data: lugares } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada").eq("visible", true).order("nombre")) ?? { data: [] };
  const { data: privado } = evento.sitio_reservado ? ((await supabase?.from("eventos_sitio_privado").select("direccion, lat, lng, indicaciones, revelar_desde").eq("evento_id", id).maybeSingle()) ?? { data: null }) : { data: null };
  return (
    <main className="pagina">
      <Barra volver={{ href: `/eventos/${id}`, texto: "Volver al evento" }} />
      <h1 className="titulo">Editar evento</h1>
      <FormularioEvento accion={actualizarEvento.bind(null, id)} lugares={(lugares ?? []) as LugarResumen[]} evento={evento} privado={privado as SitioPrivado | null} modo="editar" usuarioId={actual.perfil.id} />
    </main>
  );
}
