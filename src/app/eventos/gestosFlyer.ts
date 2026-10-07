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
