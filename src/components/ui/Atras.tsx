"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { pedirSalida } from "@/lib/guardiaSalida";
import { alVolver, hayAnterior, registrarVolverVisible, vuelveADestino } from "../Navegacion";
import { IconoChevronIzquierda } from "./Iconos";
import styles from "./Atras.module.css";

/** Ruta y consulta de una URL de la app, como se comparan con la barra. */
function claveDe(url: string): string {
  const u = new URL(url, window.location.href);
  return u.pathname + u.search;
}

/**
 * Cómo se vuelve (lo comparten Atrás y Cerrar): a la pantalla anterior de verdad si la entrada del historial tiene una
 * pantalla de la app detrás (marca propia, `Navegacion`); si no (enlace compartido, app recién abierta, o ya de vuelta
 * en la primera), a `href`, la pantalla madre, reemplazando la entrada para que el gesto de atrás no regrese aquí.
 * Si la madre tiene la misma ruta que la pantalla actual (la de error de la agenda), se recarga: Next.js solo quita la
 * pantalla de error cuando cambia la ruta. Si la pantalla tiene algo sin publicar (guardia de salida), primero
 * pregunta ella y se le entrega la salida.
 *
 * Mientras el botón (o la ✕) está en pantalla, esta misma función queda registrada (`registrarVolverVisible`,
 * OL-205) para que el gesto nativo de deslizar desde el borde, dentro de la app de iPhone, vuelva exactamente igual
 * que un toque — nunca con el `WKBackForwardList` a secas, que no conoce la marca propia del historial.
 */
export function useVolver(href: string): (e: React.MouseEvent<HTMLAnchorElement>) => void {
  const router = useRouter();
  const irse = useCallback(() => {
    const anterior = hayAnterior();
    const ir = () => {
      if (anterior) router.back();
      else if (new URL(href, window.location.href).pathname === window.location.pathname) window.location.replace(href);
      else router.replace(href);
    };
    if (pedirSalida(ir)) return;
    ir();
  }, [href, router]);
  useEffect(() => registrarVolverVisible(irse), [irse]);
  return function volver(e) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    irse();
  };
}

type OpcionesTerminar = {
  /** A dónde ir si no se vino de la pantalla de destino (por omisión, el mismo destino). */
  siNo?: string;
  /** Releer también tras reemplazar (al entrar cambió la sesión). */
  refrescar?: boolean;
};

/**
 * Terminar una tarea (guardar una edición, entrar, registrar un lugar desde el alta de evento) sin dejarla en el
 * historial. Si se vino de la pantalla de destino (misma ruta), se vuelve a ella y se queda con `destino` (se reemplaza
 * si cambió la consulta y se relee si no): así Atrás no repite la ficha. Si no, la tarea se reemplaza por `siNo`.
 */
export function useTerminar(): (destino: string, opciones?: OpcionesTerminar) => void {
  const router = useRouter();
  return useCallback(
    (destino: string, { siNo = destino, refrescar = false }: OpcionesTerminar = {}) => {
      if (!vuelveADestino(destino)) {
        router.replace(siNo);
        if (refrescar) router.refresh();
        return;
      }
      const borrarse = alVolver(() => {
        borrarse();
        // Después de que el router pinte la pantalla a la que se volvió.
        window.setTimeout(() => {
          if (claveDe(window.location.href) === claveDe(destino)) {
            router.refresh();
            return;
          }
          router.replace(destino);
          if (refrescar) router.refresh();
        }, 0);
      });
      router.back();
    },
    [router],
  );
}

/**
 * Atrás genérico (pedido del founder, 2026-09-15): la navegación no es lineal (se llega a una ficha desde la agenda,
 * un lugar, un artista o un enlace compartido), así que vuelve a la pantalla anterior de verdad. Sin pantalla anterior
 * (enlace compartido, app recién abierta) lleva a `href`, la pantalla madre. Píldora con chevron, alineada a la
 * izquierda (topografía de navegación). `texto` se conserva para quien lo lea (aria-label); a la vista, "Atrás".
 * Si la pantalla tiene algo sin publicar (guardia de salida), primero pregunta ella.
 */
export default function Atras({ href, texto }: { href: string; texto: string }) {
  const volver = useVolver(href);
  return (
    <a href={href} className={styles.atras} onClick={volver} aria-label={`Atrás (${texto})`}>
      <IconoChevronIzquierda width={18} height={18} />
      <span>Atrás</span>
    </a>
  );
}
