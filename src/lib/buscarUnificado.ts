import { hrefAgenda, SIN_FILTROS } from "./agenda";
import { CIUDAD_INICIAL, slugDeCiudad } from "./ciudad";
import { atajosCuando } from "./cuando";
import type { Tarjeta } from "./destacados";
import { normalizarNombre } from "./lugares";

/**
 * El buscador único (docs/rediseno/50, OL-237; antes docs/rediseno/41, OL-153): lo que comparten la acción de servidor
 * (`app/accionesBuscar.ts`, que solo puede exportar funciones async por ser "use server") y la pantalla Buscar (`app/buscar`).
 * Aquí vive lo puro: cómo se ordena lo encontrado, cuál es «el mejor resultado» y qué se ve con cada chip.
 */

/** Los tres tipos de lo que se busca; también son las tres secciones desde las que se abre Buscar. */
export type GrupoBuscador = "eventos" | "lugares" | "artistas";
/** Una tarjeta encontrada, con la ciudad de su ficha: la ciudad ordena, no limita. */
export type Encontrado = Tarjeta & { ciudad: string };
export type ResultadoBusqueda = Record<GrupoBuscador, Encontrado[]>;
export const SIN_RESULTADOS_BUSQUEDA: ResultadoBusqueda = { eventos: [], lugares: [], artistas: [] };

/** Cuántos resultados trae cada tipo como mucho. */
export const LIMITE_BUSQUEDA_UNIFICADA = 20;
/** Cuántos se ven de cada tipo antes de «Ver N más». */
export const POR_GRUPO = 3;

/** Cómo se llama cada tipo como grupo y como dato en la meta de un renglón («Evento · vie 2 oct · MUNI»). */
export const ROTULO: Record<GrupoBuscador, { grupo: string; tipo: string }> = {
  eventos: { grupo: "Eventos", tipo: "Evento" },
  lugares: { grupo: "Lugares", tipo: "Lugar" },
  artistas: { grupo: "Artistas", tipo: "Artista" },
};

/**
 * Qué grupo va primero lo manda la sección desde la que se abrió Buscar (doc 41, «El buscador único»; L28): el de la propia
 * sección y, después, los otros dos en su orden de siempre. Perfil y lo demás cuentan como eventos (el «+» lo lee igual).
 */
export function ordenBusqueda(desde: GrupoBuscador): GrupoBuscador[] {
  return [desde, ...(["eventos", "lugares", "artistas"] as const).filter((g) => g !== desde)];
}

/**
 * La ciudad ordena, no limita (founder, 2026-09-16): primero lo de la ciudad que se ve y después lo de las otras, en el orden que
 * traiga `orden` (por cercanía a esa ciudad: `ciudadesPorCercania`); lo de una ciudad que no está en la lista va al final. Dentro de
 * cada ciudad se conserva el orden que traía (los eventos, por fecha; lugares y artistas, por nombre).
 */
export function ordenarPorCiudad<T extends { ciudad: string }>(lista: T[], orden: readonly string[]): T[] {
  const puesto = (ciudad: string) => {
    const i = orden.indexOf(ciudad);
    return i < 0 ? orden.length : i;
  };
  return lista.toSorted((a, b) => puesto(a.ciudad) - puesto(b.ciudad));
}

export type Hallazgo = { grupo: GrupoBuscador; encontrado: Encontrado };

/**
 * «Mejor resultado» (founder, 2026-09-29): solo cuando lo escrito es el nombre entero de algo (sin acentos ni mayúsculas) o, si no,
 * cuando solo encaja al principio del nombre de una sola cosa entre todos los tipos: es lo que el sistema infiere que se buscaba.
 * Con varios que empiezan igual («museo») no hay mejor resultado y los grupos bastan. Un nombre entero gana a los que solo empiezan
 * igual; con dos nombres enteros, el del tipo de la sección de origen y, a igualdad, el primero de la lista (la de su ciudad).
 */
export function mejorResultado(resultado: ResultadoBusqueda, texto: string, desde: GrupoBuscador): Hallazgo | null {
  const buscado = normalizarNombre(texto);
  if (!buscado) return null;
  const empiezan: Hallazgo[] = [];
  for (const grupo of ordenBusqueda(desde)) {
    for (const encontrado of resultado[grupo]) {
      const nombre = normalizarNombre(encontrado.titulo);
      if (nombre === buscado) return { grupo, encontrado };
      if (nombre.startsWith(buscado)) empiezan.push({ grupo, encontrado });
    }
  }
  return empiezan.length === 1 ? empiezan[0] : null;
}

/** Lo que se ve con el texto escrito: el mejor resultado, los grupos que quedan y los tipos que trajo la búsqueda (los chips). */
export type Vista = {
  mejor: Hallazgo | null;
  grupos: { grupo: GrupoBuscador; encontrados: Encontrado[] }[];
  /** Los tipos con algo encontrado, en el orden de los grupos; hay chips solo si son más de uno. */
  tipos: GrupoBuscador[];
  /** El chip que vale: `null` es «Todo» (también cuando el elegido ya no trae nada con lo que se escribió). */
  elegido: GrupoBuscador | null;
};

/**
 * Arma lo que se ve. Con «Todo», el mejor resultado (si lo hay) y un grupo por tipo, cada uno sin el mejor; con un tipo elegido, solo
 * ese tipo, completo (y el mejor resultado solo si es de ese tipo: se busca entre todos los tipos, así que no cambia con el chip).
 * Los grupos vacíos no salen.
 */
