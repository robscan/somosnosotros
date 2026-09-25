import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { configPublica } from "@/lib/config";
import { COOKIE_ENTRAR, decidirVuelta, destinoTrasEntrar, esProveedor, leerCampos, leerIntento, nombreDeApple, nombrePorDefecto, urlEntrar } from "@/lib/entrarCon";
import { clienteServidor } from "@/lib/supabase/servidor";

type Contexto = { params: Promise<{ proveedor: string }> };

/**
 * El final de entrar con Apple o Google (src/lib/entrarCon.ts). Llega desde la página de relevo, con la cookie del
 * intento: comprueba que la vuelta es de este navegador, entrega la identidad a Supabase (signInWithIdToken deja la
 * sesión en cookies) y manda a la persona a donde iba, donde la pantalla aplica su intención (Voy, Seguir…).
 */
export async function POST(request: NextRequest, { params }: Contexto) {
  const { proveedor } = await params;
  if (!esProveedor(proveedor)) return new NextResponse(null, { status: 404 });
  const campos = leerCampos(await request.formData().catch(() => new FormData()));
  const intento = leerIntento(request.cookies.get(COOKIE_ENTRAR)?.value);
  const siguiente = intento?.siguiente ?? "/perfil";

  const volver = (ruta: string) => {
    const respuesta = NextResponse.redirect(new URL(ruta, request.nextUrl.origin), 303);
    respuesta.cookies.set(COOKIE_ENTRAR, "", { path: "/auth", maxAge: 0 }); // un intento sirve una sola vez
    return respuesta;
  };

  const desenlace = decidirVuelta(proveedor, intento, campos);
  if (desenlace.tipo === "cancelado") return volver(urlEntrar(siguiente));
  if (desenlace.tipo === "fallo") {
    console.error(`entrar con ${proveedor}: ${desenlace.motivo}`);
    return volver(urlEntrar(siguiente, proveedor));
  }

  const supabase = await clienteServidor();
  const { data, error } = (await supabase?.auth.signInWithIdToken({ provider: proveedor, token: desenlace.token, nonce: desenlace.nonce })) ?? { data: null, error: null };
  if (!data?.user || !data.session) {
    console.error(`entrar con ${proveedor}: ${error?.message ?? "sin Supabase"}`);
    return volver(urlEntrar(siguiente, proveedor));
  }
  if (proveedor === "apple") await ponerNombreDeApple(data.user, data.session.access_token, campos.user);
  return volver(destinoTrasEntrar(siguiente, intento?.enApp === true));
}

/**
 * Apple no pone el nombre en la identidad: lo manda aparte y solo la primera vez. Sin esto la ficha se llamaría como
 * el correo que Apple inventa al ocultarlo ("qx8r7mbn2k"). Solo cambia el nombre que puso la base, nunca uno elegido.
 * Con la sesión recién emitida y explícita, para no depender de que las cookies de esta misma petición ya se lean.
 */
async function ponerNombreDeApple(usuario: User, token: string, user: string | undefined) {
  const nombre = nombreDeApple(user);
  const { supabaseUrl, supabaseAnonKey } = configPublica();
  if (!nombre || !supabaseUrl || !supabaseAnonKey) return;
  const conSesion = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await conSesion.from("perfiles").update({ nombre }).eq("id", usuario.id).eq("nombre", nombrePorDefecto(usuario.email));
  if (error) console.error(`nombre de Apple: ${error.message}`);
}
