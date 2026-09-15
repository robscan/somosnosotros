import NavInferior from "@/components/NavInferior";
import Barra from "./Barra";
import styles from "./Cargando.module.css";

/**
 * Espera de las pantallas raíz (Agenda, Lugares, Artistas): la barra y la navegación se quedan en su sitio
 * y en medio tres renglones con la forma de la lista. Nada se apaga ni salta al cambiar de sección.
 */
export default function CargandoRaiz() {
  return (
    <main className="raiz" aria-busy="true" aria-live="polite">
      <Barra derecha={<span className={styles.pildora} aria-hidden="true" />} />
      <div className={styles.cabecera} aria-hidden="true">
        <div className={`${styles.linea} ${styles.campo}`} />
      </div>
      <ul className={styles.renglones} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className={styles.renglon}>
            <span className={styles.foto} />
            <span className={`${styles.linea} ${styles.titulo}`} />
            <span className={`${styles.linea} ${styles.media}`} />
          </li>
        ))}
      </ul>
      <p className={styles.texto}>Cargando…</p>
      <NavInferior />
    </main>
  );
}
