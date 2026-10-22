"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { leerTope } from "@/lib/ciudadesAdmin";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { esUuid } from "@/lib/formulario";
import { type CorridaVista } from "@/lib/rutinas/rescate";
import {
  cadenaParada,
  esEstado,
  esPuntaje,
  LIMITE_LOTE,
  esSenal,
  leerCsvRedes,
  RUTA_SHOWCASE,
  validarEvidencia,
  validarLectura,
  type DatosEvidencia,
  type DatosLectura,
  type Estado,
  type Puntaje,
  type Senal,
} from "@/lib/showcase";
import { diaLocal } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

/**
 * Acciones del showcase (OL-426). Cada una comprueba aquí que la sesión es de administración y la base lo vuelve a exigir (las cuatro tablas solo
 * las escribe `es_admin()`); quién y cuándo los pone la base (disparadores de la migración 20261020130000), no la pantalla. Ninguna falla en
 * silencio: devuelve la causa en palabras para que la pantalla la diga en su sitio.
 */
export type Resultado = { ok: true } | { ok: false; error: string };

const SIN_PERMISO = { ok: false, error: "Solo la administración puede cambiar el showcase." } as const;
const SIN_BASE = { ok: false, error: "Sin conexión con la base. Intenta de nuevo." } as const;

/** Lo que llega del navegador se lee como texto: un campo que no lo es vale vacío (y la validación lo dice), nunca rompe la acción. */
const texto = (v: unknown) => (typeof v === "string" ? v : "");
function comoEvidencia(d: unknown): DatosEvidencia {
  const x = (d ?? {}) as Record<string, unknown>;
  return { senal: texto(x.senal), tipo: texto(x.tipo), titulo: texto(x.titulo), url: texto(x.url), fecha: texto(x.fecha), fuente: texto(x.fuente) };
}
function comoLectura(d: unknown): DatosLectura {
  const x = (d ?? {}) as Record<string, unknown>;
  return { red: texto(x.red), seguidores: texto(x.seguidores), publicaciones: texto(x.publicaciones), ultima: texto(x.ultima) };
}

async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  return (await clienteServidor()) ?? null;
}

/** La lista, la ficha y la portada (su grupo dice cuántos invitados hay) se vuelven a leer. */
function revalidar(slug?: string) {
  revalidatePath(RUTA_SHOWCASE);
  if (slug) revalidatePath(`${RUTA_SHOWCASE}/${slug}`);
  revalidatePath("/admin");
}

/** Cambiar el estado de un candidato: la base guarda quién y cuándo y lo anota en el registro. */
export async function cambiarEstado(artistaId: string, estado: Estado, slug: string): Promise<Resultado> {
  if (!esUuid(artistaId) || !esEstado(estado)) return { ok: false, error: "No encontramos a ese artista." };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { error } = await db.from("showcase_candidatos").upsert({ artista_id: artistaId, estado }, { onConflict: "artista_id" });
  if (error) return { ok: false, error: "No se pudo cambiar el estado. Intenta de nuevo." };
  revalidar(slug);
  return { ok: true };
}

/** Fijar a mano el puntaje de una señal, o quitarlo con null: entonces vale lo que propone la base (OL-437) o queda sin datos. */
export async function cambiarPuntaje(artistaId: string, senal: Senal, puntaje: Puntaje, slug: string): Promise<Resultado> {
  if (!esUuid(artistaId) || !esSenal(senal) || !esPuntaje(puntaje)) return { ok: false, error: "Ese puntaje no existe." };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { error } = await db.from("showcase_candidatos").upsert({ artista_id: artistaId, [`puntaje_${senal}`]: puntaje }, { onConflict: "artista_id" });
  if (error) return { ok: false, error: "No se pudo guardar el puntaje. Intenta de nuevo." };
  revalidar(slug);
  return { ok: true };
}

