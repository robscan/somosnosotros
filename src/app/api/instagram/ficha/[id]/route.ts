import { comoCliente } from "@/app/admin/instagram/semana";
import { esUuid } from "@/lib/formulario";
import { cargarFicha, dibujarFicha, dibujarImagenDeFicha } from "@/lib/instagram/ficha";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/**
 * GET /api/instagram/ficha/[id]?tipo=artista|lugar&formato=4x5|9x16&rotulo=0 — la vista previa de la tarjeta de un artista o de un lugar para
 * «Publicar en Instagram» desde su ficha (OL-515): la misma que dibuja el trabajador al publicar, a 720 de ancho, como saldría hoy. `rotulo=0`:
 * sin «de la semana» (así sale lo publicado a mano; la hoja lo pide siempre). Solo la administración (sin sesión o sin serlo, 404).
 * OL-516: `imagen=<n>` dibuja la imagen n del carrusel de la ficha (0, la tarjeta; luego cada evento de esta semana: su cartel a 4:5 o su diseño),
 * la misma lista que publica el trabajador; `mini=1`, a 240 de ancho (la tira de la hoja). Una que no existe o no se pudo dibujar, 404.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = new URL(req.url).searchParams;
  const tipo = q.get("tipo");
  if (!esUuid(id) || (tipo !== "artista" && tipo !== "lugar")) return NO_HAY();
  const actual = await usuarioActual();
  const supabase = actual?.perfil.rol === "admin" ? await clienteServidor() : null;
  if (!supabase) return NO_HAY();
  const ahora = new Date();
  try {
    const f = await cargarFicha(comoCliente(supabase), tipo, id, ahora);
    if (!f) return NO_HAY();
    const ancho = q.get("mini") === "1" ? 240 : 720;
    const n = q.has("imagen") ? Number(q.get("imagen")) : null;
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 9)) return NO_HAY();
    const bytes = n !== null ? await dibujarImagenDeFicha(comoCliente(supabase), f, n, ahora, ancho, q.get("rotulo") === "0") : await dibujarFicha(f, q.get("formato") === "9x16" ? "9x16" : "4x5", ahora, ancho, q.get("rotulo") === "0");
    if (!bytes) return NO_HAY();
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
  } catch {
    return new Response("No se pudo dibujar", { status: 500 });
  }
}
