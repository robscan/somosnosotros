import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Lugar } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../../FormularioLugar";
import { actualizarLugar } from "../../acciones";

export const metadata = { title: "Editar lugar · somosnosotros" };

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
      <Link href={`/lugares/${id}`} className="enlace-volver">
        ← Volver al lugar
      </Link>
      <h1 className="titulo">Editar lugar</h1>
      <FormularioLugar accion={actualizarLugar.bind(null, id)} lugar={lugar} usuarioId={actual.perfil.id} />
    </main>
  );
}
