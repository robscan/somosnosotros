import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/supabase/servidor";
import { rutaSegura } from "@/lib/rutas";
import FormularioEntrar from "./FormularioEntrar";

export const metadata = { title: "Entrar · somosnosotros" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ siguiente?: string; error?: string }> }) {
  const { siguiente, error } = await searchParams;
  const destino = rutaSegura(siguiente, "/perfil");
  if (await usuarioActual()) redirect(destino);
  return (
    <main className="pagina">
      <Link href="/" className="enlace-volver">
        ← Volver al mapa
      </Link>
      <h1 className="titulo">Entrar</h1>
      <p className="subtitulo">Sin contraseñas: te mandamos un enlace a tu correo, o entras con Google.</p>
      {error === "enlace" && (
        <p className="aviso-error" role="alert">
          Ese enlace ya no sirve. Pide uno nuevo.
        </p>
      )}
      <FormularioEntrar siguiente={destino} />
    </main>
  );
}
