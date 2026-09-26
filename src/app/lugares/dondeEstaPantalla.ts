/**
 * Lógica pura de "Dónde está" en Agregar/Editar lugar (OL-211): la pantalla completa "¿Dónde es?" del alta de
 * evento (OL-173/OL-182/OL-187, docs/rediseno/43), adaptada — aquí se está creando (o corrigiendo) un LUGAR, así
 * que no hay nada que "elegir" entre los ya registrados. Sin red ni DOM, para poder probarla sin Mapbox ni React.
 */
import { distanciaKm } from "@/lib/geo";
import type { Punto } from "@/lib/geo";
import type { LugarResumen } from "@/lib/lugares";

/** Radio de "ya existe" (mismo umbral que la regla de los 150 m de `lugares/acciones.ts`, `lugares_parecidos`). */
export const RADIO_YA_EXISTE_M = 150;

/**
 * ¿Hay un lugar YA REGISTRADO a menos de 150 m del punto que se está fijando? A diferencia de `lugares_parecidos`
 * (que además exige el mismo nombre normalizado, para decidir si ALGO que se está guardando debe reutilizar un
 * registro existente), esta es solo una advertencia temprana mientras se elige la ubicación -no importa el nombre
 * que traiga el pin todavía-: los pines del mapa "sirven para avisar «ya existe» ... y llevar a su ficha, no para
 * elegirlos" (founder, OL-211). Con más de uno cerca, se avisa del más cercano.
 */
export function lugarCercano(lugares: readonly LugarResumen[], punto: Punto, radioM = RADIO_YA_EXISTE_M): LugarResumen | null {
  let mejor: { lugar: LugarResumen; distanciaM: number } | null = null;
  for (const l of lugares) {
    const distanciaM = distanciaKm(punto, { lat: l.lat, lng: l.lng }) * 1000;
    if (distanciaM < radioM && (!mejor || distanciaM < mejor.distanciaM)) mejor = { lugar: l, distanciaM };
  }
  return mejor?.lugar ?? null;
}

/**
 * El texto con el que arranca la búsqueda al abrir la pantalla desde "Buscar" (sin ubicación todavía): el nombre
 * ya escrito en el formulario, si lo hay (founder, OL-211: "el nombre del lugar puede ya venir escrito del
 * formulario") — así la primera búsqueda ya trae algo, en vez de obligar a escribirlo dos veces. Reabrir desde
 * "Cambiar" (ya hay ubicación) arranca con el campo vacío: no tiene sentido repetir la búsqueda que ya se resolvió.
 */
export function textoInicialBusqueda(nombreForm: string, yaUbicado: boolean): string {
  return yaUbicado ? "" : nombreForm.trim();
}
