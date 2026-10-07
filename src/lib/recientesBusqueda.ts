import { hrefEnMapa, metaDe, type Encontrado, type GrupoBuscador } from "./buscarUnificado";

/**
 * «Recientes» de Buscar (docs/rediseno/50, OL-237): lo último que la persona abrió desde Buscar en este aparato, hasta cinco. Vive
 * en el navegador (`localStorage`), sin cuenta y sin salir del teléfono; si el almacén no está o se llena, no pasa nada. `meta` son
 * las líneas de datos bajo el nombre, sin el tipo (`metaDe`); `clase`, el nombre de lo que es un festival o una exposición (OL-338).
 *
 * Lo guardado es una foto de cuando se abrió: al abrir Buscar se pone al día con lo que hay hoy (`recientesAlDia`, OL-338: el founder veía la
 * portada vieja de un evento después de cambiarla).
 */
export type Reciente = { grupo: GrupoBuscador; id: string; href: string; foto: string | null; titulo: string; meta: string[]; clase?: string };

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
  const cadenas = [r.id, r.href, r.titulo].every((v) => typeof v === "string") && (typeof r.foto === "string" || r.foto === null) && Array.isArray(r.meta) && r.meta.every((v) => typeof v === "string") && (r.clase === undefined || typeof r.clase === "string");
  return GRUPOS.includes(r.grupo) && cadenas && (r.href as string).startsWith("/") && !(r.href as string).startsWith("//");
}

/** Quien pinta los recientes (Buscar) vuelve a leerlos cuando cambian: al abrir uno y al ponerlos al día. */
const escuchas = new Set<() => void>();
export function suscribirseRecientes(escucha: () => void): () => void {
  escuchas.add(escucha);
  return () => escuchas.delete(escucha);
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

/** Escribe la lista entera y avisa a quien la pinta. */
function escribir(lista: Reciente[], almacen: Almacen | null): void {
  try {
    almacen?.setItem(LLAVE_RECIENTES, JSON.stringify(lista));
  } catch {
    return;
  }
  for (const escucha of escuchas) escucha();
}

/** Apunta lo que la persona acaba de abrir desde Buscar. */
export function guardarReciente(nuevo: Reciente, almacen: Almacen | null = almacenLocal()): void {
  escribir(conReciente(leerRecientes(crudoDeRecientes(almacen)), nuevo), almacen);
}

/**
 * Los recientes con lo que hay hoy (OL-338): su foto, su nombre, sus datos, lo que es y su dirección, de `vigentes` (lo que devuelve
 * `vigentesDeRecientes`, por `grupo:id`). Uno que ya no se ve (`null`) sale de la lista; uno que no se preguntó se queda como estaba. La
 * dirección de un lugar abierto desde Lugares sigue siendo la del mapa (`hrefEnMapa`). `ciudadActual` decide si la meta dice la ciudad.
 */
export function recientesAlDia(lista: Reciente[], vigentes: Record<string, Encontrado | null>, ciudadActual: string): Reciente[] {
  return lista.flatMap((r): Reciente[] => {
    const llave = `${r.grupo}:${r.id}`;
    if (!(llave in vigentes)) return [r];
    const e = vigentes[llave];
    if (!e) return [];
    const href = r.href.startsWith("/lugares?") ? hrefEnMapa(e) : e.href;
    return [{ grupo: r.grupo, id: r.id, href, foto: e.foto, titulo: e.titulo, meta: metaDe(e, ciudadActual), ...(e.clase ? { clase: e.clase } : {}) }];
  });
}

/** Guarda los recientes puestos al día, solo si algo cambió (así no se avisa por nada). */
export function guardarRecientesAlDia(vigentes: Record<string, Encontrado | null>, ciudadActual: string, almacen: Almacen | null = almacenLocal()): void {
  const crudo = crudoDeRecientes(almacen);
  const lista = leerRecientes(crudo);
  const alDia = recientesAlDia(lista, vigentes, ciudadActual);
  if (JSON.stringify(alDia) !== JSON.stringify(lista)) escribir(alDia, almacen);
}
