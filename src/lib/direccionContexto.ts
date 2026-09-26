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
import { CIUDAD_INICIAL, CIUDADES, ciudadPorSlug } from "@/lib/ciudad";
import { distanciaKm } from "@/lib/geo";
import type { Punto } from "@/lib/geo";
import type { Bbox } from "@/lib/geocodificar";

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
export function bboxDesdeCentro(centro: Punto, radioKm = RADIO_BBOX_KM): Bbox {
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

/**
 * El texto que de verdad se manda a Mapbox en el primer intento (revisión del gestor, caso real "Cenaria Foro
 * Expandido" / "Galeana #423, Centro, S.L.P."): limpio, y sin la ciudad de contexto si esta salió del propio
 * texto — mandarla ahí y en `proximity`/`bbox` a la vez no ayuda al buscador de texto de Mapbox, y una abreviatura
 * como "S.L.P." puede casar con nombres de carretera ("SLP-32") antes que con la calle real. Con otras ciudades
 * de contexto (chip, lugar, posición) el texto no la trae puesta: no hay nada que quitar.
 */
export function textoDeBusqueda(texto: string, contexto: ContextoDireccion): string {
  const limpio = limpiarDireccion(texto);
  if (contexto.origen !== "texto") return limpio;
  const patron = new RegExp(`,?\\s*${contexto.ciudad.nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*,?`, "i");
  const sinCiudad = limpio.replace(patron, ", ").replace(/\s*,\s*/g, ", ").replace(/^[,\s]+|[,\s]+$/g, "").trim();
  return sinCiudad || limpio;
}

/** Palabras que no dicen nada de la calle ni de la colonia: artículos y la ciudad de contexto no cuentan. */
const PALABRAS_VACIAS = new Set(["de", "del", "la", "el", "los", "las", "y", "san", "santa", "no"]);

function palabras(texto: string, ciudades: readonly Ciudad[]): string[] {
  const ciudad = ciudadDelTexto(texto, ciudades);
  const palabrasCiudad = ciudad ? normalizar(ciudad.nombre).split(/\s+/) : [];
  return normalizar(texto)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !/^\d+$/.test(t) && !PALABRAS_VACIAS.has(t) && !palabrasCiudad.includes(t));
}

/**
 * Las palabras de la propia calle escrita, sin la colonia: en "Galeana 423, Centro, S.L.P." es solo "galeana" —
 * lo que va antes de la primera coma (revisión del gestor: "Centro" por sí sola no debe bastar para que un
 * resultado sobreviva el filtro; una colonia genérica existe en casi cualquier municipio).
 */
export function tokensDeCalle(texto: string, ciudades: readonly Ciudad[] = CIUDADES): string[] {
  const [calle] = limpiarDireccion(texto).split(",");
  return palabras(calle ?? "", ciudades);
}

/**
 * Las palabras de la colonia (lo que va después de la primera coma, sin la ciudad): "centro" en "Galeana 423,
 * Centro, S.L.P.". Sirven para ordenar (pedido del gestor), nunca para descartar por sí solas.
 */
export function tokensDeColonia(texto: string, ciudades: readonly Ciudad[] = CIUDADES): string[] {
  const [, ...resto] = limpiarDireccion(texto).split(",");
  return palabras(resto.join(" "), ciudades);
}

/** El número de la calle escrita, si trae uno ("Galeana 423" → "423"). */
export function numeroDeCalle(texto: string): string | null {
  const m = texto.match(/\b\d{1,6}\b/);
  return m ? m[0] : null;
}

/** Cuántas sugerencias se muestran cuando ya se filtró por relevancia (antes se recortaba dentro de Mapbox). */
const LIMITE_SUGERENCIAS = 5;

