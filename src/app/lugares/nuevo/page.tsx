import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../FormularioLugar";
import { crearLugar } from "../acciones";

export const metadata = { title: "Registrar un lugar · Somos Nosotros" };

export default async function NuevoLugar() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/lugares/nuevo");
  return (
    <main className="pagina">
      <Barra volver={{ href: "/", texto: "Volver al mapa" }} />
      <h1 className="titulo">Registrar un lugar</h1>
      <p className="subtitulo">Con el nombre y la ubicación basta. Lo demás se puede agregar después.</p>
      <FormularioLugar accion={crearLugar} usuarioId={actual.perfil.id} />
    </main>
  );
}
