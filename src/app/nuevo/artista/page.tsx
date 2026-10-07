import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { actualizarArtista, crearArtista } from "@/app/artistas/acciones";
import { enlaceAltaArtista, tituloDeAlta } from "@/lib/armazon";
import { DISCIPLINAS, type Disciplina, type Subcategoria } from "@/lib/artistas";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import AltaArtista from "./AltaArtista";

export const metadata: Metadata = { title: `${tituloDeAlta("artista")} · Somos Nosotros`, robots: { index: false, follow: false } };

type Consulta = { ciudad?: string; nombre?: string };

/** Las subcategorías ya usadas en cada disciplina, las más usadas primero (`subcategorias_de`, OL-101): una consulta por disciplina, juntas. */
async function cargarSubcategorias(): Promise<Partial<Record<Disciplina, Subcategoria[]>>> {
  const supabase = await clienteServidor();
  if (!supabase) return {};
  const filas = await Promise.all(DISCIPLINAS.map(async ({ valor }) => [valor, ((await supabase.rpc("subcategorias_de", { p_disciplina: valor })).data ?? []) as Subcategoria[]] as const));
  return Object.fromEntries(filas);
}

/**
 * Registrar un artista por pasos (OL-316; prototipo firmado `lugar-artista-por-pasos.html`, casos 5 a 7, bitácora 342). `/nuevo?tipo=artista`
 * llega aquí con un 308 (el proxy). Pide sesión antes de ver nada y vuelve aquí, con la misma dirección, al entrar. Lo de la consulta es
 * opcional:
 * - `ciudad`: la ciudad que se veía en Artistas: es la del artista de entrada (OL-100; se cambia en «Revisa») y la llevan los enlaces de la
 *   tira. Sin ella, la inicial, a la vista en «Revisa».
 * - `nombre`: lo que se buscó y no se encontró (Buscar): el primer paso abre con él.
 * Las subcategorías de cada disciplina se piden aquí, de una vez, para que «¿Qué tipo de …?» las tenga al llegar.
 */
export default async function NuevoArtistaPorPasos({ searchParams }: { searchParams: Promise<Consulta> }) {
  const { ciudad, nombre } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(enlaceAltaArtista({ ciudad, nombre }))}`);
  const [ciudades, subcategorias] = await Promise.all([cargarCiudadesDeArtistas(), cargarSubcategorias()]);
  // Un artista no tiene punto del que deducir ciudad: de entrada, la que la persona tenía elegida en Artistas; se cambia en «Revisa».
  const ciudadArtista = ciudadPorSlug(ciudad, ciudades);
  return (
    <AltaArtista
      accion={crearArtista}
      actualizar={actualizarArtista}
      subcategorias={subcategorias}
      ciudades={ciudades}
      conCiudad={ciudad ?? null}
      salida={{ href: `/artistas${ciudadArtista.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${ciudadArtista.slug}`}`, texto: "Artistas" }}
      usuarioId={actual.perfil.id}
      esAdmin={actual.perfil.rol === "admin"}
      arranque={{ nombre: nombre?.trim().slice(0, 80) ?? "", ciudad: ciudadArtista.nombre }}
    />
  );
}
