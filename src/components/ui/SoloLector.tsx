import type { HTMLAttributes } from "react";
import styles from "./SoloLector.module.css";

/**
 * Lo que solo oye quien usa un lector de pantalla: el anuncio en vivo de algo que cambió («Movida al puesto 2»; con
 * `role="status"` o `aria-live`) o la frase que completa el nombre de un control («Cambiar la fecha,»).
 */
export default function SoloLector(props: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={styles.soloLector} />;
}
