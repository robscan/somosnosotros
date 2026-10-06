export type CampoFlyer = "titulo" | "cuando" | "cuanto" | "descripcion" | "enlace" | "quien" | "donde" | "imagen";

/**
 * Qué debe valer "Quién" después de leer un cartel (founder, 2026-09-21: «me puso a mí y no se dice
 * explícitamente en el cartel»). Mientras nadie haya tocado "Quién" a mano ni viniera explícito por fuera
 * (`quienInicial`), el cartel manda del todo: si trae artistas reconocidos, esos; si no
 * nombra a nadie, "Quién" queda **vacío** — así se borra el prellenado automático de la decisión 12, que no es
 * un dato real hasta que el cartel (o la persona) lo confirme. Si ya se tocó a mano o vino explícito, el cartel
 * nunca lo pisa, tenga o no tenga artistas (en el alta por pasos, lo que vino al abrir lo aparta `sinPisar`).
 */
export function quienTrasLeerCartel<T>(quienDelCartel: T[], quienActual: T[], puedeCompletarQuien: boolean): T[] {
  return puedeCompletarQuien ? quienDelCartel : quienActual;
}

/** Incluso borrar o volver al mismo valor es un gesto: comparar valores no basta. */
export function crearGestosFlyer(iniciales: CampoFlyer[] = []) {
  const versiones = new Map<CampoFlyer, number>(iniciales.map(c => [c, 1]));
  return {
    tocar(campo: CampoFlyer) {
      const version = (versiones.get(campo) ?? 0) + 1;
      versiones.set(campo, version);
      return version;
    },
    puedeCompletar: (campo: CampoFlyer) => !versiones.has(campo),
    vigente: (campo: CampoFlyer, version: number) => versiones.get(campo) === version,
  };
}
