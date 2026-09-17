"use client";

import { useEffect } from "react";
import { plataformaActual } from "@/lib/pushCliente";
import { tituloInstalada } from "@/lib/plataforma";

/**
 * Abierta desde el icono del inicio, quita " · Somos Nosotros" del título de cada pantalla: esa marca ya la pone la
 * ventana instalada, y repetirla se veía doble en las ventanas del sistema (founder, 2026-09-17, OL-059). En una
 * pestaña normal del navegador no toca nada — ahí la marca sí ayuda (pestaña, resultado de Google).
 *
 * No basta con corregir una vez por ruta: React vuelve a escribir el título completo poco después (reproducido con
 * `next build` + `next start`, gestión de cambios) — al hidratar (la corrección de este componente y la del título
 * de React se cruzan, y React gana 2 ms más tarde) y en cambios que no tocan la ruta (`router.refresh()`,
 * `router.replace()` con un filtro en la URL). Por eso, en vez de un efecto atado a la ruta, se vigila el `<head>`
 * mientras la app esté montada y se corrige cada vez que algo vuelve a escribir el título. Nunca se escribe un
 * título vacío: dejar `document.title = ""` un instante crea un `<title>` suelto que React ya no controla, y las
 * correcciones siguientes dejan de servir.
 */
export default function TituloInstalada() {
  useEffect(() => {
    if (!plataformaActual().instalada) return;
    const corregir = () => {
      const l = document.title;
      const t = tituloInstalada(l);
      if (t && l !== t) document.title = t;
    };
    corregir();
    const observador = new MutationObserver(corregir);
    observador.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observador.disconnect();
  }, []);
  return null;
}
