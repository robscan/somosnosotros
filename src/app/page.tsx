import AgendaInicio from "@/components/AgendaInicio";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import type { EventoAgenda } from "@/lib/agenda";
import { CIUDADES, ciudadPorSlug, type Ciudad } from "@/lib/ciudad";
import { desdeReciente, diaLocal } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./inicio.module.css";

type Fila = Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng"> & { sitio_lat: number | null; sitio_lng: number | null; lugar: EventoAgenda["lugar"] | EventoAgenda["lugar"][] };

/** La agenda de la ciudad: eventos próximos con su lugar, cuántos van, y los lugares que la persona sigue. */
async function cargar(ciudad: Ciudad, usuarioId: string | null) {
  const supabase = await clienteServidor();
  if (!supabase) return { eventos: [] as EventoAgenda[], seguidos: usuarioId ? [] : null, eventosSeguidos: [] as string[], hayLugares: false, porCiudad: new Map<string, number>() };
  const desde = desdeReciente();
  // Solo la ciudad (decisión "sin segunda ciudad"); cuántos van se cuenta en la base para los eventos cargados,
  // nunca trayendo todas las asistencias (PostgREST corta en 1 000 filas sin avisar).
  const [e, l, s] = await Promise.all([
    supabase.from("eventos").select("id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, sitio_lat, sitio_lng, creado_en, ciudad, lugar:lugares(nombre, portada, lat, lng)").eq("visible", true).eq("ciudad", ciudad.nombre).gte("inicio", desde).order("inicio").limit(300),
    supabase.from("lugares").select("id", { count: "exact", head: true }).eq("visible", true).eq("ciudad", ciudad.nombre),
    usuarioId ? supabase.from("seguimientos").select("lugar_id, artista_id").eq("usuario_id", usuarioId) : Promise.resolve({ data: null }),
  ]);
  const ids = (e.data ?? []).map((x) => x.id as string);
  const a = ids.length ? await supabase.rpc("van_por_evento", { ids }) : { data: [] as { evento_id: string; n: number }[] };
  const seguimientos = (s.data ?? []) as { lugar_id: string | null; artista_id: string | null }[];
  const artistasSeguidos = seguimientos.map((x) => x.artista_id).filter((x): x is string => !!x);
  // Eventos en los que se presenta un artista que sigue: entran en "Siguiendo" (Artistas, decisión 10).
  const ea = artistasSeguidos.length ? await supabase.from("eventos_artistas").select("evento_id").in("artista_id", artistasSeguidos) : { data: [] as { evento_id: string }[] };
  const eventosSeguidos = [...new Set((ea.data ?? []).map((x) => x.evento_id as string))];
  const van = new Map<string, number>();
  for (const fila of (a.data ?? []) as { evento_id: string; n: number }[]) van.set(fila.evento_id, Number(fila.n));
  const porCiudad = new Map<string, number>();
  const eventos: EventoAgenda[] = [];
  for (const fila of (e.data ?? []) as unknown as (Fila & { ciudad: string })[]) {
    porCiudad.set(fila.ciudad, (porCiudad.get(fila.ciudad) ?? 0) + 1);
    if (fila.ciudad !== ciudad.nombre) continue;
    const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
    eventos.push({ ...fila, lugar, lat: fila.sitio_lat, lng: fila.sitio_lng, van: van.get(fila.id) ?? 0 });
  }
  const seguidos = usuarioId ? seguimientos.map((x) => x.lugar_id).filter((x): x is string => !!x) : null;
  return { eventos, seguidos, eventosSeguidos, hayLugares: (l.count ?? 0) > 0, porCiudad };
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cuenta?: string; ciudad?: string; borrado?: string }> }) {
  const { cuenta, ciudad: slug, borrado } = await searchParams;
  const ciudad = ciudadPorSlug(slug);
  const actual = await usuarioActual();
  const { eventos, seguidos, eventosSeguidos, hayLugares, porCiudad } = await cargar(ciudad, actual?.perfil.id ?? null);
  const ciudades = CIUDADES.map((c) => ({ ...c, eventos: porCiudad.get(c.nombre) ?? 0 })).filter((c) => c.eventos > 0 || c.slug === ciudad.slug);
  const aviso = cuenta === "borrada" ? "Tu cuenta quedó borrada. Gracias por haber estado." : borrado === "lugar" ? "Lugar borrado." : borrado === "evento" ? "Evento borrado." : null;

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
