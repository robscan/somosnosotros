import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { configPublica } from "@/lib/config";
import { COOKIE_ENTRAR, decidirVuelta, esProveedor, leerCampos, leerIntento, nombreDeApple, nombrePorDefecto, URL_APP_ERROR, urlAppTrasEntrar, urlEntrar } from "@/lib/entrarCon";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteServidor } from "@/lib/supabase/servidor";

type Contexto = { params: Promise<{ proveedor: string }> };

/**
 * El final de entrar con Apple o Google (src/lib/entrarCon.ts). Llega desde la página de relevo, con la cookie del
 * intento: comprueba que la vuelta es de este navegador, entrega la identidad a Supabase (signInWithIdToken deja la
 * sesión en cookies) y manda a la persona a donde iba, donde la pantalla aplica su intención (Voy, Seguir…). Si el
 * intento venía del envoltorio de iPhone (OL-194), en vez de mandarla a `siguiente` la manda al esquema propio con
 * un enlace de un solo uso: ver `urlVueltaAlApp` más abajo y el comentario de `urlAppTrasEntrar` en entrarCon.ts.
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
  if (intento?.enApp === true) return volver(await urlVueltaAlApp(data.user, siguiente));
  return volver(siguiente);
}

/**
 * OL-194, corrección del gestor: la sesión que `signInWithIdToken` acaba de poner queda en las cookies de la
 * `ASWebAuthenticationSession` (comparte las de Safari), no en el WKWebView de la app: ver el comentario de
 * `urlAppTrasEntrar` en src/lib/entrarCon.ts. Aquí se genera, con el cliente de servicio (la llave solo vive en el
 * servidor, src/lib/supabase/admin.ts), un enlace mágico de un solo uso para el correo de quien acaba de entrar —
 * `generateLink` nunca lo envía, solo lo genera — y se manda su `token_hash` por el esquema propio. Sin correo (no
 * debería pasar: Apple y Google siempre lo dan) o si Supabase falla, se avisa el fallo por la misma vía.
 */
async function urlVueltaAlApp(usuario: User, siguiente: string): Promise<string> {
  const admin = clienteAdmin();
  if (!admin || !usuario.email) return URL_APP_ERROR;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: usuario.email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error(`vuelta a la app: ${error?.message ?? "sin hashed_token"}`);
    return URL_APP_ERROR;
  }
  return urlAppTrasEntrar(siguiente, tokenHash);
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
