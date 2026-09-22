import Link from "next/link";
import { contarPendientes } from "@/app/admin/consultas";
import { cargarNovedades } from "@/app/novedades/consultas";
import { usuarioActual } from "@/lib/supabase/servidor";
import { IconoCampana, IconoEscudo } from "./ui/Iconos";
import VistoHoy from "./VistoHoy";
import styles from "./Sesion.module.css";

/**
 * Lado derecho de la barra raíz: sin sesión, "Entrar" como acción primaria (lo único con color de acción);
 * con sesión, la campana de Novedades (con punto si hay algo no visto; decisión 2 de docs/rediseno/13), el acceso
 * a Administración solo para administradores (L40, OL-115; con punto si hay algo por revisar, mismo dato que
 * `contarPendientes()` ya usa en Ajustes) y la foto de perfil, que lleva a Mi perfil. Hijos directos de la barra,
 * sin envoltorio (VistoHoy no pinta nada: guarda que abrió la app hoy, D3 de docs/rediseno/18).
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
  const esAdmin = actual.perfil.rol === "admin";
  const inicial = (actual.perfil.nombre || "?").slice(0, 1).toUpperCase();
  const [{ hay }, pendientes] = await Promise.all([
    cargarNovedades(actual.perfil.id, actual.perfil.novedades_vistas_en ?? null),
    esAdmin ? contarPendientes() : Promise.resolve(null),
  ]);
  return (
    <>
      <Link href="/novedades" className={styles.campana} aria-label={hay ? "Novedades, hay nuevas" : "Novedades"}>
        <IconoCampana />
        {hay && <span className={styles.punto} aria-hidden="true" />}
      </Link>
      {esAdmin && (
        <Link href="/admin" className={styles.admin} aria-label={pendientes ? "Administración, hay algo por revisar" : "Administración"}>
          <IconoEscudo />
          {!!pendientes && <span className={styles.punto} aria-hidden="true" />}
        </Link>
      )}
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
