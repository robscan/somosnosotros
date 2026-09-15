"use client";

import { useRouter } from "next/navigation";
import { pedirSalida } from "@/lib/guardiaSalida";
import { CLAVE_NAVEGADAS } from "../Navegacion";
import { IconoChevronIzquierda } from "./Iconos";
import styles from "./Atras.module.css";

/**
 * Atrás genérico (pedido del founder, 2026-09-15): la navegación no es lineal (se llega a una ficha desde la agenda,
 * un lugar, un artista o un enlace compartido), así que vuelve a la pantalla anterior de verdad. Sin historia propia
 * (enlace compartido, app recién abierta) lleva a `href`, la pantalla madre. Píldora con chevron, alineada a la
 * izquierda (topografía de navegación). `texto` se conserva para quien lo lea (aria-label); a la vista, "Atrás".
 * Si la pantalla tiene algo sin publicar (guardia de salida), primero pregunta ella.
 */
export default function Atras({ href, texto }: { href: string; texto: string }) {
  const router = useRouter();
  function volver(e: React.MouseEvent<HTMLAnchorElement>) {
    let vistas = 0;
    try {
      vistas = Number(sessionStorage.getItem(CLAVE_NAVEGADAS) ?? "0");
    } catch {}
    // Hay una pantalla anterior dentro de la app (esta pestaña ya vio otra): se vuelve a ella.
    const hayAnterior = vistas > 1 && window.history.length > 1;
    const irse = () => (hayAnterior ? router.back() : window.location.assign(href));
    if (pedirSalida(irse)) {
      e.preventDefault();
      return;
    }
    if (hayAnterior) {
      e.preventDefault();
      router.back();
    }
  }
  return (
    <a href={href} className={styles.atras} onClick={volver} aria-label={`Atrás (${texto})`}>
      <IconoChevronIzquierda width={18} height={18} />
      <span>Atrás</span>
    </a>
  );
}
