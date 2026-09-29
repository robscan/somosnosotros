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
 * - `EsqueletoDato`: una fila de dato de ficha (icono y una línea), el mismo renglón `dato`.
 * - `EsqueletoTarjeta`: tarjeta de carril, grande/mediana/chica — las medidas que ya tenía `CarrilEsqueleto`.
 * - `EsqueletoCabeceraFicha`: foto + nombre + dos líneas de meta, para la cabecera de una ficha.
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

/** Una fila de dato de ficha mientras llega su consulta: el mismo renglón `dato`, con el icono y una línea en gris. */
export function EsqueletoDato() {
  return (
    <li className={renglon.dato} aria-hidden="true">
      <span className={`${styles.iconoDato} ${styles.respira}`} />
      <span className={`${styles.linea} ${styles.respira} ${styles.lineaDato}`} />
    </li>
  );
}

export function EsqueletoTarjeta({ tamano = "mediana" }: { tamano?: "grande" | "mediana" | "chica" }) {
  return (
    <div className={`${styles.tarjeta} ${styles[tamano]}`} aria-hidden="true">
      <span className={`${styles.foto} ${styles.respira}`} />
      <span className={`${styles.linea} ${styles.respira}`} />
      <span className={`${styles.linea} ${styles.respira} ${styles.corta}`} />
    </div>
  );
}

export function EsqueletoCabeceraFicha() {
  return (
    <div className={styles.cabeceraFicha} aria-hidden="true">
      <span className={`${styles.fotoFicha} ${styles.respira}`} />
      <span className={`${styles.linea} ${styles.respira} ${styles.nombreFicha}`} />
      <span className={`${styles.linea} ${styles.respira} ${styles.metaFicha}`} />
      <span className={`${styles.linea} ${styles.respira} ${styles.metaFicha} ${styles.corta}`} />
    </div>
  );
}

/**
 * Una caja rectangular que respira, sin medida propia: el tamaño lo pone quien la usa (una clase con alto/ancho,
 * como `.cajaMapa` de Lugares). Para lo que no encaja en renglón, tarjeta o cabecera de ficha — el mapa mientras
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