/**
 * Descarta lo que no tiene ninguna palabra de la calle escrita (caso con nombre: los "Slp 32" para "Galeana 423"
 * se descartan enteros) y recorta a `limite` — DESPUÉS de filtrar, no antes (revisión del gestor: con 10
 * resultados donde 5 son basura cercana, recortar antes de filtrar podía tirar la buena dirección sin que este
 * filtro llegara a verla). Sin ninguna palabra de calle reconocible en el texto (solo un número, o una colonia
 * sola), no descarta nada — solo recorta. Sirve para lugares (Search Box), que no siempre traen coordenadas.
 */
export function descartarSinCalle<T extends { nombre: string; direccion: string }>(resultados: readonly T[], texto: string, ciudades?: readonly Ciudad[], limite = LIMITE_SUGERENCIAS): T[] {
  const tokens = tokensDeCalle(texto, ciudades);
  const filtrados = tokens.length ? resultados.filter((r) => tokens.some((t) => normalizar(`${r.nombre} ${r.direccion}`).includes(t))) : [...resultados];
  return filtrados.slice(0, limite);
}

/**
 * Para direcciones (con coordenadas): descarta lo que no trae ninguna palabra de la CALLE (nunca por la colonia
 * sola: "Centro" existe en casi cualquier municipio) y ordena lo que queda, en este orden — primero lo que cae en
 * el mismo municipio que la ciudad de contexto (revisión del gestor: "Galeana 423" existe también en Soledad de
 * Graciano Sánchez, un municipio distinto que Mapbox sí distingue en su `context.place`, aunque la app los trate
 * como la misma ciudad para todo lo demás); dentro de eso, lo que además coincide con la colonia escrita; luego
 * lo que trae también el número; y por último lo más cerca del centro de contexto. Sin ninguna palabra de calle
 * reconocible, ordena solo por cercanía, como antes — sin descartar ni depender del municipio ni la colonia.
 */
export function filtrarYOrdenarDirecciones<T extends Punto & { nombre: string; direccion: string; ciudad?: string | null }>(
  resultados: readonly T[],
  texto: string,
  centro: Punto,
  ciudadContexto?: string | null,
  ciudades?: readonly Ciudad[],
  limite = LIMITE_SUGERENCIAS,
): T[] {
  const tokens = tokensDeCalle(texto, ciudades);
  if (!tokens.length) return [...resultados].sort((a, b) => distanciaKm(centro, a) - distanciaKm(centro, b)).slice(0, limite);
  const numero = numeroDeCalle(texto);
  const tokensColonia = tokensDeColonia(texto, ciudades);
  const ciudadNormalizada = ciudadContexto ? normalizar(ciudadContexto) : null;
  const puntuados = resultados
    .map((r) => {
      const bolsa = normalizar(`${r.nombre} ${r.direccion}`);
      if (!tokens.some((t) => bolsa.includes(t))) return null;
      return {
        r,
        mismoMunicipio: !!ciudadNormalizada && !!r.ciudad && normalizar(r.ciudad) === ciudadNormalizada,
        conColonia: tokensColonia.length > 0 && tokensColonia.some((t) => bolsa.includes(t)),
        conNumero: !!numero && bolsa.includes(numero),
        distancia: distanciaKm(centro, r),
      };
    })
    .filter((p): p is { r: T; mismoMunicipio: boolean; conColonia: boolean; conNumero: boolean; distancia: number } => p !== null);
  puntuados.sort(
    (a, b) => Number(b.mismoMunicipio) - Number(a.mismoMunicipio) || Number(b.conColonia) - Number(a.conColonia) || Number(b.conNumero) - Number(a.conNumero) || a.distancia - b.distancia,
  );
  return puntuados.slice(0, limite).map((p) => p.r);
}

/**
 * El `bbox` que le toca a una búsqueda, según su ciudad de contexto (revisión del gestor, 2026-09-21): un `bbox`
 * no ordena, EXCLUYE todo lo de fuera — al contrario que `proximity`, que solo sesga. Con el respaldo (`origen:
 * "inicial"`, sin ninguna pista real) acotar sería silencioso y falso: alguien sin chip ni posición que publica en
 * Querétaro no encontraría jamás su propia calle, recortada a la zona de San Luis sin que lo sepa. Contradice "el
 * contexto ordena, no limita". Por eso solo hay `bbox` cuando la ciudad viene de una pista real (texto, lugar leído,
 * chip o posición); con el respaldo, ninguno — `proximity` solo.
 */
