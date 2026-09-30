import type { ReactNode } from "react";
import styles from "./IconoEnCirculo.module.css";

/**
 * El círculo gris con un icono al centro que encabeza una confirmación (Borrar, Bloquear) o un estado vacío
 * («Evento borrado»): solo adorno, el texto de debajo dice lo mismo. El icono trae su propio tamaño.
 */
export default function IconoEnCirculo({ children }: { children: ReactNode }) {
  return (
    <span className={styles.circulo} aria-hidden="true">
      {children}
    </span>
  );
}
