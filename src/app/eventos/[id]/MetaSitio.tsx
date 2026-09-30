"use client";

import { useUbicacionFresca } from "@/components/useUbicacionFresca";
import { metaSitio } from "@/lib/ficha";
import { distanciaKm, type Punto } from "@/lib/geo";

/**
 * La meta del renglón del sitio de un evento (la `small` de su `Renglon dato`): la dirección y, al final, a cuánto está de quien mira
 * («… · 1,2 km»). La distancia sale de la ubicación aproximada que el teléfono ya guardó, la misma y con el mismo formato que el número
 * «Distancia» de un lugar (`useUbicacionFresca`, `lib/ficha`), y solo va cuando ya está ahí: la ficha nunca pide permiso de ubicación.
 * `punto` es el que ya usan el mapa y «Cómo llegar» de esta tarjeta; sin él (un sitio reservado sin revelar, u otro sitio sin
 * coordenadas) no hay distancia.
 */
export default function MetaSitio({ direccion, punto }: { direccion: string | null; punto: Punto | null }) {
  const yo = useUbicacionFresca();
  const meta = metaSitio(direccion, yo && punto ? distanciaKm(yo, punto) : null);
  return meta ? <small>{meta}</small> : null;
}
