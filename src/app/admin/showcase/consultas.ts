import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { normalizarRedes } from "@/lib/enlaces";
import { diaLocal, localAIso } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import type { CorridaVista } from "@/lib/rutinas/rescate";
import {
  armarCandidatos,
  cadenaParada,
  circulacionDe,
  investigacionEnCurso,
  type Candidato,
  type CambioEstado,
  type Circulacion,
  type CorridaInvestigar,
  type CorridaLista,
  type Estado,
  type Evidencia,
  type EvidenciaBreve,
  type FilaArtista,
  type FilaCandidato,
  type FilaEvento,
  type FilaEventoArtista,
  type FilaEvidencia,
  type FilaLectura,
  type FilaLugar,
  type Lectura,
  type Puntajes,
} from "@/lib/showcase";
import { leerFiltros, type Grupo } from "@/lib/showcaseFiltros";
import { clienteServidor, type ClienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que leen las pantallas del showcase (OL-426). Con la sesión de quien administra: las cuatro tablas del showcase solo las ve la administración
 * (migración 20261020130000, `es_admin()`), así que una cuenta que no lo es no lee nada aunque llegara aquí; lo del catálogo (artistas, eventos y
 * lugares) se filtra a lo visible. Nada de esto va a una ruta pública ni al sitemap. Cada carga dice si falló (null) para que la pantalla lo diga en
 * su sitio y no enseñe cifras a medias.
 */

const PAGINA = 1000;
type Respuesta = { data: unknown[] | null; error: { message: string } | null };

/** Lee una tabla entera de 1 000 en 1 000 (PostgREST no devuelve más de eso por consulta). */
async function leerTodo<T>(consulta: (desde: number, hasta: number) => PromiseLike<Respuesta>): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1);
    if (error) throw new Error(error.message);
    const filas = (data ?? []) as T[];
    todo.push(...filas);
    if (filas.length < PAGINA) return todo;
  }
}
/** Lee por ids en tandas de 100, para no alargar la dirección de la consulta. */
async function enTandas<T>(ids: readonly string[], leer: (tanda: string[]) => PromiseLike<Respuesta>): Promise<T[]> {
  const tandas = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, (i + 1) * 100));
  const leidas = await Promise.all(tandas.map(leer));
  for (const r of leidas) if (r.error) throw new Error(r.error.message);
  return leidas.flatMap((r) => (r.data ?? []) as T[]);
}

/** El año de la ciudad en el que cae `ahora`, como dos instantes: del 1 de enero a las 00:00 al 1 de enero siguiente. */
export function anioDe(ahora: Date): { anio: string; desde: string; hasta: string } {
  const anio = diaLocal(ahora).slice(0, 4);
  return { anio, desde: localAIso(`${anio}-01-01T00:00`)!, hasta: localAIso(`${Number(anio) + 1}-01-01T00:00`)! };
}

const COLUMNAS_EVENTO = "id, titulo, slug, lugar_id, evento_padre_id, clase, inicio, ciudad";
/** Los eventos del año que cuentan: visibles, publicados y sin cancelar (los mismos que la Trayectoria pública). */
function eventosDelAnio(db: ClienteServidor, desde: string, hasta: string) {
  return db.from("eventos").select(COLUMNAS_EVENTO).eq("visible", true).eq("borrador", false).eq("cancelado", false).gte("inicio", desde).lt("inicio", hasta);
}
/** Los festivales (marcos) de unos actos que no están entre los eventos leídos: su nombre y su dirección. */
async function festivalesQueFaltan(db: ClienteServidor, eventos: readonly FilaEvento[]): Promise<Pick<FilaEvento, "id" | "titulo" | "slug">[]> {
  const ids = new Set(eventos.map((e) => e.id));
  const faltan = [...new Set(eventos.map((e) => e.evento_padre_id).filter((id): id is string => !!id && !ids.has(id)))];
  return faltan.length ? enTandas(faltan, (t) => db.from("eventos").select("id, titulo, slug").in("id", t).limit(t.length)) : [];
}

