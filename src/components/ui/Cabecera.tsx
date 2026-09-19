"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { IconoArriba, IconoBuscar } from "./Iconos";
import styles from "./Cabecera.module.css";

const SALTO = "cabecera:salto";

/**
 * Antes de llevar la lista a un punto (la tira de letras): la cabecera queda compacta al momento y sin animar, así
 * quien mide lo que se pega arriba lee su alto final, y el propio salto no la vuelve a desplegar.
 */
export function antesDeSaltar() {
  window.dispatchEvent(new Event(SALTO));
}

type Props = {
  /** Renglón 1, a la izquierda: dónde y cuándo (chips de contexto: fecha, ciudad). */
  contexto: ReactNode;
  /** Renglón 1, a la derecha y antes de la lupa: botones redondos de la pantalla (Mapa o Lista). */
  acciones?: ReactNode;
  /** Abre la búsqueda. Sin él no hay lupa. */
  onBuscar?: () => void;
  /** La búsqueda abierta: ocupa el renglón 1 entero, con el mismo alto (la cabecera no se mueve). */
  campo?: ReactNode;
  /** Renglón 2: qué ver (ui/Pestanas). */
  filtros?: ReactNode;
  /** Debajo de las pestañas: el segundo nivel (chips de detalle en Artistas). */
  children?: ReactNode;
};

/**
 * La cabecera única de Agenda, Lugares y Artistas (docs/rediseno/prototipos/cabeceras.html, OL-087): contexto y
 * acciones arriba, pestañas debajo; se queda pegada arriba. Al bajar se esconde el renglón 1 y al subir un poco
 * vuelve; publica en `--alto-cabecera` lo que mide a la vista, que es donde se pegan los títulos de día y la tira
 * de letras. Tras bajar una pantalla aparece el botón para volver arriba.
 */
export default function Cabecera({ contexto, acciones, onBuscar, campo, filtros, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const lejos = useCompacta(ref, !campo);
  return (
    <>
      <header ref={ref} className={styles.cabecera}>
        {campo ? (
          <div className={styles.campo}>{campo}</div>
        ) : (
          <>
            <div className={styles.contexto}>{contexto}</div>
            <div className={styles.acciones}>
              {acciones}
              {onBuscar && (
                <BotonRedondo etiqueta="Buscar" onClick={onBuscar}>
                  <IconoBuscar />
                </BotonRedondo>
              )}
            </div>
          </>
        )}
        {filtros}
        {children}
      </header>
      {lejos && (
        <button type="button" className={styles.volver} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Volver arriba">
          <IconoArriba width={22} height={22} />
        </button>
      )}
    </>
  );
}

/** Botón de solo icono del renglón 1 (la lupa, Mapa o Lista). */
export function BotonRedondo({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.redondo} onClick={onClick} aria-label={etiqueta}>
      {children}
    </button>
  );
}

/**
 * Compacta al bajar, completa al subir o arriba del todo (mientras no se ha bajado lo que mide la propia cabecera).
 * `compactable` es falso con la búsqueda abierta: el campo no se esconde mientras se escribe. Devuelve si ya se
 * bajó una pantalla (el botón de volver arriba).
 */
function useCompacta(ref: RefObject<HTMLElement | null>, compactable: boolean) {
  const [lejos, setLejos] = useState(false);
  useEffect(() => {
    const cabecera = ref.current;
    if (!cabecera) return;
    const raiz = document.documentElement.style;
    let antes = window.scrollY;
    let quietaHasta = 0;
    let cuadro = 0;
    const medir = () => {
      const fila1 = (cabecera.firstElementChild as HTMLElement).offsetHeight;
      const compacta = "compacta" in cabecera.dataset;
      cabecera.style.setProperty("--fila1", `${fila1}px`);
      raiz.setProperty("--alto-cabecera", `${cabecera.offsetHeight - (compacta ? fila1 : 0)}px`);
    };
    const compactar = (si: boolean) => {
      if ("compacta" in cabecera.dataset === si) return;
      cabecera.toggleAttribute("data-compacta", si);
      medir();
    };
    const alDesplazar = () => {
      cuadro = 0;
      const y = window.scrollY;
      const paso = y - antes;
      antes = y;
      setLejos(y > window.innerHeight);
      if (Date.now() < quietaHasta) return;
      if (!compactable || y < cabecera.offsetHeight || paso < -6) compactar(false);
      else if (paso > 6) compactar(true);
    };
    const programar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(alDesplazar);
    };
    const alSaltar = () => {
      // Sin animar este cambio: lo que mide la cabecera y la tira debe ser ya el final, no uno a medio camino.
      raiz.setProperty("--cabecera-animacion", "0s");
      compactar(true);
      quietaHasta = Date.now() + 250;
      window.setTimeout(() => raiz.removeProperty("--cabecera-animacion"), 250);
    };
    medir();
    programar();
    const observador = new ResizeObserver(medir);
    observador.observe(cabecera);
    window.addEventListener("scroll", programar, { passive: true });
    window.addEventListener(SALTO, alSaltar);
    return () => {
      if (cuadro) cancelAnimationFrame(cuadro);
      observador.disconnect();
      window.removeEventListener("scroll", programar);
      window.removeEventListener(SALTO, alSaltar);
      raiz.removeProperty("--alto-cabecera");
    };
  }, [ref, compactable]);
  return lejos;
}
