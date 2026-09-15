import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { enmascararCorreo } from "@/lib/comunidad";
import { usuarioActual } from "@/lib/supabase/servidor";
import FormularioPerfil from "./FormularioPerfil";

export const metadata = { title: "Editar perfil · Somos Nosotros" };

/**
 * Editar perfil en pantalla completa (docs/rediseno/15, decisión 6, con la corrección del founder: con el teclado
 * abierto una hoja se recorre y dificulta la lectura). Atrás vuelve a Ajustes; Guardar va en el flujo, como en las altas.
 */
export default async function EditarPerfil() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/ajustes/editar");
  return (
    <main className="pagina">
      <Barra volver={{ href: "/ajustes", texto: "Ajustes" }} />
      <h1 className="titulo">Editar perfil</h1>
      <FormularioPerfil perfil={actual.perfil} correo={actual.correo ? enmascararCorreo(actual.correo) : "tu correo"} />
    </main>
  );
}
