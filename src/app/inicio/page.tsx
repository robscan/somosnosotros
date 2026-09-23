import type { Metadata } from "next";
import Inicio from "@/components/Inicio";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { filtrarAgenda } from "@/lib/agenda";
import { cargarAgenda } from "@/lib/cargarAgenda";
import { cargarEventosSemana } from "@/lib/cargarEventosSemana";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { enOrden, tarjetaEvento } from "@/lib/destacados";
import { carrilPopulares, sinRepetidos } from "@/lib/inicio";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

type SearchParams = { ciudad?: string };

/**
 * Título propio y canonical con la ciudad (mismo criterio que Agenda, Lugares y Artistas: OL-059). Sin `openGraph`
 * ni `twitter` propios: Inicio no reemplaza a la Agenda como lo que se comparte o indexa (docs/rediseno/41,
 * "Dónde vive la pantalla" — la lista plana de eventos en `/` sigue siendo lo que Google rastrea).
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudades();
  const resuelta = ciudadPorSlug(slug, ciudades);
  const canonical = resuelta.slug === CIUDAD_INICIAL.slug ? "/inicio" : `/inicio?ciudad=${resuelta.slug}`;
  return {
    title: "Inicio · Somos Nosotros",
    description: "Lo tuyo primero: tus lugares y artistas, lo destacado, lo cercano y lo popular de esta semana.",
    alternates: { canonical },
  };
}

export default async function InicioPagina({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug } = await searchParams;
  const [ciudades, actual] = await Promise.all([cargarCiudades(), usuarioActual()]);
  const ciudad = ciudadPorSlug(slug, ciudades);
  const usuarioId = actual?.perfil.id ?? null;
  const supabase = await clienteServidor();
  const [agenda, semanaLugares, semanaArtistas, filaSeguidosArtistas] = await Promise.all([
    cargarAgenda(ciudad, usuarioId, supabase),
    cargarEventosSemana(supabase, "lugares", ciudad.nombre),
    cargarEventosSemana(supabase, "artistas", ciudad.nombre),
    usuarioId && supabase ? supabase.from("seguimientos").select("artista_id").eq("usuario_id", usuarioId).not("artista_id", "is", null).limit(1000) : Promise.resolve({ data: null as { artista_id: string }[] | null }),
  ]);
  const seguidosArtistas = usuarioId ? ((filaSeguidosArtistas.data ?? []) as { artista_id: string }[]).map((x) => x.artista_id) : null;

  const ahora = new Date();
  // Orden de cálculo = orden de dedup (doc 41, "Sin duplicar eventos"): favoritos, destacados y populares se
  // reparten los eventos sin repetirse; Cercanos (carril 3, cliente, con ubicación) recibe el conjunto ya usado
  // para tampoco repetirlos, aunque en pantalla vaya antes que Populares — el detalle exacto de a quién le toca un
  // evento que calificaría para Cercanos y para Populares a la vez queda anotado en la bitácora 188, no lo pidió
  // el founder con ese nivel de detalle.
  const vistos = new Set<string>();
  const favoritos = sinRepetidos(filtrarAgenda(agenda.eventos, { filtro: "siguiendo", punto: null, seguidos: agenda.seguidos, eventosSeguidos: agenda.eventosSeguidos, fecha: "", ahora }).lista, vistos);
  const destacadosEnOrden = sinRepetidos(enOrden(agenda.destacados, agenda.eventos), vistos);
  const populares = carrilPopulares(agenda.eventos, vistos);

  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;

  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      <Inicio
        key={ciudad.slug}
        ciudad={ciudad}
        ciudades={ciudades}
        conSesion={!!actual}
        favoritos={favoritos.map((e) => tarjetaEvento(e, ahora))}
        destacados={destacadosEnOrden.map((e) => tarjetaEvento(e, ahora))}
        populares={populares.map((e) => tarjetaEvento(e, ahora))}
        semanaLugares={semanaLugares}
        semanaArtistas={semanaArtistas}
        excluirDeCercanos={[...vistos]}
        seguidosLugares={agenda.seguidos}
        seguidosArtistas={seguidosArtistas}
        asistencias={agenda.asistencias}
        avisos={avisos}
      />
      <Publicar ciudad={ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug} />
      <NavInferior />
    </main>
  );
}