export function armarVista(resultado: ResultadoBusqueda, texto: string, desde: GrupoBuscador, tipo: GrupoBuscador | null): Vista {
  const tipos = ordenBusqueda(desde).filter((g) => resultado[g].length > 0);
  const elegido = tipo && tipos.includes(tipo) ? tipo : null;
  const hallado = mejorResultado(resultado, texto, desde);
  const mejor = hallado && (!elegido || hallado.grupo === elegido) ? hallado : null;
  const grupos = (elegido ? [elegido] : tipos)
    .map((grupo) => ({ grupo, encontrados: resultado[grupo].filter((e) => e !== mejor?.encontrado) }))
    .filter((g) => g.encontrados.length > 0);
  return { mejor, grupos, tipos, elegido };
}

/** Lo que dice el renglón bajo el nombre, un dato por línea: sus datos y, si es de otra ciudad, la ciudad (el país la distingue: «Córdoba, España»). */
export function metaDe(e: Encontrado, ciudadActual: string): string[] {
  const datos = e.sitio ? `${e.detalle} · ${e.sitio}` : e.detalle;
  return e.ciudad && e.ciudad !== ciudadActual ? [datos, e.ciudad] : [datos];
}

/**
 * La meta de un renglón que no lleva rótulo de grupo (el mejor resultado, los recientes): su tipo va delante, en la primera línea («Evento · vie 2
 * oct · MUNI»). Un festival o una exposición (`clase`, OL-338) dicen lo que son en ese mismo sitio: «Festival · Del 16 al 18 de oct · …».
 */
export function metaConTipo(grupo: GrupoBuscador, meta: string[], clase?: string): string[] {
  return [`${clase ?? ROTULO[grupo].tipo} · ${meta[0] ?? ""}`, ...meta.slice(1)];
}

/**
 * Lo que se nombra de un evento en Buscar (OL-338): un festival y una exposición, como en el carril «Festivales y exposiciones» de Inicio
 * (OL-342), con su nombre de siempre (`nombreDeClase`). Un taller y un evento suelto, nada (como en ese carril).
 */
export const CLASES_NOMBRADAS: readonly string[] = ["festival", "exposicion"];

/**
 * ¿Hay que pedir la búsqueda? (OL-338). Lo que se ve es lo que trajo la última respuesta, y una respuesta solo vale para la edición del campo en
 * la que se pidió: lo encontrado puede cambiar (otra portada, otra fecha) mientras la persona mira una ficha o escribe otra cosa.
 * - `buscar`: lo escrito no es lo de la respuesta (una búsqueda nueva, tras la espera de la última letra);
 * - `refrescar`: es lo mismo, pero de otra edición: la memoria de pantalla la repuso al volver de una ficha, o se borró y se volvió a escribir
 *   igual. Se ve lo que había y se pide otra vez sin espera, sin «Buscando…» y sin cerrar lo desplegado; lo que llega lo reemplaza;
 * - `nada`: la respuesta es de lo escrito ahora.
 */
export function pedidoDeBusqueda(respuesta: { texto: string; edicion: number } | null, consulta: string, edicion: number): "buscar" | "refrescar" | "nada" {
  if (respuesta?.texto !== consulta) return "buscar";
  return respuesta.edicion === edicion ? "nada" : "refrescar";
}

/**
 * A dónde lleva un lugar cuando Buscar se abrió desde Lugares: de vuelta al mapa, de su ciudad, con su ficha abierta en la hoja (y
 * el mapa centrado en él). Desde cualquier otra sección lleva a su ficha completa (`Encontrado.href`).
 */
export function hrefEnMapa(e: Encontrado): string {
  const consulta = new URLSearchParams();
  const ciudad = slugDeCiudad(e.ciudad);
  if (ciudad && ciudad !== CIUDAD_INICIAL.slug) consulta.set("ciudad", ciudad);
  consulta.set("lugar", e.href.split("/").pop() ?? e.id);
  return `/lugares?${consulta}`;
}

/**
 * Los atajos de «Esta semana» en Buscar (founder, 2026-09-29): tres fijos, en este orden, sin consulta. Cada uno lleva a Agenda con el
 * filtro que ya existe puesto (los de la hoja Cuándo y Filtros): Hoy, Fin de semana (el sábado y el domingo de esta semana) y Gratis.
 * `hoy` es YYYY-MM-DD en la zona de la ciudad y `ciudad` su slug en la URL (null es la inicial).
 */
export function atajosDeLaSemana(hoy: string, ciudad: string | null): { etiqueta: string; href: string }[] {
  const cuando = (etiqueta: string) => atajosCuando(hoy).find((a) => a.etiqueta === etiqueta)!.cuando;
  return [
    { etiqueta: "Hoy", href: hrefAgenda({ ...SIN_FILTROS, cuando: cuando("Hoy") }, ciudad) },
    { etiqueta: "Fin de semana", href: hrefAgenda({ ...SIN_FILTROS, cuando: cuando("Fin de semana") }, ciudad) },
    { etiqueta: "Gratis", href: hrefAgenda({ ...SIN_FILTROS, cuanto: ["gratis"] }, ciudad) },
  ];
}
