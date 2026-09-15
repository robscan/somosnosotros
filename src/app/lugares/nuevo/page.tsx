import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { rutaSegura } from "@/lib/rutas";
import { usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../FormularioLugar";
import { crearLugar } from "../acciones";

export const metadata = { title: "Registrar un lugar · Somos Nosotros" };

export default async function NuevoLugar({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  // Desde el alta de evento ("¿No está en la lista? Regístralo"): se vuelve ahí con el lugar ya elegido.
  const siguiente = rutaSegura((await searchParams).siguiente, "");
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/lugares/nuevo${siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : ""}`)}`);
  return (
    <main className="pagina">
      <Barra volver={siguiente ? { href: siguiente, texto: "Volver" } : { href: "/lugares", texto: "Lugares" }} />
      <h1 className="titulo">Registrar un lugar</h1>
      <p className="subtitulo">Con el nombre y la ubicación basta. Lo demás se puede agregar después.</p>
      <FormularioLugar accion={crearLugar} usuarioId={actual.perfil.id} siguiente={siguiente || undefined} esAdmin={actual.perfil.rol === "admin"} />
    </main>
  );
}
