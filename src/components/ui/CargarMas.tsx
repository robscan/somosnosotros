import type { RefObject } from "react";
import { EsqueletoRenglones } from "./Esqueleto";
import styles from "./CargarMas.module.css";

/**
 * El final de una lista con carga progresiva (OL-158): mientras hay más, un esqueleto de la tanda que viene (el
 * centinela que observa `IntersectionObserver`) y, siempre visible, "Ver más" como respaldo accesible — no solo
 * para un navegador sin `IntersectionObserver`, también para quien navega con teclado o lector de pantalla y no
 * dispara el scroll al final. Sin más que mostrar, no pinta nada.
 */
export default function CargarMas({ hayMas, centinelaRef, onVerMas, redonda = false }: { hayMas: boolean; centinelaRef: RefObject<HTMLDivElement | null>; onVerMas: () => void; redonda?: boolean }) {
  if (!hayMas) return null;
  return (
    <div ref={centinelaRef} className={styles.zona}>
      <EsqueletoRenglones cantidad={3} redonda={redonda} />
      <button type="button" className={styles.boton} onClick={onVerMas}>
        Ver más
      </button>
    </div>
  );
}
