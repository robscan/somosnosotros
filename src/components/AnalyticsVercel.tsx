"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { limpiarUrlAnalitica, limpiarUrlEvento } from "@/lib/limpiarUrlAnalitica";
import { sinMedirEnPantalla } from "@/lib/medir";

/**
 * Lo que se le deja mandar a Vercel, ya limpio, o null para no mandar nada:
 * - Nada si mira la administración o si el rol aún no se sabe (la marca de `MarcaAdmin`; OL-325, hallazgo F10 de OL-327: el aviso
 *   dice «A la administración no se le mide» y las vistas de OL-111 sí la contaban). Igual que Google. Además, el layout monta este
 *   componente dentro de `MarcaAdmin`: solo existe cuando el rol se resolvió y no es admin, así que la primera vista sale entonces.
 * - Las acciones (`medirCliente`) llevan la página limpia y, en una ruta privada (Entrar, Perfil…), solo su primer tramo.
 * - Las vistas, con la limpieza de `limpiarUrlAnalitica` —la MISMA que usa Google (OL-334, F13 de OL-327): parámetros de la lista blanca con
 *   valor de su lista cerrada y la ruta de una ficha reducida a su sección, sin slug ni id (`/lugares/<slug>` → `/lugares`, OL-340)—; las
 *   rutas privadas no se mandan.
 */
export function antesDeEnviarAVercel(event: BeforeSendEvent): BeforeSendEvent | null {
  if (sinMedirEnPantalla()) return null;
  if (event.type === "event") return { ...event, url: limpiarUrlEvento(event.url) };
  const urlLimpia = limpiarUrlAnalitica(event.url);
  if (urlLimpia === null) return null; // No enviar esta vista
  return { ...event, url: urlLimpia };
}

/**
 * Componente cliente que configura Vercel Analytics con limpieza de URLs.
 * Se coloca en el layout para rastrear solo vistas de página públicas,
 * sin cookies ni identificación personal (OL-111, 2026-09-21), y las acciones medidas (OL-325).
 */
export default function AnalyticsVercel() {
  return <Analytics beforeSend={antesDeEnviarAVercel} />;
}
