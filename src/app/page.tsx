import type { Metadata } from "next";
import { cargarPersona, type Persona } from "@/app/personas/consultas";
import Inicio from "@/components/Inicio";
import CarrilAgenda from "@/components/inicio/CarrilAgenda";
import CarrilAhora from "@/components/inicio/CarrilAhora";
import CarrilEntidad from "@/components/inicio/CarrilEntidad";
import CarrilTusPlanes from "@/components/inicio/CarrilTusPlanes";
import CarrilMasAdelante from "@/components/inicio/CarrilMasAdelante";
import { hrefAgenda, SIN_FILTROS } from "@/lib/agenda";
import { cargarAgenda } from "@/lib/cargarAgenda";
import { cargarArtistasDestacados, TOPE_ARTISTAS_DESTACADOS } from "@/lib/cargarArtistasDestacados";
import { cargarEventosSemana } from "@/lib/cargarEventosSemana";
import { CIUDAD_INICIAL, ciudadPorSlug, hrefConCiudad } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { diaLocal } from "@/lib/fechas";
import { conNovedades, seleccionarArtistasSemana } from "@/lib/eventosSemana";
import { leerNovedadesRecientes } from "@/lib/novedadesArtista";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { tarjetaArtistaDeInicio } from "@/lib/tarjetaInicio";
import plantilla from "@/components/ui/Plantilla.module.css";

type SearchParams = { ciudad?: string };

/**
 * La app abre siempre en Inicio (OL-156, segunda vuelta): esta pantalla es la raíz del dominio. Título propio y
 * canonical con la ciudad (mismo criterio que Agenda, Lugares y Artistas: OL-059). Sin `openGraph` ni `twitter`
 * propios: comparte los del layout raíz, pensados para la portada del sitio.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudades(true);
  const resuelta = ciudadPorSlug(slug, ciudades);
  const canonical = resuelta.slug === CIUDAD_INICIAL.slug ? "/" : `/?ciudad=${resuelta.slug}`;
  return {
    title: "Somos Nosotros",
    description: "Lo tuyo primero: tus planes, lo destacado de esta semana, lo nuevo, y lugares y artistas de tu ciudad.",
    alternates: { canonical },
  };
}

/**
 * Carga progresiva (pedido del founder tras probar en producción, OL-156): esta función solo espera la ciudad y la
 * sesión —rápidas, un par de consultas chicas— antes de pintar el shell entero (cabecera, barra). Las consultas de
 * los carriles (agenda, "Tus planes"/`cargarPersona`, lugares y artistas de la semana, artistas destacados) NUNCA se
 * esperan aquí: se pasan como promesas sin resolver a cada carril (un componente de servidor propio, dentro de su
 * `<Suspense>` en `Inicio.tsx`), que las espera por su cuenta y transmite (streaming del App Router) en cuanto
 * responde. Antes de esta pieza, `InicioPagina` esperaba todo con un solo `Promise.all` y Next mostraba el cargador
 * de página completa (`app/loading.tsx`, el logo SN) hasta que la consulta más lenta terminaba; con esto, esa
 * pantalla nunca vuelve a aparecer para esta ruta.
 */
