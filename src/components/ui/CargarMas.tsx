import type { RefObject } from "react";
import Boton from "./Boton";
import { EsqueletoRenglones } from "./Esqueleto";
import styles from "./CargarMas.module.css";

/**
 * El final de una lista con carga progresiva (OL-158): mientras hay más, un esqueleto de la tanda que viene (el
 * centinela que observa `IntersectionObserver`) y, siempre visible, "Ver más" como respaldo accesible — no solo
 * para un navegador sin `IntersectionObserver`, también para quien navega con teclado o lector de pantalla y no
 * dispara el scroll al final. Sin más que mostrar, no pinta nada. Sin centinela ni esqueleto (`esqueleto={false}`), solo «Ver más»: la tanda
 * que viene ya está en el teléfono y llega al tocarlo (el historial de una ficha, OL-473: la lista crece solo cuando se pide, y «Dónde» y lo que
 * sigue quedan al alcance).
 */
export default function CargarMas({ hayMas, centinelaRef, onVerMas, redonda = false, esqueleto = true }: { hayMas: boolean; centinelaRef?: RefObject<HTMLDivElement | null>; onVerMas: () => void; redonda?: boolean; esqueleto?: boolean }) {
  if (!hayMas) return null;
  return (
    <div ref={centinelaRef} className={styles.zona}>
      {esqueleto && <EsqueletoRenglones cantidad={3} redonda={redonda} />}
      <Boton type="button" variante="secundario" forma="pildora" alto="control" ancho="contenido" className={styles.boton} onClick={onVerMas}>
        Ver más
      </Boton>
    </div>
  );
}
