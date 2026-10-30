import type { SupabaseClient } from "@supabase/supabase-js";
import { localAIso, ZONA_INICIAL } from "@/lib/fechas";
import { sePuedePublicar } from "@/lib/instagram/elegir";
import { lunesDeLaSemana } from "@/lib/instagram/semana";
import { quedaronSinSalir, renglonSinSalir, type CasillaCola, type RenglonSinSalir, type SinSalir, type TrabajoCola } from "@/lib/redes/sinSalir";

type Lector = Pick<SupabaseClient, "from">;
type EventoLeido = { id: string; titulo: string; inicio: string; termina: string; zona: string; clase: string; visible: boolean; cancelado: boolean; borrador: boolean; retirado_por_admin: boolean; sesiones: { inicio: string }[] | null };

const COLUMNAS = "id, evento_id, artista_id, lugar_id, red, formato, pedido, estado, error, creado_en, terminado_en";
const TOPE = 200;

/** El lunes de esta semana a las 00:00, en la hora de México (la de la cola y del aviso; una ciudad en otra zona no cambia la semana en la práctica). */
export const inicioDeLaSemana = (ahora: Date) => new Date(localAIso(`${lunesDeLaSemana("esta", ahora, ZONA_INICIAL)}T00:00`, ZONA_INICIAL) ?? ahora.toISOString());

/**
 * OL-496: lo que se quedó sin salir esta semana por la conexión caducada (`lib/redes/sinSalir`), con su título y su renglón, para la hoja de la
 * conexión al volver de Meta y para la acción que lo vuelve a poner en la cola. Lee con la sesión de la administración (la cola, los días de la
 * semana de Instagram, los eventos, artistas y lugares). Lo que no se pudo leer no se ofrece: nunca se vuelve a publicar a ciegas.
 */
export async function cargarSinSalir(supabase: Lector, ahora: Date): Promise<{ lista: SinSalir[]; renglones: RenglonSinSalir[] }> {
  const vacio = { lista: [], renglones: [] };
  const desde = inicioDeLaSemana(ahora);
  const { data: caidos, error } = await supabase.from("redes_trabajos").select(COLUMNAS).eq("estado", "fallido").eq("error", "permiso").gte("terminado_en", desde.toISOString()).order("terminado_en", { ascending: false }).limit(TOPE);
  if (error || !caidos?.length) return vacio;
  const fallidos = caidos as TrabajoCola[];
  const eventos = [...new Set(fallidos.map((t) => t.evento_id).filter((x): x is string => !!x))];
  const dias = [...new Set(fallidos.map((t) => t.pedido?.casilla).filter((x): x is string => typeof x === "string"))];
  const artistas = [...new Set(fallidos.map((t) => t.artista_id).filter((x): x is string => !!x))];
  const lugares = [...new Set(fallidos.map((t) => t.lugar_id).filter((x): x is string => !!x))];
  const [otros, evs, casillas, nombresArtistas, nombresLugares] = await Promise.all([
    // Lo que pudo haberlos sustituido: los demás trabajos de esos eventos (en cola, publicándose o publicados después del fallo).
    eventos.length ? supabase.from("redes_trabajos").select(COLUMNAS).in("evento_id", eventos).in("estado", ["en_cola", "publicando", "publicado"]).limit(TOPE * 2) : Promise.resolve({ data: [], error: null }),
    eventos.length ? supabase.from("eventos").select("id, titulo, inicio, termina, zona, clase, visible, cancelado, borrador, retirado_por_admin, sesiones:eventos_sesiones(inicio)").in("id", eventos) : Promise.resolve({ data: [], error: null }),
    dias.length ? supabase.from("instagram_semana").select("id, trabajo_id, estado, tipo").in("id", dias) : Promise.resolve({ data: [], error: null }),
    artistas.length ? supabase.from("artistas").select("id, nombre").in("id", artistas) : Promise.resolve({ data: [], error: null }),
    lugares.length ? supabase.from("lugares").select("id, nombre").in("id", lugares) : Promise.resolve({ data: [], error: null }),
  ]);
  if (otros.error || evs.error || casillas.error) return vacio;
  const porId = new Map(((evs.data ?? []) as EventoLeido[]).map((e) => [e.id, e]));
  const dia = new Map(((casillas.data ?? []) as (CasillaCola & { tipo: string })[]).map((c) => [c.id, c]));
  const nombres = new Map([...((nombresArtistas.data ?? []) as { id: string; nombre: string }[]), ...((nombresLugares.data ?? []) as { id: string; nombre: string }[])].map((x) => [x.id, x.nombre]));
  const lista = quedaronSinSalir([...fallidos, ...((otros.data ?? []) as TrabajoCola[])], {
    desde,
    casillas: dia,
    porVenir: (id) => {
      const e = porId.get(id);
      return e ? sePuedePublicar(e, ahora) : null;
    },
  });
  const titulo = (s: SinSalir) =>
    (s.casilla && dia.get(s.casilla)?.tipo === "semana" ? "Esta semana en Instagram" : null) ??
    (s.evento_id ? porId.get(s.evento_id)?.titulo : null) ??
    nombres.get(s.artista_id ?? s.lugar_id ?? "") ??
    "Una publicación";
  return { lista, renglones: lista.map((s) => renglonSinSalir(s, titulo(s), ahora)) };
}
