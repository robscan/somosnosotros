import Link from "next/link";
import type { ReactNode } from "react";
import Logotipo from "./Logotipo";
import styles from "./Barra.module.css";

type Props = {
  /** Pantalla interior: regreso a la izquierda y logotipo al centro (nada a la derecha). */
  volver?: { href: string; texto: string };
  /** Pantalla raíz: logotipo a la izquierda y esto a la derecha (la sesión). */
  derecha?: ReactNode;
};

/**
 * Barra superior. Raíz (Agenda, Lugares, Artistas): SMSNSTRS a la izquierda, sesión a la derecha,
 * como la gente espera (Jakob). Interior: regreso a la izquierda, SMSNSTRS al centro.
 */
export default function Barra({ volver, derecha }: Props) {
  if (volver) {
    return (
      <header className={`${styles.barra} ${styles.interior}`}>
        <Link href={volver.href} className={styles.volver}>
          ← {volver.texto}
        </Link>
        <Logotipo />
        <span className={styles.hueco} aria-hidden="true" />
      </header>
    );
  }
  return (
    <header className={`${styles.barra} ${styles.raiz}`}>
      <Logotipo />
      <div className={styles.derecha}>{derecha}</div>
    </header>
  );
}
