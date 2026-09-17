import type { Metadata } from "next";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { leerTira } from "@/lib/destacados";
import { filtroSinPasar } from "@/lib/fechas";
import { conProximo, TIPOS, type LugarLista, type LugarResumen, type ProximoEvento } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import VistaLugares from "./VistaLugares";

type SearchParams = { vista?: string; ciudad?: string; tipo?: string };

/**
 * El canonical conserva la ciudad cuando no es la inicial ("el contexto ordena, no limita": OL-029) y descarta el
 * resto de filtros ("?tipo=museo" es la misma lista para Google, no una nueva). Sin esto, la lista de otra ciudad
 * se declaraba duplicada de la de San Luis Potosí y Google podía no ofrecerla nunca (OL-059). El título y la
 * descripción son propios, sin nombre de ciudad (no del layout raíz, que decía siempre San Luis Potosí) — por lo
 * mismo que el inicio (ver su comentario): esta página se reutiliza hasta 60 s al cambiar de ciudad sin recargar.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudades();
  const resuelta = ciudadPorSlug(slug, ciudades);
  const canonical = resuelta.slug === CIUDAD_INICIAL.slug ? "/lugares" : `/lugares?ciudad=${resuelta.slug}`;
  return { title: "Lugares · Somos Nosotros", description: "Centros culturales cerca de ti: mapa y lista, con su próximo evento.", alternates: { canonical } };
}

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

export default async function Lugares({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { vista, ciudad: slug, tipo } = await searchParams;
  const ciudades = await cargarCiudades();
  const ciudad = ciudadPorSlug(slug, ciudades);
  const [lugares, actual, destacados] = await Promise.all([cargar(ciudad.nombre), usuarioActual(), clienteServidor().then((s) => leerTira(s, "lugares", ciudad.nombre))]);
  // Con sesión, los lugares que sigue: la lista los marca y deja seguir al deslizar (bitácora 071).
  const supabase = actual ? await clienteServidor() : null;
  const s = supabase && actual ? await supabase.from("seguimientos").select("lugar_id").eq("usuario_id", actual.perfil.id).not("lugar_id", "is", null).limit(1000) : null;
  const seguidos = actual ? ((s?.data ?? []) as { lugar_id: string }[]).map((x) => x.lugar_id) : null;
  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;
  // El tipo elegido vive en la URL (se comparte y sobrevive al volver atrás); solo vale si existe.
  const tipoElegido = tipo && TIPOS.some((t) => t.valor === tipo) ? tipo : null;
  return <VistaLugares lugares={lugares} ciudad={ciudad} ciudades={ciudades} conSesion={!!actual} vistaInicial={vista === "lista" ? "lista" : "mapa"} tipo={tipoElegido} barra={<Barra derecha={<Sesion />} />} seguidos={seguidos} avisos={avisos} destacados={destacados} />;
}
