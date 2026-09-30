import type { GrupoBuscador } from "./buscarUnificado";

/**
 * «Recientes» de Buscar (docs/rediseno/50, OL-237): lo último que la persona abrió desde Buscar en este aparato, hasta cinco. Vive
 * en el navegador (`localStorage`), sin cuenta y sin salir del teléfono; si el almacén no está o se llena, no pasa nada. `meta` son
 * las líneas de datos bajo el nombre, sin el tipo (`metaDe`).
 */
export type Reciente = { grupo: GrupoBuscador; id: string; href: string; foto: string; titulo: string; meta: string[] };

export const MAXIMO_RECIENTES = 5;
export const LLAVE_RECIENTES = "somosnosotros:buscar:recientes";

/** Lo que se usa del almacén (en las pruebas, uno de mentira). */
export type Almacen = Pick<Storage, "getItem" | "setItem">;

function almacenLocal(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

const GRUPOS: readonly unknown[] = ["eventos", "lugares", "artistas"];

/** Lo guardado lo puede haber tocado cualquiera: solo pasa lo que tiene la forma y lleva a una ruta de la app. */
function esReciente(x: unknown): x is Reciente {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  const cadenas = [r.id, r.href, r.foto, r.titulo].every((v) => typeof v === "string") && Array.isArray(r.meta) && r.meta.every((v) => typeof v === "string");
  return GRUPOS.includes(r.grupo) && cadenas && (r.href as string).startsWith("/") && !(r.href as string).startsWith("//");
}

/** Lo guardado tal como está en el almacén (una cadena estable: lo que lee `useSyncExternalStore`), o null. */
export function crudoDeRecientes(almacen: Almacen | null = almacenLocal()): string | null {
  try {
    return almacen?.getItem(LLAVE_RECIENTES) ?? null;
  } catch {
    return null;
  }
}

/** Los recientes de un texto guardado, del más nuevo al más viejo; con algo ilegible, ninguno. */
export function leerRecientes(crudo: string | null): Reciente[] {
  try {
    const lista: unknown = JSON.parse(crudo ?? "[]");
    return Array.isArray(lista) ? lista.filter(esReciente).slice(0, MAXIMO_RECIENTES) : [];
  } catch {
    return [];
  }
}

/** El reciente nuevo va primero y, si ya estaba, no se repite; solo caben `MAXIMO_RECIENTES`. */
export function conReciente(lista: Reciente[], nuevo: Reciente): Reciente[] {
  return [nuevo, ...lista.filter((r) => !(r.grupo === nuevo.grupo && r.id === nuevo.id))].slice(0, MAXIMO_RECIENTES);
}

/** Apunta lo que la persona acaba de abrir desde Buscar. */
export function guardarReciente(nuevo: Reciente, almacen: Almacen | null = almacenLocal()): void {
  try {
    almacen?.setItem(LLAVE_RECIENTES, JSON.stringify(conReciente(leerRecientes(crudoDeRecientes(almacen)), nuevo)));
  } catch {}
}
