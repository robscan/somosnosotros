import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { leerParametrosCiudad } from "../ciudadParametros";
import { pasoAgendas } from "./agendas";
import { pasoArtistas } from "./artistas";
import { pasoCarteles } from "./carteles";
import type { ClienteApi } from "./claude";
import { FalloCorrida, pasoLugares, type CiudadRutina, type Contexto, type SalidaPaso } from "./lugares";
import type { Mapbox } from "./mapbox";
import { redondear } from "./precios";
import { pasoShowcase, type ContextoSinCiudad } from "./showcase";

/**
 * El motor de corridas (OL-428): cada llamada a `/api/rutinas/correr` toma UNA corrida, corre UN paso corto y guarda lo que pasó. Sin la Mac
 * y sin migración: el estado vive en `rutinas_corridas` (estado, gasto_usd, inicio, fin) y en `resumen` (jsonb).
 *
 * Qué corrida toma: primero la `pendiente` más vieja; si no hay, la `corriendo` más antigua que nadie esté trabajando.
 * Cómo se asegura de que dos llamadas a la vez no corran la misma (sin bloqueos de la base):
 *   · una pendiente se reclama con `update … set estado = 'corriendo' where id = … and estado = 'pendiente' returning`: solo una de dos
 *     llamadas recibe la fila;
 *   · una que ya corre lleva en su resumen un número de turno (`turno`) y hasta cuándo está ocupada (`ocupada_hasta`, 70 s: más que el
 *     tiempo máximo de la función, así un paso que se cae la deja libre). Se reclama con `… where resumen->>'turno' = <el que se leyó>` y
 *     el turno sube: la segunda llamada ya no encuentra ese turno.
 *   · al guardar, lo mismo: solo si sigue «corriendo» y con su turno. Si a medio paso alguien la canceló, solo se anota lo gastado.
 * Un tropiezo (la base no respondió) suelta la corrida para reintentar; a la tercera seguida en el mismo paso, «Falló». El gasto de cada paso
 * se suma a `gasto_usd` aunque el paso falle: el crédito de Corridas baja solo.
 *
 * OL-429: las corridas de «Buscar agendas y eventos» van a su rutina (`agendas.ts`) con un paso más largo (leer una agenda en PDF tarda más
 * que una búsqueda); cada vez que se guarda un paso queda `resumen.actualizada` (cuándo avanzó por última vez), que es lo que mira la red de
 * seguridad de Ciudades (`rescate.ts`) para saber si una corrida se quedó varada.
 *
 * OL-430: «Buscar artistas» (`artistas.ts`) es una rutina más de una ciudad; «Investigar» del Showcase (`showcase.ts`) es la única sin ciudad
 * (la corrida `showcase` lleva `parametros.artista_id`). Las dos dan pasos de hasta 120 s (una llamada que abre catálogos o páginas tarda más
 * que una búsqueda corta). OL-444: «Buscar carteles» (`carteles.ts`) también, por lo mismo (y baja las imágenes que propone).
 */

export type Dependencias = {
  db: SupabaseClient;
  api: ClienteApi | null;
  mapbox: Mapbox | null;
  pedir: typeof fetch;
  ahora: () => Date;
  /** El paso de «Buscar lugares» (y el de las rutinas que no digan otro). */
  plazoMs: number;
  /** El paso de «Buscar agendas y eventos»; por omisión `PLAZO_PASO_AGENDAS_MS`. */
  plazoAgendasMs?: number;
  /** El paso de «Buscar artistas» e «Investigar» (OL-430); por omisión `PLAZO_PASO_INVESTIGAR_MS`. */
  plazoInvestigarMs?: number;
  /** Esperar entre peticiones a la cartelera (OL-448); por omisión, de verdad. */
  dormir?: (ms: number) => Promise<void>;
  /** Lo que la lectura de la cartelera cuenta además (OL-451; el guion de la Mac y las pruebas). */
  anotarCartelera?: Contexto["anotarCartelera"];
};

