import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../FormularioLugar";
import { crearLugar } from "../acciones";

export const metadata = { title: "Registrar un lugar · somosnosotros" };

export default async function NuevoLugar() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/lugares/nuevo");
  return (
    <main className="pagina">
      <Link href="/" className="enlace-volver">
        ← Volver al mapa
      </Link>
      <h1 className="titulo">Registrar un lugar</h1>
      <p className="subtitulo">Un centro cultural, foro, galería, colectivo o biblioteca de la ciudad. Lo publicas tú; puedes editarlo después.</p>
      <FormularioLugar accion={crearLugar} usuarioId={actual.perfil.id} />
    </main>
  );
}
