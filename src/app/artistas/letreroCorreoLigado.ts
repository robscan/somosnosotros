import type { ResultadoReclamo } from "./acciones";

/** Los tres estados finales del letrero «Tu correo está enlazado a…» (OL-177), después de «Reclamar ficha».
 * «inicial» y «enviando» son del componente (antes de llamar a `reclamarArtista`; mientras responde). */
export type EstadoFinalLetrero = "aprobado" | "enviada" | "error";

/**
 * El siguiente estado tras el resultado de `reclamarArtista(artistaId, "es_mio")`: `aprobado` cuando el correo
 * de la cuenta coincidía con el que el CAPO capturó (se ligó al instante, L53, migración 20260922140000);
 * `enviada` cuando quedó un reclamo pendiente para el administrador (sin duplicar); `error` con su mensaje
 * (nunca vacío: si `reclamarArtista` no trae uno, uno genérico invita a reintentar).
 */
export function siguienteEstadoLetrero(resultado: ResultadoReclamo): { estado: EstadoFinalLetrero; error?: string } {
  if (!resultado.ok) return { estado: "error", error: resultado.error || "No se pudo enviar. Intenta de nuevo." };
  return { estado: resultado.aprobado ? "aprobado" : "enviada" };
}
