import "server-only";
import { idGoogleValido } from "@/lib/analyticsGoogle";

/**
 * Las acciones medidas, a Google Analytics desde el servidor con el Measurement Protocol de GA4 (OL-325, camino 1 del gestor con el
 * founder, 2026-10-07). Por qué: con el consentimiento denegado, Google toma los envíos del navegador (`gtag`) como datos para su
 * modelado y, con el tráfico de hoy, los informes pueden quedar vacíos; desde el servidor llegan completos.
 *
 * Sin identificar a nadie: un `client_id` aleatorio en CADA envío (nunca se repite ni se guarda), sin `user_id`, sin cookies, sin
 * IP ni navegador de la persona (la petición sale del servidor), `non_personalized_ads: true` y solo el nombre y los datos de la lista
 * cerrada (`src/lib/medir.ts`), ya validados por quien llama. Solo en producción y con las dos variables: `NEXT_PUBLIC_GA_ID` y
 * `GA_API_SECRET` (secreto: solo en Vercel). Sin el secreto no se manda nada y no se rompe nada.
 */

export const URL_MP = "https://www.google-analytics.com/mp/collect";
/** Lo más que se espera a Google: el envío va después de la respuesta, pero no debe quedarse colgado. */
export const ESPERA_MS = 1500;

/** El cuerpo del envío: un evento, sus datos tal cual y un `client_id` que no se repite. */
export function cuerpoGoogle(nombre: string, datos: Record<string, string>, clientId: string) {
  return { client_id: clientId, non_personalized_ads: true, events: [{ name: nombre, params: { ...datos } }] };
}

/** Un `client_id` nuevo en cada envío: aleatorio, con la forma que usa GA («número.número»), nunca ligado a una persona. */
export function clientIdAleatorio(): string {
  const azar = new Uint32Array(2);
  crypto.getRandomValues(azar);
  return `${azar[0]}.${azar[1]}`;
}

/** La dirección del envío, o null si falta algo (fuera de producción, sin identificador válido o sin secreto). */
export function urlGoogle(env: Record<string, string | undefined> = process.env): string | null {
  const id = env.NEXT_PUBLIC_GA_ID?.trim();
  const secreto = env.GA_API_SECRET?.trim();
  if (env.VERCEL_ENV !== "production" || !idGoogleValido(id) || !secreto) return null;
  return `${URL_MP}?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(secreto)}`;
}

/**
 * Manda un evento ya validado. Devuelve si se mandó (para las pruebas); nunca lanza: un fallo de red, un error de Google o el tiempo
 * de espera se tragan en silencio. Quien llama lo pone en `after` para no retrasar la respuesta.
 */
export async function enviarAGoogle(nombre: string, datos: Record<string, string>): Promise<boolean> {
  try {
    const url = urlGoogle();
    if (!url) return false;
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpoGoogle(nombre, datos, clientIdAleatorio())),
      signal: AbortSignal.timeout(ESPERA_MS),
      cache: "no-store",
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}
