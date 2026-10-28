import { cargarParaCartel } from "@/lib/carteles/cargar";
import { esUuid } from "@/lib/formulario";
import { armarImagen, bajarCartel, encajarCartel } from "@/lib/instagram/imagen";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });
const jpeg = (bytes: Buffer) => new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600" } });

/**
 * GET /api/instagram/[id]?formato=4x5|9x16&recorte=1&diseno=0|1 — la vista previa de lo que se publicaría en Instagram (OL-458, firmado;
 * bitácora 490): la misma imagen que arma la acción de publicar, a 720 de ancho. Solo la administración (sin sesión o sin serlo, 404). La
 * guarda el teléfono un rato: cambiar de formato no vuelve a dibujarla.
 * OL-464 (bitácora 496): `imagen=<id de un acto>` dibuja el cartel de ese acto del festival a 4:5 con el margen de su color (una imagen del
 * carrusel); `mini=1`, a 240 de ancho (las miniaturas de la tira). Solo actos de este festival y con cartel.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) return NO_HAY();
  const actual = await usuarioActual();
  const supabase = actual?.perfil.rol === "admin" ? await clienteServidor() : null;
  if (!supabase) return NO_HAY();
  const q = new URL(req.url).searchParams;
  const formato = q.get("formato") === "9x16" ? "9x16" : "4x5";
  const ancho = q.get("mini") === "1" ? 240 : 720;
  const acto = q.get("imagen");
  if (acto && acto !== "portada") {
    if (!esUuid(acto)) return NO_HAY();
    const { data: a } = await supabase.from("eventos").select("imagen").eq("id", acto).eq("evento_padre_id", id).maybeSingle<{ imagen: string | null }>();
    const suyo = await bajarCartel(a?.imagen ?? null);
    if (!suyo) return NO_HAY();
    try {
      return jpeg(await encajarCartel(suyo.bytes, "4x5", false, ancho));
    } catch {
      return new Response("No se pudo dibujar", { status: 500 });
    }
  }
  const datos = await cargarParaCartel(supabase, id);
  if (!datos) return NO_HAY();
  const { data: e } = await supabase.from("eventos").select("imagen").eq("id", id).maybeSingle<{ imagen: string | null }>();
  const cartel = await bajarCartel(e?.imagen ?? null);
  let imagen: Buffer;
  try {
    imagen = await armarImagen({ cartel: cartel?.bytes ?? null, datos, formato, recorte: q.get("recorte") === "1", diseno: Number(q.get("diseno")) || 0, ancho });
  } catch {
    return new Response("No se pudo dibujar", { status: 500 });
  }
  return jpeg(imagen);
}
