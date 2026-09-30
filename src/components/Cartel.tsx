"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SIN_FOTO, SIN_FOTO_ANCHA } from "@/lib/imagen";
import BotonIcono from "./ui/BotonIcono";
import { IconoCerrar } from "./ui/Iconos";
import styles from "./Cartel.module.css";

/**
 * La imagen de una ficha: el cartel o la portada, a todo lo ancho y en 3:2 (`heroe`; su título va encima, sobre un velo, en
 * `ui/Heroe`), o la foto redonda de un artista (`avatar`, la gente es redonda). Un toque la enseña entera, a pantalla completa,
 * con su ✕. Sin `src`, la imagen con el símbolo SN ocupa la misma caja, sin visor. El visor se pinta al final del body: así ninguna
 * capa que lo contenga (la hoja de Lugares) lo deja debajo de la navegación.
 */
export default function Cartel({
  src,
  alt,
  forma = "heroe",
}: {
  src: string | null;
  alt: string;
  forma?: "heroe" | "avatar";
}) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) =>
      e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);
  if (!src) {
    // eslint-disable-next-line @next/next/no-img-element -- imagen fija de public
    return <img src={forma === "avatar" ? SIN_FOTO : SIN_FOTO_ANCHA} alt="" className={`${styles[forma]} ${styles.sinFoto}`} />;
  }
  return (
    <>
      <button
        type="button"
        className={styles[forma]}
        onClick={() => setAbierto(true)}
        aria-label={`Ver ${alt} entero`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
        <img src={src} alt={alt} className={styles.imagen} />
      </button>
      {abierto &&
        createPortal(
          <div className={styles.visor} role="dialog" aria-label={alt} onClick={() => setAbierto(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
            <img src={src} alt={alt} className={styles.visorImagen} />
            <BotonIcono className={styles.visorCerrar} onClick={() => setAbierto(false)} aria-label="Cerrar">
              <IconoCerrar width={22} height={22} />
            </BotonIcono>
          </div>,
          document.body,
        )}
    </>
  );
}
