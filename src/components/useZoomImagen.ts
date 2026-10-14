"use client";

import { useCallback, useEffect, useRef } from "react";
import { desplazar, escalarEn, limitar, PAUSA_RUEDA_MS, pxDeRueda, razonConRueda, ruedaAcerca, SIN_ACERCAR, type Punto, type Vista } from "@/lib/acercar";

/** Un dedo que se mueve menos que esto (px) entre que toca y suelta dio un toque, no arrastró. */
const HOLGURA_TOQUE = 10;

/** Lo que se lee de un evento de puntero (de React o del navegador). */
type Dedo = { pointerId: number; clientX: number; clientY: number; type?: string };

type Opciones = {
  /** La rueda del ratón y el pellizco del trackpad sobre la caja: a 1× acercan alrededor del cursor; acercada, la rueda sola desplaza (OL-403). */
  rueda?: boolean;
  /** Cuando la imagen pasa de 1× a acercada o al revés. */
  alCambiar?: (acercada: boolean) => void;
  /** Hasta dónde se mueve acercada. `"caja"` (el visor): sus bordes no entran más allá de los de la caja, y mientras cabe entera a lo alto o a lo
   *  ancho queda centrada en ese eje. `"imagen"` (las historias, cuya celda es más alta que el cartel): sus bordes no entran más allá de donde
   *  estaban a 1×; así nunca se recentra a medio pellizco y el punto bajo los dedos se queda bajo los dedos. */
  bordes?: "caja" | "imagen";
};

/**
 * Acercar una imagen con los dedos (OL-249, ajuste 5; compartido con las historias en OL-408): pellizcar acerca alrededor de los dedos hasta 4×, el
 * punto medio de dos dedos la arrastra y, acercada, un dedo la mueve sin que se salga de sus bordes. Aquí solo la mecánica: cada pantalla decide qué
 * hace un toque (`soltar` devuelve dónde fue, si fue un toque limpio) y engancha `tocar`, `mover` y `soltar` a sus eventos de puntero, que terminan
 * en `pointerup` o `pointercancel` (nunca en `pointerleave`: Safari táctil lo dispara en el primer movimiento del dedo). La transformación se pone
 * directo en la imagen, sin pasar por el estado de React; `data-acercada` (para la mano del ratón) y `data-suave` (para animar un salto) quedan en
 * la imagen para su CSS. La cuenta está en `lib/acercar`. Devuelve las dos referencias que la pantalla pone: `caja`, donde vive la imagen (a 1× la
 * imagen está centrada en ella y, acercada, no se sale de ella), e `imagen`.
 */
