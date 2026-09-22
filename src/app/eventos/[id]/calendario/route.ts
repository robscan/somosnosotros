import { esUuid } from "@/lib/formulario";
import { archivoIcs, nombreArchivoIcs } from "@/lib/calendario";
import { eventoPaso } from "@/lib/fechas";
import { nombreSitio } from "@/lib/eventos";
import { clienteServidor } from "@/lib/supabase/servidor";

/** GET /eventos/[id]/calendario — archivo .ics con una alerta 1 hora antes: el teléfono lo abre en su calendario. Se
 *  busca por slug (la dirección de hoy) y, si no aparece, por UUID (la dirección vieja), mismo criterio que la ficha. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await clienteServidor();
  if (!supabase) return new Response("No encontrado", { status: 404 });
  const columnas = "id, slug, titulo, inicio, fin, zona, descripcion, sitio_texto, sitio_direccion, sitio_reservado, lugar:lugares(nombre, direccion)";
  const porSlug = await supabase.from("eventos").select(columnas).eq("slug", id).maybeSingle();
  const { data } = porSlug.data ? porSlug : esUuid(id) ? await supabase.from("eventos").select(columnas).eq("id", id).maybeSingle() : { data: null };
  // Un evento que ya pasó se oculta: tampoco se entrega su archivo de calendario.
  if (!data || eventoPaso(data.inicio, data.fin, new Date(), data.zona)) return new Response("No encontrado", { status: 404 });
  const lugar = (Array.isArray(data.lugar) ? data.lugar[0] : data.lugar) as { nombre: string; direccion: string | null } | null;
  const donde = lugar ? [lugar.nombre, lugar.direccion].filter(Boolean).join(", ") : nombreSitio({ ...data, lugar: null });
  const ics = archivoIcs({ id: data.id, slug: data.slug, titulo: data.titulo, inicio: data.inicio, fin: data.fin, descripcion: data.descripcion, lugar: donde });
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${nombreArchivoIcs(data.titulo)}"`, "Cache-Control": "no-store" },
  });
}
