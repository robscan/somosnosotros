"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SIN_FOTO, SIN_FOTO_ANCHA } from "@/lib/imagen";
import BotonIcono from "./ui/BotonIcono";
import { IconoCerrar } from "./ui/Iconos";
import styles from "./Cartel.module.css";

/**
 * El cartel (o la portada) llena una banda baja (cover); un toque lo enseña entero a pantalla completa.
 * Con forma "avatar" (ficha de artista) es un círculo, como en la lista: la gente es redonda, los lugares cuadrados.
 * Con forma "heroe" (la hoja de Lugares) es la portada 3:2 a todo lo ancho, sin lupa: su título va encima, sobre un velo.
 * Sin `src`, la imagen con el símbolo SN ocupa la misma caja, sin lupa ni visor. El visor se pinta al final del body: así
 * ninguna capa que lo contenga (la hoja de Lugares) lo deja debajo de la navegación.
 */
export default function Cartel({
  src,
  alt,
  forma = "banda",
}: {
  src: string | null;
  alt: string;
  forma?: "banda" | "avatar" | "heroe";
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
        {forma === "banda" && (
          <span className={styles.lupa} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <circle
                cx="11"
                cy="11"
                r="6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M16 16l4 4M11 8.5v5M8.5 11h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </button>
      {abierto &&
        createPortal(
          <div className={styles.visor} role="dialog" aria-label={alt} onClick={() => setAbierto(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
            <img src={src} alt={alt} className={styles.visorImagen} />
            <BotonIcono relieve="elevado" className={styles.visorCerrar} onClick={() => setAbierto(false)} aria-label="Cerrar">
              <IconoCerrar width={22} height={22} />
            </BotonIcono>
          </div>,
          document.body,
        )}
    </>
  );
}
