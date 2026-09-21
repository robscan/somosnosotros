"use client";

import { cerrarSesion } from "@/app/perfil/acciones";
import { IconoChevronDerecha, IconoSalir } from "@/components/ui/Iconos";
import { borrarUbicacionCercana } from "@/lib/ubicacion";
import styles from "./ajustes.module.css";

/**
 * "Cerrar sesión": el mismo formulario y acción de siempre, solo que aquí (componente cliente) también se borra
 * la ubicación aproximada guardada en el teléfono (OL-095, condición del gestor: no debe sobrevivir a la sesión).
 */
export default function BotonSalir() {
  return (
    <form action={cerrarSesion} onSubmit={() => borrarUbicacionCercana()}>
      <button type="submit" className={styles.fila}>
        <IconoSalir width={20} height={20} />
        <b>Cerrar sesión</b>
        <span className={styles.valor}>
          <IconoChevronDerecha />
        </span>
      </button>
    </form>
  );
}
