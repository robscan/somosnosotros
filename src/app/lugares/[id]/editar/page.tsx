import Barra from "@/components/ui/Barra";
import { notFound, redirect } from "next/navigation";
import type { Lugar } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../../FormularioLugar";
import { actualizarLugar } from "../../acciones";

export const metadata = { title: "Editar lugar · Somos Nosotros" };

export default async function EditarLugar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/lugares/${id}/editar`)}`);
  const supabase = await clienteServidor();
  const { data } = (await supabase?.from("lugares").select("*").eq("id", id).maybeSingle()) ?? { data: null };
  if (!data) notFound();
  const lugar = data as Lugar;
  if (actual.perfil.rol !== "admin" && lugar.creado_por !== actual.perfil.id) redirect(`/lugares/${id}`);
  return (
    <main className="pagina">
      <Barra volver={{ href: `/lugares/${id}`, texto: "Volver al lugar" }} />
      <h1 className="titulo">Editar lugar</h1>
      <FormularioLugar accion={actualizarLugar.bind(null, id)} lugar={lugar} usuarioId={actual.perfil.id} />
    </main>
  );
}
