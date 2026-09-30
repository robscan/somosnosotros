import { Kpis } from "./Kpi";
import kpi from "./Kpi.module.css";
import renglon from "./Renglon.module.css";
import styles from "./Esqueleto.module.css";

/**
 * Canon de esqueletos (OL-158, bitácora 193): un solo origen para los bloques grises que respiran mientras llega el
 * contenido real, con el mismo pulso que ya usaba `CarrilEsqueleto` (OL-156) — nunca texto real, siempre del tamaño
 * exacto de lo que sustituyen, para que no haya salto al llegar la respuesta. Apagado con `prefers-reduced-motion`
 * (la animación vive en `Esqueleto.module.css`, una sola regla para todas las variantes).
 *
 * Variantes:
 * - `EsqueletoRenglon`: una fila de listado, el mismo renglón de lista de `ui/Renglon` con barras en lugar de foto, título
 *   y meta: no lleva una medida propia, así que mide lo que el renglón.
 * - `EsqueletoKpi` y `EsqueletoKpis`: uno o los tres números de una ficha, la misma tarjeta de `ui/Kpi`.
 * - `EsqueletoBloqueTexto`: unas líneas de párrafo, para bloques de texto que llegan después.
 */

export function EsqueletoRenglon({ redonda = false }: { redonda?: boolean }) {
  return (
    <li className={renglon.lista} aria-hidden="true">
      <div className={renglon.frente}>
        <span className={`${renglon.foto} ${styles.respira} ${redonda ? renglon.redonda : ""}`} />
        <span className={`${styles.linea} ${styles.respira} ${styles.tituloRenglon}`} />
        <span className={`${styles.linea} ${styles.respira} ${styles.metaRenglon}`} />
      </div>
    </li>
  );
}

/** Varios renglones seguidos, para el `fallback` de una lista completa. */
export function EsqueletoRenglones({ cantidad = 5, redonda = false }: { cantidad?: number; redonda?: boolean }) {
  return (
    <ul className={styles.listaRenglones} aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <EsqueletoRenglon key={i} redonda={redonda} />
      ))}
    </ul>
  );
}

/** Un número de la ficha mientras llega su consulta: la misma tarjeta (`ui/Kpi`), con el icono, lo que es y el valor en gris. */
export function EsqueletoKpi() {
  return (
    <li aria-hidden="true">
      <div className={kpi.kpi}>
        <span className={`${styles.iconoKpi} ${styles.respira}`} />
        <span className={`${styles.linea} ${styles.respira} ${styles.etiquetaKpi}`} />
        <span className={`${styles.linea} ${styles.respira} ${styles.valorKpi}`} />
      </div>
    </li>
  );
}

/** Los tres números de una ficha que llegan juntos. */
export function EsqueletoKpis() {
  return (
    <Kpis>
      <EsqueletoKpi />
      <EsqueletoKpi />
      <EsqueletoKpi />
    </Kpis>
  );
}

/**
 * Una caja rectangular que respira, sin medida propia: el tamaño lo pone quien la usa (una clase con alto/ancho,
 * como `.cajaMapa` de Lugares). Para lo que no encaja en renglón, tarjeta o número de ficha — el mapa mientras
 * carga (OL-161, bitácora 196).
 */
export function EsqueletoCaja({ className = "" }: { className?: string }) {
  return <div className={`${styles.caja} ${styles.respira} ${className}`} aria-hidden="true" />;
}

export function EsqueletoBloqueTexto({ lineas = 3 }: { lineas?: number }) {
  return (
    <div className={styles.bloqueTexto} aria-hidden="true">
      {Array.from({ length: lineas }, (_, i) => (
        <span key={i} className={`${styles.linea} ${styles.respira} ${i === lineas - 1 ? styles.corta : ""}`} />
      ))}
    </div>
  );
}
