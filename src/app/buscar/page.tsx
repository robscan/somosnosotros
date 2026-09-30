import type { Metadata } from "next";
import type { GrupoBuscador } from "@/lib/buscarUnificado";
import { ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { filtroSinPasar } from "@/lib/fechas";
import { clienteServidor } from "@/lib/supabase/servidor";
import { tiposDeLaSemana } from "@/lib/tiposDeLaSemana";
import BuscarPantalla from "./BuscarPantalla";

export const metadata: Metadata = { title: "Buscar · Somos Nosotros", robots: { index: false, follow: false } };

type SearchParams = { ciudad?: string; desde?: string };
const DESDE: readonly GrupoBuscador[] = ["eventos", "lugares", "artistas"];

/** Los atajos de «Esta semana»: los tipos de lugar de los eventos de los próximos siete días en la ciudad (`tiposDeLaSemana`). */
async function cargarTipos(ciudad: string): Promise<string[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const ahora = new Date();
  // Un día de margen sobre los siete: el corte exacto lo hace `tiposDeLaSemana`.
  const limite = new Date(ahora.getTime() + 8 * 86400000).toISOString();
  const { data } = await supabase.from("eventos").select("inicio, fin, lugar:lugares(tipo)").eq("visible", true).eq("ciudad", ciudad).or(filtroSinPasar(ahora)).lt("inicio", limite).order("inicio").limit(500);
  const eventos = ((data ?? []) as unknown as { inicio: string; fin: string | null; lugar: { tipo: string } | { tipo: string }[] | null }[]).map((e) => ({ ...e, lugar: Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar }));
  return tiposDeLaSemana(eventos, ahora);
}

/**
 * Buscar (docs/rediseno/50, OL-237): la pantalla a la que lleva la lupa de la barra desde cualquier sección. La ciudad que se ve y la
 * sección de origen (`?desde=`: manda qué grupo sale primero) viajan en la URL; lo escrito, no. Los atajos de esta semana se piden
 * aparte y llegan como promesa: el campo no espera ninguna consulta para pintar.
 */
export default async function Buscar({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug, desde } = await searchParams;
  const ciudades = await cargarCiudades();
  const ciudad = ciudadPorSlug(slug, ciudades);
  return <BuscarPantalla ciudad={ciudad} ciudades={ciudades} desde={DESDE.find((g) => g === desde) ?? "eventos"} tipos={cargarTipos(ciudad.nombre)} />;
}
