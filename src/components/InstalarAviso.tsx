"use client";

import { useEffect, useState } from "react";
import styles from "./InstalarAviso.module.css";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const CLAVE = "somosnosotros:instalar-visto";

/**
 * Un renglón discreto para instalar la app en el teléfono. Solo en móvil, solo si no está instalada,
 * y una sola vez (se puede cerrar). En Android ofrece el diálogo del sistema; en iPhone explica el gesto.
 */
export default function InstalarAviso() {
  const [mostrar, setMostrar] = useState(false);
  const [esIos, setEsIos] = useState(false);
  const [prompt, setPrompt] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem(CLAVE)) return;
      } catch {}
      const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const movil = /iPhone|iPad|Android/i.test(navigator.userAgent);
      if (instalada || !movil) return;
      setEsIos(/iPhone|iPad/i.test(navigator.userAgent));
      setMostrar(true);
    });
    const alPoderInstalar = (e: Event) => {
      e.preventDefault();
      setPrompt(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", alPoderInstalar);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("beforeinstallprompt", alPoderInstalar);
    };
  }, []);

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    setMostrar(false);
  }
  async function instalar() {
    if (!prompt) return;
    await prompt.prompt();
    cerrar();
  }

  if (!mostrar) return null;
  return (
    <div className={styles.aviso} role="status">
      <p className={styles.texto}>
        {esIos ? (
          <>
            Tenla en tu teléfono: toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.
          </>
        ) : prompt ? (
          <>Tenla en tu teléfono como una app.</>
        ) : (
          <>
            Tenla en tu teléfono: en el menú del navegador, <strong>Agregar a pantalla de inicio</strong>.
          </>
        )}
      </p>
      <div className={styles.acciones}>
        {prompt && !esIos && (
          <button type="button" className={styles.instalar} onClick={instalar}>
            Instalar
          </button>
        )}
        <button type="button" className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">
          ✕
        </button>
      </div>
    </div>
  );
}
