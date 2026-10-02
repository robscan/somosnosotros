import { IconoFlama } from "./Iconos";
import styles from "./MarcaDestacado.module.css";

/**
 * La marca de un evento destacado (OL-253; founder, 2026-10-01): una flama violeta de trazo, como los demás iconos, en un círculo de vidrio, arriba a la izquierda de la
 * foto de su tarjeta o de la miniatura de su renglón (la esquina que queda libre: el botón va a la derecha y el rótulo, abajo). No
 * es una estrella porque la estrella ya es la pestaña Artistas. Quien la lleva le da su sitio con `className` (el área de su
 * rejilla) y su lado con `--marca-lado` (`--marca-tarjeta` o `--marca-renglon`, globals.css).
 */
export default function MarcaDestacado({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Destacado" className={className ? `${styles.marca} ${className}` : styles.marca}>
      <IconoFlama />
    </span>
  );
}
