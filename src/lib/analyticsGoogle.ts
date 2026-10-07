import { limpiarUrlGoogle } from "@/lib/limpiarUrlAnalitica";
import { contextoGoogle, sinMedirEnPantalla } from "@/lib/medir";

/**
 * Google Analytics 4 sin cookies ni identificación (OL-325). Solo `gtag.js`, sin Tag Manager: nada que editar fuera del repo.
 *
 * - **Consent Mode v2, todo denegado por omisión y nunca se concede**: `analytics_storage`, `ad_storage`, `ad_user_data` y
 *   `ad_personalization` (y los tres de almacenamiento restantes) en `denied`. Con eso `gtag.js` no lee ni escribe cookies (`_ga`,
 *   `_gid`, `_gcl_*`) y manda los envíos sin identificador persistente. No hay banner: no pedimos consentimiento porque no guardamos
 *   nada en el teléfono.
 * - Sin señales de Google ni personalización de anuncios; los identificadores de clic de anuncios se borran de lo que se manda.
 * - Sin vista automática (`send_page_view: false`): la manda `vistaGoogle` con la misma limpieza que Vercel.
 * - La IP: GA4 no la guarda (ya no hace falta `anonymize_ip`, que GA4 ignora).
 */

/** El identificador de medición de Google: `G-` y letras o números. Cualquier otra cosa no se carga (y nunca se inyecta a un guion). */
export function idGoogleValido(id: string | null | undefined): id is string {
  return typeof id === "string" && /^G-[A-Z0-9]{4,20}$/.test(id);
}

type Ventana = { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; __googleIniciado?: boolean; location: { href: string } };

/** Lo que se ordena a `gtag.js`, en este orden: el consentimiento denegado SIEMPRE antes que la configuración. */
export const CONSENTIMIENTO_DENEGADO = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "denied",
} as const;

export function configuracionGoogle() {
  return { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false } as const;
}

/**
 * Prepara `gtag` en la ventana (una sola vez): la cola `dataLayer`, el consentimiento denegado, la configuración y la ubicación ya
 * limpia. `gtag.js` lee la cola al cargar, en orden; si cargó antes, la atiende igual en orden. Nunca lanza.
 */
export function iniciarGoogle(ventana: Ventana, id: string): boolean {
  try {
    if (!idGoogleValido(id) || ventana.__googleIniciado) return false;
    ventana.dataLayer = ventana.dataLayer ?? [];
    const cola = ventana.dataLayer;
    // `gtag.js` espera el objeto `arguments`, no un arreglo: por eso la función clásica.
    ventana.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      cola.push(arguments);
    };
    ventana.gtag("consent", "default", CONSENTIMIENTO_DENEGADO);
    ventana.gtag("set", "ads_data_redaction", true);
    ventana.gtag("set", contextoGoogle(ventana.location.href));
    ventana.gtag("js", new Date());
    ventana.gtag("config", id, configuracionGoogle());
    ventana.__googleIniciado = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Una vista de página: la ubicación limpia pasa a ser la de todo lo que se mande desde aquí (incluso lo automático de `gtag.js`) y, si
 * la ruta se puede medir, va `page_view`. Las rutas privadas (la limpieza devuelve null) no mandan vista. Nunca para la administración
 * ni mientras el rol no se sepa.
 */
export function vistaGoogle(ventana: Ventana): boolean {
  try {
    if (sinMedirEnPantalla() || typeof ventana.gtag !== "function") return false;
    const href = ventana.location.href;
    const contexto = contextoGoogle(href);
    ventana.gtag("set", contexto);
    if (limpiarUrlGoogle(href) === null) return false;
    ventana.gtag("event", "page_view", contexto);
    return true;
  } catch {
    return false;
  }
}
