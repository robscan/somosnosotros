import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nombraAlcaldia, type ParametrosCiudad } from "../ciudadParametros";
import type { Punto } from "../geo";
import { normalizarNombre } from "../lugares";
import { buscarConApi, type ClienteApi } from "./claude";
import { datosDePropuesta, esClaveFuente, limpiarCandidato, NOMBRE_FUENTE, type Candidato, type ClaveFuente } from "./candidatos";
import {
  armarConocidos,
  cajaAlrededor,
  dentroDelArea,
  existeCerca,
  MOTIVOS,
  motivoPorNombre,
  municipioDeLaCiudad,
  radioDeCiudadKm,
  rechazadosNoCulturales,
  type Conocidos,
  type LugarConocido,
  type Motivo,
  type PropuestaConocida,
} from "./filtros";
import type { NotaCartelera } from "./carteleraCdmx";
import { centroDeCiudad, estadoDePunto, ubicar, type AreaCiudad, type Mapbox } from "./mapbox";
import { claveDeEstado, ESTADOS, leerSic, urlTablaSic } from "./sic";

/**
 * «Buscar lugares» para una ciudad (OL-428; doc 57 §4.B), un paso a la vez. Las fuentes se leen en el orden de `parametros.fuentes`:
 *   · guias    (OL-429) si la ciudad tiene guías culturales en `ciudades.parametros.guias`, van primero: una llamada por guía con la lectura web
 *              acotada a su sitio. La bandeja agrupa lo de cada guía con su nombre.
 *   · sic      el catálogo del Sistema de Información Cultural del estado, filtrado por el municipio (y sus alias). Gratis.
 *   · cultura  la búsqueda web acotada a los sitios de gobierno (`*.gob.mx`): una llamada para la cultura del estado y otra para el municipio.
 *   · web      la búsqueda web general: dos llamadas de dos búsquedas cada una (cuatro en toda la corrida).
 * Un paso hace UNA de estas cosas: leer una tarea de una fuente (y proponer ya lo que trae su punto), o ubicar con Mapbox un lote de 10 que
 * no lo traen y proponerlos. Lo que falta queda en `resumen.cursor`; lo que pasó, en contadores (nunca nombres). Lo que se lee y no se propone
 * se cuenta por su motivo (`filtros.ts`).
 *
 * El tope: antes de cada llamada a la API se mira que quepa (`COSTO_ESTIMADO_LLAMADA`); si no cabe o si lo gastado ya llegó al tope, las
 * tareas que usan la API se dejan y `resumen.tope` queda en true. Lo ya leído (pagado) se sigue ubicando y proponiendo: Mapbox y el SIC no
 * gastan el crédito.
 */

/** Un error que termina la corrida como «Falló» con esta frase (sin llaves ni datos privados). */
export class FalloCorrida extends Error {}

export type Tarea =
  | { fuente: "guias"; nombre: string; url: string }
  | { fuente: "sic" }
  | { fuente: "cultura"; parte: "estado" | "municipio" }
  | { fuente: "web"; busquedas: string[] };

export type CursorLugares = {
  tareas: Tarea[];
  /** Cuántas tareas había al empezar (para el avance). */
  total: number;
  /** Las fuentes de la corrida, en orden (para «2 de 3 fuentes»). */
  fuentes: ClaveFuente[];
  /** Leídos que esperan a Mapbox. */
  pendientes: Candidato[];
  /** Cuántos dejó la última tarea leída para ubicar. */
  leidos: number;
  centro: Punto;
  radioKm: number;
  /** La clave del INEGI del estado y su nombre, si se supo. */
  estado: number | null;
  estadoNombre: string | null;
  /** Veces seguidas que no se pudieron guardar las propuestas. */
  fallosSeguidos: number;
};

export type CiudadRutina = {
  slug: string;
  nombre: string;
  lat: number | null;
  lng: number | null;
  zoom: number;
  zona: string;
  alias: string[];
  estado: string;
  /** Alcaldías, guías y radio propios de la ciudad (OL-429, `ciudades.parametros`); vacíos, la ciudad se comporta como antes. */
  parametros: ParametrosCiudad;
};
export type CorridaRutina = { id: string; tipo: string; ciudad: string | null; parametros: Record<string, unknown>; tope_usd: number; gasto_usd: number; resumen: Record<string, unknown> };

