import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tarjetasDeSemana, type AparicionSemana } from "./eventosSemana";

type Ficha = AparicionSemana["ficha"];
type Evento = AparicionSemana["evento"];
type FilaArtista = { artista: Ficha; evento: Evento };
type FilaLugar = Omit<Evento, "lugar"> & { lugar: Ficha & { portada: string | null } };
const LOTE = 500;

/** Lectura pública, por ciudad y lotes con orden total; nunca usa llave de servicio ni una consulta por ficha.
 * El margen UTC de nueve días contiene hoy+7 en cualquier zona; el corte exacto lo hace tarjetasDeSemana.
 * Si falla un lote no se ofrece un carril incompleto. El directorio y los destacados siguen disponibles.
 */
export async function cargarEventosSemana(supabase: SupabaseClient | null, tipo: "artistas" | "lugares", ciudad: string, ahora = new Date()) {
  if (!supabase) return [];
  const limite = new Date(ahora.getTime() + 9 * 86400000).toISOString();
  const apariciones: AparicionSemana[] = [];
  for (let desde = 0; ; desde += LOTE) {
    if (tipo === "artistas") {
      const { data, error } = await supabase.from("eventos_artistas")
        .select("artista_id, evento_id, artista:artistas!inner(id, nombre, foto, visible), evento:eventos!inner(id, inicio, termina, zona, visible, lugar_id, lugar:lugares(visible, privado))")
        .eq("artista.visible", true).eq("artista.ciudad", ciudad)
        .eq("evento.visible", true).eq("evento.ciudad", ciudad)
        .gte("evento.termina", ahora.toISOString()).lt("evento.inicio", limite)
        .order("evento_id").order("artista_id").range(desde, desde + LOTE - 1);
      if (error) return [];
      for (const fila of (data ?? []) as unknown as FilaArtista[]) {
        apariciones.push({ ficha: fila.artista, evento: fila.evento });
      }
      if (!data || data.length < LOTE) break;
    } else {
      const { data, error } = await supabase.from("eventos")
        .select("id, inicio, termina, zona, visible, lugar_id, lugar:lugares!inner(id, nombre, portada, visible, privado)")
        .eq("visible", true).eq("ciudad", ciudad)
        .eq("lugar.visible", true).eq("lugar.privado", false).eq("lugar.ciudad", ciudad)
        .gte("termina", ahora.toISOString()).lt("inicio", limite)
        .order("id").range(desde, desde + LOTE - 1);
      if (error) return [];
      for (const fila of (data ?? []) as unknown as FilaLugar[]) {
        apariciones.push({ ficha: { ...fila.lugar, foto: fila.lugar.portada }, evento: { ...fila, lugar: { visible: fila.lugar.visible, privado: !!fila.lugar.privado } } });
      }
      if (!data || data.length < LOTE) break;
    }
  }
  return tarjetasDeSemana(apariciones, tipo, ahora);
}
