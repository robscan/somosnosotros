/**
 * Lógica pura de "¿Dónde está?" en Agregar/Editar lugar (OL-211): la pantalla completa "¿Dónde es?" del alta de
 * evento (OL-173/OL-182/OL-187, docs/rediseno/43), adaptada — aquí se está creando (o corrigiendo) un LUGAR, así
 * que no hay nada que "elegir" entre los ya registrados. Sin red ni DOM, para poder probarla sin Mapbox ni React.
 */
import { combinarResultados, lugaresPorTexto, type LugarSugerido, type ResultadoBusqueda } from "@/lib/buscarLugares";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { ciudadDeContexto, type ContextoDireccion } from "@/lib/direccionContexto";
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

/**
 * El contexto para acercar la búsqueda de Mapbox (OL-100), en la MISMA cascada que usa "¿Dónde es?" del alta de
 * evento (`HojaDondeEs.tsx`: pin ya puesto → texto → ciudad elegida → posición del teléfono → San Luis Potosí de
 * respaldo) — sin la "ciudad elegida" (`ciudadContexto`), esta pantalla se quedaba en el respaldo sin ninguna
 * pista real casi siempre (nadie llega a "Agregar lugar" con el teléfono ya ubicado), y sin pista real no hay
 * `bbox` (`bboxParaContexto`): Mapbox buscaba en todo el país y devolvía sugerencias de otros estados (corrección
 * del gestor, revisión sobre el PR #249: "Laboratorio de Arte Escénico" traía Aguascalientes, Pachuca y CDMX).
 * Con el pin YA puesto (editando, o ya fijado en esta misma sesión) el propio punto manda, igual que en el canon.
 */
export function contextoDondeEsta(punto: Punto | null, q: string, ciudadContexto: Ciudad | null | undefined, yo: Punto | null, posicionTelefono: Punto | null): ContextoDireccion {
  if (punto) return { ciudad: CIUDAD_INICIAL, centro: punto, origen: "posicion" };
  return ciudadDeContexto({ texto: q, ciudadChip: ciudadContexto, posicion: yo ?? posicionTelefono });
}

/**
 * Los renglones de la lista flotante: lugares registrados que coinciden con el texto (comparación pura, sin red)
 * PRIMERO, luego lo que trae Mapbox (`combinarResultados`, docs/rediseno/43) — igual que el canon del alta de
 * evento. Corrección del gestor (revisión sobre el PR #249): un lugar registrado que coincide debe salir SIEMPRE,
 * llegue o no algo de Mapbox (el `resultadosMapbox` que ya haya, incluso vacío o con varios) nunca lo saca de la
 * lista ni le quita el primer lugar — se probó a fondo con `resultadosDondeEsta.test.ts`.
 */
export function resultadosDondeEsta(lugares: readonly LugarResumen[], q: string, resultadosMapbox: readonly LugarSugerido[]): ResultadoBusqueda[] {
  const texto = q.trim();
  const lugaresFiltrados = texto ? lugaresPorTexto([...lugares], q) : [];
  const conTextoLargo = texto.length >= 3;
  return combinarResultados(lugaresFiltrados, conTextoLargo ? resultadosMapbox : []);
}
