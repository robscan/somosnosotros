/**
 * Guardia de salida (pedido del founder, 2026-09-15): una pantalla con algo escrito sin publicar puede pedir
 * confirmación antes de que "Atrás" se vaya. La pantalla pone la guardia mientras haya algo que perder y la quita
 * al publicar o al quedarse vacía; Atrás pregunta y, si hay guardia, le entrega el "continuar" para que ella decida.
 */
export type Guardia = (continuar: () => void) => void;

let guardia: Guardia | null = null;
/** La guardia que el formulario apartó al mandar «Publicar», a la espera de saber si el servidor la aceptó. */
let apartada: Guardia | null = null;

export function ponerGuardia(g: Guardia): void {
  guardia = g;
  apartada = null;
}

/** Quita la guardia; con `g`, solo si sigue siendo esa (una pantalla no quita la de otra). */
export function quitarGuardia(g?: Guardia): void {
  if (!g || guardia === g) guardia = null;
}

/** true si hay guardia y se le pasó la salida (Atrás no debe irse por su cuenta). */
export function pedirSalida(continuar: () => void): boolean {
  if (!guardia) return false;
  guardia(continuar);
  return true;
}

/**
 * Al tocar «Publicar» el formulario aparta la guardia: si sale bien, la pantalla se va a la ficha (o se desmonta) sin preguntar nada.
 * Todavía no se sabe el resultado, así que no se descarta: `reponerGuardia` la devuelve si el servidor contestó con un error.
 */
export function apartarGuardia(): void {
  apartada = guardia;
  guardia = null;
}

/** El servidor no publicó (validación, fallo de la base, ya existía): lo escrito sigue en pantalla y vuelve a estar protegido. */
export function reponerGuardia(): void {
  if (apartada && !guardia) guardia = apartada;
  apartada = null;
}
