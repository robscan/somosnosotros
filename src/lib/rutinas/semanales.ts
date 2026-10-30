import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLAVE_SEMANAL, leerAjusteSemanal, SEMANA_MS } from "./ajusteSemanal";
import { HORIZONTE_DIAS, MAX_FICHAS } from "./fichas";

/**
 * Las rutinas que corren solas una vez por semana (OL-489: «Completar fichas»). Sin trabajo de pg_cron nuevo: cada vez que alguien llama al
 * motor (`/api/rutinas/correr`: el cron diario de Vercel a las 12:00 UTC, el latido de Supabase mientras hay corridas vivas, la hoja «Correr»),
 * antes de dar pasos se mira aquí si toca dejar la corrida de la semana. Toca si el interruptor de Administración › Rutinas está encendido
 * (`configuracion.rutina_fichas_semanal`, `ajusteSemanal.ts`) y una ciudad abierta no tiene una corrida `fichas` creada en los últimos 7 días
 * (de cualquier estado: una que la administración canceló también cuenta, así no vuelve hasta la semana siguiente). La deja pendiente con su
 * tope (0,50 USD por omisión) y la toma el motor en ese mismo llamado. Dos llamadas a la vez no la duplican: el índice de una sola en curso por
 * botón y ciudad (`rutinas_corridas_una_en_curso`) rechaza la segunda. Nunca lanza.
 */

/** Deja las corridas semanales que tocan. Devuelve cuántas dejó (0 si el interruptor está apagado o no se pudo leer). */
export async function programarSemanales(db: SupabaseClient, ahora: Date = new Date()): Promise<number> {
  try {
    const conf = await db.from("configuracion").select("valor").eq("clave", CLAVE_SEMANAL).maybeSingle();
    if (conf.error || !conf.data) return 0;
    const ajuste = leerAjusteSemanal((conf.data as { valor: unknown }).valor);
    if (!ajuste.activa) return 0;
    const ciudades = await db.from("ciudades").select("slug, estado").in("estado", ["abierta", "investigando"]);
    if (ciudades.error) return 0;
    const desde = new Date(ahora.getTime() - SEMANA_MS).toISOString();
    const recientes = await db.from("rutinas_corridas").select("ciudad").eq("tipo", "fichas").gte("creado_en", desde).limit(500);
    if (recientes.error) return 0;
    const ya = new Set(((recientes.data ?? []) as { ciudad: string | null }[]).map((r) => r.ciudad));
    let n = 0;
    for (const c of (ciudades.data ?? []) as { slug: string }[]) {
      if (ya.has(c.slug)) continue;
      const r = await db
        .from("rutinas_corridas")
        .insert({ tipo: "fichas", ciudad: c.slug, tope_usd: ajuste.tope_usd, parametros: { horizonte_dias: HORIZONTE_DIAS, max_fichas: MAX_FICHAS, semanal: true } })
        .select("id");
      if (!r.error) n++;
    }
    return n;
  } catch {
    return 0;
  }
}
