"use client";

import { useEffect } from "react";
import { plataformaActual } from "@/lib/pushCliente";
import { tituloInstalada } from "@/lib/plataforma";

/**
 * Abierta desde el icono del inicio, quita " · Somos Nosotros" del título de cada pantalla: esa marca ya la pone la
 * ventana instalada, y repetirla se veía doble en las ventanas del sistema (founder, 2026-09-17, OL-059). En una
 * pestaña normal del navegador no toca nada — ahí la marca sí ayuda (pestaña, resultado de Google).
 *
 * No basta con corregir una vez por ruta, ni con vigilar solo `<head>`: Next manda el `<title>` de `generateMetadata`
 * en streaming dentro de `<body>` (en un `<div hidden>`), y React lo adopta y le reescribe el texto completo al
 * hidratar — antes de que ese `<title>` llegue a `<head>`. Lo mismo pasa, ya en `<head>`, con cambios que no tocan
 * la ruta (`router.refresh()`, `router.replace()` con un filtro en la URL). Reproducido y el arreglo probado por
 * gestión de cambios con `next build` + `next start` (carga, recarga, refresh, replace, Link, atrás, con CPU y red
 * lentas). Por eso se vigila todo `<html>`, no solo `<head>`, mientras la app esté montada. Nunca se escribe un
 * título vacío (`if (!l) return`): dejar `document.title = ""` un instante crea un `<title>` suelto que React ya no
 * controla, y las correcciones siguientes dejan de servir.
 */
export default function TituloInstalada() {
  useEffect(() => {
    if (!plataformaActual().instalada) return;
    const corregir = () => {
      const l = document.title;
      if (!l) return;
      const t = tituloInstalada(l);
      if (l !== t) document.title = t;
    };
    corregir();
    const observador = new MutationObserver(corregir);
    observador.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    return () => observador.disconnect();
  }, []);
  return null;
}
