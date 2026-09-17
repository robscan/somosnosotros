import { esUuid } from "@/lib/formulario";
import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { cargarMisArtistas, cargarQuien } from "@/app/artistas/consultas";
import { lecturaDeCartelActiva } from "@/lib/cartel";
import type { QuienItem } from "@/lib/artistas";
import type { Evento } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioEvento from "../FormularioEvento";
import { crearEvento } from "../acciones";

export const metadata = { title: "Publicar un evento · Somos Nosotros" };

export default async function NuevoEvento({ searchParams }: { searchParams: Promise<{ lugar?: string; desde?: string; artista?: string }> }) {
  const { lugar, desde, artista } = await searchParams;
  const actual = await usuarioActual();
  const volverA = `/eventos/nuevo${lugar ? `?lugar=${lugar}` : artista ? `?artista=${artista}` : ""}`;
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(volverA)}`);
  const supabase = await clienteServidor();
  const { data: lugares } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona").eq("visible", true).order("nombre")) ?? { data: [] };
  let base: Partial<Evento> | undefined;
  let quien: QuienItem[] | undefined;
  if (desde && esUuid(desde)) {
    const { data } = (await supabase?.from("eventos").select("*").eq("id", desde).maybeSingle()) ?? { data: null };
    if (data) {
      base = { ...(data as Evento), id: undefined, inicio: undefined, fin: undefined };
      quien = await cargarQuien(desde);
    }
  }
  // Desde la ficha de un artista ("Publicar una fecha de X"): Quién ya viene resuelto.
  if (!quien && artista && esUuid(artista)) {
    const { data } = (await supabase?.from("artistas").select("id, nombre").eq("id", artista).maybeSingle()) ?? { data: null };
    if (data) quien = [{ id: data.id as string, nombre: data.nombre as string }];
  }
  const mios = await cargarMisArtistas(actual.perfil.id);
  const volver = base?.lugar_id ? `/lugares/${base.lugar_id}` : lugar ? `/lugares/${lugar}` : artista ? `/artistas/${artista}` : "/";
  return (
    <main className="pagina">
      <Barra cerrar={{ href: volver, texto: "Volver" }} />
      <h1 className="titulo">{base ? "Duplicar evento" : "Publicar un evento"}</h1>
      <p className="subtitulo">{base ? "Mismo evento, nueva fecha. Cambia lo que haga falta." : "Con el nombre y dónde basta. Lo demás ya está resuelto."}</p>
      <FormularioEvento accion={crearEvento} lugares={(lugares ?? []) as LugarResumen[]} lugarInicial={lugar} evento={base} modo={base ? "duplicar" : "alta"} usuarioId={actual.perfil.id} cartelActivo={lecturaDeCartelActiva()} quienInicial={quien} mios={mios} esAdmin={actual.perfil.rol === "admin"} volverA={volverA} />
    </main>
  );
}
