"use client";

import type { ReactNode } from "react";
import styles from "./Seccion.module.css";

type Props = {
  titulo: string;
  /** Lo ya resuelto, en una línea. */
  resumen: ReactNode;
  abierta: boolean;
  onAbrir: () => void;
  error?: boolean;
  /** Verbo del renglón cerrado: "Cambiar" (ya resuelto) o "Añadir" (vacío y opcional). */
  accion?: string;
  children: ReactNode;
};

/**
 * Renglón que muestra lo decidido y se abre solo para cambiarlo (una cosa a la vez).
 * El contenido sigue en el formulario aunque esté cerrado: los campos se envían igual.
 */
export default function Seccion({ titulo, resumen, abierta, onAbrir, error = false, accion = "Cambiar", children }: Props) {
  return (
    <section className={`${styles.seccion} ${abierta ? styles.abierta : ""} ${error ? styles.conError : ""}`}>
      {!abierta && (
        <button type="button" className={styles.renglon} onClick={onAbrir} aria-expanded={false}>
          <span className={styles.titulo}>{titulo}</span>
          <span className={styles.resumen}>{resumen}</span>
          <span className={styles.cambiar} aria-hidden="true">
            {accion}
          </span>
        </button>
      )}
      <div className={styles.contenido} hidden={!abierta}>
        {abierta && <p className={styles.tituloAbierto}>{titulo}</p>}
        {children}
      </div>
    </section>
  );
}
