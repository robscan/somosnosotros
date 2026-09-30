import { CIUDAD_INICIAL, slugDeCiudad } from "./ciudad";
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
 * «Mejor resultado»: si lo escrito es el nombre de algo, o el principio de su nombre (sin acentos ni mayúsculas), ese resultado
 * va arriba de todo, sea del tipo que sea: es lo que el sistema infiere que se buscaba. Un nombre igual gana a uno que solo empieza
 * igual; a igualdad, el del tipo de la sección desde la que se abrió Buscar y, si no, el primero de la lista (la de su ciudad).
 */
export function mejorResultado(resultado: ResultadoBusqueda, texto: string, desde: GrupoBuscador): Hallazgo | null {
  const buscado = normalizarNombre(texto);
  if (!buscado) return null;
  let empieza: Hallazgo | null = null;
  for (const grupo of ordenBusqueda(desde)) {
    for (const encontrado of resultado[grupo]) {
      const nombre = normalizarNombre(encontrado.titulo);
      if (nombre === buscado) return { grupo, encontrado };
      if (!empieza && nombre.startsWith(buscado)) empieza = { grupo, encontrado };
    }
  }
  return empieza;
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
 * Arma lo que se ve. Con «Todo», el mejor resultado y un grupo por tipo, cada uno sin el mejor; con un tipo elegido, solo ese tipo,
 * completo (y su mejor resultado, si lo tiene). Los grupos vacíos no salen.
 */
export function armarVista(resultado: ResultadoBusqueda, texto: string, desde: GrupoBuscador, tipo: GrupoBuscador | null): Vista {
  const tipos = ordenBusqueda(desde).filter((g) => resultado[g].length > 0);
  const elegido = tipo && tipos.includes(tipo) ? tipo : null;
  const buscable = elegido ? { ...SIN_RESULTADOS_BUSQUEDA, [elegido]: resultado[elegido] } : resultado;
  const mejor = mejorResultado(buscable, texto, desde);
  const grupos = (elegido ? [elegido] : tipos)
    .map((grupo) => ({ grupo, encontrados: resultado[grupo].filter((e) => e !== mejor?.encontrado) }))
    .filter((g) => g.encontrados.length > 0);
  return { mejor, grupos, tipos, elegido };
}

/** Lo que dice el renglón bajo el nombre, un dato por línea: sus datos y, si es de otra ciudad, la ciudad (el país la distingue: «Córdoba, España»). */
export function metaDe(e: Encontrado, ciudadActual: string): string[] {
  return e.ciudad && e.ciudad !== ciudadActual ? [e.detalle, e.ciudad] : [e.detalle];
}

/** La meta de un renglón que no lleva rótulo de grupo (el mejor resultado, los recientes): su tipo va delante, en la primera línea («Evento · vie 2 oct · MUNI»). */
export function metaConTipo(grupo: GrupoBuscador, meta: string[]): string[] {
  return [`${ROTULO[grupo].tipo} · ${meta[0] ?? ""}`, ...meta.slice(1)];
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
