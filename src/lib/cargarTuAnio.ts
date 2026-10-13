import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hrefArtista } from "./artistas";
import { cargarTrayectoria, cargarHistorialLugar, COLUMNAS_PASADO, completar, type FilaPasado } from "./cargarHistorial";
import { esUuid } from "./formulario";
import type { EventoPasado } from "./historialFichas";
import { hrefLugar } from "./lugares";
import { clienteServidor, usuarioActual } from "./supabase/servidor";
import { anioDe, nombreTuAnio, resumirTuAnio, zonaDelAnio, type ResumenTuAnio, type SujetoTuAnio } from "./tuAnio";

/**
 * La lectura de «Tu año» (OL-394): de quién, sus eventos pasados y si quien mira lo gestiona (Q firmado: «solo quien gestiona»). La persona,
 * su propio año (sus «Voy» a eventos que ya pasaron); el artista o el lugar, quien puede editar la ficha (su autor, la cuenta ligada o la
 * administración), igual que `puedeEditar` en sus páginas. A cualquier otro, null (la ruta y la pantalla responden 404). Sin migración ni tablas
 * nuevas: lo pasado del artista y del lugar es el mismo de su ficha (`cargarTrayectoria`, `cargarHistorialLugar`, OL-390).
 */

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/**
 * Los eventos a los que una persona dijo «Voy» y ya pasaron (`termina < ahora`), visibles y no borradores, con su lugar, sus artistas y su
 * festival (`completar`, el mismo del historial de las fichas). Tope de 1 000 filas, como las listas de su perfil.
 */
export const cargarPasadosPersona = cache(async (perfilId: string): Promise<EventoPasado[]> => {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase
    .from("asistencias")
    .select(`evento:eventos!inner(${COLUMNAS_PASADO})`)
    .eq("usuario_id", perfilId)
    .eq("estado", "voy")
    .eq("evento.visible", true)
    .eq("evento.borrador", false)
    .lt("evento.termina", new Date().toISOString())
    .limit(1000);
  const filas = ((data ?? []) as unknown as { evento: FilaPasado | FilaPasado[] | null }[]).map((a) => uno(a.evento)).filter((e): e is FilaPasado => !!e);
  return completar(supabase as SupabaseClient, filas);
});


/** Lo que piden la ruta de la imagen y la pantalla de vista previa. */
export type TuAnio = {
  resumen: ResumenTuAnio;
  /** El id del sujeto (el perfil, el artista o el lugar): da la figura. */
  id: string;
  /** La ficha (o el perfil) a la que vuelve la vista previa. */
  volver: string;
  /** El nombre del archivo que se guarda («tu-2026-feleal.jpg»). */
  archivo: string;
};

type Quien = { id: string; rol: string } | null;

/** ¿Quien mira gestiona esta ficha? Administración, su autor o una cuenta ligada (`artistas_cuentas` / `lugares_cuentas`). */
async function gestiona(supabase: SupabaseClient, quien: Quien, tabla: "artistas_cuentas" | "lugares_cuentas", columna: "artista_id" | "lugar_id", fichaId: string, autor: string | null): Promise<boolean> {
  if (!quien) return false;
  if (quien.rol === "admin" || autor === quien.id) return true;
  const { data } = await supabase.from(tabla).select("perfil_id").eq(columna, fichaId).eq("perfil_id", quien.id).limit(1);
  return (data ?? []).length > 0;
}

/** Lee una ficha por su slug y, si no aparece y es un UUID, por su id (como las fichas). */
async function leerFicha<T>(supabase: SupabaseClient, tabla: "artistas" | "lugares", columnas: string, idOSlug: string): Promise<T | null> {
  const porSlug = await supabase.from(tabla).select(columnas).eq("slug", idOSlug).maybeSingle();
  if (porSlug.data) return porSlug.data as T;
  if (!esUuid(idOSlug)) return null;
  const porId = await supabase.from(tabla).select(columnas).eq("id", idOSlug).maybeSingle();
  return (porId.data as T | null) ?? null;
}

/**
 * «Tu año» de un sujeto, si quien mira puede sacarlo y hay algo este año; null si no (sin sesión, ficha ajena, sin nada pasado este año). `id`
 * es el slug o el UUID de la ficha; la persona no lo lleva (siempre es la de la sesión).
 */
export async function cargarTuAnio(que: SujetoTuAnio, id?: string | null, ahora: Date = new Date()): Promise<TuAnio | null> {
  const [supabase, actual] = await Promise.all([clienteServidor(), usuarioActual()]);
  if (!supabase || !actual) return null;
  const quien: Quien = { id: actual.perfil.id, rol: actual.perfil.rol };
  if (que === "persona") {
    const eventos = await cargarPasadosPersona(actual.perfil.id);
    const zona = zonaDelAnio(eventos);
    const resumen = resumirTuAnio({ tipo: "persona", id: actual.perfil.id, nombre: actual.perfil.nombre, foto: actual.perfil.foto, eventos, ahora, zona });
    if (resumen.protagonista.n === 0) return null;
    return { resumen, id: actual.perfil.id, volver: "/perfil", archivo: nombreTuAnio(anioDe(ahora, zona)) };
  }
  if (!id) return null;
  if (que === "artista") {
    type Fila = { id: string; slug: string; nombre: string; foto: string | null; portada: string | null; creado_por: string | null };
    const a = await leerFicha<Fila>(supabase as SupabaseClient, "artistas", "id, slug, nombre, foto, portada, creado_por", id);
    if (!a || !(await gestiona(supabase as SupabaseClient, quien, "artistas_cuentas", "artista_id", a.id, a.creado_por))) return null;
    const { eventos } = await cargarTrayectoria(a.id);
    const zona = zonaDelAnio(eventos);
    const resumen = resumirTuAnio({ tipo: "artista", id: a.id, nombre: a.nombre, foto: a.foto ?? a.portada, eventos, ahora, zona });
    if (resumen.protagonista.n === 0) return null;
    return { resumen, id: a.id, volver: hrefArtista(a), archivo: nombreTuAnio(anioDe(ahora, zona), a.slug) };
  }
  type Fila = { id: string; slug: string; nombre: string; portada: string | null; creado_por: string | null; zona?: string | null };
  const l = await leerFicha<Fila>(supabase as SupabaseClient, "lugares", "id, slug, nombre, portada, creado_por, zona", id);
  if (!l || !(await gestiona(supabase as SupabaseClient, quien, "lugares_cuentas", "lugar_id", l.id, l.creado_por))) return null;
  const { eventos } = await cargarHistorialLugar(l.id);
  const zona = zonaDelAnio(eventos, l.zona);
  const resumen = resumirTuAnio({ tipo: "lugar", id: l.id, nombre: l.nombre, foto: l.portada, eventos, ahora, zona });
  if (resumen.protagonista.n === 0) return null;
  return { resumen, id: l.id, volver: hrefLugar(l), archivo: nombreTuAnio(anioDe(ahora, zona), l.slug) };
}
