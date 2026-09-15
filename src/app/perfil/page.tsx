import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Borrar from "@/components/Borrar";
import FichaPersona from "@/components/FichaPersona";
import Barra from "@/components/ui/Barra";
import MenuAcciones from "@/components/ui/MenuAcciones";
import { enmascararCorreo } from "@/lib/comunidad";
import { usuarioActual } from "@/lib/supabase/servidor";
import { cargarPersona } from "@/app/personas/consultas";
import ficha from "@/components/ui/Ficha.module.css";
import AvisosPerfil from "./AvisosPerfil";
import EditarPerfil from "./EditarPerfil";
import { borrarMiCuenta, cerrarSesion } from "./acciones";
import styles from "./perfil.module.css";

export const metadata = { title: "Mi perfil · Somos Nosotros" };

/**
 * Mi perfil: la misma ficha de persona que ven los demás, con Editar (hoja), el renglón de Avisos (hoja con
 * interruptores) y el menú ··· (Editar · Avisos · Cerrar sesión · Borrar mi cuenta). Decisiones 5 a 9 de docs/rediseno/11.
 */
export default async function PaginaPerfil({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/perfil");
  const persona = await cargarPersona(actual.perfil.id);
  if (!persona) redirect("/entrar?siguiente=/perfil");
  const { perfil } = persona;
  const correo = actual.correo ? enmascararCorreo(actual.correo) : "tu correo";
  const llavePush = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  return (
    <main className={ficha.pagina}>
      <Barra
        volver={{ href: "/", texto: "Agenda" }}
        derecha={
          <MenuAcciones>
            <li>
              <Link href="/perfil?editar=1" className={ficha.menuItem}>
                Editar
              </Link>
            </li>
            <li>
              <Link href="/perfil?avisos=1" className={ficha.menuItem}>
                Avisos
              </Link>
            </li>
            {perfil.rol === "admin" && (
              <li>
                <Link href="/admin" className={ficha.menuItem}>
                  Administración
                </Link>
              </li>
            )}
            <li>
              <form action={cerrarSesion}>
                <button type="submit" className={ficha.menuItem}>
                  Cerrar sesión
                </button>
              </form>
            </li>
            <li className={ficha.menuItem}>
              <Borrar que="mi cuenta" aviso="Se borra tu cuenta y tu perfil. Lo que publicaste se queda, sin tu nombre." accion={borrarMiCuenta} />
            </li>
          </MenuAcciones>
        }
      />
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar la cuenta. Intenta de nuevo.
        </p>
      )}
      <Suspense>
        <FichaPersona
          perfil={perfil}
          mia
          editar={<EditarPerfil perfil={perfil} correo={correo} />}
          avisos={<AvisosPerfil correo={perfil.avisos_correo === true} telefono={perfil.avisos_push === true} correoTexto={correo} llavePush={llavePush} />}
          eventos={persona.eventos}
          interesan={persona.interesan}
          lugares={persona.lugares}
          artistas={persona.artistas}
        />
      </Suspense>
      <p className={styles.legal}>
        <Link href={`/personas/${perfil.id}`}>Así te ven los demás</Link> · <a href="/privacidad">Aviso de privacidad</a> · <a href="/reglas">Reglas de uso</a>
      </p>
    </main>
  );
}
