"use client";

import { useEffect } from "react";

/** Registra el service worker (necesario para los avisos push). Silencioso; nada visible. */
export default function RegistroSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
