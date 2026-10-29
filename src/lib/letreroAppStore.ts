/**
 * El letrero de Apple arriba de Safari (Smart App Banner, OL-474): «Ver» si la persona no tiene la app de la tienda y «Abrir» si la tiene.
 * Lo dibuja Safari solo, con la etiqueta `<meta name="apple-itunes-app" content="app-id=…, app-argument=…">` en el `<head>` de cada página
 * (documentación de Apple, «Promoting Apps with Smart App Banners»). Solo Safari de iPhone y iPad lo muestra: Chrome, Firefox y Edge en iOS
 * no, ni la app instalada como web (PWA) ni la propia app de la tienda (su WKWebView). Apple no lo muestra dentro de un iframe ni en el
 * simulador de iPhone.
 *
 * `app-argument` es la dirección que la persona está viendo, en el dominio de producción: así «Abrir» lleva a la misma ficha (la app solo
 * carga somosnosotros.org, `apps/ios/capacitor.config.ts`). Va sin la consulta (`?…`): es la dirección canónica, sin rastreos de Instagram o
 * Google ni filtros de una lista.
 *
 * Constantes, nunca variables de entorno (la regla de `marca.ts`): la ficha de la tienda no cambia por entorno.
 */

/** El «Apple ID» de la ficha en App Store Connect (6812916453); no es secreto, sale en el enlace público de la tienda. */
export const APP_STORE_ID = "6812916453";

/** El dominio que carga la app de la tienda; las vistas previas de Vercel y el servidor local también mandan aquí. */
export const DOMINIO_APP = "https://somosnosotros.org";

/** Sin letrero: Administración, entrar (incluida la vuelta de Apple y Google) y la API (no son páginas; se nombra por si acaso). */
const SIN_LETRERO = ["/admin", "/auth", "/api"];

function excluida(ruta: string): boolean {
  return SIN_LETRERO.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`));
}

/**
 * El `content` de la etiqueta para una ruta (`usePathname()`), o `null` donde no va. La coma separa los parámetros de la etiqueta, así que
 * una coma dentro de la dirección va como `%2C` (los slugs no la traen; por si acaso).
 */
export function contenidoLetreroAppStore(ruta: string): string | null {
  const limpia = ruta.split(/[?#]/)[0] || "/";
  if (!limpia.startsWith("/") || limpia.startsWith("//")) return null;
  if (excluida(limpia)) return null;
  const url = new URL(limpia, DOMINIO_APP);
  if (url.origin !== DOMINIO_APP) return null;
  return `app-id=${APP_STORE_ID}, app-argument=${url.href.replace(/,/g, "%2C")}`;
}
