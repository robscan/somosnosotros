import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { filtroSinPasar } from "@/lib/fechas";
import { conProximo, TIPOS, type LugarLista, type LugarResumen, type ProximoEvento } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import VistaLugares from "./VistaLugares";

export const metadata = { title: "Lugares · Somos Nosotros" };

/** Los lugares de la ciudad con su próximo evento: el mapa primero, la lista como segunda vista. */
async function cargar(ciudadNombre: string): Promise<LugarLista[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const [l, e] = await Promise.all([
    // 1 000 lugares en una sola ciudad son muchos más de los que hay hoy (decenas); tope explícito para no
    // depender del corte silencioso de PostgREST si la ciudad crece (revisión 2026-09-14, A1).
    supabase.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, privado").eq("visible", true).eq("ciudad", ciudadNombre).order("nombre").limit(1000),
    supabase.from("eventos").select("id, inicio, lugar_id, zona").eq("visible", true).not("lugar_id", "is", null).or(filtroSinPasar()).order("inicio").limit(500),
  ]);
  return conProximo((l.data ?? []) as LugarResumen[], (e.data ?? []) as (ProximoEvento & { lugar_id: string | null })[]);
}

export default async function Lugares({ searchParams }: { searchParams: Promise<{ vista?: string; ciudad?: string; tipo?: string }> }) {
  const { vista, ciudad: slug, tipo } = await searchParams;
  const ciudades = await cargarCiudades(await clienteServidor());
  const ciudad = ciudadPorSlug(slug, ciudades);
  const [lugares, actual] = await Promise.all([cargar(ciudad.nombre), usuarioActual()]);
  // Con sesión, los lugares que sigue: la lista los marca y deja seguir al deslizar (bitácora 071).
  const supabase = actual ? await clienteServidor() : null;
  const s = supabase && actual ? await supabase.from("seguimientos").select("lugar_id").eq("usuario_id", actual.perfil.id).not("lugar_id", "is", null).limit(1000) : null;
  const seguidos = actual ? ((s?.data ?? []) as { lugar_id: string }[]).map((x) => x.lugar_id) : null;
  const avisos = actual ? { preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;
  // El tipo elegido vive en la URL (se comparte y sobrevive al volver atrás); solo vale si existe.
  const tipoElegido = tipo && TIPOS.some((t) => t.valor === tipo) ? tipo : null;
  return <VistaLugares lugares={lugares} ciudad={ciudad} ciudades={ciudades} conSesion={!!actual} vistaInicial={vista === "lista" ? "lista" : "mapa"} tipo={tipoElegido} barra={<Barra derecha={<Sesion />} />} seguidos={seguidos} avisos={avisos} />;
}
