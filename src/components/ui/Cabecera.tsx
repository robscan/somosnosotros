"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import BotonIcono from "./BotonIcono";
import { IconoArriba } from "./Iconos";
import { useTiraQueSigue } from "./useTiraQueSigue";
import styles from "./Cabecera.module.css";

type Props = {
  /** La fila de contexto: los chips de ciudad, Cuándo y Filtros y, después, los filtros puestos con su ✕. */
  contexto: ReactNode;
  /** Debajo de la fila: el segundo nivel (la tira de letras de Artistas). */
  children?: ReactNode;
};

/**
 * La cabecera única de Inicio, Agenda, Lugares y Artistas (docs/rediseno/prototipos/cabeceras.html, OL-087): la fila
 * de contexto y, si la pantalla la trae, la tira de letras debajo; se queda pegada arriba, justo bajo la barra de la app (o
 * arriba del todo cuando la barra se recoge: `--barra-vista`, del armazón) y forma con ella una sola región, con la raya común solo abajo.
 * La lupa no vive aquí: es la de la barra de la app y lleva a Buscar, una pantalla aparte.
 * Publica en `--alto-cabecera` lo que mide, que es donde se pegan los títulos de día. Si los chips de la fila no caben,
 * la fila se desliza de lado y su borde derecho se desvanece mientras haya más (H-11). Tras bajar una pantalla aparece el
 * botón para volver arriba.
 */
export default function Cabecera({ contexto, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const lejos = useMideYVigilaLejos(ref);
  const fila = useTiraQueSigue<HTMLDivElement>();
  return (
    <>
      <header ref={ref} className={styles.cabecera}>
        <div ref={fila} className={styles.contexto}>
          {contexto}
        </div>
        {children}
      </header>
      {lejos && (
        <BotonIcono tamano="accion" relieve="elevado" className={styles.volver} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Volver arriba">
          <IconoArriba width={22} height={22} />
        </BotonIcono>
      )}
    </>
  );
}

/**
 * Publica en `--alto-cabecera` lo que mide la cabecera (donde se pegan los títulos de día) y devuelve si ya se bajó una
 * pantalla (el botón de volver arriba).
 */
function useMideYVigilaLejos(ref: RefObject<HTMLElement | null>) {
  const [lejos, setLejos] = useState(false);
  useEffect(() => {
    const cabecera = ref.current;
    if (!cabecera) return;
    const raiz = document.documentElement.style;
    let cuadro = 0;
    const medir = () => raiz.setProperty("--alto-cabecera", `${cabecera.offsetHeight}px`);
    const alDesplazar = () => {
      cuadro = 0;
      setLejos(window.scrollY > window.innerHeight);
    };
    const programar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(alDesplazar);
    };
    medir();
    programar();
    const observador = new ResizeObserver(medir);
    observador.observe(cabecera);
    window.addEventListener("scroll", programar, { passive: true });
    return () => {
      if (cuadro) cancelAnimationFrame(cuadro);
      observador.disconnect();
      window.removeEventListener("scroll", programar);
      raiz.removeProperty("--alto-cabecera");
    };
  }, [ref]);
  return lejos;
}
