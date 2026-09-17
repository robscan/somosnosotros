import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";
import { rutaSegura } from "@/lib/rutas";

/**
 * Aquí aterriza el enlace del correo (Apple y Google vuelven por /auth/[proveedor]).
 * Cambia el código por una sesión (cookies) y manda a la persona a donde iba.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const siguiente = rutaSegura(searchParams.get("siguiente"), "/perfil");
  const supabase = await clienteServidor();
  if (!supabase) return NextResponse.redirect(`${origin}/entrar?error=enlace`);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  let fallo = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    fallo = !!error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "magiclink" | "email" });
    fallo = !!error;
  } else {
    fallo = true;
  }

  return NextResponse.redirect(`${origin}${fallo ? "/entrar?error=enlace" : siguiente}`);
}
