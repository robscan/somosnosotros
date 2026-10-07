"use client";

import { useEffect } from "react";
import { EVENTO_INSTALAR } from "@/lib/avisoInstalar";
import { medirCliente } from "@/lib/medir";

/**
 * Mide `app_instalada` (OL-325) cuando el navegador avisa que la app quedó instalada (`appinstalled`: Chrome, Edge y Android; Safari
 * de iPhone no lo da). El aviso lo recoge el guion del layout (`GUION_AVISO_INSTALAR`), que pone `__appInstalada` y avisa con
 * `EVENTO_INSTALAR`; aquí solo se escucha. Una vez por carga. No pinta nada.
 */
export default function MedirInstalacion() {
  useEffect(() => {
    let medida = false;
    const alAvisar = () => {
      if (medida || !(window as unknown as { __appInstalada?: boolean }).__appInstalada) return;
      medida = true;
      medirCliente("app_instalada");
    };
    alAvisar();
    window.addEventListener(EVENTO_INSTALAR, alAvisar);
    return () => window.removeEventListener(EVENTO_INSTALAR, alAvisar);
  }, []);
  return null;
}
