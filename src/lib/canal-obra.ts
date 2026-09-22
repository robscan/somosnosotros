import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Obras colectivas (OL-088, Fase 2 bloque 2): el canal en vivo, común a cualquier obra — no lo que viaja por él
 * (eso es propio de cada obra: para Pincel, `src/lib/pincel.ts`). Doc rediseno/25 (ajuste 3): "un canal en vivo
 * por obra" es lo común de la cadena "Somos Nosotros Live"; sin SDK ni registro de obras, solo esta función.
 *
 * Un canal por obra (`obra:<id>`), no uno por persona — todos los mandos de la misma obra comparten el mismo
 * canal y la pared es quien más escucha. `private: true` exige sesión (RLS sobre `realtime.messages`, doc de
 * Fase 0 §2): solo cuentas registradas mandan o reciben, sin depender de que el nombre del canal sea difícil de
 * adivinar. Nadie llama a esto sin sesión — `usuarioActual()` ya lo exige antes, en el mando y en el panel.
 */
export function nombreCanalObra(obraId: string): string {
  return `obra:${obraId}`;
}

/** `ack` (OL-132): solo el mando con la sonda lo pide, para medir la ida y vuelta al servidor de Realtime (cada
 * `send` resuelve al llegar la confirmación); por defecto no, como siempre (ningún viaje extra). */
export function abrirCanalObra(supabase: SupabaseClient, obraId: string, opciones?: { ack?: boolean }) {
  return supabase.channel(nombreCanalObra(obraId), { config: opciones?.ack ? { private: true, broadcast: { ack: true } } : { private: true } });
}
