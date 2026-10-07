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
 *   somosnosotros-privado/android/).
 * - `HUELLA_FIRMA_GOOGLE`: SHA-256 de la llave de firma de Google. Aparece en Play Console tras la primera subida
 *   (Prueba y lanza → Configuración → Integridad de la app → Firma de apps → «Certificado de la clave de firma de
 *   la app»). TODAVÍA NO ESTÁ: hasta pegarla aquí, la app instalada desde Play abre la web con la barra de
 *   direcciones de Chrome (modo de respaldo, `fallbackType: customtabs`), no a pantalla completa.
 *
 * Confirmar que nada la redirige: src/proxy.ts solo actúa sobre `/artistas|lugares|eventos/<uuid>` y
 * next.config.ts no tiene ninguna regla que toque esta ruta.
 */
const PAQUETE = "org.somosnosotros.app";

const HUELLA_SUBIDA = "BC:BE:8F:FB:71:A6:B0:B9:0A:07:3A:F4:13:AB:45:64:1F:A4:A5:9E:9F:6F:51:6C:B0:3E:82:5E:D7:6E:40:50";

/** Pegar aquí, en el mismo formato AA:BB:…, la huella que muestra Play Console tras la primera subida. */
const HUELLA_FIRMA_GOOGLE: string | null = null;

const HUELLAS = [HUELLA_SUBIDA, HUELLA_FIRMA_GOOGLE].filter((h): h is string => h !== null);

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
