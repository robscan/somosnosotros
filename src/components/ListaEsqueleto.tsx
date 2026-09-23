import { EsqueletoRenglones } from "@/components/ui/Esqueleto";
import styles from "./ListaEsqueleto.module.css";

/**
 * El `fallback` del `<Suspense>` de Agenda, Lugares (lista) y Artistas (OL-158, bitácora 193): mientras se resuelve
 * la consulta, `Barra` ya está pintada (vive fuera del `Suspense`, en `page.tsx`) y esto ocupa el resto — una
 * cabecera genérica (los chips de contexto y las pestañas, del mismo alto aproximado que `ui/Cabecera`; el texto
 * real —qué ciudad, cuántos hay— no se conoce todavía) y la primera tanda de renglones, para que no salte al
 * llegar la real.
 */
export default function ListaEsqueleto({ redonda = false }: { redonda?: boolean }) {
  return (
    <div aria-hidden="true">
      <div className={styles.cabecera}>
        <div className={styles.fila1}>
          <span className={`${styles.chip} ${styles.respira}`} />
          <span className={`${styles.chip} ${styles.respira}`} />
        </div>
        <div className={styles.pestanas}>
          <span className={`${styles.pestana} ${styles.respira}`} />
          <span className={`${styles.pestana} ${styles.respira}`} />
        </div>
      </div>
      <div className={styles.lista}>
        <EsqueletoRenglones cantidad={6} redonda={redonda} />
      </div>
    </div>
  );
}
