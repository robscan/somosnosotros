import styles from "./SeCancelo.module.css";

/**
 * «Se canceló» (OL-391, ejercicio C1 del prototipo firmado `historial-propuestas.html`): la etiqueta roja apagada que va delante de la fecha en
 * la línea de cuándo de un renglón que ya pasó y se marcó cancelado (el historial de un artista o de un lugar, el «Ya pasó» de un festival).
 * Con ella en el renglón, su título va tachado y su miniatura más apagada (`SeCancelo.module.css`): se queda en la lista, pero no cuenta.
 */
export default function SeCancelo() {
  return <span className={styles.seCancelo}>Se canceló</span>;
}
