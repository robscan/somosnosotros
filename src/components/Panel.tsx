import Link from "next/link";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { usuarioActual } from "@/lib/supabase/servidor";
import styles from "./Panel.module.css";

/**
 * Panel inferior sobre el mapa. Solo el estado "asomado" (peek);
 * los estados medium/expanded y los gestos (docs/heredado/front/BOTTOM_SHEET.md)
 * entran cuando haya lugares y eventos que mostrar (Fases 2 y 3).
 */
export default async function Panel({ cuentaBorrada = false }: { cuentaBorrada?: boolean }) {
  const actual = await usuarioActual();
  return (
    <section className={styles.panel} aria-label="Panel">
      <div className={styles.asa} aria-hidden="true" />
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.titulo}>somosnosotros</h1>
          <p className={styles.ciudad}>{CIUDAD_INICIAL.nombre}</p>
        </div>
        {actual ? (
          <Link href="/perfil" className={styles.persona} aria-label="Mi perfil">
            {actual.perfil.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
              <img src={actual.perfil.foto} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatar}>{(actual.perfil.nombre || "?").slice(0, 1).toUpperCase()}</span>
            )}
            <span className={styles.nombre}>{actual.perfil.nombre || "Mi perfil"}</span>
          </Link>
        ) : (
          <Link href="/entrar" className={styles.entrar}>
            Entrar
          </Link>
        )}
      </div>
      {cuentaBorrada && (
        <p className={styles.aviso} role="status">
          Tu cuenta quedó borrada. Gracias por haber estado.
        </p>
      )}
      <p className={styles.vacio}>Aún no hay lugares ni eventos.</p>
    </section>
  );
}
