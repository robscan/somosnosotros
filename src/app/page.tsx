import ActivarAvisos from "@/components/ActivarAvisos";
import AgendaInicio from "@/components/AgendaInicio";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import type { EventoAgenda } from "@/lib/agenda";
import type { Asistencia } from "@/lib/deslizar";
import { CIUDAD_INICIAL, ciudadPorSlug, type Ciudad } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { leerTira } from "@/lib/destacados";
import { diaLocal, filtroSinPasar } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./inicio.module.css";
import type { Metadata } from "next";

/**
 * Título propio (OL-059): sin esto, Google mostraba el genérico del layout raíz para la página más buscada del
 * sitio. Título y descripción neutrales, sin nombre de ciudad (a propósito: al cambiar de ciudad desde la hoja, sin
 * recargar, esta página se reutiliza hasta 60 s sin volver a pedirle al servidor — `staleTimes` de next.config.ts —
 * así que un título por ciudad se quedaba con la ciudad anterior hasta que la persona recargaba a mano; gestión de
 * cambios lo reprodujo 3 de 3 veces). El canonical sí conserva la ciudad, igual que en Lugares y Artistas — eso no
 * depende de lo que ya esté pintado en la pestaña.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ cuenta?: string; ciudad?: string }> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudades();
  const resuelta = ciudadPorSlug(slug, ciudades);
  const esInicial = resuelta.slug === CIUDAD_INICIAL.slug;
  const titulo = "Agenda cultural · Somos Nosotros";
  const descripcion = "Qué hay hoy y esta semana en los centros culturales cerca de ti. Gratis, sin cuenta para mirar.";
  const canonical = esInicial ? "/" : `/?ciudad=${resuelta.slug}`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
    // Next reemplaza openGraph y twitter enteros: sin repetirlos aquí, esta página heredaba los del layout raíz
    // (título/descripción de San Luis Potosí, url la raíz) aunque se mirara con ?ciudad= de otra — la vista previa
    // al compartir no coincidía con lo que se veía, ni con el canonical (gestión de cambios, OL-059).
    openGraph: { title: titulo, description: descripcion, url: canonical, type: "website", images: [{ url: "/portada.png", width: 1200, height: 630 }], locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/portada.png"] },
  };
}

type Fila = Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng" | "artistas"> & { sitio_lat: number | null; sitio_lng: number | null; lugar: EventoAgenda["lugar"] | EventoAgenda["lugar"][]; artistas: { artista: { nombre: string } | { nombre: string }[] | null }[] | null };

/** La agenda de la ciudad: eventos próximos con su lugar, cuántos van, lo que la persona sigue y lo que decidió en cada evento. */
async function cargar(ciudad: Ciudad, usuarioId: string | null) {
  const supabase = await clienteServidor();
  if (!supabase) return { eventos: [] as EventoAgenda[], seguidos: usuarioId ? [] : null, eventosSeguidos: [] as string[], asistencias: usuarioId ? {} : null, destacados: [] };
  // Solo la ciudad (decisión "sin segunda ciudad"); cuántos van se cuenta en la base para los eventos cargados,
  // nunca trayendo todas las asistencias (PostgREST corta en 1 000 filas sin avisar).
  // Los empates de hora se desempatan también en la base (título, id) para que el corte de 300 no cambie entre cargas.
  const [e, s, destacados] = await Promise.all([
    supabase.from("eventos").select("id, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, sitio_lat, sitio_lng, creado_en, ciudad, lugar:lugares(nombre, portada, lat, lng), artistas:eventos_artistas(artista:artistas(nombre))").eq("visible", true).eq("ciudad", ciudad.nombre).or(filtroSinPasar()).order("inicio").order("titulo").order("id").limit(300),
    // Lo que sigue una sola persona: tope de sobra para no depender del corte silencioso de PostgREST.
    usuarioId ? supabase.from("seguimientos").select("lugar_id, artista_id").eq("usuario_id", usuarioId).limit(1000) : Promise.resolve({ data: null }),
    leerTira(supabase, "eventos", ciudad.nombre),
  ]);
  const ids = (e.data ?? []).map((x) => x.id as string);
  // Cuántos van y, con sesión, qué decidió la persona en esos eventos (se ve en el renglón y cambia al deslizar).
  const [a, m] = await Promise.all([
    ids.length ? supabase.rpc("van_por_evento", { ids }) : Promise.resolve({ data: [] as { evento_id: string; n: number }[] }),
    usuarioId && ids.length ? supabase.from("asistencias").select("evento_id, estado").eq("usuario_id", usuarioId).in("evento_id", ids).limit(1000) : Promise.resolve({ data: [] as { evento_id: string; estado: string }[] }),
  ]);
  const asistencias: Record<string, Exclude<Asistencia, null>> | null = usuarioId ? {} : null;
  for (const fila of (m.data ?? []) as { evento_id: string; estado: string }[]) {
    if (asistencias && (fila.estado === "voy" || fila.estado === "me_interesa")) asistencias[fila.evento_id] = fila.estado;
  }
  const seguimientos = (s.data ?? []) as { lugar_id: string | null; artista_id: string | null }[];
  const artistasSeguidos = seguimientos.map((x) => x.artista_id).filter((x): x is string => !!x);
  // Eventos en los que se presenta un artista que sigue: entran en "Siguiendo" (Artistas, decisión 10).
  // Tope de sobra (más artistas seguidos que fechas cabrían) para no depender del corte silencioso de PostgREST.
  const ea = artistasSeguidos.length ? await supabase.from("eventos_artistas").select("evento_id").in("artista_id", artistasSeguidos).limit(1000) : { data: [] as { evento_id: string }[] };
  const eventosSeguidos = [...new Set((ea.data ?? []).map((x) => x.evento_id as string))];
  const van = new Map<string, number>();
  for (const fila of (a.data ?? []) as { evento_id: string; n: number }[]) van.set(fila.evento_id, Number(fila.n));
  const eventos: EventoAgenda[] = [];
  for (const fila of (e.data ?? []) as unknown as (Fila & { ciudad: string })[]) {
    const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
    // Quién se presenta, solo el nombre: sirve al buscador ("camerata" halla su concierto).
    const artistas = (fila.artistas ?? []).map((x) => (Array.isArray(x.artista) ? x.artista[0] : x.artista)?.nombre).filter((n): n is string => !!n);
    eventos.push({ ...fila, lugar, artistas, lat: fila.sitio_lat, lng: fila.sitio_lng, van: van.get(fila.id) ?? 0 });
  }
  const seguidos = usuarioId ? seguimientos.map((x) => x.lugar_id).filter((x): x is string => !!x) : null;
  return { eventos, seguidos, eventosSeguidos, asistencias, destacados };
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cuenta?: string; ciudad?: string }> }) {
  const { cuenta, ciudad: slug } = await searchParams;
  // Las ciudades salen de los lugares que hay (crecimiento orgánico, decisión del founder 2026-09-16).
  const [ciudades, actual] = await Promise.all([cargarCiudades(), usuarioActual()]);
  const ciudad = ciudadPorSlug(slug, ciudades);
  const { eventos, seguidos, eventosSeguidos, asistencias, destacados } = await cargar(ciudad, actual?.perfil.id ?? null);
  const aviso = cuenta === "borrada" ? "Tu cuenta quedó borrada. Gracias por haber estado." : null;
  // La pregunta de avisos tras el primer Voy al deslizar, como en la ficha.
  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;

  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      {aviso && (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      )}
      <AgendaInicio
        key={ciudad.slug}
        eventos={eventos}
        seguidos={seguidos}
        eventosSeguidos={eventosSeguidos}
        ciudad={ciudad}
        ciudades={ciudades}
        hoy={diaLocal(new Date(), ciudad.zona)}
        zona={ciudad.zona}
        asistencias={asistencias}
        avisos={avisos}
        destacados={destacados}
        antes={actual?.perfil.avisos_push ? <ActivarAvisos llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} /> : null}
      />
      <Publicar />
      <NavInferior />
    </main>
  );
}