/** Las notas privadas del consejo (al salir del campo). Vacías se borran. */
export async function guardarNotas(artistaId: string, notas: string, slug: string): Promise<Resultado> {
  if (!esUuid(artistaId)) return { ok: false, error: "No encontramos a ese artista." };
  const limpias = texto(notas).trim();
  if (limpias.length > 4000) return { ok: false, error: "Hasta 4 000 letras." };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { error } = await db.from("showcase_candidatos").upsert({ artista_id: artistaId, notas: limpias || null }, { onConflict: "artista_id" });
  if (error) return { ok: false, error: "No se guardaron las notas. Intenta de nuevo." };
  revalidar(slug);
  return { ok: true };
}

/**
 * Añadir una evidencia a mano: la leyó una persona y nace aceptada (la rutina de OL-428 las dejará propuestas). Sin una dirección http(s) no
 * entra (§4.4), y la base lo vuelve a exigir.
 */
export async function anadirEvidencia(artistaId: string, datos: DatosEvidencia, slug: string): Promise<{ ok: true } | { ok: false; error: string; errores?: Partial<Record<keyof DatosEvidencia, string>> }> {
  if (!esUuid(artistaId)) return { ok: false, error: "No encontramos a ese artista." };
  const v = validarEvidencia(comoEvidencia(datos));
  if (!v.ok) return { ok: false, error: "Revisa lo marcado.", errores: v.errores };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { error } = await db.from("showcase_evidencias").insert({ artista_id: artistaId, ...v.evidencia, leida_por: "persona", estado: "aceptada" });
  if (error) return { ok: false, error: "No se pudo añadir la evidencia. Intenta de nuevo." };
  revalidar(slug);
  return { ok: true };
}

/** Aceptar o rechazar una propuesta, o deshacerlo (vuelve a propuesta). La base anota quién y cuándo. */
export async function decidirEvidencia(evidenciaId: string, estado: "aceptada" | "rechazada" | "propuesta", slug: string): Promise<Resultado> {
  if (!esUuid(evidenciaId) || !["aceptada", "rechazada", "propuesta"].includes(estado)) return { ok: false, error: "No encontramos esa evidencia." };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { data, error } = await db.from("showcase_evidencias").update({ estado }).eq("id", evidenciaId).select("id");
  if (error) return SIN_BASE;
  if (!data?.length) return { ok: false, error: "Esa evidencia ya no existe. Recarga la página." };
  revalidar(slug);
  return { ok: true };
}

/** Una lectura de redes a mano. */
export async function anadirLectura(artistaId: string, datos: DatosLectura, slug: string): Promise<{ ok: true } | { ok: false; error: string; errores?: Partial<Record<keyof DatosLectura, string>> }> {
  if (!esUuid(artistaId)) return { ok: false, error: "No encontramos a ese artista." };
  const v = validarLectura(comoLectura(datos), diaLocal(new Date()));
  if (!v.ok) return { ok: false, error: "Revisa lo marcado.", errores: v.errores };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { error } = await db.from("lecturas_redes").insert({ artista_id: artistaId, ...v.lectura });
  if (error) return { ok: false, error: "No se guardó la lectura. Intenta de nuevo." };
  revalidar(slug);
  return { ok: true };
}

export type ResultadoImportar = { ok: true; importadas: number; errores: { linea: number; motivo: string }[] } | { ok: false; error: string; errores?: { linea: number; motivo: string }[] };
/** El tope del archivo: 2 000 filas de redes caben de sobra en 256 KB. */
const TOPE_CSV = 256 * 1024;

/**
 * Importar el CSV de redes (`artista_slug, red, seguidores, publicaciones, ultima_publicacion, leido_en`): la rutina lo deja desde el Chrome de
 * administración (Instagram no se lee desde el servidor). Las filas buenas entran juntas; las malas se dicen con su línea y su motivo. Un slug que
 * no es de ningún artista no se adivina.
 */
