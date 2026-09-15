"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const CLAVE_NAVEGADAS = "somosnosotros:navegadas";

/**
 * Cuenta las pantallas vistas en esta pestaña (sessionStorage). Con eso "Atrás" sabe si hay una pantalla anterior
 * dentro de la app o si se llegó por un enlace compartido y debe ir a la pantalla madre. No pinta nada.
 */
export default function Navegacion() {
  const ruta = usePathname();
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_NAVEGADAS, String(Number(sessionStorage.getItem(CLAVE_NAVEGADAS) ?? "0") + 1));
    } catch {}
  }, [ruta]);
  return null;
}
