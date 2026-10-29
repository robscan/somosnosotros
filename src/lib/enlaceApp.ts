/**
 * Las direcciones que la app de la tienda recibe «desde fuera» (OL-474): «Abrir» del letrero de Apple en Safari entrega su `app-argument`
 * por `openURL` (no como enlace universal), y el envoltorio (`apps/ios/ios/App/App/SceneDelegate.swift`) solo carga en el WKWebView los
 * enlaces universales. `@capacitor/app`, que ya va en la app, avisa de las dos cosas con el evento `appUrlOpen`; la web lo escucha
 * (`components/AbrirEnlaceApp`) y navega a la ruta. Así «Abrir» lleva a la ficha y no a Inicio, sin compilación nueva.
 *
 * Solo direcciones https de nuestros dominios; cualquier otra se ignora. Las rutas que `apple-app-site-association` deja en el navegador
 * (entrar, la API, la baja de avisos y el `.ics` del calendario) también: no son pantallas que el router pueda abrir.
 */

/** Los dominios del sitio: el de la app y el que va en los carteles (los dos con y sin www; los demás redirigen 308 a somosnosotros.org). */
const DOMINIOS = new Set(["somosnosotros.org", "www.somosnosotros.org", "somosnosotrxs.org", "www.somosnosotrxs.org"]);

/** Igual que las exclusiones de `src/app/.well-known/apple-app-site-association/route.ts`. */
const FUERA = [/^\/auth(\/|$)/, /^\/api(\/|$)/, /^\/avisos\/baja/, /^\/eventos\/[^/]+\/calendario/];

/** La ruta (con consulta y ancla) a la que navegar dentro de la app para una dirección recibida, o `null` si no es nuestra. */
export function rutaDeEnlaceApp(direccion: unknown): string | null {
  if (typeof direccion !== "string") return null;
  let url: URL;
  try {
    url = new URL(direccion);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!DOMINIOS.has(url.hostname.toLowerCase())) return null;
  if (FUERA.some((r) => r.test(url.pathname))) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
