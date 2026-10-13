"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useVolver } from "@/components/ui/Atras";
import { IconoChevronIzquierda } from "@/components/ui/Iconos";
import type { Grafo as DatosGrafo } from "@/lib/grafo";
import styles from "./Grafo.module.css";

/**
 * El grafo cultural en 3D, solo para Administración (OL-401, bitácora 432). React pone el armazón y el motor (`motor.ts`, con three.js) llena
 * el árbol y la lista y dibuja la escena; three.js se carga aquí, al entrar, y no pesa en ninguna otra pantalla. Los datos llegan ya
 * anónimos del servidor: ninguna persona lleva id, nombre ni foto.
 */
export default function Grafo({ datos }: { datos: DatosGrafo }) {
  const raiz = useRef<HTMLDivElement>(null);
  const [sinWebgl, setSinWebgl] = useState(false);
  const volver = useVolver("/admin");

  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo) return;
    let cancelado = false;
    let destruir: (() => void) | null = null;
    import("./motor")
      .then(({ crearMotor }) => {
        if (cancelado) return;
        try {
          destruir = crearMotor(datos, nodo, styles).destruir;
        } catch {
          setSinWebgl(true);
        }
      })
      .catch(() => setSinWebgl(true));
    return () => {
      cancelado = true;
      destruir?.();
    };
  }, [datos]);

  return (
    <main ref={raiz} className={styles.app} data-tema="oscuro">
      <header className={styles.barra}>
        <Link href="/admin" className={styles.atras} onClick={volver} aria-label="Volver a Administración">
          <IconoChevronIzquierda />
        </Link>
        <h1>Grafo cultural</h1>
        <div className={styles.cifras} data-g="cifras" />
        <div className={styles.fps} data-g="fps" title="cuadros por segundo mientras algo se mueve">
          en reposo
        </div>
        <button type="button" className={styles.pildora} data-g="tema" aria-pressed="false">
          Claro
        </button>
      </header>

      <nav className={styles.arbol} data-g="arbol" aria-label="Lentes, filtros y ajustes" />

      <section className={styles.escena} aria-label="Escena en 3D">
        <canvas className={styles.lienzo} data-g="lienzo" />
        <div className={styles.rotulo} data-g="rotulo" />
        <div data-g="vecinos" />
        <div data-g="etiquetas" />
        <section className={styles.tarjeta} data-g="tarjeta" aria-live="polite" />
        {sinWebgl && <p className={styles.sinWebgl}>Este navegador no puede dibujar el grafo en 3D.</p>}
        <div className={styles.leyenda}>
          <span style={{ "--c": "var(--g-c-lugar, var(--primario))" } as CSSProperties}>Lugar · en su posición real</span>
          <span style={{ "--c": "var(--g-c-artista, var(--fondo-contenido))" } as CSSProperties}>Artista · sobre el lugar donde más toca</span>
          <span style={{ "--c": "var(--g-c-persona, var(--destacado))" } as CSSProperties}>Asistente · anónimo, posición inventada</span>
          <span className={styles.linea}>Líneas: blancas entre tipos; del color del tipo entre iguales; más gruesas, más eventos en común</span>
        </div>
        <div className={styles.botonesHojas}>
          <button type="button" className={styles.flotante} data-g="abrirArbol">
            Lentes
          </button>
          <button type="button" className={styles.flotante} data-g="abrirLista">
            Lista
          </button>
        </div>
        <div className={styles.vistas}>
          <button type="button" className={styles.pildora} data-g="red" aria-pressed="false" title="Red: la cercanía es la relación. Mapa: la cercanía es la de la ciudad.">
            Red
          </button>
          <button type="button" className={styles.pildora} data-g="arriba" aria-pressed="false" title="Ver desde arriba, como un plano">
            Desde arriba
          </button>
        </div>
        <div className={styles.mando} role="group" aria-label="Cámara">
          <button type="button" className={styles.arriba} data-mando="arriba" aria-label="Inclinar hacia arriba">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
          <button type="button" className={styles.mas} data-mando="mas" aria-label="Acercar">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button type="button" className={styles.izq} data-mando="izq" aria-label="Girar a la izquierda">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" className={styles.centro} data-mando="centro" aria-label="Volver al centro">
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
          </button>
          <button type="button" className={styles.der} data-mando="der" aria-label="Girar a la derecha">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <button type="button" className={styles.abajo} data-mando="abajo" aria-label="Inclinar hacia abajo">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button type="button" className={styles.menos} data-mando="menos" aria-label="Alejar">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </section>

      <aside className={styles.lista} data-g="lista" aria-label="Diagnóstico y lista" />
      <div className={styles.velo} data-g="velo" />
    </main>
  );
}
