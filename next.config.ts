import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad (revisión 2026-09-14, M1). Sin CSP completa todavía: Next y Mapbox exigen
 * 'unsafe-inline'/'unsafe-eval' y blob:, y una CSP mal afinada rompe el mapa en producción sin avisar;
 * `frame-ancestors` sola sí es segura y evita que otra página nos meta en un iframe (clickjacking sobre Voy, Seguir, borrar cuenta).
 */
const CABECERAS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
];

// Lo privado o personal ya lleva `robots: {index:false}` en su propia página (OL-059), pero eso depende de que la
// metadata llegue en el <head> y de que cada página lo recuerde. Esta cabecera no depende de ninguna de las dos
// cosas: Google la lee siempre, esté donde esté el <title>. No sustituye el `robots` de cada página, lo respalda.
const NOINDEX = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

/**
 * Copiado de `node_modules/next/dist/shared/lib/router/utils/html-bots.js` (Next 16.3.5), más Googlebot: Next 16
 * manda el `<title>`, la descripción y el canonical de una página con `generateMetadata` en streaming dentro de
 * `<body>` (revisión de gestión de cambios, OL-059) — Google ignora un canonical fuera de `<head>`. Este patrón le
 * dice a Next qué visitantes no pueden esperar el streaming y deben recibir el HTML completo, con la metadata ya
 * en `<head>`. El propio patrón de Next, pese al nombre, NO incluye "Googlebot" (solo sus variantes con guion,
 * como AdsBot-Google o Google-InspectionTool) — hay que revisar este patrón si se actualiza Next.
 */
const BOTS_SIN_STREAMING = /[\w-]+-Google|Google-[\w-]+|Googlebot|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i;

const nextConfig: NextConfig = {
  // Al cambiar de sección con la barra inferior (Agenda · Lugares · Artistas) la página vista hace menos de un minuto
  // se reutiliza en el teléfono sin esperar al servidor; publicar, Voy y Seguir la invalidan (revalidatePath).
  experimental: { staleTimes: { dynamic: 60 } },
  htmlLimitedBots: BOTS_SIN_STREAMING,
  async headers() {
    return [
      { source: "/(.*)", headers: CABECERAS },
      { source: "/admin/:path*", headers: NOINDEX },
      { source: "/ajustes/:path*", headers: NOINDEX },
      { source: "/perfil/:path*", headers: NOINDEX },
      { source: "/personas/:path*", headers: NOINDEX },
      { source: "/entrar", headers: NOINDEX },
      { source: "/borrado", headers: NOINDEX },
      // Alta y edición, y Novedades (OL-143, doc 36): piden sesión, pero conviene decirlo explícito (respaldo del `robots` de cada página).
      { source: "/lugares/nuevo", headers: NOINDEX },
      { source: "/lugares/:id/editar", headers: NOINDEX },
      { source: "/artistas/nuevo", headers: NOINDEX },
      { source: "/artistas/:id/editar", headers: NOINDEX },
      { source: "/eventos/nuevo", headers: NOINDEX },
      { source: "/eventos/:id/editar", headers: NOINDEX },
      { source: "/novedades", headers: NOINDEX },
    ];
  },
};

export default nextConfig;
