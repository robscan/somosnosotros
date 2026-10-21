import "server-only";
import { normalizarRedes } from "@/lib/enlaces";
import { diaLocal, localAIso } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import {
  armarCandidatos,
  circulacionDe,
  type Candidato,
  type CambioEstado,
  type Circulacion,
  type Estado,
  type Evidencia,
  type FilaArtista,
  type FilaCandidato,
  type FilaEvento,
  type FilaEventoArtista,
  type FilaLectura,
  type FilaLugar,
  type Lectura,
  type Puntajes,
} from "@/lib/showcase";
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

/** Todos los candidatos (los artistas visibles del catálogo) con su estado, su rúbrica y sus cifras de la base y de redes; null si falló. */
export async function cargarCandidatos(ahora: Date): Promise<Candidato[] | null> {
  try {
    const db = await clienteServidor();
    if (!db) return null;
    const { desde, hasta } = anioDe(ahora);
    const [artistas, candidatos, lecturas, eventos, eventos_artistas, lugares] = await Promise.all([
      leerTodo<FilaArtista>((d, h) => db.from("artistas").select("id, slug, nombre, disciplina, ciudad, foto, redes").eq("visible", true).order("id").range(d, h)),
      leerTodo<FilaCandidato>((d, h) => db.from("showcase_candidatos").select("artista_id, estado, puntaje_circulacion, puntaje_obra, puntaje_actividad, puntaje_vinculo, notas").order("artista_id").range(d, h)),
      leerTodo<FilaLectura>((d, h) => db.from("lecturas_redes").select("artista_id, red, seguidores, publicaciones, ultima_publicacion, leido_en").order("id").range(d, h)),
      leerTodo<FilaEvento>((d, h) => eventosDelAnio(db, desde, hasta).order("id").range(d, h)),
      leerTodo<FilaEventoArtista>((d, h) => db.from("eventos_artistas").select("evento_id, artista_id").order("evento_id").order("artista_id").range(d, h)),
      leerTodo<FilaLugar>((d, h) => db.from("lugares").select("id, nombre, slug").order("id").range(d, h)),
    ]);
    const festivales = await festivalesQueFaltan(db, eventos);
    return armarCandidatos({ artistas, candidatos, lecturas, eventos, eventos_artistas, lugares, festivales });
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
  puntajes: Puntajes;
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
      puntajes: { circulacion: fila?.puntaje_circulacion ?? null, obra: fila?.puntaje_obra ?? null, actividad: fila?.puntaje_actividad ?? null, vinculo: fila?.puntaje_vinculo ?? null },
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
