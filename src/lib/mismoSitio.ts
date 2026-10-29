/**
 * OL-485 (bitácora 517): ¿la petición la hizo una página de este mismo sitio? Lo dice el navegador en `Sec-Fetch-Site`, una cabecera que la
 * página no puede cambiar. Safari (desde iOS 16.4), Chrome, Firefox, la app del iPhone (WKWebView, iOS 17.4 o más) y la de Android (Chrome)
 * la mandan en cada `fetch`. Solo vale `same-origin`: estas rutas las llama la propia página con `fetch`, nunca se abren escribiendo la
 * dirección (eso sería `none`), así que sin la cabecera, o con otro valor, la petición no cuenta (403). Un programa puede escribirla a mano:
 * por eso, además, la base pone tope por hora a lo que cuenta (`contadores_hora`).
 */
export function vieneDelSitio(request: Request): boolean {
  return request.headers.get("sec-fetch-site") === "same-origin";
}
