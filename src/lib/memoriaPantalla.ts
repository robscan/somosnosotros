/**
 * Memoria de pantalla (pedido del founder, 2026-09-15): al salir de un listado (agenda, lugares, artistas) a una ficha
 * y volver, la pantalla vuelve exactamente donde estaba: la pestaña o filtro, lo escrito en la búsqueda y el scroll.
 * Vive en sessionStorage (muere con la pestaña del navegador, nunca sale del teléfono), una entrada por URL.
 * Aparte, cada sección (Agenda, Lugares, Artistas) recuerda su última URL para que la barra inferior regrese a ella.
 */

export type Memoria<T> = { estado: T; scroll: number };

/** Lo que este módulo necesita de sessionStorage (se inyecta en las pruebas). */
export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIJO = "somosnosotros:pantalla:";
const PREFIJO_SECCION = "somosnosotros:seccion:";

function almacenDelNavegador(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado: sin memoria, sin romper nada
  }
}

/** La memoria guardada para esa URL, o null si no hay o no se puede leer. */
export function leerMemoria<T>(clave: string, almacen: Almacen | null = almacenDelNavegador()): Memoria<T> | null {
  if (!almacen) return null;
  try {
    const crudo = almacen.getItem(PREFIJO + clave);
    if (!crudo) return null;
    const m = JSON.parse(crudo) as Partial<Memoria<T>>;
    if (typeof m !== "object" || m === null) return null;
    return { estado: m.estado as T, scroll: typeof m.scroll === "number" && m.scroll >= 0 ? m.scroll : 0 };
  } catch {
    return null;
  }
}

export function guardarMemoria<T>(clave: string, memoria: Memoria<T>, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!almacen) return;
  try {
    almacen.setItem(PREFIJO + clave, JSON.stringify(memoria));
  } catch {}
}

/** La última URL vista de una sección (Agenda, Lugares, Artistas), o null. */
export function leerUrlSeccion(seccion: string, almacen: Almacen | null = almacenDelNavegador()): string | null {
  if (!almacen) return null;
  try {
    const url = almacen.getItem(PREFIJO_SECCION + seccion);
    return url && url.startsWith("/") ? url : null;
  } catch {
    return null;
  }
}

export function guardarUrlSeccion(seccion: string, url: string, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!almacen) return;
  try {
    almacen.setItem(PREFIJO_SECCION + seccion, url);
  } catch {}
}

/** La clave de memoria de la pantalla actual: ruta y consulta, sin el hash. */
export function claveDeUrl(url: Pick<Location, "pathname" | "search">): string {
  return url.pathname + url.search;
}
