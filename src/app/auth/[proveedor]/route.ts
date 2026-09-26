import { NextResponse, type NextRequest } from "next/server";
import { CLIENTES, COOKIE_ENTRAR, VIGENCIA_SEGUNDOS, codificarIntento, direccionDeVuelta, esProveedor, leerCampos, nuevoIntento, paginaRelevo, urlEntrar, urlProveedor } from "@/lib/entrarCon";
import { rutaSegura } from "@/lib/rutas";

type Contexto = { params: Promise<{ proveedor: string }> };

/**
 * La ida a Apple o Google (src/lib/entrarCon.ts). Guarda el estado y el nonce de este intento en una cookie que solo
 * lee el servidor y manda a la persona al proveedor, que la devuelve con un POST a esta misma dirección.
 */
export async function GET(request: NextRequest, { params }: Contexto) {
  const { proveedor } = await params;
  const siguiente = request.nextUrl.searchParams.get("siguiente");
  const origen = request.nextUrl.origin;
  const cliente = esProveedor(proveedor) ? CLIENTES[proveedor] : null;
  if (!esProveedor(proveedor) || !cliente) return NextResponse.redirect(new URL(urlEntrar(rutaSegura(siguiente, "/perfil")), origen), 303);

  // `app=1`: el toque salió del envoltorio de iPhone (apps/ios, OL-194); ver el comentario de `Intento.enApp`.
  const intento = nuevoIntento(proveedor, siguiente, Date.now(), request.nextUrl.searchParams.get("app") === "1");
  const respuesta = NextResponse.redirect(urlProveedor(proveedor, { cliente, vuelta: direccionDeVuelta(origen, proveedor), estado: intento.estado, nonce: intento.nonce }), 303);
  respuesta.cookies.set(COOKIE_ENTRAR, codificarIntento(intento), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/auth",
    maxAge: VIGENCIA_SEGUNDOS,
  });
  return respuesta;
}

/** La vuelta del proveedor: llega sin nuestras cookies, así que el relevo la repite desde aquí a /auth/[proveedor]/fin. */
export async function POST(request: NextRequest, { params }: Contexto) {
  const { proveedor } = await params;
  if (!esProveedor(proveedor)) return new NextResponse(null, { status: 404 });
  const campos = leerCampos(await request.formData().catch(() => new FormData()));
  return new NextResponse(paginaRelevo(`/auth/${proveedor}/fin`, campos), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
