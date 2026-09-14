"use client";

import { useEffect, useState } from "react";
import styles from "./ficha.module.css";

/** El cartel llena una banda baja (cover); un toque lo enseña entero a pantalla completa. */
export default function Cartel({ src, titulo }: { src: string; titulo: string }) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);
  return (
    <>
      <button type="button" className={styles.banda} onClick={() => setAbierto(true)} aria-label="Ver el cartel entero">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
        <img src={src} alt={`Cartel de ${titulo}`} className={styles.cartel} />
        <span className={styles.lupa} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16l4 4M11 8.5v5M8.5 11h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {abierto && (
        <div className={styles.visor} role="dialog" aria-label="Cartel" onClick={() => setAbierto(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
          <img src={src} alt={`Cartel de ${titulo}`} className={styles.visorImagen} />
          <button type="button" className={styles.visorCerrar} onClick={() => setAbierto(false)} aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
