"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { CARRIL, vistaDeRuta } from "@/lib/armazon";
import styles from "./Armazon.module.css";

/** Del prototipo firmado: se recoge tras bajar más que esto, y solo si el dedo sigue bajando; vuelve al subir un poco. */
const BAJADO_MIN = 120;
const CERCA_ARRIBA = 60;
const PASO = 6;
/** Tras cada cambio no se reacciona a otro: sin parpadeo cuando el dedo duda. */
const CALMA_MS = 300;
const RECOGER = "armazon:recoger";
const HOJA = "armazon:hoja";

/**
 * Antes de llevar la pantalla a un punto (la tira de letras): la barra se recoge al momento y sin animar, así quien
 * mide lo que queda pegado arriba lee su alto final, y el propio salto no la vuelve a mostrar. Con el carril no hay nada que
 * recoger.
 */
export function recogerBarra() {
  window.dispatchEvent(new Event(RECOGER));
}

/**
 * Lo que la hoja de Lugares le cuenta al armazón: que ya no cubre la ventana o que la cubre y, entonces, si es una página (la ficha),
 * cuánto lleva desplazada desde que la llenó (`y`) y si llegó al final (`alFinal`).
 */
type AvisoHoja = { llena: false } | { llena: true; pagina: boolean; y: number; alFinal: boolean };

/**
 * La hoja de Lugares le cuenta al armazón cómo va. Mientras cubre la ventana la navegación se va. Si es una página (la ficha) se va
 * también la barra; si es la lista, que vive bajo sus filtros, su desplazamiento hace lo que el de la página en cualquier raíz: la
 * barra se recoge al bajar y vuelve al subir, y la fila de contexto con ella. Al dejar de llenarla todo vuelve, con la misma animación.
 */
export function avisarHoja(aviso: AvisoHoja) {
  window.dispatchEvent(new CustomEvent(HOJA, { detail: aviso }));
}

/**
 * El armazón de la app (docs/rediseno/50, P4 y P7): la barra de la app, la pantalla y la navegación en una sola rejilla que
 * no sabe qué hay dentro. Pone `data-vista` según la ruta (`lib/armazon.ts`) y el CSS solo lee ese atributo. En el
 * teléfono, en las raíces, la barra y la navegación se recogen al bajar y vuelven al subir: eso es `data-recogida`, que
 * cambia aquí sin volver a pintar nada; desde 792 (el carril) nada se recoge y el atributo no se pone. La hoja de Lugares, cuando cubre
 * la ventana, esconde además la navegación (`data-llena`) y le presta su desplazamiento a la barra (`avisarHoja`). `barra` y `nav`
 * llegan ya armadas del servidor (la sesión se lee allí).
 */
export default function Armazon({ barra, nav, children }: { barra: ReactNode; nav: ReactNode; children: ReactNode }) {
  const ruta = usePathname();
  const armazon = useRef<HTMLDivElement>(null);

  // Cada pantalla empieza con la barra y la navegación a la vista.
  useLayoutEffect(() => {
    armazon.current?.removeAttribute("data-recogida");
  }, [ruta]);

  useEffect(() => {
    const el = armazon.current!;
    const carril = window.matchMedia(CARRIL);
    let antes = window.scrollY;
    let calmaHasta = 0;
    const recoger = (si: boolean) => {
      if (si && carril.matches) return;
      el.toggleAttribute("data-recogida", si);
      calmaHasta = Date.now() + CALMA_MS;
    };
    /** Cuánto lleva desplazado lo que se desplaza (la página o la hoja llena) y si llegó al final: con eso la barra se recoge o vuelve. */
    const alDesplazar = (y: number, alFinal: boolean) => {
      const paso = y - antes;
      antes = y;
      if (el.dataset.vista !== "raiz" || Date.now() < calmaHasta) return;
      const recogida = el.hasAttribute("data-recogida");
      if (recogida && (y < CERCA_ARRIBA || paso < -PASO || alFinal)) recoger(false);
      else if (!recogida && paso > PASO && y > BAJADO_MIN && !alFinal) recoger(true);
    };
    const alDesplazarLaPagina = () => alDesplazar(window.scrollY, window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4);
    let sinAnimar = 0;
    const alSaltar = () => {
      el.style.setProperty("--duracion-recogida", "0s");
      recoger(true);
      window.clearTimeout(sinAnimar);
      sinAnimar = window.setTimeout(() => el.style.removeProperty("--duracion-recogida"), CALMA_MS);
    };
    const alAvisarLaHoja = (e: Event) => {
      const aviso = (e as CustomEvent<AvisoHoja>).detail;
      if (!aviso.llena) {
        el.removeAttribute("data-llena");
        recoger(false);
        return;
      }
      // Apenas la llena cuenta desde donde esté: lo anterior era de la página.
      if (!el.hasAttribute("data-llena")) antes = aviso.y;
      el.setAttribute("data-llena", "");
      if (aviso.pagina) recoger(true);
      else alDesplazar(aviso.y, aviso.alFinal);
    };
    const alCambiarAncho = () => recoger(false); // una ventana que crece hasta el carril: lo recogido vuelve
    window.addEventListener("scroll", alDesplazarLaPagina, { passive: true });
    window.addEventListener(RECOGER, alSaltar);
    window.addEventListener(HOJA, alAvisarLaHoja);
    carril.addEventListener("change", alCambiarAncho);
    return () => {
      window.clearTimeout(sinAnimar);
      carril.removeEventListener("change", alCambiarAncho);
      window.removeEventListener("scroll", alDesplazarLaPagina);
      window.removeEventListener(RECOGER, alSaltar);
      window.removeEventListener(HOJA, alAvisarLaHoja);
    };
  }, []);

  return (
    <div ref={armazon} className={styles.armazon} data-vista={vistaDeRuta(ruta)}>
      {barra}
      <div className={styles.pantalla}>{children}</div>
      {nav}
    </div>
  );
}