export default async function InicioPagina({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug } = await searchParams;
  const [ciudades, actual] = await Promise.all([cargarCiudades(true), usuarioActual()]);
  const ciudad = ciudadPorSlug(slug, ciudades);
  const usuarioId = actual?.perfil.id ?? null;
  const supabase = await clienteServidor();
  const ahora = new Date();

  // Sin await: cada promesa viaja tal cual a su carril, que la espera dentro de su propio <Suspense>.
  const agendaPromise = cargarAgenda(ciudad, usuarioId, supabase);
  const semanaLugaresPromise = cargarEventosSemana(supabase, "lugares", ciudad.nombre, ahora);
  // «Artistas destacadxs» con la tarjeta de un evento (OL-372, E9): con su disciplina y su género.
  const artistasDestacadosPromise = cargarArtistasDestacados(supabase, ciudad.nombre, ahora).then((lista) => lista.map((a) => tarjetaArtistaDeInicio(a, ahora)));
  // «Artistas de la semana» (OL-253): quien ya sale en «Artistas destacadxs» no se repite aquí. Con la novedad vigente de cada uno (OL-372, E5:
  // «Nuevo video» o «Nuevo audio» bajo el avatar), en una sola lectura para el lote; si falla, el carril sale igual, sin novedades.
  const semanaArtistasPromise = Promise.all([cargarEventosSemana(supabase, "artistas", ciudad.nombre, ahora), artistasDestacadosPromise])
    .then(([semana, destacados]) => seleccionarArtistasSemana(semana, destacados, TOPE_ARTISTAS_DESTACADOS))
    .then(async (semana) => conNovedades(semana, await leerNovedadesRecientes(supabase, ciudad.nombre, semana.map((t) => t.id)), ahora));
  // «Tus planes» (OL-219): Voy + Me interesa, la misma consulta que ya usa Mi perfil (`cargarPersona`), sin filtro
  // de ciudad (un compromiso ya hecho no deja de ser tuyo por cambiar de ciudad en Inicio). Los demás carriles
  // le restan sus eventos al cargar con `agenda.asistencias` (`calcularCarrilesAgenda`), no con esta consulta.
  const personaPromise: Promise<Persona | null> = usuarioId ? cargarPersona(usuarioId) : Promise.resolve(null);

  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;

  /** El enlace de cada carril («Ver la agenda», «Ver lugares»…) conserva la ciudad que se está viendo (OL-055). */
  const slugEnUrl = ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug;
  const conCiudad = (raiz: string) => (slugEnUrl ? `${raiz}?ciudad=${slugEnUrl}` : raiz);

  return (
    <main className={plantilla.raiz}>
      <Inicio
        key={ciudad.slug}
        ciudad={ciudad}
        ciudades={ciudades}
        hoy={diaLocal(ahora, ciudad.zona)}
        zona={ciudad.zona}
        agenda={agendaPromise}
        conSesion={!!actual}
        // Sin sesión, ni se construye: pasar el elemento igual lo haría ejecutarse (RSC renderiza cualquier hijo de
        // servidor que cruce a un componente de cliente, aunque ese cliente decida no montarlo) y filtraría "Tus
        // planes" al streaming de alguien sin cuenta, sin necesidad (OL-219).
        slotAhora={<CarrilAhora agendaPromise={agendaPromise} ciudad={ciudad.nombre} conSesion={!!actual} />}
        slotTusPlanes={actual ? <CarrilTusPlanes personaPromise={personaPromise} avisos={avisos} verTodosHref="/perfil" /> : null}
        slotEstelar={<CarrilAgenda parte="estelar" agendaPromise={agendaPromise} avisos={avisos} verTodosHref={conCiudad("/agenda")} />}
        slotEstaSemana={<CarrilAgenda parte="estaSemana" agendaPromise={agendaPromise} avisos={avisos} verTodosHref={conCiudad("/agenda")} />}
        // «Festivales y expos» (OL-342): la agenda no tiene un «Qué» que junte las dos clases, así que su enlace va a la agenda sin filtro
        // («Todo»: los festivales en sus bloques por día y las exposiciones en «Para visitar hoy»). Antes, «Para visitar» iba a «Qué» en Exposiciones.
        slotFestivales={<CarrilAgenda parte="festivales" agendaPromise={agendaPromise} avisos={avisos} verTodosHref={hrefAgenda(SIN_FILTROS, slugEnUrl)} />}
        slotNuevos={<CarrilAgenda parte="nuevos" ciudad={ciudad.slug} agendaPromise={agendaPromise} avisos={avisos} verTodosHref={hrefAgenda(SIN_FILTROS, slugEnUrl, true)} />}
        slotMasAdelante={<CarrilMasAdelante agendaPromise={agendaPromise} avisos={avisos} verTodosHref={hrefConCiudad("/agenda", ciudad.slug)} />}
        // OL-372 (prototipo firmado, E5 y E9): lugares y artistas de la semana en avatares de 64, «Artistas destacadxs» con la tarjeta de un evento;
        // ninguno lleva botón (seguir queda en la ficha).
        slotLugaresSemana={<CarrilEntidad promise={semanaLugaresPromise} que="lugar" titulo="Lugares de la semana" memoria="inicio-lugares-semana" verTodosHref={conCiudad("/lugares")} forma="avatar" />}
        slotArtistasSemana={<CarrilEntidad promise={semanaArtistasPromise} que="artista" titulo="Artistas de la semana" memoria="inicio-artistas-semana" verTodosHref={conCiudad("/artistas")} forma="avatar" />}
        slotArtistasDestacados={<CarrilEntidad promise={artistasDestacadosPromise} que="artista" titulo="Artistas destacadxs" memoria="inicio-artistas-destacados" verTodosHref={conCiudad("/artistas")} forma="artista" />}
      />
    </main>
  );
}
