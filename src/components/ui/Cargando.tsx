import styles from "./Cargando.module.css";

/** Pantalla de espera instantánea: aparece al primer toque, antes de que el servidor responda. */
export default function Cargando({ titulo = "Cargando…" }: { titulo?: string }) {
  return (
    <main className="pagina" aria-busy="true" aria-live="polite">
      <div className={`${styles.linea} ${styles.corta}`} />
      <div className={`${styles.linea} ${styles.titulo}`} />
      <div className={styles.linea} />
      <div className={`${styles.linea} ${styles.media}`} />
      <div className={styles.bloque} />
      <p className={styles.texto}>{titulo}</p>
    </main>
  );
}
