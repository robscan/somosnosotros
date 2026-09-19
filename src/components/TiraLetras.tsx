"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { idGrupo } from "@/lib/indice";
import { Chips } from "./ui/Chip";
import chip from "./ui/Chip.module.css";

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
 * Mide lo que ya se pega arriba (pestañas, buscador y chips) y dónde debe quedar la tira: lo deja en `--tapa`, en la
 * raíz del documento (solo hay una lista con tira a la vez), así el CSS de la tira no necesita saber nada de layout.
 * Se remide con el tamaño de la ventana y cualquier cambio de tamaño en la página (un chip que aparece o desaparece
 * cambia el alto de lo que se pega).
 */
export function usePegajosos(tira: RefObject<HTMLElement | null>, activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const raiz = document.documentElement;
    const medir = () => {
      const t = tira.current;
      if (t) raiz.style.setProperty("--tapa", `${tapaAntesDe(t)}px`);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(document.body);
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
      raiz.style.removeProperty("--tapa");
    };
  }, [tira, activo]);
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
      const linea = tira.current?.getBoundingClientRect().bottom ?? 0;
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
 * sin apagar ni encender nada más (no es un filtro: `aria-current`, no `aria-pressed`). Se ilumina sola en la letra
 * en que vas (`useLetraActiva`) y, si no cabe entera, se desliza de lado para que esa letra quede a la vista, sin
 * mover la página en vertical. Se pega justo debajo de lo que ya se pega en la pantalla (founder: «dejar sticky
 * letras y tabs»), con los carriles arriba, sin quedarse fijos; se va con la búsqueda o con «Cerca de mí». El CSS
 * es el mismo de ui/Chip (ya cumple el mínimo de 44×44 px y no da doble toque ni zoom), sin su botón (que siempre
 * lleva `aria-pressed`, un estado de filtro que aquí no aplica).
 */
export default function TiraLetras({ letras, activa, alTocar }: { letras: string[]; activa: string | null; alTocar: (letra: string) => void }) {
  if (letras.length === 0) return null;
  return (
    <Chips ariaLabel="Ir a una letra">
      {letras.map((l) => (
        <BotonLetra key={l} letra={l} activa={l === activa} onClick={() => alTocar(l)} />
      ))}
    </Chips>
  );
}

/** El botón de una letra: el mismo dibujo que ui/Chip, pero sin `aria-pressed` (no hay un filtro que activar). */
function BotonLetra({ letra, activa, onClick }: { letra: string; activa: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Si la letra iluminada queda fuera de lo visible, la tira se desliza sola hasta ella (sin mover la vertical).
    if (activa) ref.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activa]);
  return (
    <button ref={ref} type="button" className={`${chip.chip} ${activa ? chip.activo : ""}`} onClick={onClick} aria-current={activa ? "true" : undefined} aria-label={letra === "#" ? "Ir a números y símbolos" : `Ir a la letra ${letra}`}>
      {letra}
    </button>
  );
}
