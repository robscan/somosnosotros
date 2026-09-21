/**
 * Contexto para acercar la búsqueda de direcciones a Mapbox (OL-100, founder 2026-09-21, caso con nombre
 * "Galeana #423, S.L.P."): limpiar el texto, reconocer una ciudad en él, y decidir con qué centro y bbox buscar.
 * Todo puro y sin red, para poder probarlo sin gastar llamadas reales a Mapbox.
 *
 * La causa medida (docs/rediseno/26-alta-evento-lugar.md): Mapbox elige primero sus 10 candidatos por coincidencia
 * de texto y solo después reordenamos por distancia (geocodificar.ts, buscarLugares.ts); con "Galeana" suelto (por
 * "Hermenegildo Galeana"), la calle real ni siquiera entraba en esos 10. Acotar con `bbox` a la ciudad de contexto
 * evita que Mapbox proponga algo lejano en el primer intento.
 */
import type { Ciudad } from "@/lib/ciudad";
import { CIUDAD_INICIAL, CIUDADES } from "@/lib/ciudad";
import { distanciaKm } from "@/lib/geo";
import type { Punto } from "@/lib/geo";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Alias de ciudad reconocibles en texto libre (abreviaturas que la gente escribe), del más largo al más corto. */
const ALIAS_CIUDAD: [string, string][] = [
  ["san luis potosi", "San Luis Potosí"],
  ["san luis potosí", "San Luis Potosí"],
  ["s.l.p.", "San Luis Potosí"],
  ["slp", "San Luis Potosí"],
  ["san luis", "San Luis Potosí"],
  ["ciudad de mexico", "Ciudad de México"],
  ["cdmx", "Ciudad de México"],
];
ALIAS_CIUDAD.sort((a, b) => b[0].length - a[0].length);

/**
 * Un alias como patrón: sin \b (falla con el punto final de "S.L.P." — a final de cadena, ambos lados cuentan como
 * "no letra" y \b no marca frontera ahí), con fronteras propias por letra/dígito a los dos lados.
 */