export async function importarLecturas(texto: string, slug?: string): Promise<ResultadoImportar> {
  if (typeof texto !== "string" || !texto.trim()) return { ok: false, error: "El archivo está vacío." };
  if (texto.length > TOPE_CSV) return { ok: false, error: "El archivo es demasiado grande (hasta 256 KB)." };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { filas, errores } = leerCsvRedes(texto, new Date());
  if (!filas.length) return { ok: false, error: errores[0]?.motivo ?? "No hay filas que importar.", errores };
  const slugs = [...new Set(filas.map((f) => f.artista_slug))];
  const encontrados = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += 100) {
    const { data, error } = await db.from("artistas").select("id, slug").in("slug", slugs.slice(i, i + 100)).limit(100);
    if (error) return SIN_BASE;
    for (const a of (data ?? []) as { id: string; slug: string }[]) encontrados.set(a.slug, a.id);
  }
  const todosLosErrores = [...errores];
  // Todas las filas llevan las mismas columnas (una inserción en bloque pone null en lo que falte): sin `leido_en`, se leyó ahora.
  const ahora = new Date().toISOString();
  const nuevas = filas.flatMap((f) => {
    const id = encontrados.get(f.artista_slug);
    if (!id) {
      todosLosErrores.push({ linea: f.linea, motivo: `No hay ningún artista con la dirección «${f.artista_slug}».` });
      return [];
    }
    return [{ artista_id: id, red: f.red, seguidores: f.seguidores, publicaciones: f.publicaciones, ultima_publicacion: f.ultima_publicacion, leido_en: f.leido_en ?? ahora }];
  });
  todosLosErrores.sort((a, b) => a.linea - b.linea);
  if (!nuevas.length) return { ok: false, error: "Ninguna fila se pudo importar.", errores: todosLosErrores };
  const { error } = await db.from("lecturas_redes").insert(nuevas);
  if (error) return { ok: false, error: "No se importó nada: la base rechazó el archivo. Intenta de nuevo.", errores: todosLosErrores };
  revalidar(slug);
  return { ok: true, importadas: nuevas.length, errores: todosLosErrores };
}

/**
 * «Investigar» (OL-430): deja una corrida `showcase` de este artista (sin ciudad, `parametros.artista_id`) con su tope y pide su primer paso
 * después de responder, como la hoja «Correr» de Ciudades. Una a la vez por artista: si ya hay una pendiente o corriendo, lo dice. Lo que
 * traiga la rutina llega a «Por revisar» como propuesta; nada cuenta ni se publica hasta que alguien lo acepta.
 */
export async function investigar(artistaId: string, tope: string, slug: string): Promise<Resultado> {
  if (!esUuid(artistaId)) return { ok: false, error: "No encontramos a ese artista." };
  const usd = leerTope(typeof tope === "string" ? tope : "");
  if (usd === null) return { ok: false, error: "Escribe un tope de más de 0 y hasta 50 USD." };
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return SIN_PERMISO;
  const db = await clienteServidor();
  if (!db) return SIN_BASE;
  const r = await crearInvestigaciones(db, actual.perfil.id, [artistaId], usd, null);
  if (!r.ok) return r;
  if (!r.creadas) return { ok: false, error: "Ya hay una investigación en curso de este artista." };
  revalidar(slug);
  return { ok: true };
}

export type ResultadoLote = { ok: true; creadas: number; omitidas: number } | { ok: false; error: string };

/**
 * «Investigar» a varios desde la lista (OL-439): una corrida `showcase` por artista, como la de la ficha (la misma función), todas de una orden
 * (`parametros.lote`) para que la lista diga cómo va. Hasta 60 por orden. La hoja ya eligió a quiénes; aquí se vuelve a mirar la base: los
 * descartados y los que ya tienen una investigación en curso no entran (se cuentan en `omitidas`). Se pide el primer paso una sola vez y solo si
 * el motor no está ya corriendo otras: el motor toma las pendientes en orden, una por llamada.
 */
