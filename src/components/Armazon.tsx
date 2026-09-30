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
const RECOGIDA = "armazon:recogida";

/**
 * Antes de llevar la pantalla a un punto (la tira de letras): la barra se recoge al momento y sin animar, así quien
 * mide lo que queda pegado arriba lee su alto final, y el propio salto no la vuelve a mostrar. Con el carril no hay nada que
 * recoger.
 */
export function recogerBarra() {
  window.dispatchEvent(new Event(RECOGER));
}

/**
 * Una pantalla que llena la ventana (la hoja de Lugares, cuando ya la cubre) pide que la barra y la navegación se vayan y,
 * cuando deja de llenarla, que vuelvan: con la misma animación que al bajar la página.
 */
export function pedirRecogida(si: boolean) {
  window.dispatchEvent(new CustomEvent(RECOGIDA, { detail: si }));
}

/**
 * El armazón de la app (docs/rediseno/50, P4 y P7): la barra de la app, la pantalla y la navegación en una sola rejilla que
 * no sabe qué hay dentro. Pone `data-vista` según la ruta (`lib/armazon.ts`) y el CSS solo lee ese atributo. En el
 * teléfono, en las raíces, la barra y la navegación se recogen al bajar y vuelven al subir: eso es `data-recogida`, que
 * cambia aquí sin volver a pintar nada; desde 792 (el carril) nada se recoge y el atributo no se pone. `barra` y `nav` llegan
 * ya armadas del servidor (la sesión se lee allí).
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
    const alDesplazar = () => {
      const y = window.scrollY;
      const paso = y - antes;
      antes = y;
      if (el.dataset.vista !== "raiz" || Date.now() < calmaHasta) return;
      const recogida = el.hasAttribute("data-recogida");
      const alFinal = y + window.innerHeight >= document.documentElement.scrollHeight - 4;
      if (recogida && (y < CERCA_ARRIBA || paso < -PASO || alFinal)) recoger(false);
      else if (!recogida && paso > PASO && y > BAJADO_MIN && !alFinal) recoger(true);
    };
    let sinAnimar = 0;
    const alSaltar = () => {
      el.style.setProperty("--duracion-recogida", "0s");
      recoger(true);
      window.clearTimeout(sinAnimar);
      sinAnimar = window.setTimeout(() => el.style.removeProperty("--duracion-recogida"), CALMA_MS);
    };
    const alPedirla = (e: Event) => recoger((e as CustomEvent<boolean>).detail);
    const alCambiarAncho = () => recoger(false); // una ventana que crece hasta el carril: lo recogido vuelve
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener(RECOGER, alSaltar);
    window.addEventListener(RECOGIDA, alPedirla);
    carril.addEventListener("change", alCambiarAncho);
    return () => {
      window.clearTimeout(sinAnimar);
      carril.removeEventListener("change", alCambiarAncho);
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener(RECOGER, alSaltar);
      window.removeEventListener(RECOGIDA, alPedirla);
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
