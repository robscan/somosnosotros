import { useSyncExternalStore } from "react";
import { CLAVE_MEMORIA, leerMemoria, type Trabajos } from "./trabajosLista";

/**
 * OL-506: dónde vive lo que la lista sabe de los trabajos (el dueño del estado es `ListaInstagram`; esto es su memoria). En el teléfono, una tienda
 * del módulo respaldada en la sesión (`sessionStorage`, 10 min): sobrevive a salir de la pantalla y volver con Atrás (la lista llega de la caché
 * con la línea vieja y la tarjeta queda como se dejó). En el servidor y al hidratar, vacía: nada cambia entre lo que pinta el servidor y el primer
 * pintado del teléfono.
 */
const VACIO: Trabajos = {};
let cache: Trabajos | null = null;
const oyentes = new Set<() => void>();

function sesion(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function leerTrabajos(): Trabajos {
  if (cache === null) {
    let texto: string | null = null;
    try {
      texto = sesion()?.getItem(CLAVE_MEMORIA) ?? null;
    } catch {}
    cache = leerMemoria(texto, Date.now());
  }
  return cache;
}

export function escribirTrabajos(cambiar: (t: Trabajos) => Trabajos): void {
  const antes = leerTrabajos();
  const nuevo = cambiar(antes);
  if (nuevo === antes) return;
  cache = nuevo;
  try {
    sesion()?.setItem(CLAVE_MEMORIA, JSON.stringify(nuevo));
  } catch {}
  for (const o of oyentes) o();
}

function suscribir(o: () => void): () => void {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

/** Lo que la sesión recuerda; vacío en el servidor y al hidratar. */
export function useTrabajosRecordados(): Trabajos {
  return useSyncExternalStore(suscribir, leerTrabajos, () => VACIO);
}
