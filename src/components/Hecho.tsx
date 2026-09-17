"use client";

import { useEffect, useRef } from "react";
import styles from "./Hecho.module.css";

type Props = { texto: string; onDeshacer?: () => void; onCerrar: () => void };

/**
 * Confirmación breve de algo hecho desde una lista al deslizar ("Te interesa «…»", "Sigues a …"), con Deshacer.
 * Solo para éxitos; se va sola a los 7 s (con 5 no daba tiempo a decidir deshacer). Quien la usa le da una `key` nueva en cada acción para reiniciar el tiempo.
 */
export default function Hecho({ texto, onDeshacer, onCerrar }: Props) {
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });
  useEffect(() => {
    const t = setTimeout(() => cerrar.current(), 7000);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className={styles.hecho} role="status">
      <span>{texto}</span>
      {onDeshacer && (
        <button
          type="button"
          onClick={() => {
            onDeshacer();
            onCerrar();
          }}
        >
          Deshacer
        </button>
      )}
    </p>
  );
}
