"use client";

import { useState, type ReactNode } from "react";
import BotonIcono from "./BotonIcono";
import Hoja from "./Hoja";
import { IconoPuntos } from "./Iconos";
import styles from "./Ficha.module.css";

/**
 * Menú "···" de la barra interior: lo secundario de una ficha (editar, reportar, borrar…) en una hoja.
 * Los elementos llegan como <li> ya armados por la página; aquí solo el botón y la hoja. En la barra es plano y de 44; sobre
 * la portada de la ficha de la hoja de Lugares, elevado y de 48 (`tamano` y `relieve`, los de `ui/BotonIcono`); `className`
 * es del botón, para colocarlo en la rejilla de quien lo usa.
 */
export default function MenuAcciones({ tamano, relieve, className, children }: { tamano?: "control" | "accion"; relieve?: "plano" | "elevado"; className?: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <BotonIcono tamano={tamano} relieve={relieve} className={className} onClick={() => setAbierto(true)} aria-label="Más acciones" aria-haspopup="dialog">
        <IconoPuntos />
      </BotonIcono>
      {abierto && (
        <Hoja etiqueta="Más acciones" onCerrar={() => setAbierto(false)}>
          <ul className={styles.menu}>{children}</ul>
        </Hoja>
      )}
    </>
  );
}
