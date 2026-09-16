"use client";

import { useVolver } from "./Atras";
import { IconoCerrar } from "./Iconos";
import styles from "./Cerrar.module.css";

/**
 * Cerrar (pedido del founder, 2026-09-16): en los formularios de alta no hay Atrás sino una ✕ en el extremo derecho
 * de la barra, como se cierra una tarea que empezó y no se terminó. Vuelve igual que Atrás (pantalla anterior o
 * `href`) y respeta la guardia de salida ("¿Salir sin publicar?"). Botón redondo, solo icono; el texto va para quien lo lea.
 */
export default function Cerrar({ href, texto }: { href: string; texto: string }) {
  const volver = useVolver(href);
  return (
    <a href={href} className={styles.cerrar} onClick={volver} aria-label={`Cerrar (${texto})`}>
      <IconoCerrar width={20} height={20} />
    </a>
  );
}
