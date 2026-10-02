"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Punto } from "@/lib/geo";
import { releerUbicacionAlDia, ubicacionCercanaFresca } from "@/lib/ubicacion";

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

/** Relee la ubicación si hace falta (con permiso ya concedido y el punto viejo) y, si cambió, avisa a quien la mira. */
function ponerAlDia() {
  void releerUbicacionAlDia().then((cambio) => cambio && avisarUbicacion());
}

/**
 * La ubicación aproximada que el teléfono ya guardó y sigue fresca (la que deja «Mi ubicación», en Lugares, o «Cercanos», en Agenda;
 * nunca sale del teléfono), o null. La comparten el número «Distancia» de un lugar, el renglón del sitio de un evento y el orden de
 * Lugares, para que digan lo mismo. Nunca pide permiso: solo si ya estaba concedido la relee sola, al abrirse la pantalla y al volver la
 * app al frente (OL-255); mientras llega se ve la anterior y al llegar se actualiza.
 */
export function useUbicacionFresca(): Punto | null {
  useEffect(() => {
    ponerAlDia();
    const alVolver = () => document.visibilityState === "visible" && ponerAlDia();
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, []);
  return JSON.parse(useSyncExternalStore(suscribir, leer, () => "null")) as Punto | null;
}

/** Avisa a quien la mira que la memoria cambió: la persona acaba de pedir una ubicación nueva. */
export function avisarUbicacion() {
  oyentes.forEach((oyente) => oyente());
}
