import type { Metadata } from "next";
import type { GrupoBuscador } from "@/lib/buscarUnificado";
import { ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { diaLocal } from "@/lib/fechas";
import { usuarioActual } from "@/lib/supabase/servidor";
import BuscarPantalla from "./BuscarPantalla";

export const metadata: Metadata = { title: "Buscar · Somos Nosotros", robots: { index: false, follow: false } };

type SearchParams = { ciudad?: string; desde?: string };
const DESDE: readonly GrupoBuscador[] = ["eventos", "lugares", "artistas"];

/**
 * Buscar (docs/rediseno/50, OL-237): la pantalla a la que lleva la lupa de la barra desde cualquier sección. La ciudad que se ve y la
 * sección de origen (`?desde=`: manda qué grupo sale primero) viajan en la URL; lo escrito, no. No espera ninguna consulta pesada: las
 * ciudades, que ya se piden en las demás pantallas, y si hay sesión, que decide si lo que no se encuentra se ofrece registrar.
 */
export default async function Buscar({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug, desde } = await searchParams;
  const [ciudades, actual] = await Promise.all([cargarCiudades(), usuarioActual()]);
  const ciudad = ciudadPorSlug(slug, ciudades);
  return <BuscarPantalla ciudad={ciudad} ciudades={ciudades} desde={DESDE.find((g) => g === desde) ?? "eventos"} hoy={diaLocal(new Date(), ciudad.zona)} conSesion={!!actual} />;
}
