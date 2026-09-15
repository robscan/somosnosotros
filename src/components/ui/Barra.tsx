import type { ReactNode } from "react";
import Atras from "./Atras";
import Logotipo from "./Logotipo";
import styles from "./Barra.module.css";

type Props = {
  /** Pantalla interior: regreso a la izquierda y logotipo al centro. */
  volver?: { href: string; texto: string };
  /** A la derecha: en raíz, la sesión; en interior, solo un menú "···" cuando hay algo que poner. */
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
        <Atras href={volver.href} texto={volver.texto} />
        <Logotipo />
        <div className={styles.derecha}>{derecha}</div>
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