/** Las rutinas de una ciudad. Un tipo que no esté aquí ni abajo falla con «Este botón todavía no tiene rutina». */
const RUTINAS: Record<string, (ctx: Contexto) => Promise<SalidaPaso>> = { lugares: pasoLugares, agendas: pasoAgendas, artistas: pasoArtistas, carteles: pasoCarteles };
/** Las que no son de una ciudad (OL-430): «Investigar» a un artista del Showcase. */
const RUTINAS_SIN_CIUDAD: Record<string, (ctx: ContextoSinCiudad) => Promise<SalidaPaso>> = { showcase: pasoShowcase };

export const PLAZO_PASO_MS = 45_000;
/** El paso de «Buscar agendas y eventos» (OL-429): leer un trozo de una agenda en PDF con la API puede tardar un par de minutos. */
export const PLAZO_PASO_AGENDAS_MS = 200_000;
/** El paso de «Buscar artistas» e «Investigar» (OL-430): una llamada con dos búsquedas y hasta tres páginas. */
export const PLAZO_PASO_INVESTIGAR_MS = 120_000;
/** La función de la ruta (`maxDuration` de `/api/rutinas/correr`): más que el paso más largo, con margen para guardar y pedir el siguiente. */
export const LIMITE_RUTA_MS = 300_000;
/** El margen que se guarda al final del paso para escribir en la base. */
const MARGEN_GUARDAR_MS = 5_000;
/** Cuánto queda tomada una corrida al reclamarla: más que lo que puede vivir la función, así un paso que se cae la deja libre. */
export const OCUPADA_MS = 320_000;
export const MAX_INTENTOS = 3;
export const SIN_RUTINA = "Este botón todavía no tiene rutina";

export type EstadoPaso = "nada" | "corriendo" | "terminada" | "fallida" | "cancelada";
export type ResultadoPaso = { corrida: string | null; tipo: string | null; estado: EstadoPaso; usd: number };

const COLUMNAS = "id, tipo, ciudad, parametros, tope_usd, gasto_usd, estado, resumen, inicio";
type Fila = { id: string; tipo: string; ciudad: string | null; parametros: unknown; tope_usd: unknown; gasto_usd: unknown; estado: string; resumen: unknown; inicio: string | null };

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const numero = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

/** La corrida que toca, ya marcada como suya, o null si no hay nada que correr. */
export async function reclamar(dep: Pick<Dependencias, "db" | "ahora">): Promise<{ fila: Fila; turno: number } | null> {
  const ahora = dep.ahora();
  const ocupada_hasta = new Date(ahora.getTime() + OCUPADA_MS).toISOString();
  const pendientes = await dep.db.from("rutinas_corridas").select(COLUMNAS).eq("estado", "pendiente").order("creado_en", { ascending: true }).limit(5);
  if (pendientes.error) throw new Error("No se pudieron leer las corridas");
  for (const p of (pendientes.data ?? []) as Fila[]) {
    const resumen = { ...objeto(p.resumen), turno: 1, ocupada_hasta, intentos: 1 };
    const r = await dep.db.from("rutinas_corridas").update({ estado: "corriendo", inicio: ahora.toISOString(), resumen }).eq("id", p.id).eq("estado", "pendiente").select(COLUMNAS);
    if (r.error) throw new Error("No se pudo tomar la corrida");
    if (r.data?.length) return { fila: r.data[0] as Fila, turno: 1 };
  }
  const corriendo = await dep.db.from("rutinas_corridas").select(COLUMNAS).eq("estado", "corriendo").order("inicio", { ascending: true, nullsFirst: true }).limit(10);
  if (corriendo.error) throw new Error("No se pudieron leer las corridas");
  for (const c of (corriendo.data ?? []) as Fila[]) {
    const previo = objeto(c.resumen);
    if (typeof previo.ocupada_hasta === "string" && Date.parse(previo.ocupada_hasta) > ahora.getTime()) continue;
    const turno = numero(previo.turno);
    const resumen = { ...previo, turno: turno + 1, ocupada_hasta, intentos: numero(previo.intentos) + 1 };
    const pedido = dep.db.from("rutinas_corridas").update({ resumen }).eq("id", c.id).eq("estado", "corriendo");
    const r = await (typeof previo.turno === "number" ? pedido.eq("resumen->>turno", String(turno)) : pedido.is("resumen->turno", null)).select(COLUMNAS);
    if (r.error) throw new Error("No se pudo tomar la corrida");
    if (r.data?.length) return { fila: r.data[0] as Fila, turno: turno + 1 };
  }
  return null;
}

