import { comoCliente } from "@/app/admin/instagram/semana";
import { esUuid } from "@/lib/formulario";
import { cargarFicha, dibujarFicha } from "@/lib/instagram/ficha";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/**
 * GET /api/instagram/ficha/[id]?tipo=artista|lugar&formato=4x5|9x16 — la vista previa de la tarjeta de un artista o de un lugar para «Publicar en
 * Instagram» desde su ficha (OL-515): la misma que dibuja el trabajador al publicar, a 720 de ancho, como saldría hoy. Solo la administración
 * (sin sesión o sin serlo, 404).
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
    const bytes = await dibujarFicha(f, q.get("formato") === "9x16" ? "9x16" : "4x5", ahora, 720);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
  } catch {
    return new Response("No se pudo dibujar", { status: 500 });
  }
}
