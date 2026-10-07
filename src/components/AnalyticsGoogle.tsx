"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { idGoogleValido, iniciarGoogle, vistaGoogle } from "@/lib/analyticsGoogle";
import { sinMedirEnPantalla } from "@/lib/medir";

/** Corre `hacer` cuando la página terminó de llegar (con ella, la marca de admin del layout, que llega en streaming). */
function alCargar(hacer: () => void): () => void {
  if (document.readyState === "complete") {
    hacer();
    return () => {};
  }
  window.addEventListener("load", hacer, { once: true });
  return () => window.removeEventListener("load", hacer);
}

/**
 * Google Analytics 4 (OL-325): solo con `NEXT_PUBLIC_GA_ID` y en producción; sin eso no se monta nada y Vercel sigue midiendo solo.
 * Carga `gtag.js` directo (sin Tag Manager), con el consentimiento denegado desde el primer momento, sin cookies (`src/lib/analyticsGoogle.ts`).
 * Las vistas de página van a mano, con la ruta limpia, al cambiar de ruta (filtrar no cambia la ruta: no es una vista nueva). Para la
 * administración no se prepara ni se manda nada.
 */
export default function AnalyticsGoogle({ id, produccion }: { id: string | null | undefined; produccion: boolean }) {
  const activo = produccion && idGoogleValido(id);
  const ruta = usePathname();

  useEffect(() => {
    if (!produccion || !idGoogleValido(id)) return;
    return alCargar(() => {
      if (sinMedirEnPantalla()) return;
      iniciarGoogle(window, id);
      vistaGoogle(window);
    });
  }, [produccion, id, ruta]);

  if (!activo) return null;
  return <Script id="google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />;
}
