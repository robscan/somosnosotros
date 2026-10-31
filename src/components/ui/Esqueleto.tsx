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
 * - `EsqueletoLinea`: una línea de texto dentro de algo que ya se ve (la línea de estado de un renglón que llega después): del alto de su
 *   letra, así que la fila mide lo mismo con la barra que con el texto. Con `muestra`, un texto del largo típico de lo que llega, invisible y
 *   fuera del lector de pantalla: no se lee, solo mide. La barra se parte en renglones donde se partiría el texto de verdad (a 390 la línea de
 *   Instagram ocupa dos), así que nada salta al llegar.
 * - `EsqueletoAjuste`: una fila de Ajustes (`ui/Renglon` ajuste) con su icono, su nombre y su línea en gris.
 */

export function EsqueletoRenglon({ redonda = false, lineas = 1 }: { redonda?: boolean; /** Cuántas líneas de datos lleva (la meta): una, o varias en las listas que dicen más de cada fila (Administración › Instagram). */ lineas?: number }) {
  return (
    <li className={renglon.lista} aria-hidden="true">
      <div className={renglon.frente}>
        <span className={`${renglon.foto} ${styles.respira} ${redonda ? renglon.redonda : ""}`} />
        <span className={`${styles.linea} ${styles.respira} ${styles.tituloRenglon}`} />
        {lineas > 1 ? (
          <span className={styles.metasRenglon}>
            {Array.from({ length: lineas }, (_, i) => (
              <span key={i} className={`${styles.linea} ${styles.respira} ${styles.unaMeta}`} />
            ))}
          </span>
        ) : (
          <span className={`${styles.linea} ${styles.respira} ${styles.metaRenglon}`} />
        )}
      </div>
    </li>
  );
}

/** Varios renglones seguidos, para el `fallback` de una lista completa. */
export function EsqueletoRenglones({ cantidad = 5, redonda = false, lineas = 1 }: { cantidad?: number; redonda?: boolean; lineas?: number }) {
  return (
    <ul className={styles.listaRenglones} aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <EsqueletoRenglon key={i} redonda={redonda} lineas={lineas} />
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

/** Una línea de texto que llega después, dentro de su renglón (va donde iría el texto: dentro del `small` de la fila). */
export function EsqueletoLinea({ largo = "70%", muestra }: { largo?: string; /** Un texto del largo típico: no se ve ni se lee, solo da la medida. */ muestra?: string }) {
  if (muestra)
    return (
      <span className={`${styles.enTexto} ${styles.respira}`} aria-hidden="true">
        {muestra}
      </span>
    );
  return <span className={`${styles.enLinea} ${styles.respira}`} style={{ width: largo }} aria-hidden="true" />;
}

/** Una fila de Ajustes en gris: el mismo renglón `ajuste` (icono | nombre / línea), con barras del alto de su letra. */
export function EsqueletoAjuste() {
  return (
    <li aria-hidden="true">
      <div className={renglon.ajuste}>
        <span className={`${styles.iconoAjuste} ${styles.respira}`} />
        <b>
          <EsqueletoLinea largo="45%" />
        </b>
        <small>
          <EsqueletoLinea />
        </small>
      </div>
    </li>
  );
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
