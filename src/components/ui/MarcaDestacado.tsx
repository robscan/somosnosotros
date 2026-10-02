import { IconoCinta } from "./Iconos";
import styles from "./MarcaDestacado.module.css";

/**
 * La marca de un evento destacado (OL-253; founder, 2026-10-01): una cinta violeta, como un separador de libro, que cuelga del borde
 * superior de la foto de su tarjeta o de la miniatura de su renglón, a la izquierda. Sin círculo: la flama de trazo no se leía y la
 * estrella ya es la pestaña Artistas. Quien la lleva le da su sitio con `className` (el área de su rejilla) y su ancho con
 * `--marca-ancho` (`--marca-tarjeta` o `--marca-renglon`, globals.css); el alto sale de la proporción del icono.
 */
export default function MarcaDestacado({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Destacado" className={className ? `${styles.marca} ${className}` : styles.marca}>
      <IconoCinta />
    </span>
  );
}
