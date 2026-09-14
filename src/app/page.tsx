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
  if (!supabase) return { eventos: [] as EventoAgenda[], seguidos: usuarioId ? [] : null, hayLugares: false, porCiudad: new Map<string, number>() };
  const desde = desdeReciente();
  const [e, l, a, s] = await Promise.all([
    supabase.from("eventos").select("id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, sitio_lat, sitio_lng, creado_en, ciudad, lugar:lugares(nombre, portada, lat, lng)").eq("visible", true).gte("inicio", desde).order("inicio").limit(300),
    supabase.from("lugares").select("id", { count: "exact", head: true }).eq("visible", true).eq("ciudad", ciudad.nombre),
    supabase.from("asistencias").select("evento_id").eq("estado", "voy"),
    usuarioId ? supabase.from("seguimientos").select("lugar_id").eq("usuario_id", usuarioId) : Promise.resolve({ data: null }),
  ]);
  const van = new Map<string, number>();
  for (const fila of a.data ?? []) van.set(fila.evento_id as string, (van.get(fila.evento_id as string) ?? 0) + 1);
  const porCiudad = new Map<string, number>();
  const eventos: EventoAgenda[] = [];
  for (const fila of (e.data ?? []) as unknown as (Fila & { ciudad: string })[]) {
    porCiudad.set(fila.ciudad, (porCiudad.get(fila.ciudad) ?? 0) + 1);
    if (fila.ciudad !== ciudad.nombre) continue;
    const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
    eventos.push({ ...fila, lugar, lat: fila.sitio_lat, lng: fila.sitio_lng, van: van.get(fila.id) ?? 0 });
  }
  const seguidos = usuarioId ? ((s.data ?? []) as { lugar_id: string }[]).map((x) => x.lugar_id) : null;
  return { eventos, seguidos, hayLugares: (l.count ?? 0) > 0, porCiudad };
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cuenta?: string; ciudad?: string; borrado?: string }> }) {
  const { cuenta, ciudad: slug, borrado } = await searchParams;
  const ciudad = ciudadPorSlug(slug);
  const actual = await usuarioActual();
  const { eventos, seguidos, hayLugares, porCiudad } = await cargar(ciudad, actual?.perfil.id ?? null);
  const ciudades = CIUDADES.map((c) => ({ ...c, eventos: porCiudad.get(c.nombre) ?? 0 })).filter((c) => c.eventos > 0 || c.slug === ciudad.slug);
  const aviso = cuenta === "borrada" ? "Tu cuenta quedó borrada. Gracias por haber estado." : borrado === "lugar" ? "Lugar borrado." : borrado === "evento" ? "Evento borrado." : null;

  return (
    <main className="raiz">
      <div className="cabecera-raiz">
        <Barra derecha={<Sesion />} />
      </div>
      {aviso && (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      )}
      <AgendaInicio eventos={eventos} seguidos={seguidos} ciudad={ciudad} ciudades={ciudades} hoy={diaLocal(new Date())} />
      <Publicar hayLugares={hayLugares} />
      <NavInferior />
    </main>
  );
}