export async function investigarVarios(ids: unknown, tope: string): Promise<ResultadoLote> {
  const lista = Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string" && esUuid(id)))] : [];
  if (!lista.length) return { ok: false, error: "Elige a quién investigar." };
  if (lista.length > LIMITE_LOTE) return { ok: false, error: `Son ${lista.length}: elige hasta ${LIMITE_LOTE} o filtra por disciplina.` };
  const usd = leerTope(typeof tope === "string" ? tope : "");
  if (usd === null) return { ok: false, error: "Escribe un tope de más de 0 y hasta 50 USD." };
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return SIN_PERMISO;
  const db = await clienteServidor();
  if (!db) return SIN_BASE;
  const descartados = await db.from("showcase_candidatos").select("artista_id").eq("estado", "descartado").in("artista_id", lista).limit(LIMITE_LOTE);
  if (descartados.error) return SIN_BASE;
  const fuera = new Set(((descartados.data ?? []) as { artista_id: string }[]).map((d) => d.artista_id));
  const quedan = lista.filter((id) => !fuera.has(id));
  const r = quedan.length ? await crearInvestigaciones(db, actual.perfil.id, quedan, usd, crypto.randomUUID()) : ({ ok: true, creadas: 0 } as const);
  if (!r.ok) return r;
  if (!r.creadas) return { ok: false, error: "Ya están todos en curso o descartados. Recarga la página." };
  revalidar();
  return { ok: true, creadas: r.creadas, omitidas: lista.length - r.creadas };
}

/**
 * Lo que comparten «Investigar» de la ficha y el de la lista: lee las corridas en curso (de cualquier rutina), deja fuera a los artistas que ya
 * tienen una investigación pendiente o corriendo, crea una corrida `showcase` pendiente por cada uno de los demás (con su tope y, si salen de la
 * lista, su lote) y pide el primer paso después de responder si la cadena del motor no está viva (`cadenaParada`: si alguna corrida avanza, el
 * motor llegará a las nuevas por su cuenta; otro paso abriría una cadena en paralelo). Corridas sigue mostrando el crédito.
 */
async function crearInvestigaciones(db: NonNullable<Awaited<ReturnType<typeof clienteServidor>>>, creadoPor: string, ids: readonly string[], usd: number, lote: string | null): Promise<{ ok: true; creadas: number } | { ok: false; error: string }> {
  const enCurso = await db.from("rutinas_corridas").select("id, tipo, estado, resumen, parametros, creado_en, inicio").in("estado", ["pendiente", "corriendo"]).limit(1000);
  if (enCurso.error) return SIN_BASE;
  const filas = (enCurso.data ?? []) as (CorridaVista & { tipo: string; parametros: unknown })[];
  const ocupados = new Set(filas.filter((f) => f.tipo === "showcase").map((f) => (f.parametros as { artista_id?: unknown } | null)?.artista_id));
  const nuevos = ids.filter((id) => !ocupados.has(id));
  if (!nuevos.length) return { ok: true, creadas: 0 };
  const filasNuevas = nuevos.map((artista_id) => ({ tipo: "showcase", ciudad: null, tope_usd: usd, creado_por: creadoPor, parametros: lote ? { artista_id, lote } : { artista_id } }));
  const { error } = await db.from("rutinas_corridas").insert(filasNuevas).select("id");
  if (error) return { ok: false, error: "No se pudo dejar lista. Intenta de nuevo." };
  revalidatePath("/admin/corridas");
  const ahora = new Date();
  if (!filas.length || cadenaParada(filas, ahora)) await pedirPrimerPaso();
  return { ok: true, creadas: nuevos.length };
}

/** El primer paso sin esperar al cron: el servidor llama al motor con `CRON_SECRET` después de responder. Si falla, la corrida espera al cron. */
async function pedirPrimerPaso() {
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => dispararPaso(origen));
  } catch {
    console.warn("rutinas: no se pudo pedir el primer paso; la corrida espera al cron");
  }
}
