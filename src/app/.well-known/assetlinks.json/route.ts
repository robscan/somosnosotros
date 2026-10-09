import { NextResponse } from "next/server";

/**
 * Digital Asset Links de Android (OL-192, pieza 2 de docs/rediseno/47-app-ios.md §9): Chrome solo abre la app de
 * Android a pantalla completa (Trusted Web Activity, sin barra de direcciones) y solo deja que los enlaces de
 * somosnosotros.org abran la app si este archivo, servido en HTTPS y sin redirecciones en
 * `https://somosnosotros.org/.well-known/assetlinks.json`, dice que `org.somosnosotros.app` es de confianza.
 * El paquete y las huellas no son secretos: viajan a la vista en cualquier APK.
 *
 * Con Play App Signing (activado en Play Console), Google re-firma lo que llega al teléfono con SU llave: la
 * nuestra solo sirve para subir. Chrome compara contra la huella de la llave con la que Android instaló la app,
 * así que hacen falta las dos y nunca se quita ninguna (la de subida cubre el APK que se instala a mano con
 * `adb`; la de Google, lo que baja de Play):
 * - `HUELLA_SUBIDA`: SHA-256 de la llave de subida (`subida.keystore`, alias `subida`, guardada fuera del repo en
 *   ~/Proyectos/somosnosotros/privado/android/).
 * - `HUELLA_FIRMA_GOOGLE`: SHA-256 de la llave de firma de apps de Google, tomada de Play Console (Prueba y lanza →
 *   Configuración → Integridad de la app → Firma de apps) tras la primera subida, el 2026-10-06. Con las dos huellas,
 *   la app instalada desde Play se abre a pantalla completa, sin la barra de direcciones de Chrome.
 *
 * Confirmar que nada la redirige: src/proxy.ts solo actúa sobre `/artistas|lugares|eventos/<uuid>` y
 * next.config.ts no tiene ninguna regla que toque esta ruta.
 */
const PAQUETE = "org.somosnosotros.app";

const HUELLA_SUBIDA = "BC:BE:8F:FB:71:A6:B0:B9:0A:07:3A:F4:13:AB:45:64:1F:A4:A5:9E:9F:6F:51:6C:B0:3E:82:5E:D7:6E:40:50";

/** Llave de firma de apps de Google (Play App Signing), la que muestra Play Console. */
const HUELLA_FIRMA_GOOGLE = "D6:F9:F9:04:10:B8:E0:A1:8E:F2:B9:08:83:22:83:89:72:88:4E:6E:3D:78:12:5C:19:DD:73:71:07:3B:2C:8F";

const HUELLAS = [HUELLA_SUBIDA, HUELLA_FIRMA_GOOGLE];

const CONTENIDO = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: PAQUETE, sha256_cert_fingerprints: HUELLAS },
  },
];

export async function GET() {
  // NextResponse.json() manda "application/json; charset=utf-8"; se deja el tipo a secas, como en el de Apple.
  return new NextResponse(JSON.stringify(CONTENIDO), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
