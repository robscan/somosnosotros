import Link from "next/link";
import { usuarioActual } from "@/lib/supabase/servidor";
import styles from "./Sesion.module.css";

/**
 * Lado derecho de la barra raíz: sin sesión, "Entrar" como acción primaria (lo único con color de acción);
 * con sesión, solo la foto de perfil, que lleva a Mi perfil.
 */
export default async function Sesion() {
  const actual = await usuarioActual();
  if (!actual) {
    return (
      <Link href="/entrar" className={styles.entrar}>
        Entrar
      </Link>
    );
  }
  const inicial = (actual.perfil.nombre || "?").slice(0, 1).toUpperCase();
  return (
    <Link href="/perfil" className={styles.perfil} aria-label={`Mi perfil, ${actual.perfil.nombre || "sin nombre"}`}>
      {actual.perfil.foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
        <img src={actual.perfil.foto} alt="" className={styles.avatar} />
      ) : (
        <span className={styles.avatar}>{inicial}</span>
      )}
    </Link>
  );
}