async function leerCiudad(db: SupabaseClient, slug: string | null): Promise<CiudadRutina | null> {
  if (!slug) return null;
  const r = await db.from("ciudades").select("slug, nombre, lat, lng, zoom, zona, alias, estado, parametros").eq("slug", slug).maybeSingle();
  if (r.error) throw new Error("No se pudo leer la ciudad");
  if (!r.data) return null;
  const c = r.data as Record<string, unknown>;
  return {
    slug: String(c.slug),
    nombre: String(c.nombre),
    lat: typeof c.lat === "number" ? c.lat : null,
    lng: typeof c.lng === "number" ? c.lng : null,
    zoom: numero(c.zoom) || 13,
    zona: typeof c.zona === "string" ? c.zona : "America/Mexico_City",
    alias: Array.isArray(c.alias) ? c.alias.filter((a): a is string => typeof a === "string") : [],
    estado: String(c.estado),
    parametros: leerParametrosCiudad(c.parametros),
  };
}

/** Guarda el paso: el resumen, el gasto acumulado y, si terminó o falló, su estado y `fin`. Solo si la corrida sigue siendo suya. */
async function guardar(dep: Dependencias, fila: Fila, turno: number, estado: Exclude<EstadoPaso, "nada" | "cancelada">, resumen: Record<string, unknown>, usd: number): Promise<ResultadoPaso> {
  const gasto = redondear(numero(fila.gasto_usd) + usd);
  const final = estado !== "corriendo";
  const nuevo: Record<string, unknown> = { ...resumen, turno, ocupada_hasta: null, intentos: final ? numero(objeto(fila.resumen).intentos) : 0, actualizada: dep.ahora().toISOString() };
  if (final) delete nuevo.cursor;
  const campos = { resumen: nuevo, gasto_usd: gasto, ...(final ? { estado, fin: dep.ahora().toISOString() } : {}) };
  const escribir = () => dep.db.from("rutinas_corridas").update(campos).eq("id", fila.id).eq("estado", "corriendo").eq("resumen->>turno", String(turno)).select("id");
  const r = await escribir();
  if (!r.error && r.data?.length) return { corrida: fila.id, tipo: fila.tipo, estado, usd };
  const actual = await dep.db.from("rutinas_corridas").select("estado, resumen").eq("id", fila.id).maybeSingle();
  const suya = !!actual.data && numero(objeto(actual.data.resumen).turno) === turno;
  if (suya && actual.data!.estado === "corriendo") {
    // La base falló al guardar: un segundo intento igual. Si tampoco, la corrida queda ocupada y otra llamada la retoma al vencer.
    const otra = await escribir();
    return { corrida: fila.id, tipo: fila.tipo, estado: !otra.error && otra.data?.length ? estado : "corriendo", usd };
  }
  if (suya) {
    // La cancelaron a medio paso: lo gastado se anota igual; lo que quedaba a medias, no.
    const { cursor: _cursor, ...sinCursor } = nuevo;
    void _cursor;
    await dep.db.from("rutinas_corridas").update({ gasto_usd: gasto, resumen: sinCursor }).eq("id", fila.id).eq("resumen->>turno", String(turno));
  }
  return { corrida: fila.id, tipo: fila.tipo, estado: actual.data?.estado === "cancelada" ? "cancelada" : estado, usd };
}

