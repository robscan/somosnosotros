/**
 * Las capas plegables del grafo y lo que una lente hace con ellas (OL-405, bitácora 436). Lógica pura, sin pantalla ni almacenamiento.
 *
 * Una capa está a la vista por dos motivos: la persona la dejó desplegada (`elegidas`) o una lente la necesita y la desplegó por ella (`porLente`).
 * Lo único que se recuerda en el aparato es `elegidas`: lo que hizo la persona. Al quitar la lente, las capas que ella desplegó vuelven a como
 * estaban antes. Si la persona toca una capa mientras la lente está puesta, esa elección es suya: se guarda y gana (la capa deja de ser «de la lente»).
 */
export type Capa = "lugar" | "artista" | "persona";
export const CAPAS: readonly Capa[] = ["lugar", "artista", "persona"];
export type Capas = Record<Capa, boolean>;
export type EstadoCapas = { elegidas: Capas; porLente: Capa[] };

export const estadoInicial = (): EstadoCapas => ({ elegidas: { lugar: true, artista: true, persona: true }, porLente: [] });

/** Lo que se ve: las que la persona dejó desplegadas más las que desplegó la lente. */
export const capasVistas = (e: EstadoCapas): Capas => ({
  lugar: e.elegidas.lugar || e.porLente.includes("lugar"),
  artista: e.elegidas.artista || e.porLente.includes("artista"),
  persona: e.elegidas.persona || e.porLente.includes("persona"),
});

/** Lo único que se guarda en el aparato: la elección de la persona, nunca la de la lente. */
export const capasGuardables = (e: EstadoCapas): Capas => ({ ...e.elegidas });

/** Una lente que necesita capas: despliega las que estaban plegadas y dice cuáles. */
export function aplicarLente(e: EstadoCapas, necesita: readonly Capa[]): { estado: EstadoCapas; desplegadas: Capa[] } {
  const vistas = capasVistas(e);
  const desplegadas = necesita.filter((c) => !vistas[c]);
  return { estado: { elegidas: { ...e.elegidas }, porLente: [...e.porLente, ...desplegadas] }, desplegadas };
}

/** Quitar la lente: las capas que ella desplegó vuelven a estar plegadas, como las tenía la persona. */
export const quitarLente = (e: EstadoCapas): EstadoCapas => ({ elegidas: { ...e.elegidas }, porLente: [] });

/** La persona fija una capa (la toca, o marca «Yo» y su capa tiene que estar a la vista): su elección se guarda y la capa deja de ser «de la lente». */
export const ponerCapa = (e: EstadoCapas, capa: Capa, desplegada: boolean): EstadoCapas => ({
  elegidas: { ...e.elegidas, [capa]: desplegada },
  porLente: e.porLente.filter((c) => c !== capa),
});

/** La persona toca una píldora: la capa que se ve se pliega y la que no se ve se despliega (se vea por ella o por la lente). */
export const alternarCapa = (e: EstadoCapas, capa: Capa): EstadoCapas => ponerCapa(e, capa, !capasVistas(e)[capa]);

/** Lo que se leyó del aparato (puede venir roto): solo cuentan los booleanos; lo demás se queda desplegado. */
export function estadoDeGuardado(guardado: unknown): EstadoCapas {
  const e = estadoInicial();
  const capas = guardado && typeof guardado === "object" ? (guardado as { capas?: Partial<Record<Capa, unknown>> }).capas : undefined;
  for (const c of CAPAS) if (typeof capas?.[c] === "boolean") e.elegidas[c] = capas[c] as boolean;
  return e;
}
