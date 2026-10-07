import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cargarMisArtistas, cargarQuien } from "@/app/artistas/consultas";
import { crearEvento, cupoDeCartel } from "@/app/eventos/acciones";
import { descartarSugerencia, ligarExposicionSugerida, publicarExposicionSugerida, relacionarFestivalSugerido, sugerenciaAlPublicar, unirParecidoSugerido } from "@/app/eventos/sugerencias";
import { enlaceAltaEvento } from "@/lib/armazon";
import { lecturaDeCartelActiva } from "@/lib/cartel";
import { cargarCiudades } from "@/lib/ciudades";
import { ciudadDesdeSlug } from "@/lib/direccionContexto";
import { hrefEvento } from "@/lib/eventos";
import { esUuid } from "@/lib/formulario";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { arranqueDe, respuestasDeEvento, type EventoBase } from "./arranque";
import AltaEvento from "./AltaEvento";
import { cargarContextoClase } from "./contextoClase";

export const metadata: Metadata = { title: "Publicar un evento · Somos Nosotros", robots: { index: false, follow: false } };

type Consulta = { lugar?: string; artista?: string; desde?: string; ciudad?: string; festival?: string };

/**
 * Publicar un evento por pasos (OL-300, bitácora 328; prototipo firmado `publicar-por-pasos.html`, bitácora 323): la única alta de evento
 * desde OL-312 (`/nuevo` sin tipo, con `tipo=evento` o con un evento ya armado redirige aquí). Pide sesión antes de ver nada y vuelve aquí,
 * con la misma dirección, al entrar. Todo lo de la consulta es opcional y lo ilegible se ignora (un id que no es id, o que no aparece):
 * - `lugar`: «Publicar aquí» desde la ficha de un lugar del directorio. El sitio queda contestado y «¿Dónde es?» no se pregunta (en «Revisa»
 *   se cambia). La ✕ vuelve a esa ficha.
 * - `artista`: «Publicar fecha» desde la ficha de un artista: Quién empieza con él. La ✕ vuelve a su ficha.
 * - `desde`: duplicar un evento. Se lee como antes en `/nuevo` (con la sesión de quien entra: lo que la política de lectura le deja ver).
 *   Las respuestas empiezan con su nombre, sitio, costo, quién, descripción y enlace; el día y la hora se preguntan y el cartel no se copia.
 *   Entra ya en «¿Qué día es?». La ✕ vuelve al evento.
 * - `ciudad`: la ciudad desde la que se entra, una pista más para buscar el sitio.
 * - `festival`: «Agregar otra actividad» de un festival (OL-321): «Parte de un festival» ya puesto con él, si es uno que se puede elegir
 *   (propio o, para la administración, cualquiera). La ✕ vuelve a su ficha.
 */
export default async function NuevoEventoPorPasos({ searchParams }: { searchParams: Promise<Consulta> }) {
  const { lugar, artista, desde, ciudad, festival } = await searchParams;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(enlaceAltaEvento({ lugar, artista, desde, ciudad, festival }))}`);
  const supabase = await clienteServidor();
  // Los privados de la cuenta entran por la política de lectura y «¿Dónde es?» los marca «Privado».
  const cartelActivo = lecturaDeCartelActiva();
  const [ciudades, { data: lugares }, mios, cupo, base, quienBase, delArtista, contexto] = await Promise.all([
    cargarCiudades(),
    supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre") ?? { data: [] },
    cargarMisArtistas(actual.perfil.id),
    cartelActivo ? cupoDeCartel() : null,
    desde && esUuid(desde) && supabase
      ? supabase.from("eventos").select("id, slug, titulo, lugar_id, precio, descripcion, enlace, sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, ciudad").eq("id", desde).maybeSingle().then(({ data }) => data as (EventoBase & { id: string; slug: string | null }) | null)
      : null,
    desde && esUuid(desde) ? cargarQuien(desde) : [],
    artista && esUuid(artista) && supabase ? supabase.from("artistas").select("id, nombre").eq("id", artista).maybeSingle().then(({ data }) => data as { id: string; nombre: string } | null) : null,
    cargarContextoClase(supabase, { id: actual.perfil.id, admin: actual.perfil.rol === "admin" }),
  ]);
  // El festival se toma solo de los que se pueden elegir: nunca uno ajeno por la dirección.
  const delFestival = festival && esUuid(festival) ? (contexto.festivales.find((f) => f.id === festival) ?? null) : null;
  const registrados = (lugares ?? []) as LugarResumen[];
  const delLugar = lugar && esUuid(lugar) ? (registrados.find((l) => l.id === lugar) ?? null) : null;
  const arranque = arranqueDe({
    desde: base ? respuestasDeEvento(base, registrados, quienBase.map((q) => ({ id: q.id, nombre: q.nombre }))) : null,
    lugar: delLugar,
    artista: delArtista,
    festival: delFestival,
  });
  // La ✕ vuelve a la ficha desde la que se entró (el evento que se duplica, el lugar o el artista); sin ninguna, al inicio.
  const salida = base ? hrefEvento(base) : delFestival ? `/eventos/${delFestival.id}` : delLugar ? `/lugares/${delLugar.id}` : delArtista ? `/artistas/${delArtista.id}` : "/";
  return (
    <AltaEvento
      accion={crearEvento}
      lugares={registrados}
      mios={mios}
      ciudadContexto={ciudadDesdeSlug(ciudad, ciudades)}
      salida={{ href: salida, texto: "Volver" }}
      usuarioId={actual.perfil.id}
      cartelActivo={cartelActivo}
      cupo={cupo}
      arranque={arranque}
      contexto={contexto}
      sugerencias={{ buscar: sugerenciaAlPublicar, publicarExposicion: publicarExposicionSugerida, ligarExposicion: ligarExposicionSugerida, relacionarFestival: relacionarFestivalSugerido, unirParecido: unirParecidoSugerido, descartar: descartarSugerencia }}
    />
  );
}
