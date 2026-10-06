import { cartelDescargable, extensionDeImagen, nombreDeCartel } from "@/lib/cartelDescarga";
import { configPublica } from "@/lib/config";
import { eventoPaso } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { clienteServidor } from "@/lib/supabase/servidor";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/**
 * GET /api/cartel/[id] — el cartel del evento como descarga (OL-304). La imagen vive en el Storage de Supabase, que es otro origen: el
 * atributo `download` de un `<a>` ahí no hace nada, así que se pasa por aquí con `Content-Disposition: attachment`. Se busca por slug
 * (la dirección de hoy) y, si no aparece, por UUID, como la ficha; el evento tiene que estar visible y no haber pasado (como lo que
 * ve cualquiera en la ficha), y la imagen tiene que ser del Storage propio. Se transmite tal cual, con el tipo con el que se subió.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await clienteServidor();
  if (!supabase) return NO_HAY();
  const columnas = "slug, imagen, inicio, fin, zona, visible";
  const porSlug = await supabase.from("eventos").select(columnas).eq("slug", id).maybeSingle();
  const { data } = porSlug.data ? porSlug : esUuid(id) ? await supabase.from("eventos").select(columnas).eq("id", id).maybeSingle() : { data: null };
  if (!data || !data.visible || eventoPaso(data.inicio, data.fin, new Date(), data.zona) || !cartelDescargable(data.imagen, configPublica().supabaseUrl)) return NO_HAY();
  let origen: Response;
  try {
    origen = await fetch(data.imagen, { redirect: "error" });
  } catch {
    return new Response("No se pudo traer el cartel", { status: 502 });
  }
  const extension = extensionDeImagen(origen.headers.get("content-type"));
  if (!origen.ok || !origen.body || !extension) return new Response("No se pudo traer el cartel", { status: 502 });
  return new Response(origen.body, {
    headers: {
      "Content-Type": origen.headers.get("content-type") ?? "image/jpeg",
      "Content-Disposition": `attachment; filename="${nombreDeCartel(data.slug, extension)}"`,
      // El cartel cambia poco y cada descarga pega al Storage (su cuota de salida es la que se agotó el 2026-10-03): el CDN lo guarda una hora.
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
