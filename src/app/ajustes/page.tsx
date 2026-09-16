import Link from "next/link";
import { redirect } from "next/navigation";
import Borrar from "@/components/Borrar";
import BotonCompartir from "@/components/BotonCompartir";
import Barra from "@/components/ui/Barra";
import { IconoChevronDerecha, IconoCompartir, IconoEscudo, IconoEstrella, IconoLapiz, IconoLibro, IconoPersona, IconoSalir } from "@/components/ui/Iconos";
import { enmascararCorreo } from "@/lib/comunidad";
import { TEXTO_INVITAR } from "@/lib/perfil";
import { usuarioActual } from "@/lib/supabase/servidor";
import ficha from "@/components/ui/Ficha.module.css";
import AvisosPerfil from "@/app/perfil/AvisosPerfil";
import ReservaPerfil from "@/app/perfil/ReservaPerfil";
import { borrarMiCuenta, cerrarSesion } from "@/app/perfil/acciones";
import styles from "./ajustes.module.css";

export const metadata = { title: "Ajustes · Somos Nosotros" };
const ORIGEN = "https://somosnosotros.org";

/**
 * Ajustes: lo que se configura, fuera de la ficha (docs/rediseno/13, decisiones 5 y 6). Cuatro grupos en tarjetas
 * (Tu ficha · Avisos · Cuenta · Somos Nosotros) y Borrar mi cuenta suelto al final. Editar abre su propia pantalla (/ajustes/editar).
 */
export default async function Ajustes({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/ajustes");
  const { perfil } = actual;
  const correo = actual.correo ? enmascararCorreo(actual.correo) : "tu correo";
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/perfil", texto: "Mi perfil" }} />
      <h1 className={styles.titulo}>Ajustes</h1>
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar la cuenta. Intenta de nuevo.
        </p>
      )}
      <div className={styles.ajustes}>
        <h2>Tu ficha</h2>
        <ul className={styles.tarjeta}>
          <li>
            <Link href="/ajustes/editar" className={styles.fila}>
              <IconoLapiz width={20} height={20} />
              <b>Editar</b>
              <small>Foto, nombre, colonia, sobre ti</small>
              <span className={styles.valor}>
                <IconoChevronDerecha />
              </span>
            </Link>
          </li>
          <ReservaPerfil reservado={perfil.reservado === true} />
        </ul>

        <h2>Avisos</h2>
        <ul className={styles.tarjeta}>
          <AvisosPerfil correo={perfil.avisos_correo === true} telefono={perfil.avisos_push === true} correoTexto={correo} llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        </ul>

        <h2>Cuenta</h2>
        <ul className={styles.tarjeta}>
          <li className={styles.fila}>
            <IconoPersona width={20} height={20} />
            <b>Entras con {correo}</b>
            <small>Sin contraseña: cada vez te mandamos un código</small>
          </li>
          <li>
            <form action={cerrarSesion}>
              <button type="submit" className={styles.fila}>
                <IconoSalir width={20} height={20} />
                <b>Cerrar sesión</b>
                <span className={styles.valor}>
                  <IconoChevronDerecha />
                </span>
              </button>
            </form>
          </li>
        </ul>

        <h2>Somos Nosotros</h2>
        <ul className={styles.tarjeta}>
          <li>
            <BotonCompartir titulo="Somos Nosotros" texto={TEXTO_INVITAR} url={ORIGEN} className={styles.fila}>
              <IconoCompartir width={20} height={20} />
              <b>Invita a tus amigos</b>
              <small>Se comparte el enlace del sitio</small>
              <span className={styles.valor}>
                <IconoChevronDerecha />
              </span>
            </BotonCompartir>
          </li>
          {perfil.rol === "admin" && (
            <li>
              <Link href="/admin" className={styles.fila}>
                <IconoEstrella width={20} height={20} />
                <b>Administración</b>
                <small>Reportes, ocultar y mostrar fichas</small>
                <span className={styles.valor}>
                  <IconoChevronDerecha />
                </span>
              </Link>
            </li>
          )}
          <li>
            <Link href="/privacidad" className={styles.fila}>
              <IconoEscudo width={20} height={20} />
              <b>Aviso de privacidad</b>
              <span className={styles.valor}>
                <IconoChevronDerecha />
              </span>
            </Link>
          </li>
          <li>
            <Link href="/reglas" className={styles.fila}>
              <IconoLibro width={20} height={20} />
              <b>Reglas de uso</b>
              <span className={styles.valor}>
                <IconoChevronDerecha />
              </span>
            </Link>
          </li>
        </ul>

        <Borrar que="mi cuenta" icono="persona" aviso="Se borra tu cuenta y tu perfil. Lo que publicaste se queda, sin tu nombre." accion={borrarMiCuenta} />
      </div>
    </main>
  );
}
