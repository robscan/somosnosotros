import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./admin.module.css";

/** Espera del panel y de sus listas (A4): la forma de la pantalla en gris, sin títulos ni números inventados. */
export default function Loading() {
  return (
    <main className={plantilla.paginaContenido} aria-busy="true" aria-live="polite">
      <p className={styles.esqueleto} role="status" aria-label="Cargando">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </p>
    </main>
  );
}
