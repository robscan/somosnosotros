import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/supabase/servidor";
import FormularioPerfil from "./FormularioPerfil";

export const metadata = { title: "Mi perfil · somosnosotros" };

export default async function PaginaPerfil({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/perfil");
  return (
    <main className="pagina">
      <Link href="/" className="enlace-volver">
        ← Volver al mapa
      </Link>
      <h1 className="titulo">Mi perfil</h1>
      <p className="subtitulo">
        {actual.correo}
        {actual.perfil.rol === "admin" ? " · administrador" : ""}
      </p>
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar la cuenta. Intenta de nuevo.
        </p>
      )}
      <FormularioPerfil perfil={actual.perfil} />
    </main>
  );
}
