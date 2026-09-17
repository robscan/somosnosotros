"use client";

import { useEffect, useState } from "react";
import { IconoCerrar } from "./ui/Iconos";
import styles from "./Cartel.module.css";

/**
 * El cartel (o la portada) llena una banda baja (cover); un toque lo enseña entero a pantalla completa.
 * Con forma "avatar" (ficha de artista) es un círculo, como en la lista: la gente es redonda, los lugares cuadrados.
 */
export default function Cartel({
  src,
  alt,
  forma = "banda",
}: {
  src: string;
  alt: string;
  forma?: "banda" | "avatar";
}) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) =>
      e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);
  return (
    <>
      <button
        type="button"
        className={forma === "avatar" ? styles.avatar : styles.banda}
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
      {abierto && (
        <div
          className={styles.visor}
          role="dialog"
          aria-label={alt}
          onClick={() => setAbierto(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
          <img src={src} alt={alt} className={styles.visorImagen} />
          <button
            type="button"
            className={styles.visorCerrar}
            onClick={() => setAbierto(false)}
            aria-label="Cerrar"
          >
            <IconoCerrar width={22} height={22} />
          </button>
        </div>
      )}
    </>
  );
}
