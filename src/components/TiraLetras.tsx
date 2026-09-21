"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { idGrupo } from "@/lib/indice";
import styles from "./TiraLetras.module.css";

/**
 * Cuánto miden, ya pegados, los `position: sticky` que hay ANTES de un elemento en el documento — sin importar el
 * anidamiento (en Lugares el header pegado es hermano de la lista; en Artistas es su primer hijo). Ignora al propio
 * elemento y a lo que hay dentro de él.
 */
function tapaAntesDe(destino: HTMLElement): number {
  return Math.max(0, ...[...document.querySelectorAll<HTMLElement>("main *")].map((e) => {
    if (e === destino || e.contains(destino) || destino.contains(e)) return 0;
    if (!(destino.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING)) return 0;
    const s = getComputedStyle(e);
    return s.position === "sticky" ? (parseFloat(s.top) || 0) + e.offsetHeight : 0;
  }));
}

/**
 * Lleva la página al encabezado de una letra, bajo lo que se queda pegado arriba: la cabecera de la pantalla y,
 * ahora, la propia tira (también pegajosa, founder 2026-09-19).
 */
export function irAlGrupo(letra: string): boolean {
  const grupo = document.getElementById(idGrupo(letra));
  if (!grupo) return false;
  window.scrollTo({ top: grupo.getBoundingClientRect().top + window.scrollY - tapaAntesDe(grupo) });
  return true;
}

/**
 * En qué letra vas: la del último separador que ya cruzó el borde de abajo de lo pegado arriba (la tira incluida),
 * o ninguna antes de llegar a la zona de la primera (founder, 2026-09-19: «A deja de ser un filtro y se tiene que
 * iluminar en cuanto entremos a su zona»). Un listener de scroll pasivo, calculado como mucho una vez por cuadro y
 * solo vuelve a pintar si la letra realmente cambió: no es un IntersectionObserver porque la línea de corte es la
 * propia tira, que se mueve si algo arriba cambia de alto.
 */
export function useLetraActiva(letras: string[], tira: RefObject<HTMLElement | null>, activo: boolean): string | null {
  const [activa, setActiva] = useState<string | null>(null);
  useEffect(() => {
    let cuadro = 0;
    // La medición (y su setState) siempre corre en el siguiente cuadro, nunca de golpe en el cuerpo del efecto.
    const calcular = () => {
      cuadro = 0;
      if (!activo || letras.length === 0) {
        setActiva((anterior) => (anterior === null ? anterior : null));
        return;
      }
      // Un píxel de margen: el salto deja el separador en la línea, pero con fracciones de píxel (100.09 contra 100)
      // la comparación exacta lo dejaba fuera e iluminaba la letra anterior.
      const linea = (tira.current?.getBoundingClientRect().bottom ?? 0) + 1;
      let actual: string | null = null;
      for (const l of letras) {
        const el = document.getElementById(idGrupo(l));
        if (el && el.getBoundingClientRect().top <= linea) actual = l;
        else break; // los separadores van en el orden de la lista: si uno no ha llegado, los siguientes tampoco
      }
      setActiva((anterior) => (anterior === actual ? anterior : actual));
    };
    const alDesplazar = () => {
      if (cuadro) return;
      cuadro = requestAnimationFrame(calcular);
    };
    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", alDesplazar);
    return () => {
      if (cuadro) cancelAnimationFrame(cuadro);
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", alDesplazar);
    };
  }, [letras, tira, activo]);
  return activa;
}

/**
 * Tira horizontal de acceso directo por letra (corrección del founder, 2026-09-19: «no es un filtro, es un anchor
 * point»). Solo lista las letras que tienen elementos, en el orden real de la lista; tocar una lleva a su separador,
 * sin apagar ni encender nada más (no es un filtro: `aria-current`, no `aria-pressed`). Se pega bajo lo que
 * ui/Cabecera deja a la vista, pero arriba del todo no se ve: aparece cuando se entra en la zona de la primera letra,
 * es decir, cuando `useLetraActiva` ya ilumina una, y se va al volver a subir (founder: «que no se muestre si no hasta
 * que el usuario ya llegó a la primera letra»). Solo las letras, sin círculo ni borde; la iluminada, en el color de
 * acción. Si no cabe entera, se desliza de lado para que esa letra quede a la vista, sin mover la página en vertical.
 * Se va con la búsqueda o con Cercanos.
 */
export default function TiraLetras({ ref, letras, activa, alTocar }: { ref: RefObject<HTMLDivElement | null>; letras: string[]; activa: string | null; alTocar: (letra: string) => void }) {
  if (letras.length === 0) return null;
  return (
    <div ref={ref} role="group" aria-label="Ir a una letra" className={`${styles.tira} ${activa ? styles.visible : ""}`}>
      {letras.map((l) => (
        <BotonLetra key={l} letra={l} activa={l === activa} onClick={() => alTocar(l)} />
      ))}
    </div>
  );
}

function BotonLetra({ letra, activa, onClick }: { letra: string; activa: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Si la letra iluminada queda fuera de lo visible, la tira se desliza sola hasta ella (sin mover la vertical).
    if (activa) ref.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activa]);
  return (
    <button ref={ref} type="button" className={styles.letra} onClick={onClick} aria-current={activa ? "true" : undefined} aria-label={letra === "#" ? "Ir a números y símbolos" : `Ir a la letra ${letra}`}>
      {letra}
    </button>
  );
}
