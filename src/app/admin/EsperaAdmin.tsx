"use client";

import { usePathname } from "next/navigation";
import plantilla from "@/components/ui/Plantilla.module.css";
import { PortadaEsqueleto } from "./PortadaAdmin";
import styles from "./admin.module.css";

/**
 * La espera de Administración (`admin/loading.tsx`), elegida en el teléfono según la pantalla que se abre (`loading.tsx` no recibe la ruta). En la
 * portada (OL-498), su armazón en gris: la barra, los títulos de los cinco bloques y los renglones fijos, con Pendiente, los números y las líneas
 * en gris; es el mismo que pinta la página antes de que llegue cada bloque, así que no salta. En las listas (que no traen su propia espera), la
 * forma de la pantalla en gris, sin títulos ni números inventados.
 * Es de cliente a propósito: la espera de la portada vive en el JavaScript (una vez, en la caché del teléfono) y no en los datos de cada pantalla
 * de Administración, que la llevarían entera aunque no sea la suya (+20 KB en Instagram, medido).
 */
export default function EsperaAdmin() {
  if (usePathname() === "/admin") return <PortadaEsqueleto />;
  return (
    <main className={plantilla.paginaContenido} aria-busy="true" aria-live="polite">
      <p className={styles.esqueleto} role="status" aria-label="Cargando">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </p>
    </main>
  );
}
