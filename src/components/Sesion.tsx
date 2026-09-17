import Link from "next/link";
import { cargarNovedades } from "@/app/novedades/consultas";
import { usuarioActual } from "@/lib/supabase/servidor";
import { IconoCampana } from "./ui/Iconos";
import VistoHoy from "./VistoHoy";
import styles from "./Sesion.module.css";

/**
 * Lado derecho de la barra raíz: sin sesión, "Entrar" como acción primaria (lo único con color de acción);
 * con sesión, la campana de Novedades (con punto si hay algo no visto; decisión 2 de docs/rediseno/13) y la foto
 * de perfil, que lleva a Mi perfil. Dos hijos directos de la barra, sin envoltorio (VistoHoy no pinta nada: guarda que
 * abrió la app hoy, D3 de docs/rediseno/18).
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
  const { hay } = await cargarNovedades(actual.perfil.id, actual.perfil.novedades_vistas_en ?? null);
  return (
    <>
      <Link href="/novedades" className={styles.campana} aria-label={hay ? "Novedades, hay nuevas" : "Novedades"}>
        <IconoCampana />
        {hay && <span className={styles.punto} aria-hidden="true" />}
      </Link>
      <Link href="/perfil" className={styles.perfil} aria-label={`Mi perfil, ${actual.perfil.nombre || "sin nombre"}`}>
        {actual.perfil.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={actual.perfil.foto} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatar}>{inicial}</span>
        )}
      </Link>
      <VistoHoy />
    </>
  );
}
