"use client";

import { useState, type ReactNode } from "react";
import BotonIcono from "./BotonIcono";
import Hoja from "./Hoja";
import { IconoPuntos } from "./Iconos";
import ficha from "./Ficha.module.css";
import renglon from "./Renglon.module.css";

/**
 * Menú "···" de la barra de una ficha: lo secundario (editar, reportar, borrar…) en una hoja. Los elementos llegan como <li> ya
 * armados por la página, cada uno con el renglón de Ajustes (`ui/Renglon`); aquí solo el botón y la hoja con su tarjeta. En la barra
 * de la app es plano y de 44; sobre la portada de una ficha, elevado y de 48 (`tamano` y `relieve`, los de `ui/BotonIcono`);
 * `className` es del botón, para colocarlo en la rejilla de quien lo usa.
 */
export default function MenuAcciones({ tamano, relieve, className, children }: { tamano?: "control" | "accion"; relieve?: "plano" | "elevado" | "contorno"; className?: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <BotonIcono tamano={tamano} relieve={relieve} className={className} onClick={() => setAbierto(true)} aria-label="Más acciones" aria-haspopup="dialog">
        <IconoPuntos />
      </BotonIcono>
      {abierto && (
        <Hoja etiqueta="Más acciones" onCerrar={() => setAbierto(false)}>
          <ul className={`${renglon.tarjeta} ${ficha.menu}`}>{children}</ul>
        </Hoja>
      )}
    </>
  );
}
