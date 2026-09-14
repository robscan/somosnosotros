import Mapa from "@/components/Mapa";
import Panel from "@/components/Panel";
import type { EventoResumen } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor } from "@/lib/supabase/servidor";
import { ciudadPorSlug, type Ciudad } from "@/lib/ciudad";

async function cargar(ciudad: Ciudad): Promise<{ lugares: LugarResumen[]; eventos: EventoResumen[] }> {
  const supabase = await clienteServidor();
  if (!supabase) return { lugares: [], eventos: [] };
  const desde = new Date(Date.now() - 3 * 3600000).toISOString(); // lo que empezó hace menos de 3 h sigue en la agenda
  const [l, e] = await Promise.all([
    supabase.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada").eq("visible", true).eq("ciudad", ciudad.nombre).order("nombre"),
    supabase.from("eventos").select("id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, lugar:lugares(nombre, portada)").eq("visible", true).eq("ciudad", ciudad.nombre).gte("inicio", desde).order("inicio").limit(200),
  ]);
  const eventos = ((e.data ?? []) as unknown as Array<Omit<EventoResumen, "lugar"> & { lugar: EventoResumen["lugar"] | EventoResumen["lugar"][] }>).map((x) => ({
    ...x,
    lugar: Array.isArray(x.lugar) ? (x.lugar[0] ?? null) : x.lugar,
  }));
  return { lugares: (l.data ?? []) as LugarResumen[], eventos };
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cuenta?: string; lugar?: string; ciudad?: string; borrado?: string }> }) {
  const { cuenta, lugar, ciudad: slug, borrado } = await searchParams;
  const ciudad = ciudadPorSlug(slug);
  const { lugares, eventos } = await cargar(ciudad);
  const centrarEn = lugar ? (lugares.find((l) => l.id === lugar) ?? null) : null;
  return (
    <main>
      <Mapa lugares={lugares} centrarEn={centrarEn} ciudad={ciudad} />
      <Panel lugares={lugares} eventos={eventos} ciudad={ciudad} cuentaBorrada={cuenta === "borrada"} aviso={borrado === "lugar" ? "Lugar borrado." : borrado === "evento" ? "Evento borrado." : undefined} />
    </main>
  );
}