/**
 * Todos los candidatos (los artistas visibles del catálogo) con su estado, su rúbrica y sus cifras de la base y de redes; null si falló. OL-437:
 * también lo que hace falta para que la base proponga los puntajes: las fichas reclamadas, las novedades visibles, la portada y las evidencias
 * aceptadas de obra (las propuestas por la rutina no cuentan hasta que alguien las acepta).
 */
export async function cargarCandidatos(ahora: Date): Promise<Candidato[] | null> {
  try {
    const db = await clienteServidor();
    if (!db) return null;
    const { desde, hasta } = anioDe(ahora);
    const [artistas, candidatos, lecturas, eventos, eventos_artistas, lugares, cuentas, novedades, evidencias] = await Promise.all([
      leerTodo<FilaArtista>((d, h) => db.from("artistas").select("id, slug, nombre, disciplina, ciudad, foto, portada, redes, tipo").eq("visible", true).order("id").range(d, h)),
      leerTodo<FilaCandidato>((d, h) => db.from("showcase_candidatos").select("artista_id, estado, puntaje_circulacion, puntaje_obra, puntaje_actividad, puntaje_vinculo, notas").order("artista_id").range(d, h)),
      leerTodo<FilaLectura>((d, h) => db.from("lecturas_redes").select("artista_id, red, seguidores, publicaciones, ultima_publicacion, leido_en").order("id").range(d, h)),
      leerTodo<FilaEvento>((d, h) => eventosDelAnio(db, desde, hasta).order("id").range(d, h)),
      leerTodo<FilaEventoArtista>((d, h) => db.from("eventos_artistas").select("evento_id, artista_id").order("evento_id").order("artista_id").range(d, h)),
      leerTodo<FilaLugar>((d, h) => db.from("lugares").select("id, nombre, slug").order("id").range(d, h)),
      leerTodo<{ artista_id: string }>((d, h) => db.from("artistas_cuentas").select("artista_id").order("artista_id").order("perfil_id").range(d, h)),
      leerTodo<{ artista_id: string }>((d, h) => db.from("novedades_artista").select("artista_id").eq("visible", true).order("id").range(d, h)),
      leerTodo<FilaEvidencia>((d, h) => db.from("showcase_evidencias").select("artista_id, senal, tipo, titulo, fecha, estado").eq("senal", "obra").eq("estado", "aceptada").order("id").range(d, h)),
    ]);
    const festivales = await festivalesQueFaltan(db, eventos);
    return armarCandidatos({ artistas, candidatos, lecturas, eventos, eventos_artistas, lugares, festivales, cuentas, novedades, evidencias }, diaLocal(ahora));
  } catch (error) {
    console.error("showcase:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Lo que dice el grupo «Showcase» de la portada: cuántos candidatos (artistas visibles) y cuántos invitados; null si falló. */
export async function cargarResumenShowcase(): Promise<{ candidatos: number; invitados: number } | null> {
  try {
    const db = await clienteServidor();
    if (!db) return null;
    const [a, i] = await Promise.all([
      db.from("artistas").select("id", { count: "exact", head: true }).eq("visible", true),
      db.from("showcase_candidatos").select("artista_id", { count: "exact", head: true }).eq("estado", "invitado"),
    ]);
    if (a.error || i.error) return null;
    return { candidatos: a.count ?? 0, invitados: i.count ?? 0 };
  } catch {
    return null;
  }
}

/** La ficha de showcase de un artista: lo del catálogo, lo del showcase y lo que dice la base de su año. */
export type FichaShowcase = {
  artista: { id: string; slug: string; nombre: string; disciplina: string; ciudad: string; foto: string | null; instagram: string | null };
  reclamada: boolean;
  novedades: boolean;
  portada: boolean;
  estado: Estado;
  /** Lo fijado a mano en cada señal (null: nadie lo fijó; vale lo que propone la base, OL-437). */
  fijados: Puntajes;
  notas: string;
  registro: CambioEstado[];
  /** El nombre de cada cuenta que aparece en el registro. */
  nombres: Record<string, string>;
  evidencias: Evidencia[];
  lecturas: Lectura[];
  eventos: FilaEvento[];
  lugares: FilaLugar[];
  festivales: Pick<FilaEvento, "id" | "titulo" | "slug">[];
  circulacion: Circulacion;
};

/** La ficha por su dirección (`slug`) o su id. `null`: no hay un artista con esa dirección; `"error"`: no se pudo leer. */
export async function cargarFichaShowcase(clave: string, ahora: Date): Promise<FichaShowcase | null | "error"> {
  try {
    const db = await clienteServidor();
    if (!db) return "error";
    const consulta = db.from("artistas").select("id, slug, nombre, disciplina, ciudad, foto, portada, redes, visible");
    const { data: a, error } = await (esUuid(clave) ? consulta.eq("id", clave) : consulta.eq("slug", clave)).maybeSingle();
    if (error) return "error";
    if (!a) return null;
    const id = a.id as string;
    const { desde, hasta } = anioDe(ahora);
    const [c, registro, evidencias, lecturas, cuentas, novedades, ligados] = await Promise.all([
      db.from("showcase_candidatos").select("estado, puntaje_circulacion, puntaje_obra, puntaje_actividad, puntaje_vinculo, notas").eq("artista_id", id).maybeSingle(),
      db.from("showcase_cambios_estado").select("estado, por, creado_en").eq("artista_id", id).order("creado_en", { ascending: true }).limit(200),
      db.from("showcase_evidencias").select("id, senal, tipo, titulo, url, fecha, fuente, leida_por, estado, creado_en").eq("artista_id", id).order("creado_en", { ascending: false }).limit(500),
      db.from("lecturas_redes").select("red, seguidores, publicaciones, ultima_publicacion, leido_en").eq("artista_id", id).order("leido_en", { ascending: false }).limit(200),
      db.from("artistas_cuentas").select("perfil_id", { count: "exact", head: true }).eq("artista_id", id),
      db.from("novedades_artista").select("id", { count: "exact", head: true }).eq("artista_id", id).eq("visible", true),
      leerTodo<FilaEventoArtista>((d, h) => db.from("eventos_artistas").select("evento_id, artista_id").eq("artista_id", id).order("evento_id").range(d, h)),
    ]);
    if (c.error || registro.error || evidencias.error || lecturas.error || cuentas.error || novedades.error) return "error";
    const ids = ligados.map((x) => x.evento_id);
    const eventos = ids.length ? await enTandas<FilaEvento>(ids, (t) => eventosDelAnio(db, desde, hasta).in("id", t).limit(t.length)) : [];
    const idsLugares = [...new Set(eventos.map((e) => e.lugar_id).filter((x): x is string => !!x))];
    const [lugares, festivales] = await Promise.all([
      idsLugares.length ? enTandas<FilaLugar>(idsLugares, (t) => db.from("lugares").select("id, nombre, slug").in("id", t).limit(t.length)) : Promise.resolve([]),
      festivalesQueFaltan(db, eventos),
    ]);
    const filasRegistro = (registro.data ?? []) as CambioEstado[];
    const cuentasNombradas = [...new Set(filasRegistro.map((r) => r.por).filter((x): x is string => !!x))];
    const perfiles = cuentasNombradas.length ? await enTandas<{ id: string; nombre: string }>(cuentasNombradas, (t) => db.from("perfiles").select("id, nombre").in("id", t).limit(t.length)) : [];
    const fila = c.data as Omit<FilaCandidato, "artista_id"> | null;
    const mapaLugares = new Map(lugares.map((l) => [l.id, l]));
    const mapaFestivales = new Map<string, string>([...festivales, ...eventos.filter((e) => e.clase === "festival")].map((e) => [e.id, e.titulo]));
    const redes = (a.redes ?? []) as unknown;
    return {
      artista: { id, slug: (a.slug as string | null) || id, nombre: a.nombre as string, disciplina: a.disciplina as string, ciudad: a.ciudad as string, foto: (a.foto as string | null) ?? null, instagram: normalizarRedes(redes).find((e) => e.red === "instagram")?.url ?? null },
      reclamada: (cuentas.count ?? 0) > 0,
      novedades: (novedades.count ?? 0) > 0,
      portada: !!a.portada,
      estado: fila?.estado ?? "candidato",
      fijados: { circulacion: fila?.puntaje_circulacion ?? null, obra: fila?.puntaje_obra ?? null, actividad: fila?.puntaje_actividad ?? null, vinculo: fila?.puntaje_vinculo ?? null },
      notas: fila?.notas ?? "",
      registro: filasRegistro,
      nombres: Object.fromEntries(perfiles.map((p) => [p.id, p.nombre])),
      evidencias: (evidencias.data ?? []) as Evidencia[],
      lecturas: (lecturas.data ?? []) as Lectura[],
      eventos,
      lugares,
      festivales,
      circulacion: circulacionDe(eventos, mapaLugares, mapaFestivales, a.ciudad as string),
    };
  } catch (error) {
    console.error("showcase ficha:", error instanceof Error ? error.message : error);
    return "error";
  }
}

const ESTADOS_CORRIDA = new Set(["pendiente", "corriendo", "terminada", "fallida", "cancelada"]);
const aNumero = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const COLUMNAS_CORRIDA = "id, estado, tope_usd, gasto_usd, resumen, creado_en, inicio, fin";

/** Una fila de `rutinas_corridas` como la usan la ficha y la lista, o null si su estado no es uno de los conocidos. */
function comoCorrida(fila: Record<string, unknown>): CorridaInvestigar | null {
  if (!ESTADOS_CORRIDA.has(String(fila.estado))) return null;
  return {
    id: String(fila.id),
    estado: fila.estado as CorridaInvestigar["estado"],
    tope_usd: aNumero(fila.tope_usd),
    gasto_usd: aNumero(fila.gasto_usd),
    resumen: fila.resumen && typeof fila.resumen === "object" && !Array.isArray(fila.resumen) ? (fila.resumen as Record<string, unknown>) : {},
    creado_en: String(fila.creado_en),
    inicio: typeof fila.inicio === "string" ? fila.inicio : null,
    fin: typeof fila.fin === "string" ? fila.fin : null,
  };
}

export type Credito = { usd: number; gastado: number; vence: string | null };
/** El crédito de la API (el de Corridas): `credito_api_usd` y lo gastado en todas las corridas; null si no se pudo leer. */
async function cargarCredito(db: ClienteServidor): Promise<Credito | null> {
  const [config, gastos] = await Promise.all([
    db.from("configuracion").select("clave, valor").in("clave", ["credito_api_usd", "credito_api_vence"]),
    leerTodo<{ gasto_usd: unknown }>((d, h) => db.from("rutinas_corridas").select("gasto_usd").order("id").range(d, h)).catch(() => null),
  ]);
  const valores = new Map(((config.data ?? []) as { clave: string; valor: unknown }[]).map((c) => [c.clave, c.valor]));
  if (config.error || !gastos || !valores.has("credito_api_usd")) return null;
  const vence = valores.get("credito_api_vence");
  return { usd: aNumero(valores.get("credito_api_usd")), gastado: gastos.reduce((t, g) => t + aNumero(g.gasto_usd), 0), vence: typeof vence === "string" ? vence : null };
}

/**
 * La red de seguridad de la cadena de pasos en el Showcase (OL-439, sobre `rescate.ts`): si hay corridas en curso de cualquier rutina y TODAS están
 * varadas (`cadenaParada`), el servidor pide UN paso después de responder; el motor sigue solo desde ahí. Mientras alguna avance, nada: en una
 * orden de 26, las que esperan su turno no se rescatan una por una (eso abría una cadena en paralelo por cada carga de la pantalla). Nunca falla.
 */
async function pedirPasoSiParo(db: ClienteServidor, ahora: Date, yaLeidas?: readonly CorridaVista[]): Promise<void> {
  try {
    let enCurso = yaLeidas;
    if (!enCurso) {
      const r = await db.from("rutinas_corridas").select("id, estado, resumen, creado_en, inicio").in("estado", ["pendiente", "corriendo"]).limit(1000);
      if (r.error) return;
      enCurso = (r.data ?? []) as CorridaVista[];
    }
    if (!cadenaParada(enCurso, ahora)) return;
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    console.warn("rutinas: la cadena de pasos se paró; se pide un paso");
    after(() => dispararPaso(origen));
  } catch {
    console.warn("rutinas: no se pudo pedir el paso de una investigación varada; la retoma el cron");
  }
}

/**
 * «Investigar» en la ficha (OL-430): la última corrida `showcase` del artista y el crédito de la API que queda (el de Corridas: `credito_api_usd`
 * menos lo gastado en todas las corridas). Si esa corrida está en curso y la cadena del motor se paró, el servidor pide un paso después de
 * responder (`pedirPasoSiParo`, OL-439): la ficha no cambia ni espera. `corrida: undefined` es que no se pudo leer.
 */
export async function cargarInvestigacion(artistaId: string, ahora: Date): Promise<{ corrida: CorridaInvestigar | null | undefined; credito: Credito | null }> {
  try {
    const db = await clienteServidor();
    if (!db || !esUuid(artistaId)) return { corrida: undefined, credito: null };
    const [ultima, credito] = await Promise.all([
      db.from("rutinas_corridas").select(COLUMNAS_CORRIDA).eq("tipo", "showcase").eq("parametros->>artista_id", artistaId).order("creado_en", { ascending: false }).limit(1),
      cargarCredito(db),
    ]);
    const fila = ultima.error ? undefined : ((ultima.data ?? [])[0] as Record<string, unknown> | undefined);
    const corrida: CorridaInvestigar | null | undefined = ultima.error ? undefined : fila ? comoCorrida(fila) : null;
    if (investigacionEnCurso(corrida)) await pedirPasoSiParo(db, ahora);
    return { corrida, credito };
  } catch (error) {
    console.error("showcase investigar:", error instanceof Error ? error.message : error);
    return { corrida: undefined, credito: null };
  }
}

/**
 * Lo que la lista sabe de las investigaciones (OL-439): las corridas `showcase` recientes, las evidencias de la rutina por revisar de cada artista y
 * el crédito. OL-446: `terminadas`, el fin de la última investigación terminada de cada artista, de siempre (para el filtro «Investigación»).
 */
export type Investigaciones = { corridas: CorridaLista[]; porRevisar: Record<string, number>; credito: Credito | null; terminadas?: Record<string, string> };
/** Cuánto atrás lee la lista: lo que cuenta para «investigado hace poco» (30 días) y lo que dice cada tarjeta, con holgura. */
const DIAS_LISTA = 90;

/**
 * Las investigaciones para la lista del Showcase (OL-439); null si no se pudieron leer (la lista sigue, sin el renglón «Investigar» ni las líneas
 * de las tarjetas). Si hay corridas en curso y la cadena del motor se paró, pide un paso después de responder (`pedirPasoSiParo`).
 */
export async function cargarInvestigaciones(ahora: Date): Promise<Investigaciones | null> {
  try {
    const db = await clienteServidor();
    if (!db) return null;
    const desde = new Date(ahora.getTime() - DIAS_LISTA * 86_400_000).toISOString();
    const [corridas, evidencias, enCurso, credito, terminadas] = await Promise.all([
      leerTodo<Record<string, unknown>>((d, h) => db.from("rutinas_corridas").select(`${COLUMNAS_CORRIDA}, parametros`).eq("tipo", "showcase").gte("creado_en", desde).order("creado_en", { ascending: false }).order("id").range(d, h)),
      leerTodo<{ artista_id: string }>((d, h) => db.from("showcase_evidencias").select("artista_id").eq("estado", "propuesta").eq("leida_por", "rutina").order("id").range(d, h)),
      db.from("rutinas_corridas").select("id, estado, resumen, creado_en, inicio").in("estado", ["pendiente", "corriendo"]).limit(1000),
      cargarCredito(db),
      leerTodo<{ parametros: unknown; fin: string | null; creado_en: string }>((d, h) => db.from("rutinas_corridas").select("parametros, fin, creado_en").eq("tipo", "showcase").eq("estado", "terminada").order("id").range(d, h)),
    ]);
    if (enCurso.error) throw new Error(enCurso.error.message);
    const lista = corridas.flatMap((f): CorridaLista[] => {
      const c = comoCorrida(f);
      const p = f.parametros && typeof f.parametros === "object" ? (f.parametros as Record<string, unknown>) : {};
      if (!c || typeof p.artista_id !== "string") return [];
      return [{ ...c, artista_id: p.artista_id, lote: typeof p.lote === "string" ? p.lote : null }];
    });
    const porRevisar: Record<string, number> = {};
    for (const e of evidencias) porRevisar[e.artista_id] = (porRevisar[e.artista_id] ?? 0) + 1;
    await pedirPasoSiParo(db, ahora, (enCurso.data ?? []) as CorridaVista[]);
    // La última terminada de cada artista (por su fin; si no lo tiene, su alta).
    const ultimas: Record<string, string> = {};
    for (const t of terminadas) {
      const id = t.parametros && typeof t.parametros === "object" ? (t.parametros as Record<string, unknown>).artista_id : null;
      const fin = t.fin ?? t.creado_en;
      if (typeof id === "string" && (!ultimas[id] || fin > ultimas[id])) ultimas[id] = fin;
    }
    return { corridas: lista, porRevisar, credito, terminadas: ultimas };
  } catch (error) {
    console.error("showcase investigaciones:", error instanceof Error ? error.message : error);
    return null;
  }
}

// ---------- «Por aprobar» y los grupos (OL-446) ----------
/** Un hallazgo por aprobar: la evidencia propuesta con su artista. */
export type Hallazgo = Evidencia & { artista_id: string };
/**
 * «Por aprobar»: todas las evidencias propuestas (de todos los artistas) y, de esos artistas, las de obra ya aceptadas (para decir qué cambia al
 * aceptar). null si no se pudo leer.
 */
export async function cargarPorAprobar(): Promise<{ hallazgos: Hallazgo[]; obraAceptada: Record<string, EvidenciaBreve[]> } | null> {
  try {
    const db = await clienteServidor();
    if (!db) return null;
    const hallazgos = await leerTodo<Hallazgo>((d, h) =>
      db.from("showcase_evidencias").select("id, artista_id, senal, tipo, titulo, url, fecha, fuente, leida_por, estado, creado_en").eq("estado", "propuesta").order("creado_en", { ascending: true }).order("id").range(d, h),
    );
    const ids = [...new Set(hallazgos.map((x) => x.artista_id))];
    const aceptadas = ids.length
      ? await enTandas<FilaEvidencia>(ids, (t) => db.from("showcase_evidencias").select("artista_id, senal, tipo, titulo, fecha, estado").eq("senal", "obra").eq("estado", "aceptada").in("artista_id", t).limit(5000))
      : [];
    const obraAceptada: Record<string, EvidenciaBreve[]> = {};
    for (const e of aceptadas) (obraAceptada[e.artista_id] ??= []).push({ senal: e.senal, tipo: e.tipo, titulo: e.titulo, fecha: e.fecha, estado: e.estado });
    return { hallazgos, obraAceptada };
  } catch (error) {
    console.error("showcase por aprobar:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Lo que dice el renglón de «Pendiente» en la portada: cuántas evidencias por aprobar, de cuántos artistas y la más reciente; null si falló. */
export async function cargarResumenPorAprobar(): Promise<{ n: number; artistas: number; ultima: string | null } | null> {
  try {
    const db = await clienteServidor();
    if (!db) return null;
    const filas = await leerTodo<{ artista_id: string; creado_en: string }>((d, h) => db.from("showcase_evidencias").select("artista_id, creado_en").eq("estado", "propuesta").order("id").range(d, h));
    return { n: filas.length, artistas: new Set(filas.map((f) => f.artista_id)).size, ultima: filas.reduce<string | null>((m, f) => (!m || f.creado_en > m ? f.creado_en : m), null) };
  } catch {
    return null;
  }
}

/** Los grupos guardados, del más viejo al más nuevo, con sus filtros ya leídos; null si no se pudieron leer (la hoja sigue sin «Tus grupos»). */
export async function cargarGrupos(): Promise<Grupo[] | null> {
  try {
    const db = await clienteServidor();
    if (!db) return null;
    const { data, error } = await db.from("showcase_grupos").select("id, nombre, filtros, creado_en").order("creado_en", { ascending: true }).limit(200);
    if (error) return null;
    return ((data ?? []) as { id: string; nombre: string; filtros: unknown }[]).map((g) => ({ id: g.id, nombre: g.nombre, filtros: leerFiltros(g.filtros as Record<string, unknown>) }));
  } catch {
    return null;
  }
}
