import { NextResponse } from "next/server";

/**
 * Enlaces universales de iOS (OL-194, pieza 4 de docs/rediseno/47-app-ios.md §9): Apple exige este archivo servido
 * en HTTPS, sin redirecciones, con Content-Type application/json (con o sin extensión .json en la petición: Apple
 * pide ambas formas), en `https://somosnosotros.org/.well-known/apple-app-site-association`. El identificador junta
 * el Team ID del founder (AT53235M7U, cuenta personal de Apple Developer) con el App ID ya creado en
 * developer.apple.com (`org.somosnosotros.app`); ninguno de los dos es secreto, viajan a la vista en cualquier
 * enlace compartido.
 *
 * `applinks` reclama solo lo que la app de verdad abre hoy: las fichas (eventos, lugares, artistas). `/auth/*` no
 * está aquí (corrección del gestor, OL-194, bitácora 228): la vuelta de entrar con Apple o Google ya no depende de
 * un enlace universal, sino de `ASWebAuthenticationSession` con el esquema propio "somosnosotros://" (ver
 * `EntrarSistemaPlugin.swift` y `urlAppTrasEntrar` en src/lib/entrarCon.ts), así que reclamar `/auth/*` no hacía
 * falta y, peor, competía con el enlace del correo cuando alguien lo abre fuera de la app (Apple prefiere abrir la
 * app instalada si reclama la ruta, y ahí el enlace del correo no sirve de nada). `webcredentials` deja que el
 * llavero de iOS sugiera la cuenta de somosnosotros.org dentro de la app, igual que ya hace en Safari.
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
        components: [{ "/": "/eventos/*" }, { "/": "/lugares/*" }, { "/": "/artistas/*" }],
      },
    ],
  },
  webcredentials: { apps: [APP_ID] },
};

export async function GET() {
  // NextResponse.json() manda "application/json; charset=utf-8"; Apple pide "application/json" a secas.
  return new NextResponse(JSON.stringify(CONTENIDO), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
