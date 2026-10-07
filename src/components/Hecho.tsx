"use client";

import { useEffect, useRef } from "react";
import useSobreLaPastilla from "./ui/useSobreLaPastilla";
import styles from "./Hecho.module.css";

type Props = {
  texto: string;
  onDeshacer?: () => void;
  onCerrar: () => void;
  /** El botón: "Deshacer" tras un éxito; "Reintentar" si no se pudo guardar. */
  etiqueta?: string;
  /** No se pudo guardar: se anuncia como alerta. */
  fallo?: boolean;
};

/**
 * Aviso breve de algo hecho desde una lista al deslizar ("Te interesa «…»", "Sigues a …"), con Deshacer; o de que no se
 * pudo guardar, con Reintentar. Se va solo a los 7 s (con 5 no daba tiempo a decidir). Quien lo usa le da una `key` nueva
 * en cada acción para reiniciar el tiempo. Flota sobre la navegación de abajo (la barra del teléfono) o, si hay una pastilla flotante a la vista (la de Voy o
 * Seguir en una ficha, `data-flotantes`), sobre ella: se mide al salir, donde la pastilla está en ese momento.
 */
export default function Hecho({ texto, onDeshacer, onCerrar, etiqueta = "Deshacer", fallo = false }: Props) {
  const cerrar = useRef(onCerrar);
  const aviso = useSobreLaPastilla<HTMLParagraphElement>();
  useEffect(() => {
    cerrar.current = onCerrar;
  });
  useEffect(() => {
    const t = setTimeout(() => cerrar.current(), 7000);
    return () => clearTimeout(t);
  }, []);
  return (
    <p ref={aviso} className={styles.hecho} role={fallo ? "alert" : "status"}>
      <span>{texto}</span>
      {onDeshacer && (
        <button
          type="button"
          onClick={() => {
            onDeshacer();
            onCerrar();
          }}
        >
          {etiqueta}
        </button>
      )}
    </p>
  );
}
