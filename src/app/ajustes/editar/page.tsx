import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { enmascararCorreo } from "@/lib/comunidad";
import { faltaNombre } from "@/lib/perfil";
import { rutaSegura } from "@/lib/rutas";
import { usuarioActual } from "@/lib/supabase/servidor";
import FormularioPerfil from "./FormularioPerfil";
import plantilla from "@/components/ui/Plantilla.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Editar perfil"), robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ pedir?: string; siguiente?: string }> };

/**
 * Editar perfil en pantalla completa (docs/rediseno/15, decisión 6, con la corrección del founder: con el teclado
 * abierto una hoja se recorre y dificulta la lectura). Atrás vuelve a Ajustes; Guardar va en el flujo, como en las altas.
 *
 * Con `?pedir=nombre` (OL-512) es la misma pantalla para pedir el nombre a quien no lo tiene: una línea llana arriba y el renglón Nombre
 * abierto con el campo enfocado. La manda aquí una sola vez al entrar (`PedirNombre`) o el renglón «Ponle nombre a tu perfil» de su ficha;
 * con `siguiente`, Atrás y Guardar la devuelven a donde iba. Con el nombre ya puesto, la pantalla es la de siempre.
 */
export default async function EditarPerfil({ searchParams }: Props) {
  const { pedir, siguiente } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/ajustes/editar");
  const pideNombre = pedir === "nombre" && faltaNombre(actual.perfil.nombre);
  const volver = siguiente ? rutaSegura(siguiente, "/ajustes") : "/ajustes";
  return (
    <main className={plantilla.pagina}>
      <Barra volver={volver === "/ajustes" ? { href: "/ajustes", texto: "Ajustes" } : { href: volver, texto: "Atrás" }} />
      <h1 className="titulo">Editar perfil</h1>
      {pideNombre && <p className="subtitulo">¿Cómo te llamas? Así saldrá en lo que publiques.</p>}
      <FormularioPerfil perfil={actual.perfil} correo={actual.correo ? enmascararCorreo(actual.correo) : "tu correo"} pideNombre={pideNombre} volver={volver} />
    </main>
  );
}
