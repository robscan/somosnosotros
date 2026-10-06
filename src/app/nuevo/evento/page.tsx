import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cargarMisArtistas } from "@/app/artistas/consultas";
import { crearEvento, cupoDeCartel } from "@/app/eventos/acciones";
import { lecturaDeCartelActiva } from "@/lib/cartel";
import { cargarCiudades } from "@/lib/ciudades";
import { ciudadDesdeSlug } from "@/lib/direccionContexto";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import AltaEvento from "./AltaEvento";

export const metadata: Metadata = { title: "Publicar un evento · Somos Nosotros", robots: { index: false, follow: false } };

/**
 * Publicar un evento por pasos (OL-300, bitácora 328; prototipo firmado `publicar-por-pasos.html`, bitácora 323). Convive con el alta de
 * siempre (`/nuevo`) mientras se construye la serie y ningún botón lleva aquí todavía: se abre por la dirección para probarla. Pide sesión
 * igual que `/nuevo` (antes de ver nada; vuelve aquí al entrar). `?ciudad=` es la ciudad desde la que se entra, como en `/nuevo`.
 */
export default async function NuevoEventoPorPasos({ searchParams }: { searchParams: Promise<{ ciudad?: string }> }) {
  const { ciudad } = await searchParams;
  const aqui = `/nuevo/evento${ciudad ? `?ciudad=${encodeURIComponent(ciudad)}` : ""}`;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(aqui)}`);
  const supabase = await clienteServidor();
  // Los mismos lugares que `/nuevo`: los privados de la cuenta entran por la política de lectura y «¿Dónde es?» los marca «Privado».
  const cartelActivo = lecturaDeCartelActiva();
  const [ciudades, { data: lugares }, mios, cupo] = await Promise.all([
    cargarCiudades(),
    supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre") ?? { data: [] },
    cargarMisArtistas(actual.perfil.id),
    cartelActivo ? cupoDeCartel() : null,
  ]);
  return <AltaEvento accion={crearEvento} lugares={(lugares ?? []) as LugarResumen[]} mios={mios} ciudadContexto={ciudadDesdeSlug(ciudad, ciudades)} salida={{ href: "/", texto: "Volver" }} volverA={aqui} usuarioId={actual.perfil.id} cartelActivo={cartelActivo} cupo={cupo} />;
}
