import ficha from "@/components/ui/Ficha.module.css";
import styles from "./admin.module.css";

/** Espera del panel y de sus listas (A4): la forma de la pantalla en gris, sin títulos ni números inventados. */
export default function Loading() {
  return (
    <main className={ficha.pagina} aria-busy="true" aria-live="polite">
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
