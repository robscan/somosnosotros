import AgendaInicio from "@/components/AgendaInicio";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import type { EventoAgenda } from "@/lib/agenda";
import { ciudadPorSlug, type Ciudad } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { diaLocal, filtroSinPasar } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./inicio.module.css";

type Fila = Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng" | "artistas"> & { sitio_lat: number | null; sitio_lng: number | null; lugar: EventoAgenda["lugar"] | EventoAgenda["lugar"][]; artistas: { artista: { nombre: string } | { nombre: string }[] | null }[] | null };

/** La agenda de la ciudad: eventos próximos con su lugar, cuántos van, y los lugares que la persona sigue. */
async function cargar(ciudad: Ciudad, usuarioId: string | null) {
  const supabase = await clienteServidor();
  if (!supabase) return { eventos: [] as EventoAgenda[], seguidos: usuarioId ? [] : null, eventosSeguidos: [] as string[], hayLugares: false };
  // Solo la ciudad (decisión "sin segunda ciudad"); cuántos van se cuenta en la base para los eventos cargados,
  // nunca trayendo todas las asistencias (PostgREST corta en 1 000 filas sin avisar).
  // Los empates de hora se desempatan también en la base (título, id) para que el corte de 300 no cambie entre cargas.
  const [e, l, s] = await Promise.all([
    supabase.from("eventos").select("id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, sitio_lat, sitio_lng, creado_en, ciudad, lugar:lugares(nombre, portada, lat, lng), artistas:eventos_artistas(artista:artistas(nombre))").eq("visible", true).eq("ciudad", ciudad.nombre).or(filtroSinPasar()).order("inicio").order("titulo").order("id").limit(300),
    supabase.from("lugares").select("id", { count: "exact", head: true }).eq("visible", true).eq("ciudad", ciudad.nombre),
    // Lo que sigue una sola persona: tope de sobra para no depender del corte silencioso de PostgREST.
    usuarioId ? supabase.from("seguimientos").select("lugar_id, artista_id").eq("usuario_id", usuarioId).limit(1000) : Promise.resolve({ data: null }),
  ]);
  const ids = (e.data ?? []).map((x) => x.id as string);
  const a = ids.length ? await supabase.rpc("van_por_evento", { ids }) : { data: [] as { evento_id: string; n: number }[] };
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
  return { eventos, seguidos, eventosSeguidos, hayLugares: (l.count ?? 0) > 0 };
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cuenta?: string; ciudad?: string }> }) {
  const { cuenta, ciudad: slug } = await searchParams;
  // Las ciudades salen de los lugares que hay (crecimiento orgánico, decisión del founder 2026-09-16).
  const [ciudades, actual] = await Promise.all([cargarCiudades(await clienteServidor()), usuarioActual()]);
  const ciudad = ciudadPorSlug(slug, ciudades);
  const { eventos, seguidos, eventosSeguidos, hayLugares } = await cargar(ciudad, actual?.perfil.id ?? null);
  const aviso = cuenta === "borrada" ? "Tu cuenta quedó borrada. Gracias por haber estado." : null;

  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      {aviso && (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      )}
      <AgendaInicio eventos={eventos} seguidos={seguidos} eventosSeguidos={eventosSeguidos} ciudad={ciudad} ciudades={ciudades} hoy={diaLocal(new Date())} />
      <Publicar hayLugares={hayLugares} />
      <NavInferior />
    </main>
  );
}
