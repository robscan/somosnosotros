"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { plataformaActual } from "@/lib/pushCliente";
import { tituloInstalada } from "@/lib/plataforma";

/**
 * Abierta desde el icono del inicio, quita " · Somos Nosotros" del título de cada pantalla: esa marca ya la pone la
 * ventana instalada, y repetirla se veía doble en las ventanas del sistema (founder, 2026-09-17, OL-059). En una
 * pestaña normal del navegador no toca nada — ahí la marca sí ayuda (pestaña, resultado de Google). Corre tras cada
 * cambio de ruta porque Next vuelve a poner su título completo en cada pantalla nueva.
 */
export default function TituloInstalada() {
  const ruta = usePathname();
  useEffect(() => {
    if (!plataformaActual().instalada) return;
    document.title = tituloInstalada(document.title);
  }, [ruta]);
  return null;
}