export function useZoomImagen<C extends HTMLElement = HTMLElement, I extends HTMLElement = HTMLImageElement>({ rueda = false, alCambiar, bordes = "caja" }: Opciones = {}) {
  const caja = useRef<C>(null);
  const imagen = useRef<I>(null);
  const vista = useRef<Vista>(SIN_ACERCAR);
  /** Los dedos puestos, con su último punto. */
  const punteros = useRef(new Map<number, Punto>());
  /** El toque en curso, para saber si fue un toque o un arrastre. */
  const toque = useRef<{ x: number; y: number; movido: boolean } | null>(null);
  /** El último evento de rueda y si acercó o desplazó: un mismo giro sigue haciendo lo que empezó. */
  const giro = useRef<{ t: number; acerca: boolean } | null>(null);
  const aviso = useRef(alCambiar);
  useEffect(() => {
    aviso.current = alCambiar;
  }, [alCambiar]);

  /** Un punto de la pantalla, respecto al centro de la caja (donde está la imagen a 1×). */
  const alCentro = useCallback(
    (x: number, y: number): Punto => {
      const c = caja.current!;
      const r = c.getBoundingClientRect();
      return { x: x - r.left - c.clientLeft - c.clientWidth / 2, y: y - r.top - c.clientTop - c.clientHeight / 2 };
    },
    [],
  );

  /** Pone la vista (dentro de sus límites). `suave`: con la transición corriente, para los saltos (un doble toque, volver a 1×). */
  const poner = useCallback(
    (v: Vista, suave = false) => {
      const el = imagen.current;
      const c = caja.current;
      if (!el || !c) return;
      const antes = vista.current.escala > 1;
      const medida = { ancho: el.offsetWidth, alto: el.offsetHeight };
      vista.current = limitar(v, medida, bordes === "imagen" ? medida : { ancho: c.clientWidth, alto: c.clientHeight });
      const acercada = vista.current.escala > 1;
      el.toggleAttribute("data-suave", suave);
      el.toggleAttribute("data-acercada", acercada);
      el.style.transform = `translate(${vista.current.x}px, ${vista.current.y}px) scale(${vista.current.escala})`;
      if (acercada !== antes) aviso.current?.(acercada);
    },
    [bordes],
  );

  /** Vuelve a 1× sin animar y olvida los dedos: otra imagen en el mismo sitio. */
  const reiniciar = useCallback(() => {
    punteros.current.clear();
    toque.current = null;
    const antes = vista.current.escala > 1;
    vista.current = SIN_ACERCAR;
    const el = imagen.current;
    if (el) {
      el.removeAttribute("data-suave");
      el.removeAttribute("data-acercada");
      el.style.transform = "";
    }
    if (antes) aviso.current?.(false);
  }, []);

  // La rueda no puede ser pasiva: mueve la imagen y la página de atrás no debe desplazarse. Con Ctrl/⌘ (o el pellizco del trackpad), o a 1×,
  // acerca o aleja alrededor del cursor; acercada y sin tecla, desplaza la imagen como una página (OL-403).
  useEffect(() => {
    const c = caja.current;
    if (!rueda || !c) return;
    const alRodar = (e: WheelEvent) => {
      if (!imagen.current) return;
      e.preventDefault();
      const alto = c.clientHeight;
      const [dx, dy] = [pxDeRueda(e.deltaX, e.deltaMode, alto), pxDeRueda(e.deltaY, e.deltaMode, alto)];
      const antes = giro.current;
      const acerca = ruedaAcerca(e, vista.current, antes && e.timeStamp - antes.t < PAUSA_RUEDA_MS ? antes.acerca : undefined);
      giro.current = { t: e.timeStamp, acerca };
      if (!acerca) return poner(desplazar(vista.current, dx, dy));
      const foco = alCentro(e.clientX, e.clientY);
      poner(escalarEn(vista.current, razonConRueda(dy), foco, foco));
    };
    c.addEventListener("wheel", alRodar, { passive: false });
    return () => c.removeEventListener("wheel", alRodar);
  }, [rueda, alCentro, poner]);

  /** Un dedo se posa (o el botón del ratón baja). Un segundo dedo hace del gesto un pellizco, nunca un toque. */
  const tocar = useCallback(
    (e: Dedo) => {
      imagen.current?.removeAttribute("data-suave"); // el gesto gana: una transición a medias se corta
      if (punteros.current.size === 0) toque.current = { x: e.clientX, y: e.clientY, movido: false };
      else if (toque.current) toque.current.movido = true;
      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    },
    [],
  );

  /** Un dedo se mueve: con uno, la imagen acercada lo sigue; con dos, la distancia entre ellos cambia la escala y su punto medio arrastra la imagen. */
  const mover = useCallback(
    (e: Dedo) => {
      const antes = punteros.current.get(e.pointerId);
      if (!antes) return;
      const ahora = { x: e.clientX, y: e.clientY };
      punteros.current.set(e.pointerId, ahora);
      if (punteros.current.size === 1) {
        if (toque.current && Math.hypot(ahora.x - toque.current.x, ahora.y - toque.current.y) > HOLGURA_TOQUE) toque.current.movido = true;
        if (vista.current.escala > 1) poner({ ...vista.current, x: vista.current.x + ahora.x - antes.x, y: vista.current.y + ahora.y - antes.y });
        return;
      }
      const otro = [...punteros.current].find(([id]) => id !== e.pointerId)![1];
      const distancia = (a: Punto) => Math.hypot(a.x - otro.x, a.y - otro.y);
      const medio = (a: Punto) => alCentro((a.x + otro.x) / 2, (a.y + otro.y) / 2);
      if (distancia(antes) > 0) poner(escalarEn(vista.current, distancia(ahora) / distancia(antes), medio(antes), medio(ahora)));
    },
    [alCentro, poner],
  );

  /** Un dedo se levanta. Si era el último y el gesto fue un toque limpio (un solo dedo, sin moverse, sin cancelar), dice dónde fue; si no, `null`. */
  const soltar = useCallback((e: Dedo): Punto | null => {
    punteros.current.delete(e.pointerId);
    const t = toque.current;
    if (punteros.current.size > 0 || !t) return null;
    toque.current = null;
    if (e.type === "pointercancel" || t.movido) return null;
    return { x: t.x, y: t.y };
  }, []);

  /** Los dedos puestos ahora sobre la imagen. */
  const dedos = useCallback(() => punteros.current.size, []);
  /** Si la imagen está acercada (más de 1×). */
  const acercada = useCallback(() => vista.current.escala > 1, []);

  return { caja, imagen, vista, alCentro, poner, reiniciar, tocar, mover, soltar, dedos, acercada };
}
