import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { ciudadPorSlug, CIUDAD_INICIAL } from "@/lib/ciudad";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioArtista from "../FormularioArtista";
import { crearArtista } from "../acciones";

export const metadata = { title: "Registrar artista · Somos Nosotros" };

export default async function NuevoArtista({ searchParams }: { searchParams: Promise<{ nombre?: string; ciudad?: string }> }) {
  const { nombre, ciudad: slug } = await searchParams;
  const p = new URLSearchParams();
  if (slug) p.set("ciudad", slug);
  if (nombre) p.set("nombre", nombre);
  const q = p.toString();
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/artistas/nuevo${q ? `?${q}` : ""}`)}`);
  // Un artista no tiene punto del que deducir ciudad: de entrada, la que la persona tenía elegida en Artistas; se cambia en el renglón Ciudad.
  const ciudades = await cargarCiudadesDeArtistas(await clienteServidor());
  const ciudad = ciudadPorSlug(slug, ciudades);
  return (
    <main className="pagina">
      <Barra cerrar={{ href: `/artistas${ciudad.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${ciudad.slug}`}`, texto: "Artistas" }} />
      <h1 className="titulo">Registrar artista</h1>
      <p className="subtitulo">Con el nombre basta. Lo demás se puede completar después.</p>
      <FormularioArtista accion={crearArtista} usuarioId={actual.perfil.id} nombreInicial={nombre?.slice(0, 80)} esAdmin={actual.perfil.rol === "admin"} ciudadInicial={ciudad.nombre} ciudades={ciudades} />
    </main>
  );
}
