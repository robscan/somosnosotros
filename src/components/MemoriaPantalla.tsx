"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { guardarMemoria, guardarUrlSeccion, leerMemoria } from "@/lib/memoriaPantalla";

export type Seccion = "agenda" | "lugares" | "artistas";

/**
 * Recuerda el estado de un listado (pestaña, filtro, búsqueda) y su scroll, y los devuelve al volver a la misma URL
 * (pedido del founder, 2026-09-15: volver de una ficha a la agenda no puede perder el punto de lectura).
 * - Al montar, si hay memoria de esta URL, `aplicar` recibe el estado guardado antes de pintar (sin parpadeo)
 *   y el scroll se repone en cuanto la lista está en su sitio.
 * - Después, cada cambio de estado y cada scroll se guardan; la URL queda como última de su sección para la barra inferior.
 * Un estado `undefined` significa que solo se recuerda el scroll (listados que viven en la URL, como Artistas).
 */
export function useMemoriaPantalla<T>(seccion: Seccion, estado: T, aplicar?: (estado: T) => void) {
  const ruta = usePathname();
  const params = useSearchParams();
  const cadena = params.toString();
  const clave = cadena ? `${ruta}?${cadena}` : ruta;

  // Lo último renderizado, para los efectos que no deben volver a suscribirse en cada render (se sincroniza en cada commit).
  const claveActual = useRef(clave);
  const estadoActual = useRef(estado);
  const aplicarActual = useRef(aplicar);
  useLayoutEffect(() => {
    claveActual.current = clave;
    estadoActual.current = estado;
    aplicarActual.current = aplicar;
  });
  /** Scroll por reponer y el estado con el que debe reponerse (serializado para compararlo sin depender de la identidad). */
  const pendiente = useRef<{ scroll: number; estado: string } | null>(null);
  const estadoJson = JSON.stringify(estado ?? null);

  // Al montar: leer la memoria y aplicar el estado antes de pintar.
  useLayoutEffect(() => {
    const m = leerMemoria<T>(claveActual.current);
    if (!m) return;
    const guardado = JSON.stringify(m.estado ?? null);
    pendiente.current = { scroll: m.scroll, estado: estadoActual.current === undefined ? "null" : guardado };
    if (estadoActual.current !== undefined && guardado !== JSON.stringify(estadoActual.current) && aplicarActual.current) aplicarActual.current(m.estado);
  }, []);

  // Cada URL que se ve queda como la última de su sección.
  useEffect(() => {
    guardarUrlSeccion(seccion, clave);
  }, [seccion, clave]);

  // Tras pintar con el estado ya aplicado: reponer el scroll (después de que Next lleve la página arriba). Si no hay nada
  // que reponer, guardar el estado nuevo con el scroll de ahora.
  useEffect(() => {
    const p = pendiente.current;
    if (p) {
      if (p.estado !== estadoJson) return; // el estado guardado todavía no llegó al render
      pendiente.current = null;
      window.scrollTo({ top: p.scroll, behavior: "instant" });
      return;
    }
    guardarMemoria(clave, { estado: estadoActual.current, scroll: window.scrollY });
  }, [clave, estadoJson]);

  // El scroll se guarda al vuelo (un guardado por cuadro), solo mientras esta URL siga siendo la de la pantalla:
  // al irse a una ficha, Next cambia la URL y lleva la página arriba antes de desmontar; ese "arriba" no se guarda.
  useEffect(() => {
    let cuadro = 0;
    function alDesplazar() {
      if (cuadro) return;
      cuadro = window.requestAnimationFrame(() => {
        cuadro = 0;
        if (pendiente.current || window.location.pathname + window.location.search !== claveActual.current) return;
        guardarMemoria(claveActual.current, { estado: estadoActual.current, scroll: window.scrollY });
      });
    }
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      if (cuadro) window.cancelAnimationFrame(cuadro);
    };
  }, []);
}

/** Para listados cuyo filtro ya vive en la URL (Artistas): solo el scroll y la última URL de la sección. */
export default function MemoriaPantalla({ seccion }: { seccion: Seccion }) {
  useMemoriaPantalla(seccion, undefined);
  return null;
}
