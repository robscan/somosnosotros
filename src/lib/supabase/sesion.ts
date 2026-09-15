import "server-only";
import { redirect } from "next/navigation";
import { clienteServidor } from "./servidor";

/**
 * La sesión para una acción del servidor: si no hay, manda a entrar y vuelve a `destino` después.
 * Una sola vez para eventos, lugares y artistas (antes estaba copiada en cada `acciones.ts`).
 */
export async function sesionOEntrar(destino: string) {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) redirect(`/entrar?siguiente=${encodeURIComponent(destino)}`);
  return { supabase, user };
}
