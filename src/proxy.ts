import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configPublica } from "@/lib/config";

/**
 * Se ejecuta antes de cada página: refresca la sesión de Supabase (cookies) para que
 * no caduque mientras la persona usa la app. No decide accesos; eso lo hace cada página.
 */
export async function proxy(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = configPublica();
  let respuesta = NextResponse.next({ request });
  if (!supabaseUrl || !supabaseAnonKey) return respuesta;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (todas) => {
        todas.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        todas.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });
  // Verifica el token localmente (sin ir a Supabase Auth) y refresca la sesión solo si hace falta.
  await supabase.auth.getClaims();
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
