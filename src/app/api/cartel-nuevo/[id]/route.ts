import { cargarParaCartel } from "@/lib/carteles/cargar";
import { generarCartel } from "@/lib/carteles/generar";
import { parametrosCartel } from "@/lib/carteles/parametros";
import { plantillaPorId } from "@/lib/carteles/plantillas";
import { nombreDeCartel } from "@/lib/cartelDescarga";
import { clienteServidor } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/**
 * GET /api/cartel-nuevo/[id]?plantilla=&formato=4x5|9x16&ancho=&titulo=&descarga=1 — el cartel generado de un evento (OL-324). Solo para quien
 * lo gestiona (autor o administración): sin sesión o ajeno, 404. Sale en JPEG del ancho pedido (las miniaturas a 360, la vista previa a 720,
 * la descarga a 1080). Con `descarga=1` va como archivo y queda anotado en `carteles_generados` (memoria del lugar; el tope que decida el
 * founder contará esas filas); sin él, la caché del teléfono lo guarda un día (la pantalla pone `v`, que cambia si cambia el evento).
 * `Server-Timing` dice cuánto tardó cada parte, para medirlo en la vista previa de Vercel.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = parametrosCartel(new URL(req.url).searchParams);
  const plantilla = plantillaPorId(p.plantilla);
  const supabase = await clienteServidor();
  if (!supabase || !plantilla) return NO_HAY();
  const datos = await cargarParaCartel(supabase, id);
  if (!datos?.gestiona) return NO_HAY();
  let r: Awaited<ReturnType<typeof generarCartel>>;
  try {
    r = await generarCartel(datos, plantilla, p.formato, { titulo: p.titulo, ancho: p.ancho });
  } catch (e) {
    console.error("cartel-nuevo:", e instanceof Error ? e.message : e);
    return new Response("No se pudo dibujar el cartel", { status: 500 });
  }
  const cabeceras: Record<string, string> = {
    "Content-Type": r.tipo,
    "Server-Timing": `imagen;dur=${r.msImagen}, foto;dur=${r.ms.foto}, svg;dur=${r.ms.svg}, raster;dur=${r.ms.raster}`,
  };
  if (p.descarga) {
    await supabase.from("carteles_generados").insert({ evento_id: datos.evento.id, perfil_id: datos.perfilId, plantilla: plantilla.id, formato: p.formato.id });
    cabeceras["Content-Disposition"] = `attachment; filename="${nombreDeCartel(`${datos.evento.slug}-${plantilla.id}`, "jpg")}"`;
    cabeceras["Cache-Control"] = "private, no-store";
  } else {
    cabeceras["Cache-Control"] = "private, max-age=86400";
  }
  return new Response(new Uint8Array(r.imagen), { headers: cabeceras });
}
