import { comoCliente, leerDia } from "@/app/admin/instagram/semana";
import { esUuid } from "@/lib/formulario";
import { cargarFicha, cargarSemana, dibujarFicha, dibujarPortadaDeSemana } from "@/lib/instagram/ficha";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });
const jpeg = (bytes: Buffer) => new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });

/**
 * GET /api/instagram/semana/[día]?formato=4x5|9x16&mini=1 — la vista previa de un día de la semana de Instagram (OL-479): la tarjeta del artista o
 * del lugar (la misma que dibuja el trabajador al publicar) o la portada de «Esta semana», a 720 de ancho (`mini=1`: a 240, la miniatura del
 * renglón). Un evento del día lleva a la vista previa de siempre (su cartel encajado). Solo la administración (sin sesión o sin serlo, 404).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) return NO_HAY();
  const actual = await usuarioActual();
  const supabase = actual?.perfil.rol === "admin" ? await clienteServidor() : null;
  if (!supabase) return NO_HAY();
  const d = await leerDia(supabase, id);
  if (!d || d.tipo === "descanso") return NO_HAY();
  const q = new URL(req.url).searchParams;
  const formato = q.get("formato") === "9x16" && d.tipo !== "semana" ? "9x16" : "4x5";
  const mini = q.get("mini") === "1";
  const ancho = mini ? 240 : 720;
  if (d.tipo === "evento") {
    if (!d.evento_id) return NO_HAY();
    return Response.redirect(new URL(`/api/instagram/${d.evento_id}?formato=${formato}${mini ? "&mini=1" : ""}`, req.url), 302);
  }
  const ahora = new Date();
  try {
    if (d.tipo === "semana") {
      const s = await cargarSemana(comoCliente(supabase), d.eventos ?? [], ahora);
      return s ? jpeg(await dibujarPortadaDeSemana(s, ahora, ancho)) : NO_HAY();
    }
    const f = await cargarFicha(comoCliente(supabase), d.tipo, (d.artista_id ?? d.lugar_id)!, ahora, d.fecha);
    return f ? jpeg(await dibujarFicha(f, formato, ahora, ancho)) : NO_HAY();
  } catch {
    return new Response("No se pudo dibujar", { status: 500 });
  }
}
