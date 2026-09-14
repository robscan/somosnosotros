"use client";

import { useEffect } from "react";
import styles from "./HojaInstalar.module.css";

/**
 * Hoja "Instala Somos Nosotros" para iPhone: dos toques con los glifos reales de iOS, una miniatura de la
 * barra de Safari, cómo queda el icono y el paso que hace que lleguen los avisos.
 * Solo emerge tras un gesto de la persona (dijo que sí a los avisos en el teléfono).
 */
export default function HojaInstalar({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const compartir = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11v8.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V11" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
  const agregar = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <div className={styles.fondo} onClick={onCerrar}>
      <div className={styles.hoja} role="dialog" aria-label="Instala Somos Nosotros" onClick={(e) => e.stopPropagation()}>
        <div className={styles.asa} aria-hidden="true" />
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
        <h3 className={styles.titulo}>Instala Somos Nosotros</h3>
        <p className={styles.sub}>Solo la app instalada recibe avisos. Dos toques:</p>

        <div className={styles.pasos}>
          <div className={styles.paso}>
            <div className={styles.glifo}>{compartir}</div>
            <div>
              <span className={styles.num}>Paso 1</span>
              <span className={styles.que}>Toca Compartir</span>
              <span className={styles.donde}>Abajo, al centro.</span>
              <div className={styles.safari} aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" {...trazo} /></svg>
                <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" {...trazo} /></svg>
                <span className={styles.aqui}>{compartir}</span>
                <svg viewBox="0 0 24 24"><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" {...trazo} strokeWidth="1.8" /></svg>
                <svg viewBox="0 0 24 24"><rect x="7" y="4" width="13" height="13" rx="2" {...trazo} strokeWidth="1.8" /><path d="M4 8v10a2 2 0 0 0 2 2h10" {...trazo} strokeWidth="1.8" /></svg>
              </div>
            </div>
          </div>
          <div className={styles.paso}>
            <div className={styles.glifo}>{agregar}</div>
            <div>
              <span className={styles.num}>Paso 2</span>
              <span className={styles.que}>Elige “Agregar a pantalla de inicio”</span>
              <span className={styles.donde}>Así lo llama el iPhone.</span>
              <div className={styles.filaIos} aria-hidden="true">
                <span>Agregar a pantalla de inicio</span>
                {agregar}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.resultado}>
          <div className={styles.iconoApp} aria-hidden="true">
            SMSN
            <br />
            STRS
          </div>
          <p>
            <b>Listo.</b> Ábrela desde tu pantalla de inicio, sin Safari.
          </p>
        </div>
        <div className={styles.despues}>
          <div className={styles.glifo}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
          <div>
            <b>Después</b>
            Al abrirla, acepta los avisos.
          </div>
        </div>
      </div>
    </div>
  );
}
