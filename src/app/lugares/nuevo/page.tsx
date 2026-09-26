import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { rutaSegura } from "@/lib/rutas";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../FormularioLugar";
import { crearLugar } from "../acciones";

export const metadata = { title: "Registrar un lugar · Somos Nosotros", robots: { index: false, follow: false } };

export default async function NuevoLugar({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  // Desde el alta de evento ("¿No está en la lista? Regístralo"): se vuelve ahí con el lugar ya elegido.
  const siguiente = rutaSegura((await searchParams).siguiente, "");
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/lugares/nuevo${siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : ""}`)}`);
  const supabase = await clienteServidor();
  // Pines de "Dónde está" (OL-211): los lugares visibles (con los privados propios entre ellos, que la política de
  // lectura ya deja pasar), solo para avisar "ya existe" -nunca para elegirlos, aquí se está creando uno nuevo.
  const { data: lugares } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre")) ?? { data: [] };
  return (
    <main className="pagina">
      <Barra cerrar={siguiente ? { href: siguiente, texto: "Volver" } : { href: "/lugares", texto: "Lugares" }} />
      <h1 className="titulo">Registrar un lugar</h1>
      <p className="subtitulo">Con el nombre y dónde está basta. Lo demás se puede agregar después.</p>
      <FormularioLugar accion={crearLugar} usuarioId={actual.perfil.id} siguiente={siguiente || undefined} esAdmin={actual.perfil.rol === "admin"} lugares={(lugares ?? []) as LugarResumen[]} />
    </main>
  );
}
