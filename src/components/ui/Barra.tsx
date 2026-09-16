import type { ReactNode } from "react";
import Atras from "./Atras";
import Cerrar from "./Cerrar";
import Logotipo from "./Logotipo";
import styles from "./Barra.module.css";

type Props = {
  /** Pantalla interior: regreso a la izquierda y logotipo al centro. */
  volver?: { href: string; texto: string };
  /** Formulario de alta: sin regreso; una ✕ a la derecha que vuelve igual que Atrás (founder, 2026-09-16). */
  cerrar?: { href: string; texto: string };
  /** A la derecha, como hijo directo de la barra: en raíz, la sesión; en interior, solo un menú "···" cuando hay algo que poner. */
  derecha?: ReactNode;
};

/**
 * Barra superior. Raíz (Agenda, Lugares, Artistas): SMSNSTRS a la izquierda, sesión a la derecha,
 * como la gente espera (Jakob). Interior: regreso a la izquierda, SMSNSTRS al centro. Alta: SMSNSTRS al centro y ✕ a la derecha.
 */
export default function Barra({ volver, cerrar, derecha }: Props) {
  if (cerrar) {
    return (
      <header className={`${styles.barra} ${styles.interior} ${styles.alta}`}>
        <Logotipo chico />
        <Cerrar href={cerrar.href} texto={cerrar.texto} />
      </header>
    );
  }
  if (volver) {
    return (
      <header className={`${styles.barra} ${styles.interior}`}>
        <Atras href={volver.href} texto={volver.texto} />
        <Logotipo chico />
        {derecha}
      </header>
    );
  }
  return (
    <header className={`${styles.barra} ${styles.raiz}`}>
      <Logotipo />
      {derecha}
    </header>
  );
}