export type Contexto = {
  corrida: CorridaRutina;
  ciudad: CiudadRutina;
  db: SupabaseClient;
  api: ClienteApi | null;
  mapbox: Mapbox | null;
  pedir: typeof fetch;
  ahora: () => Date;
  /** Hasta cuándo puede trabajar el paso (Date.now()). */
  hasta: number;
  /** Lo que este paso gasta en la API: se anota en cuanto se sabe, aunque después algo falle. */
  gastar: (usd: number) => void;
  gastado: () => number;
  /** ¿Sigue «corriendo»? (Si la cancelaron a medio paso, no se propone nada más.) */
  sigueCorriendo: () => Promise<boolean>;
  /** Esperar (la calma de la cartelera, OL-448); por omisión, de verdad. Las pruebas pasan un reloj falso. */
  dormir?: (ms: number) => Promise<void>;
  /** Lo que la lectura de la cartelera cuenta además (OL-451): sin hora y cómo cruzó cada recinto; solo lo usa el informe del guion de la Mac. */
  anotarCartelera?: (nota: NotaCartelera) => void;
};

export const LOTE_MAPBOX = 10;
/** Como mucho, cuántos candidatos nuevos deja una tarea por corrida; lo demás queda para la siguiente (`descartados.de_mas`). */
export const TOPE_POR_TAREA = 40;
/** Lo que se reserva antes de cada llamada: si no cabe en el tope, no se hace. */
export const COSTO_ESTIMADO_LLAMADA = 0.35;
/** El tiempo que necesita una llamada a la API para empezar; con menos, se deja para el siguiente paso. */
export const TIEMPO_PARA_LLAMADA_MS = 30_000;

type Descartes = Record<Motivo | "de_mas", number>;
type Contadores = {
  propuestos: number;
  errores: number;
  descartados: Descartes;
  por_fuente: Partial<Record<ClaveFuente, { propuestos: number; usd: number }>>;
  busquedas_web: number;
  cortadas: number;
};

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const numero = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const lista = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const nombresDe = (c: Pick<CiudadRutina, "nombre" | "alias">): string[] => [c.nombre, ...c.alias.filter(Boolean)];
/** Lo que cuenta como «dentro»: las alcaldías de la ciudad si las tiene (OL-429); si no, su nombre y sus alias. */
export const zonasDe = (c: Pick<CiudadRutina, "nombre" | "alias" | "parametros">): string[] => (c.parametros.alcaldias.length ? c.parametros.alcaldias : nombresDe(c));
/** El radio del área: el de los parámetros de la ciudad si lo trae (OL-429); si no, el que sale de su zoom. */
export const radioDe = (c: Pick<CiudadRutina, "zoom" | "parametros">): number => c.parametros.radio_km ?? radioDeCiudadKm(c.zoom);
const usaApi = (t: Tarea) => t.fuente !== "sic";
/** El dominio de una guía, sin «www.», para acotar la lectura web a su sitio. */
export const dominioDe = (url: string): string => new URL(url).hostname.replace(/^www\./, "");

function leerContadores(r: Record<string, unknown>): Contadores {
  const d = objeto(r.descartados);
  const descartados = Object.fromEntries([...MOTIVOS, "de_mas"].map((m) => [m, numero(d[m])])) as Descartes;
  const pf = objeto(r.por_fuente);
  const por_fuente: Contadores["por_fuente"] = {};
  for (const [k, v] of Object.entries(pf)) if (esClaveFuente(k)) por_fuente[k] = { propuestos: numero(objeto(v).propuestos), usd: numero(objeto(v).usd) };
  return { propuestos: numero(r.propuestos), errores: numero(r.errores), descartados, por_fuente, busquedas_web: numero(r.busquedas_web), cortadas: numero(r.cortadas) };
}

function deFuente(c: Contadores, f: ClaveFuente) {
  return (c.por_fuente[f] ??= { propuestos: 0, usd: 0 });
}

