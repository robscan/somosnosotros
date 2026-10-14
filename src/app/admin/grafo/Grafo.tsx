"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { useVolver } from "@/components/ui/Atras";
import Ayuda from "@/components/ui/Ayuda";
import { IconoChevronIzquierda } from "@/components/ui/Iconos";
import type { Grafo as DatosGrafo } from "@/lib/grafo";
import { actualizarGrafo } from "./acciones";
import { AYUDA, RUTA_MANUAL } from "./ayuda";
import { IconoActualizar } from "./IconoGrafo";
import styles from "./Grafo.module.css";

/**
 * El grafo cultural en 3D, solo para Administración (OL-401, bitácora 432). React pone el armazón y el motor (`motor.ts`, con three.js) llena
 * el árbol y la lista y dibuja la escena; three.js se carga aquí, al entrar, y no pesa en ninguna otra pantalla. Los datos llegan ya
 * anónimos del servidor: ninguna persona lleva id, nombre ni foto. `yo` es el número del punto de quien mira entre los asistentes (o null si no tiene
 * asistencias): el interruptor «Yo» lo marca como «Tú» sin que el navegador sepa de qué cuenta es.
 * Los textos que explican cada control no están en la pantalla: cada uno lleva su clave en `data-ayuda` y su explicación vive en `ayuda.ts`
 * (OL-402, bitácora 433): la enseña el panel «Ayuda» y la lista completa el manual.
 */
export default function Grafo({ datos, yo, calculadoEn }: { datos: DatosGrafo; yo: number | null; calculadoEn: string }) {
  const raiz = useRef<HTMLDivElement>(null);
  const [sinWebgl, setSinWebgl] = useState(false);
  const volver = useVolver("/admin");
  const router = useRouter();
  const [actualizando, actualizar] = useTransition();

  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo) return;
    let cancelado = false;
    let destruir: (() => void) | null = null;
    import("./motor")
      .then(({ crearMotor }) => {
        if (cancelado) return;
        try {
          destruir = crearMotor(datos, nodo, styles, yo, calculadoEn).destruir;
        } catch {
          setSinWebgl(true);
        }
      })
      .catch(() => setSinWebgl(true));
    return () => {
      cancelado = true;
      destruir?.();
    };
    // Se vuelve a montar solo cuando el servidor calculó datos nuevos (`calculadoEn`) o cambia quien mira, no cada vez que React recibe otra copia de los
    // mismos datos (`router.refresh()` con la caché al día): el lienzo se estrena con cada montaje (ver `key` abajo) y un motor nuevo sobre un lienzo ya usado no dibuja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculadoEn, yo]);

  return (
    <main ref={raiz} className={styles.app} data-tema="oscuro">
      <header className={styles.barra}>
        <Link href="/admin" className={styles.atras} onClick={volver} aria-label="Volver a Administración">
          <IconoChevronIzquierda />
        </Link>
        <h1 data-ayuda="pantalla">Grafo cultural</h1>
        <div className={styles.cifras} data-g="cifras" data-ayuda="cifras" />
        <div className={styles.fps} data-g="fps" data-ayuda="fps">
          en reposo
        </div>
        <Link href={RUTA_MANUAL} className={`${styles.pildora} ${styles.soloAncho}`} data-ayuda="manual">
          Manual
        </Link>
        <button type="button" className={styles.pildora} data-g="tema" data-ayuda="tema" aria-pressed="false">
          Claro
        </button>
        <button
          type="button"
          className={styles.icono}
          data-ayuda="actualizar"
          aria-label="Actualizar"
          aria-busy={actualizando}
          disabled={actualizando}
          onClick={() =>
            actualizar(async () => {
              await actualizarGrafo();
              router.refresh();
            })
          }
        >
          <IconoActualizar />
        </button>
      </header>

      <nav className={styles.arbol} data-g="arbol" aria-label="Lentes, filtros y ajustes" />

      <section className={styles.escena} aria-label="Escena en 3D">
        <canvas key={calculadoEn} className={styles.lienzo} data-g="lienzo" />
        <div className={styles.rotulo} data-g="rotulo" />
        <div className={`${styles.rotulo} ${styles.tu}`} data-g="rotuloYo">
          Tú
        </div>
        <div data-g="vecinos" />
        <div data-g="etiquetas" />
        <section className={styles.tarjeta} data-g="tarjeta" aria-live="polite" />
        {sinWebgl && <p className={styles.sinWebgl}>Este navegador no puede dibujar el grafo en 3D.</p>}
        <div className={styles.pila}>
          <div className={styles.leyenda}>
            <div className={styles.capa}>
              <button type="button" className={styles.capaBoton} data-g="capa-lugar" data-ayuda="capa-lugar" aria-pressed="true" style={{ "--c": "var(--g-c-lugar, var(--primario))" } as CSSProperties}>
                Lugar · en su posición real
              </button>
            </div>
            <div className={styles.capa}>
              <button type="button" className={styles.capaBoton} data-g="capa-artista" data-ayuda="capa-artista" aria-pressed="true" style={{ "--c": "var(--g-c-artista, var(--fondo-contenido))" } as CSSProperties}>
                Artista · sobre el lugar donde más toca
              </button>
            </div>
            <div className={styles.capa}>
              <button type="button" className={styles.capaBoton} data-g="capa-persona" data-ayuda="capa-asistente" aria-pressed="true" style={{ "--c": "var(--g-c-persona, var(--destacado))" } as CSSProperties}>
                Asistente · anónimo, posición inventada
              </button>
              <button type="button" className={`${styles.pildora} ${styles.yo}`} data-g="yo" data-ayuda="yo" aria-pressed="false" disabled={yo === null}>
                Yo
              </button>
            </div>
            {yo === null && <p className={styles.sinAsistencias}>Aún no tienes asistencias</p>}
          </div>
          <Ayuda className={styles.ayuda} raiz={raiz} diccionario={AYUDA} manual={RUTA_MANUAL} memoria="grafo-admin:ayuda" />
          <div className={styles.botonesHojas}>
            <button type="button" className={styles.flotante} data-g="abrirArbol" data-ayuda="lentes">
              Lentes
            </button>
            <button type="button" className={styles.flotante} data-g="abrirLista" data-ayuda="lista">
              Lista
            </button>
          </div>
        </div>
        <div className={styles.vistas}>
          <button type="button" className={styles.pildora} data-g="red" data-ayuda="red" aria-pressed="false">
            Red
          </button>
          <button type="button" className={styles.pildora} data-g="arriba" data-ayuda="arriba" aria-pressed="false">
            Desde arriba
          </button>
        </div>
        <div className={styles.mando} role="group" aria-label="Cámara">
          <button type="button" className={styles.arriba} data-mando="arriba" data-ayuda="camara-arriba" aria-label="Inclinar hacia arriba">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
          <button type="button" className={styles.mas} data-mando="mas" data-ayuda="camara-mas" aria-label="Acercar">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button type="button" className={styles.izq} data-mando="izq" data-ayuda="camara-izq" aria-label="Girar a la izquierda">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" className={styles.centro} data-mando="centro" data-ayuda="camara-centro" aria-label="Volver al centro">
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
          </button>
          <button type="button" className={styles.der} data-mando="der" data-ayuda="camara-der" aria-label="Girar a la derecha">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <button type="button" className={styles.abajo} data-mando="abajo" data-ayuda="camara-abajo" aria-label="Inclinar hacia abajo">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button type="button" className={styles.menos} data-mando="menos" data-ayuda="camara-menos" aria-label="Alejar">
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
