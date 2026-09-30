import type { Metadata } from "next";
import { cargarPersona, type Persona } from "@/app/personas/consultas";
import Inicio from "@/components/Inicio";
import CarrilAgenda from "@/components/inicio/CarrilAgenda";
import CarrilEntidad from "@/components/inicio/CarrilEntidad";
import CarrilTusPlanes from "@/components/inicio/CarrilTusPlanes";
import { cargarAgenda } from "@/lib/cargarAgenda";
import { cargarArtistasDestacados } from "@/lib/cargarArtistasDestacados";
import { cargarEventosSemana } from "@/lib/cargarEventosSemana";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { tarjetaArtista } from "@/lib/destacados";
import { diaLocal } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import plantilla from "@/components/ui/Plantilla.module.css";

type SearchParams = { ciudad?: string };

/**
 * La app abre siempre en Inicio (OL-156, segunda vuelta): esta pantalla es la raíz del dominio. Título propio y
 * canonical con la ciudad (mismo criterio que Agenda, Lugares y Artistas: OL-059). Sin `openGraph` ni `twitter`
 * propios: comparte los del layout raíz, pensados para la portada del sitio.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudades();
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
 * los carriles (agenda, "Tus planes"/`cargarPersona`, lugares de la semana, artistas destacados) NUNCA se
 * esperan aquí: se pasan como promesas sin resolver a cada carril (un componente de servidor propio, dentro de su
 * `<Suspense>` en `Inicio.tsx`), que las espera por su cuenta y transmite (streaming del App Router) en cuanto
 * responde. Antes de esta pieza, `InicioPagina` esperaba todo con un solo `Promise.all` y Next mostraba el cargador
 * de página completa (`app/loading.tsx`, el logo SN) hasta que la consulta más lenta terminaba; con esto, esa
 * pantalla nunca vuelve a aparecer para esta ruta.
 */
export default async function InicioPagina({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug } = await searchParams;
  const [ciudades, actual] = await Promise.all([cargarCiudades(), usuarioActual()]);
  const ciudad = ciudadPorSlug(slug, ciudades);
  const usuarioId = actual?.perfil.id ?? null;
  const supabase = await clienteServidor();
  const ahora = new Date();

  // Sin await: cada promesa viaja tal cual a su carril, que la espera dentro de su propio <Suspense>.
  const agendaPromise = cargarAgenda(ciudad, usuarioId, supabase);
  const semanaLugaresPromise = cargarEventosSemana(supabase, ciudad.nombre, ahora);
  const artistasDestacadosPromise = cargarArtistasDestacados(supabase, ciudad.nombre, ahora).then((lista) => lista.map((a) => tarjetaArtista(a, ahora)));
  const seguidosArtistasPromise: Promise<string[] | null> =
    usuarioId && supabase
      ? Promise.resolve(supabase.from("seguimientos").select("artista_id").eq("usuario_id", usuarioId).not("artista_id", "is", null).limit(1000)).then((r) => ((r.data ?? []) as { artista_id: string }[]).map((x) => x.artista_id))
      : Promise.resolve(usuarioId ? [] : null);
  // «Tus planes» (OL-219): Voy + Me interesa, la misma consulta que ya usa Mi perfil (`cargarPersona`), sin filtro
  // de ciudad (un compromiso ya hecho no deja de ser tuyo por cambiar de ciudad en Inicio). No entra en la regla de
  // no repetir (OL-221): es la agenda de la persona, no un carril de descubrir.
  const personaPromise: Promise<Persona | null> = usuarioId ? cargarPersona(usuarioId) : Promise.resolve(null);
  const seguidosLugaresPromise = agendaPromise.then((a) => a.seguidos);

  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;

  /** El enlace de cada carril («Ver la agenda», «Ver lugares»…) conserva la ciudad que se está viendo (OL-055). */
  const conCiudad = (raiz: string) => (ciudad.slug === CIUDAD_INICIAL.slug ? raiz : `${raiz}?ciudad=${ciudad.slug}`);

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
        slotTusPlanes={actual ? <CarrilTusPlanes personaPromise={personaPromise} avisos={avisos} verTodosHref="/perfil" /> : null}
        slotEstelar={<CarrilAgenda parte="estelar" agendaPromise={agendaPromise} avisos={avisos} verTodosHref={conCiudad("/agenda")} />}
        slotEstaSemana={<CarrilAgenda parte="estaSemana" agendaPromise={agendaPromise} avisos={avisos} verTodosHref={conCiudad("/agenda")} />}
        slotNuevos={<CarrilAgenda parte="nuevos" agendaPromise={agendaPromise} avisos={avisos} verTodosHref={conCiudad("/agenda")} />}
        slotLugaresSemana={<CarrilEntidad promise={semanaLugaresPromise} que="lugar" seguidosPromise={seguidosLugaresPromise} avisos={avisos} titulo="Lugares con eventos" memoria="inicio-lugares-semana" verTodosHref={conCiudad("/lugares")} />}
        slotArtistasDestacados={<CarrilEntidad promise={artistasDestacadosPromise} que="artista" seguidosPromise={seguidosArtistasPromise} avisos={avisos} titulo="Artistas destacadxs" memoria="inicio-artistas-destacados" verTodosHref={conCiudad("/artistas")} grande />}
      />
    </main>
  );
}
