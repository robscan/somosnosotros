import { EsqueletoRenglones } from "@/components/ui/Esqueleto";
import styles from "./ListaEsqueleto.module.css";

/**
 * El `fallback` del `<Suspense>` de Agenda y Artistas (OL-158, bitácora 193): mientras se resuelve la consulta, la barra de
 * la app ya está pintada (vive en el layout) y esto ocupa el resto — la fila de contexto de mentira (tres chips, del mismo
 * alto que la de `ui/Cabecera`; el texto real —qué ciudad, cuántos hay— no se conoce todavía) y la primera tanda de
 * renglones, para que no salte al llegar la real.
 */
export default function ListaEsqueleto({ redonda = false }: { redonda?: boolean }) {
  return (
    <div aria-hidden="true">
      <div className={styles.cabecera}>
        <span className={`${styles.chip} ${styles.respira}`} />
        <span className={`${styles.chip} ${styles.respira}`} />
        <span className={`${styles.chip} ${styles.respira}`} />
      </div>
      <div className={styles.lista}>
        <EsqueletoRenglones cantidad={6} redonda={redonda} />
      </div>
    </div>
  );
}
