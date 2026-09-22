"use client";

import { Analytics } from "@vercel/analytics/next";
import { limpiarUrlAnalitica } from "@/lib/limpiarUrlAnalitica";

/**
 * Componente cliente que configura Vercel Analytics con limpieza de URLs.
 * Se coloca en el layout para rastrear solo vistas de página públicas,
 * sin cookies ni identificación personal (OL-111, 2026-09-21).
 */
export default function AnalyticsVercel() {
  return (
    <Analytics
      beforeSend={(event) => {
        const urlLimpia = limpiarUrlAnalitica(event.url);
        if (urlLimpia === null) {
          return null; // No enviar esta vista
        }
        return { ...event, url: urlLimpia };
      }}
    />
  );
}
