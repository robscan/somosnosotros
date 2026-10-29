import { after } from "next/server";
import { leerCuerpoAcotado } from "@/lib/cuerpoAcotado";
import { esUuid } from "@/lib/formulario";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteServidor } from "@/lib/supabase/servidor";
import { cookieDeVisita, esRobot, nuevoVisitante, origenDeVista, visitanteDeCookie } from "@/lib/vistas";

export const dynamic = "force-dynamic";

/** Lo más que se acepta de cuerpo: `{"evento":"<uuid>","origen":"instagram","medio":"story"}` cabe de sobra. */
const MAX_CUERPO = 128;

const listo = (cookie?: string) => new Response(null, { status: 204, headers: { "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) } });

/**
 * POST /api/vista — cuenta una vista de la ficha de un evento (OL-459) para los destacados automáticos. La manda `ContarVista`
 * desde el teléfono después de pintar la ficha: la página no espera. Solo desde el propio sitio (`Sec-Fetch-Site`), sin robots
 * evidentes. Con cuenta, el visitante es su id (leído del token, sin ir a la red); sin cuenta, la cookie `sn_visita` (un número al
 * azar que dura un día; si no la trae, se le da una). La base decide si cuenta: una por visitante, evento y día, nunca a la
 * administración ni a quien lo publicó, ni en eventos ocultos o que ya pasaron. Se llama con la llave de servicio, después de
 * responder (`after`): nadie puede sumar vistas con la llave pública. Sin la llave (local), responde igual y no cuenta.
 * OL-461: si la ficha se abrió desde un enlace de la marca en Instagram o Facebook, `ContarVista` manda también `origen` y `medio`
 * (de `utm_source` y `utm_medium`, listas cerradas) y la vista se cuenta con ellos (`contar_vista_evento_origen`); sin origen, como antes.
 * OL-479: la ficha de un artista o de un lugar (`{"artista":…}` o `{"lugar":…}`) solo cuenta con origen (la semana de Instagram mide lo que llega
 * de ahí: la bio, la historia, Facebook), con la misma regla (`contar_vista_ficha`); el medio puede ser también `bio`.
 */
export async function POST(request: Request) {
  try {
    const sitio = request.headers.get("sec-fetch-site");
    if (sitio && sitio !== "same-origin") return new Response(null, { status: 403 });
    if (esRobot(request.headers.get("user-agent"))) return listo();
    const texto = await leerCuerpoAcotado(request, MAX_CUERPO);
    if (texto === null) return new Response(null, { status: 413 });
    const cuerpo = JSON.parse(texto) as { evento?: unknown; artista?: unknown; lugar?: unknown; origen?: unknown; medio?: unknown } | null;
    const evento = cuerpo?.evento;
    const ficha = esUuid(cuerpo?.artista) ? { tipo: "artista" as const, id: cuerpo!.artista as string } : esUuid(cuerpo?.lugar) ? { tipo: "lugar" as const, id: cuerpo!.lugar as string } : null;
    if (!esUuid(evento) && !ficha) return new Response(null, { status: 400 });
    const { origen, medio } = origenDeVista(cuerpo?.origen, cuerpo?.medio);
    // Una ficha sin origen no se cuenta (no hace falta para nada).
    if (ficha && !origen) return listo();

    const supabase = await clienteServidor();
    const sub = supabase ? (await supabase.auth.getClaims()).data?.claims?.sub : undefined;
    const usuario = typeof sub === "string" && esUuid(sub) ? sub : null;
    const deCookie = usuario ? null : visitanteDeCookie(request.headers.get("cookie"));
    const visitante = usuario ?? deCookie ?? nuevoVisitante();
    after(async () => {
      const admin = clienteAdmin();
      if (!admin) return;
      if (ficha) await admin.rpc("contar_vista_ficha", { p_tipo: ficha.tipo, p_ficha: ficha.id, p_visitante: visitante, p_usuario: usuario, p_origen: origen, p_medio: cuerpo?.medio === "bio" ? "bio" : medio });
      else if (origen) await admin.rpc("contar_vista_evento_origen", { p_evento: evento, p_visitante: visitante, p_usuario: usuario, p_origen: origen, p_medio: medio });
      else await admin.rpc("contar_vista_evento", { p_evento: evento, p_visitante: visitante, p_usuario: usuario });
    });
    return listo(usuario || deCookie ? undefined : cookieDeVisita(visitante, new URL(request.url).protocol === "https:"));
  } catch {
    return new Response(null, { status: 400 });
  }
}
