import { NextResponse, type NextRequest } from "next/server";
import { rutaSegura } from "@/lib/rutas";
import { clienteServidor, confirmarEnlaceMagico } from "@/lib/supabase/servidor";

/**
 * El punto donde el envoltorio de iPhone (apps/ios, OL-194) recupera el control tras entrar con Apple o Google
 * tocado dentro de la app: ver el comentario de `urlAppTrasEntrar` en src/lib/entrarCon.ts. `/auth/[proveedor]/fin`
 * arma un enlace mágico de un solo uso y lo manda por una URL https de nuestro propio dominio a
 * `EntrarSistemaPlugin.swift`, que la recibe directo de `ASWebAuthenticationSession` (con
 * `ASWebAuthenticationSession.Callback.https(host:path:)`, iOS 17.4+; nunca pasa por el navegador del sistema) y
 * carga esa misma dirección, tal cual, en el WKWebView de la app. Aquí, con el cliente de servidor normal (el que
 * escribe cookies, src/lib/supabase/servidor.ts), se confirma ese enlace — la misma `verifyOtp` que usa
 * /auth/callback para el enlace del correo, en `confirmarEnlaceMagico` — y la sesión queda puesta en el
 * almacenamiento propio de quien la abrió.
 *
 * Corrección de seguridad (OL-194): antes esta vuelta viajaba por un esquema propio de la app (el prefijo
 * "somosnosotros" con dos barras), que cualquier app puede registrar — una app impostora podía quedarse con la
 * sesión de la víctima. Con `ASWebAuthenticationSession.Callback.https` solo la app cuyo Associated Domains
 * verificó somosnosotros.org puede recibir la vuelta directo; pero si alguien logra que esta URL se abra FUERA de
 * la app (un navegador normal, o el
 * teléfono sin la app instalada — por ejemplo, provocando la ida a `/auth/google?app=1` desde Safari), esta ruta
 * hace exactamente lo mismo ahí: canjea el `token_hash` en ESE navegador y la sesión se queda en él, sin llegar a
 * nadie más. Un `token_hash` de un enlace mágico caduca y sirve una sola vez, como el que llega por correo.
 *
 * Sin `token_hash` (nadie construye este enlace sin uno; si Apple o Google fallan, Swift manda a /entrar?error=
 * directo, sin pasar por aquí) o si `verifyOtp` falla, se vuelve a Entrar con un aviso en vez de dejar a la persona
 * varada.
 */
export async function GET(request: NextRequest) {
  const siguiente = rutaSegura(request.nextUrl.searchParams.get("siguiente"), "/perfil");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const ok = tokenHash ? await confirmarEnlaceMagico(await clienteServidor(), tokenHash) : false;
  if (!ok) return NextResponse.redirect(new URL("/entrar?error=enlace", request.nextUrl.origin), 303);
  return NextResponse.redirect(new URL(siguiente, request.nextUrl.origin), 303);
}
