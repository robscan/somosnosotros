import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { crearLugar } from "@/app/lugares/acciones";
import { enlaceAltaLugar } from "@/lib/armazon";
import { ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { puntoDeTexto } from "@/lib/geo";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import AltaLugar from "./AltaLugar";

export const metadata: Metadata = { title: "Registrar un lugar · Somos Nosotros", robots: { index: false, follow: false } };

type Consulta = { ciudad?: string; nombre?: string; lat?: string; lng?: string };

/**
 * Registrar un lugar por pasos (OL-315; prototipo firmado `lugar-artista-por-pasos.html`, bitácora 342). `/nuevo?tipo=lugar` llega aquí con
 * un 308 (el proxy). Pide sesión antes de ver nada y vuelve aquí, con la misma dirección, al entrar. Todo lo de la consulta es opcional y lo
 * ilegible se ignora:
 * - `ciudad`: la ciudad que se veía: acerca la búsqueda y, si el mapa no dice la del lugar, lo es a menos de 50 km de su centro.
 * - `nombre`: lo que se buscó y no se encontró (Buscar): el primer paso abre con él.
 * - `lat`, `lng`: el punto donde se sostuvo el dedo en el mapa de Lugares: el mapa lo confirma («¿Es aquí?»).
 */
export default async function NuevoLugarPorPasos({ searchParams }: { searchParams: Promise<Consulta> }) {
  const { ciudad, nombre, lat, lng } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(enlaceAltaLugar({ ciudad, nombre, lat, lng }))}`);
  const supabase = await clienteServidor();
  // Los registrados sirven para decir «Ya tiene ficha» al escribir y «¿Es este?» en el mapa, nunca para elegirlos (OL-211); la política de
  // lectura deja pasar también los privados de la propia cuenta (RLS).
  const [ciudades, { data: lugares }] = await Promise.all([
    cargarCiudades(),
    supabase?.from("lugares").select("id, slug, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre") ?? { data: [] },
  ]);
  return (
    <AltaLugar
      accion={crearLugar}
      lugares={(lugares ?? []) as LugarResumen[]}
      // Sin `?ciudad=`, la búsqueda se acerca a San Luis Potosí (el respaldo de Lugares, `ciudadPorSlug`); la ciudad del lugar solo sale de
      // ahí si el punto cae a menos de 50 km (`ciudadParaPunto`), y si no, «Revisa» la pide: nunca en silencio.
      ciudadContexto={ciudadPorSlug(ciudad, ciudades)}
      conCiudad={ciudad ?? null}
      ciudades={ciudades}
      usuarioId={actual.perfil.id}
      esAdmin={actual.perfil.rol === "admin"}
      arranque={{ nombre: nombre?.trim().slice(0, 80) ?? "", punto: puntoDeTexto(lat, lng) }}
    />
  );
}