/** El cursor guardado, o null si no hay (la primera vez) o no se entiende. */
export function leerCursor(v: unknown): CursorLugares | null {
  const c = objeto(v);
  const centro = objeto(c.centro);
  if (!Array.isArray(c.tareas) || !Array.isArray(c.pendientes) || typeof centro.lat !== "number" || typeof centro.lng !== "number") return null;
  return {
    tareas: c.tareas as Tarea[],
    total: Math.max(1, numero(c.total)),
    fuentes: lista(c.fuentes).filter(esClaveFuente),
    pendientes: c.pendientes as Candidato[],
    leidos: numero(c.leidos),
    centro: { lat: centro.lat, lng: centro.lng },
    radioKm: numero(c.radioKm) || radioDeCiudadKm(13),
    estado: typeof c.estado === "number" ? c.estado : null,
    estadoNombre: typeof c.estadoNombre === "string" ? c.estadoNombre : null,
    fallosSeguidos: numero(c.fallosSeguidos),
  };
}

/** Las tareas de cada fuente, en el orden de la corrida. Las guías, una tarea por guía. */
export function tareasDe(fuentes: readonly ClaveFuente[], ciudad: string, guias: readonly { nombre: string; url: string }[] = []): Tarea[] {
  return fuentes.flatMap((f): Tarea[] =>
    f === "guias"
      ? guias.map((g) => ({ fuente: "guias", nombre: g.nombre, url: g.url }))
      : f === "sic"
      ? [{ fuente: "sic" }]
      : f === "cultura"
        ? [
            { fuente: "cultura", parte: "estado" },
            { fuente: "cultura", parte: "municipio" },
          ]
        : [
            { fuente: "web", busquedas: [`espacios culturales ${ciudad}`, `centro cultural ${ciudad}`] },
            { fuente: "web", busquedas: [`foro cultural ${ciudad}`, `galería de arte ${ciudad}`] },
          ],
  );
}

/** La primera vez: las tareas, el centro y el radio de la ciudad, y su estado (para el SIC). */
async function iniciar(ctx: Contexto, avisos: Set<string>): Promise<CursorLugares> {
  const pedidas = lista(ctx.corrida.parametros.fuentes);
  // Las guías de la ciudad van primero (OL-429), aunque la hoja no las nombre.
  const guias = ctx.ciudad.parametros.guias;
  const fuentes = [...new Set([...(guias.length ? (["guias"] as const) : []), ...pedidas.filter(esClaveFuente).filter((f) => f !== "guias")])];
  if (pedidas.some((f) => !esClaveFuente(f))) avisos.add("Hay fuentes que esta rutina no lee");
  if (!fuentes.length) throw new FalloCorrida("La corrida no dice qué fuentes leer");
  let centro: Punto | null = ctx.ciudad.lat != null && ctx.ciudad.lng != null ? { lat: ctx.ciudad.lat, lng: ctx.ciudad.lng } : null;
  if (!centro && ctx.mapbox) centro = await centroDeCiudad(ctx.ciudad.nombre, ctx.mapbox);
  if (!centro) throw new FalloCorrida("No se sabe dónde está la ciudad: falta su centro");
  let estado: number | null = null;
  let estadoNombre: string | null = null;
  if (ctx.mapbox) {
    const e = await estadoDePunto(centro, ctx.mapbox);
    estado = e ? claveDeEstado(e.codigo, e.nombre) : null;
    estadoNombre = estado ? (e?.nombre ?? ESTADOS.find((x) => x.clave === estado)?.nombres[0] ?? null) : null;
  }
  const tareas = tareasDe(fuentes, ctx.ciudad.nombre, guias);
  return { tareas, total: tareas.length, fuentes, pendientes: [], leidos: 0, centro, radioKm: radioDe(ctx.ciudad), estado, estadoNombre, fallosSeguidos: 0 };
}

