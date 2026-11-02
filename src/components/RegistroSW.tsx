"use client";

import { useEffect } from "react";
import { esAppNativa } from "@/lib/appNativa";

/**
 * Registra el service worker: los avisos push de la web y el respaldo cuando una pantalla no carga (OL-501, `public/sw.js`). Silencioso;
 * nada visible. Dentro de la app de la tienda (`SomosNosotrosApp`) no se registra: su WKWebView no lo corre, sus avisos van por APNs y su
 * respaldo es nativo (pieza aparte).
 */
export default function RegistroSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || esAppNativa(navigator.userAgent)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
