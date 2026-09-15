"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { claveDeUrl, guardarScroll, leerScroll } from "@/lib/memoriaPantalla";

/** Cuánto se espera a que llegue el contenido antes de dejar el scroll donde esté. */
const ESPERA_MAX_MS = 4000;
/** Cada cuánto se mira si la página ya tiene altura (temporizador, no cuadro: corre aunque la pestaña esté oculta). */
const PASO_MS = 50;
/** Tras reponer, durante este tiempo se corrige la deriva si el contenido cambia de alto (fotos, tipografía). */
const VIGILANCIA_MS = 600;

/** Pedida desde la barra inferior: la próxima ruta repone su scroll aunque no venga de Atrás. */
let vueltaPedida = false;
export function pedirVuelta() {
  vueltaPedida = true;
}

/**
 * Lleva la página a `y`. Si ya estaba ahí (por ejemplo, arriba), WebKit en modo app no vuelve a sincronizar su vista con
 * el documento y la cabecera pegajosa queda mal pintada: un salto de 1 px y vuelta un instante después la recoloca.
 */
function reponer(y: number, alTerminar: () => void) {
  const sinMovimiento = Math.round(window.scrollY) === y;
  window.scrollTo({ top: y, behavior: "instant" });
  if (!sinMovimiento) {
    alTerminar();
    return;
  }
  window.scrollTo({ top: y + 1, behavior: "instant" });
  window.setTimeout(() => {
    window.scrollTo({ top: y, behavior: "instant" });
    alTerminar();
  }, 80);
}

/**
 * El scroll de cada pantalla lo repone la app, no el navegador (pedido del founder, 2026-09-15).
 * Por qué: en el iPhone con la app instalada, WebKit reponía el scroll por su cuenta mientras la página todavía era
 * la pantalla de carga (corta); al llegar el contenido, su vista quedaba desincronizada y la cabecera pegajosa se
 * pintaba como un bloque blanco (bitácora 043). Con `scrollRestoration = "manual"` el navegador no toca nada y
 * este componente, único para toda la app, guarda el scroll por URL (sessionStorage) y lo repone al volver
 * (Atrás, gesto, recarga o la barra inferior) en cuanto la página tiene altura para ello. No pinta nada.
 */
export default function MemoriaScroll() {
  const ruta = usePathname();
  /** Hay una vuelta en marcha: al cambiar la ruta se repone el scroll de esa URL y, mientras, no se guarda nada. */
  const pendiente = useRef(false);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    const tipo = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
    if (tipo === "reload" || tipo === "back_forward") pendiente.current = true;
    function alVolver() {
      pendiente.current = true;
    }
    // El scroll se guarda al vuelo, como mucho cada 100 ms, para la URL que sigue en pantalla.
    let temporizador = 0;
    function alDesplazar() {
      if (temporizador) return;
      temporizador = window.setTimeout(() => {
        temporizador = 0;
        if (pendiente.current) return;
        guardarScroll(claveDeUrl(window.location), window.scrollY);
      }, 100);
    }
    window.addEventListener("popstate", alVolver);
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      window.removeEventListener("popstate", alVolver);
      window.removeEventListener("scroll", alDesplazar);
      if (temporizador) window.clearTimeout(temporizador);
    };
  }, []);

  // Al llegar a una ruta viniendo de atrás (o de la barra inferior): esperar a que la página tenga altura y reponer.
  useEffect(() => {
    if (vueltaPedida) {
      vueltaPedida = false;
      pendiente.current = true;
    }
    if (!pendiente.current) return;
    const objetivo = leerScroll(claveDeUrl(window.location)) ?? 0;
    const inicio = performance.now();
    let temporizador = 0;
    const intentar = () => {
      const cargando = document.querySelector('[aria-busy="true"]');
      const alcanza = document.documentElement.scrollHeight - window.innerHeight >= objetivo;
      if ((!cargando && alcanza) || performance.now() - inicio > ESPERA_MAX_MS) {
        reponer(objetivo, () => {
          // Si el contenido cambia de alto justo después (fotos, tipografía), la posición se vuelve a poner.
          const fin = performance.now() + VIGILANCIA_MS;
          const vigilar = () => {
            if (Math.abs(window.scrollY - objetivo) > 1 && document.documentElement.scrollHeight - window.innerHeight >= objetivo) window.scrollTo({ top: objetivo, behavior: "instant" });
            if (performance.now() < fin) temporizador = window.setTimeout(vigilar, PASO_MS);
            else pendiente.current = false;
          };
          vigilar();
        });
        return;
      }
      temporizador = window.setTimeout(intentar, PASO_MS);
    };
    intentar();
    return () => {
      if (temporizador) window.clearTimeout(temporizador);
    };
  }, [ruta]);

  return null;
}
