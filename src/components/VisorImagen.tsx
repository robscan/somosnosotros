"use client";

import { useEffect, useRef } from "react";
import { dobleToque } from "@/lib/acercar";
import BotonIcono from "./ui/BotonIcono";
import { IconoCerrar } from "./ui/Iconos";
import { useZoomImagen } from "./useZoomImagen";
import styles from "./Cartel.module.css";

/** Dos toques hacen un doble toque si el segundo llega antes de esto (ms) y a menos de `DOBLE_TOQUE_PX` del primero. Por eso tocar la imagen a 1× la cierra
 *  pasado este tiempo, no al instante: antes podría ser la mitad de un doble toque. */
const DOBLE_TOQUE_MS = 280;
const DOBLE_TOQUE_PX = 40;

/**
 * El visor de un cartel (OL-249, ajuste 5): la imagen entera sobre negro, a pantalla completa, que se puede acercar hasta 4×. Pellizcar acerca
 * alrededor de los dedos; con un dedo, la imagen acercada se mueve sin salirse de sus bordes; un doble toque alterna 1× y 2,5× en el punto tocado; la
 * rueda del ratón acerca alrededor del cursor y, ya acercada, desplaza la imagen (con Ctrl/⌘ o el pellizco del trackpad, acerca y aleja siempre; OL-403);
 * con el ratón, la imagen acercada se arrastra como con un dedo. Abre ajustada a la ventana, nunca más grande (`Cartel.module.css`). Tocar sin moverse con la imagen a 1× la cierra (acercada, no: así no se cierra por error al leerla);
 * tocar el negro y la ✕ cierran siempre. El pellizco, el arrastre y la rueda son de `useZoomImagen` (compartido con las historias, OL-408); aquí, el
 * doble toque y el cierre. Los gestos son eventos de puntero que terminan en `pointerup` o `pointercancel`, nunca en `pointerleave` (Safari lo
 * dispara en el primer movimiento del dedo).
 */
export default function VisorImagen({ src, alt, onCerrar }: { src: string; alt: string; onCerrar: () => void }) {
  const { caja: visor, imagen, vista, alCentro, poner, tocar, mover, soltar } = useZoomImagen<HTMLDivElement>({ rueda: true });
  /** El último toque, para reconocer el doble. */
  const anterior = useRef<{ t: number; x: number; y: number } | null>(null);
  const cierre = useRef(0);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      window.clearTimeout(cierre.current);
    };
  }, [onCerrar]);

  const alTocar = (e: React.PointerEvent) => {
    window.clearTimeout(cierre.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    tocar(e);
  };

  const alSoltar = (e: React.PointerEvent) => {
    const t = soltar(e);
    if (!t) return;
    const previo = anterior.current;
    if (previo && e.timeStamp - previo.t < DOBLE_TOQUE_MS && Math.hypot(t.x - previo.x, t.y - previo.y) < DOBLE_TOQUE_PX) {
      anterior.current = null;
      poner(dobleToque(vista.current, alCentro(t.x, t.y)), true);
      return;
    }
    anterior.current = { t: e.timeStamp, x: t.x, y: t.y };
    if (vista.current.escala === 1) cierre.current = window.setTimeout(onCerrar, DOBLE_TOQUE_MS);
  };

  return (
    <div className={styles.visor} role="dialog" aria-label={alt} onClick={(e) => e.target === e.currentTarget && onCerrar()} ref={visor}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
      <img
        ref={imagen}
        src={src}
        alt={alt}
        className={styles.visorImagen}
        draggable={false}
        onPointerDown={alTocar}
        onPointerMove={mover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onTransitionEnd={(e) => e.currentTarget.removeAttribute("data-suave")}
      />
      <BotonIcono className={styles.visorCerrar} onClick={onCerrar} aria-label="Cerrar">
        <IconoCerrar width={22} height={22} />
      </BotonIcono>
    </div>
  );
}
