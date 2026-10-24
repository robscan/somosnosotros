"use client";

import { useEffect } from "react";

/**
 * Cuenta una vista de la ficha (OL-459) sin que la página espere: después de pintarla, un aviso a `/api/vista` del que no se
 * espera nada. No pinta nada. Un navegador manejado por un programa (`navigator.webdriver`) no cuenta. La ficha solo lo pone
 * para quien no gestiona el evento, si se ve y no ha pasado; la base vuelve a comprobarlo todo.
 */
export default function ContarVista({ evento }: { evento: string }) {
  useEffect(() => {
    if (navigator.webdriver) return;
    fetch("/api/vista", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento }), keepalive: true }).catch(() => {});
  }, [evento]);
  return null;
}
