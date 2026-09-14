"use client";

import { useState, type ReactNode } from "react";
import Hoja from "./Hoja";
import { IconoPuntos } from "./Iconos";
import styles from "./Ficha.module.css";

/**
 * Menú "···" de la barra interior: lo secundario de una ficha (editar, reportar, borrar…) en una hoja.
 * Los elementos llegan como <li> ya armados por la página; aquí solo el botón y la hoja.
 */
export default function MenuAcciones({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className={styles.iconoBarra} onClick={() => setAbierto(true)} aria-label="Más acciones" aria-haspopup="dialog">
        <IconoPuntos />
      </button>
      {abierto && (
        <Hoja etiqueta="Más acciones" onCerrar={() => setAbierto(false)}>
          <ul className={styles.menu}>{children}</ul>
        </Hoja>
      )}
    </>
  );
}
