import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/supabase/servidor";
import FormularioArtista from "../FormularioArtista";
import { crearArtista } from "../acciones";

export const metadata = { title: "Registrar artista · Somos Nosotros" };

export default async function NuevoArtista({ searchParams }: { searchParams: Promise<{ nombre?: string }> }) {
  const { nombre } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/artistas/nuevo${nombre ? `?nombre=${encodeURIComponent(nombre)}` : ""}`)}`);
  return (
    <main className="pagina">
      <Barra volver={{ href: "/artistas", texto: "Artistas" }} />
      <h1 className="titulo">Registrar artista</h1>
      <p className="subtitulo">Con el nombre basta. Lo demás se puede completar después.</p>
      <FormularioArtista accion={crearArtista} usuarioId={actual.perfil.id} nombreInicial={nombre?.slice(0, 80)} />
    </main>
  );
}
