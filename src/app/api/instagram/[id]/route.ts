import { cargarParaCartel } from "@/lib/carteles/cargar";
import { esUuid } from "@/lib/formulario";
import { armarImagen, bajarCartel } from "@/lib/instagram/imagen";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/**
 * GET /api/instagram/[id]?formato=4x5|9x16&recorte=1&diseno=0|1 — la vista previa de lo que se publicaría en Instagram (OL-458, firmado;
 * bitácora 490): la misma imagen que arma la acción de publicar, a 720 de ancho. Solo la administración (sin sesión o sin serlo, 404). La
 * guarda el teléfono un rato: cambiar de formato no vuelve a dibujarla.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) return NO_HAY();
  const actual = await usuarioActual();
  const supabase = actual?.perfil.rol === "admin" ? await clienteServidor() : null;
  if (!supabase) return NO_HAY();
  const q = new URL(req.url).searchParams;
  const formato = q.get("formato") === "9x16" ? "9x16" : "4x5";
  const datos = await cargarParaCartel(supabase, id);
  if (!datos) return NO_HAY();
  const { data: e } = await supabase.from("eventos").select("imagen").eq("id", id).maybeSingle<{ imagen: string | null }>();
  const cartel = await bajarCartel(e?.imagen ?? null);
  let jpeg: Buffer;
  try {
    jpeg = await armarImagen({ cartel: cartel?.bytes ?? null, datos, formato, recorte: q.get("recorte") === "1", diseno: Number(q.get("diseno")) || 0, ancho: 720 });
  } catch {
    return new Response("No se pudo dibujar", { status: 500 });
  }
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600" } });
}
