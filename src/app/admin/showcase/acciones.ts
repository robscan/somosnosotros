"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { leerTope } from "@/lib/ciudadesAdmin";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { esUuid } from "@/lib/formulario";
import {
  esEstado,
  esPuntaje,
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

/** Poner (o quitar, con null) el puntaje de una señal. */
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
  const enCurso = await db.from("rutinas_corridas").select("id").eq("tipo", "showcase").in("estado", ["pendiente", "corriendo"]).eq("parametros->>artista_id", artistaId).limit(1);
  if (enCurso.error) return SIN_BASE;
  if (enCurso.data?.length) return { ok: false, error: "Ya hay una investigación en curso de este artista." };
  const { error } = await db.from("rutinas_corridas").insert({ tipo: "showcase", ciudad: null, tope_usd: usd, creado_por: actual.perfil.id, parametros: { artista_id: artistaId } }).select("id").single();
  if (error) return { ok: false, error: "No se pudo dejar lista. Intenta de nuevo." };
  revalidar(slug);
  revalidatePath("/admin/corridas");
  await pedirPrimerPaso();
  return { ok: true };
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
