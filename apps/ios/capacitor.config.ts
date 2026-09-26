import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

/**
 * Envoltorio de iPhone (OL-194, pieza 4 de docs/rediseno/47-app-ios.md). La app no trae su propia web: carga
 * siempre https://somosnosotros.org (server.url) dentro de un WKWebView. `webDir` solo sirve la página de
 * "Sin conexión" (www/index.html), que MainViewController.swift muestra a mano con un NWPathMonitor cuando de
 * verdad no hay red — a propósito NO se usa `server.errorPath` (la opción propia de Capacitor): esa la dispara
 * `didFailProvisionalNavigation` en cualquier navegación cancelada, incluida la que EntrarSistemaPlugin.swift
 * cancela a propósito para abrir Apple o Google en el navegador del sistema, y dejaba la app entera mostrando
 * "Sin conexión" con la red perfectamente encendida (visto en el simulador). En un arranque normal nunca se ve.
 *
 * `appendUserAgent` marca el navegador de la app; quien decide hoy que Apple y Google salen por una sesión del
 * sistema en vez de por el WKWebView es EntrarSistemaPlugin.swift, que intercepta la ida a `/auth/apple` y
 * `/auth/google` sin mirar el user-agent (sección 4 del plan: Google bloquea su entrada dentro de cualquier webview
 * embebido). Desde OL-205 también lo lee la propia web (`src/lib/appNativa.ts`) para saber que corre dentro de la
 * app (sin el menú nativo "Copy · Look Up · Translate" al mantener pulsado un texto, entre otras cosas).
 *
 * `allowNavigation` deja navegar (documentos completos e iframes) solo a los dominios que la web usa hoy:
 * Supabase (Auth/Storage del proyecto, dominio *.supabase.co: revisar si el proyecto pasa a un dominio propio),
 * Mapbox (mapa y sus estilos, src/lib/config.ts) y los reproductores incrustados de novedades/fichas
 * (src/lib/video.ts, src/lib/incrustado.ts: YouTube, Vimeo, SoundCloud, Mixcloud, Bandcamp). Apple y Google NO
 * están aquí a propósito: su flujo va por el navegador del sistema (@capacitor/browser), nunca por este WebView.
 *
 * `plugins.Keyboard.resize: "body"` (OL-205, auditoría OL-202 problema 1, docs/rediseno/48-shell-ios.md §2): sin el
 * plugin de teclado, iOS resuelve solo un campo tapado por el teclado desplazando la página entera para revelarlo
 * ("native" es su comportamiento de fábrica) — y ese desplazamiento saca a la barra pegajosa (`ui/Barra.module.css`
 * `.interior`, `position: sticky; top: 0`) de la zona segura que el propio WKWebView le calculó, dejándola pegada a
 * la hora/isla dinámica. Con "body" solo se encoge el alto del `<body>` (el viewport y `env(safe-area-inset-top)`
 * no cambian: "Relative units are not affected, because the viewport does not change", documentación de
 * @capacitor/keyboard) y es el propio `<body>` el que hace scroll interno para revelar el campo — la barra sigue
 * pegada al tope de un viewport que nunca se movió, con su zona segura intacta. No se probó "none" (dejaría a la
 * web reimplementar a mano el desplazamiento que ya hace bien en casi toda la app, ver `ui/Hoja.tsx`) ni dejar
 * "native" con un arreglo aparte (es justo el modo que causa el problema).
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
    // La web pone su propia zona segura (OL-209): la franja de la hora la cubre `body::before` en globals.css y las
    // cabeceras pegajosas se detienen en `--tope`. Con "always", iOS reservaba además ese espacio dentro del
    // desplazamiento: hueco doble arriba, franja con el fondo del sistema (negra en modo oscuro) y el contenido
    // pasaba bajo la hora al desplazar (visto por el founder en TestFlight 1.0 (2), 2026-09-25).
    contentInset: "never",
    backgroundColor: "#ffffff",
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
    },
  },
};

export default config;
