"use server";

import { esUuid } from "@/lib/formulario";
import { esSlugDeSitio } from "@/lib/sitios";
import { clienteServidor, esAdminDeSesion } from "@/lib/supabase/servidor";
import { ligarEventosDelSitio } from "./sitio";

/** Cuántos eventos pasaron al lugar; `ok: false` si no hay sesión, si lo que llegó no se lee o si la base no pudo. */
export type ResultadoLigar = { ok: true; ligados: number } | { ok: false };

/**
 * Ligar a un lugar del directorio los eventos del sitio que representa (OL-366). La usan dos pantallas, cada una con sus datos atados en el
 * servidor (`bind`):
 * - el alta de lugar que vino de «Agregar al directorio», cuando en «¿Es este?» (o «Ya tiene ficha») se elige el lugar que ya existe en vez de
 *   publicar otro: se ligan los eventos de quien lo elige y después la pantalla abre la ficha de ese lugar;
 * - «Ligar sus eventos» de la administración en la ficha del sitio, que ya tiene su lugar en el directorio (`diferir`: esa ficha no se vuelve a
 *   pintar en la misma respuesta, ver `ligarEventosDelSitio`).
 * Quién puede ligar qué lo decide la base (`religar_sitio_a_lugar`); aquí solo se comprueba que haya sesión y que lo que llegó tenga forma.
 */
export async function ligarSitioALugar(slug: string, lugarId: string, diferir = false): Promise<ResultadoLigar> {
  if (!esSlugDeSitio(slug) || !esUuid(lugarId)) return { ok: false };
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) return { ok: false };
  const [esAdmin, { data: lugar }] = await Promise.all([esAdminDeSesion(supabase, user.id), supabase.from("lugares").select("id, slug").eq("id", lugarId).maybeSingle()]);
  if (!lugar) return { ok: false };
  const ligados = await ligarEventosDelSitio(supabase, { id: user.id, esAdmin }, slug, lugar, { diferir: diferir === true });
  return ligados === null ? { ok: false } : { ok: true, ligados };
}
