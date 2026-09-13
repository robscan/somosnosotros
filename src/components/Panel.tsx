import { CIUDAD_INICIAL } from "@/lib/ciudad";
import styles from "./Panel.module.css";

/**
 * Panel inferior sobre el mapa. En la Fase 0 solo existe el estado "peek" (asomado);
 * los estados medium/expanded y los gestos (docs/heredado/front/BOTTOM_SHEET.md)
 * entran cuando haya lugares y eventos que mostrar (Fases 2 y 3).
 */
export default function Panel() {
  return (
    <section className={styles.panel} aria-label="Panel">
      <div className={styles.asa} aria-hidden="true" />
      <h1 className={styles.titulo}>somosnosotros</h1>
      <p className={styles.ciudad}>{CIUDAD_INICIAL.nombre}</p>
      <p className={styles.vacio}>Aún no hay lugares ni eventos.</p>
    </section>
  );
}