/** Un tropiezo: se suelta (sin cambiar el avance) para reintentar en la siguiente llamada, con lo gastado anotado. */
async function soltar(dep: Dependencias, fila: Fila, turno: number, usd: number): Promise<ResultadoPaso> {
  const previo = objeto(fila.resumen);
  const resumen = { ...previo, ocupada_hasta: null, errores: numero(previo.errores) + 1, actualizada: dep.ahora().toISOString() };
  await dep.db
    .from("rutinas_corridas")
    .update({ resumen, gasto_usd: redondear(numero(fila.gasto_usd) + usd) })
    .eq("id", fila.id)
    .eq("estado", "corriendo")
    .eq("resumen->>turno", String(turno));
  return { corrida: fila.id, tipo: fila.tipo, estado: "corriendo", usd };
}

/** Un paso de la corrida que toca. Nunca deja una corrida tomada para siempre: o la guarda, o la suelta, o la da por fallida. */
export async function correrUnPaso(dep: Dependencias, reloj: () => number = Date.now): Promise<ResultadoPaso> {
  const empezo = reloj();
  const tomada = await reclamar(dep);
  if (!tomada) return { corrida: null, tipo: null, estado: "nada", usd: 0 };
  const { fila, turno } = tomada;
  const plazo =
    fila.tipo === "agendas"
      ? (dep.plazoAgendasMs ?? PLAZO_PASO_AGENDAS_MS)
      : fila.tipo === "artistas" || fila.tipo === "showcase" || fila.tipo === "carteles"
        ? (dep.plazoInvestigarMs ?? PLAZO_PASO_INVESTIGAR_MS)
        : dep.plazoMs;
  const hasta = empezo + plazo - MARGEN_GUARDAR_MS;
  const previo = objeto(fila.resumen);
  let usd = 0;
  const fallar = (error: string) => guardar(dep, fila, turno, "fallida", { ...previo, error }, usd);
  if (numero(previo.intentos) > MAX_INTENTOS) return fallar("Se cortó tres veces seguidas en el mismo paso");
  const rutina = RUTINAS[fila.tipo];
  const sinCiudad = RUTINAS_SIN_CIUDAD[fila.tipo];
  if (!rutina && !sinCiudad) return fallar(SIN_RUTINA);
  try {
    const contexto: ContextoSinCiudad = {
      corrida: { id: fila.id, tipo: fila.tipo, ciudad: fila.ciudad, parametros: objeto(fila.parametros), tope_usd: numero(fila.tope_usd), gasto_usd: numero(fila.gasto_usd), resumen: previo },
      db: dep.db,
      api: dep.api,
      mapbox: dep.mapbox,
      pedir: dep.pedir,
      ahora: dep.ahora,
      dormir: dep.dormir,
      anotarCartelera: dep.anotarCartelera,
      hasta,
      gastar: (x) => {
        usd += x;
      },
      gastado: () => usd,
      sigueCorriendo: async () => {
        const r = await dep.db.from("rutinas_corridas").select("estado").eq("id", fila.id).maybeSingle();
        return r.data?.estado === "corriendo";
      },
    };
    let salida: SalidaPaso;
    if (sinCiudad) salida = await sinCiudad(contexto);
    else {
      const ciudad = await leerCiudad(dep.db, fila.ciudad);
      if (!ciudad) return fallar("La ciudad ya no está");
      if (ciudad.estado === "cerrada") return fallar("La ciudad está cerrada");
      salida = await rutina({ ...contexto, ciudad });
    }
    return await guardar(dep, fila, turno, salida.terminada ? "terminada" : "corriendo", salida.resumen, usd);
  } catch (e) {
    if (e instanceof FalloCorrida) return fallar(e.message);
    console.warn("rutinas: un paso no terminó; se reintenta en la siguiente llamada");
    return soltar(dep, fila, turno, usd);
  }
}
