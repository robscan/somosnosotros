import { esUuid } from "@/lib/formulario";
import { aFechaIcs, eventoPaso } from "@/lib/fechas";
import { clienteServidor } from "@/lib/supabase/servidor";

/** GET /eventos/[id]/calendario — archivo .ics: el teléfono lo abre en Calendario. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await clienteServidor();
  if (!supabase || !esUuid(id)) return new Response("No encontrado", { status: 404 });
  const { data } = await supabase.from("eventos").select("id, titulo, inicio, fin, descripcion, sitio_texto, lugar:lugares(nombre, direccion)").eq("id", id).maybeSingle();
  // Un evento que ya pasó se oculta: tampoco se entrega su archivo de calendario.
  if (!data || eventoPaso(data.inicio, data.fin)) return new Response("No encontrado", { status: 404 });
  const lugar = (Array.isArray(data.lugar) ? data.lugar[0] : data.lugar) as { nombre: string; direccion: string | null } | null;
  const fin = data.fin ?? new Date(new Date(data.inicio).getTime() + 2 * 3600000).toISOString();
  const escapar = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//somosnosotros//ES",
    "BEGIN:VEVENT",
    `UID:${data.id}@somosnosotros.org`,
    `DTSTAMP:${aFechaIcs(new Date().toISOString())}`,
    `DTSTART:${aFechaIcs(data.inicio)}`,
    `DTEND:${aFechaIcs(fin)}`,
    `SUMMARY:${escapar(data.titulo)}`,
    lugar ? `LOCATION:${escapar([lugar.nombre, lugar.direccion].filter(Boolean).join(", "))}` : data.sitio_texto ? `LOCATION:${escapar(data.sitio_texto)}` : null,
    `DESCRIPTION:${escapar(`${data.descripcion ?? ""}\nhttps://somosnosotros.org/eventos/${data.id}`.trim())}`,
    `URL:https://somosnosotros.org/eventos/${data.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return new Response(lineas.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="evento.ics"`, "Cache-Control": "no-store" },
  });
}
