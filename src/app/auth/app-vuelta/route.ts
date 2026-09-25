import { NextResponse, type NextRequest } from "next/server";
import { rutaSegura } from "@/lib/rutas";
import { clienteServidor, confirmarEnlaceMagico } from "@/lib/supabase/servidor";

/**
 * El punto donde el envoltorio de iPhone (apps/ios, OL-194) recupera el control tras entrar con Apple o Google
 * tocado dentro de la app: ver el comentario de `urlAppTrasEntrar` en src/lib/entrarCon.ts. `/auth/[proveedor]/fin`
 * arma un enlace mágico de un solo uso y lo manda por el esquema propio ("somosnosotros://") a
 * `EntrarSistemaPlugin.swift`, que lo recibe directo de `ASWebAuthenticationSession` (nunca pasa por el navegador
 * del sistema) y carga esta misma dirección con el `token_hash` ya en el WKWebView de la app. Aquí, con el cliente
 * de servidor normal (el que escribe cookies, src/lib/supabase/servidor.ts), se confirma ese enlace — la misma
 * `verifyOtp` que usa /auth/callback para el enlace del correo, en `confirmarEnlaceMagico` — y la sesión queda
 * puesta en el almacenamiento propio de la app. Un `token_hash` de un enlace mágico caduca y sirve una sola vez,
 * como el que llega por correo; que viaje por un esquema propio en vez de https no lo hace menos seguro, porque
 * `ASWebAuthenticationSession` solo se lo entrega a esta app (ver la bitácora 228, «Correcciones del gestor»).
 *
 * Sin `token_hash` (nadie construye este enlace sin uno; si Apple o Google fallan, Swift manda a /entrar?error=
 * directo, sin pasar por aquí) o si `verifyOtp` falla, se vuelve a Entrar con un aviso en vez de dejar a la persona
 * varada. Fuera de la app esta ruta nunca se visita.
 */
export async function GET(request: NextRequest) {
  const siguiente = rutaSegura(request.nextUrl.searchParams.get("siguiente"), "/perfil");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const ok = tokenHash ? await confirmarEnlaceMagico(await clienteServidor(), tokenHash) : false;
  if (!ok) return NextResponse.redirect(new URL("/entrar?error=enlace", request.nextUrl.origin), 303);
  return NextResponse.redirect(new URL(siguiente, request.nextUrl.origin), 303);
}
