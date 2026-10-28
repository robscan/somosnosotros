"use client";

import { useEffect } from "react";
import { origenDeConsulta } from "@/lib/vistas";

/**
 * Cuenta una vista de la ficha (OL-459) sin que la página espere: después de pintarla, un aviso a `/api/vista` del que no se
 * espera nada. No pinta nada. Un navegador manejado por un programa (`navigator.webdriver`) no cuenta. La ficha solo lo pone
 * para quien no gestiona el evento, si se ve y no ha pasado; la base vuelve a comprobarlo todo.
 * OL-461: si se llegó por un enlace de la marca en Instagram o Facebook (`?utm_source=…&utm_medium=…`), manda también la red y el medio.
 */
export default function ContarVista({ evento }: { evento: string }) {
  useEffect(() => {
    if (navigator.webdriver) return;
    const { origen, medio } = origenDeConsulta(window.location.search);
    const cuerpo = origen ? { evento, origen, ...(medio ? { medio } : {}) } : { evento };
    fetch("/api/vista", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo), keepalive: true }).catch(() => {});
  }, [evento]);
  return null;
}
