/**
 * Toques en los renglones de una lista que se guardan en segundo plano: Voy, Me interesa, Seguir, Deshacer y Reintentar
 * (bitácora 085). Cada toque en un renglón lleva el número siguiente, y lo elegido se muestra encima de lo que llegó del
 * servidor mientras se guarda. Lo que trae un guardado (confirmar, quitar lo mostrado, la pregunta de avisos, ofrecer
 * Reintentar) solo cuenta si su toque sigue siendo el último de ese renglón; si no, ya manda uno más nuevo y se ignora
 * en silencio. Así un Voy ya deshecho no pregunta, un Reintentar viejo no pisa lo nuevo y Voy · No voy · Voy no borra
 * el "Vas" un momento.
 */

/** El número del último toque de cada renglón. Se anota al tocar y se lee al terminar de guardar, nunca al pintar. */
export type Toques = Record<string, number>;
/** Lo elegido en un renglón, con el número de su toque; `guardada` cuando el servidor ya lo tiene. */
export type Elegida<V> = { valor: V; vez: number; guardada: boolean };
export type Elegidas<V> = Readonly<Record<string, Elegida<V>>>;

/** Un toque nuevo en el renglón: lo anota y devuelve su número. */
export function tocar(toques: Toques, id: string): number {
  const vez = (toques[id] ?? 0) + 1;
  toques[id] = vez;
  return vez;
}

export function esElUltimo(toques: Toques, id: string, vez: number): boolean {
  return toques[id] === vez;
}

/** Un botón del aviso (Deshacer, Reintentar) que solo actúa si su toque sigue siendo el último del renglón. */
export function siSigueSiendoElUltimo(toques: Toques, id: string, vez: number, hacer: () => void): () => void {
  return () => {
    if (esElUltimo(toques, id, vez)) hacer();
  };
}

/** Muestra lo elegido en el toque `vez` mientras se guarda. */
export function elegir<V>(elegidas: Elegidas<V>, id: string, valor: V, vez: number): Elegidas<V> {
  return { ...elegidas, [id]: { valor, vez, guardada: false } };
}

/** Terminó el guardado del toque `vez`: si se guardó, queda hasta que llegue lo del servidor; si no, se quita. Uno viejo no cambia nada. */
export function trasGuardar<V>(elegidas: Elegidas<V>, id: string, vez: number, guardado: boolean): Elegidas<V> {
  const elegida = elegidas[id];
  if (!elegida || elegida.vez !== vez) return elegidas;
  if (guardado) return { ...elegidas, [id]: { ...elegida, guardada: true } };
  const resto = { ...elegidas };
  delete resto[id];
  return resto;
}

/** Llegaron datos nuevos del servidor: lo ya guardado se toma de ellos; lo que sigue guardándose, no. */
export function alRecibir<V>(elegidas: Elegidas<V>): Elegidas<V> {
  return Object.fromEntries(Object.entries(elegidas).filter(([, e]) => !e.guardada));
}
