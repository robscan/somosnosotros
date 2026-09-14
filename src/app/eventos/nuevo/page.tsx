import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { lecturaDeCartelActiva } from "@/lib/cartel";
import type { Evento } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioEvento from "../FormularioEvento";
import { crearEvento } from "../acciones";

export const metadata = { title: "Publicar un evento · Somos Nosotros" };

export default async function NuevoEvento({ searchParams }: { searchParams: Promise<{ lugar?: string; desde?: string }> }) {
  const { lugar, desde } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/eventos/nuevo${lugar ? `?lugar=${lugar}` : ""}`)}`);
  const supabase = await clienteServidor();
  const { data: lugares } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada").eq("visible", true).order("nombre")) ?? { data: [] };
  let base: Partial<Evento> | undefined;
  if (desde && /^[0-9a-f-]{36}$/.test(desde)) {
    const { data } = (await supabase?.from("eventos").select("*").eq("id", desde).maybeSingle()) ?? { data: null };
    if (data) base = { ...(data as Evento), id: undefined, inicio: undefined, fin: undefined };
  }
  return (
    <main className="pagina">
      <Barra volver={{ href: base?.lugar_id ? `/lugares/${base.lugar_id}` : lugar ? `/lugares/${lugar}` : "/", texto: "Volver" }} />
      <h1 className="titulo">{base ? "Duplicar evento" : "Publicar un evento"}</h1>
      <p className="subtitulo">{base ? "Mismo evento, nueva fecha. Cambia lo que haga falta." : "Qué y cuándo; lo demás ya está resuelto y se puede cambiar."}</p>
      <FormularioEvento accion={crearEvento} lugares={(lugares ?? []) as LugarResumen[]} lugarInicial={lugar} evento={base} modo={base ? "duplicar" : "alta"} usuarioId={actual.perfil.id} cartelActivo={lecturaDeCartelActiva()} />
    </main>
  );
}
