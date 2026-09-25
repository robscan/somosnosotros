import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Envoltorio de iPhone (OL-194, pieza 4 de docs/rediseno/47-app-ios.md). La app no trae su propia web: carga
 * siempre https://somosnosotros.org (server.url) dentro de un WKWebView. `webDir` solo sirve la página de
 * "Sin conexión" (www/index.html), que MainViewController.swift muestra a mano con un NWPathMonitor cuando de
 * verdad no hay red — a propósito NO se usa `server.errorPath` (la opción propia de Capacitor): esa la dispara
 * `didFailProvisionalNavigation` en cualquier navegación cancelada, incluida la que EntrarSistemaPlugin.swift
 * cancela a propósito para abrir Apple o Google en el navegador del sistema, y dejaba la app entera mostrando
 * "Sin conexión" con la red perfectamente encendida (visto en el simulador). En un arranque normal nunca se ve.
 *
 * `appendUserAgent` marca el navegador de la app para que la web (src/lib/entrarCon.ts) sepa que corre dentro
 * del contenedor y abra Apple/Google en una sesión del sistema en vez de dentro del WKWebView (sección 4 del plan:
 * Google bloquea su entrada dentro de cualquier webview embebido).
 *
 * `allowNavigation` deja navegar (documentos completos e iframes) solo a los dominios que la web usa hoy:
 * Supabase (Auth/Storage del proyecto, dominio *.supabase.co: revisar si el proyecto pasa a un dominio propio),
 * Mapbox (mapa y sus estilos, src/lib/config.ts) y los reproductores incrustados de novedades/fichas
 * (src/lib/video.ts, src/lib/incrustado.ts: YouTube, Vimeo, SoundCloud, Mixcloud, Bandcamp). Apple y Google NO
 * están aquí a propósito: su flujo va por el navegador del sistema (@capacitor/browser), nunca por este WebView.
 */
const config: CapacitorConfig = {
  appId: "org.somosnosotros.app",
  appName: "Somos Nosotros",
  webDir: "www",
  server: {
    url: "https://somosnosotros.org",
    allowNavigation: [
      "somosnosotros.org",
      "www.somosnosotros.org",
      "*.supabase.co",
      "api.mapbox.com",
      "events.mapbox.com",
      "*.tiles.mapbox.com",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
      "w.soundcloud.com",
      "www.mixcloud.com",
      "bandcamp.com",
    ],
  },
  ios: {
    appendUserAgent: "SomosNosotrosApp",
    contentInset: "always",
  },
};

export default config;
