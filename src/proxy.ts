import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { redireccionDeNuevo } from "@/lib/armazon";
import { configPublica } from "@/lib/config";
import { destinoConSlug, rutaConUuid } from "@/lib/redireccionSlug";

/**
 * Se ejecuta antes de cada página: refresca la sesión de Supabase (cookies) para que
 * no caduque mientras la persona usa la app. No decide accesos; eso lo hace cada página.
 *
 * Además, si la dirección es la vieja de una ficha (`/artistas/<uuid>`, `/lugares/<uuid>`, `/eventos/<uuid>`),
 * pregunta el slug y responde un 308 de verdad hacia la dirección de hoy (OL-123): aquí todavía no ha empezado
 * la transmisión de la página, así que el código y la cabecera `Location` sí llegan al navegador, a `curl` y a
 * los buscadores. Cuesta una consulta extra solo cuando la ruta trae UUID; las direcciones con slug no pagan
 * nada. Si la fila no existe o no es visible para quien pide, se deja pasar y la página decide (404 o el mismo
 * redirect de siempre, que sigue ahí como respaldo).
 *
 * Y `/nuevo` con un evento (sin tipo, `tipo=evento`, o con `lugar`, `artista` o `desde`) responde un 308 de verdad hacia el alta por
 * pasos, `/nuevo/evento`, con esos datos (OL-312, `redireccionDeNuevo`): desde la página, con la transmisión ya empezada por `loading.tsx`,
 * el código saldría 200 con una redirección en el HTML. Lo mismo `/nuevo?tipo=lugar`, que va al alta de lugar por pasos, `/nuevo/lugar`, con
 * la ciudad, el nombre y el punto (OL-315). Sin consulta ni sesión: la pide la pantalla a la que se llega. La página repite la misma
 * redirección como respaldo.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/nuevo") {
    const q = request.nextUrl.searchParams;
    const alta = redireccionDeNuevo({ tipo: q.get("tipo"), lugar: q.get("lugar"), artista: q.get("artista"), desde: q.get("desde"), ciudad: q.get("ciudad"), nombre: q.get("nombre"), lat: q.get("lat"), lng: q.get("lng") });
    if (alta) return NextResponse.redirect(new URL(alta, request.nextUrl), 308);
  }
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

  const ruta = rutaConUuid(request.nextUrl.pathname);
  if (!ruta) return respuesta;
  // Con la sesión de quien pide: la fila oculta la ve su autor o el administrador, igual que en la página.
  const { data } = await supabase.from(ruta.tabla).select("slug").eq("id", ruta.uuid).maybeSingle<{ slug: string | null }>();
  if (!data?.slug || data.slug === ruta.uuid) return respuesta;
  // Absoluta sobre el origen de la propia petición (Next rechaza una `Location` relativa en el proxy): en
  // producción sale https://somosnosotros.org/…, en una vista previa o en local, su propio host.
  const redireccion = NextResponse.redirect(new URL(destinoConSlug(ruta, data.slug, request.nextUrl.search), request.nextUrl), 308);
  // Si la sesión se refrescó en esta misma petición, las cookies nuevas viajan también con el 308.
  respuesta.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  return redireccion;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
