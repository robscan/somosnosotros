"use client";

import type { BeforeSendMiddleware } from "@vercel/speed-insights";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { limpiarUrlAnalitica, limpiarUrlEvento } from "@/lib/limpiarUrlAnalitica";
import { sinMedirEnPantalla } from "@/lib/medir";

/** Lo que Speed Insights le pasa a `beforeSend`: una medición de velocidad (`vital`), la página y su ruta. */
export type MedicionVelocidad = Parameters<BeforeSendMiddleware>[0];

/** Los tramos de una ruta, decodificada (una barra codificada, `%2f`, también corta), sin vacíos. */
function tramosDe(pathname: string): string[] {
  try {
    return decodeURIComponent(pathname).split("/").filter(Boolean);
  } catch {
    // un «%» suelto: se mira tal cual, cortando también en la barra codificada
    return pathname.split(/\/|%2f/i).filter(Boolean);
  }
}

/**
 * Lo que se le deja mandar a Speed Insights (cuánto tarda cada pantalla en los teléfonos reales; OL-499), o null para no mandar nada.
 * Sin cookies ni identificación: solo la página y su ruta, ya reducidas. La `route` que calcula la librería se sustituye por la nuestra:
 * con un slug con acentos no reconoce el parámetro y mandaría la ruta tal cual, con el slug.
 * - Administración (`/admin…`): SÍ se mide, también cuando mira la administración (es el motivo de la pieza: cuánto tarda en el iPhone
 *   del founder), con solo sus dos primeros tramos (`/admin`, `/admin/instagram`), sin ids ni consulta. Las vistas y acciones de
 *   Analytics siguen sin medirse para la administración (`AnalyticsVercel`, OL-325).
 * - El resto, como Analytics: nada mientras el rol no se sepa o si mira la administración (`sinMedirEnPantalla`); la página con
 *   `limpiarUrlAnalitica` (lista blanca; la ficha en su sección, `/lugares/<slug>` → `/lugares`, con la ruta `/lugares/[ficha]`) y, en
 *   una ruta privada (Perfil, Entrar…), solo su primer tramo: interesa cuánto tarda esa pantalla, no quién la abre.
 */
export function antesDeEnviarVelocidad(medicion: MedicionVelocidad): MedicionVelocidad | null {
  let origen: string;
  let tramos: string[];
  try {
    const u = medicion.url.startsWith("/") ? new URL(medicion.url, "https://somosnosotros.org") : new URL(medicion.url);
    origen = u.origin;
    tramos = tramosDe(u.pathname);
  } catch {
    return null; // una URL rara: no se manda
  }

  if (tramos[0]?.toLowerCase() === "admin") {
    const ruta = "/" + ["admin", ...tramos.slice(1, 2)].map(encodeURIComponent).join("/");
    return { ...medicion, url: origen + ruta, route: ruta };
  }

  if (sinMedirEnPantalla()) return null;

  const limpia = limpiarUrlAnalitica(medicion.url);
  // Ruta privada (null): solo su primer tramo, la misma regla que las acciones de Analytics.
  const url = limpia ?? limpiarUrlEvento(medicion.url);
  let ruta = new URL(url).pathname;
  // La ficha quedó en su sección: su ruta lo dice, para no mezclarla con el listado (`/lugares` y `/lugares/[ficha]`).
  if (limpia !== null && tramos.length > tramosDe(ruta).length) ruta += "/[ficha]";
  return { ...medicion, url, route: ruta };
}

/**
 * Speed Insights de Vercel (OL-499): cuánto tarda cada pantalla en cargar en los teléfonos de la gente, anónimo y sin cookies. Va en el
 * layout para toda la gente, fuera de `MarcaAdmin`: también mide Administración. Sin la medición activada en el proyecto de Vercel, el
 * guion no existe y no se manda nada.
 */
export default function VelocidadVercel() {
  return <SpeedInsights beforeSend={antesDeEnviarVelocidad} />;
}
