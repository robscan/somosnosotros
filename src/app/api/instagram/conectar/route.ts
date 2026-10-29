import { NextResponse, type NextRequest } from "next/server";
import { firmarEstado, GALLETA_ESTADO, secretoDeEstado, uriDeVuelta, urlDeConexion, VIGENCIA_ESTADO_MS } from "@/lib/instagram/conexion";
import { META_APP_ID } from "@/lib/marca";
import { origenPropio } from "@/lib/rutinas/disparar";
import { usuarioActual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

const SIN_CACHE = { "Cache-Control": "no-store" };
/** De vuelta a Administración › Instagram con la clave del error: sobre el origen propio si lo hay (en `next start` local, `nextUrl` dice
 *  localhost aunque se haya entrado por 127.0.0.1, y la sesión no viajaría) o, si no, sobre el de la petición. */
const aInstagram = (req: NextRequest, origen: string | null, error: string) => {
  const r = NextResponse.redirect(new URL(`/admin/instagram?error=${error}`, origen ?? req.nextUrl), 303);
  r.headers.set("Cache-Control", "no-store");
  return r;
};

/**
 * GET /api/instagram/conectar — «Conectar Instagram» (OL-471, bitácora 503): lleva al inicio de sesión de Meta (`lib/instagram/conexion`). Solo
 * la administración con sesión (si no, 403). La vuelta es `https://<host>/api/instagram/vuelta`, con el host propio de `origenPropio` (en
 * producción, somosnosotros.org; nunca el de una cabecera manipulada) y solo https; si se llegó por otro host propio (www), primero se pasa al
 * bueno para que la galleta del `state` quede donde vuelve Meta. El `state` firmado va también en una galleta httpOnly de 10 minutos.
 */
export async function GET(req: NextRequest) {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return new Response("Solo la administración conecta Instagram.", { status: 403, headers: SIN_CACHE });
  const host = req.headers.get("host");
  const origen = origenPropio(host, req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(/:$/, ""));
  const vuelta = origen ? uriDeVuelta(origen) : null;
  if (!origen || !vuelta) return aInstagram(req, origen, "origen");
  if (new URL(origen).host !== (host ?? "").toLowerCase()) return NextResponse.redirect(new URL("/api/instagram/conectar", origen), 307);
  const secreto = secretoDeEstado();
  if (!secreto) return aInstagram(req, origen, "config");
  const estado = firmarEstado(actual.perfil.id, Date.now(), secreto);
  const r = NextResponse.redirect(urlDeConexion(META_APP_ID, vuelta, estado), 303);
  r.cookies.set(GALLETA_ESTADO, estado, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/instagram", maxAge: VIGENCIA_ESTADO_MS / 1000 });
  r.headers.set("Cache-Control", "no-store");
  return r;
}
