"use client";

import Link from "next/link";
import { useState } from "react";
import Borrar from "@/components/Borrar";
import Reportar from "@/components/Reportar";
import Hoja from "@/components/ui/Hoja";
import styles from "./ficha.module.css";

type Props = {
  eventoId: string;
  conSesion: boolean;
  puedeEditar: boolean;
  esAdmin: boolean;
  visible: boolean;
  avisoBorrar: string;
  cambiarVisible: () => Promise<void>;
  borrar: () => Promise<void>;
};

/** Menú "···" de la barra: reportar, y para el autor editar, duplicar y borrar; para el admin, ocultar. Capa c. */
export default function MenuFicha({ eventoId, conSesion, puedeEditar, esAdmin, visible, avisoBorrar, cambiarVisible, borrar }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className={styles.iconoBarra} onClick={() => setAbierto(true)} aria-label="Más acciones" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" />
        </svg>
      </button>
      {abierto && (
        <Hoja etiqueta="Más acciones" onCerrar={() => setAbierto(false)}>
          <ul className={styles.menu}>
            {puedeEditar && (
              <>
                <li>
                  <Link href={`/eventos/${eventoId}/editar`} className={styles.menuItem}>
                    Editar
                  </Link>
                </li>
                <li>
                  <Link href={`/eventos/nuevo?desde=${eventoId}`} className={styles.menuItem}>
                    Duplicar con otra fecha
                  </Link>
                </li>
              </>
            )}
            {esAdmin && (
              <li>
                <form action={cambiarVisible}>
                  <button type="submit" className={styles.menuItem}>
                    {visible ? "Ocultar de la agenda" : "Volver a mostrar"}
                  </button>
                </form>
              </li>
            )}
            <li className={styles.menuItem}>
              <Reportar tipo="evento" objetoId={eventoId} volver={`/eventos/${eventoId}`} conSesion={conSesion} />
            </li>
            {puedeEditar && (
              <li className={styles.menuItem}>
                <Borrar que="el evento" aviso={avisoBorrar} accion={borrar} />
              </li>
            )}
          </ul>
        </Hoja>
      )}
    </>
  );
}
