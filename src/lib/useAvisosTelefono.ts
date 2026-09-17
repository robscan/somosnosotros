"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { EVENTO_INSTALAR } from "./avisoInstalar";
import type { Plataforma } from "./plataforma";
import { estadoPush, plataformaActual, type EstadoPush } from "./pushCliente";

function sinSuscripcion() {
  return () => {};
}

/** Qué teléfono es (null en el servidor: ahí no se sabe). */
export function usePlataforma(): Plataforma | null {
  return useSyncExternalStore(sinSuscripcion, plataformaActual, () => null);
}

/**
 * El estado de los avisos en ESTE teléfono (decisión 5 de docs/rediseno/17: cada teléfono dice su verdad, no la marca
 * de la cuenta). null mientras se revisa.
 */
export function useEstadoPush(llavePublica: string, activo = true): [EstadoPush | null, (e: EstadoPush) => void] {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    estadoPush(llavePublica)
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado("no-soportado"));
    return () => {
      vivo = false;
    };
  }, [llavePublica, activo]);
  return [estado, setEstado];
}

/** El aviso de Chrome, Edge o Android de que la página se puede instalar (lo guarda el guion de src/lib/avisoInstalar.ts). */
type AvisoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window {
    __avisoInstalar?: AvisoInstalar | null;
    __appInstalada?: boolean;
  }
}
function suscribirInstalar(avisar: () => void) {
  window.addEventListener(EVENTO_INSTALAR, avisar);
  return () => window.removeEventListener(EVENTO_INSTALAR, avisar);
}
function puedeInstalar() {
  return !!window.__avisoInstalar && !window.__appInstalada;
}

/**
 * Instalar en un toque donde el navegador lo permite (decisión 7): abre el diálogo del propio navegador. `puede` es
 * falso en el servidor, en iPhone (Safari no avisa) y cuando ya se instaló.
 */
export function useInstalarApp(): { puede: boolean; instalar: () => Promise<boolean> } {
  const puede = useSyncExternalStore(suscribirInstalar, puedeInstalar, () => false);
  async function instalar(): Promise<boolean> {
    const aviso = window.__avisoInstalar;
    if (!aviso) return false;
    await aviso.prompt();
    const { outcome } = await aviso.userChoice;
    // Un aviso sirve una sola vez; si instaló, ya no se ofrece.
    window.__avisoInstalar = null;
    if (outcome === "accepted") window.__appInstalada = true;
    window.dispatchEvent(new Event(EVENTO_INSTALAR));
    return outcome === "accepted";
  }
  return { puede, instalar };
}
