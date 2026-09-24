/**
 * Lógica pura del arrastre para reordenar una lista (OL-184, `SelectorEnlaces`): sin DOM, sin React, así se
 * prueba sola. `mover` cambia el orden; `indiceDestino` traduce cuánto se movió el dedo/mouse a "a qué puesto
 * apunta ahora", con los mismos números tanto para el arrastre con puntero como para las flechas de teclado
 * (un paso de teclado es `indiceDestino` con `desplazamientoY = ±altoRenglon`).
 */

/** Mueve el elemento en `de` a la posición `a`, sin tocar `lista` (devuelve una copia siempre, aunque no haya
 * movimiento). Índices fuera de rango (incluido `de === a`) devuelven una copia sin cambios: nunca lanza. */
export function mover<T>(lista: readonly T[], de: number, a: number): T[] {
  const copia = lista.slice();
  if (de === a || de < 0 || de >= copia.length || a < 0 || a >= copia.length) return copia;
  const [elemento] = copia.splice(de, 1);
  copia.splice(a, 0, elemento);
  return copia;
}

/**
 * A qué puesto apunta un arrastre: `indice` es el puesto de donde partió el elemento levantado, `desplazamientoY`
 * lo que se movió el puntero desde que se levantó (px, negativo hacia arriba) y `altoRenglon` la distancia entre
 * el mismo punto de dos renglones consecutivos (alto real + espacio entre ellos). Redondea al renglón más cercano
 * y recorta a los puestos que existen (0..total-1): el primer y el último renglón no se pueden rebasar.
 */
export function indiceDestino(desplazamientoY: number, indice: number, altoRenglon: number, total: number): number {
  if (total <= 1 || !Number.isFinite(altoRenglon) || altoRenglon <= 0) return Math.min(Math.max(indice, 0), Math.max(total - 1, 0));
  const pasos = Math.round(desplazamientoY / altoRenglon);
  return Math.min(total - 1, Math.max(0, indice + pasos));
}
