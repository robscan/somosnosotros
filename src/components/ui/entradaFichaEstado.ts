/**
 * Lógica de estados de `EntradaFicha` (OL-157), separada para poder probarla sin DOM.
 *
 * - "cerrada": recién montada, fuera de pantalla a la derecha.
 * - "abierta": en su lugar final, todavía con `transform: translateX(0)` mientras dura la transición.
 * - "quieta": transición terminada, `transform: none`. Cualquier `transform` distinto de `none` convierte
 *   al envoltorio en contenedor de los `position: fixed`/`sticky` de dentro (la barra de seguir/compartir
 *   de lugares y artistas), así que hay que soltarlo en cuanto la entrada termina.
 */
export type EstadoFicha = "cerrada" | "abierta" | "quieta";

/** Con "reducir movimiento" la ficha nace ya quieta y nunca lleva transform. */
export function estadoInicial(prefiereMovimientoReducido: boolean): EstadoFicha {
  return prefiereMovimientoReducido ? "quieta" : "cerrada";
}

/** Tanto `transitionend` como el tope de seguridad piden pasar a quieta; una vez quieta, no hay nada que hacer. */
export function debePasarAQuieta(estado: EstadoFicha): boolean {
  return estado !== "quieta";
}
