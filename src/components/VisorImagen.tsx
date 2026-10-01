"use client";

import { useCallback, useEffect, useRef } from "react";
import { dobleToque, escalarEn, limitar, razonConRueda, SIN_ACERCAR, type Punto, type Vista } from "@/lib/acercar";
import BotonIcono from "./ui/BotonIcono";
import { IconoCerrar } from "./ui/Iconos";
import styles from "./Cartel.module.css";

/** Un dedo que se mueve menos que esto (px) entre que toca y suelta dio un toque, no arrastró. */
const HOLGURA_TOQUE = 10;
/** Dos toques hacen un doble toque si el segundo llega antes de esto (ms) y a menos de `DOBLE_TOQUE_PX` del primero. Por eso tocar la imagen a 1× la cierra
 *  pasado este tiempo, no al instante: antes podría ser la mitad de un doble toque. */
const DOBLE_TOQUE_MS = 280;
const DOBLE_TOQUE_PX = 40;

/**
 * El visor de un cartel (OL-249, ajuste 5): la imagen entera sobre negro, a pantalla completa, que se puede acercar hasta 4×. Pellizcar acerca
 * alrededor de los dedos; con un dedo, la imagen acercada se mueve sin salirse de sus bordes; un doble toque alterna 1× y 2,5× en el punto tocado; la
 * rueda del ratón acerca alrededor del cursor. Tocar sin moverse con la imagen a 1× la cierra (acercada, no: así no se cierra por error al leerla);
 * tocar el negro y la ✕ cierran siempre. La cuenta está en `lib/acercar`; aquí solo los gestos, con eventos de puntero (que terminan en `pointerup` o
 * `pointercancel`, nunca en `pointerleave`: Safari lo dispara en el primer movimiento del dedo) y la transformación puesta directo en la imagen,
 * sin pasar por el estado de React.
 */
export default function VisorImagen({ src, alt, onCerrar }: { src: string; alt: string; onCerrar: () => void }) {
  const visor = useRef<HTMLDivElement>(null);
  const imagen = useRef<HTMLImageElement>(null);
  const vista = useRef<Vista>(SIN_ACERCAR);
  /** Los dedos puestos, con su último punto. */
  const punteros = useRef(new Map<number, Punto>());
  /** El toque en curso, para saber si fue un toque o un arrastre. */
  const toque = useRef<{ x: number; y: number; movido: boolean } | null>(null);
  /** El último toque, para reconocer el doble. */
  const anterior = useRef<{ t: number; x: number; y: number } | null>(null);
  const cierre = useRef(0);

  /** Un punto de la pantalla, respecto al centro de la ventana (donde está la imagen). */
  const alCentro = useCallback((x: number, y: number): Punto => ({ x: x - visor.current!.clientWidth / 2, y: y - visor.current!.clientHeight / 2 }), []);
  /** Pone la vista (dentro de sus límites). `suave`: con la transición corriente, para los saltos de un doble toque. */
  const poner = useCallback((v: Vista, suave = false) => {
    const el = imagen.current!;
    const caja = visor.current!;
    vista.current = limitar(v, { ancho: el.offsetWidth, alto: el.offsetHeight }, { ancho: caja.clientWidth, alto: caja.clientHeight });
    el.toggleAttribute("data-suave", suave);
    el.style.transform = `translate(${vista.current.x}px, ${vista.current.y}px) scale(${vista.current.escala})`;
  }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    // La rueda no puede ser pasiva: acerca la imagen y la página de atrás no debe desplazarse.
    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      const foco = alCentro(e.clientX, e.clientY);
      poner(escalarEn(vista.current, razonConRueda(e.deltaY), foco, foco));
    };
    const caja = visor.current!;
    document.addEventListener("keydown", alTeclear);
    caja.addEventListener("wheel", alRodar, { passive: false });
    return () => {
      document.removeEventListener("keydown", alTeclear);
      caja.removeEventListener("wheel", alRodar);
      window.clearTimeout(cierre.current);
    };
  }, [onCerrar, alCentro, poner]);

  const alTocar = (e: React.PointerEvent) => {
    window.clearTimeout(cierre.current);
    imagen.current!.removeAttribute("data-suave"); // el gesto gana: una transición a medias se corta
    e.currentTarget.setPointerCapture(e.pointerId);
    if (punteros.current.size === 0) toque.current = { x: e.clientX, y: e.clientY, movido: false };
    else if (toque.current) toque.current.movido = true; // un segundo dedo: pellizco, no toque
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const alMover = (e: React.PointerEvent) => {
    const antes = punteros.current.get(e.pointerId);
    if (!antes) return;
    const ahora = { x: e.clientX, y: e.clientY };
    punteros.current.set(e.pointerId, ahora);
    if (punteros.current.size === 1) {
      if (toque.current && Math.hypot(ahora.x - toque.current.x, ahora.y - toque.current.y) > HOLGURA_TOQUE) toque.current.movido = true;
      if (vista.current.escala > 1) poner({ ...vista.current, x: vista.current.x + ahora.x - antes.x, y: vista.current.y + ahora.y - antes.y });
      return;
    }
    // Dos dedos: la distancia entre ellos cambia la escala y su punto medio arrastra la imagen.
    const otro = [...punteros.current].find(([id]) => id !== e.pointerId)![1];
    const distancia = (a: Punto) => Math.hypot(a.x - otro.x, a.y - otro.y);
    const medio = (a: Punto) => alCentro((a.x + otro.x) / 2, (a.y + otro.y) / 2);
    if (distancia(antes) > 0) poner(escalarEn(vista.current, distancia(ahora) / distancia(antes), medio(antes), medio(ahora)));
  };

  const alSoltar = (e: React.PointerEvent) => {
    punteros.current.delete(e.pointerId);
    const t = toque.current;
    if (punteros.current.size > 0 || !t) return;
    toque.current = null;
    if (e.type === "pointercancel" || t.movido) return;
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
        onPointerMove={alMover}
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
