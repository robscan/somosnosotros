import Cabecera from "@/components/ui/Cabecera";
import { EsqueletoCaja, EsqueletoRenglones } from "@/components/ui/Esqueleto";
import styles from "./ListaEsqueleto.module.css";

/**
 * El `fallback` del `<Suspense>` de Agenda y Artistas (OL-158, bitácora 193): mientras se resuelve la consulta, la barra de
 * la app ya está pintada (vive en el layout) y esto ocupa el resto — la misma cabecera de las raíces (`ui/Cabecera`, blanca y
 * con su raya) con tres chips en gris del alto de los reales, para que no salte al llegar la fila de verdad (el texto real
 * —qué ciudad, cuántos hay— no se conoce todavía), y la primera tanda de renglones.
 */
export default function ListaEsqueleto({ redonda = false }: { redonda?: boolean }) {
  return (
    <div aria-hidden="true">
      <Cabecera
        contexto={
          <>
            <EsqueletoCaja className={styles.chip} />
            <EsqueletoCaja className={styles.chip} />
            <EsqueletoCaja className={styles.chip} />
          </>
        }
      />
      <div className={styles.lista}>
        <EsqueletoRenglones cantidad={6} redonda={redonda} />
      </div>
    </div>
  );
}
