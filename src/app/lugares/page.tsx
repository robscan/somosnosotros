import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { ciudadPorSlug } from "@/lib/ciudad";
import { desdeReciente } from "@/lib/fechas";
import { conProximo, type LugarLista, type LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import VistaLugares from "./VistaLugares";

export const metadata = { title: "Lugares · Somos Nosotros" };

/** Los lugares de la ciudad con su próximo evento: el mapa primero, la lista como segunda vista. */
async function cargar(ciudadNombre: string): Promise<LugarLista[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const [l, e] = await Promise.all([
    supabase.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada").eq("visible", true).eq("ciudad", ciudadNombre).order("nombre"),
    supabase.from("eventos").select("id, inicio, lugar_id").eq("visible", true).not("lugar_id", "is", null).gte("inicio", desdeReciente()).order("inicio").limit(500),
  ]);
  return conProximo((l.data ?? []) as LugarResumen[], (e.data ?? []) as { id: string; inicio: string; lugar_id: string | null }[]);
}

export default async function Lugares({ searchParams }: { searchParams: Promise<{ vista?: string; ciudad?: string }> }) {
  const { vista, ciudad: slug } = await searchParams;
  const ciudad = ciudadPorSlug(slug);
  const [lugares, actual] = await Promise.all([cargar(ciudad.nombre), usuarioActual()]);
  return <VistaLugares lugares={lugares} ciudad={ciudad} conSesion={!!actual} vistaInicial={vista === "lista" ? "lista" : "mapa"} barra={<Barra derecha={<Sesion />} />} />;
}
