"use client";

import { useRouter } from "next/navigation";
import { pedirSalida } from "@/lib/guardiaSalida";
import { hayAnterior } from "../Navegacion";
import { IconoChevronIzquierda } from "./Iconos";
import styles from "./Atras.module.css";

/**
 * Cómo se vuelve (lo comparten Atrás y Cerrar): a la pantalla anterior de verdad si la entrada del historial tiene una
 * pantalla de la app detrás (marca propia, `Navegacion`); si no (enlace compartido, app recién abierta, o ya de vuelta
 * en la primera), a `href`, la pantalla madre, reemplazando la entrada para que el gesto de atrás no regrese aquí.
 * Si la pantalla tiene algo sin publicar (guardia de salida), primero pregunta ella y se le entrega la salida.
 */
export function useVolver(href: string): (e: React.MouseEvent<HTMLAnchorElement>) => void {
  const router = useRouter();
  return function volver(e) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const anterior = hayAnterior();
    const irse = () => (anterior ? router.back() : router.replace(href));
    if (pedirSalida(irse)) return;
    irse();
  };
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
