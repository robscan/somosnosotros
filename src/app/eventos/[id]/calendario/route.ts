import { esUuid } from "@/lib/formulario";
import { archivoIcs, nombreArchivoIcs } from "@/lib/calendario";
import { eventoPaso } from "@/lib/fechas";
import { clienteServidor } from "@/lib/supabase/servidor";

/** GET /eventos/[id]/calendario — archivo .ics con una alerta 1 hora antes: el teléfono lo abre en su calendario. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await clienteServidor();
  if (!supabase || !esUuid(id)) return new Response("No encontrado", { status: 404 });
  const { data } = await supabase.from("eventos").select("id, titulo, inicio, fin, descripcion, sitio_texto, lugar:lugares(nombre, direccion)").eq("id", id).maybeSingle();
  // Un evento que ya pasó se oculta: tampoco se entrega su archivo de calendario.
  if (!data || eventoPaso(data.inicio, data.fin)) return new Response("No encontrado", { status: 404 });
  const lugar = (Array.isArray(data.lugar) ? data.lugar[0] : data.lugar) as { nombre: string; direccion: string | null } | null;
  const donde = lugar ? [lugar.nombre, lugar.direccion].filter(Boolean).join(", ") : (data.sitio_texto ?? null);
  const ics = archivoIcs({ id: data.id, titulo: data.titulo, inicio: data.inicio, fin: data.fin, descripcion: data.descripcion, lugar: donde });
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${nombreArchivoIcs(data.titulo)}"`, "Cache-Control": "no-store" },
  });
}
