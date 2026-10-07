import type { Metadata } from "next";
import { permanentRedirect, redirect } from "next/navigation";
import { crearArtista } from "@/app/artistas/acciones";
import { enlaceAltaEvento, enlaceAltaLugar, redireccionDeNuevo, tituloDeAlta } from "@/lib/armazon";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { usuarioActual } from "@/lib/supabase/servidor";
import Alta from "./Alta";

type Consulta = { tipo?: string; lugar?: string; desde?: string; artista?: string; ciudad?: string; nombre?: string; lat?: string; lng?: string };

export const metadata: Metadata = { title: `${tituloDeAlta("artista")} · Somos Nosotros`, robots: { index: false, follow: false } };

/**
 * Registrar un artista (docs/rediseno/50, P9), con la tira Evento · Lugar · Artista. Un evento ya no se publica aquí (OL-312) ni un lugar se
 * registra aquí (OL-315): sin tipo, con `tipo=evento` o con un evento ya armado (`lugar`, `artista`, `desde`) la dirección se va, permanente,
 * a `/nuevo/evento` con los mismos datos, y con `tipo=lugar` a `/nuevo/lugar` con la ciudad, el nombre y el punto (`redireccionDeNuevo`; el
 * proxy ya responde 308 y esto es el respaldo), antes de pedir sesión: la pide esa pantalla. Queda el artista (`tipo=artista`): la ciudad que
 * se veía (`?ciudad=`) es la de entrada (OL-100) y `?nombre=` lo que buscó quien no encontró nada (Buscar). Su alta por pasos es OL-316.
 */
export default async function Nuevo({ searchParams }: { searchParams: Promise<Consulta> }) {
  const { tipo, lugar, desde, artista, ciudad: ciudadSlug, nombre, lat, lng } = await searchParams;
  const otra = redireccionDeNuevo({ tipo, lugar, desde, artista, ciudad: ciudadSlug, nombre, lat, lng });
  if (otra) permanentRedirect(otra);
  const actual = await usuarioActual();
  // Con o sin sesión se llega aquí; la sesión se pide después, con lo mismo por delante.
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ tipo, ciudad: ciudadSlug, nombre })) if (valor) consulta.set(clave, valor);
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/nuevo?${consulta}`)}`);
  // Un artista no tiene punto del que deducir ciudad: de entrada, la que la persona tenía elegida en Artistas; se cambia en el renglón Ciudad.
  const ciudadesArtistas = await cargarCiudadesDeArtistas();
  const ciudadArtista = ciudadPorSlug(ciudadSlug, ciudadesArtistas);
  return (
    <Alta
      evento={enlaceAltaEvento({ ciudad: ciudadSlug })}
      lugar={enlaceAltaLugar({ ciudad: ciudadSlug })}
      salida={{ href: `/artistas${ciudadArtista.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${ciudadArtista.slug}`}`, texto: "Artistas" }}
      artista={{ accion: crearArtista, usuarioId: actual.perfil.id, nombreInicial: nombre?.trim().slice(0, 80) || undefined, esAdmin: actual.perfil.rol === "admin", ciudadInicial: ciudadArtista.nombre, ciudades: ciudadesArtistas }}
    />
  );
}
