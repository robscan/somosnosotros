/**
 * Borrador del alta de evento guardado en el teléfono. Solo vuelve al formulario al regresar de "Registrar un lugar
 * nuevo" (la hoja deja la señal antes de irse); en cualquier otro caso el alta empieza limpia, y Atrás con algo
 * escrito pregunta antes de salir (pedido del founder, 2026-09-15).
 */
export const CLAVE_BORRADOR = "somosnosotros:borrador-evento";
const CLAVE_VOLVER = "somosnosotros:borrador-evento:volver";
const CLAVE_LUGAR = "somosnosotros:borrador-evento:lugar";

export function olvidarBorrador(): void {
  try {
    localStorage.removeItem(CLAVE_BORRADOR);
    sessionStorage.removeItem(CLAVE_VOLVER);
    sessionStorage.removeItem(CLAVE_LUGAR);
  } catch {}
}

/**
 * El lugar recién registrado desde el alta (OL-055): el alta de lugar vuelve con el historial a la misma alta de evento,
 * sin apilar otra, y el lugar llega por aquí en vez de por la URL.
 */
export function recordarLugarNuevo(id: string): void {
  try {
    sessionStorage.setItem(CLAVE_LUGAR, id);
  } catch {}
}

/** El lugar recién registrado, una sola vez (lo consume). */
export function tomarLugarNuevo(): string | null {
  try {
    const id = sessionStorage.getItem(CLAVE_LUGAR);
    sessionStorage.removeItem(CLAVE_LUGAR);
    return id;
  } catch {
    return null;
  }
}

/** Al ir a registrar un lugar, el alta deja la señal para que el borrador vuelva con ella (y solo entonces). */
export function avisarQueVuelvo(): void {
  try {
    sessionStorage.setItem(CLAVE_VOLVER, "1");
  } catch {}
}

/** true una sola vez: si se dejó la señal al ir a registrar un lugar. La consume. */
export function vengoDeRegistrarLugar(): boolean {
  try {
    const si = sessionStorage.getItem(CLAVE_VOLVER) === "1";
    sessionStorage.removeItem(CLAVE_VOLVER);
    return si;
  } catch {
    return false;
  }
}
