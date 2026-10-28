import "server-only";
import type { EventoParecido } from "./eventosParecidos";

type Lector = { from: (tabla: string) => unknown };
type Consulta = { select: (c: string) => { in: (col: string, ids: string[]) => PromiseLike<{ data: unknown; error: unknown }> } };

/**
 * «¿Es este?» con un parecido que ya tiene cartel (OL-467, estado B): ¿quien mira puede cambiarlo por el suyo? Solo quien lo publicó o la
 * administración. Se mira `creado_por` de los que ya tienen cartel (los que no tienen no lo necesitan: cualquiera con sesión le pone el suyo).
 * La base lo vuelve a comprobar al cambiarlo (`poner_cartel_a_evento`); si esta lectura falla, el botón sale apagado y no pasa nada más.
 */
export async function conPermisoDeCambiar(supabase: Lector, usuario: string, esAdmin: boolean, parecidos: EventoParecido[]): Promise<EventoParecido[]> {
  const conCartel = parecidos.filter((p) => p.imagen).map((p) => p.id);
  if (!conCartel.length) return parecidos;
  let suyos = new Set<string>();
  if (!esAdmin) {
    try {
      const { data, error } = await (supabase.from("eventos") as Consulta).select("id, creado_por").in("id", conCartel);
      if (!error && Array.isArray(data)) suyos = new Set((data as { id: string; creado_por: string | null }[]).filter((f) => f.creado_por === usuario).map((f) => f.id));
    } catch {
      // sin la lectura, apagado
    }
  }
  return parecidos.map((p) => (p.imagen ? { ...p, puede_cambiar: esAdmin || suyos.has(p.id) } : p));
}
