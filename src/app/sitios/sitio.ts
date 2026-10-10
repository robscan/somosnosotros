import "server-only";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { filtroSinPasar } from "@/lib/fechas";
import { eventosDelSitio, eventosParaLigar, type EventoParaLigar } from "@/lib/sitios";
import type { ClienteServidor } from "@/lib/supabase/servidor";

/**
 * Los eventos de un sitio fuera del directorio, en el servidor (OL-348 y OL-366): los que pinta su ficha y los que se ligan al lugar que lo
 * representa. Una sola consulta para las dos cosas, así se liga exactamente lo que la ficha enseña.
 */

/** Lo que se pide de cada evento: lo del renglón de la agenda, lo que dice dónde es (el sitio, su punto y su ciudad) y quién lo publicó. */
const COLUMNAS = "id, slug, titulo, inicio, fin, zona, imagen, precio, clase, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, ciudad, creado_en, creado_por";

/** Un evento del sitio con su slug (para revalidar su ficha). */
type EventoDeSitio = EventoParaLigar & { slug?: string | null };

/**
 * Los eventos visibles y por venir que nombran el sitio de ese slug, en orden (`lib/sitios`: su nombre sin acentos, mayúsculas ni signos, con
 * su ciudad). La consulta trae los sitios fuera del directorio por venir (el slug no se puede filtrar en la base, que no sabe quitar acentos
 * por la API) con un tope de sobra contra el corte silencioso de PostgREST. Null si la base no contestó.
 */
export async function eventosVigentesDelSitio<T extends EventoDeSitio>(supabase: ClienteServidor, slug: string): Promise<T[] | null> {
  const { data, error } = await supabase
    .from("eventos")
    .select(COLUMNAS)
    .is("lugar_id", null)
    .eq("sitio_reservado", false)
    .not("sitio_texto", "is", null)
    .eq("visible", true)
    .or(filtroSinPasar())
    .order("inicio")
    .order("titulo")
    .order("id")
    .limit(2000);
  if (error) return null;
  return eventosDelSitio((data ?? []) as unknown as T[], slug);
}

type Quien = { id: string; esAdmin: boolean };
type Lugar = { id: string; slug?: string | null };

/**
 * Liga al lugar los eventos del sitio que le tocan a quien liga (OL-366): los de su ficha que publicó (todos, si es administración), con la
 * regla de la base (`religar_sitio_a_lugar`, que vuelve a comprobarlo todo, también la distancia y la zona). Devuelve cuántos ligó (0 si no
 * había ninguno) o null si la base no pudo: entonces los eventos se quedan como sitio y nada más se rompe (el lugar ya existe y la
 * administración puede ligarlos desde la ficha del sitio). Con `diferir`, las fichas se revalidan después de contestar: la pantalla desde la
 * que se liga (la ficha del sitio) no se vuelve a pintar en la misma respuesta, porque sin sus eventos sería «Esto ya no está».
 */
export async function ligarEventosDelSitio(supabase: ClienteServidor, quien: Quien, slug: string, lugar: Lugar, { diferir = false } = {}): Promise<number | null> {
  const eventos = await eventosVigentesDelSitio(supabase, slug);
  if (!eventos) {
    console.error("ligar eventos del sitio: no se pudieron leer sus eventos");
    return null;
  }
  const ids = eventosParaLigar(eventos, slug, quien);
  if (!ids.length) return 0;
  const { data, error } = await supabase.rpc("religar_sitio_a_lugar", { p_lugar: lugar.id, p_eventos: ids });
  if (error) {
    console.error("ligar eventos del sitio:", error.message);
    return null;
  }
  const ligados = typeof data === "number" ? data : 0;
  if (ligados > 0) {
    const revalidar = () => {
      revalidatePath("/");
      revalidatePath("/lugares");
      revalidatePath(`/lugares/${lugar.id}`);
      if (lugar.slug) revalidatePath(`/lugares/${lugar.slug}`);
      revalidatePath(`/sitios/${slug}`);
      for (const e of eventos.filter((x) => ids.includes(x.id))) {
        revalidatePath(`/eventos/${e.id}`);
        if (e.slug) revalidatePath(`/eventos/${e.slug}`);
      }
    };
    if (diferir) after(revalidar);
    else revalidar();
  }
  return ligados;
}
