import { NextResponse, type NextRequest } from "next/server";
import { atenderVuelta, GALLETA_ESTADO, secretoDeEstado, uriDeVuelta } from "@/lib/instagram/conexion";
import type { ClaveVuelta } from "@/lib/instagram/conexionEstado";
import { guardarConexion } from "@/lib/instagram/token";
import { META_APP_ID } from "@/lib/marca";
import { origenPropio } from "@/lib/rutinas/disparar";
import { usuarioActual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/**
 * GET /api/instagram/vuelta?code&state — la vuelta del inicio de sesión de Meta de «Conectar Instagram» (OL-471, bitácora 503). Solo la
 * administración con sesión (si no, 403). `atenderVuelta` comprueba el `state` (el de la galleta, firmado, sin caducar y de quien tiene la
 * sesión), cambia el código por el token de la página y lo guarda en Vault. Luego vuelve a Administración › Instagram con `?conectado=1` o
 * `?error=<clave>`: ni el token ni el código quedan en la dirección, en una galleta (la del `state` se borra) ni en un registro.
 */
export async function GET(req: NextRequest) {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return new Response("Solo la administración conecta Instagram.", { status: 403, headers: { "Cache-Control": "no-store" } });
  const origen = origenPropio(req.headers.get("host"), req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(/:$/, ""));
  const vuelta = origen ? uriDeVuelta(origen) : null;
  const q = req.nextUrl.searchParams;
  const clave: ClaveVuelta = !vuelta
    ? "origen"
    : await atenderVuelta(
        { code: q.get("code"), state: q.get("state"), errorMeta: q.get("error"), galleta: req.cookies.get(GALLETA_ESTADO)?.value ?? null, adminId: actual.perfil.id, ahora: Date.now(), redirectUri: vuelta },
        { appId: META_APP_ID, appSecret: process.env.META_APP_SECRET, paginaId: process.env.FACEBOOK_PAGE_ID, instagramId: process.env.INSTAGRAM_USER_ID, secreto: secretoDeEstado() },
        { traer: fetch, guardar: (c) => guardarConexion(c) },
      );
  const r = NextResponse.redirect(new URL(clave === "conectado" ? "/admin/instagram?conectado=1" : `/admin/instagram?error=${clave}`, req.nextUrl), 303);
  r.cookies.set(GALLETA_ESTADO, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/instagram", maxAge: 0 });
  r.headers.set("Cache-Control", "no-store");
  r.headers.set("Referrer-Policy", "no-referrer");
  return r;
}
