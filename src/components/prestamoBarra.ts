import { useSyncExternalStore, type ReactNode } from "react";

/**
 * Lo que la pantalla que se ve le presta a la barra de la app, que vive en el layout y no la conoce: qué hace su
 * lupa (la búsqueda de la pantalla), a dónde vuelve su Atrás y su menú «···». La pantalla lo presta al montarse
 * (`prestarALaBarra` devuelve cómo devolverlo) y la barra lo lee; sin nadie que preste, la barra usa lo suyo.
 */
export type Prestado = {
  buscar?: () => void;
  volver?: { href: string; texto: string };
  menu?: ReactNode;
};

const VACIO: Prestado = {};
let prestado: Prestado = VACIO;
const oyentes = new Set<() => void>();

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Presta `parte` a la barra. Al devolverlo solo se lleva lo suyo: lo que otra pantalla prestó después se queda. */
export function prestarALaBarra(parte: Prestado): () => void {
  prestado = { ...prestado, ...parte };
  oyentes.forEach((o) => o());
  return () => {
    const resto = { ...prestado };
    for (const clave of Object.keys(parte) as (keyof Prestado)[]) if (resto[clave] === parte[clave]) delete resto[clave];
    prestado = resto;
    oyentes.forEach((o) => o());
  };
}

/** Lo prestado ahora mismo. En el servidor no hay nada: la barra pinta lo suyo y se completa al montar. */
export function usePrestadoALaBarra(): Prestado {
  return useSyncExternalStore(suscribir, () => prestado, () => VACIO);
}
