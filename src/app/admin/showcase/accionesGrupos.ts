"use server";

import { revalidatePath } from "next/cache";
import { esUuid } from "@/lib/formulario";
import { RUTA_SHOWCASE } from "@/lib/showcase";
import { faltaNombreGrupo, filtrosPuestos, leerFiltros, nPuestos } from "@/lib/showcaseFiltros";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

/**
 * Los grupos guardados del Showcase (OL-446; respuesta 3 del gestor: un grupo es un filtro con nombre, sin grupos a mano). Solo administración: se
 * comprueba aquí y la base lo vuelve a exigir (`showcase_grupos`, migración 20261022140000). Lo que llega del navegador se vuelve a leer: unos
 * filtros que no existen no se guardan.
 */
export type ResultadoGrupo = { ok: true; id: string } | { ok: false; error: string };
const SIN_PERMISO = { ok: false, error: "Solo la administración puede guardar grupos." } as const;

async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  return (await clienteServidor()) ?? null;
}

/** Guardar los filtros puestos con un nombre. Sin ningún filtro puesto no hay grupo. */
export async function guardarGrupo(nombre: unknown, filtros: unknown): Promise<ResultadoGrupo> {
  const texto = typeof nombre === "string" ? nombre.trim() : "";
  const falta = faltaNombreGrupo(texto);
  if (falta) return { ok: false, error: `${falta}.` };
  const f = leerFiltros(filtros && typeof filtros === "object" ? (filtros as Record<string, unknown>) : null);
  if (!nPuestos(f)) return { ok: false, error: "Pon al menos un filtro para guardar un grupo." };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { data, error } = await db.from("showcase_grupos").insert({ nombre: texto, filtros: filtrosPuestos(f) }).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo guardar el grupo. Intenta de nuevo." };
  revalidatePath(RUTA_SHOWCASE);
  return { ok: true, id: String((data as { id: string }).id) };
}

/** Cambiar el nombre de un grupo. */
export async function renombrarGrupo(id: string, nombre: unknown): Promise<ResultadoGrupo> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos ese grupo." };
  const texto = typeof nombre === "string" ? nombre.trim() : "";
  const falta = faltaNombreGrupo(texto);
  if (falta) return { ok: false, error: `${falta}.` };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { data, error } = await db.from("showcase_grupos").update({ nombre: texto }).eq("id", id).select("id");
  if (error) return { ok: false, error: "No se pudo cambiar el nombre. Intenta de nuevo." };
  if (!data?.length) return { ok: false, error: "Ese grupo ya no existe. Recarga la página." };
  revalidatePath(RUTA_SHOWCASE);
  return { ok: true, id };
}

/** Borrar un grupo: se borra el filtro con nombre; nadie sale del showcase. */
export async function borrarGrupo(id: string): Promise<ResultadoGrupo> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos ese grupo." };
  const db = await soloAdmin();
  if (!db) return SIN_PERMISO;
  const { error } = await db.from("showcase_grupos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar el grupo. Intenta de nuevo." };
  revalidatePath(RUTA_SHOWCASE);
  return { ok: true, id };
}
