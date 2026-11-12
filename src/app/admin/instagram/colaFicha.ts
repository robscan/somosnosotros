import "server-only";
import type { ClienteServidor } from "@/lib/supabase/servidor";

/**
 * OL-515: guardar en la cola de redes la publicación de un artista o de un lugar sin día de la semana, por la función de la base
 * (`redes_encolar_ficha`, migración 20261112100000) y con la sesión de la administración: la base comprueba que es la administración, que la ficha
 * se ve, que no dijo que no y que tiene su material, no guarda dos (candado por ficha) y no repite lo que ya salió sin confirmar. Lo usan «Publicar
 * en Instagram» de la ficha (`publicarFicha`) y «Volver a publicar lo que se quedó sin salir» (`volverAPublicar`). No es una acción del servidor:
 * recibe el cliente ya comprobado.
 */

export type PedidoFicha = { texto: string | null; quitadas: string[]; facebook: boolean };

export type Encolada =
  | { ok: true; id: string }
  /** Ya va en camino (el id de ese trabajo): no se guardó otro. */
  | { ok: false; duplicado: string }
  /** Ya salió en Instagram (cuándo, ISO) y no se pidió repetir: no se guardó. */
  | { ok: false; repetido: string }
  | { ok: false; error: { code?: string; message?: string } };

/** El pedido limpio que se manda (la base lo vuelve a limpiar y le pone el tipo). */
export function pedidoLimpio(p: Partial<PedidoFicha> | null | undefined): PedidoFicha {
  return {
    texto: typeof p?.texto === "string" && p.texto.trim() ? p.texto.trim().slice(0, 5000) : null,
    quitadas: Array.isArray(p?.quitadas) ? p.quitadas.filter((x): x is string => typeof x === "string").slice(0, 60) : [],
    facebook: p?.facebook !== false,
  };
}

export async function encolarFicha(supabase: ClienteServidor, tipo: "artista" | "lugar", id: string, pedido: PedidoFicha, repetir: boolean): Promise<Encolada> {
  const { data, error } = await supabase.rpc("redes_encolar_ficha", { p_tipo: tipo, p_ficha: id, p_pedido: pedidoLimpio(pedido), p_repetir: repetir === true });
  if (error) return { ok: false, error: { code: error.code, message: error.message } };
  const r = (data ?? {}) as { id?: unknown; duplicado?: unknown; repetido?: unknown };
  if (typeof r.id === "string") return { ok: true, id: r.id };
  if (typeof r.duplicado === "string") return { ok: false, duplicado: r.duplicado };
  if (typeof r.repetido === "string") return { ok: false, repetido: r.repetido };
  return { ok: false, error: {} };
}
