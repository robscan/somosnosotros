import { NextResponse } from "next/server";

/**
 * Enlaces universales de iOS (OL-194, pieza 4 de docs/rediseno/47-app-ios.md §9): Apple exige este archivo servido
 * en HTTPS, sin redirecciones, con Content-Type application/json (con o sin extensión .json en la petición: Apple
 * pide ambas formas), en `https://somosnosotros.org/.well-known/apple-app-site-association`. El identificador junta
 * el Team ID del founder (AT53235M7U, cuenta personal de Apple Developer) con el App ID ya creado en
 * developer.apple.com (`org.somosnosotros.app`); ninguno de los dos es secreto, viajan a la vista en cualquier
 * enlace compartido.
 *
 * `applinks` reclama todo el sitio (OL-223): cualquier enlace de somosnosotros.org abre la app instalada, que es
 * donde está la sesión. Antes solo reclamaba las fichas, y el QR de Pincel (`/obra/<id>/mando`) abría Safari y
 * pedía entrar. La app carga el enlace que le llega (`SceneDelegate.swift`), también con la app cerrada: Capacitor
 * 8.5.2 lo entrega en `capacitorViewDidAppear`, cuando el observador ya existe. iOS relee este archivo (vía la CDN
 * de Apple) al instalar o actualizar la app. Las exclusiones van primero porque gana la primera que coincide:
 * - `/auth/*`: la vuelta de entrar con Apple o Google no depende de un enlace universal, sino de
 *   `ASWebAuthenticationSession.Callback.https(host:path:)` (iOS 17.4+, ver `EntrarSistemaPlugin.swift` y
 *   `urlAppTrasEntrar` en src/lib/entrarCon.ts), que la atrapa antes de que llegue a ser una navegación. Reclamarla
 *   competiría con el enlace del correo cuando alguien lo abre fuera de la app, y ahí no sirve de nada.
 * - `/api/*`: no son páginas.
 * - `/avisos/baja*`: la baja de avisos del correo funciona sin sesión, en el navegador donde se abre.
 * - `/eventos/<id>/calendario`: el .ics. Dentro de la app el calendario va por la hoja nativa (OL-214).
 * Lo que sí exige la callback https, según la documentación de Apple, es `webcredentials` con el dominio — ya
 * está, y además deja que el llavero de iOS sugiera la cuenta de somosnosotros.org dentro de la app, igual que ya
 * hace en Safari.
 *
 * Confirmar que nada la redirige: src/proxy.ts solo actúa sobre `/artistas|lugares|eventos/<uuid>` (no sobre
 * `/.well-known/*`) y next.config.ts no tiene ninguna regla que toque esta ruta.
 */
const APP_ID = "AT53235M7U.org.somosnosotros.app";

const CONTENIDO = {
  applinks: {
    details: [
      {
        appIDs: [APP_ID],
        components: [
          { "/": "/auth/*", exclude: true },
          { "/": "/api/*", exclude: true },
          { "/": "/avisos/baja*", exclude: true },
          { "/": "/eventos/*/calendario*", exclude: true },
          { "/": "/*" },
        ],
      },
    ],
  },
  webcredentials: { apps: [APP_ID] },
};

export async function GET() {
  // NextResponse.json() manda "application/json; charset=utf-8"; Apple pide "application/json" a secas.
  return new NextResponse(JSON.stringify(CONTENIDO), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
