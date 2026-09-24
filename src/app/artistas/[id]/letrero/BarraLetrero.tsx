"use client";

import Link from "next/link";
import { IconoChevronIzquierda, IconoDescarga } from "@/components/ui/Iconos";
import styles from "./letrero.module.css";

/**
 * Barra arriba del letrero (OL-183): defecto del founder en su iPhone con la app instalada, 2026-09-24 — «al
 * descargar letrero en app abre el documento en app pero no hay botón para cerrar o salir de ese visor de pdf».
 * La página se pensó para escritorio (`ImprimirAlAbrir` llama a `window.print()` sola); en la app instalada no
 * hay barra del navegador, así que al cerrar el cuadro de impresión la persona quedaba sin «Atrás» ni salida.
 * Enlace normal a la ficha, no `history.back()`: la página se abre con `target="_blank"` desde `CompartirFicha`
 * y puede no traer historial propio. Nunca sale en el papel ni en el PDF (`@media print` en `letrero.module.css`).
 */
export default function BarraLetrero({ hrefArtista }: { hrefArtista: string }) {
  return (
    <header className={styles.barra}>
      <Link href={hrefArtista} className={styles.atras}>
        <IconoChevronIzquierda width={18} height={18} />
        Atrás
      </Link>
      <button type="button" className={styles.imprimirBarra} onClick={() => window.print()}>
        <IconoDescarga width={18} height={18} />
        Imprimir o guardar PDF
      </button>
    </header>
  );
}