function patronAlias(alias: string): RegExp {
  const escapado = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-záéíóúñ0-9])${escapado}(?![a-záéíóúñ0-9])`, "i");
}

/**
 * Limpia abreviaturas comunes de direcciones mexicanas antes de mandar el texto a Mapbox: "#" y "No." estorban la
 * búsqueda de calle y número, "esq." y "col." se escriben completas, y el primer alias de ciudad que aparece se
 * expande a su nombre completo (caso con nombre del founder: "Galeana #423, S.L.P." → "Galeana 423, San Luis Potosí").
 */
export function limpiarDireccion(texto: string): string {
  let t = texto;
  t = t.replace(/#/g, " ");
  t = t.replace(/\bno\.\s*/gi, " ");
  t = t.replace(/\besq\.\s*/gi, "esquina ");
  t = t.replace(/\bcol\.\s*/gi, "colonia ");
  for (const [alias, nombre] of ALIAS_CIUDAD) {
    const re = patronAlias(alias);
    if (re.test(t)) {
      t = t.replace(re, nombre);
      break;
    }
  }
  return t.replace(/\s+/g, " ").trim();
}

/** ¿El texto ya trae una ciudad reconocible (de las que existen hoy)? Devuelve la ciudad o `null`. */
export function ciudadDelTexto(texto: string, ciudades: readonly Ciudad[] = CIUDADES): Ciudad | null {
  for (const [alias, nombre] of ALIAS_CIUDAD) {
    if (!patronAlias(alias).test(texto)) continue;
    const ciudad = ciudades.find((c) => c.nombre === nombre);
    if (ciudad) return ciudad;
  }
  const n = normalizar(texto);
  for (const c of ciudades) {
    if (n.includes(normalizar(c.nombre))) return c;
  }
  return null;
}

export type OrigenContexto = "texto" | "lugar" | "chip" | "posicion" | "inicial";
export type ContextoDireccion = { ciudad: Ciudad; centro: Punto; origen: OrigenContexto };

/**
 * Ciudad de contexto en cascada, en el orden que fijó el founder (vía el gestor, 2026-09-21): el propio texto manda;
 * si no dice nada, el lugar que ya leyó el cartel (su punto, si coincide con el directorio); si tampoco, la ciudad
 * del chip de la Agenda desde la que se entró a publicar; si tampoco, la posición aproximada del teléfono (cacheada
 * o pedida con un toque); y si nada de eso resuelve, San Luis Potosí de respaldo.
 */
export function ciudadDeContexto(opciones: {
  texto?: string;
  ciudades?: readonly Ciudad[];
  puntoLugarLeido?: Punto | null;
  ciudadChip?: Ciudad | null;
  posicion?: Punto | null;
}): ContextoDireccion {
  const ciudades = opciones.ciudades ?? CIUDADES;
  const delTexto = opciones.texto ? ciudadDelTexto(opciones.texto, ciudades) : null;
  if (delTexto) return { ciudad: delTexto, centro: delTexto.centro, origen: "texto" };
  if (opciones.puntoLugarLeido) return { ciudad: opciones.ciudadChip ?? CIUDAD_INICIAL, centro: opciones.puntoLugarLeido, origen: "lugar" };
  if (opciones.ciudadChip) return { ciudad: opciones.ciudadChip, centro: opciones.ciudadChip.centro, origen: "chip" };
  if (opciones.posicion) return { ciudad: opciones.ciudadChip ?? CIUDAD_INICIAL, centro: opciones.posicion, origen: "posicion" };
  return { ciudad: CIUDAD_INICIAL, centro: CIUDAD_INICIAL.centro, origen: "inicial" };
}

/** Radio del área que acota la búsqueda (bbox), una ciudad chica cabe de sobra en 15 km a la redonda del centro. */
const RADIO_BBOX_KM = 15;

/** bbox `[oeste, sur, este, norte]` para Mapbox, alrededor de un centro. */
export function bboxDesdeCentro(centro: Punto, radioKm = RADIO_BBOX_KM): [number, number, number, number] {
  const dLat = radioKm / 111; // 1° de latitud ~ 111 km
  const dLng = radioKm / (111 * Math.cos((centro.lat * Math.PI) / 180));
  return [centro.lng - dLng, centro.lat - dLat, centro.lng + dLng, centro.lat + dLat];
}

/** Radio dentro del cual un resultado cuenta como "cerca" del centro de contexto. */
const RADIO_CERCA_KM = 20;

/**
 * ¿Hace falta una segunda búsqueda? Solo si NINGÚN resultado quedó cerca del centro de contexto (o no hubo
 * ninguno) — nunca por gusto, para cuidar el gasto de Mapbox (una sola vez por búsqueda, pedido del gestor).
 */
export function necesitaReintento<T extends Punto>(resultados: readonly T[], centro: Punto): boolean {
  if (!resultados.length) return true;
  return !resultados.some((r) => distanciaKm(centro, r) <= RADIO_CERCA_KM);
}

/**
 * Misma pregunta que `necesitaReintento`, para la búsqueda de lugares (Search Box): ahí la distancia llega en
 * metros desde el paso "sugerir" (Mapbox), sin coordenadas todavía — no vale la pena una llamada de más solo para
 * medirla con `distanciaKm`.
 */
export function necesitaReintentoLugares(distanciasM: readonly (number | null)[], radioKm = RADIO_CERCA_KM): boolean {
  if (!distanciasM.length) return true;
  return !distanciasM.some((d) => d != null && d <= radioKm * 1000);
}

/** El texto para el reintento: limpio, y con el nombre de la ciudad de contexto pegado si no lo trae ya. */
export function textoParaReintento(texto: string, ciudad: Ciudad): string {
  const limpio = limpiarDireccion(texto);
  if (normalizar(limpio).includes(normalizar(ciudad.nombre))) return limpio;
  return `${limpio}, ${ciudad.nombre}`;
}
