"use client";

import { Analytics } from "@vercel/analytics/next";
import { limpiarUrlAnalitica, limpiarUrlEvento } from "@/lib/limpiarUrlAnalitica";

/**
 * Componente cliente que configura Vercel Analytics con limpieza de URLs.
 * Se coloca en el layout para rastrear solo vistas de página públicas,
 * sin cookies ni identificación personal (OL-111, 2026-09-21).
 * Las acciones medidas (OL-325, `medirCliente`) también pasan por aquí: llevan la página limpia y, en una ruta privada (Entrar,
 * Perfil…), solo su primer tramo; la acción se mide igual, su dirección no.
 */
export default function AnalyticsVercel() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (event.type === "event") return { ...event, url: limpiarUrlEvento(event.url) };
        const urlLimpia = limpiarUrlAnalitica(event.url);
        if (urlLimpia === null) {
          return null; // No enviar esta vista
        }
        return { ...event, url: urlLimpia };
      }}
    />
  );
}