export function bboxParaContexto(contexto: ContextoDireccion, radioKm = RADIO_BBOX_KM): Bbox | undefined {
  return contexto.origen === "inicial" ? undefined : bboxDesdeCentro(contexto.centro, radioKm);
}

/**
 * Busca con hasta tres intentos, nunca más (cuida el gasto de Mapbox): (1) el texto limpio y SIN la ciudad de
 * contexto si venía en él (`textoDeBusqueda` — revisión del gestor: mandarla dos veces, en el texto y en
 * `proximity`/`bbox`, confundía el buscador de texto de Mapbox: "S.L.P." casaba con "SLP-32" antes que con la
 * calle real), con `bbox` si hay una ciudad de contexto real; (2) si nada quedó cerca, el texto limpio CON la
 * ciudad pegada, mismo `bbox` (una frase más explícita, distinta de la (1)); (3) si aun así nada quedó cerca, una
 * última vez SIN `bbox` (solo `proximity`) — un `bbox` equivocado (contexto en San Luis, la dirección real en otra
 * ciudad que el texto no nombra) no puede dejar a la persona sin encontrar lo suyo.
 * `buscar` es quien de verdad llama a Mapbox (inyectado, para poder probar esto sin red). `haceFalta` decide si el
 * resultado de un intento cuenta como "cerca" (distinto para direcciones —con coordenadas— y lugares —con la
 * distancia en metros que da el paso "sugerir"—).
 */
export async function buscarConContexto<T>(
  texto: string,
  contexto: ContextoDireccion,
  buscar: (texto: string, bbox: Bbox | undefined) => Promise<T[]>,
  haceFalta: (resultados: T[]) => boolean,
): Promise<T[]> {
  const bbox = bboxParaContexto(contexto);
  const primero = textoDeBusqueda(texto, contexto);
  let resultados = await buscar(primero, bbox);
  if (bbox && haceFalta(resultados)) {
    const reintento = textoParaReintento(texto, contexto.ciudad);
    if (reintento !== primero) {
      const segunda = await buscar(reintento, bbox);
      if (segunda.length) resultados = segunda;
    }
  }
  if (bbox && haceFalta(resultados)) {
    const tercera = await buscar(primero, undefined);
    if (tercera.length) resultados = tercera;
  }
  return resultados;
}

/**
 * Resuelve `?ciudad=` de la URL con la que se entró a "Publicar evento" (chip de la Agenda), pero sin el respaldo
 * silencioso de `ciudadPorSlug` — que ante un slug inventado o vacío cae en San Luis Potosí como si la persona lo
 * hubiera elegido (revisión del gestor, 2026-09-21). Aquí, cualquier valor que no coincida con una ciudad real
 * (inventado, vacío, o de una ciudad que ya no existe) cae en `null`: sin ciudad de contexto, como si no hubiera
 * venido nada en la URL.
 */
export function ciudadDesdeSlug(slug: string | null | undefined, ciudades: readonly Ciudad[] = CIUDADES): Ciudad | null {
  if (!slug) return null;
  const resuelta = ciudadPorSlug(slug, ciudades);
  return resuelta.slug === slug ? resuelta : null;
}

/**
 * A 3 decimales (~100 m): lo que la posición del teléfono aporta a Mapbox (`proximity`, centro del `bbox`) nunca
 * viaja más precisa que esto (regla de ubicación, DEFINICION 2026-09-21: "puede viajar a Mapbox, aproximada"). El
 * pin que la persona confirma a mano no pasa por aquí — ese es el dato del evento, no su ubicación.
 */
export function redondearParaMapbox(p: Punto): Punto {
  return { lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 };
}
