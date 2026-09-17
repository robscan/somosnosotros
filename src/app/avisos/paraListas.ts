import type { AvisosLista } from "@/components/useSeguirEnLista";
import { enmascararCorreo } from "@/lib/comunidad";
import type { Perfil } from "@/lib/supabase/servidor";

/**
 * Lo que pide la pregunta de avisos tras el primer Voy o Seguir de una lista (OL-057): la cuenta de quien mira, si ya se
 * le preguntó, su correo enmascarado y la llave de los avisos del teléfono. Sin sesión, null.
 */
export function avisosParaListas(actual: { correo: string | null; perfil: Perfil } | null): AvisosLista | null {
  if (!actual) return null;
  return {
    cuenta: actual.perfil.id,
    preguntado: actual.perfil.avisos_preguntado ?? true,
    correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo",
    llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  };
}
