"use client";

import Link from "next/link";
import type { RefObject } from "react";
import styles from "./Ayuda.module.css";
import { useAyuda, type DiccionarioAyuda } from "./useAyuda";

type Props = {
  /** El contenedor de la pantalla: dentro de él se buscan los controles con `data-ayuda`. */
  raiz: RefObject<HTMLElement | null>;
  /** Las entradas de esta pantalla. */
  diccionario: DiccionarioAyuda;
  /** La página del manual de la pantalla; las anclas de las entradas se le añaden (`/ruta#ancla`). */
  manual: string;
  /** Dónde se recuerda, con ratón, si el panel está abierto (`localStorage`). */
  memoria?: string;
  /** Una clase de la pantalla, para colocar el panel en su rejilla. */
  className?: string;
  /** La entrada que enseña el panel abierto antes de que se señale ningún control (la ficha de showcase abre con la rúbrica, OL-426); sin
   *  ella, la invitación a tocar o pasar por un control. */
  inicial?: string;
};

/** Una «i» en un círculo, como la de Ableton: el mismo trazo de los iconos de la app. */
function IconoInfo() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.9" r="0.6" fill="currentColor" />
    </svg>
  );
}

/**
 * El panel de ayuda (OL-402, bitácora 433), a la manera del «Info View» de Ableton Live: una caja fija abajo a la izquierda con el nombre del
 * control señalado en negrita y dos o tres líneas que dicen qué es y para qué sirve. Cambia al instante al pasar por cualquier control con
 * `data-ayuda`, se queda con el último (no se vacía) y se pliega a una ⓘ. En el teléfono la ⓘ enciende el «modo ayuda»: tocar un control lo
 * explica en vez de usarlo. No sabe nada de la pantalla que lo usa: solo su diccionario y la ruta de su manual. Hay que ponerlo dentro del
 * contenedor `raiz`, en la esquina que la pantalla quiera; el color lo toma de `--g-opaco`, `--g-borde`, `--g-texto` y `--g-suave` si la pantalla
 * los define (si no, de los tokens de la app).
 */
export default function Ayuda({ raiz, diccionario, manual, memoria, className, inicial }: Props) {
  const { clave, abierto, tactil, alternar } = useAyuda(raiz, memoria);
  const entrada = clave ? diccionario[clave] : inicial ? diccionario[inicial] : undefined;
  return (
    <div className={className ? `${styles.ayuda} ${className}` : styles.ayuda} data-abierta={abierto} data-ayuda-panel>
      <button
        type="button"
        className={styles.info}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar la ayuda" : tactil ? "Ayuda: tocar un control explica qué hace" : "Abrir la ayuda"}
        onClick={alternar}
      >
        <IconoInfo />
      </button>
      {abierto && (
        <div className={styles.cuerpo} aria-live="polite">
          {entrada ? (
            <>
              <b className={styles.titulo}>{entrada.titulo}</b>
              <p className={styles.texto}>{entrada.texto}</p>
              {entrada.manual ? (
                <Link className={styles.enlace} href={`${manual}#${entrada.manual}`}>
                  Más en el manual ›
                </Link>
              ) : (
                <Link className={styles.enlace} href={manual}>
                  Manual
                </Link>
              )}
            </>
          ) : (
            <>
              <p className={styles.vacio}>{tactil ? "Toca un control para saber qué hace. Toca ⓘ otra vez para volver a usar la pantalla." : "Pasa el ratón por un control para saber qué hace."}</p>
              <Link className={styles.enlace} href={manual}>
                Manual
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
