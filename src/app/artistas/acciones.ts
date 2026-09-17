"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { artistaIgual, validarArtista, type ArtistaResumen, type ErroresArtista } from "@/lib/artistas";
import { esUuid } from "@/lib/formulario";
import type { MotivoReclamo } from "@/lib/reportes";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";

/** Publicar lleva a la ficha nueva reemplazando el alta; guardar devuelve a dónde volver (el formulario termina la tarea). */
export type ResultadoArtista =
  | { ok: true; id: string; volver: string }
  | { ok: false; errores: ErroresArtista; general?: string; existente?: ArtistaResumen };


function leer(formData: FormData) {
  const claves = ["nombre", "disciplina", "detalle", "tipo", "descripcion", "foto", "enlaces", "ciudad"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

function revalidar(id: string) {
  revalidatePath("/artistas");
  revalidatePath(`/artistas/${id}`);
}

type Cliente = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;

/** El artista registrado que se llama igual en la misma ciudad, si lo hay (para "¿Es este?"). */
async function existenteIgual(supabase: Cliente, nombre: string, ciudad: string): Promise<ArtistaResumen | undefined> {
  const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: nombre });
  return artistaIgual(((data ?? []) as (ArtistaResumen & { ciudad: string })[]).filter((a) => a.ciudad === ciudad), nombre) ?? undefined;
}

/** Alta de artista. Si ya hay uno con el mismo nombre, devuelve el existente para preguntar "¿es este?" (decisión 5). */
export async function crearArtista(_previo: ResultadoArtista | null, formData: FormData): Promise<ResultadoArtista> {
  const { supabase, user } = await sesionOEntrar("/artistas/nuevo");
  const { datos, errores } = validarArtista(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };

  const { data, error } = await supabase
    .from("artistas")
    .insert({ ...datos, creado_por: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") return { ok: false, errores: {}, existente: await existenteIgual(supabase, datos.nombre, datos.ciudad), general: "Ya hay un artista con ese nombre." };
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. Intenta de nuevo." };

  // "Soy yo / es mi grupo": la cuenta queda ligada; podrá editar y publicar sus fechas sin teclear el nombre.
  if (formData.get("soy") === "1") await supabase.from("artistas_cuentas").insert({ artista_id: data.id, perfil_id: user.id });

  revalidatePath("/artistas");
  redirect(`/artistas/${data.id}?nuevo=1`, RedirectType.replace);
}

export async function actualizarArtista(id: string, _previo: ResultadoArtista | null, formData: FormData): Promise<ResultadoArtista> {
  const { supabase } = await sesionOEntrar(`/artistas/${id}/editar`);
  const { datos, errores } = validarArtista(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };

  // La ciudad también se edita: es un renglón del formulario (pedido del founder, 2026-09-16, noche).
  const { nombre, disciplina, detalle, tipo, descripcion, foto, redes, ciudad } = datos;
  const cambios = { nombre, disciplina, detalle, tipo, descripcion, foto, redes, ciudad };
  const { data, error } = await supabase.from("artistas").update(cambios).eq("id", id).select("id").maybeSingle();
  if (error?.code === "23505") return { ok: false, errores: { nombre: `Ya hay otro artista con ese nombre en ${ciudad}.` } };
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu ficha?" };

  revalidar(id);
  revalidatePath("/");
  return { ok: true, id, volver: `/artistas/${id}` };
}

/** Ocultar o volver a mostrar: solo la administración (la base lo exige con el trigger proteger_autor_y_visible). */
export async function cambiarVisibleArtista(id: string, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/artistas/${id}`);
  await supabase.from("artistas").update({ visible }).eq("id", id);
  revalidar(id);
  redirect(`/artistas/${id}`);
}

/** Seguir / dejar de seguir a un artista. Un toque. */
export async function cambiarSeguimientoArtista(artistaId: string, seguir: boolean) {
  const { supabase, user } = await sesionOEntrar(`/artistas/${artistaId}?accion=${seguir ? "seguir" : ""}`);
  if (seguir) await supabase.from("seguimientos").upsert({ usuario_id: user.id, artista_id: artistaId }, { onConflict: "usuario_id,artista_id", ignoreDuplicates: true });
  else await supabase.from("seguimientos").delete().eq("usuario_id", user.id).eq("artista_id", artistaId);
  revalidatePath(`/artistas/${artistaId}`);
  revalidatePath("/perfil");
  revalidatePath(`/personas/${user.id}`);
}

/** Borrar un artista: su autor o el admin. Sus ligas con eventos y sus seguidores se van con él (cascada). */
export async function borrarArtista(id: string) {
  const { supabase } = await sesionOEntrar(`/artistas/${id}`);
  const { data } = await supabase.from("artistas").delete().eq("id", id).select("id").maybeSingle();
  if (!data) redirect(`/artistas/${id}?error=borrar`);
  revalidatePath("/artistas");
  revalidatePath("/");
  redirect("/borrado?que=artista");
}

export type ResultadoReclamo = { ok: true } | { ok: false; error: string };

/**
 * "Soy yo / es mi grupo" (decisión 11): la persona pide la ficha para llevarla ella o pide que se quite.
 * Queda como reporte con su cuenta; el administrador lo atiende desde su panel.
 */
export async function reclamarArtista(artistaId: string, motivo: MotivoReclamo): Promise<ResultadoReclamo> {
  const { supabase, user } = await sesionOEntrar(`/artistas/${artistaId}?accion=mio`);
  if (!esUuid(artistaId) || !["es_mio", "retirar"].includes(motivo)) return { ok: false, error: "No sé qué ficha es." };
  const { error } = await supabase.from("reportes").insert({ tipo: "artista", objeto_id: artistaId, motivo, creado_por: user.id });
  if (error) return { ok: false, error: "No se pudo enviar. Intenta de nuevo." };
  return { ok: true };
}