/** Lo que la base sabe de la ciudad: sus lugares (por nombre de ciudad y por área) y todo lo que se propuso en ella. */
async function cargarConocidos(ctx: Contexto, area: AreaCiudad): Promise<{ conocidos: Conocidos; propuestas: PropuestaConocida[] }> {
  const nombres = nombresDe(ctx.ciudad);
  const caja = cajaAlrededor(area.centro, area.radioKm);
  const [porNombre, porArea, corridas] = await Promise.all([
    ctx.db.from("lugares").select("nombre, lat, lng").in("ciudad", nombres).limit(5000),
    ctx.db.from("lugares").select("nombre, lat, lng").gte("lat", caja.sur).lte("lat", caja.norte).gte("lng", caja.oeste).lte("lng", caja.este).limit(5000),
    ctx.db.from("rutinas_corridas").select("id").eq("ciudad", ctx.ciudad.slug).order("creado_en", { ascending: false }).limit(200),
  ]);
  if (porNombre.error || porArea.error || corridas.error) throw new Error("No se pudo leer lo conocido de la ciudad");
  const ids = (corridas.data ?? []).map((r: { id: string }) => r.id);
  let filas: { datos: unknown; estado: string; motivo_rechazo: string | null }[] = [];
  if (ids.length) {
    const r = await ctx.db.from("propuestas").select("datos, estado, motivo_rechazo").eq("tipo", "lugar").in("corrida_id", ids).limit(5000);
    if (r.error) throw new Error("No se pudo leer lo propuesto en la ciudad");
    filas = r.data ?? [];
  }
  const propuestas = filas.map((p) => ({ nombre: String(objeto(p.datos).nombre ?? ""), estado: p.estado, motivo: p.motivo_rechazo })).filter((p) => p.nombre);
  const vistos = new Set<string>();
  const lugares: LugarConocido[] = [];
  for (const l of [...(porNombre.data ?? []), ...(porArea.data ?? [])] as LugarConocido[]) {
    const k = `${l.nombre}|${l.lat}|${l.lng}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    lugares.push(l);
  }
  return { conocidos: armarConocidos(lugares, propuestas, nombres), propuestas };
}

// ---------- lo que se le pide a la API ----------
function ubicacionAproximada(ctx: Contexto, cursor: CursorLugares): Anthropic.UserLocation {
  return { type: "approximate", city: ctx.ciudad.nombre, ...(cursor.estadoNombre ? { region: cursor.estadoNombre } : {}), country: "MX", timezone: ctx.ciudad.zona };
}

export function herramientasDe(tarea: Tarea, ctx: Contexto, cursor: CursorLugares): Anthropic.ToolUnion[] {
  const user_location = ubicacionAproximada(ctx, cursor);
  if (tarea.fuente === "guias") return [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 3, allowed_domains: [dominioDe(tarea.url)], max_content_tokens: 12_000 }];
  if (tarea.fuente === "cultura")
    return [
      { type: "web_search_20260209", name: "web_search", max_uses: 2, allowed_domains: ["gob.mx"], user_location },
      { type: "web_fetch_20260209", name: "web_fetch", max_uses: 1, allowed_domains: ["gob.mx"], max_content_tokens: 10_000 },
    ];
  if (tarea.fuente === "web") return [{ type: "web_search_20260209", name: "web_search", max_uses: tarea.busquedas.length, user_location }];
  return [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 4, allowed_domains: ["sic.cultura.gob.mx"], max_content_tokens: 8_000 }];
}

/** El encargo de una llamada: la ciudad, qué buscar y dónde, lo que ya se conoce y lo que la administración rechazó (la rutina aprende). */
export function pedidoDe(tarea: Tarea, ctx: Contexto, cursor: CursorLugares, conocidos: Conocidos, propuestas: readonly PropuestaConocida[]): string {
  const ciudad = ctx.ciudad.nombre;
  const estado = cursor.estadoNombre ?? "su estado";
  const alcaldias = ctx.ciudad.parametros.alcaldias;
  const municipios = nombresDe(ctx.ciudad).join(", ");
  const que =
    tarea.fuente === "guias"
      ? `Abre la guía cultural «${tarea.nombre}» (${tarea.url}) y, si hace falta, como mucho 2 de sus páginas que hablen de ${ciudad}. Propón los espacios culturales de ${ciudad} que la guía recomienda, con su dirección si la guía la da.`
      : tarea.fuente === "cultura"
      ? tarea.parte === "estado"
        ? `Busca en las páginas del gobierno del estado de ${estado} (su secretaría o instituto de cultura) los espacios culturales que tienen en ${ciudad}: museos, teatros, centros y casas de cultura, galerías y foros, con su dirección. Haz como mucho 2 búsquedas y abre como mucho 1 página.`
        : `Busca en las páginas del Ayuntamiento de ${ciudad} (su dirección o instituto de cultura) los espacios culturales del municipio: casas de cultura, centros culturales, museos, teatros, bibliotecas y foros, con su dirección. Haz como mucho 2 búsquedas y abre como mucho 1 página.`
      : tarea.fuente === "web"
        ? `Haz estas búsquedas y no más: ${tarea.busquedas.map((b) => `«${b}»`).join(" y ")}. Propón los espacios culturales de ${ciudad} que encuentres, con su dirección si la página la da.`
        : `El Sistema de Información Cultural publica estos archivos CSV del estado (una fila por espacio): ${["museo", "teatro", "centro_cultural", "galeria"].map((t) => urlTablaSic(cursor.estado ?? 0, t)).join(" ")}. Ábrelos y propón los espacios cuyo municipio (columna nom_mun) sea ${zonasDe(ctx.ciudad).join(", ")}, con su dirección (calle y número, colonia). Tipos: museo → museo, teatro → foro, centro_cultural → casa_de_cultura, galeria → galeria.`;
  const conocidosTexto = conocidos.lista.slice(0, 150).map((n) => n.slice(0, 60)).join("; ");
  const noCulturales = rechazadosNoCulturales(propuestas);
  const fuera = propuestas.filter((p) => p.estado === "rechazada" && p.motivo === "fuera_de_la_ciudad").length;
  return [
    alcaldias.length
      ? `Ciudad: ${ciudad} (${estado}, México). Solo cuentan estas alcaldías: ${alcaldias.join(", ")}. En municipio pon la alcaldía donde está.`
      : `Ciudad: ${ciudad} (${estado}, México). Municipios que cuentan: ${municipios}.`,
    que,
    conocidosTexto ? `Ya se conocen (no los propongas): ${conocidosTexto}.` : "",
    noCulturales.length ? `La administración rechazó estos por no ser espacios culturales; no propongas nada parecido: ${noCulturales.join("; ")}.` : "",
    fuera ? `Antes se rechazaron ${fuera} por estar fuera de la ciudad: revisa bien el municipio.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** ¿La página que dice el modelo salió de verdad en lo que buscó o leyó? (Si no se puede saber, se le cree; si no, se quita.) */
function urlVerificada(url: string | null, paginas: Set<string>): string | null {
  if (!url || !paginas.size || paginas.has(url)) return url;
  const host = new URL(url).hostname.replace(/^www\./, "");
  return [...paginas].some((p) => {
    try {
      return new URL(p).hostname.replace(/^www\./, "") === host;
    } catch {
      return false;
    }
  })
    ? url
    : null;
}

// ---------- un paso ----------
export type SalidaPaso = { resumen: Record<string, unknown>; terminada: boolean };

export async function pasoLugares(ctx: Contexto): Promise<SalidaPaso> {
  const previo = ctx.corrida.resumen;
  const cont = leerContadores(previo);
  const avisos = new Set(lista<string>(previo.avisos).filter((a) => typeof a === "string"));
  let tope = previo.tope === true;
  const cursor = leerCursor(previo.cursor) ?? (await iniciar(ctx, avisos));
  const nombres = nombresDe(ctx.ciudad);
  const alcaldias = ctx.ciudad.parametros.alcaldias;
  /**
   * ¿De la ciudad? Sin alcaldías, el municipio que dice la fuente tiene que ser la ciudad o un alias (o no decirlo). Con alcaldías (OL-429),
   * el municipio o la dirección nombra una; si no nombra ninguna pero dice «Ciudad de México» (o nada), se decide al ubicarlo con Mapbox.
   */
  const enLaCiudad = (c: Candidato) =>
    !alcaldias.length
      ? municipioDeLaCiudad(c.municipio, nombres)
      : nombraAlcaldia([c.municipio, c.direccion], alcaldias) || municipioDeLaCiudad(c.municipio, nombres);
  const area: AreaCiudad = { centro: cursor.centro, radioKm: cursor.radioKm, nombres };
  const { conocidos, propuestas } = await cargarConocidos(ctx, area);
  const leida = ctx.ahora().toISOString();
  const descartar = (m: Motivo | "de_mas") => cont.descartados[m]++;
  const quitarLasDeApi = () => {
    tope = true;
    cursor.tareas = cursor.tareas.filter((t) => !usaApi(t));
  };
  const cabe = () => ctx.corrida.gasto_usd + ctx.gastado() + COSTO_ESTIMADO_LLAMADA <= ctx.corrida.tope_usd;

  /** Ubica (con Mapbox si se pide), filtra y guarda; devuelve los que hay que reintentar (si no se pudieron guardar). */
  async function proponer(candidatos: Candidato[], conMapbox: boolean): Promise<Candidato[]> {
    const ubicados = await Promise.all(candidatos.map((c) => ubicar(c, area, conMapbox ? ctx.mapbox : null)));
    const filas: { corrida_id: string; tipo: "lugar"; fuente: string; datos: Record<string, unknown> }[] = [];
    const guardados: Candidato[] = [];
    candidatos.forEach((c, i) => {
      const u = ubicados[i];
      const porNombre = motivoPorNombre(c.nombre, conocidos);
      if (porNombre) return descartar(porNombre);
      if (u === "fuera" || !enLaCiudad(c)) return descartar("fuera_de_la_ciudad");
      if (!u) return descartar("sin_ubicacion");
      // Con alcaldías (OL-429): la fuente o la dirección que dio Mapbox tiene que nombrar una.
      if (alcaldias.length && !nombraAlcaldia([c.municipio, c.direccion, u.direccion], alcaldias)) return descartar("fuera_de_la_ciudad");
      if (existeCerca(c.nombre, u, conocidos)) return descartar("ya_existe");
      conocidos.propuestos.add(normalizarNombre(c.nombre));
      filas.push({ corrida_id: ctx.corrida.id, tipo: "lugar", fuente: (c.nombreFuente ?? NOMBRE_FUENTE[c.fuente]).slice(0, 120), datos: datosDePropuesta({ ...c, direccion: c.direccion ?? u.direccion }, u, ctx.ciudad.nombre, leida) });
      guardados.push(c);
    });
    if (!filas.length) return [];
    if (!(await ctx.sigueCorriendo())) return [];
    const { error } = await ctx.db.from("propuestas").insert(filas);
    if (error) {
      cont.errores++;
      cursor.fallosSeguidos++;
      if (cursor.fallosSeguidos >= 3) throw new FalloCorrida("No se pudieron guardar las propuestas");
      for (const c of guardados) conocidos.propuestos.delete(normalizarNombre(c.nombre));
      return guardados;
    }
    cursor.fallosSeguidos = 0;
    cont.propuestos += filas.length;
    for (const c of guardados) deFuente(cont, c.fuente).propuestos++;
    return [];
  }

  /** Lee una tarea: limpia, quita lo conocido por nombre y lo de otro municipio, y no deja más de `TOPE_POR_TAREA`. */
  async function leer(tarea: Tarea): Promise<Candidato[]> {
    let crudos: Candidato[] = [];
    if (tarea.fuente === "sic") {
      if (cursor.estado == null) {
        avisos.add("El SIC no se pudo leer: no se supo el estado de la ciudad");
        return [];
      }
      const l = await leerSic(cursor.estado, zonasDe(ctx.ciudad), ctx.pedir);
      if (l.tablasFallidas) cont.errores++;
      if (l.tablasLeidas) crudos = l.candidatos;
      else if (ctx.api && cabe()) {
        avisos.add("El SIC no respondió al servidor: se leyó con la API");
        crudos = await conApi(tarea);
      } else {
        avisos.add("El SIC no respondió");
        return [];
      }
    } else {
      if (!ctx.api) {
        cont.errores++;
        avisos.add("Sin llave de la API: no se hicieron las búsquedas web");
        return [];
      }
      crudos = await conApi(tarea);
    }
    const salida: Candidato[] = [];
    const enEsta = new Set<string>();
    const enCursor = new Set(cursor.pendientes.map((c) => normalizarNombre(c.nombre)));
    for (const c of crudos) {
      const k = normalizarNombre(c.nombre);
      if (!enLaCiudad(c)) descartar("fuera_de_la_ciudad");
      else if (motivoPorNombre(c.nombre, conocidos)) descartar(motivoPorNombre(c.nombre, conocidos)!);
      else if (enEsta.has(k) || enCursor.has(k)) descartar("ya_propuesto");
      else if (salida.length >= TOPE_POR_TAREA) descartar("de_mas");
      else {
        enEsta.add(k);
        salida.push(c);
      }
    }
    return salida;
  }

  async function conApi(tarea: Tarea): Promise<Candidato[]> {
    const r = await buscarConApi(ctx.api!, { pedido: pedidoDe(tarea, ctx, cursor, conocidos, propuestas), herramientas: herramientasDe(tarea, ctx, cursor), hasta: ctx.hasta });
    ctx.gastar(r.usd);
    deFuente(cont, tarea.fuente).usd += r.usd;
    cont.busquedas_web += r.busquedas;
    if (r.cortada) cont.cortadas++;
    if (r.error) {
      cont.errores++;
      avisos.add(`${NOMBRE_FUENTE[tarea.fuente]}: ${r.error}`);
    }
    const guia = tarea.fuente === "guias" ? tarea : null;
    return r.lugares
      .map((l) => limpiarCandidato({ ...l, fuente: tarea.fuente }))
      .filter((c): c is Candidato => !!c)
      .map((c) => ({ ...c, url: urlVerificada(c.url, r.paginas) ?? guia?.url ?? null, ...(guia ? { nombreFuente: guia.nombre } : {}) }));
  }

  if (cursor.pendientes.length) {
    // Un lote de 10 que espera a Mapbox.
    const lote = cursor.pendientes.slice(0, LOTE_MAPBOX);
    const devueltos = await proponer(lote, true);
    cursor.pendientes = [...devueltos, ...cursor.pendientes.slice(LOTE_MAPBOX)];
  } else if (cursor.tareas.length) {
    const tarea = cursor.tareas[0];
    if (usaApi(tarea) && !cabe()) quitarLasDeApi();
    else if (usaApi(tarea) && ctx.hasta - Date.now() < TIEMPO_PARA_LLAMADA_MS) {
      // No alcanza el tiempo de este paso: la tarea espera al siguiente.
    } else {
      cursor.tareas.shift();
      const leidos = await leer(tarea);
      // Lo que ya trae su punto dentro de la ciudad se propone ahora; lo demás (sin punto, o con uno fuera) espera a Mapbox en lotes.
      const conPunto = (c: Candidato) => c.lat != null && c.lng != null && dentroDelArea({ lat: c.lat, lng: c.lng }, area.centro, area.radioKm);
      const devueltos = await proponer(leidos.filter(conPunto), false);
      cursor.pendientes = [...devueltos, ...leidos.filter((c) => !conPunto(c))];
      cursor.leidos = cursor.pendientes.length;
    }
  }
  if (ctx.corrida.gasto_usd + ctx.gastado() >= ctx.corrida.tope_usd) quitarLasDeApi();

  const terminada = !cursor.tareas.length && !cursor.pendientes.length;
  const enCurso = cursor.pendientes[0]?.fuente ?? cursor.tareas[0]?.fuente ?? cursor.fuentes.at(-1);
  const n = terminada ? cursor.fuentes.length : Math.max(1, cursor.fuentes.indexOf(enCurso as ClaveFuente) + 1);
  const hechas = cursor.total - cursor.tareas.length;
  const falta = cursor.pendientes.length ? cursor.pendientes.length / Math.max(cursor.leidos, cursor.pendientes.length) : 0;
  // Leer una tarea cuenta media; ubicar lo que dejó, la otra media.
  const avance = terminada ? 1 : Math.min(0.99, Math.max(0, (hechas - falta / 2) / cursor.total));
  const resumen: Record<string, unknown> = {
    paso: `${n} de ${cursor.fuentes.length} ${cursor.fuentes.length === 1 ? "fuente" : "fuentes"}`,
    avance: Math.round(avance * 100) / 100,
    propuestos: cont.propuestos,
    duplicados: cont.descartados.ya_existe + cont.descartados.ya_propuesto,
    errores: cont.errores,
    descartados: cont.descartados,
    por_fuente: Object.fromEntries(Object.entries(cont.por_fuente).map(([k, v]) => [k, { propuestos: v!.propuestos, usd: Math.round(v!.usd * 10_000) / 10_000 }])),
    busquedas_web: cont.busquedas_web,
  };
  if (cont.cortadas) resumen.cortadas = cont.cortadas;
  if (tope) resumen.tope = true;
  if (avisos.size) resumen.avisos = [...avisos].slice(0, 8);
  if (!terminada) resumen.cursor = cursor;
  return { resumen, terminada };
}
