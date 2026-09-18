import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tarjetasDeSemana, type AparicionSemana } from "./eventosSemana";

type Ficha = AparicionSemana["ficha"];
type Evento = AparicionSemana["evento"];
type FilaArtista = { artista: Ficha; evento: Evento };
type FilaLugar = Omit<Evento, "lugar"> & { lugar: Ficha & { portada: string | null } };
const LOTE = 500;
/** Un atajo no puede competir con el directorio: hasta 1 000 relaciones en dos lecturas y 750 ms en total.
 * Si una ciudad supera eso, se oculta esta tira hasta poder resolverlo con una consulta agregada en la base. */
export const PRESUPUESTO_SEMANAL = { filas: 1000, consultas: 2, esperaMs: 750 } as const;
export type OpcionesDeLecturaSemanal = { filas?: number; consultas?: number; esperaMs?: number };
type ConsultaAbortable<T> = { abortSignal: (signal: AbortSignal) => PromiseLike<T> };
type Respuesta<T> = { data: T[] | null; error: unknown };

/** El `race` libera el render aun si un transporte defectuoso ignora AbortSignal; `abortSignal` cancela el fetch real. */
async function antesDelPlazo<T>(consulta: ConsultaAbortable<Respuesta<T>>, controlador: AbortController, esperaMs: number): Promise<Respuesta<T> | null> {
  if (esperaMs <= 0) {
    void Promise.resolve(consulta.abortSignal(controlador.signal)).catch(() => undefined);
    controlador.abort();
    return null;
  }
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  const vencida = new Promise<null>((resolver) => {
    temporizador = setTimeout(() => {
      controlador.abort();
      resolver(null);
    }, esperaMs);
  });
  try {
    return await Promise.race([Promise.resolve(consulta.abortSignal(controlador.signal)).catch(() => null), vencida]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

/** Lectura pública, por ciudad y lotes con orden total; nunca usa llave de servicio ni una consulta por ficha.
 * El margen UTC de nueve días contiene hoy+7 en cualquier zona; el corte exacto lo hace tarjetasDeSemana.
 * Si falla un lote no se ofrece un carril incompleto. El directorio y los destacados siguen disponibles.
 */
export async function cargarEventosSemana(supabase: SupabaseClient | null, tipo: "artistas" | "lugares", ciudad: string, ahora = new Date(), opciones: OpcionesDeLecturaSemanal = {}) {
  if (!supabase) return [];
  const presupuesto = { ...PRESUPUESTO_SEMANAL, ...opciones };
  const limite = new Date(ahora.getTime() + 9 * 86400000).toISOString();
  const apariciones: AparicionSemana[] = [];
  const controlador = new AbortController();
  const venceEn = Date.now() + presupuesto.esperaMs;
  let filas = 0;
  let consultas = 0;
  for (let desde = 0; ; desde += LOTE) {
    if (consultas >= presupuesto.consultas || filas >= presupuesto.filas) return [];
    if (tipo === "artistas") {
      const consulta = supabase.from("eventos_artistas")
        .select("artista_id, evento_id, artista:artistas!inner(id, nombre, foto, visible), evento:eventos!inner(id, inicio, termina, zona, visible, lugar_id, lugar:lugares(visible, privado))")
        .eq("artista.visible", true).eq("artista.ciudad", ciudad)
        .eq("evento.visible", true).eq("evento.ciudad", ciudad)
        .gte("evento.termina", ahora.toISOString()).lt("evento.inicio", limite)
        .order("evento_id").order("artista_id").range(desde, desde + LOTE - 1);
      consultas += 1;
      const respuesta = await antesDelPlazo(consulta, controlador, venceEn - Date.now());
      if (!respuesta?.data || respuesta.error || filas + respuesta.data.length > presupuesto.filas) return [];
      const { data } = respuesta;
      filas += data.length;
      for (const fila of (data ?? []) as unknown as FilaArtista[]) {
        apariciones.push({ ficha: fila.artista, evento: fila.evento });
      }
      if (data.length < LOTE) break;
    } else {
      const consulta = supabase.from("eventos")
        .select("id, inicio, termina, zona, visible, lugar_id, lugar:lugares!inner(id, nombre, portada, visible, privado)")
        .eq("visible", true).eq("ciudad", ciudad)
        .eq("lugar.visible", true).eq("lugar.privado", false).eq("lugar.ciudad", ciudad)
        .gte("termina", ahora.toISOString()).lt("inicio", limite)
        .order("id").range(desde, desde + LOTE - 1);
      consultas += 1;
      const respuesta = await antesDelPlazo(consulta, controlador, venceEn - Date.now());
      if (!respuesta?.data || respuesta.error || filas + respuesta.data.length > presupuesto.filas) return [];
      const { data } = respuesta;
      filas += data.length;
      for (const fila of (data ?? []) as unknown as FilaLugar[]) {
        apariciones.push({ ficha: { ...fila.lugar, foto: fila.lugar.portada }, evento: { ...fila, lugar: { visible: fila.lugar.visible, privado: !!fila.lugar.privado } } });
      }
      if (data.length < LOTE) break;
    }
  }
  return tarjetasDeSemana(apariciones, tipo, ahora);
}
