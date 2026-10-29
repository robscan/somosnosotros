import styles from "./Girando.module.css";

/**
 * Algo que está pasando ahora y tarda (OL-488, añadido del founder del 2026-10-29: «Pon el estado "Publicando" … más visible … y si se puede
 * agrega un cargador»): un anillo que gira, del color de lo que pide atención, y su texto («Publicando…», «Reintentando…»). Va en una línea de
 * un renglón o de una hoja; quien lo pone marca el contenedor que cambia (`role="status"`) si hace falta que se anuncie.
 */
export default function Girando({ texto, className }: { texto: string; className?: string }) {
  return (
    <span className={[styles.girando, className].filter(Boolean).join(" ")}>
      <span className={styles.anillo} aria-hidden="true" />
      <span>{texto}</span>
    </span>
  );
}
