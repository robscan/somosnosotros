import type { Metadata } from "next";
import { permanentRedirect, redirect } from "next/navigation";
import { crearArtista } from "@/app/artistas/acciones";
import { crearLugar } from "@/app/lugares/acciones";
import { altaDeParametro, enlaceAltaEvento, redireccionDeNuevo, tituloDeAlta } from "@/lib/armazon";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades, cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { puntoDeTexto } from "@/lib/geo";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import Alta from "./Alta";

type Consulta = { tipo?: string; lugar?: string; desde?: string; artista?: string; ciudad?: string; nombre?: string; lat?: string; lng?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Consulta> }): Promise<Metadata> {
  const { tipo } = await searchParams;
  return { title: `${tituloDeAlta(altaDeParametro(tipo))} · Somos Nosotros`, robots: { index: false, follow: false } };
}

/**
 * Registrar un lugar o un artista (docs/rediseno/50, P9), con la tira Evento · Lugar · Artista, donde «Evento» lleva al alta de evento por
 * pasos. Un evento ya no se publica aquí (OL-312): sin tipo, con `tipo=evento` o con un evento ya armado (`lugar`, `artista`, `desde`) la
 * dirección se va, permanente, a `/nuevo/evento` con los mismos datos (`redireccionDeNuevo`), antes de pedir sesión: la pide esa pantalla.
 * El tipo con el que abre (`?tipo=`) es el de la sección desde la que se tocó «+»; la ciudad que se veía (`?ciudad=`) acerca la búsqueda de
 * dirección del lugar y es la de entrada del artista (OL-100); `?nombre=` es lo que buscó quien no encontró nada (Buscar); `?lat=&lng=` es
 * el punto donde se sostuvo el dedo en el mapa de Lugares, con el lugar ya ubicado (lo ilegible o fuera de la Tierra se ignora).
 */
export default async function Nuevo({ searchParams }: { searchParams: Promise<Consulta> }) {
  const { tipo, lugar, desde, artista, ciudad: ciudadSlug, nombre, lat, lng } = await searchParams;
  const evento = redireccionDeNuevo({ tipo, lugar, desde, artista, ciudad: ciudadSlug });
  if (evento) permanentRedirect(evento);
  const actual = await usuarioActual();
  // Con o sin sesión se llega aquí; la sesión se pide después, con lo mismo por delante.
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ tipo, ciudad: ciudadSlug, nombre, lat, lng })) if (valor) consulta.set(clave, valor);
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/nuevo?${consulta}`)}`);
  const tipoInicial = altaDeParametro(tipo) === "artista" ? "artista" : "lugar";
  const supabase = await clienteServidor();

  // El lugar usa los registrados solo para avisar «ya existe», nunca para elegirlos (OL-211); la política de lectura deja pasar también los
  // privados de la propia cuenta (RLS).
  const [ciudades, { data: lugares }, ciudadesArtistas] = await Promise.all([
    cargarCiudades(),
    supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre") ?? { data: [] },
    cargarCiudadesDeArtistas(),
  ]);
  const usuarioId = actual.perfil.id;
  const esAdmin = actual.perfil.rol === "admin";
  const nombreInicial = nombre?.trim().slice(0, 80) || undefined;
  // Un artista no tiene punto del que deducir ciudad: de entrada, la que la persona tenía elegida en Artistas; se cambia en el renglón Ciudad.
  const ciudadArtista = ciudadPorSlug(ciudadSlug, ciudadesArtistas);
  return (
    <Alta
      tipoInicial={tipoInicial}
      evento={enlaceAltaEvento({ ciudad: ciudadSlug })}
      salidas={{
        lugar: { href: "/lugares", texto: "Lugares" },
        artista: { href: `/artistas${ciudadArtista.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${ciudadArtista.slug}`}`, texto: "Artistas" },
      }}
      lugar={{
        accion: crearLugar,
        usuarioId,
        nombreInicial,
        puntoInicial: puntoDeTexto(lat, lng) ?? undefined,
        esAdmin,
        lugares: (lugares ?? []) as LugarResumen[],
        // Sin `?ciudad=` cae en San Luis Potosí -el respaldo que ya usa el listado de Lugares (`ciudadPorSlug`)-: sin él, Mapbox buscaba
        // en todo el país (corrección del gestor, revisión sobre el PR #249).
        ciudadContexto: ciudadPorSlug(ciudadSlug, ciudades),
      }}
      artista={{ accion: crearArtista, usuarioId, nombreInicial, esAdmin, ciudadInicial: ciudadArtista.nombre, ciudades: ciudadesArtistas }}
    />
  );
}
