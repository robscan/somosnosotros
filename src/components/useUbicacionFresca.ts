"use client";

import { useSyncExternalStore } from "react";
import type { Punto } from "@/lib/geo";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";

/** Quien mira la memoria de ubicación del teléfono: se le avisa cuando la persona pide una nueva. */
const oyentes = new Set<() => void>();
function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
/** La ubicación fresca como texto: un valor simple, que `useSyncExternalStore` puede comparar entre lecturas. */
const leer = () => JSON.stringify(ubicacionCercanaFresca());

/**
 * La ubicación aproximada que el teléfono ya guardó y sigue fresca (la que deja «Mi ubicación», en Lugares, o «Cercanos», en Agenda;
 * nunca sale del teléfono), o null. Solo la lee: nunca la pide. La comparten el número «Distancia» de un lugar y el renglón del sitio
 * de un evento, para que los dos digan lo mismo.
 */
export function useUbicacionFresca(): Punto | null {
  return JSON.parse(useSyncExternalStore(suscribir, leer, () => "null")) as Punto | null;
}

/** Avisa a quien la mira que la memoria cambió: la persona acaba de pedir una ubicación nueva. */
export function avisarUbicacion() {
  oyentes.forEach((oyente) => oyente());
}
