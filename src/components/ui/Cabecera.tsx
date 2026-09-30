"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { sinMovimiento } from "@/lib/movimiento";
import BotonIcono from "./BotonIcono";
import { IconoArriba } from "./Iconos";
import { TiraDeChips, type Tira } from "./tiraDeChips";
import { useTiraQueSigue } from "./useTiraQueSigue";
import styles from "./Cabecera.module.css";

type Props = {
  /** La fila de contexto: los chips de ciudad, Cuándo y Filtros y, después, los filtros puestos con su ✕. */
  contexto: ReactNode;
  /** Debajo de la fila: el segundo nivel (la tira de letras de Artistas). */
  children?: ReactNode;
  /** Las pantallas que no se desplazan con la ventana (la hoja de Lugares) dicen ellas si ya se bajó una pantalla y cómo volver al principio. */
  volverArriba?: { lejos: boolean; volver: () => void };
};

/**
 * La cabecera única de Inicio, Agenda, Lugares y Artistas (docs/rediseno/prototipos/cabeceras.html, OL-087): la fila
 * de contexto y, si la pantalla la trae, la tira de letras debajo; se queda pegada arriba, justo bajo la barra de la app (o
 * arriba del todo cuando la barra se recoge: `--barra-vista`, del armazón) y forma con ella una sola región, con la raya común solo abajo.
 * La lupa no vive aquí: es la de la barra de la app y lleva a Buscar, una pantalla aparte.
 * Publica en `--alto-cabecera` lo que mide, que es donde se pegan los títulos de día. Si los chips de la fila no caben,
 * la fila se desliza de lado y su borde derecho se desvanece mientras haya más (H-11). Tras bajar una pantalla aparece el
 * botón para volver arriba: el de la ventana, o el de la pantalla que se desplaza por su cuenta (`volverArriba`). Los chips que se ponen o
 * se quitan de la fila se notan: cada uno se anima solo (`ui/Chip`) y la fila se desliza para mostrar el que entra (`TiraDeChips`).
 */
export default function Cabecera({ contexto, children, volverArriba }: Props) {
  const ref = useRef<HTMLElement>(null);
  const lejosDeLaVentana = useMideYVigilaLejos(ref);
  const fila = useTiraQueSigue<HTMLDivElement>();
  const tira = useTiraDeChips(fila);
  const lejos = volverArriba ? volverArriba.lejos : lejosDeLaVentana;
  const volver = volverArriba?.volver ?? (() => window.scrollTo({ top: 0, behavior: "smooth" }));
  return (
    <>
      <header ref={ref} className={styles.cabecera}>
        <div ref={fila} className={styles.contexto}>
          <TiraDeChips.Provider value={tira}>{contexto}</TiraDeChips.Provider>
        </div>
        {children}
      </header>
      {lejos && (
        <BotonIcono tamano="accion" relieve="elevado" className={styles.volver} onClick={volver} aria-label="Volver arriba">
          <IconoArriba width={22} height={22} />
        </BotonIcono>
      )}
    </>
  );
}

/**
 * Lo que la fila de contexto le ofrece a sus chips (`TiraDeChips`). Está puesta pasado el primer pintado: lo que la pantalla trae al abrirse
 * (la URL, la memoria de pantalla, que se repone antes de pintar) ya está en la fila y no se anima. Mostrar desliza la fila, solo de lado y
 * lo justo, hasta que el chip quede entero dentro del aire que la fila deja a sus lados (`scroll-padding-inline`); con «reducir movimiento», de golpe.
 */
function useTiraDeChips(fila: RefObject<HTMLDivElement | null>): Tira {
  const puesta = useRef(false);
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => {
      puesta.current = true;
    });
    return () => cancelAnimationFrame(cuadro);
  }, []);
  return useMemo(
    () => ({
      puesta: () => puesta.current,
      mostrar: (chip) => {
        const tira = fila.current;
        if (!tira) return;
        const { left, right } = tira.getBoundingClientRect();
        const aire = getComputedStyle(tira);
        const caja = chip.getBoundingClientRect();
        const sobraDerecha = caja.right - (right - parseFloat(aire.scrollPaddingRight));
        const sobraIzquierda = caja.left - (left + parseFloat(aire.scrollPaddingLeft));
        const falta = sobraDerecha > 0 ? sobraDerecha : Math.min(sobraIzquierda, 0);
        if (falta) tira.scrollBy({ left: falta, behavior: sinMovimiento() ? "auto" : "smooth" });
      },
    }),
    [fila],
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
